// Image Picker for Content Editor
document.addEventListener("DOMContentLoaded", () => {
  // Configuration
  const ROOT_PREFIX = "images/";

  // State
  let currentPath = "";
  let continuationToken = null;
  let isLoading = false;
  let currentViewMode = "thumbnail";
  let selectedImage = null;

  // Elements
  const elements = {
    modal: document.getElementById("image-picker-modal"),
    closeBtn: document.getElementById("image-picker-close"),
    cancelBtn: document.getElementById("image-picker-cancel"),
    selectBtn: document.getElementById("image-picker-select"),
    browser: document.getElementById("image-picker-browser"),
    breadcrumb: document.getElementById("image-picker-breadcrumb"),
    searchBox: document.getElementById("image-picker-search"),
    thumbnailViewBtn: document.getElementById("picker-thumbnail-view"),
    listViewBtn: document.getElementById("picker-list-view"),
    status: document.getElementById("image-picker-status"),
    insertImageBtn: document.getElementById("insert-image-btn"),
  };

  // Helper Functions
  const showStatus = (msg, isError = false) => {
    if (elements.status) {
      elements.status.textContent = msg;
      elements.status.className = `status-message ${
        isError ? "error" : "success"
      }`;
      setTimeout(() => {
        elements.status.textContent = "";
        elements.status.className = "status-message";
      }, 3000);
    }
  };

  const formatBytes = (bytes, d = 2) =>
    !+bytes
      ? "0 Bytes"
      : ((k) =>
          `${parseFloat(
            (bytes / k ** Math.floor(Math.log(bytes) / Math.log(k))).toFixed(d)
          )} ${
            ["B", "KB", "MB", "GB"][Math.floor(Math.log(bytes) / Math.log(k))]
          }`)(1024);

  const getImageDimensions = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve(`${img.width} x ${img.height}`);
      };
      img.onerror = () => {
        resolve("N/A");
      };
      img.src = url;
    });
  };

  // Update breadcrumb navigation
  const updateBreadcrumb = (path) => {
    if (!elements.breadcrumb) return;

    elements.breadcrumb.innerHTML = "";
    let builtPath = "";
    const segments = path.replace(/\/$/, "").split("/");

    segments.forEach((segment, index) => {
      builtPath += segment + "/";
      const link = document.createElement("a");
      link.href = "#";
      link.className = "breadcrumb-item";
      link.textContent = segment;

      if (index === segments.length - 1) {
        link.classList.add("active");
      } else {
        link.dataset.path = builtPath;
      }

      elements.breadcrumb.appendChild(link);
    });
  };

  // Switch view modes
  const switchViewMode = (mode) => {
    currentViewMode = mode;

    if (elements.thumbnailViewBtn && elements.listViewBtn) {
      elements.thumbnailViewBtn.classList.toggle(
        "active",
        mode === "thumbnail"
      );
      elements.listViewBtn.classList.toggle("active", mode === "list");
    }

    // Re-render current content
    browse(currentPath);
  };

  // Clear selection
  const clearSelection = () => {
    selectedImage = null;
    if (elements.selectBtn) {
      elements.selectBtn.disabled = true;
    }

    // Remove selection styling
    const selectedCards = elements.browser.querySelectorAll(
      ".picker-image-card.selected, .picker-list-item.selected"
    );
    selectedCards.forEach((card) => card.classList.remove("selected"));
  };

  // Select image
  const selectImage = (imageData, element) => {
    // Clear previous selection
    clearSelection();

    // Set new selection
    selectedImage = imageData;
    element.classList.add("selected");

    if (elements.selectBtn) {
      elements.selectBtn.disabled = false;
    }
  };

  // Render browser items
  const renderBrowserItems = async (folders, files, append = false) => {
    if (!elements.browser) return;

    let folderContainer, imageGrid, imageList;

    if (!append) {
      elements.browser.innerHTML = "";
      clearSelection();

      // Create folder container if there are folders
      if (folders.length > 0) {
        folderContainer = document.createElement("div");
        folderContainer.className = "browser-item-container";
        elements.browser.appendChild(folderContainer);
      }

      if (currentViewMode === "thumbnail") {
        // Create thumbnail grid
        imageGrid = document.createElement("div");
        imageGrid.className = "image-grid";
        elements.browser.appendChild(imageGrid);
      } else {
        // Create list view
        imageList = document.createElement("div");
        imageList.className = "image-list active";

        if (files.length > 0) {
          // Add list header
          const listHeader = document.createElement("div");
          listHeader.className = "image-list-header";
          listHeader.innerHTML = `
            <div>Name</div>
            <div>Dimensions</div>
            <div>Size</div>
            <div>Select</div>
            <div></div>
          `;
          imageList.appendChild(listHeader);
        }

        elements.browser.appendChild(imageList);
      }
    } else {
      imageGrid = elements.browser.querySelector(".image-grid");
      imageList = elements.browser.querySelector(".image-list");
      folderContainer = elements.browser.querySelector(
        ".browser-item-container"
      );
    }

    // Render folders
    if (folders.length > 0 && folderContainer) {
      folders.forEach((folder) => {
        const item = document.createElement("a");
        item.href = "#";
        item.className = "browser-item folder";
        item.dataset.path = folder.path;
        item.title = folder.providerId || folder.path;
        item.innerHTML = `<i class="fas fa-folder"></i><span>${folder.name}</span>`;
        folderContainer.appendChild(item);
      });
    }

    // Render files based on view mode
    if (files.length > 0) {
      if (currentViewMode === "thumbnail" && imageGrid) {
        // Thumbnail view
        files.forEach((file) => {
          const card = document.createElement("div");
          card.className = "image-card picker-image-card";
          card.dataset.fileInfo = JSON.stringify(file);
          card.innerHTML = `
            <div class="thumbnail-container">
              <img src="${file.url}" alt="${
            file.name
          }" class="thumbnail" loading="lazy">
            </div>
            <div class="card-info">
              <span class="filename" title="${file.name}">${file.name}</span>
              <span class="filesize">${formatBytes(file.size)}</span>
            </div>
          `;

          // Add click handler for selection
          card.addEventListener("click", () => {
            selectImage(file, card);
          });

          imageGrid.appendChild(card);
        });
      } else if (currentViewMode === "list" && imageList) {
        // List view
        for (const file of files) {
          const listItem = document.createElement("div");
          listItem.className = "image-list-item picker-list-item";
          listItem.dataset.fileInfo = JSON.stringify(file);

          // Get dimensions asynchronously
          const dimensions = await getImageDimensions(file.url);

          listItem.innerHTML = `
            <div class="image-list-name" title="${file.name}">${file.name}</div>
            <div class="image-list-dimensions">${dimensions}</div>
            <div class="image-list-size">${formatBytes(file.size)}</div>
            <div class="image-list-select">
              <button class="select-image-btn" data-file='${JSON.stringify(
                file
              )}'>Select</button>
            </div>
            <div></div>
          `;

          // Add click handler for row selection
          listItem.addEventListener("click", (e) => {
            if (!e.target.classList.contains("select-image-btn")) {
              selectImage(file, listItem);
            }
          });

          // Add click handler for select button
          const selectBtn = listItem.querySelector(".select-image-btn");
          selectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            selectImage(file, listItem);
          });

          imageList.appendChild(listItem);
        }
      }
    }

    // Handle empty state
    if (
      elements.browser.innerHTML === "" ||
      (currentViewMode === "thumbnail" &&
        imageGrid &&
        imageGrid.childElementCount === 0) ||
      (currentViewMode === "list" &&
        imageList &&
        imageList.childElementCount <= 1)
    ) {
      if (!folderContainer || folderContainer.childElementCount === 0) {
        elements.browser.innerHTML =
          '<div class="empty-folder">This folder is empty.</div>';
      }
    }
  };

  // Browse Azure Storage
  const browse = async (prefix, token = null) => {
    if (isLoading) return;

    const isFirstPage = !token;
    isLoading = true;
    currentPath = prefix;

    if (isFirstPage) {
      showStatus("Loading...");
    }

    try {
      const response = await fetch("/azure-storage/api/browse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefix, continuationToken: token }),
      });

      if (!response.ok) throw new Error("Failed to load content.");

      const data = await response.json();
      continuationToken = data.continuationToken;

      if (isFirstPage) {
        updateBreadcrumb(prefix);
        await renderBrowserItems(data.folders, data.files, false);
      } else {
        await renderBrowserItems([], data.files, true);
      }

      showStatus(`Loaded ${data.files.length} images`);
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      isLoading = false;
    }
  };

  // Search functionality
  const handleSearch = () => {
    if (!elements.searchBox) return;

    const searchTerm = elements.searchBox.value.toLowerCase();
    const allItems = elements.browser.querySelectorAll(
      ".browser-item, .picker-image-card, .picker-list-item:not(.image-list-header)"
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
  };

  // Open image picker modal
  const openImagePicker = () => {
    if (elements.modal) {
      elements.modal.style.display = "block";
      clearSelection();
      browse(ROOT_PREFIX);
    }
  };

  // Close image picker modal
  const closeImagePicker = () => {
    if (elements.modal) {
      elements.modal.style.display = "none";
      clearSelection();
    }
  };

  // Insert selected image into editor
  const insertSelectedImage = () => {
    if (!selectedImage) return;

    // Get the TinyMCE editor instance
    const editor = tinymce.get("html-editor");
    if (editor) {
      // Insert image with proper webassets.valmont.com URL
      const imageHtml = `<img src="${selectedImage.url}" alt="${selectedImage.name}" style="max-width: 100%; height: auto;" />`;
      editor.insertContent(imageHtml);
    } else {
      // Fallback to textarea if TinyMCE is not available
      const textarea = document.getElementById("html-editor");
      if (textarea) {
        const imageHtml = `<img src="${selectedImage.url}" alt="${selectedImage.name}" style="max-width: 100%; height: auto;" />`;
        const cursorPos = textarea.selectionStart;
        const textBefore = textarea.value.substring(0, cursorPos);
        const textAfter = textarea.value.substring(textarea.selectionEnd);
        textarea.value = textBefore + imageHtml + textAfter;
        textarea.selectionStart = textarea.selectionEnd =
          cursorPos + imageHtml.length;
      }
    }

    closeImagePicker();
    showStatus("Image inserted successfully!");
  };

  // Event Listeners
  if (elements.insertImageBtn) {
    elements.insertImageBtn.addEventListener("click", openImagePicker);
  }

  if (elements.closeBtn) {
    elements.closeBtn.addEventListener("click", closeImagePicker);
  }

  if (elements.cancelBtn) {
    elements.cancelBtn.addEventListener("click", closeImagePicker);
  }

  if (elements.selectBtn) {
    elements.selectBtn.addEventListener("click", insertSelectedImage);
  }

  if (elements.thumbnailViewBtn) {
    elements.thumbnailViewBtn.addEventListener("click", () => {
      if (currentViewMode !== "thumbnail") {
        switchViewMode("thumbnail");
      }
    });
  }

  if (elements.listViewBtn) {
    elements.listViewBtn.addEventListener("click", () => {
      if (currentViewMode !== "list") {
        switchViewMode("list");
      }
    });
  }

  if (elements.searchBox) {
    elements.searchBox.addEventListener("input", handleSearch);
  }

  // Breadcrumb navigation
  if (elements.breadcrumb) {
    elements.breadcrumb.addEventListener("click", (e) => {
      e.preventDefault();
      const link = e.target.closest("a");
      if (link && link.dataset.path) {
        browse(link.dataset.path);
      }
    });
  }

  // Browser navigation (folders)
  if (elements.browser) {
    elements.browser.addEventListener("click", (e) => {
      const folderLink = e.target.closest("a.folder");
      if (folderLink) {
        e.preventDefault();
        browse(folderLink.dataset.path);
      }
    });
  }

  // Close modal when clicking outside
  if (elements.modal) {
    elements.modal.addEventListener("click", (e) => {
      if (e.target === elements.modal) {
        closeImagePicker();
      }
    });
  }
});
