document.addEventListener("DOMContentLoaded", function () {
  const accordionContainer = document.getElementById(
    "pages-accordion-container"
  );

  if (!accordionContainer) {
    return; // Only run on the pages view
  }

  // Accordion functionality
  accordionContainer.addEventListener("click", function (event) {
    const header = event.target.closest(".accordion-header");
    if (!header) return;

    // Prevent clicks on action buttons and title links from toggling the accordion
    if (event.target.closest(".action-btn") || event.target.closest(".page-title-link")) {
      return;
    }

    const panel = header.nextElementSibling;

    // This toggles the class for the arrow rotation
    header.classList.toggle("active");

    // THIS LINE WAS MISSING: It toggles the class that makes the panel expand
    panel.classList.toggle("open");
  });

  // Search functionality
  const searchInput = document.getElementById("page-search-input");

  logger.info("📋 Page search elements found:");
  logger.info("  - searchInput:", !!searchInput);
  logger.info("  - accordionContainer:", !!accordionContainer);

  if (searchInput && accordionContainer) {
    const accordionItems = Array.from(
      accordionContainer.getElementsByClassName("accordion-item")
    );

    logger.info("  - accordionItems count:", accordionItems.length);

    function performPageSearch() {
      const searchTerm = searchInput.value.toLowerCase().trim();
      logger.info("🔍 Searching pages for:", searchTerm);

      let visibleCount = 0;

      accordionItems.forEach((item) => {
        const header = item.querySelector(".accordion-header");
        const titleElement = header
          ? header.querySelector(".page-title")
          : null;
        const pathElement = header ? header.querySelector(".page-path") : null;

        if (titleElement && pathElement) {
          const title = titleElement.textContent.toLowerCase();
          const path = pathElement.textContent.toLowerCase();

          // Show item if search term matches title or path, or if no search term
          const isMatch =
            searchTerm === "" ||
            title.includes(searchTerm) ||
            path.includes(searchTerm);

          if (isMatch) {
            item.style.display = "block";
            visibleCount++;
            // If searching and this item matches, expand its parent if it has children
            if (searchTerm !== "" && item.querySelector(".accordion-panel")) {
              const panel = item.querySelector(".accordion-panel");
              if (panel) {
                panel.classList.add("open");
                header.classList.add("active");
              }
            }
          } else {
            item.style.display = "none";
          }
        }
      });

      logger.info("👀 Visible pages:", visibleCount);

      // Show/hide "no results" message
      let noResultsMsg = accordionContainer.querySelector(
        ".no-results-message"
      );

      if (visibleCount === 0 && searchTerm !== "") {
        if (!noResultsMsg) {
          noResultsMsg = document.createElement("p");
          noResultsMsg.className =
            "no-results-message text-center text-gray-500 p-4";
          noResultsMsg.textContent = `No pages found matching "${searchTerm}"`;
          accordionContainer.appendChild(noResultsMsg);
        } else {
          noResultsMsg.textContent = `No pages found matching "${searchTerm}"`;
          noResultsMsg.style.display = "block";
        }
      } else if (noResultsMsg) {
        noResultsMsg.style.display = "none";
      }
    }

    // Add search event listeners
    searchInput.addEventListener("input", performPageSearch);
    searchInput.addEventListener("keyup", performPageSearch);

    // Clear search on Escape key
    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        searchInput.value = "";
        performPageSearch();
        searchInput.blur();
      }
    });

    logger.info("✅ Page search functionality initialized");
  } else {
    console.error("❌ Required page search elements not found");
  }

  // Sort functionality
  const sortSelect = document.getElementById("page-sort-select");
  if (sortSelect) {
    sortSelect.addEventListener("change", function () {
      const selectedSort = this.value;
      const pathParts = window.location.pathname.split("/");
      const websiteId = pathParts[2]; // Extract websiteId from /websites/:id/website-pages

      const url = new URL(window.location.href);
      url.searchParams.set("websiteId", websiteId);

      if (selectedSort !== "title") {
        url.searchParams.set("sort", selectedSort);
      }

      logger.info(
        "🔄 Sorting pages by:",
        selectedSort,
        "for website:",
        websiteId
      );
      window.location.href = url.toString();
    });

    logger.info("✅ Page sort functionality initialized");
  } else {
    console.error("❌ Page sort element not found");
  }
});
