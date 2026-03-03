from fastapi import FastAPI

app = FastAPI()


@app.post("/ai/analyze")
async def analyze(payload: dict):
    return {
        "explanation": "Mock explanation",
        "stackTrace": payload.get("stderr", ""),
        "whyItHappened": "Division by zero causes runtime crash",
        "conceptBehindError": "Division by Zero",
        "stepByStepReasoning": [
            "Step 1: b=0",
            "Step 2: division attempted",
            "Step 3: Python raises error"
        ],
        "fixedCode": "print('Handled safely')",
        "fixAnalysis": {
            "whatChanged": "Added safe handling",
            "whyItWorks": "Prevents crash",
            "reinforcedConcept": "Error handling"
        },
        "learningResources": [],
        "similarErrors": [],
        "conceptBreakdown": "error-handling,division",
        "learningSummary": "You need defensive programming.",
        "confidenceScore": 0.95,
        "retryRecommendation": False,
        "errorDetail": {
            "errorType": "ZeroDivisionError",
            "errorFile": "main.py",
            "errorLine": 2,
            "context": "return a / b"
        }
    }


@app.post("/ai/chat")
async def chat(payload: dict):
    return {
        "reply": "Mock chat reply.",
        "suggestedFollowUps": [
            "What is defensive programming?"
        ]
    }


@app.post("/ai/artifacts")
async def artifacts(payload: dict):
    return {
        "pdfUrl": "https://mock-bucket/report.pdf",
        "pptUrl": "https://mock-bucket/presentation.pptx",
        "summaryUrl": "https://mock-bucket/summary.pdf"
    }


@app.post("/ai/roadmap")
async def roadmap(payload: dict):
    return {
        "knowledgeGapAnalysis": [],
        "recommendedTopics": [],
        "learningPriorities": "Focus on error handling.",
        "conceptMasteryScores": {}
    }