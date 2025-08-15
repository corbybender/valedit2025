// public/js/content-documents.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Element Selectors ---
  const elements = {
    uploadForm: document.getElementById("upload-form"),
    uploadStatus: document.getElementById("upload-status"),
    filesList: document.getElementById("files-list"),
    filesStatus: document.getElementById("files-status"),
    refreshButton: document.getElementById("refresh-button"),
    editModal: document.getElementById("edit-modal"),
    editForm: document.getElementById("edit-form"),
    editBlobNameInput: document.getElementById("edit-blob-name"),
    modalFilenameSpan: document.getElementById("modal-filename"),
    editTextArea: document.getElementById("edit-textarea"),
    editStatus: document.getElementById("edit-status"),
    replaceModal: document.getElementById("replace-modal"),
    replaceForm: document.getElementById("replace-form"),
    replaceBlobNameInput: document.getElementById("replace-blob-name"),
    replaceModalFilenameSpan: document.getElementById("replace-modal-filename"),
    replaceStatus: document.getElementById("replace-status"),
  };
  const FOLDER_PREFIX = "docs/";

  // --- Helper Functions ---
  const showStatus = (el, msg, isError = false) => {
    el.textContent = msg;
    el.className = `status-message ${isError ? "error" : "success"}`;
    setTimeout(() => {
      el.textContent = "";
      el.className = "status-message";
    }, 5000);
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

  // Use unified notification system - showNotification is provided by notifications.js

  // --- Core API Logic ---
  const fetchAndDisplayFiles = async () => {
    elements.filesList.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
      const response = await fetch("/azure-storage/api/list");
      if (!response.ok) throw new Error("Failed to fetch file list.");
      const { docs } = await response.json();

      elements.filesList.innerHTML = "";
      if (docs.length > 0) {
        docs.forEach((file) => {
          const row = elements.filesList.insertRow();
          row.innerHTML = `
                        <td><a href="${file.url}" target="_blank" title="${
            file.name
          }">${file.name}</a></td>
                        <td>${new Date(file.lastModified).toLocaleString()}</td>
                        <td>${formatBytes(file.size)}</td>
                        <td class="actions">
                            <button class="replace-btn" data-blob-name="${FOLDER_PREFIX}${
            file.name
          }">Replace</button>
                            <button class="delete-btn" data-blob-name="${FOLDER_PREFIX}${
            file.name
          }">Delete</button>
                        </td>
                    `;
        });
      } else {
        elements.filesList.innerHTML = `<tr><td colspan="4">No documents found.</td></tr>`;
      }
    } catch (error) {
      showStatus(elements.filesStatus, error.message, true);
    }
  };

  // --- Event Listeners ---
  elements.uploadForm.addEventListener("submit", async (e) => {
    /* ... identical to images version ... */
  });
  document.body.addEventListener("click", async (e) => {
    const { blobName } = e.target.dataset;
    if (!blobName) return;

    if (e.target.classList.contains("delete-btn")) {
      /* ... identical to images version ... */
    } else if (e.target.classList.contains("replace-btn")) {
      /* ... identical to images version ... */
    } else if (e.target.classList.contains("edit-btn")) {
      elements.editModal.style.display = "block";
      elements.modalFilenameSpan.textContent = blobName;
      elements.editBlobNameInput.value = blobName;
      elements.editTextArea.value = "Loading content...";
      try {
        const response = await fetch("/azure-storage/api/get-content", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobName }),
        });
        if (!response.ok) throw new Error("Failed to fetch content.");
        elements.editTextArea.value = await response.text();
        showStatus(elements.editStatus, "Content loaded.");
      } catch (error) {
        showStatus(elements.editStatus, error.message, true);
      }
    }
  });

  elements.editForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const blobName = elements.editBlobNameInput.value;
    const content = elements.editTextArea.value;
    showStatus(elements.editStatus, "Saving...");
    try {
      const response = await fetch("/azure-storage/api/replace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blobName, content }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      showStatus(elements.editStatus, result.message);
      setTimeout(() => {
        elements.editModal.style.display = "none";
      }, 1500);
      fetchAndDisplayFiles();
    } catch (error) {
      showStatus(elements.editStatus, error.message, true);
    }
  });

  // The following listeners can be copy-pasted directly from the content-images.js file as they are identical
  elements.uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showStatus(elements.uploadStatus, "Uploading...");
    try {
      const response = await fetch("/azure-storage/api/upload", {
        method: "POST",
        body: new FormData(elements.uploadForm),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      // Show success notification
      showNotification("Document uploaded successfully!", "success");
      showStatus(elements.uploadStatus, result.message);

      elements.uploadForm.reset();
      fetchAndDisplayFiles();
    } catch (error) {
      // Show error notification
      showNotification(`Upload failed: ${error.message}`, "error");
      showStatus(elements.uploadStatus, error.message, true);
    }
  });
  elements.replaceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("replace-file-input");
    if (!fileInput.files[0]) {
      showNotification("Please select a file to upload.", "error");
      return showStatus(elements.replaceStatus, "Please select a file.", true);
    }
    const formData = new FormData(elements.replaceForm);
    showStatus(elements.replaceStatus, "Replacing file...");
    try {
      const response = await fetch("/azure-storage/api/replace", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      // Show success notification
      showNotification("Document replaced successfully!", "success");
      showStatus(elements.replaceStatus, result.message);

      setTimeout(() => {
        elements.replaceModal.style.display = "none";
      }, 1500);
      fetchAndDisplayFiles();
    } catch (error) {
      // Show error notification
      showNotification(`Replace failed: ${error.message}`, "error");
      showStatus(elements.replaceStatus, error.message, true);
    }
  });
  document.body.addEventListener("click", async (e) => {
    const { blobName } = e.target.dataset;
    if (!blobName) return;
    if (e.target.classList.contains("delete-btn")) {
      if (!confirm(`Delete ${blobName}?`)) return;
      showStatus(elements.filesStatus, `Deleting ${blobName}...`);
      try {
        const response = await fetch("/azure-storage/api/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobName }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showStatus(elements.filesStatus, result.message);
        fetchAndDisplayFiles();
      } catch (error) {
        showStatus(elements.filesStatus, error.message, true);
      }
    } else if (e.target.classList.contains("replace-btn")) {
      elements.replaceModal.style.display = "block";
      elements.replaceModalFilenameSpan.textContent = blobName;
      elements.replaceBlobNameInput.value = blobName;
      elements.replaceForm.reset();
    }
  });

  document
    .querySelectorAll(".close-button")
    .forEach(
      (btn) =>
        (btn.onclick = () => (btn.closest(".modal").style.display = "none"))
    );
  window.onclick = (e) => {
    if (e.target.classList.contains("modal")) e.target.style.display = "none";
  };
  elements.refreshButton.addEventListener("click", fetchAndDisplayFiles);

  fetchAndDisplayFiles(); // Initial Load
});
