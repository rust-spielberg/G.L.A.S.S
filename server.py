from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json
import os
from agent import client, TOOLS, execute_terminal_command, create_or_update_file, read_file

app = FastAPI(title="G.L.A.S.S. API")

# Enable CORS for Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class AgentRequest(BaseModel):
    prompt: str
    model: str = "nvidia/nemotron-3.5-lightning-30b-a3b"
    max_iterations: int = 10

@app.get("/api/workspace/files")
def get_workspace_files():
    files = [f for f in os.listdir(".") if os.path.isfile(f) and not f.startswith(".")]
    return {"files": files}

@app.get("/api/workspace/file/{filename}")
def get_file_content(filename: str):
    try:
        content = read_file(filename)
        return {"filename": filename, "content": content}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/agent/run")
def run_agent_loop(req: AgentRequest):
    messages_payload = [
        {
            "role": "system",
            "content": (
                "You are G.L.A.S.S., an autonomous software synthesis agent. "
                "Your goal is to build, execute, and debug applications. "
                "Always write code using create_or_update_file. "
                "After writing code, execute it with execute_terminal_command using python3. "
                "If an error/traceback occurs in stderr, read the output, fix the file, and re-run until successful."
            )
        },
        {"role": "user", "content": req.prompt}
    ]

    steps = []
    total_prompt_tokens = 0
    total_completion_tokens = 0

    for iteration in range(req.max_iterations):
        try:
            response = client.chat.completions.create(
                model=req.model,
                messages=messages_payload,
                tools=TOOLS,
                temperature=0.2,
                timeout=60.0
            )
        except Exception as e:
            steps.append({"type": "error", "content": f"API Error: {str(e)}"})
            break

        if hasattr(response, "usage") and response.usage:
            total_prompt_tokens += response.usage.prompt_tokens
            total_completion_tokens += response.usage.completion_tokens

        msg = response.choices[0].message
        messages_payload.append(msg)

        if not msg.tool_calls:
            steps.append({"type": "completion", "content": msg.content})
            break

        tool_call = msg.tool_calls[0]
        fn_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        if fn_name == "execute_terminal_command":
            output = execute_terminal_command(args["command"])
        elif fn_name == "create_or_update_file":
            output = create_or_update_file(args["path"], args["content"])
        elif fn_name == "read_file":
            output = read_file(args["path"])
        else:
            output = "Unknown tool call."

        steps.append({
            "type": "tool_step",
            "iteration": iteration + 1,
            "tool": fn_name,
            "args": args,
            "output": output
        })

        messages_payload.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": output
        })

    return {
        "status": "success",
        "steps": steps,
        "tokens": {
            "prompt": total_prompt_tokens,
            "completion": total_completion_tokens,
            "total": total_prompt_tokens + total_completion_tokens
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
