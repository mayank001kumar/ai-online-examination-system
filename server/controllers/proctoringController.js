const ActivityLog = require("../models/ActivityLog");
const Attempt = require("../models/Attempt");

// Handle proctoring events at user level (independent of attempt)
const reportEvent = async (req, res, next) => {
  try {
    const { examId, event, detail, metadata } = req.body;
    await ActivityLog.create({
      user: req.user._id,
      exam: examId,
      action: event,
      detail: detail || event,
      severity: event === "FULLSCREEN_EXIT" || event === "MULTIPLE_FACES" ? "critical" : "warning",
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      metadata,
    });

    // If attemptId provided, update attempt proctoring stats
    if (metadata && metadata.attemptId) {
      const attempt = await Attempt.findById(metadata.attemptId);
      if (attempt) {
        attempt.proctoring = attempt.proctoring || { violations: 0, tabSwitches: 0, faceNotDetected: 0, multipleFaces: 0, flagged: false };
        const p = attempt.proctoring;
        switch (event) {
          case "TAB_SWITCH": p.tabSwitches += 1; break;
          case "FACE_NOT_DETECTED": p.faceNotDetected += 1; break;
          case "MULTIPLE_FACES": p.multipleFaces += 1; break;
          default: p.violations += 1;
        }
        p.violations = p.tabSwitches + p.faceNotDetected + p.multipleFaces;
        const max = 5;
        if (p.violations >= max) p.flagged = true;
        await attempt.save();
      }
    }

    res.json({ success: true, logged: true });
  } catch (err) {
    next(err);
  }
};

// Get proctoring details for a specific attempt (faculty view)
const getAttemptProctoring = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const attempt = await Attempt.findById(attemptId)
      .populate("student", "name email")
      .populate("exam", "title");
    if (!attempt) return res.status(404).json({ message: "Attempt not found" });
    const logs = await ActivityLog.find({ exam: attempt.exam, user: attempt.student })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, attempt, logs });
  } catch (err) {
    next(err);
  }
};

module.exports = { reportEvent, getAttemptProctoring };
