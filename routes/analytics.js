const express = require('express');
const router = express.Router();
const AnalyticsService = require('../src/services/analyticsService');

/**
 * GET /api/analytics/:websiteId
 * Get analytics configuration for a specific website
 */
router.get('/:websiteId', async (req, res) => {
    try {
        const websiteId = parseInt(req.params.websiteId);
        
        if (!websiteId) {
            return res.status(400).json({ error: 'Invalid website ID' });
        }

        const analytics = await AnalyticsService.getAnalyticsByWebsiteId(websiteId);
        
        if (!analytics) {
            return res.json({
                websiteId: websiteId,
                googleAnalyticsId: null,
                googleTagManagerId: null,
                facebookPixelId: null,
                customTrackingCode: null,
                isActive: true
            });
        }

        res.json({
            id: analytics.ID,
            websiteId: analytics.WebsiteID,
            googleAnalyticsId: analytics.GoogleAnalyticsID,
            googleTagManagerId: analytics.GoogleTagManagerID,
            facebookPixelId: analytics.FacebookPixelID,
            customTrackingCode: analytics.CustomTrackingCode,
            isActive: analytics.IsActive,
            createdDate: analytics.CreatedDate,
            modifiedDate: analytics.ModifiedDate
        });
    } catch (error) {
        console.error('Error getting analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/analytics/:websiteId
 * Create or update analytics configuration for a website
 */
router.post('/:websiteId', async (req, res) => {
    try {
        const websiteId = parseInt(req.params.websiteId);
        
        if (!websiteId) {
            return res.status(400).json({ error: 'Invalid website ID' });
        }

        const {
            googleAnalyticsId,
            googleTagManagerId,
            facebookPixelId,
            customTrackingCode,
            isActive
        } = req.body;

        // Validate Google Analytics ID format (G-XXXXXXXXXX)
        if (googleAnalyticsId && !/^G-[A-Z0-9]{10}$/.test(googleAnalyticsId)) {
            return res.status(400).json({ 
                error: 'Invalid Google Analytics ID format. Should be G-XXXXXXXXXX' 
            });
        }

        // Validate Google Tag Manager ID format (GTM-XXXXXXX)
        if (googleTagManagerId && !/^GTM-[A-Z0-9]{7,}$/.test(googleTagManagerId)) {
            return res.status(400).json({ 
                error: 'Invalid Google Tag Manager ID format. Should be GTM-XXXXXXX' 
            });
        }

        const analyticsData = {
            googleAnalyticsId: googleAnalyticsId || null,
            googleTagManagerId: googleTagManagerId || null,
            facebookPixelId: facebookPixelId || null,
            customTrackingCode: customTrackingCode || null,
            isActive: isActive !== undefined ? isActive : true
        };

        const result = await AnalyticsService.upsertAnalytics(
            websiteId, 
            analyticsData, 
            req.session.authorID
        );

        res.json({
            id: result.ID,
            websiteId: result.WebsiteID,
            googleAnalyticsId: result.GoogleAnalyticsID,
            googleTagManagerId: result.GoogleTagManagerID,
            facebookPixelId: result.FacebookPixelID,
            customTrackingCode: result.CustomTrackingCode,
            isActive: result.IsActive,
            createdDate: result.CreatedDate,
            modifiedDate: result.ModifiedDate
        });
    } catch (error) {
        console.error('Error saving analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * DELETE /api/analytics/:websiteId
 * Delete analytics configuration for a website
 */
router.delete('/:websiteId', async (req, res) => {
    try {
        const websiteId = parseInt(req.params.websiteId);
        
        if (!websiteId) {
            return res.status(400).json({ error: 'Invalid website ID' });
        }

        await AnalyticsService.deleteAnalytics(websiteId);
        
        res.json({ success: true, message: 'Analytics configuration deleted' });
    } catch (error) {
        console.error('Error deleting analytics:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/analytics/:websiteId/preview
 * Preview the generated tracking scripts for a website
 */
router.get('/:websiteId/preview', async (req, res) => {
    try {
        const websiteId = parseInt(req.params.websiteId);
        
        if (!websiteId) {
            return res.status(400).json({ error: 'Invalid website ID' });
        }

        const scripts = await AnalyticsService.generateTrackingScripts(websiteId);
        
        res.json({
            headScripts: scripts.head,
            bodyScripts: scripts.body,
            hasScripts: !!(scripts.head || scripts.body)
        });
    } catch (error) {
        console.error('Error previewing analytics scripts:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;