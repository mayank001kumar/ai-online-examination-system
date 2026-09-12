const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const {
  getDashboardStats,
  getAttemptsTrend,
  getTopicPerformance,
  getLeaderboard,
  getPassFailPrediction,
  getActivityLogs,
  getAllStudents,
  getAllExams,
  getDifficultyDistribution,
} = require("../controllers/adminController");

router.use(protect, authorize("admin", "faculty"));

router.get("/stats", getDashboardStats);
router.get("/trend", getAttemptsTrend);
router.get("/topic-performance", getTopicPerformance);
router.get("/leaderboard", getLeaderboard);
router.get("/predict/:userId", getPassFailPrediction);
router.get("/predict", getPassFailPrediction);
router.get("/activity-logs", getActivityLogs);
router.get("/students", getAllStudents);
router.get("/exams", getAllExams);
router.get("/difficulty-distribution", getDifficultyDistribution);

module.exports = router;
