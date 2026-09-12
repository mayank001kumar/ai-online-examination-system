const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const {
  createQuestion,
  getQuestions,
  getQuestion,
  updateQuestion,
deleteQuestion,
  bulkCreateQuestions,
  importQuestions,
  downloadTemplate,
  createExam,
  getExams,
  getExam,
  updateExam,
  deleteExam,
  publishExam,
  assignStudents,
  getStudents,
  addStudent,
  deleteStudent,
  getExamResults,
  publishResults,
  exportResults,
} = require("../controllers/facultyController");

router.use(protect, authorize("faculty", "admin"));

// Questions
router.route("/questions")
  .get(getQuestions)
  .post(createQuestion);
router.route("/questions/import")
  .post(upload.single("file"), importQuestions);
router.post("/questions/bulk", bulkCreateQuestions);
router.get("/questions/template", downloadTemplate);
router.route("/questions/:id")
  .get(getQuestion)
  .put(updateQuestion)
  .delete(deleteQuestion);

// Exams
router.route("/exams")
  .get(getExams)
  .post(createExam);
router.route("/exams/:id")
  .get(getExam)
  .put(updateExam)
  .delete(deleteExam);
router.post("/exams/:id/publish", publishExam);
router.post("/exams/:id/assign", assignStudents);

// Students
router.get("/students", getStudents);
router.post("/students", addStudent);
router.delete("/students/:id", deleteStudent);

// Results
router.get("/exams/:id/results", getExamResults);
router.post("/exams/:id/publish-results", publishResults);
router.get("/exams/:id/export-results", exportResults);

module.exports = router;
