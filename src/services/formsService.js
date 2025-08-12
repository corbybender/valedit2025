const sql = require("mssql");
const db = require("../../db");
const NotificationService = require("./notificationService");
const EmailService = require("./emailService");

// Check if email service is properly initialized
const isEmailServiceAvailable = () => {
  try {
    // Try to access the transporter
    return EmailService && EmailService.transporter !== null;
  } catch (error) {
    console.warn("Email service not available:", error.message);
    return false;
  }
};

/**
 * Forms Service
 * Handles all form-related database operations
 */
class FormsService {
  /**
   * Create a new form
   * @param {Object} params - Form parameters
   * @param {number} params.websiteId - Website ID
   * @param {number} params.authorId - Author ID who created the form
   * @param {string} params.name - Form name
   * @param {string} [params.description] - Form description
   * @param {Array} params.elements - Form elements array
   * @param {Object} [params.settings] - Form settings
   * @param {string} [params.successMessage] - Success message
   * @param {string} [params.errorMessage] - Error message
   * @param {boolean} [params.isPublished=false] - Published status
   * @param {boolean} [params.requiresAuthentication=false] - Authentication required
   * @param {boolean} [params.allowMultipleSubmissions=true] - Allow multiple submissions
   * @returns {Promise<Object>} Created form object
   */
  static async createForm({
    websiteId,
    authorId,
    name,
    description = null,
    elements,
    settings = null,
    successMessage = "Thank you for your submission!",
    errorMessage = "There was an error processing your submission.",
    redirectUrl = null,
    isPublished = false,
    requiresAuthentication = false,
    allowMultipleSubmissions = true,
  }) {
    try {
      const pool = await db;
      const request = pool.request();

      const result = await request
        .input("websiteId", sql.BigInt, websiteId)
        .input("authorId", sql.Int, authorId)
        .input("name", sql.NVarChar(255), name)
        .input("description", sql.NVarChar(1000), description)
        .input(
          "formElements",
          sql.NVarChar(sql.MAX),
          JSON.stringify({ elements })
        )
        .input(
          "formSettings",
          sql.NVarChar(sql.MAX),
          settings ? JSON.stringify(settings) : null
        )
        .input("successMessage", sql.NVarChar(1000), successMessage)
        .input("errorMessage", sql.NVarChar(1000), errorMessage)
        .input("redirectUrl", sql.NVarChar(500), redirectUrl)
        .input("isPublished", sql.Bit, isPublished)
        .input("requiresAuthentication", sql.Bit, requiresAuthentication)
        .input("allowMultipleSubmissions", sql.Bit, allowMultipleSubmissions)
        .query(`
          INSERT INTO Forms (
            WebsiteID, AuthorID, Name, Description, FormElements, FormSettings,
            SuccessMessage, ErrorMessage, RedirectUrl, IsPublished,
            RequiresAuthentication, AllowMultipleSubmissions
          )
          OUTPUT INSERTED.*
          VALUES (
            @websiteId, @authorId, @name, @description, @formElements, @formSettings,
            @successMessage, @errorMessage, @redirectUrl, @isPublished,
            @requiresAuthentication, @allowMultipleSubmissions
          )
        `);

      const createdForm = result.recordset[0];

      // Create notification
      await NotificationService.createNotification({
        userId: authorId,
        title: "Form Created",
        message: `Form "${name}" has been created successfully.`,
        type: "success",
        category: "forms",
        websiteId: websiteId,
        relatedEntityType: "form",
        relatedEntityID: createdForm.FormID.toString(),
      });

      return createdForm;
    } catch (error) {
      console.error("Error creating form:", error);
      throw error;
    }
  }

  /**
   * Update an existing form
   * @param {Object} params - Update parameters
   * @param {number} params.formId - Form ID to update
   * @param {number} params.authorId - Author ID making the update
   * @param {string} [params.name] - Form name
   * @param {string} [params.description] - Form description
   * @param {Array} [params.elements] - Form elements array
   * @param {Object} [params.settings] - Form settings
   * @param {string} [params.successMessage] - Success message
   * @param {string} [params.errorMessage] - Error message
   * @param {boolean} [params.isPublished] - Published status
   * @param {boolean} [params.requiresAuthentication] - Authentication required
   * @param {boolean} [params.allowMultipleSubmissions] - Allow multiple submissions
   * @returns {Promise<Object>} Updated form object
   */
  static async updateForm({
    formId,
    authorId,
    name,
    description,
    elements,
    settings,
    successMessage,
    errorMessage,
    redirectUrl,
    isPublished,
    requiresAuthentication,
    allowMultipleSubmissions,
  }) {
    try {
      const pool = await db;
      const request = pool.request();

      // Build dynamic update query
      let updateFields = [];
      let params = { formId: formId };

      if (name !== undefined) {
        updateFields.push("Name = @name");
        params.name = name;
      }
      if (description !== undefined) {
        updateFields.push("Description = @description");
        params.description = description;
      }
      if (elements !== undefined) {
        updateFields.push("FormElements = @formElements");
        params.formElements = JSON.stringify({ elements });
      }
      if (settings !== undefined) {
        updateFields.push("FormSettings = @formSettings");
        params.formSettings = settings ? JSON.stringify(settings) : null;
      }
      if (successMessage !== undefined) {
        updateFields.push("SuccessMessage = @successMessage");
        params.successMessage = successMessage;
      }
      if (errorMessage !== undefined) {
        updateFields.push("ErrorMessage = @errorMessage");
        params.errorMessage = errorMessage;
      }
      if (redirectUrl !== undefined) {
        updateFields.push("RedirectUrl = @redirectUrl");
        params.redirectUrl = redirectUrl;
      }
      if (isPublished !== undefined) {
        updateFields.push("IsPublished = @isPublished");
        params.isPublished = isPublished;
      }
      if (requiresAuthentication !== undefined) {
        updateFields.push("RequiresAuthentication = @requiresAuthentication");
        params.requiresAuthentication = requiresAuthentication;
      }
      if (allowMultipleSubmissions !== undefined) {
        updateFields.push(
          "AllowMultipleSubmissions = @allowMultipleSubmissions"
        );
        params.allowMultipleSubmissions = allowMultipleSubmissions;
      }

      updateFields.push("UpdatedAt = GETDATE()");

      request.input("formId", sql.Int, formId);
      Object.keys(params).forEach((key) => {
        if (key !== "formId") {
          const value = params[key];
          if (key === "formElements" || key === "formSettings") {
            request.input(key, sql.NVarChar(sql.MAX), value);
          } else if (typeof value === "boolean") {
            request.input(key, sql.Bit, value);
          } else if (typeof value === "number") {
            request.input(key, sql.Int, value);
          } else {
            request.input(key, sql.NVarChar(1000), value);
          }
        }
      });

      const result = await request.query(`
        UPDATE Forms 
        SET ${updateFields.join(", ")}
        OUTPUT INSERTED.*
        WHERE FormID = @formId
      `);

      const updatedForm = result.recordset[0];

      // Create notification
      await NotificationService.createNotification({
        userId: authorId,
        title: "Form Updated",
        message: `Form "${updatedForm.Name}" has been updated successfully.`,
        type: "success",
        category: "forms",
        websiteId: updatedForm.WebsiteID,
        relatedEntityType: "form",
        relatedEntityID: formId.toString(),
      });

      return updatedForm;
    } catch (error) {
      console.error("Error updating form:", error);
      throw error;
    }
  }

  /**
   * Get forms by website ID with optional filters
   * @param {Object} params - Query parameters
   * @param {number} params.websiteId - Website ID
   * @param {number} [params.authorId] - Filter by author ID
   * @param {boolean} [params.isActive] - Filter by active status
   * @param {boolean} [params.isPublished] - Filter by published status
   * @param {number} [params.limit=50] - Limit results
   * @param {number} [params.offset=0] - Offset for pagination
   * @returns {Promise<Array>} Array of forms
   */
  static async getFormsByWebsite({
    websiteId,
    authorId = null,
    isActive = null,
    isPublished = null,
    limit = 50,
    offset = 0,
  }) {
    try {
      const pool = await db;
      const request = pool.request();

      let whereClause = "WHERE f.WebsiteID = @websiteId";
      request.input("websiteId", sql.BigInt, websiteId);

      if (authorId !== null) {
        whereClause += " AND f.AuthorID = @authorId";
        request.input("authorId", sql.Int, authorId);
      }

      if (isActive !== null) {
        whereClause += " AND f.IsActive = @isActive";
        request.input("isActive", sql.Bit, isActive);
      }

      if (isPublished !== null) {
        whereClause += " AND f.IsPublished = @isPublished";
        request.input("isPublished", sql.Bit, isPublished);
      }

      request.input("limit", sql.Int, limit).input("offset", sql.Int, offset);

      const result = await request.query(`
        SELECT 
          f.*,
          (SELECT COUNT(*) FROM FormSubmissions fs WHERE fs.FormID = f.FormID) as SubmissionCount
        FROM Forms f
        ${whereClause}
        ORDER BY f.UpdatedAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

      return result.recordset.map((form) => ({
        ...form,
        FormElements: form.FormElements
          ? JSON.parse(form.FormElements)
          : { elements: [] },
        FormSettings: form.FormSettings ? JSON.parse(form.FormSettings) : null,
      }));
    } catch (error) {
      console.error("Error getting forms:", error);
      throw error;
    }
  }

  /**
   * Get a single form by ID with access control
   * @param {number} formId - Form ID
   * @param {number} websiteId - Website ID for access control
   * @returns {Promise<Object|null>} Form object or null if not found
   */
  static async getFormById(formId, websiteId) {
    try {
      const pool = await db;
      const request = pool.request();

      const result = await request
        .input("formId", sql.Int, formId)
        .input("websiteId", sql.BigInt, websiteId).query(`
          SELECT 
            f.*
          FROM Forms f
          WHERE f.FormID = @formId AND f.WebsiteID = @websiteId
        `);

      if (result.recordset.length === 0) {
        return null;
      }

      const form = result.recordset[0];
      return {
        ...form,
        FormElements: form.FormElements
          ? JSON.parse(form.FormElements)
          : { elements: [] },
        FormSettings: form.FormSettings ? JSON.parse(form.FormSettings) : null,
      };
    } catch (error) {
      console.error("Error getting form by ID:", error);
      throw error;
    }
  }

  /**
   * Delete a form (soft delete by setting IsActive = 0)
   * @param {number} formId - Form ID to delete
   * @param {number} authorId - Author ID making the deletion
   * @param {number} websiteId - Website ID for access control
   * @returns {Promise<boolean>} Success status
   */
  static async deleteForm(formId, authorId, websiteId) {
    try {
      const pool = await db;
      const request = pool.request();

      const result = await request
        .input("formId", sql.Int, formId)
        .input("websiteId", sql.BigInt, websiteId).query(`
          UPDATE Forms 
          SET IsActive = 0, UpdatedAt = GETDATE()
          OUTPUT INSERTED.Name
          WHERE FormID = @formId AND WebsiteID = @websiteId
        `);

      if (result.recordset.length === 0) {
        return false;
      }

      const formName = result.recordset[0].Name;

      // Create notification
      await NotificationService.createNotification({
        userId: authorId,
        title: "Form Deleted",
        message: `Form "${formName}" has been deleted.`,
        type: "warning",
        category: "forms",
        websiteId: websiteId,
        relatedEntityType: "form",
        relatedEntityID: formId.toString(),
      });

      return true;
    } catch (error) {
      console.error("Error deleting form:", error);
      throw error;
    }
  }

  /**
   * Create a form submission
   * @param {Object} params - Submission parameters
   * @param {number} params.formId - Form ID
   * @param {number} [params.authorId] - Author ID if authenticated
   * @param {string} [params.userIP] - User IP address
   * @param {string} [params.userAgent] - User agent string
   * @param {string} [params.referrerUrl] - Referrer URL
   * @param {Object} params.submissionData - Form submission data
   * @param {boolean} [params.sendEmails=true] - Whether to send email notifications
   * @returns {Promise<Object>} Created submission object
   */
  static async createSubmission({
    formId,
    authorId = null,
    userIP = null,
    userAgent = null,
    referrerUrl = null,
    submissionData,
    sendEmails = true,
  }) {
    try {
      const pool = await db;
      const request = pool.request();

      // First, create the submission record
      const result = await request
        .input("formId", sql.Int, formId)
        .input("authorId", sql.Int, authorId)
        .input("userIP", sql.NVarChar(50), userIP)
        .input("userAgent", sql.NVarChar(500), userAgent)
        .input("referrerUrl", sql.NVarChar(500), referrerUrl)
        .input(
          "submissionData",
          sql.NVarChar(sql.MAX),
          JSON.stringify(submissionData)
        ).query(`
          INSERT INTO FormSubmissions (
            FormID, AuthorID, UserIP, UserAgent, ReferrerUrl, SubmissionData
          )
          OUTPUT INSERTED.*
          VALUES (
            @formId, @authorId, @userIP, @userAgent, @referrerUrl, @submissionData
          )
        `);

      const submission = result.recordset[0];

      // Send email notifications if enabled
      if (sendEmails) {
        try {
          await this.sendEmailNotifications(submission);
        } catch (emailError) {
          console.error("Error sending email notifications:", emailError);
          // Don't fail the submission if email fails, just log the error
        }
      }

      return submission;
    } catch (error) {
      console.error("Error creating form submission:", error);
      throw error;
    }
  }

  /**
   * Send email notifications for form submission
   * @param {Object} submission - Form submission object
   * @returns {Promise<void>}
   */
  static async sendEmailNotifications(submission) {
    // Check if email service is available before attempting to send emails
    if (!isEmailServiceAvailable()) {
      console.warn("Email service not available, skipping email notifications");
      return;
    }

    try {
      const pool = await db;
      const request = pool.request();

      // Get form and website information
      const formResult = await request.input(
        "formId",
        sql.Int,
        submission.FormID
      ).query(`
          SELECT f.*, w.Domain, w.WebsiteID
          FROM Forms f
          INNER JOIN Websites w ON f.WebsiteID = w.WebsiteID
          WHERE f.FormID = @formId
        `);

      if (formResult.recordset.length === 0) {
        console.error("Form not found for submission:", submission.FormID);
        return;
      }

      const form = formResult.recordset[0];
      const website = { Domain: form.Domain, WebsiteID: form.WebsiteID };

      // Parse form settings to get email configuration
      const formSettings = form.FormSettings
        ? JSON.parse(form.FormSettings)
        : {};
      const emailSettings = formSettings.notifications || {};

      // Send notification email to admin/recipients
      if (
        emailSettings.sendEmailOnSubmission &&
        emailSettings.emailRecipients
      ) {
        const recipients = Array.isArray(emailSettings.emailRecipients)
          ? emailSettings.emailRecipients
          : [emailSettings.emailRecipients];

        for (const recipient of recipients) {
          if (recipient && recipient.trim()) {
            try {
              await EmailService.sendFormSubmissionNotification({
                to: recipient.trim(),
                form: form,
                submission: submission,
                website: website,
              });
            } catch (error) {
              console.error(
                `Failed to send notification to ${recipient}:`,
                error
              );
            }
          }
        }
      }

      // Send autoresponse email to submitter
      if (emailSettings.sendAutoresponse) {
        const submitterEmail = EmailService.extractEmailFromSubmission(
          submission.SubmissionData
        );

        if (submitterEmail) {
          try {
            await EmailService.sendAutoresponseEmail({
              to: submitterEmail,
              form: form,
              submission: submission,
              website: website,
            });
          } catch (error) {
            console.error(
              `Failed to send autoresponse to ${submitterEmail}:`,
              error
            );
          }
        }
      }
    } catch (error) {
      console.error("Error in sendEmailNotifications:", error);
      throw error;
    }
  }

  /**
   * Get submissions for a form
   * @param {Object} params - Query parameters
   * @param {number} params.formId - Form ID
   * @param {number} params.websiteId - Website ID for access control
   * @param {string} [params.status] - Filter by status
   * @param {number} [params.limit=50] - Limit results
   * @param {number} [params.offset=0] - Offset for pagination
   * @returns {Promise<Array>} Array of submissions
   */
  static async getSubmissionsByForm({
    formId,
    websiteId,
    status = null,
    limit = 50,
    offset = 0,
  }) {
    try {
      const pool = await db;
      const request = pool.request();

      let whereClause = `WHERE f.FormID = @formId AND f.WebsiteID = @websiteId`;
      request
        .input("formId", sql.Int, formId)
        .input("websiteId", sql.BigInt, websiteId);

      if (status) {
        whereClause += " AND fs.Status = @status";
        request.input("status", sql.NVarChar(50), status);
      }

      request.input("limit", sql.Int, limit).input("offset", sql.Int, offset);

      const result = await request.query(`
        SELECT 
          fs.*
        FROM FormSubmissions fs
        INNER JOIN Forms f ON fs.FormID = f.FormID
        ${whereClause}
        ORDER BY fs.SubmittedAt DESC
        OFFSET @offset ROWS
        FETCH NEXT @limit ROWS ONLY
      `);

      return result.recordset.map((submission) => ({
        ...submission,
        SubmissionData: submission.SubmissionData
          ? JSON.parse(submission.SubmissionData)
          : null,
      }));
    } catch (error) {
      console.error("Error getting form submissions:", error);
      throw error;
    }
  }
}

module.exports = FormsService;
