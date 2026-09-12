const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: { type: String, enum: ["student", "faculty", "admin"], default: "student" },
    isVerified: { type: Boolean, default: false },
    otp: String,
    otpExpires: Date,
    avatar: String,
    // Proctoring / security session tracking
    activeSessions: [{ token: String, device: String, lastActive: Date }],
    // Adaptive testing state
    proficiencyLevel: { type: Number, default: 0.5 }, // 0 to 1
    // Analytics derived
    totalExams: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    passStreak: { type: Number, default: 0 },
    resetToken: String,
    resetTokenExpires: Date,
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = function (entered) {
  return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model("User", userSchema);
