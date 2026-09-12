import os
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.services import (
    extract_text_from_pdf,
    generate_questions_from_text,
    predict_difficulty,
    evaluate_subjective,
    recommend_topics,
    exam_feedback,
    adaptive_difficulty,
)

app = FastAPI(title="AI Examination Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class DifficultyPredictRequest(BaseModel):
    text: str


class EvaluateRequest(BaseModel):
    question_text: str
    model_answer: str = ""
    student_answer: str
    max_score: int = 10


class RecommendRequest(BaseModel):
    student_history: List[Dict[str, Any]] = []
    proficiency_level: Optional[float] = None

class FeedbackRequest(BaseModel):
    score: float
    total_marks: float
    percentage: float
    answers: List[Dict[str, Any]] = []
    questions: List[Dict[str, Any]] = []


class AdaptiveRequest(BaseModel):
    performance_ratio: float
    current_difficulty: str = "medium"


@app.get("/health")
def health():
    return {"status": "ok", "service": "ai"}


@app.post("/questions/generate")
async def generate_questions(
    file: UploadFile = File(...),
    count: int = Form(5),
    topic: Optional[str] = Form(None),
):
    """Generate quiz questions from an uploaded PDF."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Please upload a PDF file")

    content = await file.read()
    try:
        text = extract_text_from_pdf(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF")

    questions = generate_questions_from_text(text, count=min(count, 20), topic=topic)
    return {"success": True, "count": len(questions), "questions": questions, "extracted_text_length": len(text)}


@app.post("/difficulty/predict")
def difficulty_predict(req: DifficultyPredictRequest):
    """Predict difficulty of a question."""
    result = predict_difficulty(req.text)
    return {"success": True, **result}


@app.post("/evaluate/subjective")
def evaluate(req: EvaluateRequest):
    """Auto-evaluate a subjective answer."""
    result = evaluate_subjective(req.question_text, req.model_answer, req.student_answer, req.max_score)
    return {"success": True, **result}


@app.post("/recommendations")
def recommendations(req: RecommendRequest):
    """Personalized topic/difficulty recommendations."""
    result = recommend_topics(req.student_history)
    return {"success": True, **result}


@app.post("/feedback/exam")
def feedback_endpoint(req: FeedbackRequest):
    """Generate AI feedback after exam submission."""
    feedback = exam_feedback(req.score, req.total_marks, req.percentage, req.answers)
    return {"success": True, "feedback": feedback}


@app.post("/feedback/summary/{attempt_id}")
def feedback_summary(attempt_id: str):
    """Placeholder for per-attempt feedback summary."""
    return {
        "success": True,
        "attempt_id": attempt_id,
        "feedback": "AI feedback summary generated for this attempt.",
    }


@app.post("/adaptive")
def adaptive_endpoint(req: AdaptiveRequest):
    """Determine next difficulty level for adaptive testing."""
    next_diff = adaptive_difficulty(req.performance_ratio, req.current_difficulty)
    return {"success": True, "next_difficulty": next_diff, "current_difficulty": req.current_difficulty}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
