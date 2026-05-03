"""
Complex Order Processing API
Simulates realistic enterprise application with multiple dependencies,
complex business logic, and potential failure scenarios that require
thorough SRE agent analysis and repair cycles.
"""

import asyncio
import time
import random
from datetime import datetime
from typing import Dict, List, Optional

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Global state for simulation
class OrderProcessor:
    """Handles complex order processing with external dependencies"""
    
    def __init__(self):
        self.orders_processed = 0
        self.errors_encountered = []
        self.external_service_available = True
        
    async def check_external_service(self) -> bool:
        """Check if external service is available"""
        # 30% chance of external service being down
        if random.random() < 0.3:
            self.external_service_available = False
            return False
        await asyncio.sleep(1)  # Simulate network latency
        return True
    
    async def process_order(self, products: List[Dict]) -> Dict:
        """Process a complex order with multiple validation steps"""
        start_time = datetime.now()
        
        # Step 1: External dependency check
        await self.check_external_service()
        
        if not self.external_service_available:
            error_msg = f"[{start_time.strftime('%H:%M:%S')}] External service unavailable - retrying..."
            self.errors_encountered.append(error_msg)
            await asyncio.sleep(5)  # Wait for service recovery
            # Retry external service check
            await self.check_external_service()
        
        # Step 2: Product validation
        validation_errors = []
        for i, product in enumerate(products):
            if not product.get("name") or not product.get("price") or not product.get("category"):
                validation_errors.append(f"Product {i+1} validation failed")
        
        if validation_errors:
            error_msg = f"[{datetime.now().strftime('%H:%M:%S')}] Validation errors: {'; '.join(validation_errors)}"
            self.errors_encountered.append(error_msg)
            return {
                "status": "failed",
                "errors": validation_errors,
                "processed_at": start_time.isoformat()
            }
        
        # Step 3: Complex calculation
        total = 0.0
        tax_rate = 0.08
        
        try:
            # Simulate complex tax calculation that can fail
            if random.random() < 0.15:  # 15% chance of calculation error
                raise ValueError("Tax calculation service timeout")
            
            for product in products:
                if product["category"] == "electronics":
                    # Complex electronics tax logic
                    if product["price"] > 1000:
                        tax_rate = 0.12  # Luxury electronics tax
                    total += product["price"] * (1 + tax_rate)
                elif product["category"] == "books":
                    # Book tax with educational discount logic
                    if product["price"] < 50:
                        tax_rate = 0.0  # Educational materials exemption
                    total += product["price"] * (1 + tax_rate)
                else:
                    total += product["price"] * (1 + tax_rate)
            
            # Add processing fee
            processing_fee = len(products) * 2.50
            total += processing_fee
            
            self.orders_processed += 1
            end_time = datetime.now()
            
            return {
                "status": "success",
                "total": round(total, 2),
                "tax": round(total * tax_rate / (1 + tax_rate), 2),
                "processing_fee": processing_fee,
                "products_count": len(products),
                "processed_at": end_time.isoformat(),
                "processing_time_seconds": (end_time - start_time).total_seconds()
            }
            
        except ValueError as e:
            error_msg = f"[{datetime.now().strftime('%H:%M:%S')}] Calculation error: {str(e)}"
            self.errors_encountered.append(error_msg)
            return {
                "status": "failed",
                "error": str(e),
                "processed_at": datetime.now().isoformat()
            }

    async def get_service_health(self) -> Dict:
        return {
            "service_health": "healthy" if self.external_service_available else "unhealthy"
        }

class OrderRequest(BaseModel):
    products: List[Dict]

class OrderResponse(BaseModel):
    status: str
    order_id: str
    message: str
    details: Optional[Dict] = None

app = FastAPI(title="Complex Order Processing API")

# CORS setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for simulation
order_processor = OrderProcessor()

# Endpoints
@app.get("/")
async def root():
    return {"message": "Complex Order Processing API", "status": "healthy"}

@app.post("/process-order", response_model=OrderResponse)
async def process_order(order: OrderRequest) -> OrderResponse:
    result = await order_processor.process_order(order.products)
    return {
        "status": result["status"],
        "order_id": "12345",
        "message": "Order processed successfully" if result["status"] == "success" else "Order processing failed",
        "details": result
    }

@app.get("/health", response_model=dict)
async def health():
    return await order_processor.get_service_health()

@app.post("/run-tests", response_model=dict)
async def run_tests():
    return {"message": "Tests ran successfully"}

@app.get("/stats", response_model=dict)
async def get_stats():
    return {
        "total_orders": order_processor.orders_processed,
        "total_errors": len(order_processor.errors_encountered),
        "error_rate": len(order_processor.errors_encountered) / max(1, order_processor.orders_processed),
        "timestamp": datetime.now().isoformat()
    }

@app.post("/inject-bug", response_model=dict)
async def inject_bug() -> Dict:
    """Inject various types of bugs for testing"""
    bug_type = random.choice(["index_error", "type_error", "key_error", "complex_logic_error"])
    
    # add_audit_log(f"Bug injection started - Type: {bug_type}")
    
    # Complex bug injection scenarios
    if bug_type == "index_error":
        buggy_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n\n"
            "    values: list[int]\n\n"
            "@app.post('/process')\n\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n\n"
            "    # Potential IndexError if values is empty\n\n"
            "    first = payload.values[0]\n\n"
            "    total = sum(payload.values)\n\n"
            "    return {'first': first, 'total': total}\n\n"
            "    )"
        )
        error_msg = "Injected IndexError vulnerability - array access without bounds check"
    
    elif bug_type == "type_error":
        buggy_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n\n"
            "    values: list[int]\n\n"
            "@app.post('/process')\n\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n\n"
            "    # Type error - wrong type assumption\n\n"
            "    total = payload.values[0] + payload.values[1]  # Will fail if single value\n\n"
            "    return {'total': total}\n\n"
            "    )"
        )
        error_msg = "Injected TypeError vulnerability - incorrect type casting"
    
    elif bug_type == "key_error":
        buggy_code = (
            "from fastapi import FastAPI\n"
            "from pydantic import BaseModel\n\n"
            "app = FastAPI()\n\n"
            "class ProcessRequest(BaseModel):\n\n"
            "    values: dict[int, str]  # Dict instead of list\n\n"
            "@app.post('/process')\n\n"
            "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n\n"
            "    # Key error - accessing non-existent key\n\n"
            "    first = payload.values.get('non_existent_key', 0)\n\n"
            "    total = sum(payload.values)\n\n"
            "    return {'first': first, 'total': total}\n\n"
            "    )"
        )
        error_msg = "Injected KeyError vulnerability - missing key handling"
    
    elif bug_type == "complex_logic_error":
        # Use complex sandbox for logic error
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
                "    return result\n\n"
            )
        error_msg = "Injected complex logic error - validation failures in business logic"
    
    else:
        # Fallback to simple error
        buggy_code = (
                "from fastapi import FastAPI\n\n"
                "from pydantic import BaseModel\n\n"
                "app = FastAPI()\n\n"
                "class ProcessRequest(BaseModel):\n\n"
                "    values: list[int]\n\n"
                "@app.post('/process')\n\n"
                "async def process_payload(payload: ProcessRequest) -> dict[str, int]:\n\n"
                "    # Simple IndexError\n\n"
                "    first = payload.values[0]\n\n"
                "    total = sum(payload.values)\n\n"
                "    return {'first': first, 'total': total}\n\n"
                "    )"
            )
        error_msg = "Injected IndexError vulnerability - array access without bounds check"
    
    # write_sandbox_file(buggy_code)
    # add_audit_log(f"Bug injected - {error_msg}")
    
    return {
        "status": "ok",
        "message": error_msg,
        "bug_type": bug_type
    }

if __name__ == "__main__":
    import uvicorn
    print("Complex Order Processing API starting on http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)
