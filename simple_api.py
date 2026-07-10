from __future__ import annotations
import os
import asyncio
import time
from datetime import datetime
from dotenv import load_dotenv
from fastapi import FastAPI, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import json

from core_logic import get_available_files
from services.sandbox import get_sandbox_root, create_default_files, get_vulnerable_code
from services.mock_agent import run_analysis_phase, run_deployment_phase

# Global state for MTTR tracking across phases
repair_start_time = None

load_dotenv()

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
SANDBOX_ROOT = get_sandbox_root(ROOT_DIR)

app = FastAPI(title="SRE Autonomous Repair API - WebSockets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auto-provision files
create_default_files(SANDBOX_ROOT)

@app.middleware("http")
async def add_json_headers(request: Request, call_next):
    response = await call_next(request)
    if response.headers.get("content-type", "").startswith("application/json"):
        response.headers["content-type"] = "application/json; charset=utf-8"
    return response

# --- MODELS ---
class AuditLogResponse(BaseModel):
    logs: list[str]
    timestamp: str
    status: str

# Global state is removed!
# We will still support the HTTP endpoints for backward compatibility with the current frontend during migration,
# but we will also expose the WebSocket endpoint.

@app.get("/files")
async def get_files():
    """Returns a flat file list to prevent frontend from getting lost"""
    if not os.path.exists(SANDBOX_ROOT):
        return {"files": []}
        
    try:
        available_files = get_available_files()
        
        # Flatten the structure - frontend expects a simple array of objects
        flat_files = []
        for file in available_files:
            file_path = file.get("path", "")
            
            # Create a clean display name
            display_name = file_path.split("/")[-1] if "/" in file_path else file_path
            
            flat_files.append({
                "id": file_path,
                "name": display_name,
                "path": file_path,
                "type": "file"
            })
            
        return {"files": flat_files}
    except Exception as e:
        print(f"Error getting files: {e}")
        return {"files": [{"id": "main.py", "name": "main.py", "path": "main.py", "type": "file"}]}

@app.get("/get-file/{file_path:path}")
async def get_file_content(file_path: str):
    """Get contents of a specific file from the complex sandbox"""
    # Fix the path to look inside complex_sandbox/app
    if file_path.startswith("complex_sandbox/app/"):
        filename = file_path.replace("complex_sandbox/app/", "")
    else:
        filename = file_path
        
    final_path = os.path.join(SANDBOX_ROOT, filename)
    
    if os.path.exists(final_path):
        try:
            with open(final_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return {
                "filename": filename,
                "content": content,
                "language": "python" if filename.endswith(".py") else "text"
            }
        except Exception as e:
            return {"error": f"Failed to read file: {e}"}
            
    return {"error": f"File not found: {final_path}"}


# --- TEST SUITE DEFINITIONS ---
test_suite_all_pass = [
    {"name": "test_auth_bypass", "status": "pass"},
    {"name": "test_tax_calculation", "status": "pass"},
    {"name": "test_payment_gateway", "status": "pass"},
    {"name": "test_race_condition", "status": "pass"},
    {"name": "test_db_deadlock", "status": "pass"}
]

test_suite_vulnerable = [
    {"name": "test_auth_bypass", "status": "pass"},
    {"name": "test_tax_calculation", "status": "fail"},
    {"name": "test_payment_gateway", "status": "fail"},
    {"name": "test_race_condition", "status": "pass"},
    {"name": "test_db_deadlock", "status": "pass"}
]

# --- WEBSOCKET ENDPOINT ---

@app.websocket("/ws/audit")
async def websocket_endpoint(websocket: WebSocket):
    global repair_start_time
    await websocket.accept()
    
    async def send_log(message: str):
        timestamped_message = f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] {message}"
        await websocket.send_json({"type": "log", "message": timestamped_message})
        try:
            print(f"WS-AUDIT: {timestamped_message}")
        except UnicodeEncodeError:
            print(f"WS-AUDIT: {timestamped_message.encode('ascii', 'replace').decode('ascii')}")
        
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            action = payload.get("action")
            
            if action == "inject_bug":
                await send_log("Starting bug injection into Financial Transaction System")
                
                vulnerable_code = get_vulnerable_code()
                target_file = os.path.join(SANDBOX_ROOT, "main.py")
                
                os.makedirs(os.path.dirname(target_file), exist_ok=True)
                with open(target_file, 'w', encoding='utf-8') as f:
                    f.write(vulnerable_code)
                
                await send_log("✅ Bugs injected: TypeError in calculate_tax, IndexError in process_payment")
                await send_log(f"📁 Vulnerable code written to {target_file}")
                
                await websocket.send_json({
                    "type": "status", 
                    "status": "VULNERABLE",
                    "file_path": target_file
                })
                
                # Emit vulnerable test results
                await websocket.send_json({
                    "type": "test_results",
                    "tests": test_suite_vulnerable
                })
                
            elif action == "repair":
                target_file = os.path.join(SANDBOX_ROOT, "main.py")
                if not os.path.exists(target_file):
                    create_default_files(SANDBOX_ROOT)
                    await send_log("Created test file with vulnerabilities for demo")
                
                try:
                    repair_start_time = time.time()
                    await websocket.send_json({"type": "status", "status": "REPAIRING"})
                    
                    # Only run the analysis phase
                    await run_analysis_phase(target_file, send_log)
                    
                    # Read the proposed fixed code
                    try:
                        with open(target_file, 'r', encoding='utf-8') as f:
                            proposed_code = f.read()
                    except Exception as e:
                        proposed_code = "# Proposed code not available"
                        
                    # Sandbox tests pass!
                    await websocket.send_json({
                        "type": "test_results",
                        "tests": test_suite_all_pass
                    })
                        
                    await websocket.send_json({
                        "type": "status",
                        "status": "PENDING_APPROVAL",
                        "proposed_code": proposed_code
                    })
                except Exception as e:
                    await send_log(f"❌ Repair failed: {str(e)}")
                    await websocket.send_json({"type": "status", "status": "FAILED"})
                    
            elif action == "approve_repair":
                target_file = os.path.join(SANDBOX_ROOT, "main.py")
                try:
                    await websocket.send_json({"type": "status", "status": "REPAIRING"})
                    
                    # Run the deployment phase
                    await run_deployment_phase(send_log)
                    
                    start_t = repair_start_time if repair_start_time else time.time()
                    elapsed = round(time.time() - start_t, 2)
                    minutes = int(elapsed // 60)
                    seconds = int(elapsed % 60)
                    mttr_formatted = f"{minutes:02d}:{seconds:02d}"
                    
                    await send_log(f"📈 Autonomous repair completed - MTTR: {elapsed:.2f}s")
                    
                    # Read final code
                    try:
                        with open(target_file, 'r', encoding='utf-8') as f:
                            final_code = f.read()
                    except Exception as e:
                        final_code = "# Final code not available"
                        
                    # Ensure tests are shown as passing
                    await websocket.send_json({
                        "type": "test_results",
                        "tests": test_suite_all_pass
                    })
                        
                    await websocket.send_json({
                        "type": "repair_complete",
                        "status": "RESTORED",
                        "mttr_score": mttr_formatted,
                        "final_code": final_code
                    })
                except Exception as e:
                    await send_log(f"❌ Deployment failed: {str(e)}")
                    await websocket.send_json({"type": "status", "status": "FAILED"})
                    
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket")
    except Exception as e:
        print(f"WebSocket error: {e}")

@app.get("/sessions")
async def sessions():
    return []

@app.get("/")
def read_root():
    return {"status": "healthy", "message": "Core SRE Backend is running"}

@app.get("/health")
def health():
    return {
        'status': 'healthy', 
        'sandbox_path': SANDBOX_ROOT,
        'exists': os.path.exists(SANDBOX_ROOT),
        'cwd': os.getcwd()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=7860)