from __future__ import annotations
import os
import subprocess
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Load database helpers and graph logic
from database import get_recent_sessions, save_session
from src.agents.graph import sre_graph
from src.agents.state import AgentState

load_dotenv()

app = FastAPI(title="CORE SRE API")

# --- CONFIGURATION ---
IS_DEMO = os.getenv('ENV') == 'production'
TARGET_FILE = "app/main.py"

# --- TOOLBOX INITIALIZATION ---
# We use a "Lazy" approach to avoid importing Docker on Render
toolbox = None 
if not IS_DEMO:
    try:
        from src.tools.docker_executor import DockerToolbox
        toolbox = DockerToolbox()
    except Exception:
        print("Warning: Docker not found, defaulting to Demo behaviors.")

# --- CORS SETUP ---
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", frontend_url, "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODELS ---
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

# --- HELPER FUNCTIONS FOR DEMO MODE ---
def read_sandbox_file():
    if not IS_DEMO and toolbox:
        return toolbox.read_file(TARGET_FILE)
    with open(TARGET_FILE, "r") as f:
        return f.read()

def write_sandbox_file(content):
    if not IS_DEMO and toolbox:
        toolbox.write_file(TARGET_FILE, content)
    else:
        os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)
        with open(TARGET_FILE, "w") as f:
            f.write(content)

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
    write_sandbox_file(buggy_code)
    return InjectBugResponse(
        status="ok",
        target_file=TARGET_FILE,
        message="Injected known IndexError bug into sandbox.",
    )

@app.post("/repair", response_model=RepairResponse)
async def repair() -> RepairResponse:
    initial_code = read_sandbox_file()
    
    logs = ""
    if IS_DEMO:
        logs = "IndexError: list index out of range\n   at process_payload (app/main.py:10)"
    else:
        try:
            test_result = await toolbox.run_tests()
            logs = test_result.stdout if test_result.stdout else test_result.stderr
        except Exception as e:
            logs = f"Execution Error: {str(e)}"

    initial_state: AgentState = {
        "target_file": TARGET_FILE,
        "code_context": initial_code,
        "error_logs": logs,
        "history": ["Started autonomous repair session from CORE SRE API."],
        "iterations": 0,
        "is_fixed": False,
    }
    
    final_state = await sre_graph.ainvoke(initial_state)
    
    # Save results back to file if AI fixed it
    write_sandbox_file(final_state["code_context"])

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
    current_code = read_sandbox_file()
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