const {
    notFoundHandler,
    globalErrorHandler
} = require('../../src/middleware/errorHandler.js');

describe('errorHandler', () => {
    test('should export required functions', () => {
        expect(typeof notFoundHandler).toBe('function');
        expect(typeof globalErrorHandler).toBe('function');
    });

    test('placeholder test', () => {
        expect(true).toBe(true);
    });
});
