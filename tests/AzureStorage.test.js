const request = require("supertest");
const express = require("express");
const AzureStorageRoute = require("../routes/AzureStorage");
const db = require("../db");

jest.mock("../db");
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
    app.use("/azure-storage", AzureStorageRoute(mockDb));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Add specific tests for AzureStorage.js routes here
});
