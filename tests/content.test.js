const request = require("supertest");
const express = require("express");
const contentRoute = require("../legacy/routes_old/content");
const db = require("../src/config/database");

jest.mock("../src/config/database");
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
    app.use("/content", contentRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for content.js routes here
  
  test('should export content route', () => {
    expect(contentRoute).toBeDefined();
    expect(typeof contentRoute).toBe('function');
  });

  test('should create express app with content route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


