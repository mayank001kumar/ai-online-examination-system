const Exam = require("../models/Exam");
const Attempt = require("../models/Attempt");
const Question = require("../models/Question");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../middleware/auth");
const axios = require("axios");

// Get list of exams available to the student
const getAvailableExams = async (req, res, next) => {
  try {
    const now = new Date();
    const exams = await Exam.find({
      isPublished: true,
      assignedStudents: { $in: [req.user._id] },
    })
      .select("title description duration startTime endTime settings totalMarks passMarks accessCode aiFeedback")
      .lean();

    // Determine status for each exam
    const result = await Promise.all(
      exams.map(async (exam) => {
        const existing = await Attempt.findOne({ exam: exam._id, student: req.user._id })
          .select("status submittedAt score percentage passed")
          .lean();
        return {
          ...exam,
          attempt: existing || null,
          isOpen: (!exam.startTime || now >= exam.startTime) && (!exam.endTime || now <= exam.endTime),
        };
      })
    );
    res.json({ success: true, exams: result });
  } catch (err) {
    next(err);
  }
};

// Join exam by access code or QR
const joinExam = async (req, res, next) => {
  try {
    const { accessCode } = req.body;
    const exam = await Exam.findOne({ accessCode: accessCode.toUpperCase(), isPublished: true });
    if (!exam) {
      return res.status(404).json({ message: "Invalid exam code" });
    }
    const now = new Date();
    if (exam.startTime && now < exam.startTime) {
      return res.status(400).json({ message: "Exam has not started yet" });
    }
    if (exam.endTime && now > exam.endTime) {
      return res.status(400).json({ message: "Exam has ended" });
    }
    if (!exam.assignedStudents.includes(req.user._id)) {
      return res.status(403).json({ message: "You are not assigned to this exam" });
    }
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

// Start a new exam attempt (or resume existing)
const startExam = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const exam = await Exam.findById(examId);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    if (!exam.isPublished) return res.status(400).json({ message: "Exam not published" });

    // Check assignment
    if (!exam.assignedStudents.includes(req.user._id)) {
      return res.status(403).json({ message: "Not assigned to this exam" });
    }

    // Resume existing attempt
    let attempt = await Attempt.findOne({ exam: examId, student: req.user._id });
    if (attempt && attempt.status === "in-progress") {
      // Rebuild in-progress question data
      attempt.questionOrder = attempt.questionOrder || [];
      const questions = await Question.find({ _id: { $in: attempt.questionOrder } });
      return res.json({ success: true, attempt, questions: buildQuestions(questions, exam.settings), resume: true });
    }

    // Check if already submitted
    if (attempt && attempt.status !== "in-progress") {
      return res.status(400).json({ message: "You have already submitted this exam" });
    }

    // Build question list - randomize
    let pool = exam.questionIds;
    if (exam.settings.randomizeQuestions) {
      pool = shuffle(pool);
    }

    // For adaptive testing, we select a defined set
    const questionDocs = await Question.find({ _id: { $in: pool } });
    const ordered = pool.map((id) => questionDocs.find((q) => q._id.toString() === id.toString())).filter(Boolean);

    const now = new Date();
    attempt = await Attempt.create({
      exam: examId,
      student: req.user._id,
      questionOrder: ordered.map((q) => q._id),
      startedAt: now,
      lastResumeAt: now,
      timeLeft: exam.duration * 60,
      status: "in-progress",
      difficultyPath: [],
      answers: [],
    });

    await logActivity({ user: req.user._id, exam: examId, action: "EXAM_STARTED", detail: `Started exam: ${exam.title}`, severity: "info", req });
    res.status(201).json({ success: true, attempt, questions: buildQuestions(ordered, exam.settings), resume: false });
  } catch (err) {
    next(err);
  }
};

// Save answers (per question) - supports resume
const saveAnswer = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { questionId, selectedIndex, selectedOption, answerText, timeSpent, bookmarked } = req.body;

    const attempt = await Attempt.findOne({ _id: attemptId, student: req.user._id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "in-progress") {
      return res.status(400).json({ message: "Attempt already submitted" });
    }

    const question = await Question.findById(questionId);
    if (!question) return res.status(404).json({ message: "Question not found" });

    const existingIdx = attempt.answers.findIndex((a) => a.questionId.toString() === questionId);
    const answer = {
      questionId,
      selectedIndex,
      selectedOption,
      answerText,
      timeSpent: timeSpent || 0,
      bookmarked: !!bookmarked,
      questionDifficulty: question.difficulty,
    };

    // Evaluate
    answer.marksObtained = evaluateAnswer(question, answer);
    answer.isCorrect = answer.marksObtained > 0 || (question.type === "subjective" ? undefined : answer.marksObtained === question.marks);

    if (existingIdx >= 0) {
      attempt.answers[existingIdx] = answer;
    } else {
      attempt.answers.push(answer);
    }
    attempt.lastResumeAt = new Date();
    await attempt.save();

    res.json({ success: true, answer: answer });
  } catch (err) {
    next(err);
  }
};

// Save current position + bookmark
const saveProgress = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { currentQuestion, bookmarks, timeLeft } = req.body;
    const attempt = await Attempt.findOne({ _id: attemptId, student: req.user._id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (currentQuestion !== undefined) attempt.currentQuestion = currentQuestion;
    if (timeLeft !== undefined) attempt.timeLeft = timeLeft;
    if (bookmarks) {
      bookmarks.forEach((b) => {
        const a = attempt.answers.find((x) => x.questionId.toString() === b.questionId);
        if (a) a.bookmarked = b.bookmarked;
      });
    }
    attempt.lastResumeAt = new Date();
    await attempt.save();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// Submit exam (manual or auto)
const submitExam = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { mode } = req.body; // manual | auto
    const attempt = await Attempt.findOne({ _id: attemptId, student: req.user._id })
      .populate("exam")
      .populate("questionOrder");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    if (attempt.status !== "in-progress") {
      return res.status(400).json({ message: "Attempt already submitted" });
    }

    // Ensure all questions evaluated
    const questions = await Question.find({ _id: { $in: attempt.questionOrder } });

    // Recompute score
    let score = 0;
    let totalMarks = 0;
    for (const q of questions) {
      totalMarks += q.marks || 1;
      const ans = attempt.answers.find((a) => a.questionId.toString() === q._id.toString());
      if (ans) {
        if (ans.marksObtained === undefined) {
          ans.marksObtained = evaluateAnswer(q, ans);
        }
        score += ans.marksObtained;
      }
    }

    attempt.score = score;
    attempt.totalMarks = totalMarks;
    attempt.percentage = totalMarks ? (score / totalMarks) * 100 : 0;
    // Pass if percentage >= passMarks (passMarks is a percentage value, default 33)
    attempt.passed = attempt.percentage >= (attempt.exam.passMarks || 33);
    attempt.submittedAt = new Date();
    attempt.status = mode === "auto" ? "auto-submitted" : "submitted";

    // AI feedback for automatically evaluated subjective answers + overall
    // AI feedback for automatically evaluated subjective answers + overall
    if (attempt.exam.settings?.aiFeedback) {
      try {
        const aiRes = await axios.post(
          `${process.env.AI_SERVICE_URL || "http://localhost:8000"}/feedback/exam`,
          {
            score,
            totalMarks,
            percentage: attempt.percentage,
            answers: attempt.answers,
            questions,
          }
        );

        attempt.aiFeedback = aiRes.data.feedback;
      } catch (e) {
        console.error(
          "[AI Feedback] Error:",
          e.response?.status,
          e.response?.data || e.message
        );
        attempt.aiFeedback = "AI feedback unavailable.";
      }
    }

    await attempt.save();

    // Update student stats
    const user = await User.findById(req.user._id);
    user.totalExams += 1;
    user.avgScore = user.totalExams ? (user.avgScore * (user.totalExams - 1) + attempt.percentage) / user.totalExams : attempt.percentage;
    user.passStreak = attempt.passed ? user.passStreak + 1 : 0;
    await user.save();

    await logActivity({ user: req.user._id, exam: attempt.exam._id, action: "EXAM_SUBMITTED", detail: `Submitted exam: ${attempt.exam.title} (${attempt.status})`, severity: "info", req });

    const result = { ...attempt.toObject(), score, totalMarks, percentage: attempt.percentage, passed: attempt.passed };
    res.json({ success: true, result });
  } catch (err) {
    next(err);
  }
};

// Auto-submit when time expires (called by client or server)
const autoSubmit = submitExam;

// Track proctoring event
const reportProctoringEvent = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { event, detail } = req.body; // event: TAB_SWITCH, COPY_PASTE, FULLSCREEN_EXIT, FACE_NOT_DETECTED, MULTIPLE_FACES
    const attempt = await Attempt.findOne({ _id: attemptId, student: req.user._id });
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    attempt.proctoring = attempt.proctoring || { violations: 0, tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0, flagged: false };
    const p = attempt.proctoring;
    let severity = "warning";
    switch (event) {
      case "TAB_SWITCH":
        p.tabSwitches += 1;
        break;
      case "COPY_PASTE":
        p.violations += 1;
        break;
      case "FULLSCREEN_EXIT":
        p.violations += 1;
        severity = "critical";
        break;
      case "FACE_NOT_DETECTED":
        p.faceNotDetected += 1;
        break;
      case "MULTIPLE_FACES":
        p.multipleFaces += 1;
        severity = "critical";
        break;
      default:
        p.violations += 1;
    }
    p.violations = p.tabSwitches + p.faceNotDetected + p.multipleFaces;

    const maxViolations = attempt.exam?.settings?.proctoring?.maxViolations || 5;
    if (p.violations >= maxViolations) {
      p.flagged = true;
    }
    await attempt.save();

    await logActivity({
      user: req.user._id,
      exam: attempt.exam,
      action: event,
      detail: detail || event,
      severity,
      req,
    });

    res.json({ success: true, proctoring: p, flagged: p.flagged });
  } catch (err) {
    next(err);
  }
};

// Get exam details (settings) for a student
const getExamDetails = async (req, res, next) => {
  try {
    const exam = await Exam.findById(req.params.examId)
      .select("title description duration totalMarks passMarks settings aiFeedback accessCode startTime endTime");
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

// AI adaptive - get next question difficulty based on performance
const getAdaptiveNext = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await Attempt.findById(attemptId);
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });

    // Count correct vs incorrect so far
    const answered = attempt.answers.filter((a) => a.isCorrect !== undefined);
    const correct = answered.filter((a) => a.isCorrect).length;
    const ratio = answered.length ? correct / answered.length : 0.5;

    let nextDifficulty = "medium";
    if (ratio >= 0.7) nextDifficulty = "hard";
    else if (ratio <= 0.4) nextDifficulty = "easy";

    attempt.difficultyPath.push(nextDifficulty);
    await attempt.save();
    res.json({ success: true, nextDifficulty, performanceRatio: ratio });
  } catch (err) {
    next(err);
  }
};

// Get student results
const getMyResults = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ student: req.user._id })
      .populate("exam", "title totalMarks")
      .sort({ submittedAt: -1 })
      .lean();
    res.json({ success: true, attempts });
  } catch (err) {
    next(err);
  }
};

// Get result certificate
const getCertificate = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await Attempt.findById(attemptId)
      .populate("exam", "title")
      .populate("student", "name email");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    const { generateCertificate } = require("../utils/pdf");
    generateCertificate(attempt.student, attempt.exam, attempt, res);
  } catch (err) {
    next(err);
  }
};

// ===== Helpers =====
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildQuestions(questions, settings) {
  return questions.map((q) => {
    let options = q.options || [];
    let correctIndex = q.correctIndex;
    if (settings && settings.randomizeOptions && q.type === "mcq" && options.length) {
      const indexed = options.map((opt, i) => ({ opt, i }));
      const shuffled = shuffle(indexed);
      options = shuffled.map((x) => x.opt);
      correctIndex = shuffled.findIndex((x) => x.i === q.correctIndex);
    }
    return {
      _id: q._id,
      type: q.type,
      text: q.text,
      options,
      marks: q.marks,
      difficulty: q.difficulty,
      topic: q.topic,
      // DO NOT send correctIndex/correctAnswer to client
    };
  });
}

function evaluateAnswer(question, answer) {
  if (question.type === "mcq" || question.type === "true_false") {
    // Compare the actual selected option text.
    // This works even when options are randomized.
    const correctOption = question.options?.[question.correctIndex];

    if (
      answer.selectedOption !== undefined &&
      answer.selectedOption !== null
    ) {
      return answer.selectedOption === correctOption ? question.marks : 0;
    }

    // Fallback for older answers that only contain selectedIndex
    return answer.selectedIndex === question.correctIndex
      ? question.marks
      : 0;
  }

  // Subjective answers will be evaluated separately by AI service.
  return 0;
}

module.exports = {
  getAvailableExams,
  joinExam,
  startExam,
  saveAnswer,
  saveProgress,
  submitExam,
  autoSubmit,
  reportProctoringEvent,
  getExamDetails,
  getAdaptiveNext,
  getMyResults,
  getCertificate,
};
