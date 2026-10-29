import os
import logging
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("glass_agent")

PRIMARY_MODEL = os.getenv("PRIMARY_MODEL", "openai/gpt-oss-120b")
FALLBACK_MODEL_1 = os.getenv("FALLBACK_MODEL_1", "Qwen/Qwen2.5-Coder-32B-Instruct")
FALLBACK_MODEL_2 = os.getenv("FALLBACK_MODEL_2", "deepseek-ai/DeepSeek-V3")
LOCAL_MODEL = os.getenv("LOCAL_MODEL", "qwen2.5-coder:7b")

MODEL_CHAIN = [
    PRIMARY_MODEL,
    FALLBACK_MODEL_1,
    FALLBACK_MODEL_2
]

NEBIUS_BASE_URL = os.getenv("NEBIUS_BASE_URL", "https://api.tokenfactory.us-central1.nebius.com/v1/")
NVIDIA_BASE_URL = os.getenv("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434/v1")

