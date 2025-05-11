document.addEventListener('DOMContentLoaded', function() {
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', function() {
      mobileMenu.classList.toggle('show');
    });
    
    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
      if (!menuToggle.contains(event.target) && 
          !mobileMenu.contains(event.target) && 
          mobileMenu.classList.contains('show')) {
        mobileMenu.classList.remove('show');
      }
    });
    
    // Close menu when window is resized above mobile breakpoint
    window.addEventListener('resize', function() {
      if (window.innerWidth > 1130 && mobileMenu.classList.contains('show')) {
        mobileMenu.classList.remove('show');
      }
    });
  }
}); 