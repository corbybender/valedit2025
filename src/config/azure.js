const msal = require("@azure/msal-node");
require("dotenv").config();

const isAzureConfigured =
  process.env.AZURE_CLIENT_ID &&
  process.env.AZURE_CLIENT_SECRET &&
  process.env.AZURE_TENANT_ID;

let confidentialClientApplication = null;

if (isAzureConfigured) {
  const config = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
  };
  confidentialClientApplication = new msal.ConfidentialClientApplication(
    config
  );
  logger.info("✅ Azure AD authentication configured.");
} else {
  console.warn(
    "⚠️ Azure AD not configured. Only local authentication will be available."
  );
}

module.exports = {
  isAzureConfigured,
  confidentialClientApplication,
};
