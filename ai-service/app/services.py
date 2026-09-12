import io
import json
import random
from typing import List, Dict, Any

from pypdf import PdfReader
from .ai import chat, parse_json


def extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from uploaded PDF."""
    reader = PdfReader(io.BytesIO(file_bytes))
    text = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            text.append(t)
    return "\n".join(text)


def generate_questions_from_text(text: str, count: int = 5, topic: str = None) -> List[Dict]:
    """Generate quiz questions from extracted text using AI."""
    if not text.strip():
        text = "General knowledge across multiple disciplines."

    prompt = f"""
You are an expert question generator. Based on the following study material, generate exactly {count}
multiple-choice quiz questions. Each question must have 4 options and exactly one correct answer.

Study material:
\"\"\"
{text[:4000]}
\"\"\"

{topic and f"Focus specifically on the topic: {topic}." or ""}

Return ONLY a valid JSON array. Each element must have keys:
- "text" (string, the question)
- "options" (array of 4 strings)
- "correctIndex" (integer, index of correct option)
- "difficulty" (string: "easy", "medium", or "hard")
- "topic" (string)
- "marks" (integer, 1-5)
- "explanation" (string, brief explanation of correct answer)
"""

    for attempt in range(3):
        raw = chat([{"role": "user", "content": prompt}], temperature=0.8, max_tokens=2500)
        data = parse_json(raw)
        if isinstance(data, list) and data:
            # Validate and normalize
            normalized = []
            for q in data[:count]:
                try:
                    options = q.get("options", [])
                    if len(options) < 2:
                        options = ["Option A", "Option B", "Option C", "Option D"][:max(2, len(options))]
                    normalized.append({
                        "text": q.get("text", ""),
                        "type": "mcq",
                        "options": options,
                        "correctIndex": int(q.get("correctIndex", 0)) % len(options),
                        "difficulty": q.get("difficulty", "medium") if q.get("difficulty", "medium") in ["easy", "medium", "hard"] else "medium",
                        "topic": q.get("topic", topic or "General"),
                        "marks": int(q.get("marks", 1)),
                        "explanation": q.get("explanation", ""),
                        "source": "ai-generated",
                    })
                except Exception:
                    continue
            if normalized:
                return normalized
    # Ultimate fallback
    return _fallback_questions(count, topic)


def predict_difficulty(text: str) -> Dict:
    """Predict difficulty of a question."""
    # Heuristic: length and complexity words
    length = len(text.split())
    complex_words = ["compare", "analyze", "evaluate", "explain", "justify", "derive", "synthesize", "critique"]
    has_complex = any(w in text.lower() for w in complex_words)
    if length > 25 or has_complex or "?" not in text:
        difficulty = "hard"
    elif length > 12:
        difficulty = "medium"
    else:
        difficulty = "easy"

    prompt = f"""Classify the difficulty of this exam question as "easy", "medium", or "hard".
Return ONLY a JSON object: {{"difficulty": "...", "confidence": 0.0-1.0}}
Question: {text[:1000]}"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.2, max_tokens=100)
    data = parse_json(raw) or {}
    difficulty = data.get("difficulty", difficulty)
    if difficulty not in ["easy", "medium", "hard"]:
        difficulty = "medium"
    return {"difficulty": difficulty, "confidence": data.get("confidence", 0.7)}


def evaluate_subjective(question_text: str, model_answer: str, student_answer: str, max_score: int) -> Dict:
    """Automatically evaluate a subjective answer using AI."""
    prompt = f"""You are a fair examiner. Evaluate the student's answer against the model/correct answer.
Question: {question_text}
Model/Expected answer: {model_answer}
Student's answer: {student_answer}

Score the answer out of {max_score}. Consider accuracy, completeness, and clarity.
Return ONLY a JSON object with keys:
- "score" (number, 0 to {max_score})
- "feedback" (string, constructive feedback)
"""
    raw = chat([{"role": "user", "content": prompt}], temperature=0.3, max_tokens=300)
    data = parse_json(raw) or {}
    score = float(data.get("score", 0))
    # Clamp
    score = max(0, min(max_score, score))
    return {
        "score": round(score, 1),
        "max_score": max_score,
        "feedback": data.get("feedback", "Reviewed by AI."),
    }


def recommend_topics(student_history: List[Dict]) -> Dict:
    """Generate personalized recommendations based on student performance."""

    if not student_history:
        return {
            "recommended_topics": [],
            "recommended_difficulty": "medium",
            "summary": "Complete an exam to get personalized recommendations."
        }

    # Calculate performance by topic
    topic_scores = {}

    for entry in student_history:
        topic = entry.get("topic", "General")

        if topic not in topic_scores:
            topic_scores[topic] = {
                "correct": 0,
                "total": 0
            }

        topic_scores[topic]["total"] += 1

        if entry.get("isCorrect", False):
            topic_scores[topic]["correct"] += 1

    # Find weak topics
    weak_topics = []

    for topic, data in topic_scores.items():
        acc = data["correct"] / data["total"] if data["total"] else 0

        if acc < 0.5:
            weak_topics.append(topic)

    prompt = f"""
Based on student performance, the weak topics are:
{weak_topics or ['none']}

Recommend topics to study and an appropriate difficulty level.

Return ONLY valid JSON:
{{
    "recommended_topics": ["topic1", "topic2"],
    "recommended_difficulty": "easy|medium|hard",
    "summary": "short helpful summary"
}}
"""

    raw = chat(
        [{"role": "user", "content": prompt}],
        temperature=0.5,
        max_tokens=200
    )

    data = parse_json(raw) or {}

    recommended_topics = data.get(
        "recommended_topics",
        weak_topics[:3]
    )

    if not isinstance(recommended_topics, list):
        recommended_topics = weak_topics[:3]

    return {
        "recommended_topics": recommended_topics,
        "recommended_difficulty": data.get(
            "recommended_difficulty",
            "medium"
        ),
        "summary": data.get(
            "summary",
            f"Focus on improving {', '.join(weak_topics) if weak_topics else 'your strengths'}."
        )
    }


def exam_feedback(score: float, total_marks: float, percentage: float, answers: List[Dict]) -> str:
    """Generate overall AI feedback after an exam."""
    correct = sum(1 for a in answers if a.get("isCorrect"))
    total = len(answers) or 1
    accuracy = correct / total

    prompt = f"""Generate encouraging, constructive feedback for a student who scored {score}/{total_marks} ({percentage:.1f}%).
They answered {correct}/{total} questions correctly. Keep it to 2-3 sentences, professional and motivating.
Return the feedback as plain text (no JSON)."""
    return chat([{"role": "user", "content": prompt}], temperature=0.7, max_tokens=150)


def adaptive_difficulty(performance_ratio: float, current: str) -> str:
    """Determine next question difficulty based on performance."""
    if performance_ratio >= 0.7:
        return "hard"
    elif performance_ratio <= 0.4:
        return "easy"
    return "medium"


def _fallback_questions(count, topic):
    """Deterministic fallback questions if AI generation fails."""
    templates = [
        {"text": "Which of the following best describes the main concept?",
         "options": ["Concept A", "Concept B", "Concept C", "Concept D"],
         "correctIndex": 0, "difficulty": "easy", "topic": topic or "General", "marks": 1,
         "explanation": "This is the core concept."},
        {"text": "What is the primary advantage of understanding this topic?",
         "options": ["Improved efficiency", "No benefit", "Reduced accuracy", "Increased cost"],
         "correctIndex": 0, "difficulty": "medium", "topic": topic or "General", "marks": 2,
         "explanation": "Understanding key concepts improves efficiency."},
        {"text": "Which statement is most accurate regarding the subject?",
         "options": ["Statement 1", "Statement 2", "Statement 3", "Statement 4"],
         "correctIndex": 1, "difficulty": "hard", "topic": topic or "General", "marks": 3,
         "explanation": "Statement 2 is the most accurate."},
    ]
    result = []
    for i in range(count):
        q = dict(templates[i % len(templates)])
        q["text"] = f"{i+1}. {q['text']}"
        q["source"] = "ai-generated"
        result.append(q)
    return result
