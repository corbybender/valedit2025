const app = require('../../src/config/app.js');

describe('app', () => {
    test('should export app configuration', () => {
        expect(app).toBeDefined();
    });
});
