const Question = require("../models/Question");
const Exam = require("../models/Exam");
const User = require("../models/User");
const Attempt = require("../models/Attempt");
const ActivityLog = require("../models/ActivityLog");
const { logActivity } = require("../middleware/auth");
const { parseQuestionsFromExcel, generateExcelTemplate } = require("../utils/excel");
const { exportResultsToExcel } = require("../utils/pdf");
const { sendResultEmail } = require("../utils/email");

// ===== Question Bank Management =====

const createQuestion = async (req, res, next) => {
  try {
    const { text, type, options, correctIndex, correctAnswer, difficulty, topic, marks, explanation } = req.body;
    const question = await Question.create({
      owner: req.user._id,
      text,
      type: type || "mcq",
      options,
      correctIndex,
      correctAnswer,
      difficulty,
      topic,
      marks: marks || 1,
      explanation,
      source: "manual",
    });
    res.status(201).json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

const getQuestions = async (req, res, next) => {
  try {
    const { topic, difficulty, type, search } = req.query;
    const filter = { owner: req.user._id };
    if (topic) filter.topic = topic;
    if (difficulty) filter.difficulty = difficulty;
    if (type) filter.type = type;
    if (search) filter.text = { $regex: search, $options: "i" };
    const questions = await Question.find(filter).sort({ createdAt: -1 });
    res.json({ success: true, questions });
  } catch (err) {
    next(err);
  }
};

const getQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOne({ _id: req.params.id, owner: req.user._id });
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

const updateQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.json({ success: true, question });
  } catch (err) {
    next(err);
  }
};

const deleteQuestion = async (req, res, next) => {
  try {
    const question = await Question.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!question) return res.status(404).json({ message: "Question not found" });
    res.json({ success: true, message: "Question deleted" });
  } catch (err) {
    next(err);
  }
};

// Bulk create questions (used by AI generation fallback)
const bulkCreateQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;
    if (!Array.isArray(questions) || !questions.length) {
      return res.status(400).json({ message: "No questions provided" });
    }
    const docs = questions.map((q) => ({ ...q, owner: req.user._id, source: q.source || "manual" }));
    const created = await Question.insertMany(docs);
    res.status(201).json({ success: true, count: created.length, questions: created });
  } catch (err) {
    next(err);
  }
};

// Import questions from Excel/CSV
const importQuestions = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Please upload a file" });
    const fs = require("fs");
    const buffer = fs.readFileSync(req.file.path);
    const questions = parseQuestionsFromExcel(buffer);
    fs.unlink(req.file.path, () => {});
    if (!questions.length) return res.status(400).json({ message: "No valid questions found in file" });

    const docs = questions.map((q) => ({ ...q, owner: req.user._id }));
    const created = await Question.insertMany(docs);
    await logActivity({ user: req.user._id, action: "IMPORT_QUESTIONS", detail: `Imported ${created.length} questions`, severity: "info", req });
    res.status(201).json({ success: true, count: created.length, questions: created });
  } catch (err) {
    next(err);
  }
};

const downloadTemplate = async (req, res) => {
  const buffer = generateExcelTemplate();
  res.setHeader("Content-Disposition", "attachment; filename=question_template.xlsx");
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.send(buffer);
};

// ===== Exam Management =====

const createExam = async (req, res, next) => {
  try {
    const {
      title, description, questionIds, duration, totalMarks, passMarks,
      startTime, endTime, scheduled, settings, assignedStudents, aiFeedback,
    } = req.body;
    const exam = await Exam.create({
      title,
      description,
      owner: req.user._id,
      questionIds: questionIds || [],
      duration,
      totalMarks,
      passMarks: passMarks || 33,
      startTime,
      endTime,
      scheduled,
      settings: {
        randomizeQuestions: settings?.randomizeQuestions ?? true,
        randomizeOptions: settings?.randomizeOptions ?? true,
        allowResume: settings?.allowResume ?? true,
        autoSubmit: settings?.autoSubmit ?? true,
        adaptiveTesting: settings?.adaptiveTesting ?? false,
        proctoring: {
          webcam: settings?.proctoring?.webcam ?? true,
          faceDetection: settings?.proctoring?.faceDetection ?? true,
          tabSwitchDetection: settings?.proctoring?.tabSwitchDetection ?? true,
          enforceFullscreen: settings?.proctoring?.enforceFullscreen ?? true,
          blockCopyPaste: settings?.proctoring?.blockCopyPaste ?? true,
          maxViolations: settings?.proctoring?.maxViolations ?? 5,
        },
      },
      assignedStudents: assignedStudents || [],
      aiFeedback: aiFeedback ?? true,
    });
    res.status(201).json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

const getExams = async (req, res, next) => {
  try {
    const exams = await Exam.find({ owner: req.user._id })
      .populate("questionIds", "text difficulty topic type marks")
      .sort({ createdAt: -1 });
    res.json({ success: true, exams });
  } catch (err) {
    next(err);
  }
};

const getExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOne({ _id: req.params.id, owner: req.user._id })
      .populate("questionIds")
      .populate("assignedStudents", "name email");
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

const updateExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

const deleteExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    await Attempt.deleteMany({ exam: exam._id });
    res.json({ success: true, message: "Exam deleted" });
  } catch (err) {
    next(err);
  }
};

const publishExam = async (req, res, next) => {
  try {
    const exam = await Exam.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { isPublished: true },
      { new: true }
    );
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

// Assign students to exam
const assignStudents = async (req, res, next) => {
  try {
    const { studentIds } = req.body;
    const exam = await Exam.findOne({ _id: req.params.id, owner: req.user._id });
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    exam.assignedStudents = [...new Set([...exam.assignedStudents, ...studentIds])];
    await exam.save();
    res.json({ success: true, exam });
  } catch (err) {
    next(err);
  }
};

// ===== Student Management =====

const getStudents = async (req, res, next) => {
  try {
    const students = await User.find({ role: "student" }).select("name email isVerified totalExams avgScore createdAt");
    res.json({ success: true, students });
  } catch (err) {
    next(err);
  }
};

const addStudent = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Email already registered" });
    const student = await User.create({ name, email, password: password || "student123", role: "student", isVerified: true });
    res.status(201).json({ success: true, student });
  } catch (err) {
    next(err);
  }
};

const deleteStudent = async (req, res, next) => {
  try {
    const student = await User.findOneAndDelete({ _id: req.params.id, role: "student" });
    if (!student) return res.status(404).json({ message: "Student not found" });
    res.json({ success: true, message: "Student removed" });
  } catch (err) {
    next(err);
  }
};

// ===== Results & Analytics =====

const getExamResults = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ exam: req.params.id })
      .populate("student", "name email")
      .sort({ percentage: -1 });
    res.json({ success: true, attempts });
  } catch (err) {
    next(err);
  }
};

const publishResults = async (req, res, next) => {
  try {
    const { examId } = req.params;
    const attempts = await Attempt.find({ exam: examId, status: { $in: ["submitted", "auto-submitted"] } })
      .populate("student", "name email")
      .populate("exam", "title");
    for (const a of attempts) {
      if (a.student.email) {
        await sendResultEmail(a.student.email, a.student.name, a.exam.title, `${a.score}/${a.totalMarks} (${a.percentage.toFixed(1)}%)`, a.passed);
      }
    }
    res.json({ success: true, message: `Results published to ${attempts.length} students` });
  } catch (err) {
    next(err);
  }
};

const exportResults = async (req, res, next) => {
  try {
    const attempts = await Attempt.find({ exam: req.params.id })
      .populate("student", "name email");
    const buffer = exportResultsToExcel(attempts);
    res.setHeader("Content-Disposition", "attachment; filename=results.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(buffer);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
deleteQuestion,
  bulkCreateQuestions,
  importQuestions,
  downloadTemplate,
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  publishExam,
  assignStudents,
  getStudents,
  addStudent,
  deleteStudent,
  getExamResults,
  publishResults,
  exportResults,
};
