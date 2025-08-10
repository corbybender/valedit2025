// public/js/pagetemplates.js
document.addEventListener("DOMContentLoaded", () => {
  // --- Constants and Selectors ---
  const FONT_SIZE_KEY = "valmontEditorFontSize";
  const G = (id) => document.getElementById(id);
  const els = {
    templateListContainer: G("template-list-container"),
    editorContainer: G("editor-container"),
    placeholderView: G("placeholder-view"),
    templateDeets: G("template-deets"),
    form: G("template-form"),
    templateId: G("template-id"),
    templateName: G("template-name"),
    templateCategory: G("template-category"),
    templateDescription: G("template-description"),
    addNewBtn: G("add-new-btn"),
    deleteBtn: G("delete-btn"),
    cancelBtn: G("cancel-btn"),
    categoryFilter: G("category-filter"),
    manageCategoriesBtn: G("manage-categories-btn"),
    categoryModal: G("category-modal"),
    closeModalBtn: G("close-modal-btn"),
    addCategoryBtn: G("add-category-btn"),
    newCategoryName: G("new-category-name"),
    categoryList: G("category-list"),
  };
  let htmlEditor;

  logger.info("🚀 PAGE TEMPLATES JS LOADING");
  logger.info(
    "Current working site:",
    typeof currentWorkingSite !== "undefined" ? currentWorkingSite : "undefined"
  );

  // --- Notification System ---
  let notificationCounter = 0;

  function showSimpleNotification(message, type = "success") {
    logger.info(`🚨 SIMPLE NOTIFICATION:`, message, type);

    // Create a very simple, guaranteed visible notification
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === "success" ? "#22c55e" : "#ef4444"};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      font-weight: 600;
      z-index: 2147483647;
      max-width: 400px;
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 14px;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);
    logger.info(`✅ Simple notification added to body`);

    // Remove after 5 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
        logger.info(`🗑️ Simple notification removed`);
      }
    }, 5000);
  }

  // Use unified notification system - showNotification is provided by notifications.js

  // --- Editor Initialization ---
  function initializeCodeMirror() {
    htmlEditor = CodeMirror.fromTextArea(G("template-html"), {
      mode: "xml",
      theme: "material-darker",
      lineNumbers: true,
      lineWrapping: true,
      viewportMargin: Infinity,
    });

    // Force CodeMirror to use available height with multiple attempts
    setTimeout(() => setCodeMirrorHeight(), 100);
    setTimeout(() => setCodeMirrorHeight(), 500);
    setTimeout(() => setCodeMirrorHeight(), 1000);
  }

  function setCodeMirrorHeight() {
    if (htmlEditor) {
      try {
        // Use viewport-based sizing for better responsiveness
        const viewportHeight = window.innerHeight;
        const editorContainer = document.querySelector(".editor-container");

        if (editorContainer && editorContainer.offsetParent) {
          // Get the position of the editor container relative to viewport
          const containerRect = editorContainer.getBoundingClientRect();
          let availableHeight = viewportHeight - containerRect.top - 120; // Leave margin at bottom

          // Minimum and maximum constraints
          availableHeight = Math.max(
            300,
            Math.min(availableHeight, viewportHeight * 0.8)
          );

          // Apply the height
          htmlEditor.setSize(null, availableHeight + "px");
          htmlEditor.refresh();

          // Force a re-render after a short delay
          setTimeout(() => {
            if (htmlEditor) {
              htmlEditor.refresh();
            }
          }, 50);

          logger.info("📐 CodeMirror height set to:", availableHeight + "px");
        } else {
          // Fallback if container not visible
          logger.info("⚠️ Editor container not visible, using fallback height");
          htmlEditor.setSize(null, "400px");
          htmlEditor.refresh();
        }
      } catch (error) {
        console.error("❌ Error setting CodeMirror height:", error);
        // Fallback height
        htmlEditor.setSize(null, "400px");
        htmlEditor.refresh();
      }
    }
  }

  // Alias function for compatibility
  function resizeCodeMirror() {
    setCodeMirrorHeight();
  }

  // --- UI State Management ---
  function showEditor(isNew = false) {
    els.placeholderView.classList.add("hidden");
    els.editorContainer.classList.remove("hidden");
    els.deleteBtn.classList.toggle("hidden", isNew);
  }

  function resetForm() {
    els.form.reset();
    els.templateId.value = "";
    htmlEditor.setValue("");
    document
      .querySelectorAll(".template-list-item.active")
      .forEach((item) => item.classList.remove("active"));

    // Hide template details form when no template is selected
    if (els.templateDeets) {
      els.templateDeets.classList.add("hidden");
      logger.info("📋 Template details form hidden");
    }
  }

  let allTemplates = [];

  async function loadAllTemplates() {
    try {
      logger.info("📋 Loading all page templates...");
      const response = await fetch("/api/pagetemplates/categorized");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const categories = await response.json();
      logger.info("📋 Loaded categories:", categories);

      // Flatten all templates
      allTemplates = [];
      categories.forEach((category) => {
        if (category.templates && category.templates.length > 0) {
          category.templates.forEach((template) => {
            allTemplates.push({
              ...template,
              categoryName: category.categoryName,
              categoryId: category.categoryId,
            });
          });
        }
      });

      loadCategoriesForFilter(categories);
      renderTemplateList();
    } catch (error) {
      console.error("❌ Failed to load templates:", error);
      showNotification("Failed to load templates.", "error");
    }
  }

  function loadCategoriesForFilter(categories) {
    els.categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.categoryId;
      option.textContent = category.categoryName;
      els.categoryFilter.appendChild(option);
    });
  }

  function renderTemplateList(filterCategoryId = "") {
    els.templateListContainer.innerHTML = "";

    const filteredTemplates = filterCategoryId
      ? allTemplates.filter(
          (template) => template.categoryId == filterCategoryId
        )
      : allTemplates;

    if (filteredTemplates.length === 0) {
      els.templateListContainer.innerHTML =
        '<p class="text-gray-500 p-4">No templates found.</p>';
      return;
    }

    filteredTemplates.forEach((template) => {
      const item = document.createElement("a");
      item.href = "#";
      item.className =
        "template-list-item block p-3 mb-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors";
      item.innerHTML = `
        <div class="font-medium text-gray-900">${template.Name}</div>
        <div class="text-sm text-gray-500">${template.categoryName}</div>
      `;
      item.dataset.id = template.ID;
      item.addEventListener("click", (e) => {
        e.preventDefault();
        handleTemplateSelect(template.ID);
      });
      els.templateListContainer.appendChild(item);
    });
  }

  // --- Data Fetching and Rendering ---
  async function loadCategoriesForDropdown() {
    try {
      logger.info("📂 Loading categories for dropdown...");
      const response = await fetch("/api/pagetemplates/categories");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const categories = await response.json();
      logger.info("📂 Loaded categories for dropdown:", categories);
      const select = els.templateCategory;
      select.innerHTML = '<option value="">-- Select a Category --</option>';
      categories.forEach((cat) => {
        const option = document.createElement("option");
        option.value = cat.ID;
        option.textContent = cat.Name;
        select.appendChild(option);
      });
    } catch (error) {
      console.error("❌ Failed to load categories for dropdown:", error);
    }
  }

  async function handleTemplateSelect(id) {
    try {
      logger.info("📝 Loading template:", id);
      const response = await fetch(`/api/pagetemplates/${id}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const template = await response.json();
      logger.info("📝 Loaded template:", template);

      resetForm();
      els.templateId.value = template.ID;
      els.templateName.value = template.Name;
      els.templateDescription.value = template.Description || "";
      els.templateCategory.value = template.CategoryID || "";
      htmlEditor.setValue(template.HtmlStructure || "");
      setTimeout(() => htmlEditor.refresh(), 1);

      document
        .querySelectorAll(".template-list-item.active")
        .forEach((item) => item.classList.remove("active"));
      document
        .querySelector(`.template-list-item[data-id='${id}']`)
        .classList.add("active");

      // Show template details form
      if (els.templateDeets) {
        els.templateDeets.classList.remove("hidden");
        logger.info("📋 Template details form shown");
      }

      showEditor();

      // Resize CodeMirror after showing editor
      setTimeout(() => {
        resizeCodeMirror();
      }, 50);
    } catch (error) {
      console.error("❌ Failed to load template details:", error);
      showNotification("Failed to load template details.", "error");
    }
  }

  // --- Category Modal Logic ---
  async function openCategoryModal() {
    await renderCategoryList();
    els.categoryModal.classList.remove("hidden");
  }

  function closeCategoryModal() {
    els.categoryModal.classList.add("hidden");
  }

  async function renderCategoryList() {
    try {
      logger.info("📂 Loading categories for modal...");
      const response = await fetch("/api/pagetemplates/categories");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const categories = await response.json();
      logger.info("📂 Loaded categories for modal:", categories);
      els.categoryList.innerHTML = "";
      if (categories.length > 0) {
        categories.forEach((cat) => {
          const div = document.createElement("div");
          div.className = "category-item";
          div.innerHTML = `
            <span class="flex-grow">${cat.Name}</span>
            <div class="category-item-actions space-x-1">
                <button data-id="${cat.ID}" class="edit-cat-btn bg-yellow-400 hover:bg-yellow-500 text-yellow-800 font-bold">Edit</button>
                <button data-id="${cat.ID}" class="delete-cat-btn bg-red-500 hover:bg-red-600 text-white font-bold">Del</button>
            </div>
          `;
          els.categoryList.appendChild(div);
        });
      } else {
        els.categoryList.innerHTML =
          '<p class="text-sm text-gray-500">No categories created yet.</p>';
      }
    } catch (error) {
      console.error("❌ Could not load categories:", error);
      showNotification("Could not load categories.", "error");
    }
  }

  async function handleAddCategory() {
    const name = els.newCategoryName.value.trim();
    if (!name) return;
    try {
      logger.info("➕ Adding category:", name);
      const response = await fetch("/api/pagetemplates/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to add category.");
      }
      els.newCategoryName.value = "";
      showNotification("Category added!", "success");
      await renderCategoryList();
      await loadCategoriesForDropdown();
      await loadAllTemplates();
    } catch (err) {
      console.error("❌ Error adding category:", err);
      showNotification(err.message, "error");
    }
  }

  async function handleEditCategory(id) {
    const newName = prompt("Enter the new name for this category:");
    if (!newName || !newName.trim()) return;
    try {
      logger.info("✏️ Editing category:", id, "to:", newName);
      const response = await fetch(`/api/pagetemplates/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update category.");
      }
      showNotification("Category updated!", "success");
      await renderCategoryList();
      await loadCategoriesForDropdown();
      await loadAllTemplates();
    } catch (err) {
      console.error("❌ Error editing category:", err);
      showNotification(err.message, "error");
    }
  }

  async function handleDeleteCategory(id) {
    if (!confirm("Are you sure?")) return;
    try {
      logger.info("🗑️ Deleting category:", id);
      const response = await fetch(`/api/pagetemplates/categories/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to delete category.");
      }
      showNotification("Category deleted!", "success");
      await renderCategoryList();
      await loadCategoriesForDropdown();
      await loadAllTemplates();
    } catch (err) {
      console.error("❌ Error deleting category:", err);
      showNotification(err.message, "error");
    }
  }

  // --- Event Handlers ---
  els.addNewBtn.addEventListener("click", () => {
    resetForm();
    showEditor(true);
    setTimeout(() => {
      resizeCodeMirror();
    }, 50);
  });

  els.cancelBtn.addEventListener("click", () => {
    resetForm();
    els.editorContainer.classList.add("hidden");
    els.placeholderView.classList.remove("hidden");
  });

  els.categoryFilter.addEventListener("change", (e) => {
    renderTemplateList(e.target.value);
  });

  // Add click listener to save button for debugging
  const saveButton = els.form.querySelector('button[type="submit"]');
  let saveClickCounter = 0;

  if (saveButton) {
    saveButton.addEventListener("click", (e) => {
      logger.info(`💾 SAVE BUTTON CLICKED! (Click #${saveClickCounter + 1})`);
      logger.info("Button event target:", e.target);
      logger.info("Form exists:", !!els.form);
    });
  }

  els.form.addEventListener("submit", async (e) => {
    try {
      saveClickCounter++;
      logger.info(
        `🚀 FORM SUBMIT EVENT TRIGGERED! (Click #${saveClickCounter})`
      );
      e.preventDefault();

      // Make sure CodeMirror content is saved to textarea
      if (htmlEditor) {
        htmlEditor.save();
        logger.info("💾 CodeMirror content saved to textarea");
      }

      const id = els.templateId.value;
      logger.info("📝 Template ID:", id);

      const payload = {
        Name: els.templateName.value,
        Description: els.templateDescription.value,
        HtmlStructure: htmlEditor.getValue(),
        CategoryID: els.templateCategory.value
          ? parseInt(els.templateCategory.value)
          : null,
      };

      logger.info("📦 Payload created:", payload);

      if (!payload.CategoryID) {
        logger.info("❌ No category selected");
        showSimpleNotification("❌ Category is a required field.", "error");
        return;
      }

      logger.info("💾 Starting save process...");

      const url = id ? `/api/pagetemplates/${id}` : `/api/pagetemplates`;
      const method = id ? "PUT" : "POST";

      logger.info("🌐 Request URL:", url, "Method:", method);

      try {
        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        logger.info(
          "📥 Response received:",
          response.status,
          response.statusText
        );

        const result = await response.json();
        logger.info("📄 Response data:", result);

        if (!response.ok) {
          throw new Error(result.error || "Failed to save template.");
        }

        logger.info("✅ SUCCESS - Reloading templates first...");

        await loadAllTemplates();

        // Only select template if this was a new template (no existing ID)
        if (!id && result.id) {
          logger.info("🎯 Selecting newly created template:", result.id);
          handleTemplateSelect(result.id);
        } else {
          logger.info("📝 Template updated, keeping current selection");
        }

        logger.info("✅ Now showing SIMPLE success notification...");
        showSimpleNotification("✅ Template saved successfully!", "success");
      } catch (fetchErr) {
        console.error("❌ FETCH ERROR in save process:", fetchErr);
        showSimpleNotification("❌ " + fetchErr.message, "error");
      }
    } catch (outerErr) {
      console.error("❌ OUTER ERROR in form submit:", outerErr);
      showSimpleNotification(
        "❌ Unexpected error: " + outerErr.message,
        "error"
      );
    }
  });

  els.deleteBtn.addEventListener("click", async () => {
    const id = els.templateId.value;
    if (!id || !confirm("Are you sure?")) return;
    try {
      logger.info("🗑️ Deleting template:", id);
      const response = await fetch(`/api/pagetemplates/${id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete template.");
      }

      logger.info("✅ Template deleted successfully!");
      showNotification("✅ Template deleted successfully!", "success");
      resetForm();
      els.editorContainer.classList.add("hidden");
      els.placeholderView.classList.remove("hidden");
      loadAllTemplates();
    } catch (err) {
      console.error("❌ Error deleting template:", err);
      showNotification("❌ " + err.message, "error");
    }
  });

  // Modal event handlers
  els.manageCategoriesBtn.addEventListener("click", openCategoryModal);
  els.closeModalBtn.addEventListener("click", closeCategoryModal);
  els.addCategoryBtn.addEventListener("click", handleAddCategory);
  els.categoryList.addEventListener("click", (e) => {
    const target = e.target;
    if (target.classList.contains("edit-cat-btn"))
      handleEditCategory(target.dataset.id);
    if (target.classList.contains("delete-cat-btn"))
      handleDeleteCategory(target.dataset.id);
  });

  // --- Window Resize Handler for CodeMirror ---
  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      logger.info("🔄 Window resized, updating CodeMirror height");
      resizeCodeMirror();
      // Double-check with another resize after a brief delay
      setTimeout(() => resizeCodeMirror(), 200);
    }, 150);
  });

  // --- Initial Load ---
  initializeCodeMirror();
  loadAllTemplates();
  loadCategoriesForDropdown();
});
