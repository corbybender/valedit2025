const request = require("supertest");
const express = require("express");
const websitesRoute = require("../routes/websites");
const db = require("../db"); // Use actual DB connection
const sql = require("mssql"); // Import SQL for direct queries

describe("Websites Route", () => {
  let app;

  beforeAll(async () => {
    app = express();
    app.use(express.json());
    app.use((req, res, next) => {
      req.session = { authorID: 5 }; // Mock session
      next();
    });
    app.use("/websites", websitesRoute(db));

    // Ensure the database connection is established before running tests
    await db.connect();
  });

  afterAll(async () => {
    // Close the database connection after all tests
    await db.close();
  });

  // Helper function to fetch data directly from the database
  async function fetchData(query, params = []) {
    const request = db.request();
    params.forEach(({ name, type, value }) => {
      request.input(name, type, value);
    });
    const result = await request.query(query);
    return result.recordset;
  }

  describe("GET /websites", () => {
    it("should fetch and render websites if authorID is present", async () => {
      const authorID = 5; // Example authorID
      const websites = await fetchData(
        `SELECT w.Domain
         FROM dbo.Websites w
         JOIN dbo.AuthorWebsiteAccess awa ON w.WebsiteID = awa.WebsiteID
         WHERE awa.AuthorID = 5
           AND w.IsActive = 1
         ORDER BY w.Domain`,
        [{ name: "authorID", type: sql.Int, value: authorID }]
      );

      const response = await request(app).get("/websites");

      expect(response.status).toBe(200);
      websites.forEach((site) => {
        expect(response.text).toContain(site.Domain);
      });
    });
  });

  describe("GET /websites/:websiteId/paths", () => {
    it("should fetch paths for a given website", async () => {
      const websiteId = 1; // Example website ID
      const paths = await fetchData(
        "SELECT DISTINCT Path FROM Pages WHERE WebsiteID = @websiteId AND Path IS NOT NULL AND Path <> ''",
        [{ name: "websiteId", type: sql.Int, value: websiteId }]
      );

      const response = await request(app).get(`/websites/${websiteId}/paths`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(paths.map((row) => row.Path));
    });
  });

  describe("GET /websites/:websiteId/sitemap", () => {
    it("should fetch and return a sitemap for a given website", async () => {
      const websiteId = 1; // Example website ID
      const pages = await fetchData(
        "SELECT PageID, ParentPageID, Title, URL FROM dbo.Pages WHERE WebsiteID = @websiteId ORDER BY Title",
        [{ name: "websiteId", type: sql.Int, value: websiteId }]
      );

      const response = await request(app).get(`/websites/${websiteId}/sitemap`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.arrayContaining(
          pages.map((page) =>
            expect.objectContaining({
              PageID: page.PageID,
              Title: page.Title,
              URL: page.URL,
            })
          )
        )
      );
    });
  });
});
