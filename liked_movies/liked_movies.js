// liked_movies_v3.js - Based on original working script, adapted for 3 sections, new UI, and backend likes.
// VERSION 4: Reverted trailer fetch logic, UI Polish

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LikedContent V3] DOM Content Loaded');

    // --- Configuration ---
    const API_BASE_URL = '/api';
    const TMDB_API_KEY = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // !! MAKE SURE THIS IS CORRECT !!

    // --- DOM Elements ---
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    const likedMoviesContainer = document.getElementById('likedMoviesContainer');
    const likedSeriesContainer = document.getElementById('likedSeriesContainer');

    // --- Authentication ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('[LikedContent V3] No auth token found.');
        displayAuthMessage(recommendationsContainer, 'Log in for recommendations.');
        displayAuthMessage(likedMoviesContainer, 'Log in to see liked movies.');
        displayAuthMessage(likedSeriesContainer, 'Log in to see liked series.');
        document.title = "Log in to View";
        // Optional: Redirect to login after a delay
        // setTimeout(() => { window.location.href = '../auth/login.html'; }, 1500);
        return;
    }
    console.log('[LikedContent V3] Auth token found.');

    // --- Dynamic Title Update ---
    document.title = "Your Bingeflix Library"; // Updated title

    // --- Initial Setup ---
    setupSidebar();
    setupLogout();
    setupSearch(); // Ensure search setup is called

    // --- Load Data ---
    console.log('[LikedContent V3] Initiating data fetch sequence...');
    displayLoadingMessage(recommendationsContainer, 'Loading recommendations...');
    displayLoadingMessage(likedMoviesContainer, 'Loading liked movies...');
    displayLoadingMessage(likedSeriesContainer, 'Loading liked series...');

    fetchAndDisplayRecommendations(token, recommendationsContainer);
    fetchAndDisplayLikedItems(token, likedMoviesContainer, likedSeriesContainer);

}); // End DOMContentLoaded


// ================================================
//      FETCH & DISPLAY RECOMMENDATIONS
// ================================================
async function fetchAndDisplayRecommendations(token, container) {
    if (!container) {
        console.error('[LikedContent V3] Recommendations container not found!');
        return;
    }
    console.log('[LikedContent V3] Starting recommendations fetch...');
    try {
        const response = await fetch(`${API_BASE_URL}/user/recommendations`, {
            method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log('[LikedContent V3] Recommendations fetch response status:', response.status);
        if (!response.ok) { await handleFetchError(response, container, "recommendations"); return; }
        const data = await response.json();
        console.log('[LikedContent V3] Recommendations data received:', data);
        if (!data || !Array.isArray(data.recommendations)) { displayErrorMessage(container, 'Unexpected recommendations format.'); return; }
        const recommendations = data.recommendations;
        if (recommendations.length === 0) { displayEmptyMessage(container, 'No movie recommendations yet. Like some movies!'); return; }
        container.innerHTML = ''; // Clear loading
        console.log(`[LikedContent V3] Rendering ${recommendations.length} recommendation cards...`);
        recommendations.forEach(movieData => {
            if (movieData && movieData.id) {
                const card = createContentCard_NewUI(movieData, 'movie'); // Use the card creation function
                if (card) container.appendChild(card);
            } else { console.warn("[LikedContent V3] Skipping invalid recommendation data:", movieData); }
        });
    } catch (error) { console.error('[LikedContent V3] CRITICAL ERROR fetching recommendations:', error); displayErrorMessage(container, 'Error loading recommendations.'); }
}

// ================================================
//      FETCH & DISPLAY LIKED ITEMS
// ================================================
async function fetchAndDisplayLikedItems(token, movieContainer, seriesContainer) {
    if (!movieContainer || !seriesContainer) {
        console.error('[LikedContent V3] Liked items containers not found!');
        return;
    }
    console.log('[LikedContent V3] Starting liked items fetch...');
    try {
        const response = await fetch(`${API_BASE_URL}/user/likes`, {
            method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        console.log('[LikedContent V3] Liked items fetch response status:', response.status);
        if (!response.ok) {
            // Show error in both sections if the initial fetch fails
            await handleFetchError(response, movieContainer, "liked movies");
            await handleFetchError(response, seriesContainer, "liked series");
            return;
        }
        const data = await response.json();
        console.log('[LikedContent V3] Liked items data received:', data);
        const likedMovieIds = data.likedMovies || [];
        const likedSeriesIds = data.likedSeries || [];

        // Process Movies and Series concurrently
        await Promise.all([
            processLikedDetailsByIds(likedMovieIds, movieContainer, 'movie', 'liked movies'),
            processLikedDetailsByIds(likedSeriesIds, seriesContainer, 'tv', 'liked series')
        ]);

    } catch (error) { console.error('[LikedContent V3] CRITICAL ERROR fetching liked item IDs:', error); displayErrorMessage(movieContainer, 'Error loading liked movies list.'); displayErrorMessage(seriesContainer, 'Error loading liked series list.'); }
}

// ================================================
//      HELPER: PROCESS LIKED DETAILS BY IDs
// ================================================
async function processLikedDetailsByIds(ids, container, type, contentTypeLabel) {
    const apiKey = TMDB_API_KEY; // Use configured key
    if (!Array.isArray(ids)) {
        console.warn(`[LikedContent V3] Invalid IDs array for ${contentTypeLabel}:`, ids);
        displayErrorMessage(container, `Error loading ${contentTypeLabel}: Invalid data.`);
        return;
    }
    if (ids.length === 0) {
        displayEmptyMessage(container, `You haven't liked any ${contentTypeLabel} yet.`);
        return;
    }

    console.log(`[LikedContent V3] Fetching details for ${ids.length} ${contentTypeLabel}...`);
    const detailPromises = ids.map(id => {
        if (!id || typeof id !== 'number') {
             console.warn(`[LikedContent V3] Invalid ID found in ${contentTypeLabel} list:`, id);
             return Promise.resolve(null); // Resolve invalid IDs as null immediately
        }
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US`;
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    // Throw an error object for better handling in catch
                    return res.text().then(text => Promise.reject({ status: res.status, message: text, id: id }));
                }
                return res.json();
            })
            .catch(err => {
                console.error(`[LikedContent V3] Error fetching ${type} details for ID ${err.id || id}: Status ${err.status || 'Network'}`, err.message || err);
                return null; // Indicate failure for this specific item
            });
    });

    try {
        const results = await Promise.all(detailPromises);
        container.innerHTML = ''; // Clear loading message *before* rendering
        let displayedCount = 0;
        results.forEach(itemData => {
            if (itemData && itemData.id) {
                const card = createContentCard_NewUI(itemData, type); // Use card creation function
                if (card) {
                    container.appendChild(card);
                    displayedCount++;
                }
            } else {
                // Log if it was an actual item that failed vs just an invalid ID initially
                if (itemData !== null) { // null means it failed fetch or was invalid ID
                     console.warn(`[LikedContent V3] Skipping null/invalid ${type} data object after fetching.`);
                }
            }
        });

        if (displayedCount === 0 && ids.length > 0) {
            displayErrorMessage(container, `Could not load details for your ${contentTypeLabel}. Some items may be invalid or removed from TMDB.`);
        } else if (displayedCount > 0) {
            console.log(`[LikedContent V3] Rendered ${displayedCount} ${contentTypeLabel} cards.`);
        }
        // If displayedCount is 0 and ids.length was 0, the empty message is already handled.

    } catch (error) {
        // This catch might not be strictly necessary if Promise.all resolves with nulls,
        // but good for catching unexpected errors during the Promise.all setup itself.
        console.error(`[LikedContent V3] Unexpected error processing fetched ${contentTypeLabel} details:`, error);
        displayErrorMessage(container, `Error displaying ${contentTypeLabel}.`);
    }
}


// ================================================
//      CREATE CONTENT CARD (UI Structure)
// ================================================
function createContentCard_NewUI(itemData, type) {
    // Basic validation
    if (!itemData || !itemData.id) {
         console.warn("[LikedContent V3] Invalid itemData passed to createContentCard_NewUI", itemData);
         return null;
    }

    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780'; // Good resolution for background

    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.itemId = itemData.id; // Store ID and Type for later use
    card.dataset.itemType = type;

    const title = type === 'movie' ? (itemData.title || 'N/A') : (itemData.name || 'N/A');
    const releaseDate = type === 'movie' ? itemData.release_date : itemData.first_air_date;
    const overview = itemData.overview || 'No overview available.';
    const tagline = itemData.tagline || '';

    // --- Background Image ---
    const posterPath = itemData.poster_path ? `${TMDB_IMAGE_BASE_URL}${itemData.poster_path}` : null;
    if (posterPath) {
        card.style.backgroundImage = `url(${posterPath})`;
    } else {
        card.style.backgroundColor = '#333'; // Fallback background
        const placeholder = document.createElement('div');
        placeholder.classList.add('no-image-placeholder');
        placeholder.innerHTML = `${title}<br>(No Image)`;
        card.appendChild(placeholder); // Append placeholder div
    }

    // --- Format Date ---
    let formattedDate = '';
    if (releaseDate) {
        try {
            // Format date nicely (e.g., "Jan 15, 2023")
            formattedDate = new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { formattedDate = releaseDate; } // Fallback to raw date string
    }

    // --- Build Inner HTML for the card ---
    // Note: iframe src is set to about:blank initially. It will be populated on hover.
    const innerHTML = `
        ${formattedDate ? `<div class="date">${formattedDate}</div>` : ''}
        <div class="content">
            <div class="title">${title}</div>
            ${tagline ? `<div class="tagline">${tagline}</div>` : ''}
        </div>
        <div class="sinopse">
            <iframe class="trailer-iframe"
                    src="about:blank"
                    title="Trailer for ${title}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen></iframe>
            <div class="content-sinopse">
                <div class="text">${overview}</div>
                <div class="view">View Details</div>
            </div>
        </div>
    `;
    card.insertAdjacentHTML('beforeend', innerHTML); // Append the content

    // --- Add Event Listeners (Handles hover and click) ---
    addCardEventListeners_NewUI(card);

    return card;
}

// ================================================
//      CARD EVENT LISTENERS (Handles Hover & Click)
// ================================================
function addCardEventListeners_NewUI(card) {
    const iframe = card.querySelector('.trailer-iframe');
    const sinopseOverlay = card.querySelector('.sinopse');
    const itemId = card.dataset.itemId;
    const itemType = card.dataset.itemType;

    // Ensure all necessary elements and data are present
    if (!iframe || !sinopseOverlay || !itemId || !itemType) {
        console.warn("[LikedContent V3] Card missing required elements/data for event listeners:", { iframe, sinopseOverlay, itemId, itemType });
        return;
    }

    let trailerUrl = null; // Variable to cache the fetched trailer URL
    let isFetchingTrailer = false; // Flag to prevent multiple simultaneous fetches
    let fetchAttempted = false; // Flag to know if we've tried fetching at least once

    // --- Mouse Enter Event ---
    card.addEventListener('mouseenter', async () => {
        // Show the overlay immediately on hover
        sinopseOverlay.style.opacity = '1';

        // --- Trailer Logic ---
        // Check if we need to fetch the trailer
        if (!fetchAttempted && !isFetchingTrailer) {
            isFetchingTrailer = true;
            fetchAttempted = true;
            iframe.src = "about:blank"; // Clear any previous state

            // Show loading state inside the iframe
             writeToIframe(iframe, '<div style="color: #aaa; font-size: 12px; text-align: center; padding-top: 25%; height: 100%; display: flex; align-items: flex-start; justify-content: center; background-color: #000;">Loading trailer...</div>');

            console.log(`[LikedContent V3] Fetching trailer for ${itemType} ${itemId} on hover...`);
            trailerUrl = await getYouTubeTrailerUrl_OnHover(itemId, itemType); // Fetch the URL
            isFetchingTrailer = false;

            if (trailerUrl) {
                console.log(`[LikedContent V3] Trailer found: ${trailerUrl}. Loading iframe.`);
                iframe.src = trailerUrl; // Load the trailer
            } else {
                console.log(`[LikedContent V3] Trailer not found for ${itemType} ${itemId}.`);
                // Show "Not Available" message inside the iframe
                writeToIframe(iframe, '<div style="color: #aaa; font-size: 12px; text-align: center; padding-top: 25%; height: 100%; display: flex; align-items: flex-start; justify-content: center; background-color: #000;">Trailer not available</div>');
            }
        } else if (trailerUrl) {
            // If already fetched, just ensure the src is set (might have been cleared by mouseleave)
             if(iframe.src !== trailerUrl) {
                 iframe.src = trailerUrl;
             }
        } else if (fetchAttempted && !trailerUrl) {
            // If fetch failed previously, ensure "not available" message is shown
             writeToIframe(iframe, '<div style="color: #aaa; font-size: 12px; text-align: center; padding-top: 25%; height: 100%; display: flex; align-items: flex-start; justify-content: center; background-color: #000;">Trailer not available</div>');
        }
    });

    // --- Mouse Leave Event ---
    card.addEventListener('mouseleave', () => {
        // Hide the overlay smoothly (CSS handles the transition)
        sinopseOverlay.style.opacity = '0';
        // Clear the iframe source to stop playback and remove content
        iframe.src = 'about:blank';
    });

    // --- Click Listener for Navigation ---
    const viewButton = card.querySelector('.view');
    const navigate = () => navigateToDetails(itemType, itemId); // Helper to call navigation

    if (viewButton) {
        viewButton.addEventListener('click', (event) => {
            event.stopPropagation(); // IMPORTANT: Prevent card's click listener from firing too
            navigate();
        });
    }

    // Make the whole card clickable (except the button area)
    card.addEventListener('click', (event) => {
        // Check if the click target was the button or inside the button
        if (!viewButton || (event.target !== viewButton && !viewButton.contains(event.target))) {
            navigate();
        }
    });
}

// Helper function to safely write content to an iframe
function writeToIframe(iframe, htmlContent) {
    try {
         // Check if iframe's contentWindow is accessible and ready
        if (iframe.contentWindow && iframe.contentWindow.document) {
             iframe.contentWindow.document.open();
             iframe.contentWindow.document.write(htmlContent);
             iframe.contentWindow.document.close();
        } else {
             console.warn("[LikedContent V3] Iframe contentWindow not ready or accessible for writing.");
        }
    } catch (e) {
        console.warn("[LikedContent V3] Error writing to iframe:", e);
    }
}


// ================================================
//      HELPER: Get YouTube Trailer URL (Fetch On Hover)
// ================================================
async function getYouTubeTrailerUrl_OnHover(itemId, itemType) {
    const apiKey = TMDB_API_KEY;
    if (!itemId || !itemType || !apiKey) {
        console.error("[LikedContent V3] Missing ID, Type, or API Key for trailer fetch.", { itemId, itemType, apiKey });
        return null;
    }
    const url = `https://api.themoviedb.org/3/${itemType}/${itemId}/videos?api_key=${apiKey}&language=en-US`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
             console.error(`[LikedContent V3] Error fetching videos (${response.status}) for ${itemType} ${itemId}`);
             return null; // TMDB error (e.g., 404 Not Found)
        }
        const data = await response.json();
        const videos = data.results;

        // Prioritize official trailers, then any trailer, then teasers
        const trailer = videos?.find(v => v.site === 'YouTube' && v.type === 'Trailer' && v.official === true) ||
                        videos?.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                        videos?.find(v => v.site === 'YouTube' && v.type === 'Teaser' && v.official === true) || // Official teaser
                        videos?.find(v => v.site === 'YouTube' && v.type === 'Teaser'); // Any teaser

        if (trailer?.key) {
            // Construct the embed URL with recommended parameters
            return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&enablejsapi=1&modestbranding=1&showinfo=0&controls=1&rel=0&origin=${window.location.origin}`;
        } else {
            console.log(`[LikedContent V3] No suitable YouTube trailer/teaser found for ${itemType} ${itemId}`);
            return null; // No suitable video found in results
        }
    } catch (error) {
        // Network errors or other issues during fetch
        console.error(`[LikedContent V3] Network error fetching videos for ${itemType} ${itemId}:`, error);
        return null;
    }
}


// ================================================
//      HELPER FUNCTIONS (Display Messages, Navigation, Error Handling)
// ================================================
function navigateToDetails(itemType, itemId) {
    console.log(`[LikedContent V3] Navigating to details - Type: ${itemType}, ID: ${itemId}`);
    let url = '';
    // --- !! CHECK RELATIVE PATHS !! ---
    if (itemType === 'movie') { url = `../movie_details/movie_details.html?id=${itemId}`; }
    else if (itemType === 'tv') { url = `../series_details/series_details.html?id=${itemId}`; }
    else { console.error('[LikedContent V3] Unknown item type for navigation:', itemType); return; }
    window.location.href = url;
}
function displayLoadingMessage(container, message) { if (container) { container.innerHTML = `<p class="loading-message">${message}</p>`; } else { console.warn("[LikedContent V3] Null container for loading message.");} }
function displayEmptyMessage(container, message) { if (container) { container.innerHTML = `<p class="empty-message">${message}</p>`; } else { console.warn("[LikedContent V3] Null container for empty message.");} }
function displayErrorMessage(container, message) { if (container) { container.innerHTML = `<p class="error-message">${message}</p>`; } else { console.warn("[LikedContent V3] Null container for error message.");} }
function displayAuthMessage(container, message) { if (container) { container.innerHTML = `<p class="auth-message">${message}</p>`; } else { console.warn("[LikedContent V3] Null container for auth message.");} }
async function handleFetchError(response, container, type) {
   let errorMsg = `Could not load ${type}.`;
   try {
        const errorData = await response.json().catch(() => ({ message: response.statusText })); // Gracefully handle non-JSON or empty response
        console.error(`[LikedContent V3] Error fetching ${type}. Status: ${response.status}. Data:`, errorData);
        if (response.status === 401 || response.status === 403) { errorMsg = `Authentication Error. Please log in again to see your ${type}.`; }
        else if (errorData && errorData.message) { errorMsg = `Could not load ${type}: ${errorData.message} (Code: ${response.status})`; }
        else { errorMsg = `Could not load ${type} (Server Error ${response.status}).`; }
   } catch (e) { console.error(`[LikedContent V3] Error parsing error response for ${type}. Status: ${response.status}. Error:`, e); errorMsg = `Could not load ${type} (Error ${response.status}).`; }
   displayErrorMessage(container, errorMsg);
   if (response.status >= 500) { console.warn(`[LikedContent V3] Hint: Check Server/Vercel Function logs for backend errors related to ${type}.`); }
}


// ================================================
//      SIDEBAR & LOGOUT & SEARCH (Check Paths!)
// ================================================
function setupSidebar() {
    let sidebar = document.querySelector(".sidebar");
    let closeBtn = document.querySelector("#btn");
    let searchBtn = document.querySelector(".bx-search"); // Search icon in sidebar
    const mainContent = document.querySelector('.main-content');
    if (!sidebar || !closeBtn || !mainContent) { console.warn("[LikedContent V3] Sidebar elements missing."); return; }

    const menuBtnChange = () => {
        const isOpen = sidebar.classList.contains("open");
        const targetMargin = isOpen ? '250px' : '80px';
        const targetWidth = isOpen ? 'calc(100% - 250px)' : 'calc(100% - 80px)';

        // Force closed on smaller screens based on CSS media query breakpoint
        if (window.innerWidth < 992) {
            if (isOpen) { // Only remove class if it's actually open
                sidebar.classList.remove("open");
            }
            // Ensure button icon is correct for closed state
            closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
            // Apply closed state styles directly to avoid transition flicker on resize
            mainContent.style.marginLeft = '80px';
            mainContent.style.width = 'calc(100% - 80px)';
            return; // Don't proceed further for small screens
        }

        // Logic for larger screens
        if (isOpen) {
            closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");
        } else {
            closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
        }
        mainContent.style.marginLeft = targetMargin;
        mainContent.style.width = targetWidth;
    };

    closeBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        menuBtnChange(); // Update styles after toggle
    });

    // Make search ICON also open sidebar if closed, and focus input
    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
           if (!sidebar.classList.contains("open")) {
                sidebar.classList.add("open");
                menuBtnChange(); // Update styles
                document.getElementById('searchInput')?.focus(); // Focus the input
           }
           // If sidebar is already open, clicking search icon could potentially trigger search
           // else { performSearch(document.getElementById('searchInput')?.value); } // Optional: trigger search if already open
        });
    }

    // Initial check and resize listener
    menuBtnChange();
    window.addEventListener('resize', menuBtnChange);
 }

function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Listener for Enter key in the search input
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission behavior
                performSearch(searchInput.value);
            }
        });
    }
    // Note: Sidebar search icon click logic is handled within setupSidebar
 }

function performSearch(query) {
    const trimmedQuery = query ? query.trim() : ''; // Handle potential null/undefined query
    if (trimmedQuery.length === 0) {
        console.log("[LikedContent V3] Empty search query, not navigating.");
        return; // Don't navigate on empty search
    }
    // --- !! CHECK RELATIVE PATH !! ---
    const url = `../results/results.html?query=${encodeURIComponent(trimmedQuery)}`;
    console.log(`[LikedContent V3] Navigating to search results: ${url}`);
    window.location.href = url;
 }

function setupLogout() {
    const logoutButton = document.getElementById('log_out');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[LikedContent V3] Logging out...');
            localStorage.removeItem('authToken'); // Clear the token
            // --- !! CHECK RELATIVE PATH !! ---
            window.location.href = '../auth/login.html'; // Redirect to login
        });
    } else {
        console.warn('[LikedContent V3] Logout button (#log_out) not found.');
    }
 }

console.log('[LikedContent V3] Script finished loading.');