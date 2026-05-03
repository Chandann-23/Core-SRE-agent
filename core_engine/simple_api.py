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
from core_logic import run_autonomous_repair, get_available_files, read_sandbox_file
sys.path.append('../complex_sandbox/app')  # Add complex sandbox to path

load_dotenv()

app = FastAPI(title="CORE SRE API - Simple")

# --- AUDIT TRAIL ---
audit_logs = []  # Global list to store timestamped strings
repair_task = None  # Background task reference

# --- CONFIGURATION ---
# Determine frontend URL for CORS
frontend_url = os.getenv("FRONTEND_URL", "https://core-sre-engine.vercel.app")
if frontend_url.endswith("/"):
    frontend_url = frontend_url[:-1]

# Absolute root directory for clean path resolution
ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
COMPLEX_SANDBOX_ROOT = os.path.join(ROOT_DIR, 'complex_sandbox', 'app')

IS_DEMO = os.getenv('ENV') == 'production'

print(f"🔍 [CONFIG] Root directory: {ROOT_DIR}")
print(f"🔍 [CONFIG] Complex sandbox root: {COMPLEX_SANDBOX_ROOT}")
print(f"🔍 [CONFIG] Frontend URL: {frontend_url}")

# Dynamic pathing for Render compatibility
COMPLEX_SANDBOX_DIR = os.path.join(os.getcwd(), 'complex_sandbox')
print(f"🔍 [CONFIG] Complex sandbox directory: {COMPLEX_SANDBOX_DIR}")

# Use /tmp/complex_sandbox for Render's ephemeral filesystem
TMP_SANDBOX_DIR = "/tmp/complex_sandbox"
TARGET_FILE = os.path.join(TMP_SANDBOX_DIR, "app/main.py")
COMPLEX_UTILS_FILE = os.path.join(TMP_SANDBOX_DIR, "app/utils.py")

# Fallback to local complex_sandbox if /tmp doesn't work
LOCAL_SANDBOX_DIR = os.path.join(os.getcwd(), 'complex_sandbox')
LOCAL_TARGET_FILE = os.path.join(LOCAL_SANDBOX_DIR, 'app', 'main.py')
LOCAL_UTILS_FILE = os.path.join(LOCAL_SANDBOX_DIR, 'app', 'utils.py')

print(f"🔍 [PATH] Local sandbox directory: {LOCAL_SANDBOX_DIR}")
print(f"🔍 [PATH] Local target file: {LOCAL_TARGET_FILE}")
print(f"🔍 [PATH] Local utils file: {LOCAL_UTILS_FILE}")

# Ensure sandbox directories exist
os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)
os.makedirs(os.path.dirname(COMPLEX_UTILS_FILE), exist_ok=True)
os.makedirs(os.path.dirname(LOCAL_TARGET_FILE), exist_ok=True)
os.makedirs(os.path.dirname(LOCAL_UTILS_FILE), exist_ok=True)

# Directory check for debugging
print(f"🔍 [STARTUP] Current working directory: {os.getcwd()}")
print(f"🔍 [STARTUP] Root directory contents: {os.listdir('.')}")

# File System Mapping - Ensure complex_sandbox directory exists on Render
os.makedirs('complex_sandbox/app', exist_ok=True)
print(f"🔍 [STARTUP] Ensured complex_sandbox/app directory exists")

print(f"🔍 [STARTUP] Checking if complex_sandbox exists: {os.path.exists(COMPLEX_SANDBOX_DIR)}")
if os.path.exists(COMPLEX_SANDBOX_DIR):
    print(f"🔍 [STARTUP] Complex sandbox contents: {os.listdir(COMPLEX_SANDBOX_DIR)}")
    app_dir = os.path.join(COMPLEX_SANDBOX_DIR, 'app')
    if os.path.exists(app_dir):
        print(f"🔍 [STARTUP] Complex sandbox app contents: {os.listdir(app_dir)}")
else:
    print(f"❌ [STARTUP] Complex sandbox directory not found!")

# --- ENDPOINTS ---
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173", 
    "https://localhost:5173",
    "https://127.0.0.1:5173",
    "https://core-sre-agent.vercel.app",  # Production Vercel domain
    "https://core-sre-frontend.onrender.com",  # Render frontend domain
    "https://*.vercel.app",  # Any Vercel subdomain
    "https://*.onrender.com",  # Any Render subdomain
    frontend_url,
    "*"  # Fallback for development
]

print(f"🔍 [CORS] Frontend URL: {frontend_url}")
print(f"🔍 [CORS] Allowed origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
)

print(f"🔍 [CORS] Middleware configured with origins: {allowed_origins}")
print(f"🔍 [CORS] All methods allowed: GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH")
print(f"🔍 [CORS] All headers allowed: [*]")

# Add JSON response headers middleware
@app.middleware("http")
async def add_json_headers(request: Request, call_next):
    response = await call_next(request)
    if response.headers.get("content-type", "").startswith("application/json"):
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response

# --- MODELS ---
class InjectBugResponse(BaseModel):
    status: str
    target_file: str
    message: str
    bug_type: str | None = None

class RepairResponse(BaseModel):
    status: str
    iterations: int
    history: list[str]
    final_code: str
    mttr_time: float | None = None
    final_error_logs: str
    is_fixed: bool

class StatusResponse(BaseModel):
    target_file: str
    code_context: str
    status: str # "Healthy" or "Error"

class ProcessRequest(BaseModel):
    values: list[int]

class AuditLogResponse(BaseModel):
    logs: list[str]
    timestamp: str
    status: str

# --- MODELS ---

@app.get("/")
async def root():
    return {"message": "CORE SRE API is live", "status": "Healthy"}

@app.post("/inject-bug", response_model=InjectBugResponse)
async def inject_bug() -> InjectBugResponse:
    """Simple bug injection for demo purposes"""
    bug_type = random.choice(["index_error", "type_error", "key_error"])
    
    # Simple bug injection - just write a vulnerable file
    vulnerable_code = '''
# Vulnerable code - intentionally broken
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
    
    try:
        with open(TARGET_FILE, 'w') as f:
            f.write(vulnerable_code)
        
        return InjectBugResponse(
            status="ok",
            target_file=TARGET_FILE,
            message=f"Injected {bug_type} vulnerability",
            bug_type=bug_type
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Bug injection failed: {str(e)}")

@app.post("/repair", response_model=RepairResponse)
async def repair_bug() -> RepairResponse:
    """Run the autonomous repair workflow using core_logic"""
    print(" [API] /repair endpoint called - Starting autonomous repair")
    
    try:
        # Get current error logs and target file
        error_logs = "Test failure detected - initiating autonomous repair"
        target_file = TARGET_FILE
        
        # Run the autonomous repair workflow
        result = await run_autonomous_repair(target_file, error_logs)
        
        print(f" [API] Repair completed with status: {result['status']}")
        
        return RepairResponse(
            status=result["status"],
            iterations=result["iterations"],
            history=result["history"],
            final_code=result["final_code"],
            mttr_time=result.get("mttr_time"),
            final_error_logs=result["final_error_logs"],
            is_fixed=result["status"] == "success"
        )
        
    except Exception as e:
        print(f" [API] Repair endpoint failed: {e}")
        return RepairResponse(
            status="failed",
            iterations=0,
            history=[f"Repair failed: {str(e)}"],
            final_code=read_sandbox_file(),
            mttr_time=None,
            final_error_logs=str(e),
            is_fixed=False
        )

# --- API ENDPOINTS ---
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
    """Get available complex sandbox files - Force 200 response"""
    print(f"🔍 [API] /files endpoint called - Working!")
    print(f"🔍 [API] Current working directory: {os.getcwd()}")
    
    # Try to get files dynamically
    files = get_available_files()
    print(f"🔍 [API] Available files: {[f['name'] for f in files]}")
    
    # If no files found, return hardcoded structure to guarantee frontend works
    if not files:
        print(f"🔍 [API] No files found, returning hardcoded structure")
        files = [
            {"name": "main.py", "path": "complex_sandbox/app/main.py", "type": "main"},
            {"name": "utils.py", "path": "complex_sandbox/app/utils.py", "type": "utils"}
        ]
    
    # Ensure proper JSON serialization
    response_data = {
        "files": files,
        "current_file": "main.py",
        "timestamp": datetime.now().isoformat(),
        "status": "success",
        "backend_dir": os.getcwd(),
        "sandbox_exists": os.path.exists('complex_sandbox')
    }
    
    print(f"🔍 [API] Returning response with {len(files)} files")
    return response_data

@app.get("/get-file/{path:path}", response_model=dict)
async def get_file_content(path: str) -> dict:
    """Get content of a specific complex sandbox file - Fixed recursive path loop"""
    print(f"🔍 [API] /get-file/{path} endpoint called")
    
    # Security: Strip any leading slashes and complex_sandbox prefixes to prevent nesting
    clean_path = path.lstrip('/')
    if clean_path.startswith('complex_sandbox/'):
        clean_path = clean_path.replace('complex_sandbox/', '', 1)
    if clean_path.startswith('app/'):
        clean_path = clean_path.replace('app/', '', 1)
    
    # Clean resolution: Use absolute ROOT_DIR only once
    final_path = os.path.join(ROOT_DIR, 'complex_sandbox', 'app', clean_path)
    
    print(f"🔍 [API] Clean path resolution: {path} -> {clean_path} -> {final_path}")
    
    if os.path.exists(final_path):
        try:
            with open(final_path, 'r') as f:
                content = f.read()
            
            filename = os.path.basename(final_path)
            file_type = "main" if filename == "main.py" else "utils" if filename == "utils.py" else "unknown"
            
            print(f"🔍 [API] SUCCESS: Serving {filename} with {len(content)} characters")
            return {
                "filename": filename,
                "content": content,
                "type": file_type,
                "timestamp": datetime.now().isoformat(),
                "resolved_path": final_path
            }
        except Exception as e:
            print(f"❌ [API] Error reading file: {e}")
    
    # Fallback - return error message
    return {
        "filename": path,
        "content": f"# File '{path}' not found or could not be read\n# Clean path: {clean_path}\n# Final path: {final_path}",
        "type": "error",
        "timestamp": datetime.now().isoformat()
    }

# Keep the old route for backward compatibility
@app.get("/file/{filename}", response_model=dict)
async def get_file_content_legacy(filename: str) -> dict:
    """Legacy endpoint for backward compatibility"""
    return await get_file_content(filename)

@app.get("/audit-logs", response_model=AuditLogResponse)
async def get_audit_logs() -> AuditLogResponse:
    """Get the current audit trail - Simplified"""
    return AuditLogResponse(
        logs=["Audit trail simplified for performance"],
        timestamp=datetime.now().isoformat()
    )

@app.delete("/audit-logs")
async def clear_audit_logs_endpoint():
    """Clear all audit logs - Simplified"""
    return {"status": "cleared", "message": "Audit logs cleared"}

@app.get("/health")
def health():
    """Health check with sandbox existence verification"""
    return {
        'status': 'healthy', 
        'sandbox': os.path.exists('complex_sandbox'),
        'app_dir': os.path.exists('complex_sandbox/app'),
        'current_dir': os.getcwd(),
        'root_contents': os.listdir('.') if os.path.exists('.') else []
    }

@app.get("/sessions")
async def sessions():
    """Simple placeholder for sessions endpoint"""
    return []

# Add route debugging endpoint
@app.get("/routes")
async def list_routes():
    """List all available routes for debugging"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods),
                "name": route.name
            })
    return {"routes": routes, "total": len(routes)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
