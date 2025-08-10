const request = require("supertest");
const express = require("express");
const templatesRoute = require("../routes/templates");
const db = require("../db");

jest.mock("../db");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("Templates Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/templates", templatesRoute(mockDb));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for templates.js routes here
});
