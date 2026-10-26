import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
   api_key=os.getenv("NVIDIA_API_KEY"),
)

# Test with currently supported active endpoint
model_name = "meta/llama-3.2-11b-vision-instruct",

try:
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": "You are G.L.A.S.S., an autonomous coding agent."},
            {"role": "user", "content": "Confirm connection to NVIDIA infrastructure."}
        ],
        temperature=0.2,
    )
    print("Status: Connected to NVIDIA NIM!")
    print("Response:", response.choices[0].message.content)
except Exception as e:
    print("Error:", e)
