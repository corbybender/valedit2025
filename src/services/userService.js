const db = require("../config/database");
const sql = require("mssql");

const getAllUsers = async () => {
  try {
    const pool = await db;
    const result = await pool.request().query(`
      SELECT 
        a.AuthorID,
        a.AuthorLogin,
        a.AuthorName,
        a.AuthorEmail,
        a.IsAdmin,
        a.AuthorCategory,
        a.AuthorType,
        a.IsActive,
        a.DateCreated,
        a.LastLoginDate,
        a.CurrentWorkingSite,
        STRING_AGG(w.Domain, ', ') as AccessibleWebsites,
        STRING_AGG(CAST(w.WebsiteID as VARCHAR), ',') as AccessibleWebsiteIDs
      FROM Authors a
      LEFT JOIN AuthorWebsiteAccess awa ON a.AuthorID = awa.AuthorID
      LEFT JOIN Websites w ON awa.WebsiteID = w.WebsiteID
      GROUP BY a.AuthorID, a.AuthorLogin, a.AuthorName, a.AuthorEmail, 
               a.IsAdmin, a.AuthorCategory, a.AuthorType, a.IsActive, 
               a.DateCreated, a.LastLoginDate, a.CurrentWorkingSite
      ORDER BY a.AuthorName
    `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching users:", error);
    throw error;
  }
};

const getUserById = async (userId) => {
  try {
    const pool = await db;
    const result = await pool.request().input("id", sql.Int, parseInt(userId))
      .query(`
        SELECT 
          a.AuthorID,
          a.AuthorLogin,
          a.AuthorName,
          a.AuthorEmail,
          a.IsAdmin,
          a.AuthorCategory,
          a.AuthorType,
          a.IsActive,
          a.DateCreated,
          a.LastLoginDate,
          a.CurrentWorkingSite,
          STRING_AGG(w.Domain, ', ') as AccessibleWebsites,
          STRING_AGG(CAST(w.WebsiteID as VARCHAR), ',') as AccessibleWebsiteIDs
        FROM Authors a
        LEFT JOIN AuthorWebsiteAccess awa ON a.AuthorID = awa.AuthorID
        LEFT JOIN Websites w ON awa.WebsiteID = w.WebsiteID
        WHERE a.AuthorID = @id
        GROUP BY a.AuthorID, a.AuthorLogin, a.AuthorName, a.AuthorEmail, 
                 a.IsAdmin, a.AuthorCategory, a.AuthorType, a.IsActive, 
                 a.DateCreated, a.LastLoginDate, a.CurrentWorkingSite
      `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    throw error;
  }
};

const createUser = async (userData) => {
  try {
    const {
      authorLogin,
      authorName,
      authorEmail,
      authorPassword,
      isAdmin = false,
      authorCategory = "User",
      authorType = "Local",
      isActive = true,
    } = userData;

    const pool = await db;
    const result = await pool
      .request()
      .input("authorLogin", sql.NVarChar, authorLogin)
      .input("authorName", sql.NVarChar, authorName)
      .input("authorEmail", sql.NVarChar, authorEmail)
      .input("authorPassword", sql.NVarChar, authorPassword)
      .input("isAdmin", sql.Bit, isAdmin)
      .input("authorCategory", sql.NVarChar, authorCategory)
      .input("authorType", sql.NVarChar, authorType)
      .input("isActive", sql.Bit, isActive).query(`
        INSERT INTO Authors (
          AuthorLogin, AuthorName, AuthorEmail, AuthorPassword, 
          IsAdmin, AuthorCategory, AuthorType, IsActive, DateCreated
        )
        OUTPUT INSERTED.AuthorID
        VALUES (
          @authorLogin, @authorName, @authorEmail, @authorPassword,
          @isAdmin, @authorCategory, @authorType, @isActive, GETDATE()
        )
      `);
    return result.recordset[0];
  } catch (error) {
    console.error("Error creating user:", error);
    throw error;
  }
};

const updateUser = async (userId, userData) => {
  try {
    const {
      authorLogin,
      authorName,
      authorEmail,
      isAdmin,
      authorCategory,
      authorType,
      isActive,
    } = userData;

    // First get current user data to preserve required fields
    const currentUser = await getUserById(userId);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Ensure we have valid values for required fields
    const safeAuthorLogin = authorLogin || currentUser.AuthorLogin;
    const safeAuthorName = authorName || currentUser.AuthorName;
    const safeAuthorEmail = authorEmail || currentUser.AuthorEmail;

    // Debug logging
    console.log("UPDATE USER SERVICE DEBUG:");
    console.log("User ID:", userId);
    console.log("Request data:", userData);
    console.log("Current user from DB:", currentUser);
    console.log("Safe values:", {
      safeAuthorLogin,
      safeAuthorName,
      safeAuthorEmail,
    });

    if (!safeAuthorLogin || !safeAuthorName || !safeAuthorEmail) {
      console.log("ERROR: Required fields are missing or null");
      throw new Error(
        "AuthorLogin, AuthorName, and AuthorEmail are required and cannot be null"
      );
    }

    const pool = await db;

    // Normalize boolean values from payload (support both camelCase and PascalCase, and string/number inputs)
    const normalizeBool = (v) => {
      if (v === undefined || v === null) return undefined;
      if (typeof v === "boolean") return v;
      if (typeof v === "number") return v !== 0;
      if (typeof v === "string") {
        const s = v.toLowerCase().trim();
        if (["1", "true", "on", "yes", "y"].includes(s)) return true;
        if (["0", "false", "off", "no", "n"].includes(s)) return false;
      }
      return undefined;
    };

    const hasIsActive =
      Object.prototype.hasOwnProperty.call(userData, "isActive") ||
      Object.prototype.hasOwnProperty.call(userData, "IsActive");
    const incomingIsActive = Object.prototype.hasOwnProperty.call(
      userData,
      "isActive"
    )
      ? userData.isActive
      : userData.IsActive;
    const normIsActive = hasIsActive
      ? normalizeBool(incomingIsActive)
      : undefined;
    const finalIsActive =
      normIsActive !== undefined ? normIsActive : currentUser.IsActive;

    const hasIsAdmin =
      Object.prototype.hasOwnProperty.call(userData, "isAdmin") ||
      Object.prototype.hasOwnProperty.call(userData, "IsAdmin");
    const incomingIsAdmin = Object.prototype.hasOwnProperty.call(
      userData,
      "isAdmin"
    )
      ? userData.isAdmin
      : userData.IsAdmin;
    const normIsAdmin = hasIsAdmin ? normalizeBool(incomingIsAdmin) : undefined;
    const finalIsAdmin =
      normIsAdmin !== undefined ? normIsAdmin : currentUser.IsAdmin;

    console.log(
      "Final booleans -> IsActive:",
      finalIsActive,
      "IsAdmin:",
      finalIsAdmin
    );

    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("authorLogin", sql.NVarChar, safeAuthorLogin)
      .input("authorName", sql.NVarChar, safeAuthorName)
      .input("authorEmail", sql.NVarChar, safeAuthorEmail)
      .input("isAdmin", sql.Bit, finalIsAdmin)
      .input(
        "authorCategory",
        sql.NVarChar,
        authorCategory || currentUser.AuthorCategory || ""
      )
      .input(
        "authorType",
        sql.NVarChar,
        authorType || currentUser.AuthorType || ""
      )
      .input("isActive", sql.Bit, finalIsActive).query(`
        UPDATE Authors
        SET AuthorLogin = @authorLogin,
            AuthorName = @authorName,
            AuthorEmail = @authorEmail,
            IsAdmin = @isAdmin,
            AuthorCategory = @authorCategory,
            AuthorType = @authorType,
            IsActive = @isActive
        WHERE AuthorID = @userId
      `);

    console.log("UPDATE result:", result);
    console.log("Rows affected:", result.rowsAffected[0]);

    const updateSuccess = result.rowsAffected[0] > 0;
    console.log("Update successful:", updateSuccess);

    // Verify the update by fetching the user again
    const updatedUser = await getUserById(userId);
    console.log("User after update:", updatedUser);

    return updateSuccess;
  } catch (error) {
    console.error("Error updating user:", error);
    throw error;
  }
};

const deleteUser = async (userId) => {
  try {
    const pool = await db;
    const result = await pool.request().input("userId", sql.Int, userId).query(`
        DELETE FROM Authors
        WHERE AuthorID = @userId
      `);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error deleting user:", error);
    throw error;
  }
};

const getUserByLogin = async (login) => {
  try {
    const pool = await db;
    const result = await pool.request().input("login", sql.NVarChar, login)
      .query(`
        SELECT AuthorID, AuthorLogin, AuthorName, AuthorEmail, AuthorPassword, IsAdmin
        FROM Authors
        WHERE AuthorLogin = @login AND IsActive = 1
      `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching user by login:", error);
    throw error;
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByLogin,
};
