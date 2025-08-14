const {
    showPagesForWebsite,
    showBuildPage,
    showPageTemplates
} = require('../../src/controllers/pageController.js');

// Mock dependencies
jest.mock('../../src/services/pageService');
jest.mock('../../src/services/workingSiteService');
jest.mock('../../src/utils/helpers');

describe('pageController', () => {
    test('should export required functions', () => {
        expect(typeof showPagesForWebsite).toBe('function');
        expect(typeof showBuildPage).toBe('function');
        expect(typeof showPageTemplates).toBe('function');
    });

    test('placeholder test', () => {
        expect(true).toBe(true);
    });
});
