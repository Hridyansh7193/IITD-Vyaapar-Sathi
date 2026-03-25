from pydantic import BaseModel

class AdvancedProductInput(BaseModel):
    barcode: str
    user_id: str
    name: str = ""
    category: str = "General"
    cost_price: float = 0.0
    selling_price: float = 0.0
    stock_quantity: int = 1

class AdvancedTransactionInput(BaseModel):
    barcode: str
    user_id: str
    quantity: int
    selling_price: float
