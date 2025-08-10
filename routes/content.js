const express = require("express");
const router = express.Router();

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

// Helper function to get initials
function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

module.exports = router;
