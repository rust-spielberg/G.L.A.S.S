from fastapi import FastAPI, Form, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from typing import Optional
import shutil
import os
import zipfile
from agent import GlassAgent, WORKSPACES_DIR

app = FastAPI(title="G.L.A.S.S. API")

# FIX CORS FOR SAFARI & WEBKIT
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/agent/run")
def run_agent(
    prompt: str = Form(...),
    session_id: str = Form("default_session"),
    file: Optional[UploadFile] = File(None)
):
    try:
        agent = GlassAgent(session_id=session_id)
        file_name = None
        file_content = None

        if file:
            file_name = file.filename
            content_bytes = file.file.read()
            file_content = content_bytes.decode("utf-8", errors="ignore")

        result = agent.execute(prompt=prompt, file_name=file_name, file_content=file_content)
        return result
    except Exception as e:
        print(f"[Server Execution Error]: {e}")
        err_str = str(e)
        if "All AI inference endpoints are currently unreachable" in err_str:
            raise HTTPException(status_code=503, detail="[ERROR] All AI inference endpoints are currently unreachable. Please check environment configuration or provider API keys.")
        raise HTTPException(status_code=500, detail=err_str)

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