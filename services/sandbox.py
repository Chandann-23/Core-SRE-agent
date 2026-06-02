import os

def get_sandbox_root(root_dir: str) -> str:
    """Determine the sandbox root directory based on the environment."""
    if root_dir.startswith('/app'):
        return os.path.join(root_dir, 'complex_sandbox', 'app')
    else:
        # Local development fallback
        return os.path.join(root_dir, 'complex_sandbox', 'app')

def create_default_files(sandbox_root: str):
    """Create default main.py and utils.py if they don't exist"""
    os.makedirs(sandbox_root, exist_ok=True)
    
    main_file = os.path.join(sandbox_root, "main.py")
    utils_file = os.path.join(sandbox_root, "utils.py")
    
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

# Dummy process transaction function for fast API endpoints
async def process_transaction_endpoint(transaction_data: dict) -> dict:
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
        with open(main_file, 'w', encoding='utf-8') as f:
            f.write(complex_main)
        print(f"Created complex Financial Transaction System at {main_file}")
    
    if not os.path.exists(utils_file):
        default_utils = '''"""Default utils.py - Auto-provisioned by SRE Agent"""

def helper_function():
    return "Helper function working"
'''
        with open(utils_file, 'w', encoding='utf-8') as f:
            f.write(default_utils)
        print(f"Created default utils.py at {utils_file}")

def get_vulnerable_code() -> str:
    return '''from dataclasses import dataclass
from typing import Dict
from datetime import datetime

@dataclass
class Transaction:
    id: str
    amount: float
    currency: str
    status: str = "pending"
    merchant_id: str = ""
    timestamp: str = ""

class PaymentProcessor:
    def __init__(self):
        self.transactions = []
        self.processed_count = 0
        
    def calculate_tax(self, amount, rate=0.0825):
        """Calculate tax amount"""
        # VULNERABILITY 1: TypeError when amount is None or string
        # Real-world scenario: API payload missing amount field or parsed as string
        return amount * rate
        
    def process_payment(self, transaction: Transaction, payment_method: str) -> bool:
        """Process a financial payment"""
        try:
            # VULNERABILITY 2: IndexError
            # Trying to map internal method to third-party gateway index without bounds checking
            gateway_nodes = ["stripe_primary", "paypal_backup", "adyen_eu"]
            # Intentionally causing IndexError by accessing an out-of-bounds index
            # This simulates a configuration desync between microservices
            selected_gateway = gateway_nodes[len(gateway_nodes) + 1] 
            
            # This won't execute if index error occurs
            tax = self.calculate_tax(transaction.amount)
            total = transaction.amount + tax
            
            # Success path...
            transaction.status = "processed"
            self.transactions.append(transaction)
            return True
            
        except TypeError as e:
            # Re-raise to trigger SRE agent
            raise
        except Exception as e:
            # We want the IndexError to bubble up for the demo
            raise
'''
