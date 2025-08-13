const nodemailer = require("nodemailer");

/**
 * Email Service
 * Handles sending emails through SendGrid SMTP
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize the SMTP transporter with SendGrid configuration
   */
  initializeTransporter() {
    try {
      // Check if SendGrid API key is configured
      const sendGridApiKey = process.env.SENDGRID_API_KEY;

      // If no API key is provided, skip email service initialization
      if (!sendGridApiKey || sendGridApiKey.trim() === "") {
        console.warn(
          "SendGrid API key not configured. Email service will be disabled."
        );
        return;
      }

      // SendGrid SMTP configuration
      const smtpConfig = {
        host: "smtp.sendgrid.net",
        port: 587, // Use 587 for TLS, 465 for SSL, 25 for unencrypted
        secure: false, // true for 465, false for other ports
        auth: {
          user: "apikey", // SendGrid username is always 'apikey'
          pass: sendGridApiKey,
        },
        tls: {
          rejectUnauthorized: false, // Accept self-signed certificates
        },
      };

      this.transporter = nodemailer.createTransport(smtpConfig);

      // Verify the connection with timeout
      setTimeout(() => {
        this.transporter.verify((error, success) => {
          if (error) {
            console.error("Email service initialization failed:", error);
            this.transporter = null; // Disable transporter on failure
          } else {
            console.log("Email service initialized successfully");
          }
        });
      }, 1000); // Short timeout to avoid blocking server startup
    } catch (error) {
      console.error("Error initializing email transporter:", error);
      this.transporter = null; // Disable transporter on error
    }
  }

  /**
   * Send form submission notification email
   * @param {Object} params - Email parameters
   * @param {string} params.to - Recipient email address
   * @param {string} params.from - Sender email address
   * @param {Object} params.form - Form object
   * @param {Object} params.submission - Submission data
   * @param {Object} params.website - Website information
   * @returns {Promise<Object>} Email send result
   */
  async sendFormSubmissionNotification({
    to,
    from = process.env.SENDGRID_FROM_ADDRESS || process.env.DEFAULT_FROM_EMAIL || "noreply@yourdomain.com",
    form,
    submission,
    website,
  }) {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not initialized");
      }

      const subject = `New Form Submission: ${form.Name}`;
      const htmlContent = this.generateFormSubmissionHTML(
        form,
        submission,
        website
      );
      const textContent = this.generateFormSubmissionText(
        form,
        submission,
        website
      );

      const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent,
        replyTo: this.extractEmailFromSubmission(submission.SubmissionData),
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log("Form submission email sent successfully:", {
        messageId: result.messageId,
        to: to,
        form: form.Name,
      });

      return {
        success: true,
        messageId: result.messageId,
        message: "Email sent successfully",
      };
    } catch (error) {
      console.error("Error sending form submission email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Send autoresponse email to form submitter
   * @param {Object} params - Email parameters
   * @param {string} params.to - Submitter email address
   * @param {string} params.from - Sender email address
   * @param {Object} params.form - Form object
   * @param {Object} params.submission - Submission data
   * @param {Object} params.website - Website information
   * @returns {Promise<Object>} Email send result
   */
  async sendAutoresponseEmail({
    to,
    from = process.env.SENDGRID_FROM_ADDRESS || process.env.DEFAULT_FROM_EMAIL || "noreply@yourdomain.com",
    form,
    submission,
    website,
  }) {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not initialized");
      }

      const subject = `Thank you for contacting ${website?.Domain || "us"}`;
      const htmlContent = this.generateAutoresponseHTML(
        form,
        submission,
        website
      );
      const textContent = this.generateAutoresponseText(
        form,
        submission,
        website
      );

      const mailOptions = {
        from: from,
        to: to,
        subject: subject,
        text: textContent,
        html: htmlContent,
      };

      const result = await this.transporter.sendMail(mailOptions);

      console.log("Autoresponse email sent successfully:", {
        messageId: result.messageId,
        to: to,
        form: form.Name,
      });

      return {
        success: true,
        messageId: result.messageId,
        message: "Autoresponse email sent successfully",
      };
    } catch (error) {
      console.error("Error sending autoresponse email:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate HTML content for form submission notification
   * @param {Object} form - Form object
   * @param {Object} submission - Submission object
   * @param {Object} website - Website object
   * @returns {string} HTML content
   */
  generateFormSubmissionHTML(form, submission, website) {
    const submissionData =
      typeof submission.SubmissionData === "string"
        ? JSON.parse(submission.SubmissionData)
        : submission.SubmissionData;

    const formFields = submissionData.fields || {};
    const metadata = submissionData.metadata || {};

    let fieldsHTML = "";
    Object.keys(formFields).forEach((fieldName) => {
      const value = formFields[fieldName];
      if (value && value.toString().trim() !== "") {
        fieldsHTML += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #eee; background-color: #f8f9fa; font-weight: bold; width: 30%;">
              ${this.formatFieldName(fieldName)}
            </td>
            <td style="padding: 12px; border-bottom: 1px solid #eee;">
              ${this.formatFieldValue(value)}
            </td>
          </tr>
        `;
      }
    });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Form Submission - ${form.Name}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">New Form Submission</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${form.Name}</p>
          </div>
          
          <div style="padding: 30px;">
            <div style="margin-bottom: 25px;">
              <h2 style="color: #4f46e5; margin: 0 0 15px 0; font-size: 18px; border-bottom: 2px solid #e5e7eb; padding-bottom: 5px;">
                Submission Details
              </h2>
              <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
                ${fieldsHTML}
              </table>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
              <h3 style="color: #6b7280; margin: 0 0 10px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
                Submission Information
              </h3>
              <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
                <strong>Submitted:</strong> ${new Date(
                  submission.SubmittedAt
                ).toLocaleString()}
              </p>
              <p style="margin: 5px 0; font-size: 14px; color: #6b7280;">
                <strong>Website:</strong> ${website?.Domain || "N/A"}
              </p>
              ${
                submission.UserIP
                  ? `<p style="margin: 5px 0; font-size: 14px; color: #6b7280;"><strong>IP Address:</strong> ${submission.UserIP}</p>`
                  : ""
              }
              ${
                metadata.browser
                  ? `<p style="margin: 5px 0; font-size: 14px; color: #6b7280;"><strong>Browser:</strong> ${metadata.browser}</p>`
                  : ""
              }
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              This email was sent automatically by your form submission system.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for form submission notification
   * @param {Object} form - Form object
   * @param {Object} submission - Submission object
   * @param {Object} website - Website object
   * @returns {string} Plain text content
   */
  generateFormSubmissionText(form, submission, website) {
    const submissionData =
      typeof submission.SubmissionData === "string"
        ? JSON.parse(submission.SubmissionData)
        : submission.SubmissionData;

    const formFields = submissionData.fields || {};

    let fieldsText = "";
    Object.keys(formFields).forEach((fieldName) => {
      const value = formFields[fieldName];
      if (value && value.toString().trim() !== "") {
        fieldsText += `${this.formatFieldName(fieldName)}: ${value}\n`;
      }
    });

    return `
New Form Submission: ${form.Name}

${fieldsText}

Submission Information:
Submitted: ${new Date(submission.SubmittedAt).toLocaleString()}
Website: ${website?.Domain || "N/A"}
${submission.UserIP ? `IP Address: ${submission.UserIP}` : ""}

This email was sent automatically by your form submission system.
    `.trim();
  }

  /**
   * Generate HTML content for autoresponse email
   * @param {Object} form - Form object
   * @param {Object} submission - Submission object
   * @param {Object} website - Website object
   * @returns {string} HTML content
   */
  generateAutoresponseHTML(form, submission, website) {
    const customMessage =
      form.SuccessMessage || "Thank you for your submission!";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Thank You - ${form.Name}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
          <div style="background-color: #10b981; color: white; padding: 20px; text-align: center;">
            <h1 style="margin: 0; font-size: 24px;">Thank You!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">We received your submission</p>
          </div>
          
          <div style="padding: 30px; text-align: center;">
            <div style="margin-bottom: 25px;">
              <p style="font-size: 18px; color: #4f46e5; margin: 0 0 15px 0;">
                ${customMessage}
              </p>
              <p style="color: #6b7280; font-size: 16px;">
                We appreciate you taking the time to contact us through our "${
                  form.Name
                }" form.
              </p>
            </div>

            <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 20px; margin: 20px 0;">
              <p style="margin: 0; color: #166534; font-size: 14px;">
                <strong>What happens next?</strong><br>
                We'll review your submission and get back to you as soon as possible.
              </p>
            </div>

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #6b7280;">
                Submitted on ${new Date(
                  submission.SubmittedAt
                ).toLocaleString()}
              </p>
            </div>
          </div>

          <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">
              ${website?.Domain || "Your website"} | Automated Response
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Generate text content for autoresponse email
   * @param {Object} form - Form object
   * @param {Object} submission - Submission object
   * @param {Object} website - Website object
   * @returns {string} Plain text content
   */
  generateAutoresponseText(form, submission, website) {
    const customMessage =
      form.SuccessMessage || "Thank you for your submission!";

    return `
Thank You!

${customMessage}

We appreciate you taking the time to contact us through our "${form.Name}" form.

What happens next?
We'll review your submission and get back to you as soon as possible.

Submitted on ${new Date(submission.SubmittedAt).toLocaleString()}

${website?.Domain || "Your website"} | Automated Response
    `.trim();
  }

  /**
   * Extract email address from submission data for reply-to
   * @param {Object} submissionData - Submission data object
   * @returns {string|null} Email address if found
   */
  extractEmailFromSubmission(submissionData) {
    const data =
      typeof submissionData === "string"
        ? JSON.parse(submissionData)
        : submissionData;
    const fields = data.fields || {};

    // Look for common email field names
    const emailFields = [
      "email",
      "email_address",
      "emailAddress",
      "Email",
      "EMAIL",
    ];

    for (const fieldName of emailFields) {
      if (fields[fieldName] && this.isValidEmail(fields[fieldName])) {
        return fields[fieldName];
      }
    }

    // Look for any field that looks like an email
    for (const [fieldName, value] of Object.entries(fields)) {
      if (typeof value === "string" && this.isValidEmail(value)) {
        return value;
      }
    }

    return null;
  }

  /**
   * Validate email format
   * @param {string} email - Email to validate
   * @returns {boolean} Is valid email
   */
  isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Format field name for display
   * @param {string} fieldName - Raw field name
   * @returns {string} Formatted field name
   */
  formatFieldName(fieldName) {
    return fieldName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format field value for display
   * @param {any} value - Field value
   * @returns {string} Formatted value
   */
  formatFieldValue(value) {
    if (Array.isArray(value)) {
      return value.join(", ");
    }

    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }

    // Handle long text by preserving line breaks
    if (typeof value === "string" && value.length > 50) {
      return value.replace(/\n/g, "<br>");
    }

    return String(value);
  }

  /**
   * Test email configuration
   * @returns {Promise<Object>} Test result
   */
  async testEmailConfiguration() {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not initialized");
      }

      const testResult = await this.transporter.verify();
      return {
        success: true,
        message: "Email configuration is valid",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}

module.exports = new EmailService();
