"""FastAPI API surface for the autonomous SRE agent."""
import os
import subprocess
from __future__ import annotations

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from database import get_recent_sessions, save_session
from src.agents.graph import sre_graph
from src.agents.state import AgentState
from src.tools.docker_executor import DockerToolbox

load_dotenv()

app = FastAPI(title="CORE SRE API")

# --- DEPLOYMENT LOGIC ---
# If ENV is production, we use Demo Mode (no Docker)
IS_DEMO = os.getenv('ENV') == 'production'

# Update CORS to allow dynamic frontend URLs
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        frontend_url
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

toolbox = DockerToolbox()
TARGET_FILE = "app/main.py"

# --- MODELS --- (Keep these as they were)
class InjectBugResponse(BaseModel):
    status: str
    target_file: str
    message: str

class RepairResponse(BaseModel):
    status: str
    iterations: int
    is_fixed: bool
    final_error_logs: str
    final_code: str
    history: list[str] = Field(default_factory=list)

class StatusResponse(BaseModel):
    target_file: str
    code_context: str

class SessionSummary(BaseModel):
    id: int
    timestamp: str
    is_fixed: bool
    initial_code: str
    initial_code_snippet: str
    final_code: str
    history_logs: list[str] = Field(default_factory=list)

# --- ENDPOINTS ---

@app.post("/inject-bug", response_model=InjectBugResponse)
async def inject_bug() -> InjectBugResponse:
    buggy_code = (
        "from fastapi import FastAPI\n"
        "from pydantic import BaseModel\n\n"
        "app = FastAPI()\n\n"
        "class ProcessRequest(BaseModel):\n"
        "    values: list[int]\n\n"
        "@app.post('/process')\n"
        "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n"
        "    # Potential IndexError if values is empty\n"
        "    first = payload.values[0]\n"
        "    total = sum(payload.values)\n"
        "    return {'first': first, 'total': total}\n"
    )
    toolbox.write_file(TARGET_FILE, buggy_code)
    return InjectBugResponse(
        status="ok",
        target_file=TARGET_FILE,
        message="Injected known IndexError bug into sandbox.",
    )

@app.post("/repair", response_model=RepairResponse)
async def repair() -> RepairResponse:
    initial_code = toolbox.read_file(TARGET_FILE)
    
    # In Demo Mode, we bypass real Docker tests if the environment isn't setup
    try:
        initial_test_result = await toolbox.run_tests()
        logs = initial_test_result.stdout if initial_test_result.stdout else initial_test_result.stderr
    except Exception as e:
        logs = f"Execution Error: {str(e)}" if not IS_DEMO else "Demo Mode: Triggering synthetic error logs for repair simulation."

    initial_state: AgentState = {
        "target_file": TARGET_FILE,
        "code_context": initial_code,
        "error_logs": logs,
        "history": ["Started autonomous repair session from CORE SRE API."],
        "iterations": 0,
        "is_fixed": False,
    }
    
    final_state = await sre_graph.ainvoke(initial_state)
    
    save_session(
        initial_code=initial_code,
        final_code=final_state["code_context"],
        is_fixed=final_state["is_fixed"],
        history=final_state["history"],
        tokens_used=0,
    )
    
    return RepairResponse(
        status="passed" if final_state["is_fixed"] else "failed",
        iterations=final_state["iterations"],
        is_fixed=final_state["is_fixed"],
        final_error_logs=final_state["error_logs"],
        final_code=final_state["code_context"],
        history=final_state["history"],
    )

@app.get("/get-code", response_model=StatusResponse)
async def get_code() -> StatusResponse:
    current_code = toolbox.read_file(TARGET_FILE)
    return StatusResponse(target_file=TARGET_FILE, code_context=current_code)

@app.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    return await get_code()

@app.get("/sessions", response_model=list[SessionSummary])
async def sessions(limit: int = 20) -> list[SessionSummary]:
    recent = get_recent_sessions(limit=limit)
    return [
        SessionSummary(
            id=row["id"],
            timestamp=row["timestamp"],
            is_fixed=row["is_fixed"],
            initial_code=row["initial_code"],
            initial_code_snippet=row["initial_code"][:160],
            final_code=row["final_code"],
            history_logs=row["history"],
        )
        for row in recent
    ]