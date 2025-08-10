const express = require("express");
const router = express.Router();

// Import the existing pages route logic
const existingPagesRouter = require("../../../routes/pages");

// Use the existing router for now - this preserves all functionality
router.use("/", existingPagesRouter);

module.exports = router;
