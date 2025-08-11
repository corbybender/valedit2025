// Logger fallback - ensure logger is always available
if (typeof window.logger === "undefined" || !window.logger) {
  window.logger = {
    info: (msg, meta) => console.log(`[INFO] ${msg}`, meta || ""),
    warn: (msg, meta) => console.warn(`[WARN] ${msg}`, meta || ""),
    error: (msg, meta) => console.error(`[ERROR] ${msg}`, meta || ""),
    debug: (msg, meta) => console.log(`[DEBUG] ${msg}`, meta || ""),
    verbose: (msg, meta) => console.log(`[VERBOSE] ${msg}`, meta || ""),
  };
}

document.addEventListener("DOMContentLoaded", function () {
  // Use global notification system (initialized by dashboard.js)
  logger.info("🔔 Content.js: Using global notification system");

  // Helper function to show notifications using the global system
  const notify = (message, type = "info", options = {}) => {
    if (typeof window.showNotification === "function") {
      return window.showNotification(message, type, options);
    } else if (typeof showNotification === "function") {
      return showNotification(message, type, options);
    } else {
      logger.info(`🔔 NOTIFICATION [${type.toUpperCase()}]:`, message);
    }
  };

  // --- DOM Element References ---
  const createBlockBtn = document.getElementById("createBlockBtn");
  const blockModal = document.getElementById("blockModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const saveBlockBtn = document.getElementById("saveBlockBtn");
  const blockForm = document.getElementById("blockForm");
  const blocksList = document.getElementById("blocksList");
  const modalTitle = document.getElementById("modalTitle");
  const websiteId = document.getElementById("websiteId").value;

  // Shared Block Modal Elements
  const sharedBlockModal = document.getElementById("sharedBlockModal");
  const closeSharedModalBtn = document.getElementById("closeSharedModalBtn");
  const cancelSharedBtn = document.getElementById("cancelSharedBtn");
  const saveSharedBlockBtn = document.getElementById("saveSharedBlockBtn");
  const sharedBlockForm = document.getElementById("sharedBlockForm");
  const sharedModalTitle = document.getElementById("sharedModalTitle");

  // --- Shared Block Modal Management ---
  const showSharedModal = () => {
    if (sharedBlockModal) {
      sharedBlockModal.classList.remove("hidden");
      sharedBlockModal.classList.add("active");
    }
  };

  const hideSharedModal = () => {
    if (sharedBlockModal) {
      sharedBlockModal.classList.remove("active");
      setTimeout(() => {
        sharedBlockModal.classList.add("hidden");
      }, 200);
    }
  };

  if (closeSharedModalBtn)
    closeSharedModalBtn.addEventListener("click", hideSharedModal);
  if (cancelSharedBtn)
    cancelSharedBtn.addEventListener("click", hideSharedModal);

  // --- Shared Block Tab Switching ---
  const switchSharedTab = (tabName) => {
    // Only affect tabs within the sharedBlockModal
    const modalTabs = sharedBlockModal.querySelectorAll(".tab-button");
    const modalTabContents = sharedBlockModal.querySelectorAll(".tab-content");

    modalTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });

    // Map the tab names to the correct content element IDs
    let contentId = "";
    switch (tabName) {
      case "shared-html":
        contentId = "sharedHtmlTab";
        break;
      case "shared-css":
        contentId = "sharedCssTab";
        break;
      case "shared-js":
        contentId = "sharedJsTab";
        break;
      default:
        contentId = `${tabName}Tab`;
    }

    modalTabContents.forEach((content) => {
      content.classList.toggle("active", content.id === contentId);
    });
  };

  // Add event listeners for shared tabs (only within sharedBlockModal)
  if (sharedBlockModal) {
    const modalTabs = sharedBlockModal.querySelectorAll(".tab-button");
    modalTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchSharedTab(tab.dataset.tab));
    });
  }

  // --- Debug Helper Function ---
  const debugLog = async (message, data = null) => {
    try {
      await fetch("/api/sharedcontent/debug", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
          data: data,
        }),
      });
    } catch (error) {
      // Fallback to console if server debug fails
      logger.info("[DEBUG FALLBACK]", message, data);
    }
  };

  // --- Shared Block API ---
  const sharedApi = {
    saveSharedBlock: async (blockData) => {
      try {
        await debugLog("Frontend saveSharedBlock called", blockData);

        const isUpdate =
          blockData.sharedBlockId && blockData.sharedBlockId.trim() !== "";
        const url = isUpdate
          ? `/api/sharedcontent/${blockData.sharedBlockId}`
          : "/api/sharedcontent";
        const method = isUpdate ? "PUT" : "POST";

        await debugLog("Request details", {
          isUpdate: isUpdate,
          url: url,
          method: method,
        });

        const requestBody = {
          WebsiteID: blockData.sharedWebsiteId,
          Name: blockData.sharedBlockName,
          Description: blockData.sharedBlockDescription,
          HtmlContent: blockData.sharedHtmlContent,
          CssContent: blockData.sharedCssContent,
          JsContent: blockData.sharedJsContent,
        };

        await debugLog("Request body being sent", requestBody);
        await debugLog("CSS Content being sent", requestBody.CssContent);
        await debugLog("JS Content being sent", requestBody.JsContent);

        logger.info("🌐 MAKING API REQUEST:");
        logger.info("🌐 URL:", url);
        logger.info("🌐 Method:", method);
        logger.info("🌐 Headers:", { "Content-Type": "application/json" });
        logger.info("🌐 Body:", JSON.stringify(requestBody, null, 2));

        // Log API call to file
        if (window.frontendDebugLogger) {
          await window.frontendDebugLogger.logApiCall(method, url, requestBody);
        }

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        logger.info("📨 API RESPONSE RECEIVED:");
        logger.info("📨 Status:", response.status);
        logger.info("📨 OK:", response.ok);
        logger.info(
          "📨 Headers:",
          Object.fromEntries(response.headers.entries())
        );

        // Log API response to file
        if (window.frontendDebugLogger) {
          await window.frontendDebugLogger.logApiResponse(response.status, {
            ok: response.ok,
            headers: Object.fromEntries(response.headers.entries()),
          });
        }

        await debugLog("Response received", {
          status: response.status,
          ok: response.ok,
        });

        if (!response.ok) {
          const errorText = await response.text();
          await debugLog("Response error", errorText);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch (e) {
            errorData = { error: errorText };
          }
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        logger.info("✅ API SUCCESS RESPONSE:");
        logger.info("✅ Result:", JSON.stringify(result, null, 2));

        await debugLog("Response result", result);
        notify(
          isUpdate
            ? "Shared Block updated successfully!"
            : "Shared Block created successfully!",
          "success",
          {
            title: isUpdate ? "Block Updated" : "Block Created",
            category: "content",
            relatedEntityType: "shared_block",
            relatedEntityID: blockData.sharedBlockId,
          }
        );
        logger.info("✅ SUCCESS NOTIFICATION SHOWN");
        return result;
      } catch (error) {
        await debugLog("Error saving shared block", {
          message: error.message,
          stack: error.stack,
        });
        notify(error.message || "Failed to save shared block", "error", {
          title: "Save Failed",
          category: "content",
          relatedEntityType: "shared_block",
        });
        throw error;
      }
    },

    getSharedBlocks: async (websiteId) => {
      try {
        const response = await fetch(`/api/sharedcontent/website/${websiteId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching shared blocks:", error);
        return [];
      }
    },

    deleteSharedBlock: async (blockId) => {
      try {
        const response = await fetch(`/api/sharedcontent/${blockId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        notify("Shared block deleted successfully!", "success", {
          title: "Block Deleted",
          category: "content",
          relatedEntityType: "shared_block",
          relatedEntityID: blockId,
        });
        return result;
      } catch (error) {
        console.error("Error deleting shared block:", error);
        notify(error.message || "Failed to delete shared block", "error", {
          title: "Delete Failed",
          category: "content",
          relatedEntityType: "shared_block",
          relatedEntityID: blockId,
        });
        throw error;
      }
    },
  };

  // Debug: Check if elements exist
  logger.info("createBlockBtn:", createBlockBtn);
  logger.info("blockModal:", blockModal);
  logger.info("websiteId:", websiteId);

  // --- Image Preview Functionality ---
  const imagePreviewModal = document.getElementById("imagePreviewModal");
  const previewImage = document.getElementById("previewImage");
  const previewTitle = document.getElementById("previewTitle");

  const showImagePreview = (imageSrc, title) => {
    if (previewImage && previewTitle && imagePreviewModal) {
      // Don't show preview for fallback images
      if (imageSrc.includes("noimage.png")) {
        return;
      }

      previewImage.src = imageSrc;
      previewTitle.textContent = title;
      imagePreviewModal.classList.remove("hidden");
      // Force reflow to ensure the element is visible before adding show class
      imagePreviewModal.offsetHeight;
      imagePreviewModal.classList.add("show");
    }
  };

  const hideImagePreview = () => {
    if (imagePreviewModal) {
      imagePreviewModal.classList.remove("show");
      setTimeout(() => {
        imagePreviewModal.classList.add("hidden");
      }, 300);
    }
  };

  // Close modal when clicking on backdrop
  if (imagePreviewModal) {
    imagePreviewModal.addEventListener("click", (e) => {
      if (
        e.target === imagePreviewModal ||
        e.target.classList.contains("image-preview-backdrop")
      ) {
        hideImagePreview();
      }
    });
  }

  // Add keyboard support (ESC to close)
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      imagePreviewModal &&
      !imagePreviewModal.classList.contains("hidden")
    ) {
      hideImagePreview();
    }
  });

  // --- API Functions ---
  const api = {
    getBlocks: async (webId) => {
      try {
        const response = await fetch(`/api/pagecontentblocks/shared/${webId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching blocks:", error);
        notify("Failed to fetch content blocks", "error", {
          title: "Load Failed",
          category: "content",
        });
        return [];
      }
    },

    getCategories: async () => {
      try {
        const response = await fetch("/api/pagecontentblocks/categories");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching categories:", error);
        return [];
      }
    },

    saveBlock: async (blockData) => {
      try {
        logger.info("🔧 API saveBlock called with data:", blockData);

        // Determine if this is an update or create operation
        const isUpdate = blockData.id && blockData.id.trim() !== "";
        logger.info("🔧 Is update operation:", isUpdate);

        // Generate slug from name
        let slug = blockData.name
          .toLowerCase()
          .replace(/[^a-z0-9 -]/g, "")
          .replace(/\s+/g, "-")
          .replace(/-+/g, "-")
          .trim("-");

        // For new blocks, add timestamp to avoid duplicate slugs
        if (!isUpdate) {
          slug += "-" + Date.now();
        }

        const url = isUpdate
          ? `/api/pagecontentblocks/shared/${blockData.id}`
          : "/api/pagecontentblocks/shared";
        const method = isUpdate ? "PUT" : "POST";

        logger.info("🔧 API Request details:");
        logger.info("🔧 URL:", url);
        logger.info("🔧 Method:", method);
        logger.info("🔧 Generated slug:", slug);

        const requestBody = {
          name: blockData.name,
          slug: slug,
          description: blockData.description,
          htmlContent: blockData.htmlContent,
          cssContent: blockData.cssContent,
          jsContent: blockData.jsContent,
        };

        logger.info("🔧 Request body:", JSON.stringify(requestBody, null, 2));

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        logger.info("🔧 Response status:", response.status);
        logger.info("🔧 Response ok:", response.ok);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        notify(
          isUpdate
            ? "Block updated successfully!"
            : "Block created successfully!",
          "success",
          {
            title: isUpdate ? "Block Updated" : "Block Created",
            category: "content",
            relatedEntityType: "content_block",
            relatedEntityID: blockData.id,
          }
        );
        return result;
      } catch (error) {
        console.error("Error saving block:", error);
        notify(error.message || "Failed to save content block", "error", {
          title: "Save Failed",
          category: "content",
          relatedEntityType: "content_block",
        });
        throw error;
      }
    },

    deleteBlock: async (blockId) => {
      try {
        const response = await fetch(
          `/api/pagecontentblocks/shared/${blockId}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        notify("Block deleted successfully!", "success", {
          title: "Block Deleted",
          category: "content",
          relatedEntityType: "content_block",
          relatedEntityID: blockId,
        });
        return result;
      } catch (error) {
        console.error("Error deleting block:", error);
        notify(error.message || "Failed to delete content block", "error", {
          title: "Delete Failed",
          category: "content",
          relatedEntityType: "content_block",
          relatedEntityID: blockId,
        });
        throw error;
      }
    },
  };

  // --- Modal Management ---
  const showModal = () => {
    logger.info("showModal called"); // Debug log
    if (blockModal) {
      blockModal.classList.remove("hidden");
      blockModal.classList.add("active");
    }
  };

  const hideModal = () => {
    logger.info("hideModal called"); // Debug log
    if (blockModal) {
      blockModal.classList.remove("active");
      setTimeout(() => {
        blockModal.classList.add("hidden");
      }, 200);
    }
  };

  if (closeModalBtn) closeModalBtn.addEventListener("click", hideModal);
  if (cancelBtn) cancelBtn.addEventListener("click", hideModal);

  // --- Tab Switching Logic ---
  const switchTab = (tabName) => {
    // Only affect tabs within the blockModal
    const modalTabs = blockModal.querySelectorAll(".tab-button");
    const modalTabContents = blockModal.querySelectorAll(".tab-content");

    modalTabs.forEach((tab) => {
      tab.classList.toggle("active", tab.dataset.tab === tabName);
    });
    modalTabContents.forEach((content) => {
      content.classList.toggle("active", content.id === `${tabName}Tab`);
    });
  };

  // Add event listeners for regular tabs (only within blockModal)
  if (blockModal) {
    const modalTabs = blockModal.querySelectorAll(".tab-button");
    modalTabs.forEach((tab) => {
      tab.addEventListener("click", () => switchTab(tab.dataset.tab));
    });
  }

  // --- Data Handling ---
  const getSharedBlocks = async (websiteId) => {
    try {
      // Use the existing shared content blocks endpoint
      const response = await fetch(
        `/api/pagecontentblocks/shared/${websiteId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching shared blocks:", error);
      return [];
    }
  };

  const renderBlocks = async (filter = "all") => {
    blocksList.innerHTML =
      '<div class="loading">Loading content blocks...</div>';

    try {
      // Get both types of blocks as originally intended
      const [contentBlocks, websiteSharedBlocks] = await Promise.all([
        getSharedBlocks(websiteId), // ContentTemplates
        sharedApi.getSharedBlocks(websiteId), // SharedContent
      ]);

      blocksList.innerHTML = ""; // Clear loading message

      if (
        (!contentBlocks || contentBlocks.length === 0) &&
        (!websiteSharedBlocks || websiteSharedBlocks.length === 0)
      ) {
        blocksList.innerHTML = `<p class="text-gray-500 col-span-full">No content blocks found. Click 'Create Content Block' or 'Create Shared Block' to get started.</p>`;
        return;
      }

      // Filter blocks based on selection
      const filteredContentBlocks =
        filter === "all" || filter === "regular" ? contentBlocks : [];
      const filteredSharedBlocks =
        filter === "all" || filter === "shared" ? websiteSharedBlocks : [];

      // Render Content Blocks (ContentTemplates)
      if (filteredContentBlocks && filteredContentBlocks.length > 0) {
        filteredContentBlocks.forEach((block) => {
          const blockElement = document.createElement("div");
          blockElement.className =
            "bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col content-block-card";

          const lastUpdated = block.UpdatedAt
            ? new Date(block.UpdatedAt).toLocaleDateString()
            : "Unknown";

          // Ensure block.ID is properly handled
          const blockId = block.ID !== undefined ? block.ID : "";

          // Generate thumbnail path from block name
          const thumbnailName = (block.Name || "noimage")
            .replace(/ /g, "-")
            .replace(/[^a-zA-Z0-9\-_]/g, ""); // Remove special characters except dashes and underscores
          const thumbnailPath = `/public/images/thumbnails/${thumbnailName}.jpg`;
          const fallbackPath = `/public/images/thumbnails/noimage.png`;

          blockElement.innerHTML = `
            <div class="flex-grow">
              <div class="mb-3">
                <img 
                  src="${thumbnailPath}" 
                  alt="${block.Name || "Unnamed Block"}"
                  class="w-full h-32 object-cover rounded-lg thumbnail-hover"
                  onerror="this.src='${fallbackPath}'"
                  loading="lazy"
                  data-title="${block.Name || "Unnamed Block"}"
                  title="Click to view larger image"
                />
              </div>
              <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-bold text-gray-800">${
                  block.Name || "Unnamed Block"
                }</h3>
                <span class="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Content Block</span>
              </div>
              <p class="text-gray-600 text-sm mb-2">${
                block.Description || "No description provided."
              }</p>
              <div class="text-xs text-gray-500 mb-4">
                <span>Updated: ${lastUpdated}</span>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-100 flex justify-end items-center space-x-3 content-block-actions">
              <button data-action="edit" data-id="${blockId}" class="text-sm font-medium text-indigo-600 hover:text-indigo-800">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button data-action="delete" data-id="${blockId}" class="text-sm font-medium text-red-500 hover:text-red-700 delete-btn">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          `;
          blocksList.appendChild(blockElement);
        });
      }

      // Render Shared Content Blocks (SharedContent)
      if (filteredSharedBlocks && filteredSharedBlocks.length > 0) {
        filteredSharedBlocks.forEach((block) => {
          const blockElement = document.createElement("div");
          blockElement.className =
            "bg-green-50 p-6 rounded-xl border border-green-200 shadow-sm hover:shadow-lg transition-shadow duration-300 flex flex-col content-block-card";

          const lastUpdated = block.UpdatedAt
            ? new Date(block.UpdatedAt).toLocaleDateString()
            : "Unknown";

          // Ensure block properties are properly handled
          const sharedBlockId =
            block.SharedBlockID !== undefined ? block.SharedBlockID : "";
          const websiteId =
            block.WebsiteID !== undefined ? block.WebsiteID : "";

          // Generate thumbnail path from block name
          const sharedThumbnailName = (block.Name || "noimage")
            .replace(/ /g, "-")
            .replace(/[^a-zA-Z0-9\-_]/g, ""); // Remove special characters except dashes and underscores
          const sharedThumbnailPath = `/public/images/thumbnails/${sharedThumbnailName}.jpg`;
          const sharedFallbackPath = `/public/images/thumbnails/noimage.png`;

          blockElement.innerHTML = `
            <div class="flex-grow">
              <div class="mb-3">
                <img 
                  src="${sharedThumbnailPath}" 
                  alt="${block.Name || "Unnamed Shared Block"}"
                  class="w-full h-32 object-cover rounded-lg thumbnail-hover"
                  onerror="this.src='${sharedFallbackPath}'"
                  loading="lazy"
                  data-title="${block.Name || "Unnamed Shared Block"}"
                  title="Click to view larger image"
                />
              </div>
              <div class="flex justify-between items-start mb-2">
                <h3 class="text-xl font-bold text-green-800">${
                  block.Name || "Unnamed Shared Block"
                }</h3>
                <span class="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">Shared Block</span>
              </div>
              <p class="text-gray-600 text-sm mb-2">${
                block.Description || "No description provided."
              }</p>
              <div class="text-xs text-gray-500 mb-4">
                <span>Updated: ${lastUpdated}</span>
                <span> • Website ID: ${websiteId}</span>
              </div>
            </div>
            <div class="mt-4 pt-4 border-t border-green-100 flex justify-end items-center space-x-3 content-block-actions">
              <button data-action="edit-shared" data-id="${sharedBlockId}" class="text-sm font-medium text-green-600 hover:text-green-800">
                <i class="fas fa-edit"></i> Edit
              </button>
              <button data-action="delete-shared" data-id="${sharedBlockId}" class="text-sm font-medium text-red-500 hover:text-red-700 delete-btn">
                <i class="fas fa-trash"></i> Delete
              </button>
            </div>
          `;
          blocksList.appendChild(blockElement);
        });
      }

      // Show message if no blocks match the filter
      if (blocksList.children.length === 0) {
        blocksList.innerHTML = `<p class="text-gray-500 col-span-full">No content blocks match the selected filter.</p>`;
      }

      // Add click event listeners to all thumbnail images
      const thumbnailImages = blocksList.querySelectorAll(".thumbnail-hover");
      thumbnailImages.forEach((img) => {
        img.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          const imageSrc = e.target.src;
          const title = e.target.getAttribute("data-title");
          showImagePreview(imageSrc, title);
        });
      });
    } catch (error) {
      blocksList.innerHTML = `<p class="text-red-500 col-span-full">Error loading content blocks: ${error.message}</p>`;
    }
  };

  // --- Event Handlers ---
  const openCreateModal = () => {
    logger.info("openCreateModal called"); // Debug log
    if (modalTitle) modalTitle.textContent = "Create New Content Block";
    if (blockForm) blockForm.reset();
    const blockIdElement = document.getElementById("blockId");
    if (blockIdElement) blockIdElement.value = "";
    switchTab("html"); // Default to HTML tab
    showModal();
  };

  const openEditModal = async (blockId) => {
    try {
      // Fetch the block data from the API
      const response = await fetch(
        `/api/pagecontentblocks/shared/single/${blockId}`
      );
      if (!response.ok) {
        throw new Error("Failed to fetch block data");
      }
      const block = await response.json();

      if (modalTitle) modalTitle.textContent = "Edit Content Block";
      const blockIdElement = document.getElementById("blockId");
      const blockNameElement = document.getElementById("blockName");
      const blockDescElement = document.getElementById("blockDescription");
      const htmlContentElement = document.getElementById("htmlContent");
      const cssContentElement = document.getElementById("cssContent");
      const jsContentElement = document.getElementById("jsContent");

      if (blockIdElement) blockIdElement.value = block.ID || "";
      if (blockNameElement) blockNameElement.value = block.Name || "";
      if (blockDescElement) blockDescElement.value = block.Description || "";
      if (htmlContentElement)
        htmlContentElement.value = block.HtmlContent || "";
      if (cssContentElement) cssContentElement.value = block.CssContent || "";
      if (jsContentElement) jsContentElement.value = block.JsContent || "";

      switchTab("html"); // Default to HTML tab
      showModal();
    } catch (error) {
      notify("Failed to load block data for editing", "error");
    }
  };

  const openEditSharedModal = async (blockId) => {
    try {
      await debugLog("Opening edit shared modal for block ID", blockId);

      // Fetch the shared block data from the API
      const response = await fetch(`/api/sharedcontent/${blockId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch shared block data");
      }
      const block = await response.json();

      await debugLog("Fetched block data for editing", block);

      if (sharedModalTitle) sharedModalTitle.textContent = "Edit Shared Block";
      if (document.getElementById("sharedBlockId"))
        document.getElementById("sharedBlockId").value =
          block.SharedBlockID || "";
      if (document.getElementById("sharedWebsiteId"))
        document.getElementById("sharedWebsiteId").value =
          block.WebsiteID || "";
      if (document.getElementById("sharedBlockName"))
        document.getElementById("sharedBlockName").value = block.Name || "";
      if (document.getElementById("sharedBlockDescription"))
        document.getElementById("sharedBlockDescription").value =
          block.Description || "";
      if (document.getElementById("sharedHtmlContent"))
        document.getElementById("sharedHtmlContent").value =
          block.HtmlContent || "";
      if (document.getElementById("sharedCssContent"))
        document.getElementById("sharedCssContent").value =
          block.CssContent || "";
      if (document.getElementById("sharedJsContent"))
        document.getElementById("sharedJsContent").value =
          block.JsContent || "";

      await debugLog("Form fields populated with block data", {
        cssContentSet: block.CssContent || "EMPTY",
        jsContentSet: block.JsContent || "EMPTY",
        cssElementExists: !!document.getElementById("sharedCssContent"),
        jsElementExists: !!document.getElementById("sharedJsContent"),
      });

      switchSharedTab("shared-html"); // Default to HTML tab
      showSharedModal();
    } catch (error) {
      await debugLog("Error in openEditSharedModal", {
        message: error.message,
        stack: error.stack,
      });
      notify("Failed to load shared block data for editing", "error");
    }
  };

  // --- Event Listeners ---
  // Add event listener for Save Block button (regular content blocks)
  if (saveBlockBtn) {
    saveBlockBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      logger.info(
        "💾 REGULAR SAVE BUTTON CLICKED - About to save content block"
      );

      if (!blockForm) {
        console.error("❌ blockForm not found!");
        return;
      }

      if (!blockForm.checkValidity()) {
        logger.info("❌ Form validation failed");
        blockForm.reportValidity();
        return;
      }

      logger.info("✅ Form validation passed");

      const blockData = {
        id: document.getElementById("blockId")?.value || null,
        name: document.getElementById("blockName")?.value || "",
        description: document.getElementById("blockDescription")?.value || "",
        htmlContent: document.getElementById("htmlContent")?.value || "",
        cssContent: document.getElementById("cssContent")?.value || "",
        jsContent: document.getElementById("jsContent")?.value || "",
      };

      logger.info("💾 Block data to save:", JSON.stringify(blockData, null, 2));

      try {
        logger.info("🔄 Calling api.saveBlock...");
        await api.saveBlock(blockData);
        logger.info("✅ api.saveBlock completed successfully");
        hideModal();
        renderBlocks(); // Re-render the list to show changes
      } catch (error) {
        console.error("❌ Error in save button handler:", error);
        // Error is already handled in the API function
      }
    });
    logger.info("✅ Regular save button event listener added successfully");
  } else {
    console.error("❌ saveBlockBtn not found!");
  }

  blocksList.addEventListener("click", async (e) => {
    const target = e.target.closest("button");
    if (!target) return;

    const action = target.dataset.action;
    const id = target.dataset.id;

    if (!action || !id) return;

    if (action === "edit") {
      openEditModal(id);
    } else if (action === "edit-shared") {
      openEditSharedModal(id);
    } else if (action === "delete") {
      const blockName = target
        .closest(".content-block-card")
        .querySelector("h3").textContent;
      if (
        confirm(`Are you sure you want to delete the "${blockName}" block?`)
      ) {
        try {
          await api.deleteBlock(id);
          renderBlocks();
        } catch (error) {
          // Error is already handled in the API function
        }
      }
    } else if (action === "delete-shared") {
      const blockName = target
        .closest(".content-block-card")
        .querySelector("h3").textContent;
      if (
        confirm(
          `Are you sure you want to delete the "${blockName}" shared block?`
        )
      ) {
        try {
          await sharedApi.deleteSharedBlock(id);
          renderBlocks();
        } catch (error) {
          // Error is already handled in the API function
        }
      }
    }
  });

  // Debug: Check if button exists before adding event listener
  logger.info("About to add event listener to createBlockBtn:", createBlockBtn);
  if (createBlockBtn) {
    createBlockBtn.addEventListener("click", () => {
      logger.info("Create button clicked!"); // Debug log
      openCreateModal();
    });
    logger.info("Event listener added successfully");
  } else {
    console.error("createBlockBtn not found!");
  }

  // Add event listener for Create Shared Block button (opens shared modal)
  const createSharedBlockBtn = document.getElementById("createSharedBlockBtn");
  if (createSharedBlockBtn) {
    createSharedBlockBtn.addEventListener("click", () => {
      logger.info("Create Shared Block button clicked!"); // Debug log
      if (sharedModalTitle)
        sharedModalTitle.textContent = "Create New Shared Block";
      if (sharedBlockForm) sharedBlockForm.reset();
      if (document.getElementById("sharedBlockId"))
        document.getElementById("sharedBlockId").value = "";
      if (document.getElementById("sharedWebsiteId"))
        document.getElementById("sharedWebsiteId").value = websiteId;
      switchSharedTab("shared-html");
      showSharedModal();
    });
    logger.info("Create Shared Block event listener added successfully");
  } else {
    console.error("createSharedBlockBtn not found!");
  }

  // Add event listener for Save Shared Block button
  if (saveSharedBlockBtn) {
    saveSharedBlockBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      if (!sharedBlockForm.checkValidity()) {
        sharedBlockForm.reportValidity();
        return;
      }
      await debugLog("Save Shared Block button clicked");
      await debugLog("Form validity", sharedBlockForm.checkValidity());

      // Get form field values with debugging
      await debugLog("Checking form elements exist", {
        sharedBlockId: !!document.getElementById("sharedBlockId"),
        sharedWebsiteId: !!document.getElementById("sharedWebsiteId"),
        sharedBlockName: !!document.getElementById("sharedBlockName"),
        sharedBlockDescription: !!document.getElementById(
          "sharedBlockDescription"
        ),
        sharedHtmlContent: !!document.getElementById("sharedHtmlContent"),
        sharedCssContent: !!document.getElementById("sharedCssContent"),
        sharedJsContent: !!document.getElementById("sharedJsContent"),
      });

      const sharedBlockId =
        document.getElementById("sharedBlockId")?.value || null;
      const sharedWebsiteId = document.getElementById("sharedWebsiteId")?.value;
      const sharedBlockName = document.getElementById("sharedBlockName")?.value;
      const sharedBlockDescription = document.getElementById(
        "sharedBlockDescription"
      )?.value;
      const sharedHtmlContent =
        document.getElementById("sharedHtmlContent")?.value;
      const sharedCssContent =
        document.getElementById("sharedCssContent")?.value;
      const sharedJsContent = document.getElementById("sharedJsContent")?.value;

      await debugLog("Form field values collected", {
        sharedBlockId: sharedBlockId,
        sharedWebsiteId: sharedWebsiteId,
        sharedBlockName: sharedBlockName,
        sharedBlockDescription: sharedBlockDescription,
        sharedHtmlContentLength: sharedHtmlContent
          ? sharedHtmlContent.length
          : 0,
        sharedCssContentLength: sharedCssContent ? sharedCssContent.length : 0,
        sharedCssContentValue: sharedCssContent,
        sharedJsContentLength: sharedJsContent ? sharedJsContent.length : 0,
        sharedJsContentValue: sharedJsContent,
      });

      const blockData = {
        sharedBlockId: sharedBlockId,
        sharedWebsiteId: sharedWebsiteId,
        sharedBlockName: sharedBlockName,
        sharedBlockDescription: sharedBlockDescription,
        sharedHtmlContent: sharedHtmlContent,
        sharedCssContent: sharedCssContent,
        sharedJsContent: sharedJsContent,
      };
      try {
        logger.info("💾 SAVE BUTTON CLICKED - About to save shared block");
        logger.info(
          "💾 Block data to save:",
          JSON.stringify(blockData, null, 2)
        );

        // Log to file via frontend logger
        if (window.frontendDebugLogger) {
          await window.frontendDebugLogger.logButtonClick(
            "SaveSharedBlock",
            blockData
          );
        }

        await debugLog("About to call saveSharedBlock", blockData);

        logger.info("🔄 Calling sharedApi.saveSharedBlock...");
        const saveResult = await sharedApi.saveSharedBlock(blockData);
        logger.info("✅ sharedApi.saveSharedBlock returned:", saveResult);

        if (window.frontendDebugLogger) {
          await window.frontendDebugLogger.log(
            "SAVE_RESULT",
            "saveSharedBlock completed",
            saveResult
          );
        }

        await debugLog("saveSharedBlock completed successfully");

        logger.info("🏠 Hiding modal and refreshing blocks list...");
        hideSharedModal();
        renderBlocks(); // Refresh the blocks list

        // Also refresh any shared blocks currently displayed in page builders
        await refreshSharedBlocksInPageBuilders(blockData.sharedBlockId);

        // Refresh shared blocks in the current tab if we're on a buildpage
        if (
          window.refreshSharedBlockOnCanvas &&
          typeof window.refreshSharedBlockOnCanvas === "function"
        ) {
          await debugLog("Refreshing shared blocks in current buildpage tab");
          await window.refreshSharedBlockOnCanvas(blockData.sharedBlockId);
        }
      } catch (error) {
        await debugLog("Error in save button handler", {
          message: error.message,
          stack: error.stack,
        });
      }
    });
  }

  // --- Utility Functions ---
  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .trim("-");
  };

  // Use unified notification system - showNotification is provided by notifications.js

  // --- Initial Load ---
  renderBlocks();

  // Add event listener for the block type filter
  const blockTypeFilter = document.getElementById("blockTypeFilter");
  if (blockTypeFilter) {
    blockTypeFilter.addEventListener("change", (e) => {
      const filterValue = e.target.value;
      renderBlocks(filterValue);
    });
  }

  // --- Function to refresh shared blocks in page builders ---
  async function refreshSharedBlocksInPageBuilders(sharedBlockId) {
    try {
      await debugLog("Refreshing shared blocks in page builders", {
        sharedBlockId,
      });

      // Send a message to all page builder windows/tabs to refresh shared blocks
      // This uses localStorage to communicate between tabs
      const refreshMessage = {
        type: "REFRESH_SHARED_BLOCKS",
        sharedBlockId: sharedBlockId,
        timestamp: Date.now(),
      };

      localStorage.setItem(
        "sharedBlockRefresh",
        JSON.stringify(refreshMessage)
      );

      // Remove the message after a short delay to prevent it from persisting
      setTimeout(() => {
        localStorage.removeItem("sharedBlockRefresh");
      }, 1000);

      await debugLog("Shared block refresh message sent", refreshMessage);
    } catch (error) {
      await debugLog("Error refreshing shared blocks in page builders", error);
    }
  }

  // --- Auto-open edit modal if edit parameter is present ---
  function checkForEditParameter() {
    logger.info("🔍 CHECKING FOR EDIT PARAMETER");
    logger.info("🔍 Current URL:", window.location.href);
    logger.info("🔍 Search params:", window.location.search);

    const urlParams = new URLSearchParams(window.location.search);
    const editBlockId = urlParams.get("edit");

    logger.info("🔍 Edit parameter value:", editBlockId);
    logger.info(
      "🔍 All URL parameters:",
      Object.fromEntries(urlParams.entries())
    );

    if (editBlockId) {
      logger.info(
        "✅ EDIT PARAMETER FOUND - Auto-opening edit modal for shared block:",
        editBlockId
      );
      logger.info("⏱️ Setting timeout to open modal in 1 second...");

      // Wait a moment for the page to fully load, then open the edit modal
      setTimeout(() => {
        logger.info(
          "⏰ TIMEOUT TRIGGERED - Calling openEditSharedModal with ID:",
          editBlockId
        );
        try {
          openEditSharedModal(editBlockId);
          logger.info("✅ openEditSharedModal called successfully");
        } catch (error) {
          console.error("❌ Error calling openEditSharedModal:", error);
        }
      }, 1000);
    } else {
      logger.info("❌ No edit parameter found in URL");
    }
  }

  // Check for edit parameter on page load
  logger.info("🚀 CONTENT.JS: Checking for edit parameter on page load...");
  checkForEditParameter();
});
