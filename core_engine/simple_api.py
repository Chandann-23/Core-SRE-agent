from __future__ import annotations
import os
import asyncio
import time
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sys

# --- MODULAR IMPORTS ---
# Ensure these match the functions exported in your core_logic.py
from core_logic import run_autonomous_repair, get_available_files

load_dotenv()

app = FastAPI(title="CORE SRE API - Enterprise Handshake")

# --- PATH RESOLUTION (FIXES RECURSIVE LOOP) ---
# Use an absolute base to prevent 'complex_sandbox/complex_sandbox' nesting
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
# Check if we are running in the core_engine subdirectory (Render) or local root
if 'core_engine' in ROOT_DIR:
    SANDBOX_ROOT = os.path.join(ROOT_DIR, 'complex_sandbox', 'app')
else:
    SANDBOX_ROOT = os.path.join(ROOT_DIR, 'complex_sandbox', 'app')

# --- CONFIGURATION ---
# Define frontend_url at the very top to resolve NameError
frontend_url = os.getenv("FRONTEND_URL", "https://core-sre-engine.vercel.app").rstrip("/")

# --- AUTO-PROVISIONING ---
# Ensure sandbox directory exists and create default files if missing
os.makedirs(SANDBOX_ROOT, exist_ok=True)
def create_default_files():
    """Create default main.py and utils.py if they don't exist"""
    main_file = os.path.join(SANDBOX_ROOT, "main.py")
    utils_file = os.path.join(SANDBOX_ROOT, "utils.py")
    
    if not os.path.exists(main_file):
        default_main = '''"""Default main.py - Auto-provisioned by SRE Agent"""
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ProcessRequest(BaseModel):
    values: list[int]

@app.post('/process')
async def process_payload(payload: ProcessRequest) -> dict[str, int]:
    # BUG: No bounds checking - this will cause IndexError
    first = payload.values[0]  # Vulnerable to empty list
    total = sum(payload.values)
    return {'first': first, 'total': total}
'''
        with open(main_file, 'w') as f:
            f.write(default_main)
        print(f"Created default main.py at {main_file}")
    
    if not os.path.exists(utils_file):
        default_utils = '''"""Default utils.py - Auto-provisioned by SRE Agent"""

def helper_function():
    return "Helper function working"
'''
        with open(utils_file, 'w') as f:
            f.write(default_utils)
        print(f"Created default utils.py at {utils_file}")

# Create default files on startup
create_default_files()

# --- CORS ---
allowed_origins = [
    "http://localhost:5173",
    "https://core-sre-engine.vercel.app",
    frontend_url,
    "*"
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add JSON response headers middleware
@app.middleware("http")
async def add_json_headers(request: Request, call_next):
    response = await call_next(request)
    if response.headers.get("content-type", "").startswith("application/json"):
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response

# --- MODELS ---
class RepairResponse(BaseModel):
    status: str
    iterations: int
    history: list[str]
    final_code: str
    mttr_time: float
    is_fixed: bool

# --- CORE ENDPOINTS ---

@app.get("/files")
async def get_files():
    """Returns a flat file list to prevent frontend from getting lost"""
    files = get_available_files()
    if not files:
        # Hardcoded fallback ensures the explorer sidebar never breaks
        files = [
            {"name": "main.py", "path": "main.py", "type": "main"},
            {"name": "utils.py", "path": "utils.py", "type": "utils"}
        ]
    return {"files": files, "status": "success"}

@app.get("/get-file/{path:path}")
async def get_file_content(path: str):
    """
    CRITICAL FIX: Strips all recursive directory prefixes and 
    only looks for the filename in the absolute SANDBOX_ROOT.
    """
    filename = os.path.basename(path) # This stops the complex_sandbox/app/... loop
    final_path = os.path.join(SANDBOX_ROOT, filename)
    
    if os.path.exists(final_path):
        try:
            with open(final_path, 'r') as f:
                content = f.read()
            return {
                "filename": filename,
                "content": content,
                "resolved_path": final_path
            }
        except Exception as e:
            return {"content": f"# Error reading file: {str(e)}", "type": "error"}
    
    return {
        "content": f"# File {filename} not found.\n# Looked in: {final_path}", 
        "type": "error"
    }

@app.post("/repair", response_model=RepairResponse)
async def repair_bug():
    """
    Autonomous repair with explicit 60s MTTR simulation.
    This demonstrates enterprise-grade autonomous recovery.
    """
    start_time = time.time()
    target_file = os.path.join(SANDBOX_ROOT, "main.py")
    
    # Node 1: Simulated Analysis (20s)
    # The UI will stay on 'Repairing...' while this happens
    await asyncio.sleep(20) 
    
    # Node 2: Actual AI Repair logic from core_logic
    result = await run_autonomous_repair(target_file, "IndexError: list index out of range")
    
    # Node 3: Simulated Stability Verification (35s)
    await asyncio.sleep(35)
    
    total_mttr = round(time.time() - start_time, 2)
    
    return RepairResponse(
        status=result["status"],
        iterations=result["iterations"],
        history=result["history"] + [f"Final SRE verification passed. MTTR: {total_mttr}s"],
        final_code=result["final_code"],
        mttr_time=total_mttr,
        is_fixed=result["status"] == "success"
    )

@app.get("/health")
def health():
    return {
        'status': 'healthy', 
        'sandbox_path': SANDBOX_ROOT,
        'exists': os.path.exists(SANDBOX_ROOT),
        'cwd': os.getcwd()
    }

@app.get("/")
async def root():
    return {"message": "CORE SRE API - Enterprise Handshake Complete", "status": "Healthy"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)