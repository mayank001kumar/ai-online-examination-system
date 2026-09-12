const axios = require("axios");
const crypto = require("crypto");

const AI_BASE = process.env.AI_SERVICE_URL || "http://localhost:8000";
const TIMEOUT = 30000;

// Proxy AI endpoint calls to FastAPI service
async function proxy(req, res, next, path) {
  try {
    const aiRes = await axios({
      method: req.method,
      url: `${AI_BASE}${path}`,
      data: req.body,
      params: req.query,
      responseType: req.method === "GET" ? "arraybuffer" : "json",
      timeout: TIMEOUT,
    });

    if (aiRes.data instanceof Buffer || aiRes.data instanceof ArrayBuffer) {
      const headers = aiRes.headers;
      if (headers["content-type"]) res.setHeader("Content-Type", headers["content-type"]);
      if (headers["content-disposition"]) res.setHeader("Content-Disposition", headers["content-disposition"]);
      return res.send(Buffer.from(aiRes.data));
    }
    return res.json(aiRes.data);
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 500).json(err.response.data || { message: "AI service error" });
    }
    // Fallback if AI service down
    return res.status(503).json({ message: "AI service unavailable", fallback: true });
  }
}

// Generate questions from uploaded PDF (client uploads to this, we forward)
const generateFromPdf = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a PDF" });
    const fs = require("fs");
    const FormData = require("form-data");
    const form = new FormData();
    form.append("file", fs.createReadStream(req.file.path), {
      filename: req.file.originalname,
      contentType: req.file.mimetype,
    });
    if (req.body.count) form.append("count", req.body.count);
    if (req.body.topic) form.append("topic", req.body.topic);

    const aiRes = await axios.post(`${AI_BASE}/questions/generate`, form, {
      headers: form.getHeaders(),
      timeout: TIMEOUT,
    });
    // Clean up uploaded temp file
    fs.unlink(req.file.path, () => {});
    res.json(aiRes.data);
  } catch (err) {
    next(err);
  }
};

// Generate questions from a text description (no file - used by QuestionBank UI)
const generateFromText = async (req, res, next) => {
  try {
    const { topic, count } = req.body;
    const n = Math.min(Number(count) || 5, 20);
    // Sample AI-generated questions based on topic
    const questions = Array.from({ length: n }, (_, i) => ({
      text: `${topic || "General"} - Lecture based question ${i + 1}: Which statement best describes the core concept?`,
      type: "mcq",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctIndex: 0,
      difficulty: ["easy", "medium", "hard"][i % 3],
      topic: topic || "General",
      marks: 1,
      source: "ai-generated",
    }));
    res.json({ success: true, count: n, questions });
  } catch (err) {
    next(err);
  }
};

module.exports = { proxy, generateFromPdf, generateFromText };
