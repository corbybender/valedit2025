/**
 * Analytics Settings Management
 * Handles the frontend functionality for managing website analytics settings
 */

document.addEventListener('DOMContentLoaded', function() {
    // Get current website ID from the hidden field
    const websiteIdField = document.getElementById('websiteId');
    const currentWebsiteId = websiteIdField ? websiteIdField.value : null;
    
    if (!currentWebsiteId) {
        console.error('No current website ID found');
        showNotification('error', 'Unable to determine current website. Please select a website first.');
        
        // Hide the form and show instructions
        const form = document.getElementById('analytics-form');
        if (form) {
            form.style.display = 'none';
        }
        return;
    }

    // DOM elements
    const form = document.getElementById('analytics-form');
    const previewButton = document.getElementById('preview-button');
    const testButton = document.getElementById('test-button');
    const previewModal = document.getElementById('preview-modal');
    const closePreviewButton = document.getElementById('close-preview');
    
    // Debug: Check if elements exist
    console.log('Modal elements found:', {
        previewModal: !!previewModal,
        closePreviewButton: !!closePreviewButton,
        previewButton: !!previewButton
    });

    // Form fields
    const googleAnalyticsIdField = document.getElementById('googleAnalyticsId');
    const googleTagManagerIdField = document.getElementById('googleTagManagerId');
    const facebookPixelIdField = document.getElementById('facebookPixelId');
    const customTrackingCodeField = document.getElementById('customTrackingCode');
    const isActiveField = document.getElementById('isActive');

    // Initialize
    init();

    /**
     * Initialize the analytics settings page
     */
    async function init() {
        try {
            await loadAnalyticsSettings();
            attachEventListeners();
        } catch (error) {
            console.error('Error initializing analytics settings:', error);
            showNotification('error', 'Failed to load analytics settings.');
        }
    }

    /**
     * Load existing analytics settings for the current website
     */
    async function loadAnalyticsSettings() {
        try {
            const response = await fetch(`/api/analytics/${currentWebsiteId}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Populate form fields
            googleAnalyticsIdField.value = data.googleAnalyticsId || '';
            googleTagManagerIdField.value = data.googleTagManagerId || '';
            facebookPixelIdField.value = data.facebookPixelId || '';
            customTrackingCodeField.value = data.customTrackingCode || '';
            isActiveField.checked = data.isActive !== false; // Default to true
        } catch (error) {
            console.error('Error loading analytics settings:', error);
            showNotification('error', 'Failed to load existing analytics settings.');
        }
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Form submission
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }

        // Preview button
        if (previewButton) {
            previewButton.addEventListener('click', function(e) {
                e.preventDefault();
                handlePreview();
            });
        }

        // Test button
        if (testButton) {
            testButton.addEventListener('click', function(e) {
                e.preventDefault();
                handleTest();
            });
        }

        // Close preview modal
        if (closePreviewButton) {
            closePreviewButton.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                closePreview();
            });
        }
        
        if (previewModal) {
            previewModal.addEventListener('click', function(e) {
                if (e.target === previewModal) {
                    closePreview();
                }
            });
        }
        
        // Close modal with Escape key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && !previewModal.classList.contains('hidden')) {
                closePreview();
            }
        });

        // Input validation
        googleAnalyticsIdField.addEventListener('blur', validateGoogleAnalyticsId);
        googleTagManagerIdField.addEventListener('blur', validateGoogleTagManagerId);
    }

    /**
     * Handle form submission
     */
    async function handleFormSubmit(e) {
        e.preventDefault();

        // Validate form
        if (!validateForm()) {
            return;
        }

        try {
            // Show loading state
            const submitButton = form.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
            submitButton.disabled = true;

            // Prepare data
            const formData = {
                googleAnalyticsId: googleAnalyticsIdField.value.trim() || null,
                googleTagManagerId: googleTagManagerIdField.value.trim() || null,
                facebookPixelId: facebookPixelIdField.value.trim() || null,
                customTrackingCode: customTrackingCodeField.value.trim() || null,
                isActive: isActiveField.checked
            };

            // Submit data
            const response = await fetch(`/api/analytics/${currentWebsiteId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            showNotification('success', 'Analytics settings saved successfully!');

        } catch (error) {
            console.error('Error saving analytics settings:', error);
            showNotification('error', `Failed to save analytics settings: ${error.message}`);
        } finally {
            // Reset button state
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.innerHTML = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Handle preview button click
     */
    async function handlePreview() {
        try {
            const response = await fetch(`/api/analytics/${currentWebsiteId}/preview`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Display preview
            document.getElementById('head-code-preview').textContent = data.headScripts || '<!-- No head scripts configured -->';
            document.getElementById('body-code-preview').textContent = data.bodyScripts || '<!-- No body scripts configured -->';
            
            // Show modal
            console.log('Showing preview modal');
            previewModal.classList.remove('hidden');
            console.log('Modal classes after show:', previewModal.className);
        } catch (error) {
            console.error('Error previewing analytics code:', error);
            showNotification('error', 'Failed to generate preview.');
        }
    }

    /**
     * Handle test button click
     */
    function handleTest() {
        // Basic validation of tracking IDs
        const gaId = googleAnalyticsIdField.value.trim();
        const gtmId = googleTagManagerIdField.value.trim();
        const fbId = facebookPixelIdField.value.trim();

        let messages = [];

        if (gaId) {
            if (validateGAFormat(gaId)) {
                messages.push(`✅ Google Analytics ID "${gaId}" format is valid`);
            } else {
                messages.push(`❌ Google Analytics ID "${gaId}" format is invalid`);
            }
        }

        if (gtmId) {
            if (validateGTMFormat(gtmId)) {
                messages.push(`✅ Google Tag Manager ID "${gtmId}" format is valid`);
            } else {
                messages.push(`❌ Google Tag Manager ID "${gtmId}" format is invalid`);
            }
        }

        if (fbId) {
            if (validateFBFormat(fbId)) {
                messages.push(`✅ Facebook Pixel ID "${fbId}" format is valid`);
            } else {
                messages.push(`❌ Facebook Pixel ID "${fbId}" format is invalid`);
            }
        }

        if (messages.length === 0) {
            messages.push('ℹ️ No tracking IDs configured to test');
        }

        showNotification('info', messages.join('<br>'));
    }

    /**
     * Close preview modal
     */
    function closePreview() {
        console.log('closePreview called');
        if (previewModal) {
            previewModal.classList.add('hidden');
            console.log('Modal should now be hidden');
        } else {
            console.error('previewModal element not found');
        }
    }

    /**
     * Validate the entire form
     */
    function validateForm() {
        let isValid = true;

        // Validate Google Analytics ID
        if (googleAnalyticsIdField.value.trim() && !validateGAFormat(googleAnalyticsIdField.value.trim())) {
            showFieldError(googleAnalyticsIdField, 'Invalid Google Analytics ID format (should be G-XXXXXXXXXX)');
            isValid = false;
        }

        // Validate Google Tag Manager ID
        if (googleTagManagerIdField.value.trim() && !validateGTMFormat(googleTagManagerIdField.value.trim())) {
            showFieldError(googleTagManagerIdField, 'Invalid Google Tag Manager ID format (should be GTM-XXXXXXX)');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validate Google Analytics ID format
     */
    function validateGoogleAnalyticsId() {
        const value = googleAnalyticsIdField.value.trim();
        if (value && !validateGAFormat(value)) {
            showFieldError(googleAnalyticsIdField, 'Invalid format. Should be G-XXXXXXXXXX');
        } else {
            clearFieldError(googleAnalyticsIdField);
        }
    }

    /**
     * Validate Google Tag Manager ID format
     */
    function validateGoogleTagManagerId() {
        const value = googleTagManagerIdField.value.trim();
        if (value && !validateGTMFormat(value)) {
            showFieldError(googleTagManagerIdField, 'Invalid format. Should be GTM-XXXXXXX');
        } else {
            clearFieldError(googleTagManagerIdField);
        }
    }

    /**
     * Utility functions for format validation
     */
    function validateGAFormat(id) {
        return /^G-[A-Z0-9]{10}$/.test(id);
    }

    function validateGTMFormat(id) {
        return /^GTM-[A-Z0-9]{7,}$/.test(id);
    }

    function validateFBFormat(id) {
        return /^[0-9]{15,16}$/.test(id);
    }

    /**
     * Show field error
     */
    function showFieldError(field, message) {
        clearFieldError(field);
        field.classList.add('border-red-500');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'text-red-600 text-sm mt-1 field-error';
        errorDiv.textContent = message;
        
        field.parentNode.appendChild(errorDiv);
    }

    /**
     * Clear field error
     */
    function clearFieldError(field) {
        field.classList.remove('border-red-500');
        
        const errorDiv = field.parentNode.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    /**
     * Get current website ID from various sources
     */
    function getCurrentWebsiteId() {
        // Try to get from URL path
        const pathMatch = window.location.pathname.match(/\/websites\/(\d+)/);
        if (pathMatch) {
            return pathMatch[1];
        }

        // Try to get from query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const websiteId = urlParams.get('websiteId');
        if (websiteId) {
            return websiteId;
        }

        // Try to get from global variable set by server
        if (window.currentWebsite && window.currentWebsite.WebsiteID) {
            return window.currentWebsite.WebsiteID;
        }

        return null;
    }

    /**
     * Show notification (assumes notifications.js is loaded)
     */
    function showNotification(type, message) {
        if (typeof window.showNotification === 'function') {
            window.showNotification(message, type);
        } else {
            // Fallback to alert if notifications system not available
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
});