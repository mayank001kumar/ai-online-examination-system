const { verifyToken } = require("../config/jwt");
const User = require("../models/User");
const ActivityLog = require("../models/ActivityLog");

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }
  if (!token) {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
  try {
    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Not authorized, token failed" });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

// Log activity for proctoring / security events
const logActivity = async ({ user, exam, action, detail, severity, req, metadata }) => {
  try {
    await ActivityLog.create({
      user: user || (req && req.user && req.user._id),
      exam,
      action,
      detail,
      severity,
      ip: req && req.ip,
      userAgent: req && req.headers["user-agent"],
      metadata,
    });
  } catch (err) {
    console.error("Activity log error:", err.message);
  }
};

module.exports = { protect, authorize, logActivity };
