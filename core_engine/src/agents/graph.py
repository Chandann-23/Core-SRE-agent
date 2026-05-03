"""LangGraph orchestration for the SRE self-healing agent."""

import re
import os
import sys
from typing import Literal
from pathlib import Path

from dotenv import load_dotenv
# Optional imports for LLM components
try:
    from langchain_groq import ChatGroq
    from langchain_core.messages import HumanMessage, SystemMessage
    from pydantic import BaseModel, Field
    from langgraph.graph import END, StateGraph
    LLM_AVAILABLE = True
except ImportError as e:
    print(f"Warning: LLM components not available: {e}")
    print("System will run in demo mode without LLM functionality")
    LLM_AVAILABLE = False
    # Create dummy classes for demo mode
    class ChatGroq:
        def __init__(self, *args, **kwargs):
            pass
        def invoke(self, messages):
            return "Demo mode: LLM not available"
    class HumanMessage:
        def __init__(self, content):
            self.content = content
    class SystemMessage:
        def __init__(self, content):
            self.content = content
    class BaseModel:
        pass
    class Field:
        def __init__(self, *args, **kwargs):
            pass
    class END:
        pass
    class StateGraph:
        def __init__(self, *args, **kwargs):
            pass
        def add_node(self, *args, **kwargs):
            pass
        def add_edge(self, *args, **kwargs):
            pass
        def add_conditional_edges(self, *args, **kwargs):
            pass
        def set_entry_point(self, *args, **kwargs):
            pass
        def compile(self, *args, **kwargs):
            return self

# Corrected imports for the state
try:
    from src.agents.state import AgentState
    from src.tools.docker_executor import DockerToolbox
except ImportError:
    # Fallback for demo mode
    class AgentState:
        messages = []
        code = ""
        analysis = ""
        hypothesis = ""
        verification = ""
        
    class DockerToolbox:
        def __init__(self):
            pass
        def execute_command(self, command):
            return "Demo mode: Docker not available"

# --- ENVIRONMENT SETUP ---
# Look for .env in the root (SRE/) folder
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
env_path = BASE_DIR / '.env'
load_dotenv(dotenv_path=env_path)

api_key = os.getenv("GROQ_API_KEY")
if not api_key:
    # Fallback: check if the user accidentally put it in the local core_engine folder
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")

# --- INITIALIZATION ---
SYSTEM_PROMPT = """You are an SRE Expert. You follow a strict Thinking Protocol:

ANALYSIS: Look at the error logs and identify the root cause.

HYPOTHESIS: Explain what you think will fix it and why.

CODE: Provide the code block.

VERIFICATION: Describe how you will know if it's fixed."""

toolbox = DockerToolbox()
llm = ChatGroq(
    model_name="llama-3.3-70b-versatile", 
    temperature=0,
    api_key=api_key # Passing directly to avoid client errors
)

def _extract_code_block(text: str) -> str:
    """Extracts Python code wrapped in XML code tags."""
    # Improved regex to handle various LLM formatting quirks
    match = re.search(r"<code>(.*?)</code>", text, re.DOTALL)
    if match:
        return match.group(1).strip()
    return text.strip()

async def analyzer_node(state: AgentState) -> AgentState:
    """Analyzes failing output and proposes a concrete code fix."""
    user_prompt = (
        "Analyze the failure and propose a fix using the exact protocol sections: "
        "ANALYSIS, HYPOTHESIS, CODE, VERIFICATION.\n\n"
        f"Target file: {state['target_file']}\n\n"
        f"Error logs:\n{state['error_logs']}\n\n"
        f"Current code:\n{state['code_context']}\n\n"
        "In the CODE section, provide the full corrected file content wrapped in "
        "<code>...</code> tags."
    )
    
    print(f"🧠 [Analyzer] Thinking... (Iteration {state['iterations'] + 1})")
    response = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_prompt)]
    )
    response_text = str(response.content)
    fixed_code = _extract_code_block(response_text)

    return {
        "history": [
            f"Plan from analyzer:\n{response_text}",
            "Prepared code patch from analyzer output.",
            f"CODE_FIX_START\n{fixed_code}\nCODE_FIX_END",
        ]
    }

async def executor_node(state: AgentState) -> AgentState:
    """Applies the analyzer patch, reruns tests, and records status."""
    print("🛠️ [Executor] Applying fix and running tests...")
    
    # Extract the code fix from history
    code_entry = next(
        (
            item
            for item in reversed(state["history"])
            if item.startswith("CODE_FIX_START\n")
        ),
        "",
    )
    code_to_write = code_entry.replace("CODE_FIX_START\n", "").replace(
        "\nCODE_FIX_END", ""
    )

    if not code_to_write.strip():
        return {
            "iterations": state["iterations"] + 1,
            "error_logs": "Executor could not locate analyzer code patch in history.",
            "is_fixed": False,
            "history": ["Execution failed: missing code patch from analyzer."],
        }

    # Write file to sandbox
    toolbox.write_file(state["target_file"], code_to_write)
    
    # Rerun tests
    test_result = await toolbox.run_tests()
    refreshed_code = toolbox.read_file(state["target_file"])

    status_msg = "PASSED" if test_result.status == "passed" else "FAILED"
    print(f"🧪 [Executor] Test Result: {status_msg}")

    return {
        "iterations": state["iterations"] + 1,
        "code_context": refreshed_code,
        "error_logs": test_result.stdout if test_result.stdout else test_result.stderr,
        "is_fixed": test_result.status == "passed",
        "history": [f"Executed pytest with result status={test_result.status}."],
    }

def _route_after_executor(state: AgentState) -> Literal["analyzer_node", "__end__"]:
    """Routes graph execution based on results."""
    if state["is_fixed"]:
        print("🎉 [Graph] Bug fixed successfully!")
        return "__end__"
    if state["iterations"] < 3:
        print(f"🔄 [Graph] Test failed. Retrying (Attempt {state['iterations'] + 1}/3)...")
        return "analyzer_node"
    
    print("🛑 [Graph] Max iterations reached without a fix.")
    return "__end__"

# --- GRAPH CONSTRUCTION ---
graph_builder = StateGraph(AgentState)
graph_builder.add_node("analyzer_node", analyzer_node)
graph_builder.add_node("executor_node", executor_node)

graph_builder.set_entry_point("analyzer_node")
graph_builder.add_edge("analyzer_node", "executor_node")
graph_builder.add_conditional_edges(
    "executor_node",
    _route_after_executor,
    {"analyzer_node": "analyzer_node", "__end__": END},
)

sre_graph = graph_builder.compile()