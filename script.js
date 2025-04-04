//movies
const now_playing = `https://bingflix-backend.vercel.app/movies/now_playing`;
const top_rated = `https://bingflix-backend.vercel.app/movies/top_rated`;

const nowPlayingIndia = `https://bingflix-backend.vercel.app/movies/now_playing_india`;
const bollywood = `https://bingflix-backend.vercel.app/movies/bollywood`;

//series
//const now_airing =`https://api.themoviedb.org/3/tv/on_the_air?api_key=${apiKey}`;
const top_rated_series = `https://bingflix-backend.vercel.app/series/top_rated`;
const korean_series = `https://bingflix-backend.vercel.app/series/korean`;

function fetchAndDisplayMovies(url, containerId) {
  const movieList = document.querySelector("#" + containerId);
  movieList.innerHTML = ""; // Clear previous content
  // Add shimmer animation placeholder
  movieList.classList.add("shimmer-placeholder");

  fetch(url)
    .then((response) => response.json()) //callback function (returning response.json())
    .then((data) => {
      //const movieList = document.querySelector('#' + containerId);
      movieList.classList.remove("shimmer-placeholder"); // Remove the shimmer animation placeholder

      data.results.forEach((movie) => {
        const image = document.createElement("img");
        image.classList.add("card-image");
        image.src = `https://image.tmdb.org/t/p/w200${movie.poster_path}`;
        image.alt = movie.title;
        image.style.cursor = "pointer";
        image.style.borderRadius = "1.2rem";

        // Inside the loop
        image.classList.add("card-image");
        image.addEventListener("mouseenter", () => {
          image.style.transform = "scale(1.1)";
        });
        image.addEventListener("mouseleave", () => {
          image.style.transform = "scale(1)";
        });

        image.addEventListener("click", () => {
          handlePosterClick(movie.id);
        });

        movieList.appendChild(image);
      });

      adjustImageHeights();
    })
    .catch((error) => console.error("Error fetching data:", error));
}

function handlePosterClick(movieId) {
  // Redirect to movie details page with movie ID as URL parameter
  window.location.href = `movie_details/movie_details.html?id=${movieId}`;
}

function fetchAndDisplaySeries(url, containerId) {
  const seriesList = document.querySelector("#" + containerId);
  seriesList.innerHTML = ""; // Clear previous content
  // Add shimmer animation placeholder
  seriesList.classList.add("shimmer-placeholder");

  fetch(url)
    .then((response) => response.json()) //callback function (returning response.json())
    .then((data) => {
      seriesList.classList.remove("shimmer-placeholder"); // Remove the shimmer animation placeholder

      data.results.forEach((series) => {
        const image = document.createElement("img");
        image.classList.add("card-image");
        image.src = `https://image.tmdb.org/t/p/w200${series.poster_path}`;
        image.alt = series.name;
        image.style.cursor = "pointer";
        image.style.borderRadius = "1.2rem";

        image.classList.add("card-image");
        image.addEventListener("mouseenter", () => {
          image.style.transform = "scale(1.1)";
        });
        image.addEventListener("mouseleave", () => {
          image.style.transform = "scale(1)";
        });

        image.addEventListener("click", () => {
          fetchAndDisplaySeriesEpisodes(series.id);
        });

        seriesList.appendChild(image);
      });

      adjustImageHeights();
    })
    .catch((error) => console.error("Error fetching data:", error));
}

function fetchAndDisplaySeriesEpisodes(seriesId) {
  // Redirect to series details page with series ID as URL parameter
  window.location.href = `series_details/series_details.html?id=${seriesId}`;
}

//populating big movies caraousel with API Data
document.addEventListener("DOMContentLoaded", async function () {
  try {
    const topMoviesUrl = `https://bingflix-backend.vercel.app/movies/popular`;

    const response = await fetch(topMoviesUrl);
    const data = await response.json();

    const slider = document.querySelector(".slider");

    data.results.slice(0, 6).forEach((movie) => {
      const item = document.createElement("li");
      item.classList.add("item");
      item.style.backgroundImage = `url('https://image.tmdb.org/t/p/original${movie.backdrop_path}')`;

      const content = document.createElement("div");
      content.classList.add("content");
      content.innerHTML = `
              <h2 class='title'>${movie.title}</h2>
              <p class='description'>${movie.overview}</p>
              <a href=movie_details/movie_details.html?id=${movie.id} class="watch-now-button">Watch Now</a>
          `;

      const nav = document.querySelector(".nav");
      const movieItems = document.querySelectorAll(".item");

      item.appendChild(content);
      slider.appendChild(item);
    });
  } catch (error) {
    console.error("Error fetching top movies:", error);
  }
});

//populating mini movies caraousel
document.addEventListener("DOMContentLoaded", function () {
  fetchAndDisplayMovies(now_playing, "movies");
  fetchAndDisplayMovies(top_rated, "topratedmovies");
  fetchAndDisplayMovies(nowPlayingIndia, "moviesind");
  fetchAndDisplayMovies(bollywood, "bollywood");

  // Series
  //fetchAndDisplaySeries(now_airing, 'series');
  fetchAndDisplaySeries(top_rated_series, "seriestr");
  fetchAndDisplaySeries(korean_series, "koreanseries");
});

//Slider Caraousel Nav-bar logic , which controls the slider animation
document.addEventListener("DOMContentLoaded", function () {
  let a = 6;
  const slider = document.querySelector(".slider");
  const nav = document.querySelector(".nav");

  function activate(e) {
    let inx = 0;
    const items = document.querySelectorAll(".item");

    e.target.matches(".next") && slider.append(items[0]);
    e.target.matches(".prev") && slider.prepend(items[items.length - 1]);

    items.forEach((item) => {
      item.style.opacity = 1;
    });

    document.querySelector(`.slider .item:nth-child(${a})`).style.opacity = 0;

    if (e.target.matches(".next")) {
      inx = 2;
    }

    nav.addEventListener("mouseenter", () => {
      // Make all movie items visible
      items.forEach((item) => {
        item.style.opacity = 1;
      });

      document.querySelector(`.slider .item:nth-child(6)`).style.opacity = 0;
    });

    nav.addEventListener("mouseleave", () => {
      // Make only movies 2 to 6 invisible
      items.forEach((item, index) => {
        if (index == inx) {
          item.style.opacity = 1;
        } else item.style.opacity = 0;
      });
    });
  }

  nav.addEventListener("click", activate, false);
});

//sidebar logic
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
closeBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
  menuBtnChange(); //calling the function(optional)
});
searchBtn.addEventListener("click", () => {
  // Sidebar open when you click on the search icon
  sidebar.classList.toggle("open");
  menuBtnChange(); //calling the function(optional)
});
// following are the code to change sidebar button(optional)
function menuBtnChange() {
  if (sidebar.classList.contains("open")) {
    closeBtn.classList.replace("bx-menu", "bx-menu-alt-right"); //replacing the icons class
  } else {
    closeBtn.classList.replace("bx-menu-alt-right", "bx-menu"); //replacing the icons class
  }
}

//HANDLES FORWARD AND BACKWARD LOGIC ON BUTTON CLICK

document.addEventListener("DOMContentLoaded", function () {
  // Get all the scroll containers and buttons
  const scrollContainers = document.querySelectorAll(".scroll-container");
  const fwButtons = document.querySelectorAll(".btf");
  const bwButtons = document.querySelectorAll(".btw");

  // Function to scroll the container to the left
  function scrollLeft(container) {
    container.scrollLeft -= 200; // Adjust the scroll amount as needed
  }

  // Function to scroll the container to the right
  function scrollRight(container) {
    container.scrollLeft += 200; // Adjust the scroll amount as needed
  }

  // Attach event listeners to all forward buttons
  fwButtons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      scrollLeft(scrollContainers[index]);
    });
  });

  // Attach event listeners to all backward buttons
  bwButtons.forEach(function (button, index) {
    button.addEventListener("click", function () {
      scrollRight(scrollContainers[index]);
    });
  });
});

//HANDLES PAUSING AND RESUMING OF ANIMATION ON HOVER AND NOT HOVER

document.addEventListener("DOMContentLoaded", function () {
  // Get all the forward buttons, backward buttons, images, and scroll containers
  const fwButtons = document.querySelectorAll(".btf");
  const bwButtons = document.querySelectorAll(".btw");
  const imagesContainers = document.querySelectorAll(".scroll-container");

  function stopAnimation(images) {
    images.forEach((img) => {
      img.style.animation = "none";
    });
  }

  function resumeAnimation(images) {
    images.forEach((img) => {
      img.style.animation = "scrollMovies 20s linear infinite";
    });
  }

  // Attach event listeners to all forward buttons
  fwButtons.forEach((fwButton, index) => {
    const images = imagesContainers[index].querySelectorAll("img");
    fwButton.addEventListener("mouseover", () => stopAnimation(images));
    fwButton.addEventListener("mouseleave", () => resumeAnimation(images));
  });

  // Attach event listeners to all backward buttons
  bwButtons.forEach((bwButton, index) => {
    const images = imagesContainers[index].querySelectorAll("img");
    bwButton.addEventListener("mouseover", () => stopAnimation(images));
    bwButton.addEventListener("mouseleave", () => resumeAnimation(images));
  });

  // Attach event listeners to all scroll containers
  imagesContainers.forEach((container) => {
    container.addEventListener("mouseover", () =>
      stopAnimation(container.querySelectorAll("img"))
    );
    container.addEventListener("mouseleave", () =>
      resumeAnimation(container.querySelectorAll("img"))
    );
  });
});

//Searching movies thru query
function searchMovies() {
  const query = document.getElementById("searchInput").value;
  if (query.length < 3) {
    alert("Please enter at least 3 characters for search.");
    return;
  }
  const url = `results/results.html?query=${query}`;
  window.location.href = url;
}

// Function to adjust image heights based on window width (responsiveness)
function adjustImageHeights() {
  const images = document.querySelectorAll(".card-image"); // Select all images

  images.forEach((image) => {
    if (document.body.clientWidth <= 768) {
      image.style.height = "25vh"; // Decrease the height for mobile devices
    } else {
      image.style.height = "35vh"; // Default height for larger screens
    }
  });
}

// Call the adjustImageHeights function whenever the window is resized
window.addEventListener("resize", function () {
  adjustImageHeights();
});









// ========= AUTHENTICATION LOGIC =========

// --- DOM Element Selection ---
const authModal = document.getElementById('authModal');
const userLink = document.getElementById('userLink');
const userLinkName = document.getElementById('userLinkName');
const userTooltip = document.getElementById('userTooltip');
const profileSection = document.getElementById('profileSection');
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
const logoutButton = document.getElementById('log_out'); // Make sure this ID exists on the logout icon/button in the profile section
const closeModalButton = document.querySelector('#authModal .close-button'); // More specific selector for the modal's close button

const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
// Corrected variable names for error paragraphs
const loginErrorP = document.getElementById('loginError');
const signupErrorP = document.getElementById('signupError');

// --- API Configuration ---
// Use a relative path '/api' when deploying frontend and backend together on Vercel.
// For local development, if your API runs on a different port (e.g., 5001),
// you might need to use the full URL like: 'http://localhost:5001/api'
// Make sure CORS is configured correctly on the backend if using different ports locally.
const API_BASE_URL = '/api';

// --- Modal Handling Functions ---
function openAuthModal() {
  if (authModal) {
    authModal.style.display = 'block';
    showAuthForm('loginForm'); // Default to login form
    clearErrorMessages();
  } else {
    console.error("Authentication modal not found!");
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
    const loginTabButton = document.querySelector('.tab-button[onclick*="loginForm"]');
    const signupTabButton = document.querySelector('.tab-button[onclick*="signupForm"]');

    if (formId === 'loginForm' && loginForm && signupForm) {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
        loginTabButton?.classList.add('active');
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

// Listener for the main "User" link in the sidebar
if (userLink) {
    userLink.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default link navigation
        // Check if the user is logged in (by checking for the token)
        // Corrected method name: getItem
        if (!localStorage.getItem('authToken')) {
             openAuthModal(); // If not logged in, open the login/signup modal
        } else {
            // If logged in, you could potentially navigate to a profile page
            // or toggle a user menu. For now, just logs a message.
            console.log("User is logged in. Profile action needed?");
            // Example: Maybe toggle sidebar or navigate:
            // sidebar.classList.toggle('open'); // If you want to open sidebar
            // window.location.href = '/profile.html'; // If you have a profile page
        }
    });
} else {
    console.warn("Element with ID 'userLink' not found.");
}

// Listener for the modal's close button (the 'X')
if (closeModalButton) {
    closeModalButton.addEventListener('click', closeAuthModal);
} else {
     console.warn("Modal close button '.modal .close-button' not found.");
}

// Listener to close the modal if the user clicks outside the modal content
window.addEventListener('click', (event) => {
  // Check if the modal exists and if the click target is the modal background itself
  if (authModal && event.target == authModal) {
    closeAuthModal();
  }
});

// Listener for login form submission
if (loginForm) {
    loginForm.addEventListener('submit', handleLogin);
} else {
     console.warn("Element with ID 'loginForm' not found.");
}

// Listener for signup form submission
if (signupForm) {
    signupForm.addEventListener('submit', handleSignup);
} else {
    console.warn("Element with ID 'signupForm' not found.");
}

// Listener for the logout button in the profile section
if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
} else {
     console.warn("Element with ID 'log_out' not found.");
}


// --- Authentication Handler Functions ---

// Handles the login form submission
async function handleLogin(e) {
  e.preventDefault(); // Prevent page reload
  clearErrorMessages();
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');

  if (!emailInput || !passwordInput || !loginErrorP) return; // Basic check

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

    if (!emailInput || !passwordInput || !confirmPasswordInput || !signupErrorP) return; // Basic check

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

// --- UI Update Functions (Called on login/logout/page load) ---

// Updates the sidebar/UI elements for a logged-in user
function updateUIForLoggedInUser(email) {
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
    // fetch(`${API_BASE_URL}/auth/verify`, { headers: { 'Authorization': `Bearer ${token}` }})
    //   .then(res => res.ok ? res.json() : Promise.reject('Invalid token'))
    //   .then(userData => updateUIForLoggedInUser(userData.email)) // Use data from verified token
    //   .catch(() => handleLogout()); // If token invalid, log out
    updateUIForLoggedInUser(email); // Update UI based on stored data (simpler approach)
  } else {
    updateUIForLoggedOutUser(); // If no token/email, ensure UI is in logged-out state
  }
}

// Run the login status check once the DOM is fully loaded and ready
document.addEventListener('DOMContentLoaded', checkLoginStatus);

// ========= END AUTHENTICATION LOGIC =========