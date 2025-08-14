const request = require("supertest");
const express = require("express");
const websitesRoute = require("../legacy/routes_old/websites");

describe("Websites Route", () => {
  test('should export websites route', () => {
    expect(websitesRoute).toBeDefined();
    expect(typeof websitesRoute).toBe('function');
  });

  test('should create express app with websites route', () => {
    const app = express();
    app.use("/websites", websitesRoute);
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});