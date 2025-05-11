const profileBtn = document.getElementById("user-profile-link");
const dropdown = document.getElementById("profile-dropdown");

if (profileBtn && dropdown) {
  profileBtn.addEventListener("click", function (e) {
    e.preventDefault();
    dropdown.classList.toggle("hidden");
  });

  document.addEventListener("click", function (event) {
    if (
      !profileBtn.contains(event.target) &&
      !dropdown.contains(event.target)
    ) {
      dropdown.classList.add("hidden");
    }
  });
}
