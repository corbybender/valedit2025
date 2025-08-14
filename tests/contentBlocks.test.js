const request = require("supertest");
const express = require("express");
const contentBlocksRoute = require("../legacy/routes_old/contentBlocks");
const db = require("../src/config/database");

jest.mock("../src/config/database");
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
    app.use("/content-blocks", contentBlocksRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for contentBlocks.js routes here
  
  test('should export contentBlocks route', () => {
    expect(contentBlocksRoute).toBeDefined();
    expect(typeof contentBlocksRoute).toBe('function');
  });

  test('should create express app with contentBlocks route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


