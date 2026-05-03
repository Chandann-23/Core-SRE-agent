from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class ProcessRequest(BaseModel):
    values: list[int]

@app.post('/process')
async def process_payload(payload: ProcessRequest) -> dict[str, int | None]:
    first = payload.values[0] if payload.values else None
    total = sum(payload.values)
    return {'first': first, 'total': total}
