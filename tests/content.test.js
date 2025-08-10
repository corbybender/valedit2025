const request = require("supertest");
const express = require("express");
const contentRoute = require("../routes/content");
const db = require("../db");

jest.mock("../db");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("Content Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/content", contentRoute(mockDb));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for content.js routes here
});
