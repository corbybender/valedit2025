const db = require("../config/database");
const sql = require("mssql");

const crypto = require("crypto");

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "default-32-character-key-change-me!";
const IV_LENGTH = 16;

// Warn if using default encryption key
if (ENCRYPTION_KEY === "default-32-character-key-change-me!") {
  console.warn("⚠️  WARNING: Using default encryption key. Please set ENCRYPTION_KEY in your .env file for security.");
}

const encrypt = (text) => {
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let encrypted = cipher.update(text, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  } catch (error) {
    console.error("Encryption error:", error);
    // Return the original text if encryption fails (fallback)
    return text;
  }
};

const decrypt = (text) => {
  try {
    // If the text doesn't contain ":", it's probably not encrypted
    if (!text.includes(":")) {
      return text;
    }
    
    const textParts = text.split(":");
    if (textParts.length !== 2) {
      return text; // Not in expected format, return as-is
    }
    
    const iv = Buffer.from(textParts[0], "hex");
    const encryptedText = textParts[1];
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.warn("Decryption error for text, returning as-is:", error.message);
    // Return the original text if decryption fails (fallback)
    return text;
  }
};

const normalizeBool = (v) => {
    if (v === undefined || v === null) return false;
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v !== 0;
    if (typeof v === "string") {
        const s = v.toLowerCase().trim();
        if (["1", "true", "on", "yes", "y"].includes(s)) return true;
        if (["0", "false", "off", "no", "n"].includes(s)) return false;
    }
    return false;
};

const getSetting = async (setting_key) => {
  try {
    const pool = await db;
    const result = await pool
      .request()
      .input("setting_key", sql.VarChar, setting_key)
      .query(
        "SELECT * FROM settings WHERE setting_key = @setting_key"
      );

    if (result.recordset.length === 0) {
      return null;
    }

    const setting = result.recordset[0];
    if (setting.is_encrypted) {
      setting.setting_value = decrypt(setting.setting_value);
    }
    return setting;
  } catch (error) {
    console.error("Error fetching setting:", error);
    throw error;
  }
};

const getAllSettings = async () => {
  try {
    const pool = await db;
    const result = await pool.request().query("SELECT * FROM settings");
    return result.recordset.map((setting) => {
      if (setting.is_encrypted) {
        setting.setting_value = decrypt(setting.setting_value);
      }
      return setting;
    });
  } catch (error) {
    console.error("Error fetching all settings:", error);
    throw error;
  }
};

const createSetting = async (setting) => {
  try {
    const { setting_key, setting_value, description } = setting;
    const is_encrypted = normalizeBool(setting.is_encrypted);
    let valueToStore = setting_value;
    if (is_encrypted) {
      valueToStore = encrypt(setting_value);
    }

    const pool = await db;
    const result = await pool
      .request()
      .input("setting_key", sql.VarChar, setting_key)
      .input("setting_value", sql.Text, valueToStore)
      .input("description", sql.Text, description)
      .input("is_encrypted", sql.Bit, is_encrypted)
      .query(
        "INSERT INTO settings (setting_key, setting_value, description, is_encrypted) OUTPUT INSERTED.id VALUES (@setting_key, @setting_value, @description, @is_encrypted)"
      );
    return result.recordset[0];
  } catch (error) {
    console.error("Error creating setting:", error);
    throw error;
  }
};

const updateSetting = async (setting_key, updates) => {
  try {
    const pool = await db;
    const setting = await getSetting(setting_key);

    if (!setting) {
      throw new Error("Setting not found");
    }

    // Handle both old format (just value) and new format (object with multiple fields)
    let setting_value, description, is_encrypted;
    
    if (typeof updates === 'string') {
      // Old format: just the value
      setting_value = updates;
      description = setting.description; // Keep existing
      is_encrypted = setting.is_encrypted; // Keep existing
    } else {
      // New format: object with multiple fields
      setting_value = updates.setting_value !== undefined ? updates.setting_value : setting.setting_value;
      description = updates.description !== undefined ? updates.description : setting.description;
      is_encrypted = updates.is_encrypted !== undefined ? normalizeBool(updates.is_encrypted) : setting.is_encrypted;
    }

    let valueToStore = setting_value;
    if (is_encrypted) {
      valueToStore = encrypt(setting_value);
    }

    const result = await pool
      .request()
      .input("setting_key", sql.VarChar, setting_key)
      .input("setting_value", sql.Text, valueToStore)
      .input("description", sql.Text, description)
      .input("is_encrypted", sql.Bit, is_encrypted)
      .query(
        "UPDATE settings SET setting_value = @setting_value, description = @description, is_encrypted = @is_encrypted, updated_at = GETDATE() WHERE setting_key = @setting_key"
      );
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error updating setting:", error);
    throw error;
  }
};

const deleteSetting = async (setting_key) => {
  try {
    const pool = await db;
    const result = await pool
      .request()
      .input("setting_key", sql.VarChar, setting_key)
      .query("DELETE FROM settings WHERE setting_key = @setting_key");
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error deleting setting:", error);
    throw error;
  }
};

module.exports = {
  getSetting,
  getAllSettings,
  createSetting,
  updateSetting,
  deleteSetting,
};