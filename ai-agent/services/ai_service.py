import os
import re
import json
from groq import Groq
from models.ai_models import (
    AnalyzeRequest, AnalyzeResponse,
    ChatRequest, ChatResponse,
    RoadmapRequest, RoadmapResponse, ConceptMasteryScore,
    ArtifactsRequest, ArtifactsResponse
)

# ─── Groq client ──────────────────────────────────────────────────────────────

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
MODEL_ID     = os.getenv("GROQ_MODEL_ID", "openai/gpt-oss-120b")

client = Groq(api_key=GROQ_API_KEY)


def _invoke(prompt: str, system_prompt: str = "You are an expert programming tutor. Always output valid JSON only. No explanation text outside the JSON object.") -> str:
    response = client.chat.completions.create(
        model=MODEL_ID,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": prompt},
        ],
        max_tokens=4096,
        temperature=0.1,
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = "\n".join(raw.split("\n")[1:])
    if raw.endswith("```"):
        raw = "\n".join(raw.split("\n")[:-1])
    return raw.strip()


# ─── /ai/analyze ─────────────────────────────────────────────────────────────

def build_analyze_prompt(payload: AnalyzeRequest) -> str:

    # ── Flow 2: Framework log analysis (Spring Boot, FastAPI, etc.) ──
    if payload.executionMode == "LOG_ANALYSIS" and payload.frameworkType:

        framework_hints = {
            "springboot": "Spring Boot Java application. Focus on bean wiring, "
                          "JPA/Hibernate errors, autoconfiguration failures, "
                          "missing properties, and startup exceptions.",
            "fastapi":    "FastAPI Python application. Focus on Pydantic validation "
                          "errors, dependency injection issues, async/await mistakes, "
                          "and route configuration problems.",
            "django":     "Django Python application. Focus on ORM errors, "
                          "migration issues, settings misconfigurations, "
                          "and middleware problems.",
            "express":    "Express.js Node application. Focus on middleware order, "
                          "async error handling, route conflicts, and module errors.",
            "nestjs":     "NestJS TypeScript application. Focus on decorator misuse, "
                          "dependency injection, module imports, and provider errors.",
            "react":      "React frontend application. Focus on hook rules, "
                          "component lifecycle, state management, and build errors.",
        }

        framework_context = framework_hints.get(
            payload.frameworkType.lower(),
            f"{payload.frameworkType} application."
        )

        log_content = payload.logContent or payload.originalLogs or payload.stderr or "(no logs provided)"
        code_section = f"\nCode:\n{payload.code}" if payload.code and payload.code.strip() else ""

        return f"""
You are an expert {payload.frameworkType} developer and programming tutor.
Analyze the following framework error log and provide a detailed learning breakdown.

Framework: {payload.frameworkType}
Context: {framework_context}
{code_section}

Error Log:
{log_content}

You MUST respond with a single JSON object using EXACTLY these field names (camelCase):

{{
  "explanation": "clear explanation of what went wrong",
  "stackTrace": "the stack trace summary",
  "whyItHappened": "root cause explanation",
  "conceptBehindError": "the programming concept involved",
  "stepByStepReasoning": ["step 1", "step 2", "step 3"],
  "fixedCode": "the corrected code as a string",
  "fixAnalysis": {{
    "whatChanged": "what was changed in the fix",
    "whyItWorks": "why the fix works",
    "reinforcedConcept": "concept reinforced by the fix"
  }},
  "learningResources": [
    {{"title": "Resource Title", "url": "https://example.com", "type": "article"}}
  ],
  "similarErrors": [
    {{"errorType": "ErrorName", "description": "description", "example": "example code or scenario"}}
  ],
  "conceptBreakdown": "detailed breakdown of the concept",
  "learningSummary": "what the student should learn from this",
  "confidenceScore": 0.85,
  "retryRecommendation": true,
  "errorDetail": {{
    "errorType": "ExceptionClassName",
    "errorFile": "filename.ext",
    "errorLine": 1,
    "context": "the line or config that caused the error"
  }},
  "conceptScores": [
    {{"concept": "the primary concept behind this error", "masteryScore": 0.2}},
    {{"concept": "a related concept the student should know", "masteryScore": 0.4}}
  ]
}}

Return ONLY the JSON object. No text outside the JSON.
"""

    # ── Flow 1: Live execution (sandbox stdout/stderr) ──
    else:
        return f"""
You are an expert programming tutor. Analyze the following code error.

Language: {payload.language}
Code:
{payload.code}

Standard Output:
{payload.stdout or "(none)"}

Error Output:
{payload.stderr or "(none)"}

Exit Code: {payload.exitCode}
Attempt Number: {payload.attemptNumber}

Previous Attempts:
{payload.previousAttempts}

You MUST respond with a single JSON object using EXACTLY these field names (camelCase, no snake_case):

{{
  "explanation": "clear explanation of what went wrong",
  "stackTrace": "the stack trace summary",
  "whyItHappened": "root cause explanation",
  "conceptBehindError": "the programming concept involved",
  "stepByStepReasoning": ["step 1", "step 2", "step 3"],
  "fixedCode": "the corrected code as a string",
  "fixAnalysis": {{
    "whatChanged": "what was changed in the fix",
    "whyItWorks": "why the fix works",
    "reinforcedConcept": "concept reinforced by the fix"
  }},
  "learningResources": [
    {{"title": "Resource Title", "url": "https://example.com", "type": "article"}}
  ],
  "similarErrors": [
    {{"errorType": "ErrorName", "description": "description", "example": "example code or scenario"}}
  ],
  "conceptBreakdown": "detailed breakdown of the concept",
  "learningSummary": "what the student should learn from this",
  "confidenceScore": 0.85,
  "retryRecommendation": true,
  "errorDetail": {{
    "errorType": "ExceptionClassName",
    "errorFile": "main.py",
    "errorLine": 1,
    "context": "the line that caused the error"
  }},
  "conceptScores": [
    {{"conceptName": "the primary concept behind this error", "masteryScore": 0.2}},
    {{"conceptName": "a related concept the student should know", "masteryScore": 0.4}}
  ]
}}

Return ONLY the JSON object. No text outside the JSON.
"""


async def call_analyze_llm(payload: AnalyzeRequest) -> AnalyzeResponse:

    raw = _invoke(build_analyze_prompt(payload))

    try:
        data = json.loads(raw)

    except json.JSONDecodeError as e:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except Exception:
                raise ValueError(f"LLM returned malformed JSON: {raw[:300]}") from e
        else:
            raise ValueError(f"LLM returned non-JSON response: {raw[:300]}") from e

    # Fallback: if LLM didn't return conceptScores, derive from conceptBehindError
    if not data.get("conceptScores") and data.get("conceptBehindError"):
        confidence = data.get("confidenceScore", 0.5)
        # Low mastery = student is struggling with this concept (inverse of confidence)
        mastery = round(max(0.1, min(0.9, 1.0 - confidence)), 2)
        data["conceptScores"] = [
            {"concept": data["conceptBehindError"], "masteryScore": mastery}
        ]

    return AnalyzeResponse(**data)


# ─── /ai/chat ─────────────────────────────────────────────────────────────────

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

You MUST respond with a JSON object using EXACTLY these field names:

{{
  "reply": "your answer to the student's question",
  "suggestedFollowUps": ["follow-up question 1", "follow-up question 2", "follow-up question 3"]
}}

Return ONLY the JSON object. No text outside the JSON.
"""


async def call_chat_llm(payload: ChatRequest) -> ChatResponse:
    raw = _invoke(build_chat_prompt(payload))
    return ChatResponse(**json.loads(raw))


# ─── /ai/roadmap ──────────────────────────────────────────────────────────────

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

Gap levels: HIGH (mastery < 0.3), MEDIUM (0.3-0.6), LOW (> 0.6)
Topic priorities: HIGH, MEDIUM, or LOW

You MUST respond with a JSON object using EXACTLY these field names:

{{
  "knowledgeGapAnalysis": [
    {{
      "conceptName": "concept name",
      "masteryScore": 0.25,
      "gapLevel": "HIGH",
      "description": "why this is a gap"
    }}
  ],
  "recommendedTopics": [
    {{
      "topicName": "topic name",
      "description": "what to study",
      "priority": "HIGH",
      "estimatedTime": "2 hours",
      "resources": [
        {{"title": "Resource Title", "url": "https://example.com"}}
      ]
    }}
  ],
  "learningPriorities": "plain language summary of what to focus on",
  "conceptMasteryScores": [
    {{"conceptName": "concept name", "masteryScore": 0.75}}
  ]
}}

Return ONLY the JSON object. No text outside the JSON.
"""


async def call_roadmap_llm(payload: RoadmapRequest) -> RoadmapResponse:
    raw = _invoke(build_roadmap_prompt(payload))
    return RoadmapResponse(**json.loads(raw))


# ─── /ai/artifacts ────────────────────────────────────────────────────────────

async def call_artifacts_llm(payload: ArtifactsRequest) -> ArtifactsResponse:
    from services.artifacts_service import generate_and_upload_artifacts
    return await generate_and_upload_artifacts(payload)