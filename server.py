from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
from typing import Optional
import os
import json
import zipfile
from agent import GlassAgent, WORKSPACES_DIR

app = FastAPI(title="G.L.A.S.S. API")

# 1. Trust Render reverse proxy headers (Prevents HTTPS protocol drops)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# 2. Explicit CORS configuration
ALLOWED_ORIGINS = [
    "https://glass-ai-agent.netlify.app",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]

raw_origins = os.getenv("CORS_ORIGINS", "").strip()
if raw_origins:
    for o in raw_origins.split(","):
        clean = o.strip()
        if clean and clean not in ALLOWED_ORIGINS:
            ALLOWED_ORIGINS.append(clean)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=False,  # Set False so browser never rejects wildcard or dynamic origin headers
    allow_methods=["GET", "POST", "OPTIONS", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "G.L.A.S.S. backend service is live"}

# 3. Dual-route binding to eliminate 307/308 redirects on OPTIONS preflights
@app.post("/api/agent/run")
@app.post("/api/agent/run/")
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
        return JSONResponse(
            status_code=400,
            content={"status": "error", "message": f"Request Parsing Error: {str(e)}"}
        )

    def event_stream():
        # Immediate ping byte to keep socket alive through Render proxy
        yield json.dumps({"type": "ping"}) + "\n"
        try:
            for event in agent.execute_stream(prompt=prompt, file_name=file_name, file_content=file_content):
                yield json.dumps(event) + "\n"
        except Exception as e:
            yield json.dumps({"type": "error", "message": f"Synthesis Error: {str(e)}"}) + "\n"

    return StreamingResponse(
        event_stream(),
        media_type="application/x-ndjson",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

# 4. Workspace endpoints with dual slash handling
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