const User = require("../models/User");
const { signToken } = require("../config/jwt");
const { generateOtp, isOtpValid } = require("../utils/otp");
const { sendOtpEmail, sendResetEmail } = require("../utils/email");
const { logActivity } = require("../middleware/auth");

const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }
    const exists = await User.findOne({ email: email.toLowerCase() });
    if (exists) {
      return res.status(400).json({ message: "Email already registered" });
    }
    const user = await User.create({
      name,
      email,
      password,
      role: role === "faculty" ? "faculty" : "student",
    });

    // Send OTP for email verification
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendOtpEmail(user.email, otp);

    const token = signToken({ id: user._id, role: user.role });
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified },
      message: "Registration successful. Please verify your email with the OTP sent.",
    });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Multiple login detection: if an active session exists, log it
    if (user.activeSessions && user.activeSessions.length > 0) {
      await logActivity({
        user: user._id,
        action: "MULTIPLE_LOGIN",
        detail: `New login while ${user.activeSessions.length} active session(s) exists`,
        severity: "warning",
        req,
      });
    }

    const token = signToken({ id: user._id, role: user.role });
    user.activeSessions = user.activeSessions || [];
    user.activeSessions.push({
      token,
      device: req.headers["user-agent"] || "unknown",
      lastActive: new Date(),
    });
    await user.save();

    res.json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, isVerified: user.isVerified },
    });
  } catch (err) {
    next(err);
  }
};

const verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!isOtpValid(user, otp)) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }
    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();
    res.json({ success: true, message: "Email verified successfully" });
  } catch (err) {
    next(err);
  }
};

const resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    const otp = generateOtp();
    user.otp = otp;
    user.otpExpires = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendOtpEmail(user.email, otp);
    res.json({ success: true, message: "OTP resent" });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found" });
    const resetToken = signToken({ id: user._id, purpose: "reset" });
    user.resetToken = resetToken;
    user.resetTokenExpires = Date.now() + 30 * 60 * 1000;
    await user.save();
    await sendResetEmail(user.email, resetToken);
    res.json({ success: true, message: "Reset link sent to your email" });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const user = await User.findOne({ resetToken: token, resetTokenExpires: { $gt: Date.now() } });
    if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
    res.json({ success: true, message: "Password reset successful. Please login." });
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (user) {
      user.activeSessions = (user.activeSessions || []).filter((s) => s.token !== req.token);
      await user.save();
    }
    await logActivity({ user: req.user._id, action: "LOGOUT", detail: "User logged out", severity: "info", req });
    res.json({ success: true, message: "Logged out" });
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

module.exports = { register, login, verifyOtp, resendOtp, forgotPassword, resetPassword, logout, getMe };
