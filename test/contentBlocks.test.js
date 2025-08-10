const request = require("supertest");
const express = require("express");
const contentBlocksRoute = require("../routes/contentBlocks");
const db = require("../db");

jest.mock("../db");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("ContentBlocks Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/content-blocks", contentBlocksRoute(mockDb));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for contentBlocks.js routes here
});
