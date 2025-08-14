// Global test setup for mocking database and external dependencies

// Set up environment variables for tests
process.env.DB_USER = 'test';
process.env.DB_PASSWORD = 'test';
process.env.DB_SERVER = 'localhost';
process.env.DB_DATABASE = 'test';
process.env.DB_ENCRYPT = 'false';
process.env.DB_TRUST_SERVER_CERTIFICATE = 'true';
process.env.AZURE_STORAGE_CONNECTION_STRING = 'DefaultEndpointsProtocol=https;AccountName=test;AccountKey=test';
process.env.AZURE_CONTAINER_NAME = 'test';
process.env.AZURE_STORAGE_CONTAINER_NAME = 'test';
process.env.AZURE_CLIENT_ID = 'test-client-id';
process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
process.env.AZURE_TENANT_ID = 'test-tenant-id';

// Mock dotenv
jest.mock('dotenv', () => ({
  config: jest.fn()
}));

// Mock SQL Server (mssql) completely
jest.mock('mssql', () => ({
  ConnectionPool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({}),
    close: jest.fn().mockResolvedValue({}),
    on: jest.fn(),
    request: jest.fn().mockReturnValue({
      input: jest.fn().mockReturnThis(),
      query: jest.fn().mockResolvedValue({ recordset: [] }),
      execute: jest.fn().mockResolvedValue({ recordset: [] })
    })
  })),
  Request: jest.fn().mockImplementation(() => ({
    input: jest.fn().mockReturnThis(),
    query: jest.fn().mockResolvedValue({ recordset: [] }),
    execute: jest.fn().mockResolvedValue({ recordset: [] })
  })),
  TYPES: {
    VarChar: jest.fn(),
    Int: jest.fn(),
    DateTime: jest.fn(),
    Bit: jest.fn(),
    NVarChar: jest.fn()
  },
  connect: jest.fn().mockResolvedValue({}),
  close: jest.fn().mockResolvedValue({})
}));

// Mock Azure Storage
jest.mock('@azure/storage-blob', () => ({
  BlobServiceClient: {
    fromConnectionString: jest.fn().mockReturnValue({
      getContainerClient: jest.fn().mockReturnValue({
        uploadBlockBlob: jest.fn().mockResolvedValue({}),
        deleteBlob: jest.fn().mockResolvedValue({}),
        listBlobsFlat: jest.fn().mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            yield { name: 'test.jpg' };
          }
        })
      })
    })
  }
}));

// Mock @sendgrid/mail
jest.mock('@sendgrid/mail', () => ({
  setApiKey: jest.fn(),
  send: jest.fn().mockResolvedValue([{ statusCode: 202 }])
}));