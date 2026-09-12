const PDFDocument = require("pdfkit");
const XLSX = require("xlsx");
const { PassThrough } = require("stream");

// Generate certificate PDF for a student
const generateCertificate = (student, exam, result, stream) => {
  const doc = new PDFDocument({ size: "A4", layout: "landscape" });
  doc.pipe(stream);

  // Border
  doc.rect(30, 30, doc.page.width - 60, doc.page.height - 60).strokeColor("#2563eb").lineWidth(4).stroke();
  doc.rect(40, 40, doc.page.width - 80, doc.page.height - 80).strokeColor("#cbd5e1").lineWidth(1).stroke();

  doc.fontSize(14).fillColor("#64748b").text("CERTIFICATE OF COMPLETION", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(40).fillColor("#2563eb").text("Outstanding Achievement", { align: "center" });
  doc.moveDown(2);
  doc.fontSize(16).fillColor("#334155").text("This is to certify that", { align: "center" });
  doc.moveDown(0.5);
  doc.fontSize(34).fillColor("#0f172a").text(student.name, { align: "center" });
  doc.moveDown(0.8);
  doc.fontSize(14).fillColor("#475569").text(
    `has successfully completed the examination "${exam.title}" with a score of ${result.percentage.toFixed(1)}%`,
    { align: "center", width: doc.page.width - 160, align: "center" }
  );
  doc.moveDown(2);
  doc.fontSize(12).fillColor("#64748b").text(`Date: ${new Date().toLocaleDateString()}`, { align: "center" });
  doc.text(`Certificate ID: ${certId()}`, { align: "center" });

  doc.end();
  return doc;
};

const certId = () => {
  return "CERT-" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
};

const pdfToBuffer = (doc) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
};

// Export results to Excel
const exportResultsToExcel = (results) => {
  const rows = results.map((r) => ({
    "Student Name": r.student?.name,
    Email: r.student?.email,
    Score: r.score,
    "Total Marks": r.totalMarks,
    Percentage: r.percentage,
    Passed: r.passed ? "Yes" : "No",
    Status: r.status,
    "Time Taken (min)": r.submittedAt && r.startedAt ? Math.round((new Date(r.submittedAt) - new Date(r.startedAt)) / 60000) : "",
    "Tab Switches": r.proctoring?.tabSwitches,
    Violations: r.proctoring?.violations,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Results");
  return XLSX.write(wb, { bookType: "xlsx", type: "buffer" });
};

module.exports = { generateCertificate, exportResultsToExcel, pdfToBuffer };
