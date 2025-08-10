const express = require("express");
const router = express.Router();

// Import the existing AzureStorage route logic
const existingAzureStorageRouter = require("../../../routes/AzureStorage");

// Use the existing router for now - this preserves all functionality
router.use("/", existingAzureStorageRouter);

module.exports = router;
