const request = require("supertest");
const express = require("express");
const usersRoute = require("../routes/users");
const db = require("../db");

jest.mock("../db");
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
    app.use("/users", usersRoute(mockDb));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for users.js routes here
});
