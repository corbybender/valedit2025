const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Login page
router.get("/login", authController.showLoginPage);

// Local authentication
router.post("/login", authController.handleLocalLogin);

// Azure authentication
router.get("/azure", authController.initiateAzureLogin);
router.get("/login-redirect", authController.initiateAzureLogin); // Legacy compatibility
router.get("/azure/callback", authController.handleAzureCallback);
router.get("/callback", authController.handleAzureCallback); // Legacy callback compatibility

// Logout
router.post("/logout", authController.handleLogout);
router.get("/logout", authController.handleLogout);

module.exports = router;
