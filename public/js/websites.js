// public/js/websites.js - Client-side JavaScript for websites page

document.addEventListener("DOMContentLoaded", function () {
  logger.info("🌐 WEBSITES.JS LOADING - DOMContentLoaded fired");

  // Get search elements
  const searchInput = document.getElementById("website-search-input");
  const websiteList = document.getElementById("website-list");
  const websiteItems = document.querySelectorAll(".website-link-item");

  logger.info("📋 Search elements found:");
  logger.info("  - searchInput:", !!searchInput);
  logger.info("  - websiteList:", !!websiteList);
  logger.info("  - websiteItems count:", websiteItems.length);

  if (!searchInput || !websiteList) {
    console.error("❌ Required search elements not found");
    return;
  }

  // Search functionality
  function performSearch() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    logger.info("🔍 Searching for:", searchTerm);

    let visibleCount = 0;

    websiteItems.forEach((item) => {
      const domain = item.dataset.domain || "";
      const websiteText = item.textContent.toLowerCase();

      const isMatch =
        domain.includes(searchTerm) || websiteText.includes(searchTerm);

      if (isMatch) {
        item.style.display = "flex";
        visibleCount++;
      } else {
        item.style.display = "none";
      }
    });

    logger.info("👀 Visible websites:", visibleCount);

    // Show/hide "no results" message
    let noResultsMsg = websiteList.querySelector(".no-results-message");

    if (visibleCount === 0 && searchTerm !== "") {
      if (!noResultsMsg) {
        noResultsMsg = document.createElement("p");
        noResultsMsg.className =
          "no-results-message text-center text-gray-500 p-4";
        noResultsMsg.textContent = `No websites found matching "${searchTerm}"`;
        websiteList.appendChild(noResultsMsg);
      } else {
        noResultsMsg.textContent = `No websites found matching "${searchTerm}"`;
        noResultsMsg.style.display = "block";
      }
    } else if (noResultsMsg) {
      noResultsMsg.style.display = "none";
    }
  }

  // Add search event listeners
  searchInput.addEventListener("input", performSearch);
  searchInput.addEventListener("keyup", performSearch);

  // Clear search on Escape key
  searchInput.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      searchInput.value = "";
      performSearch();
      searchInput.blur();
    }
  });

  // RESTORE CUSTOM WEBSITE SELECTION LOGIC
  // Handle website selection with proper working site setting
  websiteItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault(); // Prevent default navigation

      const websiteLink = e.currentTarget;
      const href = websiteLink.getAttribute("href");
      const websiteId = href.match(/\/websites\/(\d+)\/pages/);

      if (websiteId && websiteId[1]) {
        logger.info("🔄 Setting working site:", websiteId[1]);

        // Show loading state
        const originalText = websiteLink.innerHTML;
        websiteLink.innerHTML =
          '<span>Setting as working site...</span><i class="fas fa-spinner fa-spin"></i>';
        websiteLink.style.pointerEvents = "none";

        // Set the working site via AJAX
        fetch("/set-working-site", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `websiteID=${websiteId[1]}`,
        })
          .then((response) => response.json())
          .then((data) => {
            if (data.success) {
              logger.info("✅ Working site set successfully");
              // Navigate to the pages after successful site switch
              window.location.href = href;
            } else {
              console.error("❌ Failed to set working site:", data.message);
              alert(
                "Failed to set working site: " +
                  (data.message || "Unknown error")
              );
              // Restore original state
              websiteLink.innerHTML = originalText;
              websiteLink.style.pointerEvents = "auto";
            }
          })
          .catch((error) => {
            console.error("❌ Error setting working site:", error);
            alert("Error setting working site. Please try again.");
            // Restore original state
            websiteLink.innerHTML = originalText;
            websiteLink.style.pointerEvents = "auto";
          });
      } else {
        // Fallback to direct navigation if no website ID found
        logger.info("⚠️ No website ID found, using direct navigation");
        window.location.href = href;
      }
    });
  });

  logger.info("✅ WEBSITES.JS INITIALIZATION COMPLETE");
});
