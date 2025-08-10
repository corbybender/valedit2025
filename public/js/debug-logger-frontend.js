class FrontendDebugLogger {
  constructor() {
    this.enabled = true;
  }

  async log(category, message, data = null) {
    if (!this.enabled) return;

    const logEntry = {
      category,
      message,
      data,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    };

    // Log to console
    console.log(`[FRONTEND_${category}] ${message}`, data || "");

    // Send to backend for file logging
    try {
      await fetch("/api/debug-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(logEntry),
      });
    } catch (error) {
      console.error("Failed to send debug log to backend:", error);
    }
  }

  async logButtonClick(buttonName, elementInfo = null) {
    await this.log(
      "BUTTON_CLICK",
      `Button clicked: ${buttonName}`,
      elementInfo
    );
  }

  async logFormSubmit(formName, formData = null) {
    await this.log("FORM_SUBMIT", `Form submitted: ${formName}`, formData);
  }

  async logApiCall(method, url, requestData = null) {
    await this.log("API_CALL", `${method} ${url}`, requestData);
  }

  async logApiResponse(status, responseData = null) {
    await this.log("API_RESPONSE", `Response status: ${status}`, responseData);
  }

  async logError(category, error, context = null) {
    await this.log(`ERROR_${category}`, error.message, {
      error: error.message,
      stack: error.stack,
      context,
    });
  }

  async logModalOpen(modalName, data = null) {
    await this.log("MODAL_OPEN", `Modal opened: ${modalName}`, data);
  }

  async logModalClose(modalName, data = null) {
    await this.log("MODAL_CLOSE", `Modal closed: ${modalName}`, data);
  }
}

// Create global instance
window.frontendDebugLogger = new FrontendDebugLogger();
