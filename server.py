import os
import shutil
import tempfile
import subprocess
from pathlib import Path
from typing import Optional
from fastapi import FastAPI, HTTPException, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

from agent import GlassAgent, WorkspaceManager

load_dotenv()

app = FastAPI(title="G.L.A.S.S. Server API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WORKSPACES_DIR = Path("./workspaces")

class GitPushRequest(BaseModel):
    session_id: Optional[str] = "default_session"
    repo_name: str
    github_token: str
    commit_message: Optional[str] = "Synthesized by G.L.A.S.S. Engine"

# Synchronous endpoint definition to run heavy LLM synthesis in FastAPI's thread pool
@app.post("/api/agent/run")
def run_agent(
    request: Request,
    prompt: Optional[str] = Form(None),
    session_id: Optional[str] = Form("default_session"),
    file: Optional[UploadFile] = File(None)
):
    req_prompt = prompt or ""
    req_session = session_id or "default_session"
    file_name = None
    file_content = None

    if file:
        file_name = file.filename
        try:
            raw_bytes = file.file.read()
            file_content = raw_bytes.decode("utf-8")
        except Exception:
            file_content = raw_bytes.decode("latin-1", errors="replace")

    if not req_prompt.strip() and not file_content:
        raise HTTPException(status_code=400, detail="Please enter a prompt or attach a file.")
    
    agent = GlassAgent(session_id=req_session)
    result = agent.execute(prompt=req_prompt, file_name=file_name, file_content=file_content)
    return result

@app.get("/api/workspace/file/{filename}")
async def get_workspace_file(filename: str, session_id: str = "default_session"):
    try:
        ws = WorkspaceManager(session_id=session_id)
        content = ws.read_file(filename)
        return {"filename": filename, "content": content}
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workspace/download/{session_id}")
async def download_workspace(session_id: str):
    workspace_dir = WORKSPACES_DIR / session_id
    if not workspace_dir.exists() or not any(workspace_dir.iterdir()):
        raise HTTPException(status_code=404, detail="Workspace directory is empty or not found.")
    
    temp_dir = tempfile.gettempdir()
    zip_basename = f"glass_workspace_{session_id}"
    zip_filepath = shutil.make_archive(os.path.join(temp_dir, zip_basename), 'zip', workspace_dir)
    
    return FileResponse(
        path=zip_filepath,
        filename=f"{zip_basename}.zip",
        media_type="application/zip"
    )

@app.post("/api/workspace/git-push")
async def git_push_workspace(req: GitPushRequest):
    workspace_dir = WORKSPACES_DIR / (req.session_id or "default_session")
    if not workspace_dir.exists():
        raise HTTPException(status_code=404, detail="Workspace path does not exist.")

    try:
        def run_cmd(cmd):
            return subprocess.run(cmd, cwd=workspace_dir, capture_output=True, text=True, check=True)

        run_cmd(["git", "init"])
        run_cmd(["git", "config", "user.name", "G.L.A.S.S. Bot"])
        run_cmd(["git", "config", "user.email", "agent@glass-engine.ai"])
        run_cmd(["git", "add", "."])
        
        commit_msg = req.commit_message or "Initial commit via G.L.A.S.S. Synthesis Engine"
        try:
            run_cmd(["git", "commit", "-m", commit_msg])
        except subprocess.CalledProcessError:
            pass

        remote_url = f"https://x-access-token:{req.github_token.strip()}@github.com/{req.repo_name.strip()}.git"
        
        try:
            run_cmd(["git", "remote", "remove", "origin"])
        except subprocess.CalledProcessError:
            pass

        run_cmd(["git", "remote", "add", "origin", remote_url])
        run_cmd(["git", "branch", "-M", "main"])
        run_cmd(["git", "push", "-u", "origin", "main", "--force"])

        return {
            "status": "success",
            "repo_url": f"https://github.com/{req.repo_name.strip()}",
            "message": f"Successfully pushed workspace to https://github.com/{req.repo_name.strip()}"
        }

    except subprocess.CalledProcessError as e:
        err_msg = e.stderr or e.stdout or str(e)
        raise HTTPException(status_code=500, detail=f"Git push execution failed: {err_msg}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))