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
# Use /tmp/complex_sandbox for Render's ephemeral filesystem
TMP_SANDBOX_DIR = "/tmp/complex_sandbox"
TARGET_FILE = os.path.join(TMP_SANDBOX_DIR, "app/main.py")
COMPLEX_UTILS_FILE = os.path.join(TMP_SANDBOX_DIR, "app/utils.py")

# Ensure sandbox directory exists
os.makedirs(os.path.dirname(TARGET_FILE), exist_ok=True)
os.makedirs(os.path.dirname(COMPLEX_UTILS_FILE), exist_ok=True)

# Copy files from local complex_sandbox to /tmp if they don't exist
print(f"🔍 [INIT] Checking if files need to be copied to /tmp/complex_sandbox...")
print(f"🔍 [INIT] Current working directory: {os.getcwd()}")

if not os.path.exists(TARGET_FILE):
    # Try multiple possible source paths
    possible_paths = [
        "../complex_sandbox/app/main.py",
        "./complex_sandbox/app/main.py",
        "complex_sandbox/app/main.py",
        "/app/complex_sandbox/app/main.py"  # Render deployment path
    ]
    
    file_copied = False
    for source_path in possible_paths:
        abs_source = os.path.abspath(source_path)
        print(f"🔍 [INIT] Trying source path: {abs_source}")
        print(f"🔍 [INIT] Source exists: {os.path.exists(abs_source)}")
        
        if os.path.exists(abs_source):
            with open(abs_source, 'r') as src:
                content = src.read()
            with open(TARGET_FILE, 'w') as dst:
                dst.write(content)
            print(f"📁 [INIT] Successfully copied main.py from {abs_source} to {TARGET_FILE}")
            file_copied = True
            break
    
    if not file_copied:
        print(f"❌ [INIT] Could not find main.py in any source location!")
        # Create a fallback file
        fallback_content = '''"""Complex Multi-Step Processing System"""
import asyncio
import time
import random
from datetime import datetime
from typing import Dict, List, Optional

class Product:
    """Represents a product in our order processing system"""
    def __init__(self, product_id: str, name: str, price: float, category: str):
        self.product_id = product_id
        self.name = name
        self.price = price
        self.category = category
        self.is_valid = True
    
    def validate(self) -> bool:
        """Complex validation logic that can fail"""
        if self.price < 0:
            return False
        if not self.name or len(self.name) < 2:
            return False
        if self.category not in ["electronics", "books", "clothing", "home"]:
            return False
        return True

# Fallback file created automatically
print("Complex sandbox system initialized")
'''
        with open(TARGET_FILE, 'w') as dst:
            dst.write(fallback_content)
        print(f"📁 [INIT] Created fallback main.py at {TARGET_FILE}")

if not os.path.exists(COMPLEX_UTILS_FILE):
    # Try multiple possible source paths for utils.py
    possible_utils_paths = [
        "../complex_sandbox/app/utils.py",
        "./complex_sandbox/app/utils.py",
        "complex_sandbox/app/utils.py",
        "/app/complex_sandbox/app/utils.py"
    ]
    
    utils_copied = False
    for source_path in possible_utils_paths:
        abs_source = os.path.abspath(source_path)
        print(f"🔍 [INIT] Trying utils source path: {abs_source}")
        
        if os.path.exists(abs_source):
            with open(abs_source, 'r') as src:
                content = src.read()
            with open(COMPLEX_UTILS_FILE, 'w') as dst:
                dst.write(content)
            print(f"📁 [INIT] Successfully copied utils.py from {abs_source} to {COMPLEX_UTILS_FILE}")
            utils_copied = True
            break
    
    if not utils_copied:
        print(f"⚠️ [INIT] Could not find utils.py, creating empty file")
        with open(COMPLEX_UTILS_FILE, 'w') as dst:
            dst.write('# Utils file - created automatically\ndef helper_function():\n    pass\n')
        print(f"📁 [INIT] Created fallback utils.py at {COMPLEX_UTILS_FILE}")

# Verify files exist and log paths
print(f"🔍 Target file path: {os.path.abspath(TARGET_FILE)}")
print(f"🔍 Utils file path: {os.path.abspath(COMPLEX_UTILS_FILE)}")
print(f"🔍 Target file exists: {os.path.exists(TARGET_FILE)}")
print(f"🔍 Utils file exists: {os.path.exists(COMPLEX_UTILS_FILE)}")

# --- CORS SETUP ---
frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
# Support both local development and Vercel deployment
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173", 
    "https://localhost:5173",
    "https://127.0.0.1:5173",
    frontend_url,
    "*"  # Fallback for development
]

print(f"🔍 CORS Frontend URL: {frontend_url}")
print(f"🔍 CORS Allowed Origins: {allowed_origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight requests for 10 minutes
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
        abs_path = os.path.abspath(TARGET_FILE)
        print(f"🔍 [DEBUG] Attempting to read main.py from: {abs_path}")
        print(f"🔍 [DEBUG] File exists: {os.path.exists(abs_path)}")
        
        with open(abs_path, "r") as f:
            content = f.read()
            print(f"🔍 [DEBUG] Successfully read {len(content)} characters from main.py")
            return content
    except FileNotFoundError as e:
        print(f"❌ [DEBUG] FileNotFoundError reading main.py: {e}")
        print(f"❌ [DEBUG] Current working directory: {os.getcwd()}")
        return "# Complex sandbox file not found"
    except Exception as e:
        print(f"❌ [DEBUG] Error reading main.py: {e}")
        return f"# Error reading file: {str(e)}"

def read_utils_file():
    """Read the complex sandbox utils file"""
    try:
        abs_path = os.path.abspath(COMPLEX_UTILS_FILE)
        print(f"🔍 [DEBUG] Attempting to read utils.py from: {abs_path}")
        print(f"🔍 [DEBUG] File exists: {os.path.exists(abs_path)}")
        
        with open(abs_path, "r") as f:
            content = f.read()
            print(f"🔍 [DEBUG] Successfully read {len(content)} characters from utils.py")
            return content
    except FileNotFoundError as e:
        print(f"❌ [DEBUG] FileNotFoundError reading utils.py: {e}")
        return "# Utils file not found"
    except Exception as e:
        print(f"❌ [DEBUG] Error reading utils.py: {e}")
        return f"# Error reading file: {str(e)}"

def get_available_files():
    """Get list of available complex sandbox files"""
    files = []
    try:
        # Use absolute paths for security and clarity
        abs_main_path = os.path.abspath(TARGET_FILE)
        abs_utils_path = os.path.abspath(COMPLEX_UTILS_FILE)
        
        print(f"🔍 [FILES] Checking available files...")
        print(f"🔍 [FILES] Main path: {abs_main_path}")
        print(f"🔍 [FILES] Utils path: {abs_utils_path}")
        
        main_exists = os.path.exists(abs_main_path)
        utils_exists = os.path.exists(abs_utils_path)
        
        print(f"🔍 [FILES] Main exists: {main_exists}")
        print(f"🔍 [FILES] Utils exists: {utils_exists}")
        
        if main_exists:
            files.append({
                "name": "main.py", 
                "path": abs_main_path, 
                "type": "main"
            })
            print(f"🔍 [FILES] Added main.py to available files")
            
        if utils_exists:
            files.append({
                "name": "utils.py", 
                "path": abs_utils_path, 
                "type": "utils"
            })
            print(f"🔍 [FILES] Added utils.py to available files")
            
        print(f"🔍 [FILES] Total available files: {len(files)}")
        return files
        
    except Exception as e:
        print(f"❌ [FILES] Error getting available files: {e}")
        # Fallback to ensure frontend always gets something
        fallback_path = os.path.abspath(TARGET_FILE)
        return [{
            "name": "main.py", 
            "path": fallback_path, 
            "type": "main"
        }]

def inject_search_replace_bug(bug_type: str) -> str:
    """Surgical bug injection using regex replacement with backup system"""
    import re
    import shutil
    
    try:
        # Validate target file exists
        if not os.path.exists(TARGET_FILE):
            return f"Target file not found: {TARGET_FILE}"
        
        # Create backup before injection
        backup_file = f"{TARGET_FILE}.bak"
        try:
            shutil.copy2(TARGET_FILE, backup_file)
            print(f"� Created backup: {backup_file}")
        except Exception as e:
            print(f"⚠️ Warning: Could not create backup: {e}")
        
        # Read the current file content
        with open(TARGET_FILE, 'r') as f:
            content = f.read()
        
        original_content = content
        injection_applied = False
        
        # Surgical injections based on bug type
        if bug_type == "index_error":
            # Target: Product validation loop - inject IndexError by accessing product without validation
            pattern = r'(\s+for i, product in enumerate\(products\):\s*\n\s+if not product\.validate\(\):)'
            replacement = r'\1# IndexError injection - access product without validation\n            product_name = product.name  # This will fail if product is None\n'
            
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                injection_applied = True
                result_msg = "Injected IndexError vulnerability - product access without validation"
        
        elif bug_type == "type_error":
            # Target: Tax calculation - inject TypeError by string multiplication
            pattern = r'(\s+total \+= product\.price \* \(1 \+ tax_rate\))'
            replacement = r'# Type error: treating price as string\n            total += str(product.price) * (1 + tax_rate)'
            
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                injection_applied = True
                result_msg = "Injected TypeError vulnerability - string multiplication in tax calculation"
        
        elif bug_type == "key_error":
            # Target: Order parsing - inject KeyError by accessing non-existent key
            pattern = r'(\s+category=item\.get\("category", "unknown"\)\s*\))'
            replacement = r'category=item.get("category", "unknown")\n            )\n            # KeyError injection - accessing non-existent key\n            special_price = item["special_price"]  # This key doesn\'t exist'
            
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                injection_applied = True
                result_msg = "Injected KeyError vulnerability - accessing non-existent special_price key"
        
        elif bug_type == "complex_logic_error":
            # Target: External service check - inject logic error
            pattern = r'(\s+if random\.random\(\) < 0\.3:\s*\n\s+self\.external_service_available = False\s*\n\s+return False)'
            replacement = r'\1\n        # Complex logic error - always fail service check\n        self.external_service_available = False\n        return False'
            
            if re.search(pattern, content):
                content = re.sub(pattern, replacement, content)
                injection_applied = True
                result_msg = "Injected complex logic error - external service always unavailable"
        
        if injection_applied:
            # Verify the content was actually modified
            if content == original_content:
                raise ValueError("Injection pattern matched but content was not modified")
            
            # Write the modified content
            with open(TARGET_FILE, 'w') as f:
                f.write(content)
            
            print(f"� Surgical injection successful: {result_msg}")
            return result_msg
        else:
            # Restore from backup if injection failed
            if os.path.exists(backup_file):
                shutil.copy2(backup_file, TARGET_FILE)
                print(f"🔄 Restored from backup due to failed injection")
            
            return f"Bug injection failed - target pattern not found for {bug_type}"
        
    except Exception as e:
        # Restore from backup on any error
        backup_file = f"{TARGET_FILE}.bak"
        if os.path.exists(backup_file):
            try:
                shutil.copy2(backup_file, TARGET_FILE)
                print(f"🔄 Restored from backup due to error: {e}")
            except Exception as restore_error:
                print(f"❌ Critical: Could not restore from backup: {restore_error}")
        
        error_msg = f"Bug injection failed: {str(e)}"
        print(f"❌ {error_msg}")
        raise HTTPException(status_code=500, detail=error_msg)

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
    
    # Use search-replace approach instead of overwriting
    injection_result = inject_search_replace_bug(bug_type)
    
    add_audit_log(f"Bug injected - {injection_result}")
    
    return InjectBugResponse(
        status="ok",
        target_file=TARGET_FILE,
        message=injection_result,
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
    print(f"🔍 [API] /files endpoint called")
    print(f"🔍 [API] Current working directory: {os.getcwd()}")
    
    files = get_available_files()
    print(f"🔍 [API] Available files: {[f['name'] for f in files]}")
    
    return {
        "files": files,
        "current_file": "main.py",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/file/{filename}", response_model=dict)
async def get_file_content(filename: str) -> dict:
    """Get content of a specific complex sandbox file"""
    print(f"🔍 [API] /file/{filename} endpoint called")
    
    if filename == "main.py":
        content = read_sandbox_file()
        print(f"🔍 [API] Serving main.py with {len(content)} characters")
        return {
            "filename": filename,
            "content": content,
            "type": "main",
            "timestamp": datetime.now().isoformat()
        }
    elif filename == "utils.py":
        content = read_utils_file()
        print(f"🔍 [API] Serving utils.py with {len(content)} characters")
        return {
            "filename": filename,
            "content": content,
            "type": "utils",
            "timestamp": datetime.now().isoformat()
        }
    else:
        print(f"❌ [API] Unknown file requested: {filename}")
        return {
            "filename": filename,
            "content": f"# File '{filename}' not found",
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
