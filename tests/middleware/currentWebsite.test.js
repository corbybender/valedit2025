const currentWebsiteMiddleware = require('../../src/middleware/currentWebsite.js');

// Mock dependencies
jest.mock('../../src/services/workingSiteService');

describe('currentWebsite', () => {
    test('should export currentWebsiteMiddleware function', () => {
        expect(typeof currentWebsiteMiddleware).toBe('function');
    });

    test('placeholder test', () => {
        expect(true).toBe(true);
    });
});
