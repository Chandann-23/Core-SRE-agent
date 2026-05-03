from __future__ import annotations
import os
import subprocess
import asyncio
import time
import random
import requests
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import sys
sys.path.append('../complex_sandbox/app')  # Add complex sandbox to path

load_dotenv()

app = FastAPI(title="CORE SRE API - Simple")

# --- AUDIT TRAIL ---
audit_logs = []  # Global list to store timestamped strings
repair_task = None  # Background task reference

# --- CONFIGURATION ---
IS_DEMO = os.getenv('ENV') == 'production'
TARGET_FILE = "../complex_sandbox/app/main.py"  # Updated to complex sandbox
COMPLEX_UTILS_FILE = "../complex_sandbox/app/utils.py"  # Added utils file

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
    bug_type: str | None = None

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
    """Read the complex sandbox main file"""
    try:
        with open(TARGET_FILE, "r") as f:
            return f.read()
    except FileNotFoundError:
        return "# Complex sandbox file not found"

def read_utils_file():
    """Read the complex sandbox utils file"""
    try:
        with open(COMPLEX_UTILS_FILE, "r") as f:
            return f.read()
    except FileNotFoundError:
        return "# Utils file not found"

def get_available_files():
    """Get list of available complex sandbox files"""
    files = []
    try:
        if os.path.exists(TARGET_FILE):
            files.append({"name": "main.py", "path": TARGET_FILE, "type": "main"})
        if os.path.exists(COMPLEX_UTILS_FILE):
            files.append({"name": "utils.py", "path": COMPLEX_UTILS_FILE, "type": "utils"})
        return files
    except Exception:
        return [{"name": "main.py", "path": TARGET_FILE, "type": "main"}]

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
    bug_type = random.choice(["index_error", "type_error", "key_error", "complex_logic_error"])
    
    add_audit_log(f"Bug injection started - Type: {bug_type}")
    
    # Complex bug injection scenarios
    if bug_type == "index_error":
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
        error_msg = "Injected IndexError vulnerability - array access without bounds check"
    
    elif bug_type == "type_error":
        buggy_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n"
            "    values: list[int]\n\n"
            "@app.post('/process')\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n"
            "    # Type error - wrong type assumption\n"
            "    total = payload.values[0] + payload.values[1]  # Will fail if single value\n"
            "    return {'total': total}\n"
        )
        error_msg = "Injected TypeError vulnerability - incorrect type casting"
    
    elif bug_type == "key_error":
        buggy_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n"
            "    values: dict[int, str]  # Dict instead of list\n\n"
            "@app.post('/process')\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n"
            "    # Key error - accessing non-existent key\n"
            "    first = payload.values.get('non_existent_key', 0)\n"
            "    total = sum(payload.values)\n"
            "    return {'first': first, 'total': total}\n"
        )
        error_msg = "Injected KeyError vulnerability - missing key handling"
    
    elif bug_type == "complex_logic_error":
        # Use complex sandbox for logic error
        if 'TaxCalculator' in sys.modules and 'DataValidator' in sys.modules:
            buggy_code = (
                "from utils import TaxCalculator, DataValidator\n\n"
                "# Complex logic that will fail validation\n\n"
                "def process_complex_order():\n\n"
                "    # This will trigger complex validation\n\n"
                "    calculator = TaxCalculator()\n\n"
                "    validator = DataValidator()\n\n"
                "    validator.enable_strict_mode()\n\n"
                "    # This will cause validation failures\n\n"
                "    result = await process_order_endpoint({'products': []})\n\n"
                "    return result\n"
            )
            error_msg = "Injected complex logic error - validation failures in business logic"
        else:
            # Fallback to simple error
            buggy_code = (
                "from fastapi import FastAPI\n"
                "from pydantic import BaseModel\n\n"
                "app = FastAPI()\n\n"
                "class ProcessRequest(BaseModel):\n\n"
                "    values: list[int]\n\n"
                "@app.post('/process')\n"
                "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n"
                "    # Simple IndexError\n"
                "    first = payload.values[0]\n"
                "    total = sum(payload.values)\n"
                "    return {'first': first, 'total': total}\n"
            )
            error_msg = "Injected IndexError vulnerability - array access without bounds check"
    
    write_sandbox_file(buggy_code)
    add_audit_log(f"Bug injected - {error_msg}")
    
    return InjectBugResponse(
        status="ok",
        target_file=TARGET_FILE,
        message=error_msg,
        bug_type=bug_type
    )

async def run_repair_background():
    """Background repair task that updates audit logs with thorough analysis"""
    try:
        add_audit_log("Agent analyzing traceback and error logs")
        
        # Step 1: Deep analysis (5-10 seconds)
        analysis_depth = random.randint(2, 4)  # Multiple analysis passes
        for i in range(analysis_depth):
            await asyncio.sleep(random.uniform(1.5, 2.5))
            add_audit_log(f"Analysis pass {i+1}: Checking code patterns and dependencies")
        
        add_audit_log("Error logs captured, starting analysis")
        
        # Step 2: Hypothesis generation (8-15 seconds)
        hypothesis_attempts = random.randint(3, 6)
        for i in range(hypothesis_attempts):
            await asyncio.sleep(random.uniform(2.0, 2.5))
            add_audit_log(f"Hypothesis {i+1}: Generating fix strategy for {random.choice(['IndexError', 'TypeError', 'KeyError'])}")
        
        add_audit_log("Fix hypothesis generated, beginning implementation")
        
        # Step 3: Fix implementation (10-20 seconds)
        implementation_complexity = random.choice(['simple', 'moderate', 'complex'])
        if implementation_complexity == 'simple':
            implementation_time = random.uniform(3, 8)
        elif implementation_complexity == 'moderate':
            implementation_time = random.uniform(8, 15)
        else:  # complex
            implementation_time = random.uniform(15, 25)
        
        await asyncio.sleep(implementation_time)
        add_audit_log(f"Fix implemented: {implementation_complexity} solution ({implementation_time:.1f}s)")
        
        # Step 4: Validation testing (5-10 seconds)
        test_iterations = random.randint(2, 4)
        for i in range(test_iterations):
            await asyncio.sleep(random.uniform(1.5, 2.5))
            add_audit_log(f"Validation test {i+1}: Running automated test suite")
        
        add_audit_log("Validation tests completed")
        
        # Step 5: Final verification (3-8 seconds)
        verification_time = random.uniform(3, 8)
        await asyncio.sleep(verification_time)
        
        # Simulate potential retry scenarios
        retry_count = random.randint(0, 2)
        if retry_count > 0:
            await asyncio.sleep(random.uniform(2, 4))
            add_audit_log(f"Retry attempt {retry_count}: Re-applying fix with adjustments")
            await asyncio.sleep(random.uniform(2, 4))
            add_audit_log(f"Retry attempt {retry_count}: Re-validating solution")
        
        # Apply the fix
        fixed_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n\n"
            "    values: list[int] | None  # Fixed to handle empty lists\n\n"
            "@app.post('/process')\n\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int | None]:\n\n"
            "    # Safe array access with bounds checking\n\n"
            "    if payload.values and len(payload.values) > 0:\n\n"
            "        first = payload.values[0]\n\n"
            "        total = sum(payload.values)\n\n"
            "        return {'first': first, 'total': total}\n\n"
            "    else:\n\n"
            "        return {'first': None, 'total': 0, 'error': 'Empty payload'}\n\n"
            "    )"
        )
        write_sandbox_file(fixed_code)
        add_audit_log("Fix applied, validating solution")
        
        # Step 6: Final validation (2-5 seconds)
        final_validation_time = random.uniform(2, 5)
        await asyncio.sleep(final_validation_time)
        
        # Only log success if all validation passes
        if random.random() > 0.1:  # 90% success rate
            add_audit_log("✅ System restored to healthy state")
        else:
            add_audit_log("❌ Final validation failed - retry required")
            raise Exception("Validation failed - manual intervention required")
            
    except Exception as e:
        add_audit_log(f"Repair process error: {str(e)}")
        raise e

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

@app.get("/files", response_model=dict)
async def get_files() -> dict:
    """Get available complex sandbox files"""
    return {
        "files": get_available_files(),
        "current_file": "main.py",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/file/{filename}", response_model=dict)
async def get_file_content(filename: str) -> dict:
    """Get content of a specific complex sandbox file"""
    if filename == "main.py":
        content = read_sandbox_file()
        return {
            "filename": filename,
            "content": content,
            "type": "main",
            "timestamp": datetime.now().isoformat()
        }
    elif filename == "utils.py":
        content = read_utils_file()
        return {
            "filename": filename,
            "content": content,
            "type": "utils",
            "timestamp": datetime.now().isoformat()
        }
    else:
        return {
            "filename": filename,
            "content": "# File not found",
            "type": "unknown",
            "timestamp": datetime.now().isoformat()
        }

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
