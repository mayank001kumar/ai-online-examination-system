require("dotenv").config();
const connectDB = require("./config/db");
const User = require("./models/User");
const Question = require("./models/Question");
const Exam = require("./models/Exam");

const sampleQuestions = [
  {
    text: "What is the capital of France?",
    type: "mcq",
    options: ["Paris", "London", "Berlin", "Madrid"],
    correctIndex: 0,
    difficulty: "easy",
    topic: "Geography",
    marks: 1,
    explanation: "Paris is the capital of France.",
  },
  {
    text: "What is 2 + 2?",
    type: "mcq",
    options: ["3", "4", "5", "22"],
    correctIndex: 1,
    difficulty: "easy",
    topic: "Mathematics",
    marks: 1,
    explanation: "Basic addition.",
  },
  {
    text: "Which planet is known as the Red Planet?",
    type: "mcq",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctIndex: 1,
    difficulty: "easy",
    topic: "Science",
    marks: 1,
    explanation: "Mars has a reddish appearance due to iron oxide.",
  },
  {
    text: "What does CPU stand for?",
    type: "mcq",
    options: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"],
    correctIndex: 0,
    difficulty: "medium",
    topic: "Computer Science",
    marks: 2,
    explanation: "CPU stands for Central Processing Unit.",
  },
  {
    text: "The water cycle describes the continuous movement of water on, above and below the surface of the Earth.",
    type: "subjective",
    correctAnswer: "Evaporation, condensation, precipitation, collection",
    difficulty: "hard",
    topic: "Science",
    marks: 5,
    explanation: "Key stages: evaporation, condensation, precipitation, collection.",
  },
  {
    text: "Newton's first law of motion is also called the law of inertia.",
    type: "true_false",
    options: ["True", "False"],
    correctIndex: 0,
    difficulty: "medium",
    topic: "Physics",
    marks: 1,
    explanation: "It is indeed the law of inertia.",
  },
  {
    text: "What is the largest ocean on Earth?",
    type: "mcq",
    options: ["Atlantic", "Indian", "Pacific", "Arctic"],
    correctIndex: 2,
    difficulty: "medium",
    topic: "Geography",
    marks: 2,
    explanation: "The Pacific Ocean is the largest.",
  },
  {
    text: "Time complexity of binary search in the worst case is O(log n).",
    type: "mcq",
    options: ["O(1)", "O(n)", "O(log n)", "O(n²)"],
    correctIndex: 2,
    difficulty: "hard",
    topic: "Computer Science",
    marks: 2,
    explanation: "Binary search divides the search space in half each time.",
  },
];

async function seed() {
  try {
    await connectDB();

    // Wipe existing users so passwords are re-hashed via pre('save') hook
    await User.deleteMany({});

    // Admin
    const admin = await User.create({
      name: "System Admin",
      email: "admin@exam.com",
      password: "admin123",
      role: "admin",
      isVerified: true,
    });

    // Faculty
    const faculty = await User.create({
      name: "Dr. Sharma",
      email: "faculty@exam.com",
      password: "faculty123",
      role: "faculty",
      isVerified: true,
    });

    // Students
    const students = await User.create([
      { name: "Aarav Patel", email: "student@exam.com", password: "student123", role: "student", isVerified: true },
      { name: "Priya Singh", email: "priya@exam.com", password: "student123", role: "student", isVerified: true },
      { name: "Rohan Verma", email: "rohan@exam.com", password: "student123", role: "student", isVerified: true },
    ]);

    // Questions
    const existingQuestions = await Question.find({ owner: faculty._id });
    let questionsToInsert = [];
    for (const q of sampleQuestions) {
      const dup = existingQuestions.find((e) => e.text === q.text);
      if (!dup) questionsToInsert.push({ ...q, owner: faculty._id, source: "manual" });
    }
    const questions = await Question.insertMany(questionsToInsert);
    const allQuestions = [...existingQuestions, ...questions];

// Exam
    const existingExam = await Exam.findOne({ title: "Computer Science Fundamentals" });
    let exam;
    if (existingExam) {
      existingExam.questionIds = allQuestions.map((q) => q._id);
      existingExam.assignedStudents = students.map((s) => s._id);
      existingExam.owner = faculty._id;
      await existingExam.save();
      exam = existingExam;
    } else {
      exam = await Exam.create({
        title: "Computer Science Fundamentals",
        description: "A foundational exam covering computer science core concepts with AI adaptive testing.",
        owner: faculty._id,
        questionIds: allQuestions.map((q) => q._id),
        duration: 30,
        totalMarks: allQuestions.reduce((s, q) => s + (q.marks || 1), 0),
        passMarks: 40,
        isPublished: true,
        assignedStudents: students.map((s) => s._id),
        settings: {
          randomizeQuestions: true,
          randomizeOptions: true,
          allowResume: true,
          autoSubmit: true,
          adaptiveTesting: true,
          aiFeedback: true,
          proctoring: {
            webcam: true,
            faceDetection: true,
            tabSwitchDetection: true,
            enforceFullscreen: true,
            blockCopyPaste: true,
            maxViolations: 5,
          },
        },
      });
    }

    console.log("✅ Seed complete!");
    console.log("   Admin:   admin@exam.com / admin123");
    console.log("   Faculty: faculty@exam.com / faculty123");
    console.log("   Student: student@exam.com / student123  (also priya@, rohan@)");
    console.log(`   Exam: ${exam.title} (${exam.questionIds.length} questions)`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
}

seed();
