import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=os.getenv("NVIDIA_API_KEY"),
)

try:
    models = client.models.list()
    print("\n--- Available NVIDIA NIM Models ---")
    for m in models.data:
        if "llama" in m.id.lower() or "nemotron" in m.id.lower() or "mistral" in m.id.lower():
            print(f"- {m.id}")
except Exception as e:
    print(f"Error fetching models: {e}")
