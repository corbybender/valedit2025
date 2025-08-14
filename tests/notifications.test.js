const request = require("supertest");
const express = require("express");
const notificationsRoute = require("../legacy/routes_old/notifications");
const db = require("../src/config/database");

jest.mock("../src/config/database");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("Notifications Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/notifications", notificationsRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for notifications.js routes here
  
  test('should export notifications route', () => {
    expect(notificationsRoute).toBeDefined();
    expect(typeof notificationsRoute).toBe('function');
  });

  test('should create express app with notifications route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


