from groq import Groq
import os
import json
from dotenv import load_dotenv
from models.ai_models import AnalyzeRequest, AnalyzeResponse
from models.ai_models import ChatRequest, ChatResponse
from models.ai_models import RoadmapRequest, RoadmapResponse, ConceptMasteryScore  
from models.ai_models import ArtifactsRequest, ArtifactsResponse

load_dotenv()
api_key=os.getenv("GROQ_API_KEY")

client = Groq(api_key=api_key)

def build_analyze_prompt(payload: AnalyzeRequest) -> str:
    return f"""
    You are an expert programming tutor. Analyze the following code error and respond with a detailed explanation.

    Language: {payload.language}
    Code:
    {payload.code}

    Error:
    {payload.stderr}

    Exit Code: {payload.exitCode}
    Attempt Number: {payload.attemptNumber}

    Previous Attempts:
    {payload.previousAttempts}

    Analyze the error thoroughly and provide fix, explanation, learning resources and similar errors.
    """

async def call_analyze_llm(payload: AnalyzeRequest) -> AnalyzeResponse:
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",   # swap to openai/anthropic later
        messages=[
            {
                "role": "system",
                "content": "You are an expert programming tutor. Analyze code errors and output JSON only."
            },
            {
                "role": "user",
                "content": build_analyze_prompt(payload)
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "analyze_response",
                "strict": True,
                "schema": AnalyzeResponse.model_json_schema()
            }
        }
    )

    import json
    raw = response.choices[0].message.content
    return AnalyzeResponse(**json.loads(raw))

def build_chat_prompt(payload: ChatRequest) -> str:
    history = "\n".join(
        [f"{msg.role}: {msg.message}" for msg in payload.chatHistory]
    )
    return f"""
    You are an expert programming tutor helping a student understand a code error.

    Error Context: {payload.errorContext}
    Analysis Summary: {payload.analysisSummary}

    Chat History:
    {history}

    User's New Message: {payload.userMessage}

    Answer the student's question clearly and suggest 3 natural follow-up questions.
    """
async def call_chat_llm(payload:ChatRequest) ->ChatRequest:
    response=client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role":"system",
                "content":"You are an expert programming tutor. Output JSON only."
            },
            {
                "role":"user",
                "content":build_chat_prompt(payload)
            }
        ],
        response_format={
            "type":"json_schema",
            "json_schema":{
                "name":"chat_response",
                "strict":True,
                "schema":ChatResponse.model_json_schema()
                }
            }
        )
    raw = response.choices[0].message.content
    return ChatResponse(**json.loads(raw))

def build_roadmap_prompt(payload: RoadmapRequest) -> str:
    metrics = "\n".join(
        [f"- {m.conceptName}: mastery={m.masteryScore}, encounters={m.encounterCount}"
         for m in payload.currentMetrics]
    )
    return f"""
    You are an expert programming tutor analyzing a student's learning progress.

    Student ID: {payload.userId}

    Current Learning Metrics:
    {metrics}

    Based on these metrics:
    - Identify knowledge gaps (concepts with low mastery or high encounter count)
    - Recommend topics to study with priority and estimated time
    - Summarize learning priorities in plain language
    - Return conceptMasteryScores as a list of objects with conceptName and masteryScore fields

    Gap levels should be: HIGH (mastery < 0.3), MEDIUM (0.3-0.6), LOW (> 0.6)
    Topic priorities should be: HIGH, MEDIUM, or LOW
    """

async def call_roadmap_llm(payload: RoadmapRequest) -> RoadmapResponse:
    response = client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[
            {
                "role": "system",
                "content": "You are an expert programming tutor. Output JSON only."
            },
            {
                "role": "user",
                "content": build_roadmap_prompt(payload)
            }
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "roadmap_response",
                "strict": True,
                "schema": RoadmapResponse.model_json_schema()
            }
        }
    )

    raw = response.choices[0].message.content
    return RoadmapResponse(**json.loads(raw))

async def call_artifacts_llm(payload: ArtifactsRequest) -> ArtifactsResponse:
    # --- dummy URLs for now, replace with real S3 upload later ---
    dummy_base = f"https://tracelearn-artifacts.s3.amazonaws.com/artifacts/{payload.sessionId}"

    return ArtifactsResponse(
        pdfUrl=f"{dummy_base}/pdf/report.pdf",
        pptUrl=f"{dummy_base}/ppt/presentation.pptx",
        summaryUrl=f"{dummy_base}/summary/daily.pdf"
    )






