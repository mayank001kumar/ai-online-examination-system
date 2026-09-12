const mongoose = require("mongoose");

const examSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: String,
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    questionIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "Question" }],
    // Or use a question pool with config for randomization
    questionPool: [
      {
        questionId: { type: mongoose.Schema.Types.ObjectId, ref: "Question" },
        marks: Number,
      },
    ],
    duration: { type: Number, required: true }, // minutes
    totalMarks: { type: Number, default: 0 },
    passMarks: { type: Number, default: 33 },
    startTime: Date,
    endTime: Date,
    scheduled: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: false },
    // Exam settings
    settings: {
      randomizeQuestions: { type: Boolean, default: true },
      randomizeOptions: { type: Boolean, default: true },
      allowResume: { type: Boolean, default: true },
      autoSubmit: { type: Boolean, default: true },
      adaptiveTesting: { type: Boolean, default: false },
      proctoring: {
        webcam: { type: Boolean, default: true },
        faceDetection: { type: Boolean, default: true },
        tabSwitchDetection: { type: Boolean, default: true },
        enforceFullscreen: { type: Boolean, default: true },
        blockCopyPaste: { type: Boolean, default: true },
        maxViolations: { type: Number, default: 5 },
      },
    },
    // Assigned students
    assignedStudents: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    // QR code for joining
    qrCode: String,
    accessCode: { type: String, unique: true },
    // AI feedback
    aiFeedback: { type: Boolean, default: true },
  },
  { timestamps: true }
);

examSchema.pre("save", function (next) {
  if (!this.accessCode) {
    this.accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

module.exports = mongoose.model("Exam", examSchema);
