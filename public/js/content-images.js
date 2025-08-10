// public/js/content-images.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Element Selectors ---
  const elements = {
    uploadForm: document.getElementById("upload-form"),
    uploadStatus: document.getElementById("upload-status"),
    filesList: document.getElementById("files-list"),
    filesStatus: document.getElementById("files-status"),
    refreshButton: document.getElementById("refresh-button"),
    replaceModal: document.getElementById("replace-modal"),
    replaceForm: document.getElementById("replace-form"),
    replaceBlobNameInput: document.getElementById("replace-blob-name"),
    replaceModalFilenameSpan: document.getElementById("replace-modal-filename"),
    replaceStatus: document.getElementById("replace-status"),
  };
  const FOLDER_PREFIX = "images/";

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
  // Use unified notification system
  const showBanner = (message, isError = false) => {
    showNotification(message, isError ? "error" : "success");
  };

  // --- Core API Logic ---
  const fetchAndDisplayFiles = async () => {
    elements.filesList.innerHTML = '<tr><td colspan="4">Loading...</td></tr>';
    try {
      const response = await fetch("/azure-storage/api/list");
      if (!response.ok) throw new Error("Failed to fetch file list.");
      const { images } = await response.json();

      elements.filesList.innerHTML = "";
      if (images.length > 0) {
        images.forEach((file) => {
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
        elements.filesList.innerHTML = `<tr><td colspan="4">No images found.</td></tr>`;
      }
    } catch (error) {
      showStatus(elements.filesStatus, error.message, true);
    }
  };

  // --- Event Listeners ---
  elements.uploadForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showStatus(elements.uploadStatus, "Uploading...");
    try {
      const formData = new FormData();
      const files =
        elements.uploadForm.querySelector("input[type='file']").files;

      // Append each file to the FormData object
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/azure-storage/api/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      showStatus(elements.uploadStatus, result.message);
      showBanner("Images uploaded successfully!", false);
      elements.uploadForm.reset();
      fetchAndDisplayFiles();
    } catch (error) {
      showStatus(elements.uploadStatus, error.message, true);
      showBanner(`Upload failed: ${error.message}`, true);
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

  elements.replaceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("replace-file-input");
    if (!fileInput.files[0])
      return showStatus(elements.replaceStatus, "Please select a file.", true);
    const formData = new FormData(elements.replaceForm);
    showStatus(elements.replaceStatus, "Replacing file...");
    try {
      const response = await fetch("/azure-storage/api/replace", {
        method: "POST",
        body: formData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      showStatus(elements.replaceStatus, result.message);
      setTimeout(() => {
        elements.replaceModal.style.display = "none";
      }, 1500);
      fetchAndDisplayFiles();
    } catch (error) {
      showStatus(elements.replaceStatus, error.message, true);
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
