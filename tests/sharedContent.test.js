const request = require("supertest");
const express = require("express");
const sharedContentRoute = require("../legacy/routes_old/sharedContent");
const db = require("../src/config/database");

jest.mock("../src/config/database");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("SharedContent Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/shared-content", sharedContentRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for sharedContent.js routes here
  
  test('should export sharedContent route', () => {
    expect(sharedContentRoute).toBeDefined();
    expect(typeof sharedContentRoute).toBe('function');
  });

  test('should create express app with sharedContent route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


