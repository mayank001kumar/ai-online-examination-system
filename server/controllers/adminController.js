const User = require("../models/User");
const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const ActivityLog = require("../models/ActivityLog");

// Dashboard overview stats
const getDashboardStats = async (req, res, next) => {
  try {
    const [students, faculty, exams, attempts, flagged, questions] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "faculty" }),
      Exam.countDocuments(),
      Attempt.countDocuments({ status: { $in: ["submitted", "auto-submitted"] } }),
      Attempt.countDocuments({ "proctoring.flagged": true }),
      Question.countDocuments(),
    ]);

    // Average score across all attempts
    const allAttempts = await Attempt.find({ status: { $in: ["submitted", "auto-submitted"] } })
      .select("percentage passed score totalMarks");
    const avgScore = allAttempts.length
      ? allAttempts.reduce((s, a) => s + a.percentage, 0) / allAttempts.length
      : 0;
    const passRate = allAttempts.length
      ? (allAttempts.filter((a) => a.passed).length / allAttempts.length) * 100
      : 0;

    res.json({
      success: true,
      stats: {
        students,
        faculty,
        exams,
        attempts: attempts,
        flagged,
        questions,
        avgScore,
        passRate,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Weekly / monthly activity trend
const getAttemptsTrend = async (req, res, next) => {
  try {
    const days = Number(req.query.days) || 14;
    const since = new Date();
    since.setDate(since.getDate() - days);

    const attempts = await Attempt.find({
      submittedAt: { $gte: since },
      status: { $in: ["submitted", "auto-submitted"] },
    }).select("submittedAt percentage");

    // Group by day
    const trendMap = {};
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trendMap[key] = { date: key, attempts: 0, avgScore: 0, totalScore: 0 };
    }
    for (const a of attempts) {
      const key = new Date(a.submittedAt).toISOString().slice(0, 10);
      if (trendMap[key]) {
        trendMap[key].attempts += 1;
        trendMap[key].totalScore += a.percentage;
        trendMap[key].avgScore = trendMap[key].totalScore / trendMap[key].attempts;
      }
    }
    res.json({ success: true, trend: Object.values(trendMap) });
  } catch (err) {
    next(err);
  }
};

// Topic-wise strengths/weaknesses
const getTopicPerformance = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ status: { $in: ["submitted", "auto-submitted"] } })
      .populate("exam", "title")
      .lean();
    const questions = await Question.find().select("_id topic difficulty").lean();
    const qMap = {};
    questions.forEach((q) => (qMap[q._id] = q));

    const topicMap = {};
    for (const a of attempts) {
      for (const ans of a.answers) {
        const q = qMap[ans.questionId];
        if (!q) continue;
        if (!topicMap[q.topic]) topicMap[q.topic] = { topic: q.topic, correct: 0, total: 0, avgTime: 0, totalTime: 0 };
        topicMap[q.topic].total += 1;
        topicMap[q.topic].totalTime += ans.timeSpent || 0;
        if (ans.isCorrect) topicMap[q.topic].correct += 1;
      }
    }
    const result = Object.values(topicMap).map((t) => ({
      ...t,
      accuracy: t.total ? (t.correct / t.total) * 100 : 0,
      avgTime: t.total ? t.totalTime / t.total : 0,
    }));
    res.json({ success: true, topics: result });
  } catch (err) {
    next(err);
  }
};

// Class leaderboard
const getLeaderboard = async (req, res, next) => {
  try {
    const attempts = await Attempt.aggregate([
      { $match: { status: { $in: ["submitted", "auto-submitted"] } } },
      {
        $group: {
          _id: "$student",
          avgPercentage: { $avg: "$percentage" },
          totalExams: { $sum: 1 },
          passed: { $sum: { $cond: ["$passed", 1, 0] } },
          bestScore: { $max: "$percentage" },
        },
      },
      { $sort: { avgPercentage: -1 } },
      { $limit: 20 },
    ]);
    const populated = await User.populate(attempts, { path: "_id", select: "name email avatar" });
    res.json({
      success: true,
      leaderboard: populated.map((row, i) => ({
        rank: i + 1,
        student: row._id,
        avgPercentage: row.avgPercentage.toFixed(1),
        totalExams: row.totalExams,
        passed: row.passed,
        bestScore: row.bestScore.toFixed(1),
      })),
    });
  } catch (err) {
    next(err);
  }
};

// Per-student pass/fail prediction (simple heuristic + AI opt-in)
const getPassFailPrediction = async (req, res, next) => {
  try {
    const userId = req.params.userId || req.user._id;
    const attempts = await Attempt.find({ student: userId, status: { $in: ["submitted", "auto-submitted"] } })
      .select("percentage passed score totalMarks")
      .lean();
    if (!attempts.length) {
      return res.json({ success: true, prediction: { probability: 50, label: "Not enough data", attempts: 0 } });
    }

    const avg = attempts.reduce((s, a) => s + a.percentage, 0) / attempts.length;
    const trend = attempts.length > 1 ? attempts[attempts.length - 1].percentage - attempts[0].percentage : 0;
    // Heuristic model: combine average with trend
    let probability = 50 + (avg - 50) * 0.6 + trend * 0.4;
    probability = Math.max(5, Math.min(95, probability));
    const label = probability >= 60 ? "Likely to pass" : probability >= 40 ? "Borderline" : "At risk";

    res.json({
      success: true,
      prediction: {
        probability: Math.round(probability),
        label,
        attempts: attempts.length,
        avgScore: avg,
        trend,
      },
    });
  } catch (err) {
    next(err);
  }
};

// Activity log (security/audit)
const getActivityLogs = async (req, res, next) => {
  try {
    const { userId, examId, severity } = req.query;
    const filter = {};
    if (userId) filter.user = userId;
    if (examId) filter.exam = examId;
    if (severity) filter.severity = severity;
    const logs = await ActivityLog.find(filter)
      .populate("user", "name email")
      .populate("exam", "title")
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 100);
    res.json({ success: true, logs });
  } catch (err) {
    next(err);
  }
};

// System-wide students list
const getAllStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: "student" })
      .select("name email totalExams avgScore passStreak isVerified createdAt")
      .sort({ createdAt: -1 });
    res.json({ success: true, students });
  } catch (err) {
    next(err);
  }
};

// System-wide exams list
const getAllExams = async (req, res, next) => {
  try {
    const exams = await Exam.find()
      .populate("owner", "name")
      .populate("assignedStudents", "name email")
      .sort({ createdAt: -1 });
    res.json({ success: true, exams });
  } catch (err) {
    next(err);
  }
};

// Difficulty distribution (for question analytics)
const getDifficultyDistribution = async (req, res, next) => {
  try {
    const dist = await Question.aggregate([
      { $group: { _id: "$difficulty", count: { $sum: 1 } } },
    ]);
    res.json({ success: true, distribution: dist });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboardStats,
  getAttemptsTrend,
  getTopicPerformance,
  getLeaderboard,
  getPassFailPrediction,
  getActivityLogs,
  getAllStudents,
  getAllExams,
  getDifficultyDistribution,
};
