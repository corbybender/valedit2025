const express = require("express");
const router = express.Router();

// Import the existing websites route logic
const existingWebsitesRouterFn = require("../../../legacy/routes_old/websites");
const db = require("../../config/database");

// Create the router with the database dependency
const existingWebsitesRouter = existingWebsitesRouterFn(db);

// Use the existing router for now - this preserves all functionality
router.use("/", existingWebsitesRouter);

module.exports = router;
