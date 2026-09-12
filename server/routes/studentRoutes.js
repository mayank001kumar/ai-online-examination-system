const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth");
const {
  getAvailableExams,
  joinExam,
  startExam,
  saveAnswer,
  saveProgress,
  submitExam,
  autoSubmit,
reportProctoringEvent,
  getExamDetails,
  getAdaptiveNext,
  getMyResults,
  getCertificate,
} = require("../controllers/studentController");

router.use(protect);

router.get("/exams", getAvailableExams);
router.post("/exams/join", joinExam);
router.get("/exams/:examId/start", startExam);
router.get("/exams/:examId/details", getExamDetails);
router.post("/attempts/:attemptId/answer", saveAnswer);
router.post("/attempts/:attemptId/progress", saveProgress);
router.post("/attempts/:attemptId/submit", submitExam);
router.post("/attempts/:attemptId/auto-submit", autoSubmit);
router.post("/attempts/:attemptId/proctoring", reportProctoringEvent);
router.post("/attempts/:attemptId/adaptive-next", getAdaptiveNext);
router.get("/results", getMyResults);
router.get("/certificate/:attemptId", getCertificate);

module.exports = router;
