// liked_movies.js - Displays recommendations fetched from backend

document.addEventListener('DOMContentLoaded', async function() {
  console.log('[LikedMovies] DOM Content Loaded');

  // --- Configuration ---
  const API_BASE_URL = '/api'; // Relative path to backend API on Vercel
  const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

  // --- DOM Elements ---
  const moviesContainer = document.getElementById('moviesContainer');
  if (!moviesContainer) {
      console.error('[LikedMovies] CRITICAL: Element with ID "moviesContainer" not found!');
      return; // Stop if container doesn't exist
  }
  console.log('[LikedMovies] moviesContainer found:', moviesContainer);

  // Sidebar elements (keep references for later logic)
  let sidebar = document.querySelector(".sidebar");
  let closeBtn = document.querySelector("#btn");
  let searchBtn = document.querySelector(".bx-search");

  // --- Authentication ---
  const token = localStorage.getItem('authToken');
  if (!token) {
      console.log('[LikedMovies] No auth token found in localStorage.');
      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Please log in to see your movie recommendations.</p>';
      document.title = "Log in for Recommendations";
      return; // Stop execution
  }
  console.log('[LikedMovies] Auth token found.'); // Don't log the token itself

  // --- Dynamic Title Update ---
  document.title = "Your Movie Recommendations";

  // --- Initial Loading State with Shimmer ---
  moviesContainer.innerHTML = ''; // Clear previous content
  const placeholderCount = 8; // Adjust as needed
  console.log(`[LikedMovies] Displaying ${placeholderCount} shimmer placeholders.`);
  for (let i = 0; i < placeholderCount; i++) {
      const movieCardPlaceholder = document.createElement('div');
      movieCardPlaceholder.classList.add('movie-card');
      const shimmerDiv = document.createElement('div');
      shimmerDiv.classList.add('shimmer-bg');
      movieCardPlaceholder.appendChild(shimmerDiv);
      moviesContainer.appendChild(movieCardPlaceholder);
  }
  // Add loading text (optional)
  // const loadingText = document.createElement('p'); /* ... */ moviesContainer.prepend(loadingText);

  try {
      // --- 1. Fetch Recommendations from Backend ---
      const recommendationUrl = `${API_BASE_URL}/user/recommendations`;
      console.log(`[LikedMovies] Fetching recommendations from: ${recommendationUrl}`);

      const response = await fetch(recommendationUrl, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });

      console.log('[LikedMovies] Fetch response received:', response.status, response.statusText);

      // Clear placeholders *after* fetch attempt, before checking status
      moviesContainer.innerHTML = '';

      if (!response.ok) {
          const errorText = await response.text(); // Get error details from response body if available
          console.error(`[LikedMovies] Error fetching recommendations. Status: ${response.status}. Response: ${errorText}`);
          if (response.status === 401 || response.status === 403) {
               moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Authentication error. Please log in again.</p>';
          } else {
               moviesContainer.innerHTML = `<p style="color: #ccc; text-align: center; padding: 20px;">Could not load recommendations (Error ${response.status}). Check console or try again later.</p>`;
          }
          // Also check Vercel function logs for backend errors if status is 5xx
          if (response.status >= 500) {
              console.error("[LikedMovies] Hint: Check Vercel Function logs for backend errors.");
          }
          return; // Stop execution
      }

      // Try parsing the JSON response
      const data = await response.json();
      console.log('[LikedMovies] Successfully parsed JSON response:', data);

      // **CRITICAL CHECK:** Does the response data have the 'recommendations' array?
      if (!data || !Array.isArray(data.recommendations)) {
           console.error('[LikedMovies] ERROR: Backend response is missing or does not contain a "recommendations" array.', data);
           moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Received unexpected data format from the server.</p>';
           return;
      }

      const recommendations = data.recommendations;
      console.log(`[LikedMovies] Received ${recommendations.length} recommendations.`);

      // --- 2. Handle No Recommendations ---
      if (recommendations.length === 0) {
          console.log('[LikedMovies] No recommendations found in the response.');
          // SIMPLIFIED MESSAGE: We won't check /api/user/likes for now to reduce complexity.
          moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">No movie recommendations available yet. Like some movies to get started!</p>';
          // Later, you could add the check to /api/user/likes here for a more specific message.
          return; // Stop execution
      }

      // --- 3. Display Recommendations ---
      console.log('[LikedMovies] Rendering recommendation cards...');
      recommendations.forEach((movieData, index) => {
          if (movieData && movieData.id) { // Basic validation
               // console.log(`[LikedMovies] Creating card for: ${movieData.title || movieData.id}`); // Uncomment for detailed logging
               const movieElement = createMovieCard(movieData); // Use helper function
               moviesContainer.appendChild(movieElement);
          } else {
              console.warn(`[LikedMovies] Skipping invalid movie data object at index ${index}:`, movieData);
          }
      });
      console.log('[LikedMovies] Finished rendering cards.');

  } catch (error) { // Catch network errors (e.g., DNS, CORS - unlikely here) or JSON parsing errors
      console.error('[LikedMovies] CRITICAL ERROR during fetch/processing:', error);
      // Ensure placeholders/loading message are cleared on error
      if (moviesContainer.innerHTML.includes('shimmer-bg')) {
          moviesContainer.innerHTML = '';
      }
      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">An unexpected error occurred. Please check your connection and the console.</p>';
  }
});

// --- Helper Function to Create Movie Card HTML ---
// (Same robust version as before, uses TMDB_IMAGE_BASE_URL)
function createMovieCard(movie) {
  const movieCard = document.createElement('div');
  movieCard.classList.add('movie-card');
  movieCard.addEventListener('click', () => {
      handlePosterClick('movie', movie.id);
  });

  const imageUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` // Use constant
      : '';

  const img = new Image();
  img.src = imageUrl;
  img.alt = movie.title ? `${movie.title} Poster` : 'Movie Poster';

  img.onload = function() {
      movieCard.innerHTML = `
          <img src="${this.src}" alt="${this.alt}" style="width: 100%; height: auto; display: block; border-bottom: 1px solid #333;">
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
          </div>
      `;
  };
  img.onerror = function() {
      movieCard.innerHTML = `
          <div style="background-color: #1a1a1a; height: 300px; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; border-bottom: 1px solid #333;">
              <i class='bx bx-image-alt' style="font-size: 48px; color: #555; margin-bottom: 10px;"></i>
              <p style="color: #888; font-size: 12px;">Image Not Available</p>
          </div>
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
          </div>
      `;
       movieCard.style.cursor = 'pointer';
  };

  // Initial placeholder structure while image loads
  movieCard.innerHTML = `
      <div style="background-color: #282828; height: 300px; display: flex; align-items: center; justify-content: center;">
           <i class='bx bx-loader-alt bx-spin' style='color:#777; font-size: 30px;' ></i>
      </div>
      <div class="movie-details">
          <h3 class="movie-title" style="color: #aaa;">${movie.title || 'Loading...'}</h3>
      </div>
  `;
  return movieCard;
}


// --- Helper Function for Click Handling ---
// (Relative path from liked_movies folder)
function handlePosterClick(mediaType, mediaId) {
  // console.log(`[LikedMovies] Poster clicked - Type: ${mediaType}, ID: ${mediaId}`); // Debug logging
  if (mediaType === 'movie') {
    window.location.href = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
  } else {
    console.error('[LikedMovies] Unsupported media type for click:', mediaType);
  }
}


// --- Sidebar Logic ---
// (Keep exactly as provided before)
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");

if (closeBtn && sidebar) {
  // console.log("[LikedMovies] Adding listener to sidebar close button."); // Debug logging
  closeBtn.addEventListener("click", ()=>{
      sidebar.classList.toggle("open");
      menuBtnChange();
  });
} else {
  console.warn("[LikedMovies] Sidebar close button or sidebar element not found.");
}

if (searchBtn && sidebar) {
  // console.log("[LikedMovies] Adding listener to sidebar search button."); // Debug logging
  searchBtn.addEventListener("click", ()=>{
      sidebar.classList.toggle("open");
      menuBtnChange();
  });
} else {
   console.warn("[LikedMovies] Sidebar search button or sidebar element not found.");
}

function menuBtnChange() {
  if (!sidebar || !closeBtn) return;
  if(sidebar.classList.contains("open")){
      closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");
  } else {
      closeBtn.classList.replace("bx-menu-alt-right","bx-menu");
  }
}

// --- Search Function ---
// (Keep exactly as provided before)
function searchMovies() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) {
       console.error("[LikedMovies] Search input element not found.");
       return;
  }
  const query = searchInput.value.trim();
  if (query.length === 0) {
    console.log("[LikedMovies] Search query is empty.");
    return;
  }
  const url = `../results/results.html?query=${encodeURIComponent(query)}`;
  console.log(`[LikedMovies] Navigating to search results: ${url}`);
  window.location.href = url;
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  // console.log("[LikedMovies] Adding keydown listener to search input."); // Debug logging
  searchInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
           event.preventDefault();
           searchMovies();
      }
  });
} else {
   console.warn("[LikedMovies] Search input element not found for keydown listener.");
}

// --- Logout Functionality ---
// (Keep exactly as provided before)
const logoutButton = document.getElementById('log_out');
if (logoutButton) {
  // console.log("[LikedMovies] Adding listener to logout button."); // Debug logging
  logoutButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log("[LikedMovies] Logout button clicked.");
      localStorage.removeItem('authToken');
      window.location.href = '../auth/login.html'; // Adjust path if needed
  });
} else {
   console.warn("[LikedMovies] Logout button element not found.");
}

console.log('[LikedMovies] Script finished loading.');