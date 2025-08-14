const request = require("supertest");
const express = require("express");
const AzureStorageRoute = require("../legacy/routes_old/AzureStorage");
const db = require("../src/config/database");

jest.mock("../src/config/database");
const mockDb = {
  query: jest.fn(),
  request: jest.fn(() => mockDb),
  input: jest.fn(() => mockDb),
};

describe("AzureStorage Route", () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use("/azure-storage", AzureStorageRoute);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for AzureStorage.js routes here
  
  test('should export AzureStorage route', () => {
    expect(AzureStorageRoute).toBeDefined();
    expect(typeof AzureStorageRoute).toBe('function');
  });

  test('should create express app with AzureStorage route', () => {
    expect(app).toBeDefined();
    expect(typeof app).toBe('function');
  });
});


