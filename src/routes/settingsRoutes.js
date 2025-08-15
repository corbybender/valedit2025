const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { isAdmin } = require("../middleware/authentication");

// All routes in this file are protected and require admin privileges.
router.use(isAdmin);

router.get("/", settingsController.getAllSettings);
router.get("/:key", settingsController.getSetting);
router.post("/", settingsController.createSetting);
router.put("/:key", settingsController.updateSetting);
router.delete("/:key", settingsController.deleteSetting);

module.exports = router;
