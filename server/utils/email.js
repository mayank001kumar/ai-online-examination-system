const nodemailer = require("nodemailer");

// Create reusable transporter (uses Ethereal in dev if no SMTP configured)
let transporter = null;

const getTransporter = async () => {
  if (transporter) return transporter;
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Dev: Ethereal test account (captures emails, logs preview URL)
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log("📧 Using Ethereal test email account");
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  const t = await getTransporter();
  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || '"Exam System" <no-reply@exam.com>',
    to,
    subject,
    html,
    text,
  });
  // Log preview URL for Ethereal in dev
  if (info.messageId && info.nodeMailerResponse) {
    console.log("Email preview:", nodemailer.getTestMessageUrl(info));
  }
  return info;
};

const sendOtpEmail = async (email, otp) => {
  return sendEmail({
    to: email,
    subject: "Your Login OTP",
    html: `<div style="font-family:Arial;max-width:400px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px">
      <h2>Verify your email</h2>
      <p>Your one-time password is:</p>
      <h1 style="letter-spacing:8px;color:#2563eb">${otp}</h1>
      <p>This code expires in 10 minutes.</p>
    </div>`,
  });
};

const sendResetEmail = async (email, resetToken) => {
  const url = `${process.env.CLIENT_URL || "http://localhost:5173"}/reset-password?token=${resetToken}`;
  return sendEmail({
    to: email,
    subject: "Reset your password",
    html: `<div style="font-family:Arial;max-width:400px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px">
      <h2>Reset Password</h2>
      <p>Click the button below to reset your password:</p>
      <a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset Password</a>
      <p style="margin-top:16px;color:#888">This link expires in 30 minutes.</p>
    </div>`,
  });
};

const sendResultEmail = async (email, studentName, examTitle, score, passed) => {
  return sendEmail({
    to: email,
    subject: `Result: ${examTitle}`,
    html: `<div style="font-family:Arial;max-width:400px;margin:auto;padding:20px;border:1px solid #eee;border-radius:8px">
      <h2>Your result is here!</h2>
      <p>Hi ${studentName},</p>
      <p>Your result for <strong>${examTitle}</strong> has been published.</p>
      <p>Score: <strong>${score}</strong></p>
      <p style="color:${passed ? "green" : "red"}">${passed ? "Congratulations, you passed!" : "Better luck next time."}</p>
    </div>`,
  });
};

module.exports = { sendEmail, sendOtpEmail, sendResetEmail, sendResultEmail };
