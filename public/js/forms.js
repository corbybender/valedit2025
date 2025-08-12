document.addEventListener("DOMContentLoaded", function () {
  let draggedElement = null;
  let formElements = [];
  let selectedElementId = null;
  let elementIdCounter = 0;
  let currentFormId = null;
  let isEditing = false;
  let emailSettings = {
    sendEmailOnSubmission: true,
    emailRecipients: "admin@example.com",
    sendAutoresponse: true,
  };

  // Get DOM elements (some may not exist if not in builder tab)
  let dropZone,
    draggableElements,
    previewBtn,
    saveBtn,
    clearBtn,
    previewModal,
    closePreview,
    formName,
    propertiesPanel;

  function initializeBuilderElements() {
    dropZone = document.getElementById("dropZone");
    draggableElements = document.querySelectorAll(".form-element");
    previewBtn = document.getElementById("previewBtn");
    saveBtn = document.getElementById("saveBtn");
    clearBtn = document.getElementById("clearBtn");
    previewModal = document.getElementById("previewModal");
    closePreview = document.getElementById("closePreview");
    formName = document.getElementById("formName");
    propertiesPanel = document.getElementById("propertiesPanel");

    // Initialize builder elements

    // Initialize drag and drop for form elements
    if (draggableElements && draggableElements.length > 0) {
      console.log("Initializing drag and drop for", draggableElements.length, "elements");
      draggableElements.forEach((element) => {
        // Remove any existing event listeners to prevent duplicates
        element.removeEventListener("dragstart", handleDragStart);
        element.removeEventListener("dragend", handleDragEnd);

        // Add event listeners
        element.addEventListener("dragstart", handleDragStart);
        element.addEventListener("dragend", handleDragEnd);
        console.log("Drag handlers attached to element:", element.dataset.type);
      });
    } else {
      console.warn("No draggable elements found or draggableElements is null");
    }

    // Drop zone events
    if (dropZone) {
      // Remove any existing event listeners to prevent duplicates
      dropZone.removeEventListener("dragover", handleDragOver);
      dropZone.removeEventListener("dragenter", handleDragEnter);
      dropZone.removeEventListener("dragleave", handleDragLeave);
      dropZone.removeEventListener("drop", handleDrop);

      // Add event listeners
      dropZone.addEventListener("dragover", handleDragOver);
      dropZone.addEventListener("dragenter", handleDragEnter);
      dropZone.addEventListener("dragleave", handleDragLeave);
      dropZone.addEventListener("drop", handleDrop);
    }

    // Button events
    if (previewBtn) {
      previewBtn.removeEventListener("click", showPreview);
      previewBtn.addEventListener("click", showPreview);
    }
    if (saveBtn) {
      saveBtn.removeEventListener("click", saveForm);
      saveBtn.addEventListener("click", saveForm);
    }
    if (clearBtn) {
      clearBtn.removeEventListener("click", clearForm);
      clearBtn.addEventListener("click", clearForm);
    }
    if (closePreview) {
      closePreview.removeEventListener("click", hidePreview);
      closePreview.addEventListener("click", hidePreview);
    }
    if (formName) {
      formName.removeEventListener("input", updateFormName);
      formName.addEventListener("input", updateFormName);
    }
  }

  // Initialize based on current tab
  function initializeCurrentTab() {
    const listTab = document.getElementById("formsListContent");
    const builderTab = document.getElementById("formBuilderContent");

    if (listTab && listTab.classList.contains("active")) {
      // We're on forms list tab
      loadExistingForms();
    } else if (builderTab && builderTab.classList.contains("active")) {
      // We're on builder tab
      setTimeout(() => {
        initializeBuilderElements();
        renderFormElements();
        updateSaveButtonText();
        showDefaultPropertiesPanel();
      }, 100);
    } else {
      // Default to forms list
      if (listTab) {
        listTab.classList.add("active");
        loadExistingForms();
      }
    }
  }

  // Global tab switching handler
  window.switchToBuilder = function () {
    // Don't call switchTab here to avoid loops - assume tab is already switched
    setTimeout(() => {
      initializeBuilderElements();
      renderFormElements();
      updateSaveButtonText();
      showDefaultPropertiesPanel();
    }, 100);
  };

  // Load existing forms functionality
  async function loadExistingForms() {
    try {
      const response = await fetch("/content/forms/api");
      const result = await response.json();

      if (result.success && result.forms && result.forms.length > 0) {
        renderFormsGrid(result.forms);
      } else {
        showEmptyState();
      }
    } catch (error) {
      console.error("Error loading existing forms:", error);
      showEmptyState();
    }
  }

  function renderFormsGrid(forms) {
    const formsGrid = document.getElementById("formsGrid");
    const emptyState = document.getElementById("emptyState");

    if (!formsGrid) return;

    if (forms.length === 0) {
      showEmptyState();
      return;
    }

    emptyState.classList.add("hidden");
    formsGrid.classList.remove("hidden");

    formsGrid.innerHTML = forms.map((form) => createFormCard(form)).join("");

    // Add event listeners to form cards
    forms.forEach((form) => {
      const card = formsGrid.querySelector(`[data-form-id="${form.FormID}"]`);
      if (card) {
        // Edit button
        const editBtn = card.querySelector(".edit-form-btn");
        if (editBtn) {
          editBtn.addEventListener("click", () => editForm(form.FormID));
        }

        // Delete button
        const deleteBtn = card.querySelector(".delete-form-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", () => deleteForm(form.FormID));
        }

        // Publish toggle button
        const publishBtn = card.querySelector(".publish-toggle-btn");
        if (publishBtn) {
          publishBtn.addEventListener("click", () =>
            togglePublishForm(form.FormID, !form.IsPublished)
          );
        }

        // View submissions button
        const submissionsBtn = card.querySelector(".view-submissions-btn");
        if (submissionsBtn) {
          submissionsBtn.addEventListener("click", () =>
            viewFormSubmissions(form.FormID)
          );
        }
      }
    });
  }

  function createFormCard(form) {
    const template = document.getElementById("formCardTemplate");
    if (!template) return "";

    const clone = template.content.cloneNode(true);
    const card = clone.querySelector(".form-card");

    // Set data attribute
    card.setAttribute("data-form-id", form.FormID);

    // Set form details
    card.querySelector(".form-title").textContent =
      form.FormName || "Untitled Form";
    card.querySelector(".form-description").textContent =
      form.Description || "No description provided";
    card.querySelector(".form-submissions").textContent =
      form.SubmissionCount || 0;
    card.querySelector(".form-date").textContent = new Date(
      form.CreatedAt
    ).toLocaleDateString();

    // Set status badge
    const statusBadge = card.querySelector(".form-status-badge");
    const publishText = card.querySelector(".publish-text");

    if (form.IsPublished) {
      statusBadge.textContent = "Published";
      statusBadge.className =
        "form-status-badge px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800";
      publishText.textContent = "Unpublish";
    } else {
      statusBadge.textContent = "Draft";
      statusBadge.className =
        "form-status-badge px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800";
      publishText.textContent = "Publish";
    }

    return card.outerHTML;
  }

  function showEmptyState() {
    const formsGrid = document.getElementById("formsGrid");
    const emptyState = document.getElementById("emptyState");

    if (formsGrid && emptyState) {
      formsGrid.classList.add("hidden");
      emptyState.classList.remove("hidden");
    }
  }

  // Form actions
  async function editForm(formId) {
    try {
      const response = await fetch(`/content/forms/api/${formId}`);
      const result = await response.json();

      if (result.success && result.form) {
        loadFormForEditing(result.form);
        window.switchTab("formBuilder");
        setTimeout(() => {
          initializeBuilderElements();
        }, 100);
      } else {
        showNotification(result.error || "Failed to load form", "error");
      }
    } catch (error) {
      console.error("Error loading form for editing:", error);
      showNotification("Failed to load form for editing", "error");
    }
  }

  async function deleteForm(formId) {
    showConfirmation(
      "Are you sure you want to delete this form? This action cannot be undone.",
      async () => {
        try {
          const response = await fetch(`/content/forms/api/${formId}`, {
            method: "DELETE",
          });

          const result = await response.json();

          if (result.success) {
            showNotification("Form deleted successfully", "success");
            loadExistingForms(); // Refresh the list
          } else {
            showNotification(result.error || "Failed to delete form", "error");
          }
        } catch (error) {
          console.error("Error deleting form:", error);
          showNotification("Failed to delete form", "error");
        }
      }
    );
  }

  async function togglePublishForm(formId, publish) {
    try {
      const response = await fetch(`/content/forms/api/${formId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPublished: publish,
        }),
      });

      const result = await response.json();

      if (result.success) {
        showNotification(
          publish
            ? "Form published successfully"
            : "Form unpublished successfully",
          "success"
        );
        loadExistingForms(); // Refresh the list
      } else {
        showNotification(result.error || "Failed to update form", "error");
      }
    } catch (error) {
      console.error("Error updating form:", error);
      showNotification("Failed to update form", "error");
    }
  }

  async function viewFormSubmissions(formId) {
    try {
      const response = await fetch(`/content/forms/api/${formId}/submissions`);
      const result = await response.json();

      if (result.success && result.submissions) {
        showSubmissionsModal(formId, result.submissions);
      } else {
        showNotification(result.error || "Failed to load submissions", "error");
      }
    } catch (error) {
      console.error("Error loading form submissions:", error);
      showNotification("Failed to load form submissions", "error");
    }
  }

  function showSubmissionsModal(formId, submissions) {
    // Create modal overlay
    const modalId = `submissions_modal_${formId}`;
    const modalDiv = document.createElement("div");
    modalDiv.id = modalId;
    modalDiv.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4";
    modalDiv.tabIndex = -1; // Make focusable for keyboard events

    // Format submissions data for display
    const submissionsHtml =
      submissions.length > 0
        ? submissions
            .map((submission) => {
              const submittedDate = new Date(
                submission.SubmittedAt
              ).toLocaleString();
              const submissionData = submission.SubmissionData
                ? Object.entries(submission.SubmissionData)
                    .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                    .join("<br>")
                : "No data";

              return `
            <tr class="border-b border-gray-200 hover:bg-gray-50">
              <td class="px-4 py-3 text-sm text-gray-600">${
                submission.UserIP || "N/A"
              }</td>
              <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title="${
                submission.UserAgent || "N/A"
              }">${submission.UserAgent || "N/A"}</td>
              <td class="px-4 py-3 text-sm text-gray-600 max-w-xs truncate" title="${
                submission.ReferrerUrl || "N/A"
              }">${submission.ReferrerUrl || "N/A"}</td>
              <td class="px-4 py-3 text-sm text-gray-900">${submittedDate}</td>
              <td class="px-4 py-3">
                <span class="px-2 py-1 text-xs font-medium rounded-full ${
                  submission.Status === "processed"
                    ? "bg-green-100 text-green-800"
                    : submission.Status === "pending"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-gray-100 text-gray-800"
                }">${submission.Status || "pending"}</span>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600">${
                submission.Notes || ""
              }</td>
              <td class="px-4 py-3 text-sm text-gray-900">
                <div class="max-w-xs overflow-hidden">
                  <details class="cursor-pointer">
                    <summary class="text-blue-600 hover:text-blue-800">View Data</summary>
                    <div class="mt-2 p-2 bg-gray-50 rounded text-xs">${submissionData}</div>
                  </details>
                </div>
              </td>
            </tr>
          `;
            })
            .join("")
        : '<tr><td colspan="7" class="px-4 py-8 text-center text-gray-500">No submissions found</td></tr>';

    modalDiv.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div class="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 class="text-lg font-medium text-gray-900">Form Submissions</h3>
          <button onclick="closeSubmissionsModal('${modalId}')" 
                  class="text-gray-400 hover:text-gray-600 focus:outline-none">
            <i class="fas fa-times text-xl"></i>
          </button>
        </div>
        
        <div class="overflow-auto max-h-[calc(90vh-120px)]">
          <table class="min-w-full divide-y divide-gray-200">
            <thead class="bg-gray-50 sticky top-0">
              <tr>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Agent</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted At</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submission Data</th>
              </tr>
            </thead>
            <tbody class="bg-white divide-y divide-gray-200">
              ${submissionsHtml}
            </tbody>
          </table>
        </div>
        
        <div class="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div class="flex items-center justify-between">
            <p class="text-sm text-gray-600">
              Showing ${submissions.length} submission${
      submissions.length !== 1 ? "s" : ""
    }
            </p>
            <button onclick="closeSubmissionsModal('${modalId}')" 
                    class="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
              Close
            </button>
          </div>
        </div>
      </div>
    `;

    // Add keyboard support for closing modal
    modalDiv.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        closeSubmissionsModal(modalId);
      }
    });

    // Close modal when clicking outside
    modalDiv.addEventListener("click", function (e) {
      if (e.target === modalDiv) {
        closeSubmissionsModal(modalId);
      }
    });

    // Add to DOM and focus for keyboard support
    document.body.appendChild(modalDiv);
    modalDiv.focus();
  }

  // Global function to close submissions modal
  window.closeSubmissionsModal = function (modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.remove();
    }
  };

  function loadFormForEditing(form) {
    // Set form data
    currentFormId = form.FormID;
    isEditing = true;

    // Will be set when builder elements are initialized
    setTimeout(() => {
      if (formName) {
        formName.value = form.FormName;
      }

      // Load form elements
      if (form.FormElements && form.FormElements.elements) {
        formElements = form.FormElements.elements.map((element) => {
          elementIdCounter = Math.max(
            elementIdCounter,
            parseInt(element.id.split("_")[1]) || 0
          );
          return element;
        });
      }

      // Load email settings
      if (form.FormSettings) {
        const settings =
          typeof form.FormSettings === "string"
            ? JSON.parse(form.FormSettings)
            : form.FormSettings;
        if (settings.notifications) {
          emailSettings = {
            sendEmailOnSubmission:
              settings.notifications.sendEmailOnSubmission || false,
            emailRecipients: Array.isArray(
              settings.notifications.emailRecipients
            )
              ? settings.notifications.emailRecipients.join(", ")
              : settings.notifications.emailRecipients || "admin@example.com",
            sendAutoresponse: settings.notifications.sendAutoresponse || false,
          };
        }
      }

      selectedElementId = null;
      renderFormElements();
      updateSaveButtonForEdit();
      showDefaultPropertiesPanel();

      showNotification(`Form "${form.FormName}" loaded for editing`, "success");
    }, 200);
  }

  // Drag and Drop Functions
  function handleDragStart(e) {
    console.log("Drag started for element:", e.target.dataset.type);
    draggedElement = e.target;
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData("text/html", e.target.outerHTML);
  }

  function handleDragEnd(e) {
    draggedElement = null;
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }

  function handleDragEnter(e) {
    e.preventDefault();
    if (dropZone) dropZone.classList.add("drag-over");
  }

  function handleDragLeave(e) {
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    console.log("Drop event triggered");
    if (dropZone) dropZone.classList.remove("drag-over");

    if (draggedElement) {
      const elementType = draggedElement.dataset.type;
      console.log("Adding form element of type:", elementType);
      addFormElement(elementType);
    } else {
      console.warn("No dragged element found during drop");
    }
  }

  // Form Element Management
  function addFormElement(type) {
    const elementId = `element_${++elementIdCounter}`;
    const element = createFormElement(type, elementId);

    formElements.push(element);
    renderFormElements();

    // Auto-select the newly added element
    selectElement(elementId);
  }

  function createFormElement(type, id) {
    const element = {
      id: id,
      type: type,
      properties: getDefaultProperties(type),
    };
    return element;
  }

  function getDefaultProperties(type) {
    const defaults = {
      text: {
        label: "Text Input",
        placeholder: "Enter text...",
        required: false,
        name: `text_${elementIdCounter}`,
      },
      textarea: {
        label: "Textarea",
        placeholder: "Enter your message...",
        required: false,
        rows: 4,
        name: `textarea_${elementIdCounter}`,
      },
      email: {
        label: "Email Address",
        placeholder: "Enter email...",
        required: true,
        name: `email_${elementIdCounter}`,
      },
      select: {
        label: "Select Option",
        required: false,
        options: "Option 1\nOption 2\nOption 3",
        name: `select_${elementIdCounter}`,
      },
      checkbox: {
        label: "Checkbox",
        text: "I agree to the terms",
        required: false,
        name: `checkbox_${elementIdCounter}`,
      },
      radio: {
        label: "Radio Group",
        required: false,
        options: "Option 1\nOption 2\nOption 3",
        name: `radio_${elementIdCounter}`,
      },
      submit: {
        text: "Submit Form",
        buttonClass: "bg-blue-600 hover:bg-blue-700 text-white",
      },
    };
    return defaults[type] || {};
  }

  function renderFormElements() {
    if (!dropZone) return;

    if (formElements.length === 0) {
      dropZone.innerHTML = `
        <div class="text-center text-gray-500">
          <i class="fas fa-mouse-pointer text-4xl mb-4"></i>
          <p class="text-lg">Drag form elements here to build your form</p>
          <p class="text-sm mt-2">Elements will appear in the order you drop them</p>
        </div>
      `;
      return;
    }

    dropZone.innerHTML = formElements
      .map((element) => renderFormElement(element))
      .join("");

    // Add event listeners to dropped elements
    formElements.forEach((element) => {
      const elementNode = document.getElementById(element.id);
      if (elementNode) {
        elementNode.addEventListener("click", () => selectElement(element.id));

        // Add delete button functionality
        const deleteBtn = elementNode.querySelector(".delete-btn");
        if (deleteBtn) {
          deleteBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            deleteElement(element.id);
          });
        }
      }
    });
  }

  function renderFormElement(element) {
    const props = element.properties;
    let html = `<div id="${element.id}" class="dropped-element ${
      selectedElementId === element.id ? "ring-2 ring-blue-500" : ""
    }" data-type="${element.type}">`;

    // Element controls
    html += `
      <div class="element-controls">
        <button class="delete-btn text-red-500 hover:text-red-700 ml-2">
          <i class="fas fa-trash text-sm"></i>
        </button>
      </div>
    `;

    switch (element.type) {
      case "text":
        html += `
          <label class="block text-sm font-medium text-gray-700 mb-2">${
            props.label
          }</label>
          <input type="text" placeholder="${props.placeholder}" ${
          props.required ? "required" : ""
        } 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        `;
        break;
      case "textarea":
        html += `
          <label class="block text-sm font-medium text-gray-700 mb-2">${
            props.label
          }</label>
          <textarea placeholder="${props.placeholder}" rows="${props.rows}" ${
          props.required ? "required" : ""
        }
                    class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
        `;
        break;
      case "email":
        html += `
          <label class="block text-sm font-medium text-gray-700 mb-2">${
            props.label
          }</label>
          <input type="email" placeholder="${props.placeholder}" ${
          props.required ? "required" : ""
        } 
                 class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        `;
        break;
      case "select":
        const options = props.options.split("\n");
        html += `
          <label class="block text-sm font-medium text-gray-700 mb-2">${
            props.label
          }</label>
          <select ${props.required ? "required" : ""} 
                  class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Please select...</option>
            ${options
              .map(
                (option) =>
                  `<option value="${option.trim()}">${option.trim()}</option>`
              )
              .join("")}
          </select>
        `;
        break;
      case "checkbox":
        html += `
          <div class="flex items-center">
            <input type="checkbox" ${props.required ? "required" : ""} 
                   class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
            <label class="ml-2 text-sm text-gray-700">${props.text}</label>
          </div>
        `;
        break;
      case "radio":
        const radioOptions = props.options.split("\n");
        html += `
          <fieldset>
            <legend class="block text-sm font-medium text-gray-700 mb-2">${
              props.label
            }</legend>
            ${radioOptions
              .map(
                (option, index) => `
              <div class="flex items-center mb-2">
                <input type="radio" name="${
                  props.name
                }" value="${option.trim()}" ${
                  props.required && index === 0 ? "required" : ""
                }
                       class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300" />
                <label class="ml-2 text-sm text-gray-700">${option.trim()}</label>
              </div>
            `
              )
              .join("")}
          </fieldset>
        `;
        break;
      case "submit":
        html += `
          <button type="submit" class="px-6 py-3 rounded-lg font-medium transition duration-200 ${props.buttonClass}">
            ${props.text}
          </button>
        `;
        break;
    }

    html += "</div>";
    return html;
  }

  function selectElement(elementId) {
    selectedElementId = elementId;
    renderFormElements();
    showElementProperties(elementId);
  }

  function showFormSettings() {
    selectedElementId = null;
    renderFormElements();
    showFormSettingsPanel();
  }

  // Make functions globally accessible
  window.showFormSettings = showFormSettings;
  window.loadExistingForms = loadExistingForms;

  function showDefaultPropertiesPanel() {
    if (!propertiesPanel) return;

    // Don't reset selectedElementId here - it interferes with drag and drop
    propertiesPanel.innerHTML = `
      <div class="text-center">
        <div class="text-gray-400 mb-4">
          <i class="fas fa-mouse-pointer text-3xl"></i>
        </div>
        <p class="text-gray-500 text-sm mb-4">Select an element to edit its properties</p>
        <button onclick="showFormSettings()" class="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition text-sm">
          <i class="fas fa-cog mr-1"></i> Form Settings
        </button>
      </div>
    `;
  }

  function showElementProperties(elementId) {
    if (!propertiesPanel) return;

    const element = formElements.find((el) => el.id === elementId);
    if (!element) return;

    const props = element.properties;
    let html = `<h4 class="font-medium text-gray-800 mb-3">${
      element.type.charAt(0).toUpperCase() + element.type.slice(1)
    } Properties</h4>`;

    // Generate property inputs based on element type
    switch (element.type) {
      case "text":
      case "email":
      case "textarea":
        html += `
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Label</label>
            <input type="text" value="${
              props.label || ""
            }" data-element-id="${elementId}" data-property="label"
                   class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          </div>
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Placeholder</label>
            <input type="text" value="${
              props.placeholder || ""
            }" data-element-id="${elementId}" data-property="placeholder"
                   class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          </div>
          <div class="mb-3">
            <label class="flex items-center">
              <input type="checkbox" ${
                props.required ? "checked" : ""
              } data-element-id="${elementId}" data-property="required"
                     class="property-checkbox mr-2">
              <span class="text-xs">Required</span>
            </label>
          </div>
        `;
        if (element.type === "textarea") {
          html += `
            <div class="mb-3">
              <label class="block text-xs font-medium text-gray-600 mb-1">Rows</label>
              <input type="number" value="${
                props.rows || 4
              }" min="2" max="10" data-element-id="${elementId}" data-property="rows"
                     class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
            </div>
          `;
        }
        break;
      case "select":
      case "radio":
        html += `
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Label</label>
            <input type="text" value="${
              props.label || ""
            }" data-element-id="${elementId}" data-property="label"
                   class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          </div>
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Options (one per line)</label>
            <textarea data-element-id="${elementId}" data-property="options" rows="4"
                      class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">${
                        props.options || ""
                      }</textarea>
          </div>
          <div class="mb-3">
            <label class="flex items-center">
              <input type="checkbox" ${
                props.required ? "checked" : ""
              } data-element-id="${elementId}" data-property="required"
                     class="property-checkbox mr-2">
              <span class="text-xs">Required</span>
            </label>
          </div>
        `;
        break;
      case "checkbox":
        html += `
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Label</label>
            <input type="text" value="${
              props.label || ""
            }" data-element-id="${elementId}" data-property="label"
                   class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          </div>
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Text</label>
            <input type="text" value="${
              props.text || ""
            }" data-element-id="${elementId}" data-property="text"
                   class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          </div>
          <div class="mb-3">
            <label class="flex items-center">
              <input type="checkbox" ${
                props.required ? "checked" : ""
              } data-element-id="${elementId}" data-property="required"
                     class="property-checkbox mr-2">
              <span class="text-xs">Required</span>
            </label>
          </div>
        `;
        break;
      case "submit":
        html += `
          <div class="mb-3">
            <label class="block text-xs font-medium text-gray-600 mb-1">Button Text</label>
            <input type="text" value="${
              props.text || ""
            }" data-element-id="${elementId}" data-property="text"
                   class="property-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          </div>
        `;
        break;
    }

    propertiesPanel.innerHTML = html;

    // Add event listeners to property inputs
    const propertyInputs = propertiesPanel.querySelectorAll(".property-input");
    propertyInputs.forEach((input) => {
      // Use 'blur' event so it only updates when user finishes editing
      input.addEventListener("blur", handlePropertyChange);
      // Also listen for Enter key
      input.addEventListener("keypress", function (e) {
        if (e.key === "Enter") {
          e.target.blur(); // This will trigger the blur event
        }
      });
    });

    const propertyCheckboxes =
      propertiesPanel.querySelectorAll(".property-checkbox");
    propertyCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", handlePropertyChange);
    });
  }

  function handlePropertyChange(e) {
    const elementId = e.target.dataset.elementId;
    const property = e.target.dataset.property;
    let value;

    if (e.target.type === "checkbox") {
      value = e.target.checked;
    } else if (e.target.type === "number") {
      value = parseInt(e.target.value) || 0;
    } else {
      value = e.target.value;
    }

    updateElementProperty(elementId, property, value);
  }

  function showFormSettingsPanel() {
    if (!propertiesPanel) return;

    let html = `<h4 class="font-medium text-gray-800 mb-3">Form Settings</h4>`;

    // Email notification settings
    html += `
      <div class="mb-4 p-3 bg-blue-50 rounded-lg border">
        <h5 class="font-medium text-blue-800 mb-3">Email Notifications</h5>
        
        <div class="mb-3">
          <label class="flex items-center">
            <input type="checkbox" ${
              emailSettings.sendEmailOnSubmission ? "checked" : ""
            } 
                   data-setting="sendEmailOnSubmission"
                   class="email-setting-checkbox mr-2">
            <span class="text-sm">Send email on form submission</span>
          </label>
        </div>

        <div class="mb-3">
          <label class="block text-xs font-medium text-gray-600 mb-1">Email Recipients (comma-separated)</label>
          <input type="text" value="${emailSettings.emailRecipients}" 
                 data-setting="emailRecipients"
                 placeholder="admin@example.com, user@example.com"
                 class="email-setting-input w-full px-2 py-1 text-sm border border-gray-300 rounded">
          <p class="text-xs text-gray-500 mt-1">Recipients who will receive form submissions</p>
        </div>

        <div class="mb-3">
          <label class="flex items-center">
            <input type="checkbox" ${
              emailSettings.sendAutoresponse ? "checked" : ""
            } 
                   data-setting="sendAutoresponse"
                   class="email-setting-checkbox mr-2">
            <span class="text-sm">Send autoresponse to submitter</span>
          </label>
          <p class="text-xs text-gray-500 mt-1">Automatically thank the person who submitted the form</p>
        </div>
      </div>

      <div class="mb-4">
        <button onclick="showFormSettings()" class="w-full px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition text-sm">
          <i class="fas fa-cog mr-1"></i> Form Settings
        </button>
      </div>
    `;

    propertiesPanel.innerHTML = html;

    // Add event listeners for email settings
    const emailCheckboxes = propertiesPanel.querySelectorAll(
      ".email-setting-checkbox"
    );
    emailCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", handleEmailSettingChange);
    });

    const emailInputs = propertiesPanel.querySelectorAll(
      ".email-setting-input"
    );
    emailInputs.forEach((input) => {
      input.addEventListener("input", handleEmailSettingChange);
    });
  }

  // Make functions globally accessible
  window.updateElementProperty = function (elementId, property, value) {
    const element = formElements.find((el) => el.id === elementId);
    if (element) {
      element.properties[property] = value;
      // Only re-render the form elements in the drop zone, not the properties panel
      renderFormElements();
      // Don't re-render the properties panel to avoid losing focus
    }
  };

  function handleEmailSettingChange(e) {
    const setting = e.target.dataset.setting;
    let value;

    if (e.target.type === "checkbox") {
      value = e.target.checked;
    } else {
      value = e.target.value;
    }

    emailSettings[setting] = value;
  }

  // Keep the global function for backward compatibility
  window.updateEmailSetting = function (setting, value) {
    emailSettings[setting] = value;
    showFormSettingsPanel();
  };

  function deleteElement(elementId) {
    formElements = formElements.filter((el) => el.id !== elementId);
    if (selectedElementId === elementId) {
      selectedElementId = null;
      showDefaultPropertiesPanel();
    }
    renderFormElements();
  }

  function clearForm() {
    showConfirmation(
      "Are you sure you want to clear the form? This action cannot be undone.",
      () => {
        formElements = [];
        selectedElementId = null;
        elementIdCounter = 0;
        showDefaultPropertiesPanel();
        renderFormElements();
      }
    );
  }

  function showPreview() {
    const previewContent = document.getElementById("previewContent");

    if (formElements.length === 0) {
      previewContent.innerHTML =
        '<p class="text-gray-500 text-center">No form elements to preview</p>';
    } else {
      let html = `<h2 class="text-xl font-bold mb-4">${
        formName ? formName.value : "Untitled Form"
      }</h2>`;
      html += '<form class="space-y-4">';
      html += formElements
        .map((element) =>
          renderFormElement(element).replace(/dropped-element[^"]*/, "mb-4")
        )
        .join("");
      html += "</form>";
      previewContent.innerHTML = html;
    }

    if (previewModal) previewModal.classList.remove("hidden");
  }

  function hidePreview() {
    if (previewModal) previewModal.classList.add("hidden");
  }

  function updateFormName() {
    // Form name updated
  }

  async function saveForm() {
    if (formElements.length === 0) {
      showNotification(
        "Please add at least one form element before saving.",
        "error"
      );
      return;
    }

    if (!formName) {
      showNotification("Form name input not found.", "error");
      return;
    }

    const formData = {
      name: formName.value || "Untitled Form",
      description: "",
      elements: formElements,
      settings: {
        ui: {
          submitButtonText: "Submit Form",
          submitButtonClass: "bg-blue-600 hover:bg-blue-700 text-white",
        },
        notifications: {
          sendEmailOnSubmission: emailSettings.sendEmailOnSubmission,
          emailRecipients: emailSettings.emailRecipients
            .split(",")
            .map((email) => email.trim())
            .filter((email) => email),
          sendAutoresponse: emailSettings.sendAutoresponse,
        },
      },
      successMessage: "Thank you for your submission!",
      errorMessage: "There was an error processing your submission.",
      isPublished: false,
    };

    try {
      // Show loading state
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';
      }

      const url =
        isEditing && currentFormId
          ? `/content/forms/api/${currentFormId}`
          : "/content/forms/api";
      const method = isEditing && currentFormId ? "PUT" : "POST";

      const response = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        showNotification(result.message, "success");
        // Store the form ID for future updates
        if (result.form && result.form.FormID) {
          currentFormId = result.form.FormID;
          isEditing = true;
          updateSaveButtonForEdit();
        }
      } else {
        showNotification(result.error || "Failed to save form", "error");
      }
    } catch (error) {
      console.error("Error saving form:", error);
      showNotification("Failed to save form. Please try again.", "error");
    } finally {
      // Restore button state
      if (saveBtn) {
        saveBtn.disabled = false;
        updateSaveButtonText();
      }
    }
  }

  // Helper functions for save button states
  function updateSaveButtonForEdit() {
    if (saveBtn)
      saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Form';
  }

  function updateSaveButtonText() {
    if (!saveBtn) return;
    if (isEditing) {
      saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Update Form';
    } else {
      saveBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Form';
    }
  }

  window.createNewForm = function () {
    if (
      formElements.length > 0 ||
      (formName && formName.value !== "Untitled Form")
    ) {
      showConfirmation(
        "Are you sure you want to start a new form? Any unsaved changes will be lost.",
        () => {
          createNewFormAction();
        }
      );
    } else {
      createNewFormAction();
    }
  };

  function createNewFormAction() {
    // Reset form state
    formElements = [];
    selectedElementId = null;
    elementIdCounter = 0;
    currentFormId = null;
    isEditing = false;

    // Reset email settings
    emailSettings = {
      sendEmailOnSubmission: true,
      emailRecipients: "admin@example.com",
      sendAutoresponse: true,
    };

    window.switchTab("formBuilder");
    setTimeout(() => {
      initializeBuilderElements();
      if (formName) formName.value = "Untitled Form";
      showDefaultPropertiesPanel();
      renderFormElements();
      updateSaveButtonText();
    }, 100);
  }

  // Use the global notification system directly

  // Utility function to show confirmation dialogs using notifications
  function showConfirmation(message, onConfirm, onCancel = null) {
    // For now, use a simple approach with notifications
    // Show a warning notification first
    if (typeof window.showNotification === "function") {
      window.showNotification(message, "warning", { timeout: 5000 });
    }

    // Create a simple confirmation dialog
    const confirmationId = `confirm_${Date.now()}`;
    const confirmationDiv = document.createElement("div");
    confirmationDiv.id = confirmationId;
    confirmationDiv.className =
      "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50";
    confirmationDiv.innerHTML = `
      <div class="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <i class="fas fa-exclamation-triangle text-yellow-500 text-2xl"></i>
          </div>
          <div class="ml-4 flex-1">
            <h3 class="text-lg font-medium text-gray-900 mb-2">Confirm Action</h3>
            <p class="text-sm text-gray-600 mb-4">${message}</p>
            <div class="flex space-x-3">
              <button onclick="handleConfirmation('${confirmationId}', true)" 
                      class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                Yes, Continue
              </button>
              <button onclick="handleConfirmation('${confirmationId}', false)" 
                      class="px-4 py-2 bg-gray-300 text-gray-700 text-sm font-medium rounded hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Store the callbacks
    window.confirmationCallbacks = window.confirmationCallbacks || {};
    window.confirmationCallbacks[confirmationId] = { onConfirm, onCancel };

    // Add to DOM
    document.body.appendChild(confirmationDiv);
  }

  // Global handler for confirmation responses
  window.handleConfirmation = function (confirmationId, confirmed) {
    const callbacks = window.confirmationCallbacks?.[confirmationId];
    if (callbacks) {
      if (confirmed && callbacks.onConfirm) {
        callbacks.onConfirm();
      } else if (!confirmed && callbacks.onCancel) {
        callbacks.onCancel();
      }

      // Clean up
      delete window.confirmationCallbacks[confirmationId];
      const element = document.getElementById(confirmationId);
      if (element) {
        element.remove();
      }
    }
  };

  // Check for URL parameters to handle direct links
  function checkForUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const editFormId = urlParams.get('edit');
    
    if (editFormId) {
      console.log('Edit form ID found in URL:', editFormId);
      // Auto-load the form for editing after a short delay to ensure DOM is ready
      setTimeout(() => {
        editForm(parseInt(editFormId));
      }, 500);
    }
  }

  // Check for URL parameters
  checkForUrlParameters();

  // Initialize based on current state
  initializeCurrentTab();
  loadExistingForms();
});
