// auth/auth.js

// --- Load Modal HTML ---
// Fetches the auth modal HTML from auth/auth.html and injects it into the main page.
// It then calls initializeAuthLogic() to set up the functionality.
async function loadAuthModalHTML() {
  try {
    const response = await fetch('auth/auth.html'); // Fetch the separate HTML file
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const container = document.getElementById('authModalContainer'); // Get the placeholder div from index.html

    if (container) {
      container.innerHTML = html; // Inject the fetched HTML into the placeholder
      // Now that the modal HTML is loaded into the DOM, initialize the auth logic
      initializeAuthLogic();
    } else {
      console.error('Auth modal container (#authModalContainer) not found in index.html!');
    }
  } catch (error) {
    console.error('Failed to load auth modal HTML:', error);
  }
}

// --- Initialize Auth Logic ---
// This function contains all the original authentication logic.
// It is called ONLY after the modal HTML has been successfully loaded and injected.
function initializeAuthLogic() {

    // ========= AUTHENTICATION LOGIC =========
    // (Now running *after* auth/auth.html is loaded)

    // --- DOM Element Selection ---
    // Select elements *after* modal HTML is injected.
    const authModal = document.getElementById('authModal');
    const userLink = document.getElementById('userLink'); // This element is in index.html
    const userLinkName = document.getElementById('userLinkName'); // In index.html
    const userTooltip = document.getElementById('userTooltip'); // In index.html
    const profileSection = document.getElementById('profileSection'); // In index.html
    const profileName = document.getElementById('profileName'); // In index.html
    const profileEmail = document.getElementById('profileEmail'); // In index.html
    const logoutButton = document.getElementById('log_out'); // In index.html profile section
    const closeModalButton = document.querySelector('#authModal .close-button'); // Inside the loaded modal

    const loginForm = document.getElementById('loginForm'); // Inside the loaded modal
    const signupForm = document.getElementById('signupForm'); // Inside the loaded modal
    // Corrected variable names for error paragraphs
    const loginErrorP = document.getElementById('loginError'); // Inside the loaded modal
    const signupErrorP = document.getElementById('signupError'); // Inside the loaded modal

    // --- API Configuration ---
    // Use a relative path '/api' when deploying frontend and backend together on Vercel.
    // For local development, if your API runs on a different port (e.g., 5001),
    // you might need to use the full URL like: 'http://localhost:5001/api'
    // Make sure CORS is configured correctly on the backend if using different ports locally.
    const API_BASE_URL = '/api';

    // --- Modal Handling Functions ---
    function openAuthModal() {
      // Need to ensure authModal is selected correctly *before* this runs
      if (authModal) {
        authModal.style.display = 'block';
        showAuthForm('loginForm'); // Default to login form
        clearErrorMessages();
      } else {
        // If authModal is null here, it means selection failed after injection
        console.error("Authentication modal DOM element not found after injection!");
      }
    }

    function closeAuthModal() {
      if (authModal) {
        authModal.style.display = 'none';
        clearErrorMessages();
      }
    }

    // Switches between Login and Signup forms within the modal
    function showAuthForm(formId) {
        clearErrorMessages();
        // Ensure these elements exist before manipulating them
        const loginTabButton = document.querySelector('#authModal .tab-button[onclick*="loginForm"]');
        const signupTabButton = document.querySelector('#authModal .tab-button[onclick*="signupForm"]');

        if (formId === 'loginForm' && loginForm && signupForm) {
            loginForm.style.display = 'block';
            signupForm.style.display = 'none';
            loginTabButton?.classList.add('active'); // Use optional chaining ?. just in case
            signupTabButton?.classList.remove('active');
        } else if (formId === 'signupForm' && loginForm && signupForm) {
            loginForm.style.display = 'none';
            signupForm.style.display = 'block';
            loginTabButton?.classList.remove('active');
            signupTabButton?.classList.add('active');
        }
    }

    // Clears any previous error messages in the forms
    function clearErrorMessages() {
        if (loginErrorP) loginErrorP.textContent = '';
        if (signupErrorP) signupErrorP.textContent = '';
    }

    // --- Event Listeners Setup ---
    // Attach listeners now that the relevant DOM elements (including the modal) should exist.

    // Listener for the main "User" link in the sidebar (this element is always in index.html)
    if (userLink) {
        userLink.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default link navigation
            // Check if the user is logged in (by checking for the token)
            if (!localStorage.getItem('authToken')) {
                 // Open the modal IF it has been loaded and selected successfully
                 if (authModal) {
                    openAuthModal();
                 } else {
                    console.error("Cannot open modal - it wasn't loaded or selected correctly.");
                 }
            } else {
                // If logged in, handle profile action (remains the same)
                console.log("User is logged in. Profile action needed?");
            }
        });
    } else {
        console.warn("Element with ID 'userLink' not found.");
    }

    // Listener for the modal's close button (the 'X')
    // Ensure closeModalButton was found after injection
    if (closeModalButton) {
        closeModalButton.addEventListener('click', closeAuthModal);
    } else {
         console.warn("Modal close button '#authModal .close-button' not found after injection.");
    }

    // Listener to close the modal if the user clicks outside the modal content
    window.addEventListener('click', (event) => {
      // Check if the modal exists (i.e., was loaded) and if the click target is the modal background
      if (authModal && event.target == authModal) {
        closeAuthModal();
      }
    });

    // Listener for login form submission
    // Ensure loginForm was found after injection
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    } else {
         console.warn("Element with ID 'loginForm' not found after injection.");
    }

    // Listener for signup form submission
    // Ensure signupForm was found after injection
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    } else {
        console.warn("Element with ID 'signupForm' not found after injection.");
    }

    // Listener for the logout button in the profile section (this element is always in index.html)
    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
    } else {
         console.warn("Element with ID 'log_out' not found.");
    }


    // --- Authentication Handler Functions --- (Keep these as they were)

    // Handles the login form submission
    async function handleLogin(e) {
      e.preventDefault(); // Prevent page reload
      clearErrorMessages();
      // Get elements again within handler just to be safe, or rely on variables above
      const emailInput = document.getElementById('loginEmail');
      const passwordInput = document.getElementById('loginPassword');

      // Check if error element exists
      if (!loginErrorP) {
          console.error("Login error paragraph element not found.");
          return;
      }
      if (!emailInput || !passwordInput) {
          loginErrorP.textContent = 'Form elements not found.';
          return;
      }


      const email = emailInput.value;
      const password = passwordInput.value;

      // Add basic frontend validation
      if (!email || !password) {
          loginErrorP.textContent = 'Please enter both email and password.';
          return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (res.ok && data.success) { // Check response status code as well
          // Store token and user info in localStorage
          localStorage.setItem('authToken', data.token);
          localStorage.setItem('userEmail', data.email);
          updateUIForLoggedInUser(data.email); // Update sidebar/profile display
          closeAuthModal(); // Close the modal on successful login
        } else {
          // Display error message from backend or a default message
          loginErrorP.textContent = data.message || `Login failed (${res.status}). Please check credentials.`;
        }
      } catch (error) {
        console.error('Login Fetch Error:', error);
        loginErrorP.textContent = 'An network error occurred. Please try again.';
      }
    }

    // Handles the signup form submission
    async function handleSignup(e) {
        e.preventDefault(); // Prevent page reload
        clearErrorMessages();
        const emailInput = document.getElementById('signupEmail');
        const passwordInput = document.getElementById('signupPassword');
        const confirmPasswordInput = document.getElementById('signupConfirmPassword');

        // Check if error element exists
        if (!signupErrorP) {
            console.error("Signup error paragraph element not found.");
            return;
        }
        if (!emailInput || !passwordInput || !confirmPasswordInput) {
            signupErrorP.textContent = 'Form elements not found.';
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        // Frontend validation
        if (!email || !password || !confirmPassword) {
            signupErrorP.textContent = 'Please fill in all fields.';
            return;
        }
        if (password !== confirmPassword) {
            signupErrorP.textContent = 'Passwords do not match.';
            return;
        }
        if (password.length < 6) {
             signupErrorP.textContent = 'Password must be at least 6 characters long.';
            return;
        }
        // Basic email format check (optional, browser does some validation too)
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            signupErrorP.textContent = 'Please enter a valid email address.';
            return;
        }


        try {
            const res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (res.ok && data.success) { // Check status code
                // Store token and user info (same as login)
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userEmail', data.email);
                updateUIForLoggedInUser(data.email); // Update UI
                closeAuthModal(); // Close modal on success
            } else {
                // Display error message from backend or default
                signupErrorP.textContent = data.message || `Signup failed (${res.status}). Please try again.`;
            }
        } catch (error) {
            console.error('Signup Fetch Error:', error);
             signupErrorP.textContent = 'An network error occurred. Please try again.';
        }
    }

    // Handles the logout action
    function handleLogout() {
      // Clear user data from localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      updateUIForLoggedOutUser(); // Update the UI to reflect logged-out state

      // Optional: Redirect to homepage or show a message
      // A simple page reload is often easiest to reset everything
      window.location.reload();
    }

    // --- UI Update Functions (Called on login/logout/page load) --- (Keep as they were)

    // Updates the sidebar/UI elements for a logged-in user
    function updateUIForLoggedInUser(email) {
        // These elements are in index.html, so they should always be selectable
        if (userLinkName) userLinkName.textContent = 'Profile'; // Change link text
        if (userTooltip) userTooltip.textContent = 'Profile';   // Change tooltip text
        if (profileEmail) profileEmail.textContent = email;    // Display email in profile section
        if (profileName) profileName.textContent = "Welcome!"; // Or fetch/use username later

        if (profileSection) profileSection.style.display = 'flex'; // Show the profile section
        // Optional: Hide the original "Login / Signup" link if profile section replaces it functionally
        // if (userLink) userLink.closest('li').style.display = 'none';
    }

    // Resets the sidebar/UI elements for a logged-out user
    function updateUIForLoggedOutUser() {
        // These elements are in index.html
        if (userLinkName) userLinkName.textContent = 'Login / Signup';
        if (userTooltip) userTooltip.textContent = 'User';
        if (profileSection) profileSection.style.display = 'none'; // Hide the profile section

        // Optional: Ensure the original user link is visible if it was hidden when logged in
        // if (userLink) userLink.closest('li').style.display = 'list-item'; // Or 'block'
    }

    // --- Initial Check on Page Load ---

    // Checks localStorage on page load to see if user was already logged in
    function checkLoginStatus() {
      const token = localStorage.getItem('authToken');
      const email = localStorage.getItem('userEmail');

      // Basic check: If token and email exist, assume logged in for now
      if (token && email) {
        // **Security Note:** For production, you should ideally have a backend endpoint
        // `/api/auth/verify` or `/api/user/me` that takes the token and confirms
        // it's valid before updating the UI. Relying only on localStorage isn't
        // fully secure as tokens can expire or be invalid.
        updateUIForLoggedInUser(email); // Update UI based on stored data (simpler approach)
      } else {
        updateUIForLoggedOutUser(); // If no token/email, ensure UI is in logged-out state
      }
    }

    // Run the initial login status check now that everything is set up
    checkLoginStatus();

    // ========= END AUTHENTICATION LOGIC =========

} // --- End of initializeAuthLogic function ---


// --- Trigger Loading ---
// Use DOMContentLoaded for the main page structure, then fetch/init the modal logic.
document.addEventListener('DOMContentLoaded', loadAuthModalHTML);