document.addEventListener('DOMContentLoaded', async function() {

  // --- Configuration ---
  const API_BASE_URL = '/api'; // Relative path to backend API
  const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // For displaying posters

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
      document.title = "Log in for Recommendations";
      // Optional: Update a heading on the page if it exists
      // const pageHeading = document.querySelector('.some-heading-class');
      // if (pageHeading) pageHeading.textContent = "Please Log In";
      return; // Stop execution if not logged in
  }

  // --- Dynamic Title Update ---
  document.title = "Your Movie Recommendations";
   // Optional: Update a heading on the page if it exists
  // const pageHeading = document.querySelector('.some-heading-class');
  // if (pageHeading) pageHeading.textContent = "Your Movie Recommendations";


  // --- Initial Loading State with Shimmer ---
  moviesContainer.innerHTML = ''; // Clear previous content
  const placeholderCount = 10; // Show several placeholders
  for (let i = 0; i < placeholderCount; i++) {
      const movieCardPlaceholder = document.createElement('div');
      movieCardPlaceholder.classList.add('movie-card');
      const shimmerDiv = document.createElement('div');
      shimmerDiv.classList.add('shimmer-bg');
      movieCardPlaceholder.appendChild(shimmerDiv);
      moviesContainer.appendChild(movieCardPlaceholder);
  }
  const loadingText = document.createElement('p');
  loadingText.id = 'loading-message';
  loadingText.textContent = 'Loading recommendations...';
  loadingText.style.cssText = 'color: #ccc; text-align: center; width: 100%; padding: 20px;';
  moviesContainer.prepend(loadingText); // Add text above placeholders

  try {
      // --- 1. Fetch Recommendations from Backend ---
      const response = await fetch(`${API_BASE_URL}/user/recommendations`, {
          method: 'GET',
          headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
          }
      });

      // Clear placeholders and loading message once fetch completes
      moviesContainer.innerHTML = '';

      if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
               moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Authentication error. Please log in again.</p>';
          } else {
               const errorData = await response.text(); // Try to get error details
               console.error('Error fetching recommendations:', response.status, errorData);
               moviesContainer.innerHTML = `<p style="color: #ccc; text-align: center; padding: 20px;">Could not load recommendations (Error ${response.status}). Please try again later.</p>`;
          }
          return; // Stop execution
      }

      const data = await response.json();
      const recommendations = data.recommendations; // Array of detailed movie objects

      // --- 2. Handle No Recommendations ---
      if (!recommendations || recommendations.length === 0) {
          // Check if the user has liked movies to provide better context
          try {
              const likesResponse = await fetch(`${API_BASE_URL}/user/likes`, {
                   method: 'GET',
                   headers: { 'Authorization': `Bearer ${token}` }
              });
               if (likesResponse.ok) {
                  const likesData = await likesResponse.json();
                  if (likesData.likedMovies && likesData.likedMovies.length > 0) {
                      // User has likes, but no recommendations yet
                      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Generating your recommendations based on your liked movies... Check back shortly!</p>';
                  } else {
                      // User has no likes
                      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Like some movies first to get personalized recommendations!</p>';
                  }
              } else {
                   // Error fetching likes, provide generic message
                   moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Start liking movies to receive recommendations.</p>';
              }
          } catch (likesError) {
               console.error("Error checking user likes:", likesError);
               moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">Like movies to get recommendations. Could not verify current likes.</p>';
          }
          return; // Stop execution since there are no recommendations to display
      }

      // --- 3. Display Recommendations ---
      recommendations.forEach(movieData => {
          if (movieData && movieData.id) { // Basic validation
               const movieElement = createMovieCard(movieData); // Use helper function
               moviesContainer.appendChild(movieElement);
          } else {
              console.warn("Skipping invalid movie data in recommendations:", movieData);
          }
      });

  } catch (error) { // Catch network errors or JSON parsing errors
      console.error('Failed to load recommendations:', error);
      // Ensure placeholders/loading message are cleared on error
      if (moviesContainer.querySelector('.shimmer-bg') || document.getElementById('loading-message')) {
          moviesContainer.innerHTML = '';
      }
      moviesContainer.innerHTML = '<p style="color: #ccc; text-align: center; padding: 20px;">An unexpected error occurred. Please check your connection and try again.</p>';
  }
});

// --- Helper Function to Create Movie Card HTML ---
function createMovieCard(movie) { // Receives detailed object { id, title, poster_path, ... }
  const movieCard = document.createElement('div');
  movieCard.classList.add('movie-card');
  movieCard.addEventListener('click', () => {
      handlePosterClick('movie', movie.id);
  });

  // Use the TMDB_IMAGE_BASE_URL constant defined at the top
  const imageUrl = movie.poster_path
      ? `${TMDB_IMAGE_BASE_URL}${movie.poster_path}`
      : ''; // Handle missing poster path

  const img = new Image(); // Use Image object for loading/error handling
  img.src = imageUrl;
  img.alt = movie.title ? `${movie.title} Poster` : 'Movie Poster'; // Better alt text

  // Define structure *after* image loads or fails
  img.onload = function() {
      movieCard.innerHTML = `
          <img src="${this.src}" alt="${this.alt}" style="width: 100%; height: auto; display: block; border-bottom: 1px solid #333;">
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
          </div>
      `;
  };
  img.onerror = function() {
      // Fallback display when image fails to load
      movieCard.innerHTML = `
          <div style="background-color: #1a1a1a; height: 300px; display: flex; align-items: center; justify-content: center; flex-direction: column; text-align: center; border-bottom: 1px solid #333;">
              <i class='bx bx-image-alt' style="font-size: 48px; color: #555; margin-bottom: 10px;"></i>
              <p style="color: #888; font-size: 12px;">Image Not Available</p>
          </div>
          <div class="movie-details">
              <h3 class="movie-title">${movie.title || 'Title Unavailable'}</h3>
          </div>
      `;
       movieCard.style.cursor = 'pointer'; // Ensure it remains clickable
  };

  // Initial simple structure while image loads (prevents layout shifts if image is slow)
  // Match height from shimmer CSS if possible (e.g., 300px)
  movieCard.innerHTML = `
      <div style="background-color: #282828; height: 300px; display: flex; align-items: center; justify-content: center;">
           <i class='bx bx-loader-alt bx-spin' style='color:#777; font-size: 30px;' ></i> <!-- Optional spinner -->
      </div>
      <div class="movie-details">
          <h3 class="movie-title" style="color: #aaa;">${movie.title || 'Loading...'}</h3>
      </div>
  `;

  return movieCard;
}


// --- Helper Function for Click Handling ---
// Navigate to movie details page (relative path from liked_movies folder)
function handlePosterClick(mediaType, mediaId) {
  if (mediaType === 'movie') {
    // Assumes movie_details is a sibling folder to liked_movies
    window.location.href = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
  } else {
    console.error('Unsupported media type for click:', mediaType);
  }
}


// --- Sidebar Logic ---
// (Keep exactly as provided before)
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
// (Keep exactly as provided before, relative path from liked_movies folder)
function searchMovies() {
  const searchInput = document.getElementById('searchInput');
  if (!searchInput) return;

  const query = searchInput.value.trim(); // Trim whitespace
  if (query.length === 0) {
    console.log("Search query is empty.");
    // Optionally: provide feedback to user (e.g., input border color)
    return;
  }
  // Assumes results is a sibling folder to liked_movies
  const url = `../results/results.html?query=${encodeURIComponent(query)}`;
  window.location.href = url;
}

const searchInput = document.getElementById('searchInput');
if (searchInput) {
  searchInput.addEventListener('keydown', function(event) {
      // Use 'Enter' key for submission
      if (event.key === 'Enter') {
           event.preventDefault(); // Prevent potential form submission if inside one
           searchMovies();
      }
  });
}

// --- Logout Functionality ---
// (Keep exactly as provided before, relative path from liked_movies folder)
const logoutButton = document.getElementById('log_out');
if (logoutButton) {
  logoutButton.addEventListener('click', (e) => {
      e.preventDefault(); // Good practice if it's an <a> tag
      localStorage.removeItem('authToken');
      // Assumes auth is a sibling folder to liked_movies
      window.location.href = '../auth/login.html';
      // Optional: Redirect to home page instead
      // window.location.href = '../index.html';
  });
}