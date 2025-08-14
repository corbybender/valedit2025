const request = require("supertest");
const express = require("express");
const usersRoute = require("../legacy/routes_old/users");
const db = require("../src/config/database");

jest.mock("../src/config/database");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("Users Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/users", usersRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for users.js routes here
  
  test('should export users route', () => {
    expect(usersRoute).toBeDefined();
    expect(typeof usersRoute).toBe('function');
  });

  test('should create express app with users route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


