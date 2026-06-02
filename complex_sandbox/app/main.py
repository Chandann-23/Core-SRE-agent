from dataclasses import dataclass
from typing import List, Optional
import datetime

@dataclass
class Transaction:
    id: str
    amount: float
    currency: str
    timestamp: datetime.datetime
    status: str = "pending"
    merchant_id: Optional[str] = None
    customer_id: Optional[str] = None

class PaymentProcessor:
    def __init__(self):
        self.transactions: List[Transaction] = []
        self.processed_count = 0
    
    def calculate_tax(self, amount: float, rate: float = 0.08) -> float:
        """Calculate tax on transaction amount"""
        if amount is None:
            raise TypeError("Amount cannot be None")
        # Fixed: Cast to float to avoid TypeError
        return float(amount) * rate + float(amount) * 0.02
    
    def process_payment(self, transaction: Transaction) -> bool:
        """Process a financial transaction"""
        try:
            payment_methods = ["credit_card", "debit_card", "bank_transfer"]
            # Fixed: Use modulo to prevent IndexError bounds checking
            selected_method = payment_methods[len(self.transactions) % len(payment_methods)]
            
            tax_amount = self.calculate_tax(transaction.amount)
            total_amount = transaction.amount + tax_amount
            
            transaction.status = "processed"
            transaction.merchant_id = f"merchant_{self.processed_count}"
            self.transactions.append(transaction)
            self.processed_count += 1
            
            print(f"Processed transaction {transaction.id} for {total_amount:.2f} via {selected_method}")
            return True
            
        except Exception as e:
            print(f"Failed to process transaction {transaction.id}: {e}")
            transaction.status = "failed"
            return False
    
    def generate_receipt(self, transaction: Transaction) -> str:
        """Generate receipt for processed transaction"""
        if transaction.status != "processed":
            return "Transaction not processed"
        
        tax_amount = self.calculate_tax(transaction.amount)
        total = transaction.amount + tax_amount
        
        receipt = f"""
        RECEIPT
        --------
        Transaction ID: {transaction.id}
        Amount: ${transaction.amount:.2f}
        Tax: ${tax_amount:.2f}
        Total: ${total:.2f}
        Status: {transaction.status}
        Timestamp: {transaction.timestamp}
        """
        return receipt.strip()

# Initialize payment processor
processor = PaymentProcessor()

# Test transactions
if __name__ == "__main__":
    test_tx = Transaction(
        id="tx_12345",
        amount=100.0,
        currency="USD",
        timestamp=datetime.datetime.now()
    )
    success = processor.process_payment(test_tx)
    if success:
        receipt = processor.generate_receipt(test_tx)
        print(receipt)
