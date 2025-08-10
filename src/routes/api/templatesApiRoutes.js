const express = require("express");
const router = express.Router();

// Import the existing templates route logic
const existingTemplatesRouter = require("../../../routes/templates");

// Use the existing router for now - this preserves all functionality
router.use("/", existingTemplatesRouter);

module.exports = router;
