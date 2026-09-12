const mongoose = require("mongoose");

const questionSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["mcq", "subjective", "true_false"],
      default: "mcq",
    },
    text: { type: String, required: true },
    options: [String], // for mcq
    correctIndex: Number, // for mcq
    correctAnswer: String, // for subjective / true_false
    difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
    topic: { type: String, default: "General" },
    marks: { type: Number, default: 1 },
    explanation: String,
    // For adaptive testing
    discrimination: { type: Number, default: 0 }, // item discrimination index
    timesAnswered: { type: Number, default: 0 },
    timesCorrect: { type: Number, default: 0 },
    source: { type: String, default: "manual" }, // manual | ai-generated | import
  },
  { timestamps: true }
);

questionSchema.index({ owner: 1, topic: 1 });
questionSchema.index({ difficulty: 1 });

module.exports = mongoose.model("Question", questionSchema);
