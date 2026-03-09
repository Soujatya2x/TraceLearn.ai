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
    {{"conceptName": "the primary concept behind this error", "masteryScore": 0.2}},
    {{"conceptName": "a related concept the student should know", "masteryScore": 0.4}}
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

    # Normalize conceptScores: LLM may return any combination of field names.
    raw_scores = data.get("conceptScores", [])
    normalized = []
    for cs in raw_scores:
        name  = cs.get("conceptName") or cs.get("concept", "")
        score = cs.get("masteryScore") if cs.get("masteryScore") is not None else cs.get("score", 0.0)
        if name and str(name).strip():
            normalized.append({"conceptName": str(name).strip(), "masteryScore": float(score)})
    data["conceptScores"] = normalized

    # Fallback: if LLM returned no valid conceptScores, derive from conceptBehindError
    if not data["conceptScores"] and data.get("conceptBehindError"):
        confidence = data.get("confidenceScore", 0.5)
        mastery = round(max(0.1, min(0.9, 1.0 - confidence)), 2)
        data["conceptScores"] = [
            {"conceptName": data["conceptBehindError"], "masteryScore": mastery}
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
    # Build rich metrics text with all available context
    if not payload.currentMetrics:
        metrics_text = "No metrics yet — this is the user's first session."
    else:
        metrics_text = "\n".join(
            [f"- Concept: \"{m.conceptName}\" | Mastery: {round(m.masteryScore * 100)}% | Times encountered: {m.encounterCount}"
             for m in payload.currentMetrics]
        )

    # Separate weak vs strong concepts so the LLM can make targeted recommendations
    gap_concepts    = [m for m in payload.currentMetrics if m.masteryScore < 0.5]
    strong_concepts = [m for m in payload.currentMetrics if m.masteryScore >= 0.7]

    gap_text    = ", ".join([f"\"{m.conceptName}\" ({round(m.masteryScore * 100)}% mastery, {m.encounterCount} errors)"
                              for m in gap_concepts]) if gap_concepts else "none identified yet"
    strong_text = ", ".join([f"\"{m.conceptName}\"" for m in strong_concepts]) if strong_concepts else "none yet"

    return f"""
You are an expert programming tutor generating a PERSONALIZED learning roadmap for a specific developer.

This developer has the following concept mastery data derived from their REAL error history:

{metrics_text}

Their weakest areas that need immediate attention (mastery < 50%): {gap_text}
Their strongest areas (mastery >= 70%): {strong_text}

CRITICAL RULES — you MUST follow these:
1. Every recommended topic MUST target one of their specific weak concepts listed above
2. Do NOT generate generic programming topics — every topic must reference a specific concept from their data
3. If encounterCount is high AND masteryScore is low, set priority to "HIGH"
4. Topic names must be specific (e.g. "Handling ZeroDivisionError in Python" not "Learn Python")
5. Resources must be real URLs — use official docs, MDN, Real Python, Baeldung, JavaPoint etc.
6. Gap level: "HIGH" if mastery < 30%, "MEDIUM" if 30-50%, "LOW" if 50-70%
7. conceptMasteryScores must include ALL concepts from the metrics above

You MUST respond with a JSON object using EXACTLY these field names:

{{
  "knowledgeGapAnalysis": [
    {{
      "conceptName": "exact concept name from the user metrics above",
      "masteryScore": 0.25,
      "gapLevel": "HIGH",
      "description": "specific explanation of why this is a gap based on their actual error patterns"
    }}
  ],
  "recommendedTopics": [
    {{
      "topicName": "specific topic name targeting one of their weak concepts",
      "description": "exactly what to study and why it addresses their specific error history",
      "priority": "HIGH",
      "estimatedTime": "45 minutes",
      "resources": [
        {{"title": "Official Docs Title", "url": "https://docs.python.org/3/tutorial/errors.html"}}
      ]
    }}
  ],
  "learningPriorities": "2-3 sentence plain language summary telling this specific developer what to focus on first and why, referencing their actual weak concepts",
  "conceptMasteryScores": [
    {{"conceptName": "concept name", "masteryScore": 0.25}}
  ]
}}

Return ONLY the JSON object. No text outside the JSON.
"""


async def call_roadmap_llm(payload: RoadmapRequest) -> RoadmapResponse:
    raw = _invoke(build_roadmap_prompt(payload))

    try:
        data = json.loads(raw)
    except json.JSONDecodeError as e:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if match:
            try:
                data = json.loads(match.group())
            except Exception:
                raise ValueError(f"LLM returned malformed JSON for roadmap: {raw[:300]}") from e
        else:
            raise ValueError(f"LLM returned non-JSON roadmap response: {raw[:300]}") from e

    return RoadmapResponse(**data)


# ─── /ai/artifacts ────────────────────────────────────────────────────────────

async def call_artifacts_llm(payload: ArtifactsRequest) -> ArtifactsResponse:
    from services.artifacts_service import generate_and_upload_artifacts
    return await generate_and_upload_artifacts(payload)