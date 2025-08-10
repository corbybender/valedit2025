// auth.js - Authentication routes for your CMS
const express = require("express");
const msal = require("@azure/msal-node");
const router = express.Router();
const sql = require("mssql"); // Required for data types like sql.NVarChar
const db = require("../db"); // Use the shared database pool from db.js
const logger = require("../debug-logger.js");

// Load environment variables
require("dotenv").config();

// Azure AD Configuration
const isAzureConfigured =
  process.env.AZURE_CLIENT_ID &&
  process.env.AZURE_CLIENT_SECRET &&
  process.env.AZURE_TENANT_ID;
let cca = null;

if (isAzureConfigured) {
  const config = {
    auth: {
      clientId: process.env.AZURE_CLIENT_ID,
      authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
      clientSecret: process.env.AZURE_CLIENT_SECRET,
    },
  };
  cca = new msal.ConfidentialClientApplication(config);
  logger.info("✅ Azure AD authentication configured.");
} else {
  logger.warn(
    "Azure AD not configured. Only local authentication will be available."
  );
}

// Helper function to get the base URL
const getBaseURL = (req) => {
  return `${req.protocol}://${req.get("host")}`;
};

// ===================================================================
// AUTHENTICATION MIDDLEWARE
// ===================================================================
const isAuthenticated = (req, res, next) => {
  logger.info("🔐 Auth Check:", {
    hasSession: !!req.session,
    hasUserInfo: !!req.session?.userInfo,
    authorID: req.session?.authorID,
    sessionID: req.sessionID,
    path: req.path,
    method: req.method,
    userAgent: req.get("User-Agent")?.substring(0, 50),
  });

  if (req.session?.userInfo) {
    // Touch the session to extend its life
    req.session.touch();
    logger.info("✅ User authenticated, session extended for path:", req.path);
    return next();
  }

  logger.info("❌ User not authenticated, path:", req.path);

  // For API routes, return JSON error instead of redirect
  if (req.path.startsWith("/api/")) {
    logger.info("🚫 API route - returning 401 JSON response");
    return res.status(401).json({ error: "User not authenticated" });
  }

  logger.info("🔄 Non-API route - redirecting to login");
  res.redirect("/auth/login");
};

const redirectIfAuthenticated = (req, res, next) => {
  if (req.session.userInfo) {
    return res.redirect("/dashboard");
  }
  next();
};

// ===================================================================
// ROUTES
// ===================================================================

// GET /auth/login - Display login page
router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("pages/login", {
    title: "Login",
    error: req.query.error,
    success: req.query.success,
    azureEnabled: isAzureConfigured,
  });
});

// GET /login-redirect - Azure AD login redirect
router.get("/login-redirect", (req, res) => {
  logger.info("🔄 Azure login redirect initiated");

  if (!isAzureConfigured) {
    logger.error("❌ Azure AD not configured");
    return res.redirect(
      "/auth/login?error=" + encodeURIComponent("Azure AD is not configured.")
    );
  }

  const baseURL = getBaseURL(req);
  logger.info("🔍 Base URL:", baseURL);

  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: `${baseURL}/auth/callback`,
  };

  logger.info("🔍 Auth parameters:", authCodeUrlParameters);

  cca
    .getAuthCodeUrl(authCodeUrlParameters)
    .then((response) => {
      logger.info("✅ Azure auth URL generated");
      res.redirect(response);
    })
    .catch((error) => {
      logger.error("Error getting Azure AD Auth Code URL", { error: error });
      res.redirect(
        "/auth/login?error=" +
          encodeURIComponent("Authentication service unavailable.")
      );
    });
});

// GET /auth/callback - Azure AD callback handler
router.get("/callback", async (req, res) => {
  logger.info("🔄 Azure callback received");
  logger.info("🔍 Query parameters:", req.query);

  if (!req.query.code) {
    logger.error("❌ No authorization code received");
    return res.redirect(
      "/auth/login?error=" +
        encodeURIComponent("Authentication failed: No code received.")
    );
  }
  const tokenRequest = {
    code: req.query.code,
    scopes: ["user.read"],
    redirectUri: `${getBaseURL(req)}/auth/callback`,
  };

  try {
    const response = await cca.acquireTokenByCode(tokenRequest);
    const userPrincipalName = response.account.username;
    const userFullName = response.account.name;

    // 1. FIND THE AUTHOR (using the shared 'db' pool)
    let authorResult = await db
      .request()
      .input("AuthorLogin", sql.NVarChar, userPrincipalName)
      .query(`SELECT * FROM Authors WHERE AuthorLogin = @AuthorLogin`);
    let author = authorResult.recordset[0];

    // 2. CREATE/UPDATE AUTHOR (using the shared 'db' pool)
    if (!author) {
      const nameParts = userFullName.split(", ");
      const formattedName =
        nameParts.length > 1 ? `${nameParts[1]} ${nameParts[0]}` : userFullName;
      const insertResult = await db
        .request()
        .input("AuthorLogin", sql.NVarChar, userPrincipalName)
        .input("AuthorPassword", sql.NVarChar, "N/A_AZURE_AD_USER")
        .input("AuthorName", sql.NVarChar, formattedName)
        .input("AuthorEmail", sql.NVarChar, userPrincipalName)
        .input("IsAdmin", sql.Bit, 0)
        .input("IsActive", sql.Bit, 1)
        .query(
          `INSERT INTO Authors (AuthorLogin, AuthorPassword, AuthorName, AuthorEmail, IsAdmin, IsActive, DateCreated, LastLoginDate) OUTPUT INSERTED.* VALUES (@AuthorLogin, @AuthorPassword, @AuthorName, @AuthorEmail, @IsAdmin, @IsActive, GETDATE(), GETDATE())`
        );
      author = insertResult.recordset[0];
    } else {
      await db
        .request()
        .input("AuthorID", sql.Int, author.AuthorID)
        .query(
          `UPDATE Authors SET LastLoginDate = GETDATE() WHERE AuthorID = @AuthorID`
        );
    }

    // 3. STORE IN SESSION
    req.session.authorID = author.AuthorID;
    req.session.userInfo = {
      authorId: author.AuthorID,
      name: author.AuthorName,
      username: author.AuthorLogin,
      isAdmin: author.IsAdmin,
      loginMethod: "azure",
      localAccountId: response.account.localAccountId,
      loginTime: new Date().toISOString(),
    };

    logger.info("🎉 Azure login successful:", {
      authorID: author.AuthorID,
      username: author.AuthorLogin,
      sessionID: req.sessionID,
      loginTime: req.session.userInfo.loginTime,
    });

    res.redirect("/dashboard");
  } catch (error) {
    logger.error("Error in Azure AD callback:", error);
    res.redirect(
      "/auth/login?error=" +
        encodeURIComponent("Authentication or Database Error.")
    );
  }
});

// GET /auth/logout - Logout handler
router.get("/logout", (req, res) => {
  const userInfo = req.session.userInfo;
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Error logging out.");
    }
    if (userInfo?.loginMethod === "azure") {
      const logoutUri = `https://login.microsoftonline.com/${
        process.env.AZURE_TENANT_ID
      }/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
        getBaseURL(req) + "/auth/logged-out"
      )}`;
      res.redirect(logoutUri);
    } else {
      res.redirect("/auth/logged-out");
    }
  });
});

// GET /auth/logged-out - Post-logout page
router.get("/logged-out", (req, res) => {
  res.render("pages/logged-out", {
    title: "Logged Out",
    message: "You have been successfully logged out.",
  });
});

// ===================================================================
// MODULE EXPORTS
// ===================================================================
module.exports = {
  router,
  isAuthenticated,
  redirectIfAuthenticated,
};
