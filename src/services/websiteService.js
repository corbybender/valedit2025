const db = require("../config/database");
const sql = require("mssql");

const getAllWebsites = async () => {
  try {
    const pool = await db;
    const result = await pool.request().query(`
      SELECT WebsiteID, Domain, IsActive
      FROM Websites
      ORDER BY Domain
    `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching all websites:", error);
    throw error;
  }
};

const getWebsiteById = async (websiteId) => {
  try {
    const pool = await db;
    const result = await pool.request().input("websiteId", sql.Int, websiteId)
      .query(`
        SELECT WebsiteID, Domain, IsActive
        FROM Websites
        WHERE WebsiteID = @websiteId
      `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching website by ID:", error);
    throw error;
  }
};

const createWebsite = async (websiteData) => {
  try {
    const { domain, isActive = true } = websiteData;
    const pool = await db;
    const result = await pool
      .request()
      .input("domain", sql.NVarChar, domain)
      .input("isActive", sql.Bit, isActive).query(`
        INSERT INTO Websites (Domain, IsActive)
        OUTPUT INSERTED.WebsiteID
        VALUES (@domain, @isActive)
      `);
    return result.recordset[0];
  } catch (error) {
    console.error("Error creating website:", error);
    throw error;
  }
};

const updateWebsite = async (websiteId, websiteData) => {
  try {
    const { domain, isActive } = websiteData;
    const pool = await db;
    const result = await pool
      .request()
      .input("websiteId", sql.Int, websiteId)
      .input("domain", sql.NVarChar, domain)
      .input("isActive", sql.Bit, isActive).query(`
        UPDATE Websites
        SET Domain = @domain, IsActive = @isActive
        WHERE WebsiteID = @websiteId
      `);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error updating website:", error);
    throw error;
  }
};

const deleteWebsite = async (websiteId) => {
  try {
    const pool = await db;
    const result = await pool.request().input("websiteId", sql.Int, websiteId)
      .query(`
        DELETE FROM Websites
        WHERE WebsiteID = @websiteId
      `);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error deleting website:", error);
    throw error;
  }
};

module.exports = {
  getAllWebsites,
  getWebsiteById,
  createWebsite,
  updateWebsite,
  deleteWebsite,
};
