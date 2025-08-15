const settingsService = require("../services/settingsService");
const db = require("../config/database");
require("dotenv").config();

const envSettings = [
  {
    setting_key: "DB_SERVER",
    setting_value: process.env.DB_SERVER || "localhost",
    description: "Database server hostname or IP address",
    is_encrypted: false
  },
  {
    setting_key: "DB_DATABASE",
    setting_value: process.env.DB_DATABASE || "",
    description: "Database name",
    is_encrypted: false
  },
  {
    setting_key: "DB_USER",
    setting_value: process.env.DB_USER || "",
    description: "Database username",
    is_encrypted: false
  },
  {
    setting_key: "DB_PASSWORD",
    setting_value: process.env.DB_PASSWORD || "",
    description: "Database password",
    is_encrypted: true
  },
  {
    setting_key: "OPENROUTER_API_KEY",
    setting_value: process.env.OPENROUTER_API_KEY || "",
    description: "OpenRouter API key for AI services",
    is_encrypted: true
  },
  {
    setting_key: "OPENAI_API_KEY",
    setting_value: process.env.OPENAI_API_KEY || "",
    description: "OpenAI API key",
    is_encrypted: true
  },
  {
    setting_key: "AZURE_CLIENT_ID",
    setting_value: process.env.AZURE_CLIENT_ID || "",
    description: "Azure application client ID",
    is_encrypted: false
  },
  {
    setting_key: "AZURE_CLIENT_SECRET",
    setting_value: process.env.AZURE_CLIENT_SECRET || "",
    description: "Azure application client secret",
    is_encrypted: true
  },
  {
    setting_key: "AZURE_TENANT_ID",
    setting_value: process.env.AZURE_TENANT_ID || "",
    description: "Azure tenant ID",
    is_encrypted: false
  },
  {
    setting_key: "AZURE_STORAGE_CONNECTION_STRING",
    setting_value: process.env.AZURE_STORAGE_CONNECTION_STRING || "",
    description: "Azure storage account connection string",
    is_encrypted: true
  },
  {
    setting_key: "AZURE_STORAGE_CONTAINER_NAME",
    setting_value: process.env.AZURE_STORAGE_CONTAINER_NAME || "",
    description: "Azure blob storage container name",
    is_encrypted: false
  },
  {
    setting_key: "AZURE_STORAGE_PUBLIC_URL",
    setting_value: process.env.AZURE_STORAGE_PUBLIC_URL || "",
    description: "Public URL for Azure storage assets",
    is_encrypted: false
  },
  {
    setting_key: "SESSION_SECRET",
    setting_value: process.env.SESSION_SECRET || "",
    description: "Secret key for session encryption",
    is_encrypted: true
  },
  {
    setting_key: "BASE_URL",
    setting_value: process.env.BASE_URL || "http://localhost:3000",
    description: "Base URL for the application",
    is_encrypted: false
  },
  {
    setting_key: "SENDGRID_API_KEY",
    setting_value: process.env.SENDGRID_API_KEY || "",
    description: "SendGrid API key for email services",
    is_encrypted: true
  },
  {
    setting_key: "SENDGRID_FROM_ADDRESS",
    setting_value: process.env.SENDGRID_FROM_ADDRESS || "",
    description: "Default sender email address",
    is_encrypted: false
  },
  {
    setting_key: "RUNPOD_API_KEY",
    setting_value: process.env.RUNPOD_API_KEY || "",
    description: "RunPod API key for GPU services",
    is_encrypted: true
  },
  {
    setting_key: "GITHUB_TOKEN",
    setting_value: process.env.github || "",
    description: "GitHub personal access token",
    is_encrypted: true
  }
];

async function seedSettings() {
  console.log("Starting settings migration from .env file...");
  
  try {
    await db;
    console.log("Database connected successfully");
    
    for (const setting of envSettings) {
      try {
        const existingSetting = await settingsService.getSetting(setting.setting_key);
        
        if (existingSetting) {
          console.log(`Setting ${setting.setting_key} already exists, skipping...`);
          continue;
        }
        
        if (setting.setting_value) {
          await settingsService.createSetting(setting);
          console.log(`✓ Created setting: ${setting.setting_key}`);
        } else {
          console.log(`⚠ Skipped empty setting: ${setting.setting_key}`);
        }
      } catch (error) {
        console.error(`✗ Error creating setting ${setting.setting_key}:`, error.message);
      }
    }
    
    console.log("Settings migration completed!");
  } catch (error) {
    console.error("Database connection failed:", error);
    throw error;
  }
}

if (require.main === module) {
  seedSettings()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}

module.exports = seedSettings;