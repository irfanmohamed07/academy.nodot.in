document.addEventListener("DOMContentLoaded", () => {
  const links = document.querySelectorAll(".sidebar a");
  const sections = document.querySelectorAll(".content-section");

  // Function to handle section visibility
  function showSection(sectionId) {
    sections.forEach((section) => {
      if (section.id === sectionId) {
        section.classList.add("active");
      } else {
        section.classList.remove("active");
      }
    });
  }

  // Initially show the users section
  showSection("users-section");

  links.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();

      // Determine which section to show based on the link clicked
      const sectionId = link.id.replace("-link", "-section");
      showSection(sectionId);
    });
  });
});

document.addEventListener("DOMContentLoaded", function () {
  const menu = document.querySelector(".three-dot-menu");
  const menuItems = document.querySelectorAll(".menu-content a");
  const sections = document.querySelectorAll(".content-section");

  // Toggle menu visibility
  menu.addEventListener("click", function () {
    menu.classList.toggle("active");
  });

  // Close the menu if clicked outside
  window.addEventListener("click", function (event) {
    if (!menu.contains(event.target)) {
      menu.classList.remove("active");
    }
  });

  // Handle menu item clicks
  menuItems.forEach((item) => {
    item.addEventListener("click", function (event) {
      event.preventDefault();
      const targetSectionId = item.getAttribute("data-section");

      // Hide all sections
      sections.forEach((section) => {
        section.classList.remove("active");
      });

      // Show the selected section
      const targetSection = document.getElementById(targetSectionId);
      if (targetSection) {
        targetSection.classList.add("active");
      }

      // Close the menu after selection
      menu.classList.remove("active");
    });
  });
});
