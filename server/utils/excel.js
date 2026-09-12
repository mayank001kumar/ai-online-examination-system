const XLSX = require("xlsx");

// Parse questions from Excel/CSV buffer
// Expected columns: type, text, options (pipe separated), correctIndex, correctAnswer, difficulty, topic, marks, explanation
const parseQuestionsFromExcel = (buffer) => {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const questions = rows.map((row) => {
    let options = [];
    if (row.options) {
      options = String(row.options)
        .split("|")
        .map((o) => o.trim())
        .filter(Boolean);
    }
    // Support both "options" and option1..option4 columns
    const optCols = ["option1", "option2", "option3", "option4", "optionA", "optionB", "optionC", "optionD"];
    for (const c of optCols) {
      if (row[c]) options.push(String(row[c]).trim());
    }

    return {
      text: String(row.text || row.question || "").trim(),
      type: (String(row.type || "mcq").toLowerCase() === "subjective") ? "subjective"
        : (String(row.type || "mcq").toLowerCase() === "true_false") ? "true_false" : "mcq",
      options,
      correctIndex: row.correctIndex !== "" ? Number(row.correctIndex) : undefined,
      correctAnswer: row.correctAnswer ? String(row.correctAnswer).trim() : undefined,
      difficulty: (String(row.difficulty || "medium").toLowerCase()) === "easy" ? "easy"
        : (String(row.difficulty || "medium").toLowerCase()) === "hard" ? "hard" : "medium",
      topic: String(row.topic || "General").trim(),
      marks: row.marks ? Number(row.marks) : 1,
      explanation: row.explanation ? String(row.explanation).trim() : undefined,
      source: "import",
    };
  });

  // Filter empty rows
  return questions.filter((q) => q.text);
};

const generateExcelTemplate = () => {
  const data = [
    {
      type: "mcq",
      text: "What is the capital of France?",
      options: "Paris|London|Berlin|Madrid",
      correctIndex: 0,
      correctAnswer: "",
      difficulty: "easy",
      topic: "Geography",
      marks: 1,
      explanation: "Paris is the capital of France.",
    },
    {
      type: "subjective",
      text: "Explain the water cycle.",
      options: "",
      correctIndex: "",
      correctAnswer: "Key points: evaporation, condensation, precipitation",
      difficulty: "hard",
      topic: "Science",
      marks: 5,
      explanation: "",
    },
  ];
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Questions");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
};

module.exports = { parseQuestionsFromExcel, generateExcelTemplate };
