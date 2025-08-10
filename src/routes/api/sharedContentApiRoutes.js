const express = require("express");
const router = express.Router();

// Import the existing sharedContent route logic
const existingSharedContentRouter = require("../../../routes/sharedContent");

// Use the existing router for now - this preserves all functionality
router.use("/", existingSharedContentRouter);

module.exports = router;
