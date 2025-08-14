const express = require("express");
const router = express.Router();

// Import the existing notifications route logic
const existingNotificationsRouter = require("../../../legacy/routes_old/notifications");

// Use the existing router for now - this preserves all functionality
router.use("/", existingNotificationsRouter);

module.exports = router;
