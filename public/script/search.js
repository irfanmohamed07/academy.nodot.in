// Search functionality for both desktop and mobile
document.addEventListener('DOMContentLoaded', function() {
    // Get search elements from both desktop and mobile using IDs
    const desktopSearchForm = document.getElementById('desktop-search-form');
    const mobileSearchForm = document.getElementById('mobile-search-form');
    const desktopSearchInput = document.getElementById('desktop-search-input');
    const mobileSearchInput = document.getElementById('mobile-search-input');
    
    // Function to handle search submission with validation
    function handleSearchSubmit(event) {
        const searchInput = event.currentTarget.querySelector('input[name="query"]');
        const searchTerm = searchInput.value.trim();
        
        // Basic validation
        if (searchTerm === '') {
            event.preventDefault();
            searchInput.classList.add('error');
            searchInput.placeholder = 'Please enter a search term';
            
            // Remove error class after 3 seconds
            setTimeout(() => {
                searchInput.classList.remove('error');
                searchInput.placeholder = 'Search for anything';
            }, 3000);
            
            return false;
        }
        
        // Log search for analytics purposes
        console.log('Searching for:', searchTerm);
        
        // Continue with form submission
        return true;
    }
    
    // Add event listeners to search forms
    if (desktopSearchForm) {
        desktopSearchForm.addEventListener('submit', handleSearchSubmit);
        console.log('Desktop search form initialized');
    }
    
    if (mobileSearchForm) {
        mobileSearchForm.addEventListener('submit', handleSearchSubmit);
        console.log('Mobile search form initialized');
    }
    
    // Add live search suggestions functionality
    function handleSearchInput(event) {
        const searchTerm = event.target.value.trim();
        
        if (searchTerm.length >= 3) {
            // In a real implementation, you would make an API call for suggestions
            console.log('Fetching suggestions for:', searchTerm);
        }
    }
    
    // Add input event listeners for live search
    if (desktopSearchInput) {
        desktopSearchInput.addEventListener('input', handleSearchInput);
    }
    
    if (mobileSearchInput) {
        mobileSearchInput.addEventListener('input', handleSearchInput);
    }
    
    // Mobile menu toggle functionality
    const menuToggle = document.getElementById('menu-toggle');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', function() {
            mobileMenu.classList.toggle('show');
        });
    }
});

// CSS styling for the error state
document.head.insertAdjacentHTML('beforeend', `
    <style>
        .search-container input.error {
            border: 1px solid #ff3860;
            background-color: rgba(255, 56, 96, 0.1);
        }
        
        .search-container input.error::placeholder {
            color: #ff3860;
        }
    </style>
`); 