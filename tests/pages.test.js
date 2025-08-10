const request = require("supertest");
const express = require("express");
const pagesRoute = require("../routes/pages");
const db = require("../db");

jest.mock("../db");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("Pages Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/pages", pagesRoute(mockDb));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for pages.js routes here
});
