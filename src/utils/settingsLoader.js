class SettingsLoader {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.lastCacheUpdate = 0;
    this.databaseReady = false;
    this.initializationAttempted = false;
  }

  async getSetting(key, fallbackValue = null) {
    try {
      // First try to get from cache
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      // If database is ready and cache needs refresh, try to refresh
      if (this.databaseReady && Date.now() - this.lastCacheUpdate > this.cacheTimeout) {
        await this.refreshCache();
        if (this.cache.has(key)) {
          return this.cache.get(key);
        }
      }

      // Always fallback to environment variable
      return process.env[key] || fallbackValue;
    } catch (error) {
      console.warn(`Failed to load setting ${key} from database, using fallback:`, error.message);
      return process.env[key] || fallbackValue;
    }
  }

  async initializeDatabase() {
    if (this.initializationAttempted) return this.databaseReady;
    
    this.initializationAttempted = true;
    
    try {
      // Wait for the database connection to be established
      const db = require("../config/database");
      await db;  // Wait for the connection promise to resolve
      
      // Add a small delay to ensure the connection is stable
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Now test if database is available by trying to get a single setting
      const settingsService = require("../services/settingsService");
      await settingsService.getSetting("test");
      
      this.databaseReady = true;
      console.log("Settings loader: Database connection verified");
      
      // Now we can safely refresh the cache
      await this.refreshCache();
      
      return true;
    } catch (error) {
      console.warn("Settings loader: Database not ready, using environment fallbacks");
      this.databaseReady = false;
      return false;
    }
  }

  async refreshCache() {
    if (!this.databaseReady) {
      return;
    }

    try {
      const settingsService = require("../services/settingsService");
      console.log("Refreshing settings cache...");
      const settings = await settingsService.getAllSettings();
      
      // Clear existing cache
      this.cache.clear();
      
      // Populate cache with database settings
      settings.forEach(setting => {
        this.cache.set(setting.setting_key, setting.setting_value);
      });
      
      this.lastCacheUpdate = Date.now();
      console.log(`Loaded ${settings.length} settings into cache`);
    } catch (error) {
      console.error("Failed to refresh settings cache:", error);
      this.databaseReady = false; // Mark as not ready to retry initialization
      this.initializationAttempted = false;
      // Don't update lastCacheUpdate so we'll try again next time
    }
  }

  // Method to get multiple settings at once
  async getSettings(keys) {
    const result = {};
    for (const key of keys) {
      result[key] = await this.getSetting(key);
    }
    return result;
  }

  // Method to force cache refresh
  async forceRefresh() {
    this.lastCacheUpdate = 0;
    await this.refreshCache();
  }

  // Synchronous method for cases where we need immediate access
  // (uses cached values only, falls back to process.env)
  getSettingSync(key, fallbackValue = null) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    return process.env[key] || fallbackValue;
  }
}

// Create a singleton instance
const settingsLoader = new SettingsLoader();

// Helper functions for common settings
const getDbConfig = async () => {
  // Don't try to load DB config from database (circular dependency)
  return {
    server: process.env.DB_SERVER || "localhost",
    database: process.env.DB_DATABASE || "",
    user: process.env.DB_USER || "",
    password: process.env.DB_PASSWORD || "",
    options: {
      encrypt: (process.env.DB_ENCRYPT || "false") === "true",
      trustServerCertificate: (process.env.DB_TRUST_SERVER_CERTIFICATE || "true") === "true"
    }
  };
};

const getAzureConfig = async () => {
  // Try to initialize database first
  await settingsLoader.initializeDatabase();
  
  return {
    clientId: await settingsLoader.getSetting("AZURE_CLIENT_ID"),
    clientSecret: await settingsLoader.getSetting("AZURE_CLIENT_SECRET"),
    tenantId: await settingsLoader.getSetting("AZURE_TENANT_ID"),
    storageConnectionString: await settingsLoader.getSetting("AZURE_STORAGE_CONNECTION_STRING"),
    storageContainerName: await settingsLoader.getSetting("AZURE_STORAGE_CONTAINER_NAME"),
    storagePublicUrl: await settingsLoader.getSetting("AZURE_STORAGE_PUBLIC_URL")
  };
};

const getEmailConfig = async () => {
  // Try to initialize database first
  await settingsLoader.initializeDatabase();
  
  return {
    sendgridApiKey: await settingsLoader.getSetting("SENDGRID_API_KEY"),
    fromAddress: await settingsLoader.getSetting("SENDGRID_FROM_ADDRESS")
  };
};

const getApiKeys = async () => {
  // Try to initialize database first
  await settingsLoader.initializeDatabase();
  
  return {
    openrouterApiKey: await settingsLoader.getSetting("OPENROUTER_API_KEY"),
    openaiApiKey: await settingsLoader.getSetting("OPENAI_API_KEY"),
    runpodApiKey: await settingsLoader.getSetting("RUNPOD_API_KEY"),
    githubToken: await settingsLoader.getSetting("GITHUB_TOKEN")
  };
};

module.exports = {
  settingsLoader,
  getDbConfig,
  getAzureConfig,
  getEmailConfig,
  getApiKeys
};