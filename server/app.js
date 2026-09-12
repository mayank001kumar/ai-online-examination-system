const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");

const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

// Trust proxy for rate limiting behind reverse proxies
app.set("trust proxy", 1);

// Security & middleware
app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL || "*", credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", limiter);

// Static uploads
app.use("/uploads", express.static("uploads"));

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/student", require("./routes/studentRoutes"));
app.use("/api/faculty", require("./routes/facultyRoutes"));
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/proctoring", require("./routes/proctoringRoutes"));
app.use("/api/ai", require("./routes/aiRoutes"));

// Health check
app.get("/api/health", (req, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

// 404 + error handler
app.use(notFound);
app.use(errorHandler);

module.exports = app;
