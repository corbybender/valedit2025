const request = require("supertest");
const express = require("express");
const templatesRoute = require("../legacy/routes_old/templates");
const db = require("../src/config/database");

jest.mock("../src/config/database");
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
    app.use("/templates", templatesRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for templates.js routes here
  
  test('should export templates route', () => {
    expect(templatesRoute).toBeDefined();
    expect(typeof templatesRoute).toBe('function');
  });

  test('should create express app with templates route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


