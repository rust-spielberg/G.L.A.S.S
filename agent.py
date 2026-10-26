import os
import subprocess
import json
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY"),
)

# --- LOCAL TOOL IMPLEMENTATIONS ---
def execute_terminal_command(command: str) -> str:
    """Executes a shell command and returns stdout/stderr truncated to save token context."""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        output = result.stdout if result.stdout else result.stderr
        lines = output.strip().split('\n')
        if len(lines) > 40:
            return "\n".join(lines[-40:])
        return output if output else "Command executed with no output."
    except Exception as e:
        return f"Execution error: {str(e)}"

def create_or_update_file(path: str, content: str) -> str:
    """Creates or updates a file on disk."""
    try:
        folder = os.path.dirname(path)
        if folder:
            os.makedirs(folder, exist_ok=True)
        with open(path, "w") as f:
            f.write(content)
        return f"File '{path}' updated successfully."
    except Exception as e:
        return f"File creation error: {str(e)}"

def read_file(path: str) -> str:
    """Reads file content from disk."""
    try:
        with open(path, "r") as f:
            return f.read()
    except Exception as e:
        return f"Read error: {str(e)}"

# --- TOOL SCHEMAS FOR LLM ---
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "execute_terminal_command",
            "description": "Execute a shell command in terminal (e.g. run scripts, test suites, pip install).",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {"type": "string", "description": "The shell command to execute."}
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_or_update_file",
            "description": "Write or overwrite code/file content at specified local file path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path (e.g. app.py, models.py)."},
                    "content": {"type": "string", "description": "Full file content to write."}
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Read source code or configuration content from a file path.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {"type": "string", "description": "Relative file path."}
                },
                "required": ["path"]
            }
        }
    }
]

def run_agent_task(prompt: str, max_iterations: int = 10):
    messages = [
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
        {"role": "user", "content": prompt}
    ]

    for iteration in range(max_iterations):
        print(f"\n--- [Iteration {iteration + 1}] G.L.A.S.S. Thinking... ---", flush=True)
        
        try:
            response = client.chat.completions.create(
                model="nvidia/nemotron-3.5-lightning-30b-a3b",
                messages=messages,
                tools=TOOLS,
                temperature=0.2,
                timeout=60.0
            )
        except Exception as e:
            print(f"API Error with lightning model: {e}")
            # Fallback to meta/llama-3.2-11b-vision-instruct if needed
            try:
                response = client.chat.completions.create(
                    model="meta/llama-3.2-11b-vision-instruct",
                    messages=messages,
                    tools=TOOLS,
                    temperature=0.2,
                    timeout=60.0
                )
            except Exception as e2:
                print(f"Fallback API Error: {e2}")
                break
        if not response:
            print("API Error: Unable to reach active model endpoints.")
            break
        if hasattr(response, "usage") and response.usage:
            print(f" 📊 Tokens Used | Prompt: {response.usage.prompt_tokens} | Completion: {response.usage.completion_tokens} | Total: {response.usage.total_tokens}")

        msg = response.choices[0].message
        messages.append(msg)

        if not msg.tool_calls:
            print("\n[G.L.A.S.S. Task Complete]")
            print(msg.content)
            break

        # Process first tool call sequentially
        tool_call = msg.tool_calls[0]
        fn_name = tool_call.function.name
        args = json.loads(tool_call.function.arguments)

        print(f" -> Tool Call: {fn_name}({args})")

        if fn_name == "execute_terminal_command":
            tool_output = execute_terminal_command(args["command"])
        elif fn_name == "create_or_update_file":
            tool_output = create_or_update_file(args["path"], args["content"])
        elif fn_name == "read_file":
            tool_output = read_file(args["path"])
        else:
            tool_output = "Unknown tool."

        print(f" -> Output: {tool_output}")

        messages.append({
            "role": "tool",
            "tool_call_id": tool_call.id,
            "content": tool_output
        })

if __name__ == "__main__":
    run_agent_task(
        "Build a python calculator script named calculator.py that supports add, subtract, multiply, "
        "and divide functions (with divide-by-zero error handling). Then create a test script named "
        "test_calculator.py to test all 4 operations, run it via terminal, and confirm all tests pass!"
    )

