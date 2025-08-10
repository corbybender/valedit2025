const db = require("../../db");
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

    const pool = await db;
    const result = await pool
      .request()
      .input("userId", sql.Int, userId)
      .input("authorLogin", sql.NVarChar, authorLogin)
      .input("authorName", sql.NVarChar, authorName)
      .input("authorEmail", sql.NVarChar, authorEmail)
      .input("isAdmin", sql.Bit, isAdmin)
      .input("authorCategory", sql.NVarChar, authorCategory)
      .input("authorType", sql.NVarChar, authorType)
      .input("isActive", sql.Bit, isActive).query(`
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
    return result.rowsAffected[0] > 0;
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
