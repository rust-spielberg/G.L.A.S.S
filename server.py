from fastapi import FastAPI, Form, File, UploadFile, HTTPException, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from typing import Optional
import shutil
import os
import json
import zipfile
from agent import GlassAgent, WORKSPACES_DIR

app = FastAPI(title="G.L.A.S.S. API")

ALLOWED_ORIGINS = [
    "https://glass-ai-agent.netlify.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

raw_origins = os.getenv("CORS_ORIGINS", "").strip()
if raw_origins and raw_origins != "*":
    for o in raw_origins.split(","):
        clean = o.strip()
        if clean and clean not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(clean)

# =============================================================================
# 1. GUARANTEED PURE ASGI CORS MIDDLEWARE (Compatible with StreamingResponse)
# =============================================================================
class PureASGICORSMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        origin = "https://glass-ai-agent.netlify.app"
        for header, value in scope.get("headers", []):
            if header.lower() == b"origin":
                origin = value.decode("utf-8")
                break

        async def send_with_cors(message):
            if message["type"] == "http.response.start":
                headers = list(message.get("headers", []))
                # Append CORS headers cleanly without duplicate keys
                headers = [(k, v) for k, v in headers if not k.lower().startswith(b"access-control-")]
                headers.append((b"access-control-allow-origin", origin.encode()))
                headers.append((b"access-control-allow-credentials", b"true"))
                headers.append((b"access-control-allow-methods", b"GET, POST, OPTIONS, PUT, DELETE, PATCH"))
                headers.append((b"access-control-allow-headers", b"*"))
                headers.append((b"access-control-expose-headers", b"*"))
                message["headers"] = headers
            await send(message)

        await self.app(scope, receive, send_with_cors)

app.add_middleware(PureASGICORSMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https?://.*",
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# =============================================================================
# 2. GLOBAL EXCEPTION HANDLER (Ensures JSON errors always have CORS headers)
# =============================================================================
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "https://glass-ai-agent.netlify.app")
    return JSONResponse(
        status_code=500,
        content={"status": "error", "message": f"Internal Server Error: {str(exc)}"},
        headers={
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

# Explicit OPTIONS preflight handler (Express equivalent: app.options('*', cors()))
@app.options("/{rest_of_path:path}")
async def preflight_catchall(rest_of_path: str):
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "https://glass-ai-agent.netlify.app",
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, DELETE, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.post("/api/agent/run")
async def run_agent(request: Request):
    try:
        content_type = request.headers.get("content-type", "")
        prompt = ""
        session_id = "default_session"
        file_name = None
        file_content = None

        if "application/json" in content_type:
            body = await request.json()
            prompt = body.get("prompt", "")
            session_id = body.get("session_id", "default_session")
            file_name = body.get("file_name")
            file_content = body.get("file_content")
        else:
            form = await request.form()
            prompt = form.get("prompt", "")
            session_id = form.get("session_id", "default_session")
            uploaded = form.get("file")
            if uploaded and hasattr(uploaded, "filename") and uploaded.filename:
                file_name = uploaded.filename
                content_bytes = await uploaded.read()
                file_content = content_bytes.decode("utf-8", errors="ignore")

        agent = GlassAgent(session_id=session_id)
    except Exception as e:
        origin = request.headers.get("origin", "https://glass-ai-agent.netlify.app")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": f"Request Parsing Error: {str(e)}"},
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Credentials": "true",
            }
        )

    def event_stream():
        # Immediate ping to establish HTTP 200 and prevent cold-start proxy timeouts
        yield json.dumps({"type": "ping"}) + "\n"
        try:
            for event in agent.execute_stream(prompt=prompt, file_name=file_name, file_content=file_content):
                yield json.dumps(event) + "\n"
        except Exception as e:
            err = str(e)
            yield json.dumps({"type": "error", "message": f"Synthesis Error: {err}"}) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"     # Disables Nginx/Render response buffering
        }
    )

@app.get("/api/workspace/file/{filename:path}")
def read_workspace_file(filename: str, session_id: str = "default_session"):
    try:
        agent = GlassAgent(session_id=session_id)
        content = agent.workspace.read_file(filename)
        return {"filename": filename, "content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="File not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workspace/download/{session_id}")
def download_workspace(session_id: str):
    session_dir = WORKSPACES_DIR / session_id
    if not session_dir.exists():
        raise HTTPException(status_code=404, detail="Session workspace not found")

    zip_filename = f"{session_id}.zip"
    zip_path = WORKSPACES_DIR / zip_filename

    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, _, files in os.walk(session_dir):
            for file in files:
                abs_file = os.path.join(root, file)
                rel_file = os.path.relpath(abs_file, session_dir)
                zipf.write(abs_file, rel_file)

    return FileResponse(
        path=zip_path,
        filename=f"glass_workspace_{session_id}.zip",
        media_type="application/zip"
    )
@app.get("/")
def health_check():
    return {"status": "ok", "message": "G.L.A.S.S. backend service is live"}
