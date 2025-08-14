const express = require("express");
const router = express.Router();

// Import the existing contentBlocks route logic
const existingContentBlocksRouter = require("../../../legacy/routes_old/contentBlocks");

// Use the existing router for now - this preserves all functionality
router.use("/", existingContentBlocksRouter);

module.exports = router;
