const db = require("../../db");
const sql = require('mssql');

class AnalyticsService {
    /**
     * Get analytics configuration for a specific website
     * @param {number} websiteId - The website ID
     * @returns {Object|null} Analytics configuration or null if not found
     */
    static async getAnalyticsByWebsiteId(websiteId) {
        try {
            const pool = await db;
            const result = await pool.request()
                .input('websiteId', sql.Int, websiteId)
                .query(`
                    SELECT 
                        ID,
                        WebsiteID,
                        GoogleAnalyticsID,
                        GoogleTagManagerID,
                        FacebookPixelID,
                        CustomTrackingCode,
                        IsActive,
                        CreatedDate,
                        ModifiedDate,
                        CreatedBy,
                        ModifiedBy
                    FROM WebsiteAnalytics 
                    WHERE WebsiteID = @websiteId AND IsActive = 1
                `);
            
            return result.recordset.length > 0 ? result.recordset[0] : null;
        } catch (error) {
            console.error('Error getting analytics by website ID:', error);
            throw error;
        }
    }

    /**
     * Create or update analytics configuration for a website
     * @param {number} websiteId - The website ID
     * @param {Object} analyticsData - Analytics configuration data
     * @param {number} userId - The user making the change
     * @returns {Object} Updated analytics configuration
     */
    static async upsertAnalytics(websiteId, analyticsData, userId) {
        try {
            const pool = await db;
            
            // Check if record exists
            const existing = await this.getAnalyticsByWebsiteId(websiteId);
            
            if (existing) {
                // Update existing record
                const result = await pool.request()
                    .input('id', sql.Int, existing.ID)
                    .input('googleAnalyticsId', sql.NVarChar(50), analyticsData.googleAnalyticsId || null)
                    .input('googleTagManagerId', sql.NVarChar(50), analyticsData.googleTagManagerId || null)
                    .input('facebookPixelId', sql.NVarChar(50), analyticsData.facebookPixelId || null)
                    .input('customTrackingCode', sql.NVarChar(sql.MAX), analyticsData.customTrackingCode || null)
                    .input('isActive', sql.Bit, analyticsData.isActive !== undefined ? analyticsData.isActive : true)
                    .input('modifiedBy', sql.Int, userId)
                    .query(`
                        UPDATE WebsiteAnalytics 
                        SET 
                            GoogleAnalyticsID = @googleAnalyticsId,
                            GoogleTagManagerID = @googleTagManagerId,
                            FacebookPixelID = @facebookPixelId,
                            CustomTrackingCode = @customTrackingCode,
                            IsActive = @isActive,
                            ModifiedBy = @modifiedBy
                        WHERE ID = @id;
                        
                        SELECT 
                            ID, WebsiteID, GoogleAnalyticsID, GoogleTagManagerID, 
                            FacebookPixelID, CustomTrackingCode, IsActive,
                            CreatedDate, ModifiedDate, CreatedBy, ModifiedBy
                        FROM WebsiteAnalytics 
                        WHERE ID = @id;
                    `);
                
                return result.recordset[0];
            } else {
                // Create new record
                const result = await pool.request()
                    .input('websiteId', sql.Int, websiteId)
                    .input('googleAnalyticsId', sql.NVarChar(50), analyticsData.googleAnalyticsId || null)
                    .input('googleTagManagerId', sql.NVarChar(50), analyticsData.googleTagManagerId || null)
                    .input('facebookPixelId', sql.NVarChar(50), analyticsData.facebookPixelId || null)
                    .input('customTrackingCode', sql.NVarChar(sql.MAX), analyticsData.customTrackingCode || null)
                    .input('isActive', sql.Bit, analyticsData.isActive !== undefined ? analyticsData.isActive : true)
                    .input('createdBy', sql.Int, userId)
                    .input('modifiedBy', sql.Int, userId)
                    .query(`
                        INSERT INTO WebsiteAnalytics (
                            WebsiteID, GoogleAnalyticsID, GoogleTagManagerID, 
                            FacebookPixelID, CustomTrackingCode, IsActive,
                            CreatedBy, ModifiedBy
                        )
                        VALUES (
                            @websiteId, @googleAnalyticsId, @googleTagManagerId,
                            @facebookPixelId, @customTrackingCode, @isActive,
                            @createdBy, @modifiedBy
                        );
                        
                        SELECT 
                            ID, WebsiteID, GoogleAnalyticsID, GoogleTagManagerID, 
                            FacebookPixelID, CustomTrackingCode, IsActive,
                            CreatedDate, ModifiedDate, CreatedBy, ModifiedBy
                        FROM WebsiteAnalytics 
                        WHERE ID = SCOPE_IDENTITY();
                    `);
                
                return result.recordset[0];
            }
        } catch (error) {
            console.error('Error upserting analytics:', error);
            throw error;
        }
    }

    /**
     * Delete analytics configuration for a website
     * @param {number} websiteId - The website ID
     * @returns {boolean} Success status
     */
    static async deleteAnalytics(websiteId) {
        try {
            const pool = await db;
            await pool.request()
                .input('websiteId', sql.Int, websiteId)
                .query('DELETE FROM WebsiteAnalytics WHERE WebsiteID = @websiteId');
            
            return true;
        } catch (error) {
            console.error('Error deleting analytics:', error);
            throw error;
        }
    }

    /**
     * Generate Google Analytics tracking script
     * @param {string} measurementId - GA4 measurement ID (G-XXXXXXXXXX)
     * @returns {string} HTML script tag for GA4
     */
    static generateGoogleAnalyticsScript(measurementId) {
        if (!measurementId) return '';
        
        return `<!-- Google Analytics -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${measurementId}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${measurementId}');
</script>`;
    }

    /**
     * Generate Google Tag Manager script
     * @param {string} containerId - GTM container ID (GTM-XXXXXXX)
     * @returns {Object} Object with head and body scripts
     */
    static generateGoogleTagManagerScript(containerId) {
        if (!containerId) return { head: '', body: '' };
        
        return {
            head: `<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${containerId}');</script>
<!-- End Google Tag Manager -->`,
            body: `<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=${containerId}"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager -->`
        };
    }

    /**
     * Generate all tracking scripts for a website
     * @param {number} websiteId - The website ID
     * @returns {Object} Object with head and body scripts
     */
    static async generateTrackingScripts(websiteId) {
        try {
            const analytics = await this.getAnalyticsByWebsiteId(websiteId);
            
            if (!analytics || !analytics.IsActive) {
                return { head: '', body: '' };
            }

            let headScripts = '';
            let bodyScripts = '';

            // Add Google Analytics
            if (analytics.GoogleAnalyticsID) {
                headScripts += this.generateGoogleAnalyticsScript(analytics.GoogleAnalyticsID) + '\n';
            }

            // Add Google Tag Manager
            if (analytics.GoogleTagManagerID) {
                const gtm = this.generateGoogleTagManagerScript(analytics.GoogleTagManagerID);
                headScripts += gtm.head + '\n';
                bodyScripts += gtm.body + '\n';
            }

            // Add custom tracking code
            if (analytics.CustomTrackingCode) {
                headScripts += analytics.CustomTrackingCode + '\n';
            }

            return {
                head: headScripts.trim(),
                body: bodyScripts.trim()
            };
        } catch (error) {
            console.error('Error generating tracking scripts:', error);
            return { head: '', body: '' };
        }
    }
}

module.exports = AnalyticsService;