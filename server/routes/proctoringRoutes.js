const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const { reportEvent, getAttemptProctoring } = require("../controllers/proctoringController");

// Students report proctoring events
router.post("/event", protect, reportEvent);
// Faculty/admin view proctoring details
router.get("/attempt/:attemptId", protect, authorize("faculty", "admin"), getAttemptProctoring);

module.exports = router;
