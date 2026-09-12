const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    exam: { type: mongoose.Schema.Types.ObjectId, ref: "Exam" },
    action: { type: String, required: true }, // LOGIN, LOGOUT, TAB_SWITCH, COPY_PASTE, FULLSCREEN_EXIT, FACE_NOT_DETECTED, EXPIRED, etc.
    detail: String,
    severity: { type: String, enum: ["info", "warning", "critical"], default: "info" },
    ip: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true }
);

activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ exam: 1 });

module.exports = mongoose.model("ActivityLog", activityLogSchema);
