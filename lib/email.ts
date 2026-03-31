import nodemailer from "nodemailer";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
}

//* Attendance verification email to HR
export async function sendEmail({
  to,
  subject,
  html,
  attachments,
}: EmailOptions): Promise<boolean> {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.warn(
        "SMTP environment variables are not fully set; skipping email send.",
      );
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: "Interntrack <no-reply@rushabh.dev>",
      to,
      subject,
      html,
      attachments: attachments || [],
    });

    const accepted = Array.isArray(info?.accepted) ? info.accepted.length : 0;
    return accepted > 0;
  } catch (error) {
    console.error("Email sending failed:", error);
    return false;
  }
}

export function generateAttendanceEmail(
  studentName: string,
  companyName: string,
  token: string,
): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://localhost:3000";
  const verifyUrl = `${baseUrl}/api/attendance/verify`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; }
        .button { display: inline-block; padding: 12px 30px; margin: 10px; text-decoration: none; border-radius: 5px; font-weight: bold; }
        .present { background-color: #10B981; color: white; }
        .absent { background-color: #EF4444; color: white; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Internship Attendance Verification</h1>
        </div>
        <div class="content">
          <h2>Student Attendance Verification Required</h2>
          <p>Hello,</p>
          <p><strong>${studentName}</strong> from <strong>${companyName}</strong> has requested attendance verification for today.</p>
          <p>Please click one of the buttons below to verify their attendance:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verifyUrl}?token=${token}&status=present" class="button present">
              ✓ PRESENT
            </a>
            <a href="${verifyUrl}?token=${token}&status=absent" class="button absent">
              ✗ ABSENT
            </a>
          </div>
          <p><em>This verification link is valid for 7 days.</em></p>
        </div>
        <div class="footer">
          <p>This is an automated message from the Internship Management System</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function generatePasswordResetEmail(
  name: string,
  resetUrl: string,
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background-color: #111827; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; line-height: 1.6; }
        .button { display: inline-block; padding: 12px 30px; margin: 20px 0; text-decoration: none; border-radius: 8px; font-weight: bold; background-color: #2563EB; color: white; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hello ${name},</p>
          <p>We received a request to reset your Interntrack password.</p>
          <p>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p>This link is valid for 1 hour and can only be used once.</p>
          <p>If you did not request a password reset, you can safely ignore this email.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from Interntrack.</p>
          <p>Do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

//* Automated email to internship coordinator every 15 days
export async function sendTeacherAttendanceReport(
  teacherEmail: string,
  teacherName: string,
  csvContent: string,
  fileName: string,
): Promise<boolean> {
  try {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
      console.warn(
        "SMTP environment variables are not fully set; skipping email send.",
      );
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: "Interntrack <no-reply@rushabh.dev>",
      to: teacherEmail,
      subject: `Attendance Report - Last 15 Days`,
      html: generateTeacherReportEmail(teacherName),
      attachments: [
        {
          filename: fileName,
          content: csvContent,
          contentType: "text/csv",
        },
      ],
    });

    const accepted = Array.isArray(info?.accepted) ? info.accepted.length : 0;
    return accepted > 0;
  } catch (error) {
    console.error("Teacher email sending failed:", error);
    return false;
  }
}

export function generateTeacherReportEmail(teacherName: string): string {
  const today = new Date().toLocaleDateString();
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
        .header { background-color: #3B82F6; color: white; padding: 20px; text-align: center; }
        .content { padding: 30px 20px; line-height: 1.6; }
        .footer { background-color: #f8f9fa; padding: 20px; text-align: center; color: #666; font-size: 12px; }
        .highlight { background-color: #DBEAFE; padding: 15px; border-left: 4px solid #3B82F6; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <h1>📊 Attendance Report</h1>
        </div>
        <div class="content">
          <p>Dear ${teacherName},</p>
          <p>Please find attached the attendance verification report for the last 15 days.</p>
          
          <div class="highlight">
            <p><strong>Report Details:</strong></p>
            <ul>
              <li>Period: Last 15 days</li>
              <li>Format: CSV (Excel compatible)</li>
              <li>Generated on: ${today}</li>
            </ul>
          </div>
          <p>You can open this file in Excel, Google Sheets, or any spreadsheet application for further analysis.</p>
        </div>
        <div class="footer">
          <p>This is an automated message from the Internship Management System</p>
          <p>Do not reply to this email</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
