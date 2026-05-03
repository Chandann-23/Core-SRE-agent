"""LLM integration for SRE agent."""

import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

def get_llm():
    """Get the LLM instance for the SRE agent."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY environment variable is not set")
    
    return ChatGroq(
        model="llama-3.1-70b-versatile",
        api_key=groq_api_key,
        temperature=0.1,
        max_tokens=4000
    )
