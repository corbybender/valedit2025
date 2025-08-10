document.addEventListener("DOMContentLoaded", () => {
  // --- Get references to all modal elements ---
  const createFolderModal = document.getElementById("create-folder-modal");

  // --- Hide all modals on initial load ---
  if (createFolderModal) {
    createFolderModal.style.display = "none";
  }
  const ROOT_PREFIX = "images/";
  let currentPath = "";
  let continuationToken = null;
  let isLoading = false;
  let currentModalFile = null;
  let currentViewMode = "thumbnail"; // "thumbnail" or "list"
  const elements = {
    searchBox: document.getElementById("search-box"),
    breadcrumbNav: document.getElementById("breadcrumb-nav"),
    browserContainer: document.getElementById("file-browser-container"),
    browserStatus: document.getElementById("browser-status"),
    loadMoreContainer: document.getElementById("load-more-container"),
    loadMoreBtn: document.getElementById("load-more-btn"),
    openUploadModalBtn: document.getElementById("open-upload-modal-btn"),
    uploadModal: document.getElementById("upload-modal"),
    uploadModalClose: document.getElementById("upload-modal-close"),
    uploadForm: document.getElementById("upload-form"),
    uploadButton: document.getElementById("upload-button"),
    uploadCancelBtn: document.getElementById("upload-cancel-btn"),
    uploadStatus: document.getElementById("upload-status"),
    uploadPathDisplay: document.getElementById("upload-path-display"),
    uploadFolderPathInput: document.getElementById("upload-folder-path"),
    librarySelectionBanner: document.getElementById("library-selection-banner"),
    previewModal: document.getElementById("preview-modal"),
    previewModalClose: document.getElementById("preview-modal-close"),
    modalImagePreview: document.getElementById("modal-image-preview"),
    modalFilename: document.getElementById("modal-filename"),
    modalDimensions: document.getElementById("modal-dimensions"),
    modalFilesize: document.getElementById("modal-filesize"),
    modalImageUrl: document.getElementById("modal-image-url"),
    modalCopyBtn: document.getElementById("modal-copy-url-btn"),
    modalDeleteBtn: document.getElementById("modal-delete-btn"),
    createFolderBtn: document.getElementById("create-folder-btn"),
    createFolderModal: document.getElementById("create-folder-modal"),
    createFolderModalClose: document.getElementById(
      "create-folder-modal-close"
    ),
    createFolderForm: document.getElementById("create-folder-form"),
    createFolderCancelBtn: document.getElementById("create-folder-cancel-btn"),
    folderNameInput: document.getElementById("folder-name-input"),
    createFolderPathDisplay: document.getElementById(
      "create-folder-path-display"
    ),
    thumbnailViewBtn: document.getElementById("thumbnail-view-btn"),
    listViewBtn: document.getElementById("list-view-btn"),
  };

  // --- Helper Functions ---
  const showStatus = (el, msg, isError = false) => {
    if (!el) return;
    el.textContent = msg;
    el.className = isError ? "status-message error" : "status-message";
    el.style.display = msg ? "block" : "none";
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  const copyToClipboard = (text, button) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '<i class="fas fa-check"></i> Copied!';
        button.style.backgroundColor = "#10b981";
        setTimeout(() => {
          button.innerHTML = originalText;
          button.style.backgroundColor = "";
        }, 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  // --- UI & Modal Functions ---
  const updateBreadcrumb = (path) => {
    if (!elements.breadcrumbNav) return;

    const parts = path.split("/").filter((part) => part);
    let breadcrumbHTML = '<a href="#" data-path="">Root</a>';
    let currentPath = "";

    parts.forEach((part, index) => {
      currentPath += part + "/";
      breadcrumbHTML += ` <i class="fas fa-chevron-right"></i> <a href="#" data-path="${currentPath}">${part}</a>`;
    });

    elements.breadcrumbNav.innerHTML = breadcrumbHTML;
  };

  const renderBrowserItems = (folders, files, append = false) => {
    let folderContainer, imageGrid;

    if (!append) {
      elements.browserContainer.innerHTML = "";
      if (folders.length > 0) {
        folderContainer = document.createElement("div");
        folderContainer.className = "browser-item-container";
        elements.browserContainer.appendChild(folderContainer);
      }
      imageGrid = document.createElement("div");
      imageGrid.className =
        currentViewMode === "thumbnail" ? "image-grid" : "image-list";
      elements.browserContainer.appendChild(imageGrid);
    } else {
      imageGrid = elements.browserContainer.querySelector(
        ".image-grid, .image-list"
      );
      folderContainer = elements.browserContainer.querySelector(
        ".browser-item-container"
      );
    }

    // Render folders
    folders.forEach((folder) => {
      const folderElement = document.createElement("div");
      folderElement.className = "browser-item folder";
      folderElement.innerHTML = `
        <i class="fas fa-folder"></i>
        <span class="filename">${folder.name}</span>
      `;
      folderElement.addEventListener("click", () => {
        browse(folder.path);
      });
      if (folderContainer) {
        folderContainer.appendChild(folderElement);
      }
    });

    // Render files
    files.forEach((file) => {
      const fileElement = document.createElement("div");
      if (currentViewMode === "thumbnail") {
        fileElement.className = "image-card";
        fileElement.innerHTML = `
          <div class="image-thumbnail">
            <img src="${file.url}" alt="${file.name}" loading="lazy" />
          </div>
          <div class="image-info">
            <div class="filename">${file.name}</div>
            <div class="filesize">${formatBytes(file.size)}</div>
          </div>
        `;
      } else {
        fileElement.className = "image-list-item";
        fileElement.innerHTML = `
          <div class="image-list-thumbnail">
            <img src="${file.url}" alt="${file.name}" loading="lazy" />
          </div>
          <div class="image-list-name">${file.name}</div>
          <div class="image-list-size">${formatBytes(file.size)}</div>
          <div class="image-list-date">${new Date(
            file.lastModified
          ).toLocaleDateString()}</div>
        `;
      }

      fileElement.addEventListener("click", () => {
        openPreviewModal(file);
      });
      imageGrid.appendChild(fileElement);
    });

    // Show empty message if no content
    if (
      elements.browserContainer.innerHTML === "" ||
      (imageGrid &&
        imageGrid.childElementCount === 0 &&
        (!folderContainer || folderContainer.childElementCount === 0))
    ) {
      elements.browserContainer.innerHTML =
        '<div class="empty-folder">This folder is empty.</div>';
    }
  };

  const openPreviewModal = (file) => {
    if (!elements.previewModal) return;

    currentModalFile = file;
    elements.modalImagePreview.src = file.url;
    elements.modalFilename.textContent = file.name;
    elements.modalFilesize.textContent = formatBytes(file.size);
    elements.modalImageUrl.value = file.url;
    elements.modalDimensions.textContent = "Calculating...";

    // Calculate image dimensions
    const img = new Image();
    img.onload = function () {
      elements.modalDimensions.textContent = `${this.width} × ${this.height}`;
    };
    img.src = file.url;

    elements.previewModal.style.display = "block";
  };

  const updateUploadState = (path) => {
    const isValidPath = path && path !== "" && path !== ROOT_PREFIX;
    const uploadBtn = elements.openUploadModalBtn;

    if (isValidPath) {
      uploadBtn.classList.remove(
        "bg-gray-400",
        "cursor-not-allowed",
        "upload-disabled"
      );
      uploadBtn.classList.add("bg-indigo-600", "hover:bg-indigo-700");
      uploadBtn.removeAttribute("data-disabled");
    } else {
      uploadBtn.classList.add(
        "bg-gray-400",
        "cursor-not-allowed",
        "upload-disabled"
      );
      uploadBtn.classList.remove("bg-indigo-600", "hover:bg-indigo-700");
      uploadBtn.setAttribute("data-disabled", "true");
    }
  };

  // --- Core API Logic ---
  const browse = async (prefix, token = null) => {
    if (isLoading) return;
    isLoading = true;
    const isFirstPage = !token;

    if (isFirstPage) {
      currentPath = prefix;
      continuationToken = null;
      elements.searchBox.value = "";
      elements.browserContainer.innerHTML =
        '<div class="loading-spinner"><i class="fas fa-spinner fa-spin fa-2x"></i></div>';
      elements.uploadPathDisplay.textContent = prefix;
      elements.uploadFolderPathInput.value = prefix;
      updateUploadState(prefix);
    } else {
      elements.loadMoreBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }

    try {
      const response = await fetch("/azure-storage/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, continuationToken: token }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.error === "MISSING_WEBSITE_ID") {
          throw new Error(
            "No working website selected. Please select a website from the Sites page first."
          );
        }
        throw new Error(errorData.message || "Failed to load content.");
      }

      const data = await response.json();
      continuationToken = data.continuationToken;

      if (isFirstPage) {
        updateBreadcrumb(prefix);
        renderBrowserItems(data.folders, data.files, false);
      } else {
        renderBrowserItems([], data.files, true);
      }

      elements.loadMoreContainer.style.display = continuationToken
        ? "block"
        : "none";
    } catch (error) {
      showStatus(elements.browserStatus, error.message, true);
    } finally {
      isLoading = false;
      elements.loadMoreBtn.innerHTML = "Load More Images";
    }
  };

  // Search functionality
  if (elements.searchBox) {
    elements.searchBox.addEventListener("input", () => {
      const searchTerm = elements.searchBox.value.toLowerCase();
      const allItems = elements.browserContainer.querySelectorAll(
        ".browser-item, .image-card, .image-list-item:not(.image-list-header)"
      );

      allItems.forEach((item) => {
        const itemName = (
          item.querySelector(".filename")?.textContent ||
          item.querySelector(".image-list-name")?.textContent ||
          item.querySelector("span")?.textContent ||
          ""
        ).toLowerCase();

        if (itemName.includes(searchTerm)) {
          item.style.display = "";
        } else {
          item.style.display = "none";
        }
      });
    });
  }

  // --- Event Listeners ---

  // Browser container clicks
  if (elements.browserContainer) {
    elements.browserContainer.addEventListener("click", (e) => {
      if (e.target.closest(".browser-item.folder")) {
        const folderPath = e.target.closest(".browser-item.folder").dataset
          .path;
        if (folderPath) {
          browse(folderPath);
        }
      }
    });
  }

  // Breadcrumb navigation
  if (elements.breadcrumbNav) {
    elements.breadcrumbNav.addEventListener("click", (e) => {
      e.preventDefault();
      if (e.target.tagName === "A") {
        const path = e.target.dataset.path || ROOT_PREFIX;
        browse(path);
      }
    });
  }

  // Load more button
  if (elements.loadMoreBtn) {
    elements.loadMoreBtn.addEventListener("click", () => {
      if (continuationToken && !isLoading) {
        browse(currentPath, continuationToken);
      }
    });
  }

  // Preview modal
  if (elements.previewModalClose) {
    elements.previewModalClose.onclick = () => {
      elements.previewModal.style.display = "none";
    };
  }

  if (elements.previewModal) {
    elements.previewModal.addEventListener("click", (e) => {
      if (e.target === elements.previewModal) {
        elements.previewModal.style.display = "none";
      }
    });
  }

  // Copy URL button
  if (elements.modalCopyBtn) {
    elements.modalCopyBtn.addEventListener("click", function () {
      copyToClipboard(elements.modalImageUrl.value, this);
    });
  }

  // Delete button
  if (elements.modalDeleteBtn) {
    elements.modalDeleteBtn.addEventListener("click", function () {
      if (
        currentModalFile &&
        confirm(`Are you sure you want to delete "${currentModalFile.name}"?`)
      ) {
        deleteImage(currentModalFile);
      }
    });
  }

  // Create folder functionality
  if (elements.createFolderBtn) {
    elements.createFolderBtn.addEventListener("click", () => {
      elements.createFolderPathDisplay.textContent = currentPath || ROOT_PREFIX;
      elements.createFolderModal.style.display = "block";
      elements.folderNameInput.focus();
    });
  }

  if (elements.createFolderModalClose) {
    elements.createFolderModalClose.addEventListener("click", () => {
      elements.createFolderModal.style.display = "none";
      elements.folderNameInput.value = "";
    });
  }

  if (elements.createFolderCancelBtn) {
    elements.createFolderCancelBtn.addEventListener("click", () => {
      elements.createFolderModal.style.display = "none";
      elements.folderNameInput.value = "";
    });
  }

  if (elements.createFolderForm) {
    elements.createFolderForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const folderName = elements.folderNameInput.value.trim();
      if (folderName) {
        await createFolder(folderName);
        elements.createFolderModal.style.display = "none";
        elements.folderNameInput.value = "";
      }
    });
  }

  // Upload functionality
  if (elements.openUploadModalBtn) {
    elements.openUploadModalBtn.addEventListener("click", () => {
      if (
        elements.openUploadModalBtn.getAttribute("data-disabled") === "true"
      ) {
        showNotification(
          "Please select a library folder first to enable uploads.",
          "warning",
          {
            title: "Upload Disabled",
            category: "storage",
          }
        );
        return;
      }
      elements.uploadModal.style.display = "block";
    });
  }

  if (elements.uploadModalClose) {
    elements.uploadModalClose.addEventListener("click", () => {
      elements.uploadModal.style.display = "none";
    });
  }

  if (elements.uploadCancelBtn) {
    elements.uploadCancelBtn.addEventListener("click", () => {
      elements.uploadModal.style.display = "none";
    });
  }

  if (elements.uploadForm) {
    elements.uploadForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      await uploadFiles();
    });
  }

  // View toggle buttons
  if (elements.thumbnailViewBtn) {
    elements.thumbnailViewBtn.addEventListener("click", () => {
      currentViewMode = "thumbnail";
      elements.thumbnailViewBtn.classList.add("active");
      elements.listViewBtn.classList.remove("active");
      browse(currentPath); // Refresh with new view mode
    });
  }

  if (elements.listViewBtn) {
    elements.listViewBtn.addEventListener("click", () => {
      currentViewMode = "list";
      elements.listViewBtn.classList.add("active");
      elements.thumbnailViewBtn.classList.remove("active");
      browse(currentPath); // Refresh with new view mode
    });
  }

  // Create folder function
  const createFolder = async (folderName) => {
    try {
      const folderPath = currentPath || ROOT_PREFIX;
      const websiteIdElement = document.getElementById("websiteId");

      if (!websiteIdElement) {
        showNotification(
          "Could not find website ID. Please refresh the page.",
          "error",
          {
            title: "Missing Configuration",
            category: "error",
          }
        );
        return;
      }

      const websiteId = websiteIdElement.value;
      if (!websiteId) {
        showNotification(
          "Website ID is empty. Please ensure you have selected a working website.",
          "error",
          {
            title: "Missing Configuration",
            category: "error",
          }
        );
        return;
      }

      const response = await fetch("/azure-storage/api/create-folder", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderPath: folderPath,
          folderName: folderName.trim(),
          websiteId: websiteId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || result.message || "Failed to create folder"
        );
      }

      // Show success notification
      showNotification(
        `Folder "${result.folderName}" created successfully!`,
        "success",
        {
          title: "Folder Created",
          category: "storage",
          relatedEntityType: "folder",
          relatedEntityID: result.folderName,
        }
      );

      // Refresh the current folder to show the new folder
      browse(currentPath);
    } catch (error) {
      console.error("Error creating folder:", error);
      showNotification(`Failed to create folder: ${error.message}`, "error", {
        title: "Create Folder Failed",
        category: "storage",
      });
    }
  };

  // Upload files function
  const uploadFiles = async () => {
    try {
      const fileInput = document.getElementById("file-input");
      const files = fileInput.files;

      if (!files || files.length === 0) {
        showNotification(
          "Please select at least one file to upload.",
          "warning",
          {
            title: "No Files Selected",
            category: "storage",
          }
        );
        return;
      }

      const websiteIdElement = document.getElementById("websiteId");
      if (!websiteIdElement) {
        showNotification(
          "Could not find website ID. Please refresh the page.",
          "error",
          {
            title: "Missing Configuration",
            category: "error",
          }
        );
        return;
      }

      const websiteId = websiteIdElement.value;
      if (!websiteId) {
        showNotification(
          "Website ID is empty. Please ensure you have selected a working website.",
          "error",
          {
            title: "Missing Configuration",
            category: "error",
          }
        );
        return;
      }

      const formData = new FormData();
      formData.append("folderPath", elements.uploadFolderPathInput.value);
      formData.append("websiteId", websiteId);

      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      elements.uploadButton.disabled = true;
      elements.uploadButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Uploading...';

      const response = await fetch("/azure-storage/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed");
      }

      showNotification(
        `Successfully uploaded ${result.uploadedFiles.length} file(s)!`,
        "success",
        {
          title: "Upload Complete",
          category: "storage",
          relatedEntityType: "files",
          relatedEntityID: result.uploadedFiles.length.toString(),
        }
      );

      // Close modal and refresh
      elements.uploadModal.style.display = "none";
      fileInput.value = "";
      browse(currentPath);
    } catch (error) {
      console.error("Error uploading files:", error);
      showNotification(`Upload failed: ${error.message}`, "error", {
        title: "Upload Failed",
        category: "storage",
      });
    } finally {
      elements.uploadButton.disabled = false;
      elements.uploadButton.innerHTML =
        '<i class="fas fa-upload mr-2"></i>Upload Images';
    }
  };

  // Delete image function
  const deleteImage = async (file) => {
    try {
      const fullPath = `${currentPath}${file.name}`;
      const filename = file.name;

      const response = await fetch("/azure-storage/api/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          blobName: fullPath,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete image");
      }

      // Show success notification
      showNotification(`Image "${filename}" deleted successfully!`, "success", {
        title: "Image Deleted",
        category: "storage",
        relatedEntityType: "file",
        relatedEntityID: filename,
      });

      // Close modal and refresh
      elements.previewModal.style.display = "none";
      browse(currentPath);
    } catch (error) {
      console.error("Error deleting image:", error);
      showNotification(
        `Failed to delete "${file.name}": ${error.message}`,
        "error",
        {
          title: "Delete Failed",
          category: "storage",
          relatedEntityType: "file",
          relatedEntityID: file.name,
        }
      );
    }
  };

  // Initial load
  browse(ROOT_PREFIX);
});
