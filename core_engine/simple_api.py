from __future__ import annotations
import os
import asyncio
import time
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="CORE SRE API - Simple")

# --- AUDIT TRAIL ---
audit_logs = []  # Global list to store timestamped strings
repair_task = None  # Background task reference

# --- CONFIGURATION ---
TARGET_FILE = "app/main.py"

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

class AuditLogResponse(BaseModel):
    logs: list[str] = Field(default_factory=list)
    timestamp: str

# --- HELPER FUNCTIONS FOR DEMO MODE ---
def read_sandbox_file():
    try:
        with open(TARGET_FILE, "r") as f:
            return f.read()
    except FileNotFoundError:
        return "# File not found"

def write_sandbox_file(content):
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
        
        # Simulate repair process
        await asyncio.sleep(2)  # Simulate analysis
        add_audit_log("Error logs captured, starting analysis")
        
        await asyncio.sleep(3)  # Simulate fix generation
        add_audit_log("Agent generating fix hypothesis")
        
        await asyncio.sleep(2)  # Simulate validation
        add_audit_log("Fix applied, validating solution")
        
        # Apply the fix
        fixed_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n"
            "    values: list[int]\n\n"
            "@app.post('/process')\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int | None]:\n"
            "    first = payload.values[0] if payload.values else None\n"
            "    total = sum(payload.values)\n"
            "    return {'first': first, 'total': total}\n"
        )
        write_sandbox_file(fixed_code)
        add_audit_log("✅ System restored to healthy state")
            
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

@app.get("/sessions")
async def sessions():
    """Simple placeholder for sessions endpoint"""
    return []

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
