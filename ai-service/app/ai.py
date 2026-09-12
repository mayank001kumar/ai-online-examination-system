
import re
import json
import random
import os
from dotenv import load_dotenv

load_dotenv()
# OpenAI client with graceful fallback to mock responses
try:
    from openai import OpenAI

    _client = OpenAI(
    api_key=os.getenv("GEMINI_API_KEY"),
    base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
    timeout=60.0,
    max_retries=1
)

    _API_AVAILABLE = bool(os.getenv("GEMINI_API_KEY"))

except Exception:
    _client = None
    _API_AVAILABLE = False

MODEL = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")


def _mock_chat(messages):
    """Return a reasonable mock response when OpenAI is unavailable."""
    content = messages[-1]["content"] if messages else ""
    if "generate" in content.lower() or "quiz" in content.lower():
        return json.dumps([
            {
                "text": "What is the primary subject of the provided material?",
                "type": "mcq",
                "options": ["Computer Science", "History", "Biology", "None of the above"],
                "correctIndex": 0,
                "difficulty": "easy",
                "topic": "General",
                "marks": 1,
                "explanation": "Fallback AI-generated question.",
            }
        ])
    if "difficulty" in content.lower():
        return json.dumps({"difficulty": "medium", "confidence": 0.7})
    if "score" in content.lower() or "evaluate" in content.lower():
        return json.dumps({"score": 7, "max_score": 10, "feedback": "Good attempt. Provide more detail and use specific examples."})
    if "recommend" in content.lower():
        return json.dumps({"recommended_topics": ["Data Structures", "Algorithms"], "recommended_difficulty": "medium"})
    if "feedback" in content.lower():
        return ("Overall you performed well. Focus on improving your understanding of the medium-difficulty "
                "topics. Keep practicing time management.")
    return json.dumps({"message": "AI fallback response"})


def chat(messages, temperature=0.7, max_tokens=1000):
    """Send a chat request to Gemini through the OpenAI-compatible API."""

    if not _API_AVAILABLE or not _client:
        print("[AI] Gemini API is not available. Using fallback.")
        return _mock_chat(messages)

    try:
        print(f"[AI] Calling Gemini model: {MODEL}")

        resp = _client.chat.completions.create(
            model=MODEL,
            messages=messages,
            max_tokens=max_tokens,
        )

        content = resp.choices[0].message.content

        if not content:
            print("[AI] Gemini returned empty content.")
            return _mock_chat(messages)

        print("[AI] Gemini response received successfully.")
        return content

    except Exception as e:
        print(f"[AI] Gemini call failed: {type(e).__name__}: {e}")
        return _mock_chat(messages)


def parse_json(text):
    """Safely parse JSON from AI output."""
    if not text:
        return None
    text = text.strip()
    # Remove possible markdown fences
    text = re.sub(r"^```json\s*|\s*```$|^```\s*", "", text).strip()
    try:
        return json.loads(text)
    except Exception:
        # Try to extract first JSON array/object
        try:
            match = re.search(r"(\{.*\}|\[.*\])", text, re.DOTALL)
            if match:
                return json.loads(match.group(0))
        except Exception:
            return None
    return None
