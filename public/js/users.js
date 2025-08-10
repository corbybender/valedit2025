document.addEventListener("DOMContentLoaded", function () {
  // --- DOM Element References ---
  const createUserBtn = document.getElementById("createUserBtn");
  const userModal = document.getElementById("userModal");
  const passwordModal = document.getElementById("passwordModal");
  const closeModalBtn = document.getElementById("closeModalBtn");
  const closePasswordModalBtn = document.getElementById(
    "closePasswordModalBtn"
  );
  const cancelBtn = document.getElementById("cancelBtn");
  const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
  const saveUserBtn = document.getElementById("saveUserBtn");
  const savePasswordBtn = document.getElementById("savePasswordBtn");
  const userForm = document.getElementById("userForm");
  const passwordForm = document.getElementById("passwordForm");
  const usersList = document.getElementById("usersList");
  const modalTitle = document.getElementById("modalTitle");
  const userStatusFilter = document.getElementById("userStatusFilter");

  // Website Access Modal Elements
  const websiteAccessModal = document.getElementById("websiteAccessModal");
  const closeWebsiteAccessModalBtn = document.getElementById(
    "closeWebsiteAccessModalBtn"
  );
  const closeWebsiteAccessBtn = document.getElementById(
    "closeWebsiteAccessBtn"
  );
  const currentWebsitesList = document.getElementById("currentWebsitesList");
  const availableWebsitesSelect = document.getElementById(
    "availableWebsitesSelect"
  );
  const addWebsiteAccessBtn = document.getElementById("addWebsiteAccessBtn");

  // --- API Functions ---
  const api = {
    getUsers: async () => {
      try {
        const response = await fetch("/api/users");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching users:", error);
        showNotification("Failed to fetch users", "error", {
          title: "Load Failed",
          category: "user",
        });
        return [];
      }
    },

    getUser: async (userId) => {
      try {
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        showNotification("Failed to fetch user details", "error");
        throw error;
      }
    },

    saveUser: async (userData) => {
      try {
        const isUpdate = userData.userId && userData.userId.trim() !== "";
        const url = isUpdate ? `/api/users/${userData.userId}` : "/api/users";
        const method = isUpdate ? "PUT" : "POST";

        const response = await fetch(url, {
          method: method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            AuthorLogin: userData.authorLogin,
            AuthorPassword: userData.authorPassword,
            AuthorName: userData.authorName,
            AuthorEmail: userData.authorEmail,
            IsAdmin: userData.isAdmin,
            AuthorCategory: userData.authorCategory,
            AuthorType: userData.authorType,
            IsActive: userData.isActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        showNotification(
          isUpdate
            ? "User updated successfully!"
            : "User created successfully!",
          "success",
          {
            title: isUpdate ? "User Updated" : "User Created",
            category: "user",
            relatedEntityType: "user",
            relatedEntityID: result.user?.id,
          }
        );
        return result;
      } catch (error) {
        console.error("Error saving user:", error);
        showNotification(error.message || "Failed to save user", "error");
        throw error;
      }
    },

    updatePassword: async (userId, newPassword) => {
      try {
        const response = await fetch(`/api/users/${userId}/password`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            AuthorPassword: newPassword,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        showNotification("Password updated successfully!", "success");
        return result;
      } catch (error) {
        console.error("Error updating password:", error);
        showNotification(error.message || "Failed to update password", "error");
        throw error;
      }
    },

    deleteUser: async (userId) => {
      try {
        const response = await fetch(`/api/users/${userId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        showNotification("User deleted successfully!", "success");
        return result;
      } catch (error) {
        console.error("Error deleting user:", error);
        showNotification(error.message || "Failed to delete user", "error");
        throw error;
      }
    },

    toggleUserStatus: async (userId, field, value) => {
      try {
        // First get the current user data
        const currentUser = await api.getUser(userId);

        // Update the specific field
        const updatedData = {
          ...currentUser,
          [field]: value,
        };

        const response = await fetch(`/api/users/${userId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            AuthorLogin: updatedData.AuthorLogin,
            AuthorName: updatedData.AuthorName,
            AuthorEmail: updatedData.AuthorEmail,
            IsAdmin: updatedData.IsAdmin,
            AuthorCategory: updatedData.AuthorCategory,
            AuthorType: updatedData.AuthorType,
            IsActive: updatedData.IsActive,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        showNotification(
          `User ${
            field === "IsActive" ? "status" : "admin privileges"
          } updated successfully!`,
          "success"
        );
        return result;
      } catch (error) {
        console.error("Error updating user status:", error);
        showNotification(
          error.message || "Failed to update user status",
          "error"
        );
        throw error;
      }
    },

    getAvailableWebsites: async () => {
      try {
        const response = await fetch("/api/users/websites/available");
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching available websites:", error);
        showNotification("Failed to fetch available websites", "error");
        return [];
      }
    },

    getUserWebsites: async (userId) => {
      try {
        const response = await fetch(`/api/users/${userId}/websites`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        console.error("Error fetching user websites:", error);
        showNotification("Failed to fetch user websites", "error");
        return [];
      }
    },

    addWebsiteAccess: async (userId, websiteId) => {
      try {
        const response = await fetch(
          `/api/users/${userId}/websites/${websiteId}`,
          {
            method: "POST",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        const result = await response.json();
        showNotification("Website access granted successfully!", "success");
        return result;
      } catch (error) {
        console.error("Error adding website access:", error);
        showNotification(
          error.message || "Failed to add website access",
          "error"
        );
        throw error;
      }
    },

    removeWebsiteAccess: async (userId, websiteId) => {
      try {
        const response = await fetch(
          `/api/users/${userId}/websites/${websiteId}`,
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
        showNotification("Website access removed successfully!", "success");
        return result;
      } catch (error) {
        console.error("Error removing website access:", error);
        showNotification(
          error.message || "Failed to remove website access",
          "error"
        );
        throw error;
      }
    },
  };

  // --- Modal Management ---
  const showModal = () => {
    userModal.classList.remove("hidden");
    userModal.classList.add("active");
  };

  const hideModal = () => {
    userModal.classList.remove("active");
    setTimeout(() => {
      userModal.classList.add("hidden");
    }, 200);
  };

  const showPasswordModal = () => {
    passwordModal.classList.remove("hidden");
    passwordModal.classList.add("active");
  };

  const hidePasswordModal = () => {
    passwordModal.classList.remove("active");
    setTimeout(() => {
      passwordModal.classList.add("hidden");
    }, 200);
  };

  const showWebsiteAccessModal = () => {
    websiteAccessModal.classList.remove("hidden");
    websiteAccessModal.classList.add("active");
  };

  const hideWebsiteAccessModal = () => {
    websiteAccessModal.classList.remove("active");
    setTimeout(() => {
      websiteAccessModal.classList.add("hidden");
    }, 200);
  };

  // --- Event Listeners ---
  createUserBtn.addEventListener("click", () => {
    modalTitle.textContent = "Create User";
    userForm.reset();
    document.getElementById("userId").value = "";
    document.getElementById("passwordField").style.display = "block";
    document.getElementById("authorPassword").required = true;
    showModal();
  });

  closeModalBtn.addEventListener("click", hideModal);
  cancelBtn.addEventListener("click", hideModal);
  closePasswordModalBtn.addEventListener("click", hidePasswordModal);
  cancelPasswordBtn.addEventListener("click", hidePasswordModal);
  closeWebsiteAccessModalBtn.addEventListener("click", hideWebsiteAccessModal);
  closeWebsiteAccessBtn.addEventListener("click", hideWebsiteAccessModal);

  // Filter change handler
  userStatusFilter.addEventListener("change", () => {
    renderUsers(userStatusFilter.value);
  });

  // Save user handler
  saveUserBtn.addEventListener("click", async () => {
    try {
      const formData = new FormData(userForm);
      const userData = {
        userId: formData.get("userId"),
        authorLogin: formData.get("authorLogin"),
        authorPassword: formData.get("authorPassword"),
        authorName: formData.get("authorName"),
        authorEmail: formData.get("authorEmail"),
        isAdmin: formData.has("isAdmin"),
        authorCategory: formData.get("authorCategory"),
        authorType: formData.get("authorType"),
        isActive: formData.has("isActive"),
      };

      // Validation
      if (
        !userData.authorLogin ||
        !userData.authorName ||
        !userData.authorEmail
      ) {
        showNotification("Please fill in all required fields", "error");
        return;
      }

      if (!userData.userId && !userData.authorPassword) {
        showNotification("Password is required for new users", "error");
        return;
      }

      await api.saveUser(userData);
      hideModal();
      renderUsers(userStatusFilter.value);
    } catch (error) {
      // Error already handled in api.saveUser
    }
  });

  // Save password handler
  savePasswordBtn.addEventListener("click", async () => {
    try {
      const formData = new FormData(passwordForm);
      const userId = formData.get("passwordUserId");
      const newPassword = formData.get("newPassword");
      const confirmPassword = formData.get("confirmPassword");

      if (!newPassword || !confirmPassword) {
        showNotification("Please fill in both password fields", "error");
        return;
      }

      if (newPassword !== confirmPassword) {
        showNotification("Passwords do not match", "error");
        return;
      }

      await api.updatePassword(userId, newPassword);
      hidePasswordModal();
    } catch (error) {
      // Error already handled in api.updatePassword
    }
  });

  // Add website access handler
  addWebsiteAccessBtn.addEventListener("click", async () => {
    try {
      const userId = document.getElementById("websiteAccessUserId").value;
      const websiteId = availableWebsitesSelect.value;

      if (!websiteId) {
        showNotification("Please select a website to add", "error");
        return;
      }

      await api.addWebsiteAccess(userId, websiteId);
      await loadWebsiteAccessModal(userId); // Refresh the modal
      renderUsers(userStatusFilter.value); // Refresh the user list
    } catch (error) {
      // Error already handled in api.addWebsiteAccess
    }
  });

  // --- Website Access Management Functions ---
  const loadWebsiteAccessModal = async (userId) => {
    try {
      // Load current websites
      const userWebsites = await api.getUserWebsites(userId);
      currentWebsitesList.innerHTML = "";

      if (userWebsites.length === 0) {
        currentWebsitesList.innerHTML =
          '<p class="text-gray-500 italic">No website access granted</p>';
      } else {
        userWebsites.forEach((website) => {
          const websiteItem = document.createElement("div");
          websiteItem.className = "current-website-item";
          websiteItem.innerHTML = `
            <span class="website-domain">${website.Domain}</span>
            <button onclick="removeWebsiteAccess(${userId}, ${website.WebsiteID})" class="remove-website-btn">
              <i class="fas fa-times"></i> Remove
            </button>
          `;
          currentWebsitesList.appendChild(websiteItem);
        });
      }

      // Load available websites
      const availableWebsites = await api.getAvailableWebsites();
      const userWebsiteIds = userWebsites.map((w) => w.WebsiteID);

      availableWebsitesSelect.innerHTML =
        '<option value="">Select a website to add...</option>';
      availableWebsites.forEach((website) => {
        if (!userWebsiteIds.includes(website.WebsiteID)) {
          const option = document.createElement("option");
          option.value = website.WebsiteID;
          option.textContent = website.Domain;
          availableWebsitesSelect.appendChild(option);
        }
      });
    } catch (error) {
      console.error("Error loading website access modal:", error);
      showNotification("Failed to load website access data", "error");
    }
  };

  // --- Data Rendering ---
  const renderUsers = async (filter = "all") => {
    usersList.innerHTML = '<div class="loading">Loading users...</div>';

    try {
      const users = await api.getUsers();
      usersList.innerHTML = ""; // Clear loading message

      if (!users || users.length === 0) {
        usersList.innerHTML = `<p class="text-gray-500 text-center py-8">No users found. Click 'Create User' to get started.</p>`;
        return;
      }

      // Filter users based on selection
      const filteredUsers = users.filter((user) => {
        switch (filter) {
          case "active":
            return user.IsActive;
          case "inactive":
            return !user.IsActive;
          case "admin":
            return user.IsAdmin;
          default:
            return true;
        }
      });

      if (filteredUsers.length === 0) {
        usersList.innerHTML = `<p class="text-gray-500 text-center py-8">No users match the selected filter.</p>`;
        return;
      }

      // Render filtered users
      filteredUsers.forEach((user) => {
        const userElement = document.createElement("div");
        userElement.className = "user-card";

        const lastLogin = user.LastLoginDate
          ? new Date(user.LastLoginDate).toLocaleDateString()
          : "Never";
        const dateCreated = user.DateCreated
          ? new Date(user.DateCreated).toLocaleDateString()
          : "Unknown";

        userElement.innerHTML = `
          <div class="user-info">
            <h3>${user.AuthorName || "Unnamed User"}</h3>
            <p><strong>Login:</strong> ${user.AuthorLogin}</p>
            <p><strong>Email:</strong> ${user.AuthorEmail}</p>
            <p><strong>Category:</strong> ${user.AuthorCategory || "N/A"}</p>
            <p><strong>Type:</strong> ${user.AuthorType || "N/A"}</p>
            <p><strong>Created:</strong> ${dateCreated}</p>
            <p><strong>Last Login:</strong> ${lastLogin}</p>
            <div class="user-websites">
              <strong>Website Access:</strong>
              <div class="website-access-container">
                ${
                  user.AccessibleWebsites
                    ? user.AccessibleWebsites.split(", ")
                        .map(
                          (domain) =>
                            `<span class="website-badge">${domain}</span>`
                        )
                        .join("")
                    : '<span class="no-websites">No website access</span>'
                }
                <button onclick="manageWebsiteAccess(${
                  user.AuthorID
                })" class="manage-websites-btn">
                  <i class="fas fa-cog"></i> Manage
                </button>
              </div>
            </div>
            <div class="user-status">
              ${
                user.IsActive
                  ? '<span class="status-badge status-active">Active</span>'
                  : '<span class="status-badge status-inactive">Inactive</span>'
              }
              ${
                user.IsAdmin
                  ? '<span class="status-badge status-admin">Admin</span>'
                  : ""
              }
            </div>
          </div>
          <div class="user-actions">
            <label class="flex items-center">
              <span class="text-sm">Active:</span>
              <label class="toggle-switch">
                <input type="checkbox" ${user.IsActive ? "checked" : ""} 
                       onchange="toggleUserStatus(${
                         user.AuthorID
                       }, 'IsActive', this.checked)">
                <span class="toggle-slider"></span>
              </label>
            </label>
            <label class="flex items-center">
              <span class="text-sm">Admin:</span>
              <label class="toggle-switch">
                <input type="checkbox" ${user.IsAdmin ? "checked" : ""} 
                       onchange="toggleUserStatus(${
                         user.AuthorID
                       }, 'IsAdmin', this.checked)">
                <span class="toggle-slider"></span>
              </label>
            </label>
            <button onclick="editUser(${user.AuthorID})" class="edit-btn">
              <i class="fas fa-edit"></i> Edit
            </button>
            <button onclick="changePassword(${
              user.AuthorID
            })" class="password-btn">
              <i class="fas fa-key"></i> Password
            </button>
            <button onclick="deleteUser(${user.AuthorID})" class="delete-btn">
              <i class="fas fa-trash"></i> Delete
            </button>
          </div>
        `;

        usersList.appendChild(userElement);
      });
    } catch (error) {
      usersList.innerHTML = `<p class="text-red-500 text-center py-8">Error loading users. Please try again.</p>`;
    }
  };

  // --- Global Functions (for onclick handlers) ---
  window.editUser = async (userId) => {
    try {
      const user = await api.getUser(userId);

      modalTitle.textContent = "Edit User";
      document.getElementById("userId").value = user.AuthorID;
      document.getElementById("authorLogin").value = user.AuthorLogin;
      document.getElementById("authorName").value = user.AuthorName;
      document.getElementById("authorEmail").value = user.AuthorEmail;
      document.getElementById("authorCategory").value =
        user.AuthorCategory || "";
      document.getElementById("authorType").value = user.AuthorType || "";
      document.getElementById("isActive").checked = user.IsActive;
      document.getElementById("isAdmin").checked = user.IsAdmin;

      // Hide password field for editing
      document.getElementById("passwordField").style.display = "none";
      document.getElementById("authorPassword").required = false;

      showModal();
    } catch (error) {
      // Error already handled in api.getUser
    }
  };

  window.changePassword = (userId) => {
    document.getElementById("passwordUserId").value = userId;
    document.getElementById("passwordForm").reset();
    document.getElementById("passwordUserId").value = userId; // Reset clears this, so set it again
    showPasswordModal();
  };

  window.deleteUser = async (userId) => {
    if (
      confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    ) {
      try {
        await api.deleteUser(userId);
        renderUsers(userStatusFilter.value);
      } catch (error) {
        // Error already handled in api.deleteUser
      }
    }
  };

  window.toggleUserStatus = async (userId, field, value) => {
    try {
      await api.toggleUserStatus(userId, field, value);
      // Don't re-render the entire list, just update the status badges
      const userCard = event.target.closest(".user-card");
      const statusContainer = userCard.querySelector(".user-status");

      // Re-fetch the user to get updated status
      const updatedUser = await api.getUser(userId);
      statusContainer.innerHTML = `
        ${
          updatedUser.IsActive
            ? '<span class="status-badge status-active">Active</span>'
            : '<span class="status-badge status-inactive">Inactive</span>'
        }
        ${
          updatedUser.IsAdmin
            ? '<span class="status-badge status-admin">Admin</span>'
            : ""
        }
      `;
    } catch (error) {
      // Revert the toggle on error
      event.target.checked = !value;
    }
  };

  // --- Notification System ---
  // Use unified notification system - showNotification is provided by notifications.js

  // --- Website Access Global Functions ---
  window.manageWebsiteAccess = async (userId) => {
    try {
      document.getElementById("websiteAccessUserId").value = userId;
      await loadWebsiteAccessModal(userId);
      showWebsiteAccessModal();
    } catch (error) {
      showNotification("Failed to load website access management", "error");
    }
  };

  window.removeWebsiteAccess = async (userId, websiteId) => {
    if (confirm("Are you sure you want to remove this website access?")) {
      try {
        await api.removeWebsiteAccess(userId, websiteId);
        await loadWebsiteAccessModal(userId); // Refresh the modal
        renderUsers(userStatusFilter.value); // Refresh the user list
      } catch (error) {
        // Error already handled in api.removeWebsiteAccess
      }
    }
  };

  // --- Initialize ---
  renderUsers();
});
