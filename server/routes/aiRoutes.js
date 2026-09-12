const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { proxy, generateFromPdf, generateFromText } = require("../controllers/aiController");

router.use(protect);

// Faculty-only AI generation
router.post("/questions/generate-text", authorize("faculty", "admin"), generateFromText);
router.post("/questions/generate", authorize("faculty", "admin"), upload.single("file"), generateFromPdf);

// Proxy read-only AI predictions to FastAPI service
router.post("/difficulty/predict", authorize("faculty", "admin"), (req, res, next) => proxy(req, res, next, "/difficulty/predict"));
router.post("/recommendations", authorize("faculty", "admin"), (req, res, next) => proxy(req, res, next, "/recommendations"));
router.post("/evaluate/subjective", (req, res, next) => proxy(req, res, next, "/evaluate/subjective"));
router.get("/feedback/summary/:attemptId", (req, res, next) => proxy(req, res, next, `/feedback/summary/${req.params.attemptId}`));

module.exports = router;
