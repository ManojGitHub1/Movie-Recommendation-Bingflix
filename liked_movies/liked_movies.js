// liked_movies.js - Now displays recommendations

document.addEventListener('DOMContentLoaded', async function() { // Use async for await

  // --- Configuration ---
  const API_BASE_URL = '/api'; // Relative path to your backend API on Vercel
  // No TMDB API Key needed here anymore, backend handles it!
  const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // Keep for image URLs

  // --- DOM Elements ---
  const moviesContainer = document.getElementById('moviesContainer');
  // Keep sidebar elements if needed by sidebar logic later
  let sidebar = document.querySelector(".sidebar");
  let closeBtn = document.querySelector("#btn");
  let searchBtn = document.querySelector(".bx-search");

  // --- Authentication ---
  const token = localStorage.getItem('authToken');

  if (!token) {
      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Please log in to see your movie recommendations.</p>';
      // You might want to update the page title or heading dynamically too
      document.title = "Log in for Recommendations";
      // Add a heading update if you have one:
      // const pageHeading = document.getElementById('page-heading'); // Example ID
      // if (pageHeading) pageHeading.textContent = "Please Log In";
      return; // Stop execution if not logged in
  }

  // --- Dynamic Title/Heading Update (Optional) ---
  document.title = "Your Movie Recommendations";
  // Add a heading update if you have one:
  // const pageHeading = document.getElementById('page-heading'); // Example ID
  // if (pageHeading) pageHeading.textContent = "Your Movie Recommendations";


  // --- Initial Loading State (Similar to previous method) ---
  // Display multiple shimmer placeholders initially for visual consistency
  // Let's assume we might get up to 10 recommendations (adjust if needed)
  moviesContainer.innerHTML = ''; // Clear any previous content
  const placeholderCount = 10; // Number of shimmer cards to show initially
  for (let i = 0; i < placeholderCount; i++) {
      const movieCardPlaceholder = document.createElement('div');
      movieCardPlaceholder.classList.add('movie-card'); // Use existing class for layout
      const shimmerDiv = document.createElement('div');
      shimmerDiv.classList.add('shimmer-bg'); // Use existing shimmer class
      movieCardPlaceholder.appendChild(shimmerDiv);
      moviesContainer.appendChild(movieCardPlaceholder);
  }
  // Add a loading text as well (optional)
  const loadingText = document.createElement('p');
  loadingText.id = 'loading-message';
  loadingText.textContent = 'Loading recommendations...';
  loadingText.style.color = '#ccc';
  loadingText.style.textAlign = 'center';
  loadingText.style.width = '100%';
  loadingText.style.padding = '20px';
  moviesContainer.prepend(loadingText); // Add text above placeholders


  try {
      // --- 1. Fetch Recommendations (Detailed Objects) from Backend ---
      const response = await fetch(`${API_BASE_URL}/user/recommendations`, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });

      // Clear placeholders and loading message regardless of outcome (unless error before fetch)
      moviesContainer.innerHTML = '';

      if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
               moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Authentication failed. Please log in again.</p>';
          } else {
               moviesContainer.innerHTML = `<p style="color: #ccc; text-align: center; padding: 20px;">Error fetching recommendations (${response.status}). Please try again later.</p>`;
          }
          console.error('Error fetching recommendations:', response.status, response.statusText);
          return; // Stop execution
      }

      const data = await response.json();
      // Backend now sends { recommendations: [ {movieObj1}, {movieObj2}, ...] }
      const recommendations = data.recommendations;

      if (!recommendations || recommendations.length === 0) {
          // Check if the user has liked movies to know if recommendations *should* exist
          try {
              const likesResponse = await fetch(`${API_BASE_URL}/user/likes`, { // Need this endpoint too now
                   method: 'GET',
                   headers: { 'Authorization': `Bearer ${token}` }
              });
               if (likesResponse.ok) {
                  const likesData = await likesResponse.json();
                  if (likesData.likedMovies && likesData.likedMovies.length > 0) {
                      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Generating your recommendations... Check back soon!</p>';
                  } else {
                      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Like some movies first to get recommendations!</p>';
                  }
              } else {
                   moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Start liking movies to get recommendations.</p>';
              }
          } catch (likesError) {
               moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Like some movies to get recommendations.</p>';
          }
          return;
      }

      // --- 2. Display Each Recommended Movie ---
      // We already have the details, just create the cards
      recommendations.forEach(movieData => {
          // Check if movieData is valid (backend might have filtered nulls, but double-check)
          if (movieData && movieData.id) {
               const movieElement = createMovieCard(movieData); // Use helper function
               moviesContainer.appendChild(movieElement);
          } else {
              console.warn("Received invalid movie data object in recommendations:", movieData);
          }
      });

  } catch (error) { // Catch errors from the fetch itself or JSON parsing
      console.error('Failed to load recommendations:', error);
      // Ensure placeholders are cleared on error too
      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">An unexpected error occurred while loading recommendations.</p>';
  }
});

// --- Helper Function to Create Movie Card HTML ---
// (Modified slightly to use TMDB_IMAGE_BASE_URL constant and better defaults)
function createMovieCard(movie) { // Receives the detailed movie object from our backend
  const movieCard = document.createElement('div');
  movieCard.classList.add('movie-card');
  movieCard.addEventListener('click', () => {
      // Use 'movie' type explicitly
      handlePosterClick('movie', movie.id);
  });

  const imageUrl = movie.poster_path
      ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` // Use constant if defined or hardcode
      : ''; // Handle missing poster

  const img = new Image();
  img.src = imageUrl;
  img.alt = movie.title || 'Movie Poster';

  img.onload = function() {
      movieCard.innerHTML = `
          <img src="${this.src}" alt="${this.alt}" style="width: 100%; height: auto; display: block;">
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
              </div>
      `;
  };
  img.onerror = function() {
      movieCard.innerHTML = `
          <div style="background-color: #222; height: 300px; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center;">
              <p style="color: #888; font-size: 14px; margin-bottom: 10px;">Image<br>Not Available</p>
          </div>
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
          </div>
      `;
      movieCard.style.cursor = 'pointer';
  };

  // Initial simple structure while image loads - prevents layout shifts
   movieCard.innerHTML = `
      <div style="background-color: #222; height: 300px;"></div>
      <div class="movie-details">
          <h3 class="movie-title">${movie.title || 'Loading...'}</h3>
      </div>
  `;

  return movieCard;
}


// --- Helper Function for Click Handling ---
// (Kept from your examples, path adjusted assuming liked_movies is one level down)
function handlePosterClick(mediaType, mediaId) {
  if (mediaType === 'movie') {
    window.location.href = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
  }
  // Removed series logic as this page is for movie recommendations
  else {
    console.error('Unknown media type:', mediaType);
  }
}


// --- Sidebar Logic ---
// (Kept exactly as in your examples)
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");

if (closeBtn && sidebar) {
  closeBtn.addEventListener("click", ()=>{
      sidebar.classList.toggle("open");
      menuBtnChange();
  });
}

if (searchBtn && sidebar) {
  searchBtn.addEventListener("click", ()=>{
      sidebar.classList.toggle("open");
      menuBtnChange();
  });
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
// (Kept exactly as in your examples, path adjusted)
function searchMovies() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  const query = searchInput.value;
  if (query.trim().length === 0) {
    console.log("Search query is empty.");
    return;
  }
  const url = `../results/results.html?query=${encodeURIComponent(query)}`;
  window.location.href = url;
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keydown', function(event) {
      if (event.key === 'Enter') {
          searchMovies();
      }
  });
}

// --- Logout Functionality ---
// (Kept, path adjusted)
const logoutButton = document.getElementById('log_out');
if (logoutButton) {
  logoutButton.addEventListener('click', () => {
      localStorage.removeItem('authToken');
      // Redirect to login page (adjust path as needed from liked_movies folder)
      window.location.href = '../auth/login.html'; // Assuming auth is sibling to liked_movies
  });
}