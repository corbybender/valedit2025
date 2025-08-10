const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");
const userController = require("../controllers/userController");
const websiteController = require("../controllers/websiteController");
const pageController = require("../controllers/pageController");
const contentController = require("../controllers/contentController");
const testController = require("../controllers/testController");
const { isAuthenticated, isAdmin } = require("../middleware/authentication");

// Root redirect
router.get("/", (req, res) => {
  if (req.session.userInfo) {
    res.redirect("/dashboard");
  } else {
    res.redirect("/auth/login");
  }
});

// Login redirect
router.get("/login", (req, res) => {
  res.redirect("/auth/login");
});

// Dashboard
router.get("/dashboard", isAuthenticated, dashboardController.showDashboard);

// Users page - handled by legacy route

// Websites page - handled by legacy route

// Pages
router.get(
  "/websites/:websiteId/website-pages",
  isAuthenticated,
  pageController.showPagesForWebsite
);
router.get("/buildpage", isAuthenticated, pageController.showBuildPage);
router.get("/pagetemplates", isAuthenticated, pageController.showPageTemplates);

// Content - handled by legacy routes

// Working site management
router.post(
  "/set-working-site",
  isAuthenticated,
  websiteController.setWorkingSite
);
router.get(
  "/api/current-working-site",
  isAuthenticated,
  websiteController.getCurrentWorkingSite
);
router.post("/switch-to-site", isAuthenticated, websiteController.switchToSite);
router.get(
  "/admin/working-sites",
  isAuthenticated,
  isAdmin,
  websiteController.getAllUsersWorkingSites
);

// Test routes (no authentication required)
router.get("/test-notifications", testController.showTestNotifications);
router.get("/debug-notifications", testController.showDebugNotifications);
router.get(
  "/test-fixed-notifications",
  testController.showTestFixedNotifications
);
router.get("/test-z-index", testController.showTestZIndex);
router.get("/test-content-debug", contentController.showTestContentDebug);

module.exports = router;
