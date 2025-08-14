const request = require("supertest");
const express = require("express");
const pagesRoute = require("../legacy/routes_old/pages");
const db = require("../src/config/database");

jest.mock("../src/config/database");
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
    app.use("/pages", pagesRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for pages.js routes here
  
  test('should export pages route', () => {
    expect(pagesRoute).toBeDefined();
    expect(typeof pagesRoute).toBe('function');
  });

  test('should create express app with pages route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


