document.getElementById("menu-toggle").addEventListener("click", function () {
  document.getElementById("mobile-menu").classList.toggle("show");
});

document
  .getElementById("togglePassword1")
  .addEventListener("click", function () {
    const passwordInput = document.getElementById("password");
    togglePasswordVisibility(passwordInput, this);
  });

document
  .getElementById("togglePassword2")
  .addEventListener("click", function () {
    const passwordInput = document.getElementById("confirmPassword");
    togglePasswordVisibility(passwordInput, this);
  });

function togglePasswordVisibility(input, icon) {
  const isPassword = input.type === "password";
  input.type = isPassword ? "text" : "password";
  icon.classList.toggle("fa-eye");
  icon.classList.toggle("fa-eye-slash");
}
