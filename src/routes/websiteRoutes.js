const express = require("express");
const router = express.Router();
const websiteController = require("../controllers/websiteController");
const { isAuthenticated, isAdmin } = require("../middleware/authentication");

// API routes
router.get("/", websiteController.getAllWebsites);
router.get("/:id", websiteController.getWebsiteById);
router.post("/", isAdmin, websiteController.createWebsite);
router.put("/:id", isAdmin, websiteController.updateWebsite);
router.delete("/:id", isAdmin, websiteController.deleteWebsite);

module.exports = router;
