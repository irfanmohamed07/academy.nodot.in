document.addEventListener('DOMContentLoaded', function() {
  // Track page views for analytics
  function trackPageView() {
    // This is a placeholder for actual analytics tracking
    const currentPage = window.location.pathname;
    console.log('Page viewed:', currentPage);
    
    // You can add actual analytics tracking code here, such as:
    // if (typeof gtag === 'function') {
    //   gtag('config', 'UA-XXXXXXXX-X', {
    //     'page_path': currentPage
    //   });
    // }
  }
  
  // Handle dynamic link updates when user is scrolling
  function updateActiveNavLinks() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-center a');
    
    window.addEventListener('scroll', function() {
      let current = '';
      
      sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= (sectionTop - sectionHeight / 3)) {
          current = section.getAttribute('id');
        }
      });
      
      navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
          link.classList.add('active');
        }
      });
    });
  }
  
  // Initialize page tracking
  trackPageView();
  updateActiveNavLinks();
}); 