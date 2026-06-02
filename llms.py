"""LLM integration for SRE agent."""

import os
from dotenv import load_dotenv

# Import LiteLLM for GLM-4 integration (ASTRA-style)
import litellm
from litellm import completion

load_dotenv()

def get_llm():
    """Get the LLM instance for the SRE agent."""
    zhipuai_api_key = os.getenv("ZHIPUAI_API_KEY", "")
    
    # Return LiteLLM configuration for GLM-4
    return {
        "model": "glm-4",
        "api_key": zhipuai_api_key,
        "temperature": 0.1,
        "max_tokens": 4000
    }
