const msal = require("@azure/msal-node");
const logger = require("../utils/logger");
const { getAzureConfig } = require("../utils/settingsLoader");
require("dotenv").config();

let confidentialClientApplication = null;
let azureConfigPromise = null;

const initializeAzure = async () => {
  try {
    const azureConfig = await getAzureConfig();
    
    const isAzureConfigured = 
      azureConfig.clientId && 
      azureConfig.clientSecret && 
      azureConfig.tenantId;

    if (isAzureConfigured) {
      const config = {
        auth: {
          clientId: azureConfig.clientId,
          authority: `https://login.microsoftonline.com/${azureConfig.tenantId}`,
          clientSecret: azureConfig.clientSecret,
        },
      };
      confidentialClientApplication = new msal.ConfidentialClientApplication(config);
      logger.info("✅ Azure AD authentication configured from database settings.");
      return true;
    } else {
      console.warn("⚠️ Azure AD not configured. Only local authentication will be available.");
      return false;
    }
  } catch (error) {
    console.error("Error initializing Azure configuration:", error);
    return false;
  }
};

// Initialize Azure config when explicitly called
const getOrCreateInitPromise = () => {
  if (!azureConfigPromise) {
    azureConfigPromise = initializeAzure();
  }
  return azureConfigPromise;
};

module.exports = {
  get isAzureConfigured() {
    return !!confidentialClientApplication;
  },
  get confidentialClientApplication() {
    return confidentialClientApplication;
  },
  initializeAzure,
  get azureConfigPromise() {
    return getOrCreateInitPromise();
  }
};
