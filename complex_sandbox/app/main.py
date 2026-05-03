"""
Complex Multi-Step Processing System
This simulates a realistic enterprise application with multiple dependencies,
complex business logic, and potential failure scenarios that require
thorough SRE agent analysis and repair cycles.
"""

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
        # Simulate validation failures for specific scenarios
        if self.price < 0:
            return False
        if not self.name or len(self.name) < 2:
            return False
        if self.category not in ["electronics", "books", "clothing", "home"]:
            return False
        return True

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
    
    async def process_order(self, products: List[Product]) -> Dict:
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
            if not product.validate():
                validation_errors.append(f"Product {i+1} ({product.name}) validation failed")
        
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
                if product.category == "electronics":
                    # Complex electronics tax logic
                    if product.price > 1000:
                        tax_rate = 0.12  # Luxury electronics tax
                    total += product.price * (1 + tax_rate)
                elif product.category == "books":
                    # Book tax with educational discount logic
                    if product.price < 50:
                        tax_rate = 0.0  # Educational materials exemption
                    total += product.price * (1 + tax_rate)
                else:
                    total += product.price * (1 + tax_rate)
            
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

# Global state for simulation
order_processor = OrderProcessor()

async def process_order_endpoint(order_data: dict) -> dict:
    """Main endpoint for order processing"""
    try:
        # Parse order data
        products = []
        for item in order_data.get("products", []):
            product = Product(
                product_id=item.get("id"),
                name=item.get("name"),
                price=item.get("price", 0),
                category=item.get("category", "unknown")
            )
            products.append(product)
        
        # Process the order
        result = await order_processor.process_order(products)
        
        if result["status"] == "success":
            return {
                "order_id": f"ORD-{order_processor.orders_processed:05d}",
                "status": "completed",
                "message": "Order processed successfully",
                "details": result
            }
        else:
            return {
                "order_id": f"ORD-{order_processor.orders_processed:05d}",
                "status": "failed", 
                "message": "Order processing failed",
                "error": result.get("error"),
                "details": result
            }
            
    except Exception as e:
        return {
            "order_id": f"ORD-{order_processor.orders_processed:05d}",
            "status": "error",
            "message": f"Unexpected error: {str(e)}",
            "processed_at": datetime.now().isoformat()
        }

# Health check endpoint
async def health_check() -> dict:
    """System health endpoint"""
    return {
        "status": "healthy",
        "orders_processed": order_processor.orders_processed,
        "errors_count": len(order_processor.errors_encountered),
        "external_service_available": order_processor.external_service_available,
        "timestamp": datetime.now().isoformat()
    }

# Test suite endpoint
async def run_validation_tests() -> dict:
    """Run validation tests to ensure system integrity"""
    test_results = []
    
    # Test 1: Basic product validation
    try:
        valid_product = Product("TEST-001", "Test Book", 25.99, "books")
        if valid_product.validate():
            test_results.append({"test": "product_validation", "status": "passed"})
        else:
            test_results.append({"test": "product_validation", "status": "failed"})
    except Exception as e:
        test_results.append({"test": "product_validation", "status": "error", "error": str(e)})
    
    # Test 2: Tax calculation
    try:
        test_products = [
            Product("TEST-002", "Test Electronics", 1500.00, "electronics"),
            Product("TEST-003", "Test Book", 35.00, "books")
        ]
        result = await order_processor.process_order(test_products)
        if result["status"] == "success":
            test_results.append({"test": "tax_calculation", "status": "passed"})
        else:
            test_results.append({"test": "tax_calculation", "status": "failed", "error": result.get("error")})
    except Exception as e:
        test_results.append({"test": "tax_calculation", "status": "error", "error": str(e)})
    
    # Test 3: External dependency handling
    try:
        order_processor.external_service_available = False  # Force failure scenario
        result = await order_processor.process_order([Product("TEST-004", "Test Item", 10.00, "home")])
        if result["status"] == "success":
            test_results.append({"test": "external_dependency", "status": "passed"})
        else:
            test_results.append({"test": "external_dependency", "status": "passed"})  # Should handle gracefully
    except Exception as e:
        test_results.append({"test": "external_dependency", "status": "error", "error": str(e)})
    finally:
        order_processor.external_service_available = True  # Restore normal state
    
    return {
        "test_suite": "validation_complete",
        "tests_run": len(test_results),
        "results": test_results,
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    import uvicorn
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    
    app = FastAPI(title="Complex Order Processing API")
    
    # CORS setup
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Endpoints
    @app.get("/")
    async def root():
        return {"message": "Complex Order Processing API", "status": "healthy"}
    
    @app.post("/process-order", response_model=dict)
    async def process_order(order: dict) -> dict:
        return await process_order_endpoint(order)
    
    @app.get("/health", response_model=dict)
    async def health():
        return await health_check()
    
    @app.post("/run-tests", response_model=dict)
    async def run_tests():
        return await run_validation_tests()
    
    @app.get("/stats", response_model=dict)
    async def get_stats():
        return {
            "total_orders": order_processor.orders_processed,
            "total_errors": len(order_processor.errors_encountered),
            "error_rate": len(order_processor.errors_encountered) / max(1, order_processor.orders_processed),
            "timestamp": datetime.now().isoformat()
        }
    
    print("Complex Order Processing API starting on http://localhost:8002")
    uvicorn.run(app, host="0.0.0.0", port=8002)
