// liked_movies.js - Displays Recommendations (Backend) & Liked Series (LocalStorage)

document.addEventListener('DOMContentLoaded', function() {
  console.log('[LikedMovies] DOM Content Loaded');

  // --- Configuration ---
  const API_BASE_URL = '/api'; // Backend API
  const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
  const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
  const TMDB_API_KEY = 'd37c49fbb30e8f5eb1000b388ab5bf71';

  // --- DOM Elements ---
  const moviesContainer = document.getElementById('moviesContainer');
  const seriesContainer = document.getElementById('seriesContainer'); // Get the new container

  if (!moviesContainer) {
      console.error('[LikedMovies] CRITICAL: Element with ID "moviesContainer" not found!');
      // Don't necessarily return, maybe series can still load
  }
  if (!seriesContainer) {
      console.error('[LikedMovies] CRITICAL: Element with ID "seriesContainer" not found!');
  }

  // Sidebar elements
  let sidebar = document.querySelector(".sidebar");
  let closeBtn = document.querySelector("#btn");
  let searchBtn = document.querySelector(".bx-search");

  // --- Authentication ---
  const token = localStorage.getItem('authToken');
  if (!token) {
      console.log('[LikedMovies] No auth token found.');
      if (moviesContainer) {
          moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Log in for recommendations.</p>';
      }
       if (seriesContainer) {
          seriesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Log in to see liked series.</p>';
      }
      document.title = "Log in to View";
      return; // Stop execution
  }
  console.log('[LikedMovies] Auth token found.');

  // --- Dynamic Title Update ---
  document.title = "Recommendations & Liked Series";

  // --- Load Data ---
  fetchAndDisplayRecommendations(token);
  fetchAndDisplayLikedSeries(); // Doesn't need token directly, uses localStorage

});

// ================================================
//      FETCH & DISPLAY MOVIE RECOMMENDATIONS
// ================================================
async function fetchAndDisplayRecommendations(token) {
  const container = document.getElementById('moviesContainer');
  if (!container) return; // Exit if container missing

  console.log('[LikedMovies] Starting recommendations fetch...');
  displayShimmerPlaceholders(container, 8); // Show loading state

  try {
      const response = await fetch(`/api/user/recommendations`, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });

      console.log('[LikedMovies] Recommendations fetch response:', response.status);
      container.innerHTML = ''; // Clear placeholders

      if (!response.ok) {
          handleFetchError(response, container, "recommendations");
          return;
      }

      const data = await response.json();
      console.log('[LikedMovies] Recommendations data received:', data);

      if (!data || !Array.isArray(data.recommendations)) {
          console.error('[LikedMovies] Invalid recommendations data format:', data);
          container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Unexpected data format for recommendations.</p>';
          return;
      }

      const recommendations = data.recommendations;
      if (recommendations.length === 0) {
          console.log('[LikedMovies] No recommendations available.');
          // Simplified message - could add check to /api/user/likes here later
          container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">No movie recommendations yet. Like some movies!</p>';
          return;
      }

      console.log(`[LikedMovies] Rendering ${recommendations.length} recommendation cards...`);
      recommendations.forEach(movieData => {
          if (movieData && movieData.id) {
              // Use the card style from the *original* liked_movies.js
              const movieElement = createMovieCard_OriginalStyle(movieData);
              container.appendChild(movieElement);
          } else {
              console.warn("[LikedMovies] Skipping invalid recommendation data:", movieData);
          }
      });

  } catch (error) {
      console.error('[LikedMovies] CRITICAL ERROR fetching recommendations:', error);
      if (container) container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Error loading recommendations. Check console.</p>';
  }
}

// ================================================
//      FETCH & DISPLAY LIKED SERIES
// ================================================
async function fetchAndDisplayLikedSeries() {
  const container = document.getElementById('seriesContainer');
  if (!container) return; // Exit if container missing

  const apiKey = 'YOUR_TMDB_API_KEY'; // <<< PUT KEY HERE AGAIN
  if (apiKey === 'YOUR_TMDB_API_KEY' || !apiKey) {
       console.error("TMDB API Key is missing for fetching series details!");
       container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Configuration error: Cannot fetch series details.</p>';
       return;
  }


  console.log('[LikedMovies] Checking localStorage for liked series...');
  const likedSeriesIdsRaw = localStorage.getItem('likedSeries');
  const likedSeriesIds = likedSeriesIdsRaw ? JSON.parse(likedSeriesIdsRaw) : [];

  if (!Array.isArray(likedSeriesIds) || likedSeriesIds.length === 0) {
      console.log('[LikedMovies] No liked series found in localStorage.');
      container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">You haven\'t liked any series yet.</p>';
      return;
  }

  console.log(`[LikedMovies] Found ${likedSeriesIds.length} liked series IDs. Fetching details...`);
  displayShimmerPlaceholders(container, likedSeriesIds.length); // Show loading

  const seriesDetailsPromises = likedSeriesIds.map(seriesId => {
      const url = `https://api.themoviedb.org/3/tv/${seriesId}?api_key=${apiKey}&language=en-US`;
      return fetch(url)
          .then(response => {
              if (!response.ok) {
                  console.error(`Error fetching details for series ID ${seriesId}: ${response.status}`);
                  return null; // Return null for failed fetches
              }
              return response.json();
          })
          .catch(error => {
              console.error(`Network error fetching details for series ID ${seriesId}:`, error);
              return null; // Return null for network errors
          });
  });

  try {
      const seriesDetailsResults = await Promise.all(seriesDetailsPromises);
      container.innerHTML = ''; // Clear placeholders

      console.log('[LikedMovies] Rendering liked series cards...');
      let displayedCount = 0;
      seriesDetailsResults.forEach(seriesData => {
          if (seriesData && seriesData.id) {
              // Use a similar card style, adapting for series (name vs title)
              const seriesElement = createSeriesCard_OriginalStyle(seriesData);
              container.appendChild(seriesElement);
              displayedCount++;
          } else {
               console.warn("[LikedMovies] Skipping null or invalid series data.");
          }
      });
      console.log(`[LikedMovies] Displayed ${displayedCount} liked series.`);
      if(displayedCount === 0 && likedSeriesIds.length > 0) {
          container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Could not load details for liked series.</p>';
      }


  } catch (error) {
       console.error('[LikedMovies] Error processing series details:', error);
       if (container) container.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Error displaying liked series.</p>';
  }
}


// ================================================
//      HELPER FUNCTIONS
// ================================================

// --- Utility to display shimmer placeholders ---
function displayShimmerPlaceholders(container, count) {
  if (!container) return;
  container.innerHTML = ''; // Clear previous content
  const placeholderCount = Math.max(1, Math.min(count, 12)); // Show reasonable number
  console.log(`[LikedMovies] Displaying ${placeholderCount} shimmers in`, container.id);
  for (let i = 0; i < placeholderCount; i++) {
      const cardPlaceholder = document.createElement('div');
      cardPlaceholder.classList.add('movie-card'); // Use same class for layout
      const shimmerDiv = document.createElement('div');
      shimmerDiv.classList.add('shimmer-bg');
      cardPlaceholder.appendChild(shimmerDiv);
      container.appendChild(cardPlaceholder);
  }
}

// --- Utility to handle fetch errors ---
async function handleFetchError(response, container, type) {
   const errorText = await response.text();
   console.error(`[LikedMovies] Error fetching ${type}. Status: ${response.status}. Response: ${errorText}`);
   if (response.status === 401 || response.status === 403) {
       container.innerHTML = `<p style="color: #ccc; text-align: center; padding: 20px;">Authentication error loading ${type}. Please log in again.</p>`;
   } else {
       container.innerHTML = `<p style="color: #ccc; text-align: center; padding: 20px;">Could not load ${type} (Error ${response.status}).</p>`;
   }
    if (response.status >= 500) {
       console.error(`[LikedMovies] Hint: Check Vercel Function logs for backend errors related to ${type}.`);
   }
}


// --- Create Movie Card - MATCHING ORIGINAL STYLE ---
function createMovieCard_OriginalStyle(movie) {
  const movieCard = document.createElement('div');
  movieCard.classList.add('movie-card'); // Class from your CSS
  movieCard.addEventListener('click', () => {
      handlePosterClick('movie', movie.id);
    });

  // Image handling (preloading, error state)
  const img = new Image();
  const imageUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : '';
  img.src = imageUrl;
  img.alt = movie.title ? `${movie.title}` : 'Movie poster'; // Simpler alt text like original

  img.onload = function() {
      // Structure matching your first example
      movieCard.innerHTML = `
          <img src="${this.src}" alt="${this.alt}" style="width: 100%; height: auto; display: block;">
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
          </div>
      `;
  };
  img.onerror = function() {
       // Fallback similar to original example
      movieCard.innerHTML = `
          <div class="movie-details" style="padding: 10px; height: 300px; display: flex; align-items: center; justify-content: center;">
               <h3 class="movie-title" style="text-align: center;">Image not available</h3>
          </div>
      `;
       movieCard.style.cursor = 'pointer'; // Keep clickable
  };

  // Initial placeholder structure (optional, but good practice)
  movieCard.innerHTML = `
      <div style="background-color: #282828; height: 300px;"></div>
      <div class="movie-details">
          <h3 class="movie-title">Loading...</h3>
      </div>
  `;

  return movieCard;
}

// --- Create Series Card - Adapted Original Style ---
function createSeriesCard_OriginalStyle(series) {
  const seriesCard = document.createElement('div');
  // Use the same class for consistency, or create a 'series-card' class if styling differs
  seriesCard.classList.add('movie-card');
  seriesCard.addEventListener('click', () => {
      handlePosterClick('tv', series.id);
    });

  const img = new Image();
  const imageUrl = series.poster_path ? `https://image.tmdb.org/t/p/w500${series.poster_path}` : '';
  // Use series 'name' for title and alt text
  img.src = imageUrl;
  img.alt = series.name ? `${series.name}` : 'Series poster';

  img.onload = function() {
      seriesCard.innerHTML = `
          <img src="${this.src}" alt="${this.alt}" style="width: 100%; height: auto; display: block;">
          <div class="movie-details">
              <h3 class="movie-title">${series.name || 'Title Unavailable'}</h3>
          </div>
      `;
  };
  img.onerror = function() {
      seriesCard.innerHTML = `
          <div class="movie-details" style="padding: 10px; height: 300px; display: flex; align-items: center; justify-content: center;">
               <h3 class="movie-title" style="text-align: center;">Image not available</h3>
          </div>
      `;
       seriesCard.style.cursor = 'pointer';
  };

  // Initial placeholder structure
  seriesCard.innerHTML = `
      <div style="background-color: #282828; height: 300px;"></div>
      <div class="movie-details">
          <h3 class="movie-title">Loading...</h3>
      </div>
  `;

  return seriesCard;
}


// --- Helper Function for Click Handling (Handles both types) ---
function handlePosterClick(mediaType, mediaId) {
  console.log(`[LikedMovies] Poster clicked - Type: ${mediaType}, ID: ${mediaId}`);
  let url = '';
  if (mediaType === 'movie') {
    // Relative path from liked_movies folder
    url = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
  } else if (mediaType === 'tv') {
     // Relative path from liked_movies folder
    url = `../series_details/series_details.html?type=tv&id=${mediaId}`;
  } else {
    console.error('[LikedMovies] Unknown media type for click:', mediaType);
    return; // Don't navigate
  }
  window.location.href = url;
}


// --- Sidebar Logic --- (Keep as is) ---
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
// ... (rest of sidebar logic remains unchanged) ...
if (closeBtn && sidebar) { closeBtn.addEventListener("click", ()=>{ sidebar.classList.toggle("open"); menuBtnChange(); }); }
if (searchBtn && sidebar) { searchBtn.addEventListener("click", ()=>{ sidebar.classList.toggle("open"); menuBtnChange(); }); }
function menuBtnChange() { if (!sidebar || !closeBtn) return; if(sidebar.classList.contains("open")){ closeBtn.classList.replace("bx-menu", "bx-menu-alt-right"); } else { closeBtn.classList.replace("bx-menu-alt-right","bx-menu"); } }

// --- Search Function --- (Keep as is) ---
function searchMovies() { const searchInput = document.getElementById('searchInput'); if (!searchInput) return; const query = searchInput.value.trim(); if (query.length === 0) return; const url = `../results/results.html?query=${encodeURIComponent(query)}`; window.location.href = url; }
const searchInput = document.getElementById('searchInput'); if (searchInput) { searchInput.addEventListener('keydown', function(event) { if (event.key === 'Enter') { event.preventDefault(); searchMovies(); } }); }

// --- Logout Functionality --- (Keep as is) ---
const logoutButton = document.getElementById('log_out'); if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('authToken'); window.location.href = '../auth/login.html'; }); }

console.log('[LikedMovies] Script finished loading.');