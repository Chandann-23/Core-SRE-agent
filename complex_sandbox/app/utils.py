"""
Complex Business Logic Utilities
Contains sophisticated calculations and validation logic
that simulates real-world enterprise scenarios.
"""

import asyncio
import time
from datetime import datetime
from typing import Dict, List, Optional
import random

class TaxCalculator:
    """Handles complex tax calculations with multiple scenarios"""
    
    def __init__(self):
        self.calculation_history = []
        self.current_rate = 0.08  # Default tax rate
    
    def calculate_complex_tax(self, amount: float, category: str, region: str = "US") -> Dict:
        """Calculate tax with complex business rules"""
        start_time = datetime.now()
        
        # Simulate external API call delay
        time.sleep(0.5)  # Use time.sleep instead of asyncio.sleep
        
        # Complex tax logic based on category and region
        if category == "electronics":
            if region == "EU":
                tax_rate = 0.20  # EU electronics tax
            elif region == "US":
                tax_rate = 0.08  # US electronics tax
            else:
                tax_rate = 0.15  # Default international
        elif category == "books":
            if region == "EU":
                tax_rate = 0.05  # EU books tax
            elif region == "US":
                tax_rate = 0.0   # US books tax exemption
            else:
                tax_rate = 0.07  # Default international
        elif category == "clothing":
            if region == "EU":
                tax_rate = 0.25  # EU clothing tax
            elif region == "US":
                tax_rate = 0.06  # US clothing tax
            else:
                tax_rate = 0.12  # Default international
        else:
            tax_rate = self.current_rate
        
        # Complex calculation with multiple steps
        try:
            # Step 1: Base tax calculation
            base_tax = amount * tax_rate
            
            # Step 2: Category-specific adjustments
            if category == "electronics":
                # Luxury electronics have additional tax
                if amount > 1000:
                    base_tax += amount * 0.05  # Luxury surcharge
                # Environmental fee
                base_tax += 2.50  # Electronics recycling fee
            elif category == "books":
                # Educational materials discount
                if amount < 100:
                    base_tax *= 0.8  # 20% discount
            elif category == "clothing":
                # Progressive clothing tax
                if amount > 200:
                    base_tax += amount * 0.03  # Luxury clothing tax
            
            # Step 3: Regional adjustments
            if region == "EU":
                base_tax += 5.00  # EU processing fee
            elif region == "US":
                if amount > 500:
                    base_tax += 10.00  # US high-value processing
            
            end_time = datetime.now()
            calculation_time = (end_time - start_time).total_seconds()
            
            result = {
                "original_amount": amount,
                "category": category,
                "region": region,
                "tax_rate": tax_rate,
                "base_tax": round(base_tax, 2),
                "final_tax": round(base_tax, 2),
                "calculation_time_seconds": calculation_time,
                "calculated_at": end_time.isoformat()
            }
            
            self.calculation_history.append(result)
            return result
            
        except Exception as e:
            error_result = {
                "error": f"Tax calculation failed: {str(e)}",
                "original_amount": amount,
                "category": category,
                "region": region,
                "calculated_at": datetime.now().isoformat()
            }
            self.calculation_history.append(error_result)
            return error_result

class DataValidator:
    """Handles comprehensive data validation with multiple scenarios"""
    
    def __init__(self):
        self.validation_history = []
        self.strict_mode = False
    
    def enable_strict_mode(self):
        """Enable strict validation for testing"""
        self.strict_mode = True
    
    def validate_complex_order(self, order_data: Dict) -> Dict:
        """Comprehensive order validation"""
        start_time = datetime.now()
        validation_results = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "validation_time": 0,
            "validated_at": ""
        }
        
        try:
            # Validation 1: Required fields
            required_fields = ["customer_id", "products", "shipping_address"]
            for field in required_fields:
                if field not in order_data or not order_data[field]:
                    validation_results["errors"].append(f"Missing required field: {field}")
                    validation_results["is_valid"] = False
            
            # Validation 2: Product data validation
            if "products" in order_data:
                for i, product in enumerate(order_data["products"]):
                    product_errors = []
                    
                    # Check each product field
                    if not product.get("product_id"):
                        product_errors.append("Missing product_id")
                    if not product.get("name"):
                        product_errors.append("Missing product name")
                    if not product.get("price") or product.get("price") <= 0:
                        product_errors.append("Invalid or missing price")
                    if not product.get("category"):
                        product_errors.append("Missing product category")
                    
                    if product_errors:
                        validation_results["errors"].append(f"Product {i+1}: {'; '.join(product_errors)}")
                        validation_results["is_valid"] = False
            
            # Validation 3: Business logic validation
            if "products" in order_data:
                total_amount = sum(p.get("price", 0) for p in order_data["products"])
                
                # Order size validation
                if len(order_data["products"]) > 50:
                    validation_results["warnings"].append("Large order may require additional processing time")
                
                # Amount validation
                if total_amount > 100000:
                    validation_results["errors"].append("Order amount exceeds maximum limit")
                    validation_results["is_valid"] = False
                elif total_amount < 1:
                    validation_results["errors"].append("Order amount below minimum")
                    validation_results["is_valid"] = False
            
            # Validation 4: Shipping address validation
            if "shipping_address" in order_data:
                address = order_data["shipping_address"]
                if not address.get("street") or not address.get("city"):
                    validation_results["errors"].append("Incomplete shipping address")
                    validation_results["is_valid"] = False
                
                # International shipping validation
                if address.get("country") and address.get("country") != "US":
                    if total_amount > 1000:
                        validation_results["warnings"].append("International order may require customs clearance")
            
            # Validation 5: Strict mode additional checks
            if self.strict_mode:
                # Additional validation in strict mode
                if "customer_id" in order_data:
                    customer_id = order_data["customer_id"]
                    if len(customer_id) < 5 or not customer_id.startswith("CUST-"):
                        validation_results["errors"].append("Invalid customer ID format")
                        validation_results["is_valid"] = False
            
            end_time = datetime.now()
            validation_results["validation_time"] = (end_time - start_time).total_seconds()
            validation_results["validated_at"] = end_time.isoformat()
            
            self.validation_history.append(validation_results)
            return validation_results
            
        except Exception as e:
            error_result = {
                "error": f"Validation failed: {str(e)}",
                "is_valid": False,
                "validated_at": datetime.now().isoformat()
            }
            self.validation_history.append(error_result)
            return error_result

class ExternalServiceSimulator:
    """Simulates external service dependencies with realistic failure scenarios"""
    
    def __init__(self):
        self.service_status = {}
        self.call_history = []
    
    async def check_service_availability(self, service_name: str) -> Dict:
        """Check if external service is available"""
        start_time = datetime.now()
        
        # Simulate different service behaviors
        service_configs = {
            "payment_gateway": {
                "availability": 0.95,  # 95% uptime
                "response_time_range": (0.5, 2.0),  # 500ms to 2s
                "failure_rate": 0.05  # 5% failure rate
            },
            "inventory_system": {
                "availability": 0.98,  # 98% uptime
                "response_time_range": (0.2, 1.5),  # 200ms to 1.5s
                "failure_rate": 0.02  # 2% failure rate
            },
            "shipping_calculator": {
                "availability": 0.99,  # 99% uptime
                "response_time_range": (0.1, 0.8),  # 100ms to 800ms
                "failure_rate": 0.01  # 1% failure rate
            },
            "fraud_detection": {
                "availability": 0.97,  # 97% uptime
                "response_time_range": (1.0, 3.0),  # 1s to 3s
                "failure_rate": 0.03  # 3% failure rate
            }
        }
        
        config = service_configs.get(service_name, service_configs["payment_gateway"])
        
        # Simulate service check
        await asyncio.sleep(config["response_time_range"][0])  # Minimum response time
        
        # Determine if service is available
        is_available = random.random() < config["availability"]
        
        if not is_available:
            # Simulate service failure
            response_time = random.uniform(*config["response_time_range"])
            await asyncio.sleep(response_time)
            
            result = {
                "service": service_name,
                "status": "unavailable",
                "response_time": response_time,
                "error": f"Service temporarily unavailable",
                "checked_at": datetime.now().isoformat()
            }
        else:
            # Service is available
            result = {
                "service": service_name,
                "status": "available",
                "response_time": random.uniform(*config["response_time_range"]),
                "checked_at": datetime.now().isoformat()
            }
        
        self.service_status[service_name] = result
        self.call_history.append(result)
        
        return result
    
    def get_service_health(self) -> Dict:
        """Get overall health of all services"""
        total_services = len(self.service_status)
        available_services = sum(1 for status in self.service_status.values() if status["status"] == "available")
        
        return {
            "total_services": total_services,
            "available_services": available_services,
            "unavailable_services": total_services - available_services,
            "overall_health": available_services / total_services if total_services > 0 else 0,
            "last_checked": datetime.now().isoformat(),
            "services": self.service_status
        }
