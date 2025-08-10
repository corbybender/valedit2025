const db = require("../config/database");
const sql = require("mssql");

const getAllPageTemplates = async () => {
  try {
    const result = await (await db).request().query(`
      SELECT ID, Name, Description, HtmlStructure, IsActive, DateCreated
      FROM PageTemplates
      ORDER BY Name
    `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching page templates:", error);
    throw error;
  }
};

const getPageTemplateById = async (templateId) => {
  try {
    const result = await (await db).request().input("templateId", sql.Int, templateId)
      .query(`
        SELECT ID, Name, Description, HtmlStructure, IsActive, DateCreated
        FROM PageTemplates
        WHERE ID = @templateId
      `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching page template by ID:", error);
    throw error;
  }
};

const getAllContentTemplates = async () => {
  try {
    const result = await (await db).request().query(`
      SELECT ID, Name, TemplateSet, CategoryID, HtmlStructure, IsActive, DateCreated
      FROM ContentTemplates
      ORDER BY Name
    `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching content templates:", error);
    throw error;
  }
};

const getContentTemplateById = async (templateId) => {
  try {
    const result = await (await db).request().input("templateId", sql.Int, templateId)
      .query(`
        SELECT ID, Name, TemplateSet, CategoryID, HtmlStructure, IsActive, DateCreated
        FROM ContentTemplates
        WHERE ID = @templateId
      `);
    return result.recordset[0] || null;
  } catch (error) {
    console.error("Error fetching content template by ID:", error);
    throw error;
  }
};

const getTemplateSets = async () => {
  try {
    const result = await (await db).request().query(`
      SELECT DISTINCT TemplateSet
      FROM ContentTemplates
      WHERE TemplateSet IS NOT NULL
      ORDER BY TemplateSet
    `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching template sets:", error);
    throw error;
  }
};

const getCategories = async () => {
  try {
    const result = await (await db).request().query(`
      SELECT CategoryID as ID, Name
      FROM Categories
      ORDER BY Name
    `);
    return result.recordset;
  } catch (error) {
    console.error("Error fetching categories:", error);
    throw error;
  }
};

const createPageTemplate = async (templateData) => {
  try {
    const { name, description, htmlStructure, isActive = true } = templateData;

    const result = await db
      .request()
      .input("name", sql.NVarChar, name)
      .input("description", sql.NVarChar, description)
      .input("htmlStructure", sql.NVarChar, htmlStructure)
      .input("isActive", sql.Bit, isActive).query(`
        INSERT INTO PageTemplates (Name, Description, HtmlStructure, IsActive, DateCreated)
        OUTPUT INSERTED.ID
        VALUES (@name, @description, @htmlStructure, @isActive, GETDATE())
      `);
    return result.recordset[0];
  } catch (error) {
    console.error("Error creating page template:", error);
    throw error;
  }
};

const updatePageTemplate = async (templateId, templateData) => {
  try {
    const { name, description, htmlStructure, isActive } = templateData;

    const result = await db
      .request()
      .input("templateId", sql.Int, templateId)
      .input("name", sql.NVarChar, name)
      .input("description", sql.NVarChar, description)
      .input("htmlStructure", sql.NVarChar, htmlStructure)
      .input("isActive", sql.Bit, isActive).query(`
        UPDATE PageTemplates
        SET Name = @name,
            Description = @description,
            HtmlStructure = @htmlStructure,
            IsActive = @isActive
        WHERE ID = @templateId
      `);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error updating page template:", error);
    throw error;
  }
};

const deletePageTemplate = async (templateId) => {
  try {
    const result = await (await db).request().input("templateId", sql.Int, templateId)
      .query(`
        DELETE FROM PageTemplates
        WHERE ID = @templateId
      `);
    return result.rowsAffected[0] > 0;
  } catch (error) {
    console.error("Error deleting page template:", error);
    throw error;
  }
};

module.exports = {
  getAllPageTemplates,
  getPageTemplateById,
  getAllContentTemplates,
  getContentTemplateById,
  getTemplateSets,
  getCategories,
  createPageTemplate,
  updatePageTemplate,
  deletePageTemplate,
};
