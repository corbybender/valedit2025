const settingsService = require("../services/settingsService");

const getAllSettings = async (req, res) => {
  try {
    const settings = await settingsService.getAllSettings();
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
};

const getSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const setting = await settingsService.getSetting(key);

    if (!setting) {
      return res.status(404).json({ error: "Setting not found" });
    }

    res.json(setting);
  } catch (error) {
    console.error("Error fetching setting:", error);
    res.status(500).json({ error: "Failed to fetch setting" });
  }
};

const createSetting = async (req, res) => {
  try {
    const settingData = req.body;
    const newSetting = await settingsService.createSetting(settingData);
    res.status(201).json(newSetting);
  } catch (error) {
    if (error.message.includes("Violation of UNIQUE KEY constraint")) {
      return res.status(409).json({ error: "A setting with this key already exists." });
    }
    console.error("Error creating setting:", error);
    res.status(500).json({ error: "Failed to create setting" });
  }
};

const updateSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const { value, setting_value, description, is_encrypted } = req.body;
    
    // Support both old format (just value) and new format (full object)
    let updates;
    if (value !== undefined) {
      // Old format: just the value
      updates = value;
    } else {
      // New format: object with multiple fields
      updates = {
        setting_value,
        description,
        is_encrypted
      };
    }
    
    const success = await settingsService.updateSetting(key, updates);

    if (success) {
      res.json({ message: "Setting updated successfully" });
    } else {
      res.status(404).json({ error: "Setting not found" });
    }
  } catch (error) {
    console.error("Error updating setting:", error);
    res.status(500).json({ error: "Failed to update setting" });
  }
};

const deleteSetting = async (req, res) => {
  try {
    const { key } = req.params;
    const success = await settingsService.deleteSetting(key);

    if (success) {
      res.json({ message: "Setting deleted successfully" });
    } else {
      res.status(404).json({ error: "Setting not found" });
    }
  } catch (error) {
    console.error("Error deleting setting:", error);
    res.status(500).json({ error: "Failed to delete setting" });
  }
};

module.exports = {
  getAllSettings,
  getSetting,
  createSetting,
  updateSetting,
  deleteSetting,
};
