// public/js/AzureStorage.js
document.addEventListener("DOMContentLoaded", () => {
  const elements = {
    uploadForm: document.getElementById("upload-form"),
    uploadStatus: document.getElementById("upload-status"),
    docsList: document.getElementById("docs-list"),
    imagesList: document.getElementById("images-list"),
    docsStatus: document.getElementById("docs-status"),
    imagesStatus: document.getElementById("images-status"),
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
    closeButtons: document.querySelectorAll(".close-button"),
  };

  const showStatus = (el, msg, isError = false) => {
    el.textContent = msg;
    el.className = `status-message ${isError ? "error" : "success"}`;
    setTimeout(() => {
      el.textContent = "";
      el.className = "status-message";
    }, 5000);
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return "0 Bytes";
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${
      ["Bytes", "KB", "MB", "GB"][i]
    }`;
  };

  const populateTable = (tbody, files, prefix) => {
    tbody.innerHTML = "";
    if (files.length > 0) {
      files.forEach((file) => {
        const isDoc = prefix === "docs/";
        const row = tbody.insertRow();
        row.innerHTML = `
                    <td><a href="${
                      file.url
                    }" target="_blank" title="Click to open in a new window">${
          file.name
        }</a></td>
                    <td>${new Date(file.lastModified).toLocaleString()}</td>
                    <td>${formatBytes(file.size)}</td>
                    <td class="actions">
                        ${
                          isDoc
                            ? `<button class="edit-btn" data-blob-name="${prefix}${file.name}">Edit</button>`
                            : ""
                        }
                        <button class="replace-btn" data-blob-name="${prefix}${
          file.name
        }">Replace</button>
                        <button class="delete-btn" data-blob-name="${prefix}${
          file.name
        }">Delete</button>
                    </td>
                `;
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="4">No files found.</td></tr>`;
    }
  };

  const fetchAndDisplayFiles = async () => {
    [elements.docsList, elements.imagesList].forEach(
      (el) => (el.innerHTML = '<tr><td colspan="4">Loading...</td></tr>')
    );
    try {
      const response = await fetch("/azure-storage/api/list");
      if (!response.ok) throw new Error("Failed to fetch file lists.");
      const { docs, images } = await response.json();
      populateTable(elements.docsList, docs, "docs/");
      populateTable(elements.imagesList, images, "images/");
    } catch (error) {
      showStatus(elements.docsStatus, error.message, true);
      showStatus(elements.imagesStatus, error.message, true);
    }
  };

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
      showStatus(elements.uploadStatus, result.message);
      showNotification("Files uploaded successfully!", "success");
      elements.uploadForm.reset();
      fetchAndDisplayFiles();
    } catch (error) {
      showStatus(elements.uploadStatus, error.message, true);
      showNotification(`Upload failed: ${error.message}`, "error");
    }
  });

  document.body.addEventListener("click", async (e) => {
    const { blobName } = e.target.dataset;
    if (!blobName) return;

    const statusEl = blobName.startsWith("docs/")
      ? elements.docsStatus
      : elements.imagesStatus;

    if (e.target.classList.contains("delete-btn")) {
      if (!confirm(`Delete ${blobName}?`)) return;
      showStatus(statusEl, `Deleting ${blobName}...`);
      try {
        const response = await fetch("/azure-storage/api/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blobName }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        showStatus(statusEl, result.message);
        fetchAndDisplayFiles();
      } catch (error) {
        showStatus(statusEl, error.message, true);
      }
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
    } else if (e.target.classList.contains("replace-btn")) {
      elements.replaceModal.style.display = "block";
      elements.replaceModalFilenameSpan.textContent = blobName;
      elements.replaceBlobNameInput.value = blobName;
      elements.replaceForm.reset();
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

  elements.replaceForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fileInput = document.getElementById("replace-file-input");
    if (!fileInput.files[0])
      return showStatus(elements.replaceStatus, "Please select a file.", true);

    const formData = new FormData(elements.replaceForm);
    formData.append("blobName", elements.replaceBlobNameInput.value);

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

  elements.closeButtons.forEach(
    (btn) =>
      (btn.onclick = () => (btn.closest(".modal").style.display = "none"))
  );
  window.onclick = (e) => {
    if (e.target.classList.contains("modal")) e.target.style.display = "none";
  };
  elements.refreshButton.addEventListener("click", fetchAndDisplayFiles);

  fetchAndDisplayFiles(); // Initial load
});
