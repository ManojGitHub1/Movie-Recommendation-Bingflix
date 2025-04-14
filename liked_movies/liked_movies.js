// liked_movies.js - Displays Recommendations, Liked Movies, Liked Series with new UI

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LikedMovies] DOM Content Loaded - New UI');

    // --- Configuration ---
    const API_BASE_URL = '/api'; // Backend API
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500'; // Poster images
    const TMDB_API_KEY = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Your TMDB API key (needed for liked item details)

    // --- DOM Elements ---
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    const likedMoviesContainer = document.getElementById('likedMoviesContainer');
    const likedSeriesContainer = document.getElementById('likedSeriesContainer');

    // Check if containers exist
    if (!recommendationsContainer || !likedMoviesContainer || !likedSeriesContainer) {
        console.error('[LikedMovies] CRITICAL: One or more content containers not found! Ensure IDs recommendationsContainer, likedMoviesContainer, likedSeriesContainer exist.');
        return;
    }

    // Sidebar elements (keep references for existing sidebar logic)
    let sidebar = document.querySelector(".sidebar");
    let closeBtn = document.querySelector("#btn");
    let searchBtn = document.querySelector(".bx-search");

    // --- Authentication ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('[LikedMovies] No auth token found.');
        displayLoggedOutMessage(recommendationsContainer, 'recommendations');
        displayLoggedOutMessage(likedMoviesContainer, 'liked movies');
        displayLoggedOutMessage(likedSeriesContainer, 'liked series');
        document.title = "Log in to View My Stuff";
        return;
    }
    console.log('[LikedMovies] Auth token found.');

    // --- Update Title ---
    document.title = "My Stuff - Bingflix";

    // --- Load All Sections ---
    // Use Promise.all to fetch recommendations and likes somewhat concurrently
    displayLoadingState(recommendationsContainer, 'recommendations');
    displayLoadingState(likedMoviesContainer, 'liked movies');
    displayLoadingState(likedSeriesContainer, 'liked series');

    Promise.all([
        fetchRecommendations(token, recommendationsContainer),
        fetchLikesAndDetails(token, likedMoviesContainer, likedSeriesContainer)
    ]).then(() => {
        console.log("[LikedMovies] All loading promises settled.");
        // Initialization of event listeners that depend on cards being present can go here
        initializeCardEventListeners(); // Example
    }).catch(error => {
        console.error("[LikedMovies] Error during initial data loading:", error);
        // Display a general error maybe? Specific errors handled in fetch functions
    });

}); // End DOMContentLoaded

// ================================================
//      FETCH & DISPLAY FUNCTIONS
// ================================================

async function fetchRecommendations(token, container) {
    console.log('[LikedMovies] Fetching recommendations...');
    try {
        const response = await fetch(`/api/user/recommendations`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching recommendations`); // Let catch block handle
        }

        const data = await response.json();

        if (!data || !Array.isArray(data.recommendations)) {
            console.error('[LikedMovies] Invalid recommendations data format:', data);
            throw new Error("Unexpected data format for recommendations.");
        }

        console.log(`[LikedMovies] Received ${data.recommendations.length} recommendations.`);
        displayItems(data.recommendations, container, 'movie', 'recommendation'); // Recommendations are movies

    } catch (error) {
        console.error('[LikedMovies] Error fetching recommendations:', error);
        displayErrorMessage(container, 'recommendations');
    }
}

async function fetchLikesAndDetails(token, moviesContainer, seriesContainer) {
    console.log('[LikedMovies] Fetching liked item IDs...');
    try {
        const response = await fetch(`/api/user/likes`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status} fetching likes`);
        }

        const data = await response.json();
        console.log('[LikedMovies] Received liked IDs:', data);

        if (!data || !Array.isArray(data.likedMovies) || !Array.isArray(data.likedSeries)) {
             console.error('[LikedMovies] Invalid likes data format:', data);
             throw new Error("Unexpected data format for likes.");
        }

        const likedMovieIds = data.likedMovies;
        const likedSeriesIds = data.likedSeries;

        // Fetch details for movies and series concurrently
        const [movieDetails, seriesDetails] = await Promise.all([
            fetchDetailsForIds(likedMovieIds, 'movie'),
            fetchDetailsForIds(likedSeriesIds, 'tv') // Use 'tv' for TMDB series type
        ]);

        console.log(`[LikedMovies] Fetched details for ${movieDetails.length} movies and ${seriesDetails.length} series.`);

        // Display items in their respective containers
        displayItems(movieDetails, moviesContainer, 'movie', 'liked-movie');
        displayItems(seriesDetails, seriesContainer, 'tv', 'liked-series');

    } catch (error) {
        console.error('[LikedMovies] Error fetching or processing likes:', error);
        displayErrorMessage(moviesContainer, 'liked movies');
        displayErrorMessage(seriesContainer, 'liked series');
    }
}

// Helper function to fetch full details for an array of IDs from TMDB
async function fetchDetailsForIds(ids, type) {
    if (!ids || ids.length === 0) {
        return []; // No IDs to fetch
    }

    const apiKey = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Use your key
    const detailPromises = ids.map(id => {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US`;
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    console.warn(`Failed to fetch details for ${type} ID ${id}: ${res.status}`);
                    return null; // Don't break Promise.all for one failure
                }
                return res.json();
            })
            .catch(err => {
                console.error(`Network error fetching details for ${type} ID ${id}:`, err);
                return null;
            });
    });

    const results = await Promise.all(detailPromises);
    return results.filter(item => item !== null); // Filter out failed fetches
}


// ================================================
//      DISPLAY & UI FUNCTIONS
// ================================================

// Displays items (movies/series) in the specified container using the new card style
function displayItems(items, container, itemType, cardType) { // cardType: 'recommendation', 'liked-movie', 'liked-series'
    container.innerHTML = ''; // Clear loading/previous content

    if (!items || items.length === 0) {
        let message = '';
        if (cardType === 'recommendation') message = 'No recommendations available yet. Try liking some movies!';
        else if (cardType === 'liked-movie') message = 'You haven\'t liked any movies yet.';
        else if (cardType === 'liked-series') message = 'You haven\'t liked any series yet.';
        container.innerHTML = `<p class="empty-message">${message}</p>`;
        return;
    }

    items.forEach(itemData => {
        if (itemData && itemData.id) {
            const cardElement = createCard_NewStyle(itemData, itemType, cardType);
            container.appendChild(cardElement);
        } else {
            console.warn(`[LikedMovies] Skipping invalid item data in ${container.id}:`, itemData);
        }
    });
}

// Creates a card element based on the new UI template
function createCard_NewStyle(itemData, itemType, cardType) { // itemType: 'movie' or 'tv'
    const card = document.createElement('div');
    card.classList.add('card');
    if (cardType === 'liked-movie' || cardType === 'liked-series') {
        card.classList.add('is-liked'); // Add class to target delete button display
    }
    card.dataset.itemId = itemData.id; // Store ID on card
    card.dataset.itemType = itemType; // Store type on card

    const posterPath = itemData.poster_path ? `${TMDB_IMAGE_BASE_URL}${itemData.poster_path}` : '';
    card.style.backgroundImage = posterPath ? `url('${posterPath}')` : 'none'; // Set background
    if (!posterPath) {
         card.style.backgroundColor = '#333'; // Fallback background
    }


    const releaseDate = itemType === 'movie' ? itemData.release_date : itemData.first_air_date;
    const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const title = itemType === 'movie' ? itemData.title : itemData.name;
    const overview = itemData.overview || 'No overview available.';
    // Tagline might not always be present, especially for series from list endpoints
    const tagline = itemData.tagline || '';


    // --- Delete Button (Only for liked items) ---
    let deleteButtonHTML = '';
    if (cardType === 'liked-movie' || cardType === 'liked-series') {
        // Add data attributes needed for delete functionality
        deleteButtonHTML = `
            <button class="delete-like-btn bx bx-trash"
                    title="Remove from Likes"
                    data-id="${itemData.id}"
                    data-type="${itemType}">
            </button>
        `;
    }

    card.innerHTML = `
        ${deleteButtonHTML}
        <div class="date">${formattedDate}</div>
        <div class="content">
            <div class="title">${title || 'Title Unavailable'}</div>
            ${tagline ? `<div class="tagline">${tagline}</div>` : ''}
        </div>
        <div class="sinopse"> <!-- Hover content -->
            <div class="content-sinopse">
                <div class="text">${overview}</div>
                <button class="view-details-btn" data-id="${itemData.id}" data-type="${itemType}">View Details</button>
            </div>
        </div>
    `;

    return card;
}


// --- Loading / Error Message Helpers ---
function displayLoadingState(container, type) {
    if(container) container.innerHTML = `<p class="loading-message">Loading ${type}...</p>`;
}

function displayErrorMessage(container, type) {
     if(container) container.innerHTML = `<p class="empty-message">Could not load ${type}. Please try again later.</p>`;
}

function displayLoggedOutMessage(container, type){
    if(container) container.innerHTML = `<p class="empty-message">Please log in to see your ${type}.</p>`;
}

// ================================================
//      EVENT LISTENERS
// ================================================

function initializeCardEventListeners() {
    const mainContentArea = document.querySelector('.home-section'); // Delegate listeners to parent

    if (!mainContentArea) {
        console.error("Cannot initialize card listeners: .home-section not found.");
        return;
    }

    mainContentArea.addEventListener('click', function(event) {
        // --- Handle "View Details" Button Click ---
        if (event.target.classList.contains('view-details-btn')) {
            const button = event.target;
            const itemId = button.dataset.id;
            const itemType = button.dataset.type;
            if (itemId && itemType) {
                handlePosterClick(itemType, itemId); // Reuse existing navigation function
            }
        }

        // --- Handle "Delete Like" Button Click ---
        if (event.target.classList.contains('delete-like-btn')) {
            const button = event.target;
            const itemId = button.dataset.id;
            const itemType = button.dataset.type; // 'movie' or 'tv'

            // Prevent the click from triggering card navigation if delete button is inside card
            event.stopPropagation();

            if (itemId && itemType) {
                console.log(`Attempting to delete ${itemType} with ID: ${itemId}`);
                // Call the function to handle the deletion (we'll implement this in Step 3)
                 handleDeleteLike(button, itemType, itemId);
            }
        }

        // --- Handle Card Click (if not clicking a specific button) ---
        // Find the closest ancestor card element
        const card = event.target.closest('.card');
        // Check if the click was directly on the card or its non-interactive children,
        // AND not on one of the buttons we handle separately.
        if (card && !event.target.closest('button')) {
             const itemId = card.dataset.itemId;
             const itemType = card.dataset.itemType;
             if (itemId && itemType) {
                 handlePosterClick(itemType, itemId);
             }
        }
    });
}

// --- Placeholder for Delete Function (To be implemented in Step 3) ---
async function handleDeleteLike(buttonElement, itemType, itemId) {
    // 1. Confirm with user (optional but recommended)
    if (!confirm(`Are you sure you want to remove this ${itemType} from your likes?`)) {
        return;
    }

    console.log(`Confirmed deletion for ${itemType} ID ${itemId}. (Backend call not implemented yet)`);
    // 2. Get auth token
    // 3. Determine correct DELETE endpoint (`/api/user/likes/movie/${itemId}` or `/api/user/likes/series/${itemId}`)
    // 4. Make fetch DELETE request to backend
    // 5. On successful response (e.g., 200 or 204):
    //    - Remove the card element from the DOM: buttonElement.closest('.card').remove();
    //    - Optionally show a success message
    // 6. On error:
    //    - Show an error message to the user

    // --- TEMPORARY: Remove card visually for demo ---
     buttonElement.closest('.card').remove();
     alert(`${itemType} removed visually (backend delete not yet implemented).`);
    // --- END TEMPORARY ---

}


// --- Helper Function for Click Handling (Navigates to details page) ---
// (Same as your previous version)
function handlePosterClick(mediaType, mediaId) {
    console.log(`[LikedMovies] Navigating - Type: ${mediaType}, ID: ${mediaId}`);
    let url = '';
    if (mediaType === 'movie') {
        url = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
    } else if (mediaType === 'tv') {
        url = `../series_details/series_details.html?type=tv&id=${mediaId}`;
    } else {
        console.error('[LikedMovies] Unknown media type for navigation:', mediaType);
        return;
    }
    window.location.href = url;
}


// ================================================
//      EXISTING SIDEBAR, SEARCH, LOGOUT LOGIC
// ================================================
// (Keep exactly as provided in your last JS snippet)
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
// ... (rest of sidebar, search, logout logic remains unchanged) ...
if (closeBtn && sidebar) { closeBtn.addEventListener("click", ()=>{ sidebar.classList.toggle("open"); menuBtnChange(); }); }
if (searchBtn && sidebar) { searchBtn.addEventListener("click", ()=>{ sidebar.classList.toggle("open"); menuBtnChange(); }); }
function menuBtnChange() { if (!sidebar || !closeBtn) return; if(sidebar.classList.contains("open")){ closeBtn.classList.replace("bx-menu", "bx-menu-alt-right"); } else { closeBtn.classList.replace("bx-menu-alt-right","bx-menu"); } }
function searchMovies() { const searchInput = document.getElementById('searchInput'); if (!searchInput) return; const query = searchInput.value.trim(); if (query.length === 0) return; const url = `../results/results.html?query=${encodeURIComponent(query)}`; window.location.href = url; }
const searchInput = document.getElementById('searchInput'); if (searchInput) { searchInput.addEventListener('keydown', function(event) { if (event.key === 'Enter') { event.preventDefault(); searchMovies(); } }); }
const logoutButton = document.getElementById('log_out'); if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('authToken'); window.location.href = '../auth/login.html'; }); }

console.log('[LikedMovies] New UI Script finished loading.');