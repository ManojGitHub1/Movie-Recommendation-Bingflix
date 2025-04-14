// liked_movies.js - Displays Recommendations, Liked Movies, Liked Series with new UI + Enhanced Logging

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LikedMovies] DOM Content Loaded - New UI');

    // --- Configuration ---
    const API_BASE_URL = '/api';
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';
    const TMDB_API_KEY = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Ensure this key is active

    // --- DOM Elements ---
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    const likedMoviesContainer = document.getElementById('likedMoviesContainer');
    const likedSeriesContainer = document.getElementById('likedSeriesContainer');

    if (!recommendationsContainer || !likedMoviesContainer || !likedSeriesContainer) {
        console.error('[LikedMovies] CRITICAL: One or more content containers not found!');
        alert("Error: Page structure is missing required elements. Cannot load content."); // User feedback
        return;
    }
    console.log('[LikedMovies] All content containers found.');

    // --- Authentication ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.warn('[LikedMovies] No auth token found. Displaying logged out messages.');
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
    console.log('[LikedMovies] Initiating data loading for all sections...');
    displayLoadingState(recommendationsContainer, 'recommendations');
    displayLoadingState(likedMoviesContainer, 'liked movies');
    displayLoadingState(likedSeriesContainer, 'liked series');

    // Fetch concurrently
    Promise.allSettled([ // Use allSettled to see results even if one fails
        fetchRecommendations(token, recommendationsContainer),
        fetchLikesAndDetails(token, likedMoviesContainer, likedSeriesContainer)
    ]).then((results) => {
        console.log("[LikedMovies] Data loading promises settled. Results:", results);
        // Check results for errors if needed
        results.forEach((result, index) => {
            if (result.status === 'rejected') {
                console.error(`[LikedMovies] Loading failed for section ${index === 0 ? 'Recommendations' : 'Likes'}:`, result.reason);
            }
        });
        // Initialize event listeners after potential content is loaded
        initializeCardEventListeners();
    });

}); // End DOMContentLoaded

// ================================================
//      FETCH & DISPLAY FUNCTIONS (with logging)
// ================================================

async function fetchRecommendations(token, container) {
    const sectionName = 'Recommendations';
    console.log(`[LikedMovies] ${sectionName}: Starting fetch...`);
    try {
        const url = `${API_BASE_URL}/user/recommendations`;
        console.log(`[LikedMovies] ${sectionName}: Fetching from ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log(`[LikedMovies] ${sectionName}: Received response status ${response.status}`);

        if (!response.ok) {
            const errorText = await response.text(); // Try to get error body
            console.error(`[LikedMovies] ${sectionName}: Fetch failed! Status: ${response.status}, Body: ${errorText}`);
            // Throw error to be caught by the catch block below
            throw new Error(`HTTP ${response.status} fetching ${sectionName.toLowerCase()}`);
        }

        const data = await response.json();
        console.log(`[LikedMovies] ${sectionName}: Successfully parsed JSON response:`, data);

        if (!data || !Array.isArray(data.recommendations)) {
            console.error(`[LikedMovies] ${sectionName}: Invalid data format received. 'recommendations' array missing or not an array.`, data);
            throw new Error(`Unexpected data format for ${sectionName.toLowerCase()}.`);
        }

        console.log(`[LikedMovies] ${sectionName}: Received ${data.recommendations.length} items.`);
        displayItems(data.recommendations, container, 'movie', 'recommendation'); // Display items

    } catch (error) {
        console.error(`[LikedMovies] ${sectionName}: CATCH block error:`, error);
        displayErrorMessage(container, sectionName.toLowerCase()); // Display error message in UI
        throw error; // Re-throw error so Promise.allSettled knows it failed
    }
}

async function fetchLikesAndDetails(token, moviesContainer, seriesContainer) {
    const sectionName = 'Likes';
    console.log(`[LikedMovies] ${sectionName}: Starting fetch for liked IDs...`);
    try {
        const url = `${API_BASE_URL}/user/likes`;
        console.log(`[LikedMovies] ${sectionName}: Fetching from ${url}`);
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log(`[LikedMovies] ${sectionName}: Received liked IDs response status ${response.status}`);

        if (!response.ok) {
             const errorText = await response.text();
             console.error(`[LikedMovies] ${sectionName}: Fetch for IDs failed! Status: ${response.status}, Body: ${errorText}`);
             throw new Error(`HTTP ${response.status} fetching ${sectionName.toLowerCase()} IDs`);
        }

        const data = await response.json();
        console.log(`[LikedMovies] ${sectionName}: Successfully parsed liked IDs JSON:`, data);

        if (!data || !Array.isArray(data.likedMovies) || !Array.isArray(data.likedSeries)) {
             console.error(`[LikedMovies] ${sectionName}: Invalid liked IDs data format received.`, data);
             throw new Error(`Unexpected data format for ${sectionName.toLowerCase()} IDs.`);
        }

        const likedMovieIds = data.likedMovies;
        const likedSeriesIds = data.likedSeries;
        console.log(`[LikedMovies] ${sectionName}: Found ${likedMovieIds.length} movie IDs and ${likedSeriesIds.length} series IDs.`);

        // Fetch details only if there are IDs
        console.log(`[LikedMovies] ${sectionName}: Fetching details from TMDB...`);
        const [movieDetails, seriesDetails] = await Promise.all([
            fetchDetailsForIds(likedMovieIds, 'movie'),
            fetchDetailsForIds(likedSeriesIds, 'tv')
        ]);
        console.log(`[LikedMovies] ${sectionName}: Finished fetching details. Got ${movieDetails.length} movie details, ${seriesDetails.length} series details.`);

        // Display items
        displayItems(movieDetails, moviesContainer, 'movie', 'liked-movie');
        displayItems(seriesDetails, seriesContainer, 'tv', 'liked-series');

    } catch (error) {
        console.error(`[LikedMovies] ${sectionName}: CATCH block error during fetch/processing:`, error);
        displayErrorMessage(moviesContainer, 'liked movies'); // Show errors in both sections
        displayErrorMessage(seriesContainer, 'liked series');
        throw error; // Re-throw
    }
}

// Helper function to fetch full details for an array of IDs from TMDB (with logging)
async function fetchDetailsForIds(ids, type) {
    if (!ids || ids.length === 0) {
        console.log(`[LikedMovies] TMDB Details: No IDs provided for type '${type}', skipping fetch.`);
        return [];
    }
    console.log(`[LikedMovies] TMDB Details: Fetching details for ${ids.length} IDs of type '${type}'...`);

    const apiKey = 'd37c49fbb30e8f5eb1000b388ab5bf71';
    const detailPromises = ids.map(id => {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US`;
        // console.log(`[LikedMovies] TMDB Details: Fetching ${url}`); // Uncomment for extreme verbosity
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    // Log warning but don't throw, let Promise.all continue
                    console.warn(`[LikedMovies] TMDB Details: Fetch failed for ${type} ID ${id}. Status: ${res.status}`);
                    return null;
                }
                // console.log(`[LikedMovies] TMDB Details: Success for ${type} ID ${id}.`); // Uncomment for extreme verbosity
                return res.json();
            })
            .catch(err => {
                console.error(`[LikedMovies] TMDB Details: Network error for ${type} ID ${id}:`, err);
                return null; // Return null on error
            });
    });

    const results = await Promise.all(detailPromises);
    const successfulResults = results.filter(item => item !== null);
    console.log(`[LikedMovies] TMDB Details: Successfully got details for ${successfulResults.length} out of ${ids.length} ${type} IDs.`);
    return successfulResults;
}


// ================================================
//      DISPLAY & UI FUNCTIONS (mostly unchanged)
// ================================================

function displayItems(items, container, itemType, cardType) {
    container.innerHTML = ''; // Clear previous

    if (!items || items.length === 0) {
        let message = '';
        // Determine appropriate empty message based on cardType
        if (cardType === 'recommendation') message = 'No recommendations available yet. Try liking some movies!';
        else if (cardType === 'liked-movie') message = 'You haven\'t liked any movies yet.';
        else if (cardType === 'liked-series') message = 'You haven\'t liked any series yet.';
        else message = 'No items to display.'; // Default fallback

        console.log(`[LikedMovies] Displaying empty message for ${cardType} in container ${container.id}: "${message}"`);
        container.innerHTML = `<p class="empty-message">${message}</p>`;
        return;
    }
    console.log(`[LikedMovies] Displaying ${items.length} items of type ${cardType} in container ${container.id}`);

    items.forEach(itemData => {
        if (itemData && itemData.id) {
            const cardElement = createCard_NewStyle(itemData, itemType, cardType);
            container.appendChild(cardElement);
        } else {
            console.warn(`[LikedMovies] Skipping invalid item data in ${container.id}:`, itemData);
        }
    });
}

// Creates a card element based on the new UI template (Unchanged from previous step)
function createCard_NewStyle(itemData, itemType, cardType) {
    const card = document.createElement('div');
    card.classList.add('card');
    if (cardType === 'liked-movie' || cardType === 'liked-series') {
        card.classList.add('is-liked');
    }
    card.dataset.itemId = itemData.id;
    card.dataset.itemType = itemType;

    const posterPath = itemData.poster_path ? `${TMDB_IMAGE_BASE_URL}${itemData.poster_path}` : '';
    card.style.backgroundImage = posterPath ? `url('${posterPath}')` : 'none';
    if (!posterPath) card.style.backgroundColor = '#333';

    const releaseDate = itemType === 'movie' ? itemData.release_date : itemData.first_air_date;
    const formattedDate = releaseDate ? new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A';
    const title = itemType === 'movie' ? itemData.title : itemData.name;
    const overview = itemData.overview || 'No overview available.';
    const tagline = itemData.tagline || '';

    let deleteButtonHTML = '';
    if (cardType === 'liked-movie' || cardType === 'liked-series') {
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
        <div class="sinopse">
            <div class="content-sinopse">
                <div class="text">${overview}</div>
                <button class="view-details-btn" data-id="${itemData.id}" data-type="${itemType}">View Details</button>
            </div>
        </div>
    `;
    return card;
}


// --- Loading / Error Message Helpers (Unchanged) ---
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
//      EVENT LISTENERS (Unchanged)
// ================================================
function initializeCardEventListeners() {
    const mainContentArea = document.querySelector('.home-section');
    if (!mainContentArea) {
        console.error("[LikedMovies] Cannot initialize card listeners: .home-section not found.");
        return;
    }
    console.log("[LikedMovies] Initializing card event listeners on .home-section");

    mainContentArea.addEventListener('click', function(event) {
        // --- Handle "View Details" Button Click ---
        if (event.target.classList.contains('view-details-btn')) {
            const button = event.target;
            const itemId = button.dataset.id;
            const itemType = button.dataset.type;
            console.log(`[LikedMovies] 'View Details' clicked: Type=${itemType}, ID=${itemId}`);
            if (itemId && itemType) handlePosterClick(itemType, itemId);
        }
        // --- Handle "Delete Like" Button Click ---
        else if (event.target.classList.contains('delete-like-btn')) {
            const button = event.target;
            const itemId = button.dataset.id;
            const itemType = button.dataset.type;
            event.stopPropagation(); // Prevent card click
            console.log(`[LikedMovies] 'Delete Like' clicked: Type=${itemType}, ID=${itemId}`);
            if (itemId && itemType) handleDeleteLike(button, itemType, itemId);
        }
        // --- Handle Card Click ---
        else {
            const card = event.target.closest('.card');
            if (card && !event.target.closest('button')) { // Ensure click is on card, not a button
                 const itemId = card.dataset.itemId;
                 const itemType = card.dataset.itemType;
                 console.log(`[LikedMovies] Card clicked: Type=${itemType}, ID=${itemId}`);
                 if (itemId && itemType) handlePosterClick(itemType, itemId);
            }
        }
    });
}

// --- Placeholder for Delete Function (Unchanged - Needs implementation later) ---
async function handleDeleteLike(buttonElement, itemType, itemId) {
    if (!confirm(`Are you sure you want to remove this ${itemType} from your likes?`)) return;
    console.log(`Confirmed deletion for ${itemType} ID ${itemId}. (Backend call not implemented yet)`);
    // TODO: Implement Step 3 - Backend Call for Delete
    // TEMPORARY VISUAL REMOVAL:
    buttonElement.closest('.card')?.remove(); // Use optional chaining
    alert(`${itemType} removed visually (backend delete not yet implemented).`);
}

// --- Helper Function for Click Handling (Navigates) (Unchanged) ---
function handlePosterClick(mediaType, mediaId) {
    console.log(`[LikedMovies] Navigating - Type: ${mediaType}, ID: ${mediaId}`);
    let url = '';
    if (mediaType === 'movie') url = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
    else if (mediaType === 'tv') url = `../series_details/series_details.html?type=tv&id=${mediaId}`;
    else { console.error('[LikedMovies] Unknown media type for navigation:', mediaType); return; }
    window.location.href = url;
}

// ================================================
//      EXISTING SIDEBAR, SEARCH, LOGOUT LOGIC (Keep As Is)
// ================================================
// (Your existing sidebar, search, and logout JS code should be here)
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
if (closeBtn && sidebar) { closeBtn.addEventListener("click", ()=>{ sidebar.classList.toggle("open"); menuBtnChange(); }); } else { console.warn("Sidebar close button/element not found."); }
if (searchBtn && sidebar) { searchBtn.addEventListener("click", ()=>{ sidebar.classList.toggle("open"); menuBtnChange(); }); } else { console.warn("Sidebar search button/element not found."); }
function menuBtnChange() { if (!sidebar || !closeBtn) return; if(sidebar.classList.contains("open")){ closeBtn.classList.replace("bx-menu", "bx-menu-alt-right"); } else { closeBtn.classList.replace("bx-menu-alt-right","bx-menu"); } }
function searchMovies() { const searchInput = document.getElementById('searchInput'); if (!searchInput) {console.error("Search input not found."); return;} const query = searchInput.value.trim(); if (query.length === 0) {console.log("Search query empty.");return;} const url = `../results/results.html?query=${encodeURIComponent(query)}`; window.location.href = url; }
const searchInput = document.getElementById('searchInput'); if (searchInput) { searchInput.addEventListener('keydown', function(event) { if (event.key === 'Enter') { event.preventDefault(); searchMovies(); } }); } else { console.warn("Search input not found for keydown listener.");}
const logoutButton = document.getElementById('log_out'); if (logoutButton) { logoutButton.addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('authToken'); window.location.href = '../auth/login.html'; }); } else { console.warn("Logout button not found."); }

console.log('[LikedMovies] New UI Script finished loading, includes diagnostics.');