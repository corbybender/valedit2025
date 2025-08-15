document.addEventListener("DOMContentLoaded", () => {
    const createSettingBtn = document.getElementById("createSettingBtn");
    const modal = document.getElementById("settingModal");
    const closeModalBtn = document.getElementById("closeModalBtn");
    const cancelBtn = document.getElementById("cancelBtn");
    const saveSettingBtn = document.getElementById("saveSettingBtn");
    const settingsList = document.getElementById("settingsList");
    const modalTitle = document.getElementById("modalTitle");
    const settingForm = document.getElementById("settingForm");
    const settingKeyInput = document.getElementById("setting_key");

    const showModal = (title, setting = null) => {
        modalTitle.textContent = title;
        settingForm.reset();
        if (setting) {
            document.getElementById("settingKey").value = setting.setting_key;
            settingKeyInput.value = setting.setting_key;
            settingKeyInput.readOnly = true;
            document.getElementById("setting_value").value = setting.setting_value;
            document.getElementById("description").value = setting.description;
            document.getElementById("is_encrypted").checked = setting.is_encrypted;
        } else {
            document.getElementById("settingKey").value = "";
            settingKeyInput.readOnly = false;
        }
        modal.classList.remove("hidden");
        modal.classList.add("active");
    };

    const hideModal = () => {
        modal.classList.remove("active");
        modal.classList.add("hidden");
    };

    const fetchSettings = async () => {
        try {
            const response = await fetch("/api/settings");
            const settings = await response.json();
            renderSettings(settings);
        } catch (error) {
            console.error("Error fetching settings:", error);
        }
    };

    const renderSettings = (settings) => {
        settingsList.innerHTML = "";
        settings.forEach((setting) => {
            const settingElement = document.createElement("div");
            settingElement.className = "bg-gray-100 p-4 rounded-lg shadow flex justify-between items-center";
            settingElement.innerHTML = `
                <div>
                    <h3 class="text-lg font-bold">${setting.setting_key}</h3>
                    <p class="text-gray-600">${setting.description || ""}</p>
                </div>
                <div class="flex gap-2">
                    <button class="edit-btn bg-blue-500 text-white px-3 py-1 rounded-lg" data-key="${setting.setting_key}">Edit</button>
                    <button class="delete-btn bg-red-500 text-white px-3 py-1 rounded-lg" data-key="${setting.setting_key}">Delete</button>
                </div>
            `;
            settingsList.appendChild(settingElement);
        });
    };

    createSettingBtn.addEventListener("click", () => showModal("Create Setting"));
    closeModalBtn.addEventListener("click", hideModal);
    cancelBtn.addEventListener("click", hideModal);

    settingsList.addEventListener("click", async (e) => {
        if (e.target.classList.contains("edit-btn")) {
            const key = e.target.dataset.key;
            try {
                const response = await fetch(`/api/settings/${key}`);
                const setting = await response.json();
                showModal("Edit Setting", setting);
            } catch (error) {
                console.error("Error fetching setting:", error);
            }
        }

        if (e.target.classList.contains("delete-btn")) {
            const key = e.target.dataset.key;
            if (confirm(`Are you sure you want to delete the setting "${key}"?`)) {
                try {
                    const response = await fetch(`/api/settings/${key}`, { method: "DELETE" });
                    if (response.ok) {
                        fetchSettings();
                    } else {
                        const { error } = await response.json();
                        showNotification(error, 'error');
                        console.error("Error deleting setting:", error);
                    }
                } catch (error) {
                    console.error("Error deleting setting:", error);
                }
            }
        }
    });

    saveSettingBtn.addEventListener("click", async () => {
        const formData = new FormData(settingForm);
        const settingData = Object.fromEntries(formData.entries());
        const key = document.getElementById("settingKey").value;

        const method = key ? "PUT" : "POST";
        const url = key ? `/api/settings/${key}` : "/api/settings";

        let requestBody;
        if (key) {
            // For updates, send all editable fields
            requestBody = {
                setting_value: settingData.setting_value,
                description: settingData.description,
                is_encrypted: settingData.is_encrypted === 'on' || settingData.is_encrypted === true
            };
        } else {
            // For creates, send all the data
            requestBody = settingData;
        }

        try {
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
            });

            if (response.ok) {
                hideModal();
                fetchSettings();
            } else {
                const errorData = await response.json();
                const errorMessage = errorData.error || 'Failed to save setting';
                console.error("Error saving setting:", errorMessage);
                // You can add a notification system here if available
                alert(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error("Error saving setting:", error);
            alert(`Error: ${error.message}`);
        }
    });

    fetchSettings();
});
