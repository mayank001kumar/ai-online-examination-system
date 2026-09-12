const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
    selectedIndex: Number,
    selectedOption: String,
    answerText: String,
    isCorrect: Boolean,
    marksObtained: { type: Number, default: 0 },
    timeSpent: { type: Number, default: 0 }, // seconds
    bookmarked: { type: Boolean, default: false },
    questionDifficulty: String,
    aiScore: Number,
    aiFeedback: String,
  },
  { _id: false }
);

const attemptSchema = new mongoose.Schema(
  {
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam", required: true },
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Randomized question order for this attempt
    questionOrder: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    answers: [answerSchema],
    currentQuestion: { type: Number, default: 0 },
    startedAt: Date,
    lastResumeAt: Date,
    submittedAt: Date,
    timeLeft: { type: Number }, // seconds remaining (for resume)
    status: {
      type: String,
      enum: ["in-progress", "submitted", "auto-submitted", "expired", "flagged"],
      default: "in-progress",
    },
    // Adaptive testing
    difficultyPath: [String],
    // Proctoring summary
    proctoring: {
      violations: { type: Number, default: 0 },
      tabSwitches: { type: Number, default: 0 },
      faceNotDetected: { type: Number, default: 0 },
      multipleFaces: { type: Number, default: 0 },
      flagged: { type: Boolean, default: false },
    },
    score: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    percentage: { type: Number, default: 0 },
    passed: { type: Boolean, default: false },
    aiFeedback: String,
    adaptiveDifficulty: { type: String },
  },
  { timestamps: true }
);

attemptSchema.index({ exam: 1, student: 1 });
attemptSchema.index({ student: 1, status: 1 });

module.exports = mongoose.model("Attempt", attemptSchema);
