/**
 * Fetches the auth modal HTML content from 'auth/auth.html',
 * injects it into the '#authModalContainer' div in index.html,
 * and then calls initializeAuthLogic to set up its functionality.
 */
async function loadAuthModalHTML() {
  try {
    const response = await fetch('auth/auth.html');
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const html = await response.text();
    const container = document.getElementById('authModalContainer');
    if (container) {
      container.innerHTML = html;
      initializeAuthLogic(); // Initialize logic AFTER HTML is injected
    } else {
      console.error('#authModalContainer not found in index.html!');
    }
  } catch (error) {
    console.error('Failed to load auth modal HTML:', error);
  }
}

/**
 * Initializes all authentication logic after the modal HTML is loaded.
 * Selects DOM elements, sets up event listeners, and defines handlers.
 */
function initializeAuthLogic() {

  // --- DOM Element Selection ---
  // Select elements from both index.html and the dynamically loaded auth modal
  const authModal = document.getElementById('authModal');
  const userLink = document.getElementById('userLink');
  const userLinkName = document.getElementById('userLinkName');
  const userTooltip = document.getElementById('userTooltip');
  const profileSection = document.getElementById('profileSection');
  const profileName = document.getElementById('profileName'); // Assumes ID in index.html
  const profileEmail = document.getElementById('profileEmail'); // Assumes ID in index.html
  const logoutSection = document.getElementById('logoutSection');
  const logoutButton = document.getElementById('log_out'); // Assumes ID in index.html
  const closeModalButton = document.querySelector('#authModal .close-button');
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  const loginErrorP = document.getElementById('loginError');
  const signupErrorP = document.getElementById('signupError');
  const tabButtons = document.querySelectorAll('#authModal .tab-button'); // Select all tab buttons

  // --- API Configuration ---
  const API_BASE_URL = '/api'; // Relative path for Vercel deployment

  // --- Modal Handling & Utility Functions ---

  /** Opens the authentication modal. */
  function openAuthModal() {
    if (authModal) {
      authModal.style.display = 'block';
      showAuthForm('loginForm'); // Default to login
      clearErrorMessages();
    } else {
      console.error("Auth modal DOM element not found!");
    }
  }

  /** Closes the authentication modal. */
  function closeAuthModal() {
    if (authModal) {
      authModal.style.display = 'none';
      clearErrorMessages();
    }
  }

  /** Clears error messages in both forms. */
  function clearErrorMessages() {
    if (loginErrorP) loginErrorP.textContent = '';
    if (signupErrorP) signupErrorP.textContent = '';
  }

  /**
   * Shows the specified form ('loginForm' or 'signupForm') and hides the other.
   * Updates the active state of the corresponding tab button.
   */
  function showAuthForm(formIdToShow) {
    clearErrorMessages();

    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    if (!loginForm || !signupForm) {
         console.error("Login or Signup form element not found within showAuthForm.");
         return;
    }

    // Toggle the 'active-form' class based on which form should be shown
    if (formIdToShow === 'loginForm') {
        loginForm.classList.add('active-form');
        signupForm.classList.remove('active-form');
    } else {
        loginForm.classList.remove('active-form');
        signupForm.classList.add('active-form');
    }

    // Update tab button active states
    const tabButtons = document.querySelectorAll('#authModal .tab-button');
    tabButtons.forEach(button => {
        if (button.dataset.form === formIdToShow) {
            button.classList.add('active');
        } else {
            button.classList.remove('active');
        }
    });
  }

  // --- Event Listeners Setup ---

  // Add click listeners to Tab Buttons
  tabButtons.forEach(button => {
    if (button && button.dataset.form) {
        button.addEventListener('click', () => showAuthForm(button.dataset.form));
    } else {
        console.warn("Found a tab button without a data-form attribute or button itself is invalid.");
    }
  });

  // Listener for the main "User" link in the sidebar (opens modal if logged out)
  if (userLink) {
    userLink.addEventListener('click', (e) => {
      e.preventDefault();
      if (!localStorage.getItem('authToken')) {
        openAuthModal(); // openAuthModal already checks if authModal exists
      } else {
        console.log("User is logged in. Profile action needed?"); // Placeholder action
      }
    });
  } else { console.warn("#userLink not found."); }

  // Listener for the modal's close 'X' button
  if (closeModalButton) {
    closeModalButton.addEventListener('click', closeAuthModal);
  } else { console.warn("Modal close button not found."); }

  // Listener to close modal on backdrop click
  window.addEventListener('click', (event) => {
    if (authModal && event.target === authModal) {
      closeAuthModal();
    }
  });

  // Listeners for form submissions
  if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
  } else { console.warn("#loginForm not found."); }

  if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
  } else { console.warn("#signupForm not found."); }

  // Listener for the logout button
  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  } else { console.warn("#log_out button not found."); }


  // --- Authentication Handler Functions ---

  /** Handles the login form submission, calls the API. */
  async function handleLogin(e) {
    e.preventDefault();
    clearErrorMessages();
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    if (!loginErrorP || !emailInput || !passwordInput) return console.error("Login form elements missing");
    const email = emailInput.value;
    const password = passwordInput.value;
    if (!email || !password) return loginErrorP.textContent = 'Please enter both email and password.';

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userEmail', data.email);
        // If backend sends username during login (which it should if using previous backend example):
        // if (data.username) localStorage.setItem('username', data.username);
        updateUIForLoggedInUser(data.email /*, data.username */); // Pass username if available
        closeAuthModal();
      } else {
        loginErrorP.textContent = data.message || `Login failed (${res.status}).`;
      }
    } catch (error) {
      console.error('Login Fetch Error:', error);
      loginErrorP.textContent = 'A network error occurred.';
    }
  }

  /** Handles the signup form submission, calls the API. */
  async function handleSignup(e) {
    e.preventDefault();
    clearErrorMessages();
    const emailInput = document.getElementById('signupEmail');
    const passwordInput = document.getElementById('signupPassword');
    const confirmPasswordInput = document.getElementById('signupConfirmPassword');
    if (!signupErrorP || !emailInput || !passwordInput || !confirmPasswordInput) return console.error("Signup form elements missing");

    const email = emailInput.value;
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;

    // Basic frontend validation
    if (!email || !password || !confirmPassword) { signupErrorP.textContent = 'Please fill in all fields.'; return; }
    if (password !== confirmPassword) { signupErrorP.textContent = 'Passwords do not match.'; return; }
    if (password.length < 6) { signupErrorP.textContent = 'Password must be at least 6 characters long.'; return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { signupErrorP.textContent = 'Please enter a valid email address.'; return; }

    try {
      // Assumes backend expects only email/password for signup based on rollback
      const res = await fetch(`${API_BASE_URL}/auth/register`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userEmail', data.email);
        // If backend sends username during registration:
        // if (data.username) localStorage.setItem('username', data.username);
        updateUIForLoggedInUser(data.email /*, data.username */); // Pass username if available
        closeAuthModal();
      } else {
        signupErrorP.textContent = data.message || `Signup failed (${res.status}).`;
      }
    } catch (error) {
      console.error('Signup Fetch Error:', error);
      signupErrorP.textContent = 'A network error occurred.';
    }
  }

  /** Handles the logout action. */
  function handleLogout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userEmail');
    // localStorage.removeItem('username'); // Remove username if it was stored
    updateUIForLoggedOutUser();
    window.location.reload(); // Reload for clean state
  }

  // --- UI Update Functions ---

  /** Updates sidebar/UI elements for a logged-in user. */

  function extractNameFromEmail(email) {
    if (!email) return; // Don't proceed if email is missing

    // --- Extract Name from Email ---
    let displayName = "Welcome!"; // Default fallback
    try {
      // Find the index of '@'
      const atIndex = email.indexOf('@');
      // If '@' exists and is not the first character
      if (atIndex > 0) {
        // Extract the part before '@'
        displayName = email.substring(0, atIndex);
        // Optional: Capitalize the first letter
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
      } else {
        // If email format is weird, fallback to the full email or default
        console.warn("Could not extract name from email format:", email);
        displayName = "Welcome!"; // Or keep "Welcome!"
      }
    } catch (error) {
      console.error("Error extracting name from email:", error);
      // Keep the default "Welcome!" in case of errors
    }
    return displayName;
  }

  function updateUIForLoggedInUser(email /*, username */) { // Accept username if available
    if (userLinkName) userLinkName.textContent = 'Profile';
    if (userTooltip) userTooltip.textContent = 'Profile';
    // Update profile section - use username if provided, otherwise default/email
    let displayName = extractNameFromEmail(email); // Extract name from email
    if (profileName) {
      profileName.textContent = displayName;
    }
    
    if (profileEmail) profileEmail.textContent = email;
    if (profileSection) profileSection.style.display = 'flex';
    if (logoutSection) logoutSection.style.display = 'list-item';
  }

  /** Resets sidebar/UI elements for a logged-out user. */
  function updateUIForLoggedOutUser() {
    if (userLinkName) userLinkName.textContent = 'Login / Signup';
    if (userTooltip) userTooltip.textContent = 'User';
    if (profileSection) profileSection.style.display = 'none';
    if (logoutSection) logoutSection.style.display = 'none';
  }

  // --- Initial Check on Page Load ---

  /** Checks localStorage on load and sets the initial UI state. */
  function checkLoginStatus() {
    const token = localStorage.getItem('authToken');
    const email = localStorage.getItem('userEmail');
    // const username = localStorage.getItem('username'); // Get username if stored

    // Check for token and email (and potentially username)
    if (token && email /* && username */) {
      // Note: Token verification with backend is more secure
      updateUIForLoggedInUser(email /*, username */);
    } else {
      // Clear potentially partial data and ensure logged out state
      localStorage.removeItem('authToken');
      localStorage.removeItem('userEmail');
      // localStorage.removeItem('username');
      updateUIForLoggedOutUser();
    }
  }

  // Run the initial check to set UI state correctly on load
  checkLoginStatus();

} // --- End of initializeAuthLogic function ---

// --- Trigger Loading ---
// Wait for the main document structure to be ready, then load the modal HTML & init logic.
document.addEventListener('DOMContentLoaded', loadAuthModalHTML);