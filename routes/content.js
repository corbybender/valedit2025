const express = require("express");
const router = express.Router();
const FormsService = require("../src/services/formsService");
const sql = require("mssql");
const db = require("../db");

// Content management page route (authentication handled by server.js)
router.get("/", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    // Get current working site (using the refactored service)
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    const pageData = {
      title: "Content Blocks",
      user: {
        name: req.session.userInfo?.name || req.session.userInfo?.username,
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username
        ),
        username: req.session.userInfo?.username,
        loginMethod: req.session.userInfo?.loginMethod,
        isAdmin:
          req.session.userInfo?.IsAdmin ||
          req.session.userInfo?.isAdmin ||
          false,
      },
      currentWorkingSite: currentSite,
      authorID: authorID,
    };

    res.render("pages/content", pageData);
  } catch (error) {
    console.error("Error loading content page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load content management page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
});

// Content Images page route
router.get("/images", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    // Get current working site (using the refactored service)
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    const pageData = {
      title: "Images",
      user: {
        name: req.session.userInfo?.name || req.session.userInfo?.username,
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username
        ),
        username: req.session.userInfo?.username,
        loginMethod: req.session.userInfo?.loginMethod,
        isAdmin:
          req.session.userInfo?.IsAdmin ||
          req.session.userInfo?.isAdmin ||
          false,
      },
      currentWorkingSite: currentSite,
      currentWebsiteID: res.locals.currentWebsiteID,
      authorID: authorID,
    };

    res.render("pages/content-images", pageData);
  } catch (error) {
    console.error("Error loading images page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load images page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
});

// Content Documents page route
router.get("/documents", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    // Get current working site (using the refactored service)
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    const pageData = {
      title: "Documents",
      user: {
        name: req.session.userInfo?.name || req.session.userInfo?.username,
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username
        ),
        username: req.session.userInfo?.username,
        loginMethod: req.session.userInfo?.loginMethod,
        isAdmin:
          req.session.userInfo?.IsAdmin ||
          req.session.userInfo?.isAdmin ||
          false,
      },
      currentWorkingSite: currentSite,
      authorID: authorID,
    };

    res.render("pages/content-documents", pageData);
  } catch (error) {
    console.error("Error loading documents page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load documents page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
});

// Content Forms page route
router.get("/forms", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.redirect("/auth/login");
    }

    // Get current working site (using the refactored service)
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(
      authorID
    );

    const pageData = {
      title: "Forms",
      user: {
        name: req.session.userInfo?.name || req.session.userInfo?.username,
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username
        ),
        username: req.session.userInfo?.username,
        loginMethod: req.session.userInfo?.loginMethod,
        isAdmin:
          req.session.userInfo?.IsAdmin ||
          req.session.userInfo?.isAdmin ||
          false,
      },
      currentWorkingSite: currentSite,
      authorID: authorID,
    };

    res.render("pages/content-forms", pageData);
  } catch (error) {
    console.error("Error loading forms page:", error);
    res.status(500).render("pages/error", {
      error: "Failed to load forms page",
      user: {
        name:
          req.session.userInfo?.name ||
          req.session.userInfo?.username ||
          "Unknown",
        initials: getInitials(
          req.session.userInfo?.name || req.session.userInfo?.username || "UN"
        ),
        username: req.session.userInfo?.username || "unknown",
        loginMethod: req.session.userInfo?.loginMethod || "local",
      },
    });
  }
});

// Helper function to get initials
function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// ===== FORMS API ROUTES =====

// GET all forms for current website
router.get("/forms/api", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get current working site
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(authorID);
    
    if (!currentSite) {
      return res.status(400).json({ error: "No working site selected" });
    }

    const forms = await FormsService.getFormsByWebsite({
      websiteId: currentSite.WebsiteID,
      isActive: true
    });

    res.json({ success: true, forms: forms });
  } catch (error) {
    console.error("Error fetching forms:", error);
    res.status(500).json({ error: "Failed to fetch forms" });
  }
});

// GET single form by ID
router.get("/forms/api/:formId", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get current working site
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(authorID);
    
    if (!currentSite) {
      return res.status(400).json({ error: "No working site selected" });
    }

    const form = await FormsService.getFormById(
      parseInt(req.params.formId),
      currentSite.WebsiteID
    );

    if (!form) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json({ success: true, form: form });
  } catch (error) {
    console.error("Error fetching form:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

// CREATE a new form
router.post("/forms/api", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get current working site
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(authorID);
    
    if (!currentSite) {
      return res.status(400).json({ error: "No working site selected" });
    }

    const { name, description, elements, settings, successMessage, errorMessage, redirectUrl, isPublished } = req.body;

    if (!name || !elements || !Array.isArray(elements)) {
      return res.status(400).json({ error: "Form name and elements are required" });
    }

    const newForm = await FormsService.createForm({
      websiteId: currentSite.WebsiteID,
      authorId: authorID,
      name,
      description,
      elements,
      settings,
      successMessage,
      errorMessage,
      redirectUrl,
      isPublished: isPublished || false
    });

    res.json({ success: true, form: newForm, message: `Form "${name}" created successfully!` });
  } catch (error) {
    console.error("Error creating form:", error);
    res.status(500).json({ error: "Failed to create form" });
  }
});

// UPDATE an existing form
router.put("/forms/api/:formId", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get current working site
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(authorID);
    
    if (!currentSite) {
      return res.status(400).json({ error: "No working site selected" });
    }

    const formId = parseInt(req.params.formId);
    const { name, description, elements, settings, successMessage, errorMessage, redirectUrl, isPublished } = req.body;

    // Verify form exists and belongs to current website
    const existingForm = await FormsService.getFormById(formId, currentSite.WebsiteID);
    if (!existingForm) {
      return res.status(404).json({ error: "Form not found" });
    }

    const updatedForm = await FormsService.updateForm({
      formId,
      authorId: authorID,
      name,
      description,
      elements,
      settings,
      successMessage,
      errorMessage,
      redirectUrl,
      isPublished
    });

    res.json({ success: true, form: updatedForm, message: `Form "${updatedForm.Name}" updated successfully!` });
  } catch (error) {
    console.error("Error updating form:", error);
    res.status(500).json({ error: "Failed to update form" });
  }
});

// DELETE a form (soft delete)
router.delete("/forms/api/:formId", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get current working site
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(authorID);
    
    if (!currentSite) {
      return res.status(400).json({ error: "No working site selected" });
    }

    const formId = parseInt(req.params.formId);

    const success = await FormsService.deleteForm(formId, authorID, currentSite.WebsiteID);

    if (!success) {
      return res.status(404).json({ error: "Form not found" });
    }

    res.json({ success: true, message: "Form deleted successfully" });
  } catch (error) {
    console.error("Error deleting form:", error);
    res.status(500).json({ error: "Failed to delete form" });
  }
});

// GET form submissions
router.get("/forms/api/:formId/submissions", async (req, res) => {
  try {
    const authorID = req.session.authorID;
    if (!authorID) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get current working site
    const workingSiteService = require("../src/services/workingSiteService");
    const currentSite = await workingSiteService.getCurrentWorkingSite(authorID);
    
    if (!currentSite) {
      return res.status(400).json({ error: "No working site selected" });
    }

    const formId = parseInt(req.params.formId);
    const { status, limit = 50, offset = 0 } = req.query;

    const submissions = await FormsService.getSubmissionsByForm({
      formId,
      websiteId: currentSite.WebsiteID,
      status,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({ success: true, submissions: submissions });
  } catch (error) {
    console.error("Error fetching form submissions:", error);
    res.status(500).json({ error: "Failed to fetch form submissions" });
  }
});

// GET public form for rendering (public endpoint)
router.get("/forms/public/:formId", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    
    const pool = await db;
    const formResult = await pool
      .request()
      .input("formId", sql.Int, formId)
      .query(`
        SELECT f.*, w.Domain
        FROM Forms f
        INNER JOIN Websites w ON f.WebsiteID = w.WebsiteID
        WHERE f.FormID = @formId AND f.IsActive = 1 AND f.IsPublished = 1
      `);

    if (formResult.recordset.length === 0) {
      return res.status(404).json({ error: "Form not found or not published" });
    }

    const form = formResult.recordset[0];
    form.FormElements = form.FormElements ? JSON.parse(form.FormElements) : { elements: [] };

    res.json({ success: true, form: form });
  } catch (error) {
    console.error("Error fetching public form:", error);
    res.status(500).json({ error: "Failed to fetch form" });
  }
});

// CREATE form submission (public endpoint for form submissions)
router.post("/forms/submit/:formId", async (req, res) => {
  try {
    const formId = parseInt(req.params.formId);
    const submissionData = req.body;

    // Get client info
    const userIP = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');
    const referrerUrl = req.get('Referrer');
    const authorId = req.session.authorID || null;

    const submission = await FormsService.createSubmission({
      formId,
      authorId,
      userIP,
      userAgent,
      referrerUrl,
      submissionData
    });

    res.json({ 
      success: true, 
      submissionId: submission.SubmissionID,
      message: "Form submitted successfully!" 
    });
  } catch (error) {
    console.error("Error creating form submission:", error);
    res.status(500).json({ error: "Failed to submit form" });
  }
});

module.exports = router;