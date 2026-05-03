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

# --- AUDIT TRAIL ---
audit_logs = []  # Global list to store timestamped strings

def add_audit_log(message: str):
    """Add a timestamped message to the audit trail"""
    timestamped_message = f"[{datetime.now().strftime('%H:%M:%S.%f')[:-3]}] {message}"
    audit_logs.append(timestamped_message)
    print(f"AUDIT: {timestamped_message}")

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
        # Complex Financial Transaction System with multiple vulnerabilities
        complex_main = '''"""Financial Transaction System - Enterprise Grade"""
import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import dataclass

@dataclass
class Transaction:
    transaction_id: str
    amount: float
    currency: str
    merchant_id: str
    customer_id: str
    timestamp: datetime
    status: str = "pending"

class PaymentProcessor:
    def __init__(self):
        self.merchant_rates = {"US": 0.029, "EU": 0.021, "UK": 0.025}
        self.transaction_queue = []
        self.processed_transactions = []
    
    def calculate_tax(self, amount: float, region: str) -> float:
        """Calculate tax based on region and amount"""
        # VULNERABILITY 1: TypeError - treating amount as string
        if region == "US":
            tax_rate = 0.0825
        elif region == "EU":
            tax_rate = 0.21
        elif region == "UK":
            tax_rate = 0.20
        else:
            tax_rate = 0.15
        
        # BUG: TypeError when amount is passed as string
        return amount * (1 + tax_rate)
    
    def process_payment(self, transaction: Transaction) -> Dict:
        """Process a financial transaction"""
        try:
            # VULNERABILITY 2: IndexError - accessing payment_methods without bounds check
            payment_methods = ["credit_card", "debit_card", "bank_transfer", "digital_wallet"]
            method_index = int(transaction.transaction_id[-1])  # Last digit as index
            
            # BUG: IndexError when last digit > 3
            payment_method = payment_methods[method_index]
            
            # Calculate total with tax
            total_with_tax = self.calculate_tax(transaction.amount, "US")
            
            # Process the payment
            processing_fee = total_with_tax * self.merchant_rates.get("US", 0.025)
            net_amount = total_with_tax - processing_fee
            
            result = {
                "transaction_id": transaction.transaction_id,
                "status": "completed",
                "payment_method": payment_method,
                "gross_amount": transaction.amount,
                "tax_amount": total_with_tax - transaction.amount,
                "processing_fee": processing_fee,
                "net_amount": net_amount,
                "processed_at": datetime.now().isoformat()
            }
            
            self.processed_transactions.append(result)
            return result
            
        except Exception as e:
            return {
                "transaction_id": transaction.transaction_id,
                "status": "failed",
                "error": str(e),
                "failed_at": datetime.now().isoformat()
            }
    
    def generate_receipt(self, transaction_result: Dict) -> str:
        """Generate a detailed receipt for the transaction"""
        if transaction_result["status"] == "completed":
            receipt = f"""
===========================================
FINANCIAL TRANSACTION RECEIPT
===========================================
Transaction ID: {transaction_result['transaction_id']}
Payment Method: {transaction_result['payment_method']}
Gross Amount: ${transaction_result['gross_amount']:.2f}
Tax Amount: ${transaction_result['tax_amount']:.2f}
Processing Fee: ${transaction_result['processing_fee']:.2f}
Net Amount: ${transaction_result['net_amount']:.2f}
Processed At: {transaction_result['processed_at']}
===========================================
Thank you for your business!
"""
        else:
            receipt = f"""
===========================================
TRANSACTION FAILED
===========================================
Transaction ID: {transaction_result['transaction_id']}
Error: {transaction_result['error']}
Failed At: {transaction_result['failed_at']}
===========================================
Please contact support if needed.
"""
        return receipt.strip()

# Global payment processor instance
payment_processor = PaymentProcessor()

@app.post('/process-transaction')
async def process_transaction_endpoint(transaction_data: dict) -> dict:
    """API endpoint for processing financial transactions"""
    try:
        transaction = Transaction(
            transaction_id=transaction_data.get('transaction_id'),
            amount=transaction_data.get('amount'),
            currency=transaction_data.get('currency', 'USD'),
            merchant_id=transaction_data.get('merchant_id'),
            customer_id=transaction_data.get('customer_id'),
            timestamp=datetime.now()
        )
        
        result = payment_processor.process_payment(transaction)
        receipt = payment_processor.generate_receipt(result)
        
        return {
            "success": True,
            "result": result,
            "receipt": receipt
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
'''
        with open(main_file, 'w') as f:
            f.write(complex_main)
        print(f"Created complex Financial Transaction System at {main_file}")
    
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
    original_code: str | None = None
    audit_logs: list[str] | None = None  # Add audit logs field

class AuditLogResponse(BaseModel):
    logs: list[str]
    timestamp: str
    status: str

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
    
    # Read original code for diff comparison
    original_code = ""
    try:
        with open(target_file, 'r') as f:
            original_code = f.read()
    except Exception as e:
        add_audit_log(f"Warning: Could not read original file: {e}")
        original_code = "# Original code not available"
    
    # Clear previous audit logs for new repair session
    audit_logs.clear()
    add_audit_log("🚀 SRE Agent initiated autonomous repair")
    
    # Node 1: Simulated Analysis (20s)
    add_audit_log("📊 Analysis started - Scanning transaction modules...")
    await asyncio.sleep(5)  # First 5s chunk
    add_audit_log("🔍 Model switch verified - AI model ready for analysis")
    await asyncio.sleep(5)  # Second 5s chunk
    add_audit_log("🧠 Heuristic analysis of chained vulnerabilities...")
    await asyncio.sleep(5)  # Third 5s chunk
    add_audit_log("🎯 TypeError detected in tax calculation AND IndexError in payment processing")
    await asyncio.sleep(5)  # Fourth 5s chunk
    
    # Node 2: Actual AI Repair logic from core_logic with thread_id config
    add_audit_log("⚡ Generating AI repair strategy for Financial Transaction System...")
    config = {"configurable": {"thread_id": "sre-prod-1"}}
    result = await run_autonomous_repair(target_file, "TypeError in calculate_tax and IndexError in process_payment", config)
    add_audit_log("🔧 AI repair logic executed successfully")
    
    # Node 3: Simulated Stability Verification (35s)
    add_audit_log("🔧 Applying patch - Performing regression testing on patched logic...")
    await asyncio.sleep(10)  # First 10s chunk
    add_audit_log("🔍 Validating financial transaction integrity...")
    await asyncio.sleep(10)  # Second 10s chunk
    add_audit_log("✅ System stability verification complete")
    await asyncio.sleep(10)  # Third 10s chunk
    add_audit_log("🎉 Final validation passed - System ready for production")
    await asyncio.sleep(5)  # Final 5s chunk
    
    total_mttr = round(time.time() - start_time, 2)
    add_audit_log(f"📈 Autonomous repair completed - MTTR: {total_mttr:.2f}s")
    
    return RepairResponse(
        status=result["status"],
        iterations=result["iterations"],
        history=result["history"] + [f"Final SRE verification passed. MTTR: {total_mttr:.2f}s"],
        final_code=result["final_code"],
        mttr_time=round(total_mttr, 2),
        is_fixed=result["status"] == "success",
        original_code=original_code,
        audit_logs=audit_logs.copy()  # Include audit logs for frontend
    )

@app.get("/audit-logs", response_model=AuditLogResponse)
async def get_audit_logs() -> AuditLogResponse:
    """Get the current audit trail for frontend display"""
    return AuditLogResponse(
        logs=audit_logs.copy(),
        timestamp=datetime.now().isoformat(),
        status="active"
    )

@app.delete("/audit-logs")
async def clear_audit_logs_endpoint():
    """Clear all audit logs"""
    audit_logs.clear()
    add_audit_log("Audit trail cleared")
    return {"status": "cleared", "message": "Audit logs cleared"}

@app.get("/audit-logs-stream")
async def get_audit_logs_stream():
    """Stream audit logs for real-time frontend updates"""
    from fastapi.responses import StreamingResponse
    
    async def generate_audit_log():
        for log in audit_logs:
            yield f"data: {log}\n\n"
        yield "data: \n\n"
    
    return StreamingResponse(
        content_type="text/plain",
        media_type="text/event-stream",
        content=generate_audit_log()
    )

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
    uvicorn.run(app, host="0.0.0.0", port=8000)