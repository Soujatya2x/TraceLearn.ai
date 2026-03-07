from fastapi import FastAPI
from routers import ai

app = FastAPI()

app.include_router(ai.router)

@app.get("/health")
async def health():
    return {"status": "ok"}