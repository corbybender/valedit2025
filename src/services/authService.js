const {
  confidentialClientApplication,
  isAzureConfigured,
} = require("../config/azure");
const userService = require("./userService");
const sql = require("mssql");
const db = require("../../db");

const getBaseURL = (req) => {
  return `${req.protocol}://${req.get("host")}`;
};

const authenticateLocal = async (username, password) => {
  try {
    const user = await userService.getUserByLogin(username);
    if (!user) {
      return { success: false, message: "Invalid username or password" };
    }

    // Simple password comparison (in production, use proper hashing)
    if (user.AuthorPassword !== password) {
      return { success: false, message: "Invalid username or password" };
    }

    // Update last login date
    const pool = await db;
    await pool
      .request()
      .input("authorId", sql.Int, user.AuthorID)
      .query(
        "UPDATE Authors SET LastLoginDate = GETDATE() WHERE AuthorID = @authorId"
      );

    return {
      success: true,
      user: {
        authorID: user.AuthorID,
        username: user.AuthorLogin,
        name: user.AuthorName,
        email: user.AuthorEmail,
        isAdmin: user.IsAdmin,
        loginMethod: "local",
      },
    };
  } catch (error) {
    console.error("Local authentication error:", error);
    return { success: false, message: "Authentication failed" };
  }
};

const getAzureAuthUrl = (req) => {
  if (!isAzureConfigured || !confidentialClientApplication) {
    throw new Error("Azure AD not configured");
  }

  const authCodeUrlParameters = {
    scopes: ["user.read"],
    redirectUri: `${getBaseURL(req)}/auth/callback`,
  };

  return confidentialClientApplication.getAuthCodeUrl(authCodeUrlParameters);
};

const handleAzureCallback = async (req) => {
  if (!isAzureConfigured || !confidentialClientApplication) {
    throw new Error("Azure AD not configured");
  }

  const tokenRequest = {
    code: req.query.code,
    scopes: ["user.read"],
    redirectUri: `${getBaseURL(req)}/auth/callback`,
  };

  try {
    const response = await confidentialClientApplication.acquireTokenByCode(
      tokenRequest
    );
    const userInfo = response.account;

    // Check if user exists in database
    let user = await userService.getUserByLogin(userInfo.username);

    if (!user) {
      // Create new user for Azure login
      const newUser = await userService.createUser({
        authorLogin: userInfo.username,
        authorName: userInfo.name || userInfo.username,
        authorEmail: userInfo.username,
        authorPassword: "", // No password for Azure users
        isAdmin: true, // Azure users are admin by default
        authorCategory: "Azure",
        authorType: "Azure",
        isActive: true,
      });
      user = await userService.getUserById(newUser.AuthorID);
    } else {
      // Update last login date
      const pool = await db;
      await pool
        .request()
        .input("authorId", sql.Int, user.AuthorID)
        .query(
          "UPDATE Authors SET LastLoginDate = GETDATE() WHERE AuthorID = @authorId"
        );
    }

    return {
      success: true,
      user: {
        authorID: user.AuthorID,
        username: user.AuthorLogin,
        name: user.AuthorName,
        email: user.AuthorEmail,
        isAdmin: user.IsAdmin,
        loginMethod: "azure",
      },
    };
  } catch (error) {
    console.error("Azure authentication error:", error);
    throw error;
  }
};

module.exports = {
  authenticateLocal,
  getAzureAuthUrl,
  handleAzureCallback,
  isAzureConfigured,
};
