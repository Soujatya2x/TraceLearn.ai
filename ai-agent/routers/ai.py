import httpx
from fastapi import APIRouter, HTTPException
from services.ai_service import call_analyze_llm, call_chat_llm
from services.ai_service import call_analyze_llm, call_chat_llm, call_roadmap_llm
from models.ai_models import (
    AnalyzeRequest, AnalyzeResponse,
    ChatRequest, ChatResponse,
    ArtifactsRequest, ArtifactsResponse,
    RoadmapRequest, RoadmapResponse
)
from config import JAVA_BASE_URL
from services.ai_service import call_analyze_llm, call_chat_llm, call_roadmap_llm, call_artifacts_llm  # ← add call_artifacts_llm
router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(payload: AnalyzeRequest):
    print("✅ Request received:", payload)
    try:
        result = await call_analyze_llm(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
"""async def analyze(payload: AnalyzeRequest):
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            response = await client.post(
                f"{JAVA_BASE_URL}/ai/analyze", 
                json=payload.dict()
                )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=500, detail=str(e))"""

@router.post("/chat", response_model=ChatResponse)
async def chat(payload: ChatRequest):
    try:
        result = await call_chat_llm(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/artifacts", response_model=ArtifactsResponse)
async def artifacts(payload: ArtifactsRequest):
    try:
        result = await call_artifacts_llm(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=repr(e))

@router.post("/roadmap", response_model=RoadmapResponse)
async def roadmap(payload: RoadmapRequest):
    try:
        result = await call_roadmap_llm(payload)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
            
            
            
            