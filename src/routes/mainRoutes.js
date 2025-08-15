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

// Analytics
router.get("/analytics", isAuthenticated, (req, res) => {
  res.render("pages/analytics", {
    user: res.locals.user,
    currentWebsite: res.locals.currentWebsite,
    currentWebsiteID: res.locals.currentWebsiteID,
    title: "Analytics Settings"
  });
});

// Sitemap
router.get("/sitemap", isAuthenticated, (req, res) => {
  res.render("pages/sitemap", {
    user: res.locals.user,
    currentWebsite: res.locals.currentWebsite,
    currentWebsiteID: res.locals.currentWebsiteID,
    title: "Sitemap Generator"
  });
});

router.post("/sitemap/generate", isAuthenticated, async (req, res) => {
  try {
    const sitemapController = require("../controllers/sitemapController");
    await sitemapController.generateSitemap(req, res);
  } catch (error) {
    console.error('Error generating sitemap:', error);
    res.status(500).json({ success: false, error: 'Failed to generate sitemap' });
  }
});

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

// Megamenu sample page (with authentication to access user context)
router.get("/megamenu-sample", isAuthenticated, (req, res) => {
  res.render("pages/megamenu-sample", {
    user: req.session.userInfo,
    currentWebsite: res.locals.currentWebsite || null,
    pageTitle: "Megamenu Demo"
  });
});

// Tailwind megamenu sample page (WORKING VERSION)
router.get("/tailwind-megamenu-sample", isAuthenticated, (req, res) => {
  // DEBUG: Log all the available data
  console.log("=== DEBUGGING CURRENT WEBSITE DATA ===");
  console.log("res.locals.currentWebsite:", JSON.stringify(res.locals.currentWebsite, null, 2));
  console.log("res.locals.currentWebsiteID:", res.locals.currentWebsiteID);
  console.log("req.session.currentWebsite:", JSON.stringify(req.session.currentWebsite, null, 2));
  console.log("req.session.userInfo:", JSON.stringify(req.session.userInfo, null, 2));
  console.log("=========================================");
  
  res.render("pages/tailwind-megamenu-sample", {
    user: req.session.userInfo,
    currentWebsite: res.locals.currentWebsite || null,
    pageTitle: "Tailwind Megamenu Demo"
  });
});

router.get("/settings", isAuthenticated, isAdmin, (req, res) => {
  res.render("pages/settings", {
    user: req.session.userInfo,
    currentWebsite: res.locals.currentWebsite,
    pageTitle: "Settings",
    isAdmin: res.locals.user?.isAdmin || false,
  });
});

module.exports = router;
