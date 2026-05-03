from __future__ import annotations
import os
import subprocess
import asyncio
import time
from datetime import datetime
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

# --- AUDIT TRAIL ---
audit_logs = []  # Global list to store timestamped strings
repair_task = None  # Background task reference

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
    status: str # "Healthy" or "Error"

class SessionSummary(BaseModel):
    id: int
    timestamp: str
    is_fixed: bool
    initial_code: str
    initial_code_snippet: str
    final_code: str
    history_logs: list[str] = Field(default_factory=list)

class AuditLogResponse(BaseModel):
    logs: list[str] = Field(default_factory=list)
    timestamp: str

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

# --- AUDIT TRAIL FUNCTIONS ---
def add_audit_log(message: str):
    """Add a timestamped message to the audit trail with millisecond precision"""
    timestamped_message = f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] {message}"
    audit_logs.append(timestamped_message)
    print(f"AUDIT: {timestamped_message}")

def clear_audit_logs():
    """Clear all audit logs"""
    global audit_logs
    audit_logs.clear()
    add_audit_log("Audit trail cleared")

# --- ENDPOINTS ---

@app.get("/")
async def root():
    return {"message": "CORE SRE API is live", "status": "Healthy"}

@app.post("/inject-bug", response_model=InjectBugResponse)
async def inject_bug() -> InjectBugResponse:
    add_audit_log("Bug injection started")
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
    add_audit_log("Bug injected - IndexError vulnerability added")
    return InjectBugResponse(
        status="ok",
        target_file=TARGET_FILE,
        message="Injected known IndexError bug into sandbox.",
    )

async def run_repair_background():
    """Background repair task that updates audit logs"""
    try:
        add_audit_log("Agent analyzing traceback and error logs")
        
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

        add_audit_log("Error logs captured, starting analysis")

        initial_state: AgentState = {
            "target_file": TARGET_FILE,
            "code_context": initial_code,
            "error_logs": logs,
            "history": ["Started autonomous repair session from CORE SRE API."],
            "iterations": 0,
            "is_fixed": False,
        }
        
        add_audit_log("Agent generating fix hypothesis")
        final_state = await sre_graph.ainvoke(initial_state)
        
        add_audit_log("Fix applied, validating solution")
        
        # Save results back to file if AI fixed it
        write_sandbox_file(final_state["code_context"])

        save_session(
            initial_code=initial_code,
            final_code=final_state["code_context"],
            is_fixed=final_state["is_fixed"],
            history=final_state["history"],
            tokens_used=0,
        )
        
        if final_state["is_fixed"]:
            add_audit_log("✅ System restored to healthy state")
        else:
            add_audit_log("❌ Repair failed - manual intervention required")
            
    except Exception as e:
        add_audit_log(f"Repair process failed: {str(e)}")

@app.post("/repair", response_model=RepairResponse)
async def repair() -> RepairResponse:
    global repair_task
    
    # Check if repair is already running
    if repair_task and not repair_task.done():
        return RepairResponse(
            status="running",
            iterations=0,
            is_fixed=False,
            final_error_logs="Repair already in progress",
            final_code="",
            history=["Repair task already running"],
        )
    
    # Start repair in background
    repair_task = asyncio.create_task(run_repair_background())
    
    return RepairResponse(
        status="started",
        iterations=0,
        is_fixed=False,
        final_error_logs="Repair task started",
        final_code="",
        history=["Autonomous repair initiated"],
    )

@app.get("/get-code", response_model=StatusResponse)
async def get_code() -> StatusResponse:
    current_code = read_sandbox_file()
    
    # Simple check for health: if the bug string is in the code, it's "Error"
    # In a real SRE scenario, this would run tests, but for polling speed we check the code.
    status = "Healthy"
    if "payload.values[0]" in current_code and "if payload.values" not in current_code:
        status = "Error"
        
    return StatusResponse(
        target_file=TARGET_FILE, 
        code_context=current_code,
        status=status
    )

@app.get("/status", response_model=StatusResponse)
async def status() -> StatusResponse:
    return await get_code()

@app.get("/audit-logs", response_model=AuditLogResponse)
async def get_audit_logs() -> AuditLogResponse:
    """Get the current audit trail"""
    return AuditLogResponse(
        logs=audit_logs.copy(),
        timestamp=datetime.now().isoformat()
    )

@app.delete("/audit-logs")
async def clear_audit_logs_endpoint():
    """Clear all audit logs"""
    clear_audit_logs()
    return {"status": "cleared", "message": "Audit logs cleared"}

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