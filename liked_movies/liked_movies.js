// liked_movies_v3.js - Based on original working script, adapted for 3 sections, new UI, and backend likes.

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LikedContent V3] DOM Content Loaded');

    // --- Configuration ---
    const API_BASE_URL = '/api'; // Your backend API base
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780'; // Higher res for background
    const TMDB_API_KEY = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Your TMDB Key (Ensure this is correct!)

    // --- DOM Elements ---
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    const likedMoviesContainer = document.getElementById('likedMoviesContainer');
    const likedSeriesContainer = document.getElementById('likedSeriesContainer');
    const mainContent = document.querySelector('.main-content'); // For adjusting margin

    // --- Authentication ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('[LikedContent V3] No auth token found.');
        displayAuthMessage(recommendationsContainer, 'Log in for recommendations.');
        displayAuthMessage(likedMoviesContainer, 'Log in to see liked movies.');
        displayAuthMessage(likedSeriesContainer, 'Log in to see liked series.');
        document.title = "Log in to View";
        // Optional: Redirect to login
        // window.location.href = '../auth/login.html';
        return; // Stop execution if not logged in
    }
    console.log('[LikedContent V3] Auth token found.');

    // --- Dynamic Title Update ---
    document.title = "Your Bingeflix Content";

    // --- Initial Setup ---
    setupSidebar(); // Handle sidebar interactions (from original)
    setupLogout(); // Handle logout button (from original)
    setupSearch(); // Handle search input (from original)

    // --- Load Data ---
    console.log('[LikedContent V3] Initiating data fetch sequence...');
    displayLoadingMessage(recommendationsContainer, 'Loading recommendations...');
    displayLoadingMessage(likedMoviesContainer, 'Loading liked movies...');
    displayLoadingMessage(likedSeriesContainer, 'Loading liked series...');

    fetchAndDisplayRecommendations(token, recommendationsContainer);
    fetchAndDisplayLikedItems(token, likedMoviesContainer, likedSeriesContainer);

}); // End DOMContentLoaded


// ================================================
//      FETCH & DISPLAY RECOMMENDATIONS (Adapted from Original)
// ================================================
async function fetchAndDisplayRecommendations(token, container) {
    if (!container) {
        console.error('[LikedContent V3] Recommendations container not found!');
        return;
    }
    console.log('[LikedContent V3] Starting recommendations fetch...');

    try {
        const response = await fetch(`/api/user/recommendations`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[LikedContent V3] Recommendations fetch response status:', response.status);

        if (!response.ok) {
            await handleFetchError(response, container, "recommendations");
            return;
        }

        const data = await response.json();
        console.log('[LikedContent V3] Recommendations data received:', data);

        if (!data || !Array.isArray(data.recommendations)) {
            console.error('[LikedContent V3] Invalid recommendations data format:', data);
            displayErrorMessage(container, 'Unexpected data format for recommendations.');
            return;
        }

        const recommendations = data.recommendations;
        if (recommendations.length === 0) {
            displayEmptyMessage(container, 'No movie recommendations yet. Like some movies!');
            return;
        }

        container.innerHTML = ''; // Clear loading message
        console.log(`[LikedContent V3] Rendering ${recommendations.length} recommendation cards...`);
        recommendations.forEach(movieData => {
            if (movieData && movieData.id) {
                // *** USE THE NEW CARD CREATION FUNCTION ***
                const card = createContentCard_NewUI(movieData, 'movie');
                if (card) container.appendChild(card);
            } else {
                console.warn("[LikedContent V3] Skipping invalid recommendation data:", movieData);
            }
        });

    } catch (error) {
        console.error('[LikedContent V3] CRITICAL ERROR fetching recommendations:', error);
        displayErrorMessage(container, 'Error loading recommendations. Check console.');
    }
}

// ================================================
//      FETCH & DISPLAY LIKED ITEMS (Movies & Series - NEW LOGIC)
// ================================================
async function fetchAndDisplayLikedItems(token, movieContainer, seriesContainer) {
    if (!movieContainer || !seriesContainer) {
        console.error('[LikedContent V3] Liked items containers not found!');
        return;
    }
    console.log('[LikedContent V3] Starting liked items fetch...');

    try {
        const response = await fetch(`/api/user/likes`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
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

        // Process Movies
        await processLikedDetailsByIds(likedMovieIds, movieContainer, 'movie', 'liked movies');

        // Process Series
        await processLikedDetailsByIds(likedSeriesIds, seriesContainer, 'tv', 'liked series');

    } catch (error) {
        console.error('[LikedContent V3] CRITICAL ERROR fetching liked item IDs:', error);
        displayErrorMessage(movieContainer, 'Error loading liked movies list.');
        displayErrorMessage(seriesContainer, 'Error loading liked series list.');
    }
}

// ================================================
//      HELPER: PROCESS LIKED DETAILS BY IDs (NEW LOGIC)
// ================================================
async function processLikedDetailsByIds(ids, container, type, contentTypeLabel) {
    const apiKey = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Ensure this is correct

    if (!Array.isArray(ids) || ids.length === 0) {
        displayEmptyMessage(container, `You haven't liked any ${contentTypeLabel} yet.`);
        return;
    }

    console.log(`[LikedContent V3] Fetching details for ${ids.length} ${contentTypeLabel}...`);
    // container.innerHTML = ''; // Clear loading message - Now done earlier

    const detailPromises = ids.map(id => {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US&append_to_response=videos`; // Append videos here
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    console.error(`[LikedContent V3] Error fetching ${type} details for ID ${id}: ${res.status}`);
                    return null; // Indicate failure for this specific item
                }
                return res.json();
            })
            .catch(err => {
                console.error(`[LikedContent V3] Network error fetching ${type} details for ID ${id}:`, err);
                return null;
            });
    });

    try {
        const results = await Promise.all(detailPromises);

        container.innerHTML = ''; // Clear loading message *before* rendering
        let displayedCount = 0;
        results.forEach(itemData => {
            if (itemData && itemData.id) {
                // *** USE THE NEW CARD CREATION FUNCTION ***
                const card = createContentCard_NewUI(itemData, type);
                 if (card) {
                    container.appendChild(card);
                    displayedCount++;
                 }
            } else {
                console.warn(`[LikedContent V3] Skipping null or invalid ${type} data fetched from TMDB.`);
            }
        });

        if (displayedCount === 0 && ids.length > 0) {
             displayErrorMessage(container, `Could not load details for your ${contentTypeLabel}.`);
        } else if (displayedCount > 0) {
            console.log(`[LikedContent V3] Rendered ${displayedCount} ${contentTypeLabel} cards.`);
        }
        // If displayedCount is 0 and ids.length was 0, the empty message is already handled.

    } catch (error) {
        console.error(`[LikedContent V3] Error processing fetched ${contentTypeLabel} details:`, error);
        displayErrorMessage(container, `Error displaying ${contentTypeLabel}.`);
    }
}


// ================================================
//      CREATE CONTENT CARD (New UI - Adapted from previous attempt)
// ================================================
function createContentCard_NewUI(itemData, type) {
    if (!itemData || !itemData.id) return null;

    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780';

    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.itemId = itemData.id;
    card.dataset.itemType = type;

    const title = type === 'movie' ? itemData.title : itemData.name;
    const releaseDate = type === 'movie' ? itemData.release_date : itemData.first_air_date;
    const overview = itemData.overview || 'No overview available.';
    const tagline = itemData.tagline || '';

    // --- Background Image ---
    const posterPath = itemData.poster_path ? `${TMDB_IMAGE_BASE_URL}${itemData.poster_path}` : null;
    if (posterPath) {
        card.style.backgroundImage = `url(${posterPath})`;
    } else {
        card.style.backgroundColor = '#333';
        // Add placeholder text if no image - create a separate div for this
        const placeholder = document.createElement('div');
        placeholder.style.cssText = "display: flex; align-items: center; justify-content: center; height: 100%; color: #888; text-align: center; padding: 10px; position: absolute; width: 100%;";
        placeholder.innerHTML = `${title || 'Item'}<br>(No Image)`;
        card.appendChild(placeholder);
    }

    // --- Format Date ---
    let formattedDate = '';
    if (releaseDate) {
        try {
            formattedDate = new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) { formattedDate = releaseDate; }
    }

    // --- Get Trailer URL (from appended 'videos' data if available) ---
    let trailerUrl = null;
    const videos = itemData.videos?.results;
    if (videos) {
        const trailer = videos.find(video =>
            video.site === 'YouTube' &&
            (video.type === 'Trailer' || video.type === 'Teaser') &&
            video.official === true
        ) || videos.find(video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser'));

        if (trailer?.key) {
             trailerUrl = `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&enablejsapi=1&modestbranding=1&showinfo=0&controls=1&origin=${window.location.origin}`;
             console.log(`[LikedContent V3] Found trailer for ${type} ${itemData.id}: ${trailer.key}`);
        }
    }

    // --- Build Inner HTML ---
    const innerHTML = `
        ${formattedDate ? `<div class="date">${formattedDate}</div>` : ''}
        <div class="content">
            <div class="title">${title || 'Title Unavailable'}</div>
            ${tagline ? `<div class="tagline">${tagline}</div>` : ''}
        </div>
        <div class="sinopse">
            <iframe style="width: 100%; height: 50%; border: none; background-color: #000;"
                    class="trailer-iframe"
                    data-trailer-url="${trailerUrl || ''}"
                    src="about:blank"
                    allowfullscreen
                    allow="autoplay; encrypted-media"></iframe>
            <div class="content-sinopse">
                <div class="text">${overview}</div>
            </div>
            <div class="view">Details</div>
        </div>
    `;
    // Use innerHTML carefully, consider creating elements if complex interactions needed later
    card.insertAdjacentHTML('beforeend', innerHTML);

    // --- Add Event Listeners ---
    addCardEventListeners_NewUI(card);

    return card;
}

// ================================================
//      CARD EVENT LISTENERS (New UI - Adapted from previous attempt)
// ================================================
function addCardEventListeners_NewUI(card) {
    const iframe = card.querySelector('.trailer-iframe');
    const sinopseOverlay = card.querySelector('.sinopse'); // Get the overlay div

    if (!iframe || !sinopseOverlay) {
        console.warn("[LikedContent V3] Card missing iframe or sinopse overlay for event listeners.");
        return;
    }

    const trailerUrl = iframe.dataset.trailerUrl; // Get URL from data attribute

    card.addEventListener('mouseenter', () => {
        if (trailerUrl && trailerUrl !== 'null' && trailerUrl !== '') {
            iframe.src = trailerUrl;
        } else {
            // Optional: Show "No Trailer" message inside iframe area
            iframe.src = "about:blank";
            try {
                // Small delay to ensure iframe is ready
                setTimeout(() => {
                    if (iframe.contentWindow && iframe.contentWindow.document) {
                         iframe.contentWindow.document.body.innerHTML = '<div style="color: #aaa; font-size: 12px; text-align: center; padding-top: 25%; height: 100%; display: flex; align-items: flex-start; justify-content: center; background-color: #000;">Trailer not available</div>';
                    }
                }, 50);
            } catch (e) { console.warn("[LikedContent V3] Could not write 'no trailer' message to iframe:", e); }
        }
        sinopseOverlay.style.opacity = '1'; // Ensure overlay is visible on hover
    });

    card.addEventListener('mouseleave', () => {
        iframe.src = 'about:blank'; // Stop video playback
        sinopseOverlay.style.opacity = '0'; // Hide overlay smoothly if CSS transition is set
    });

    // --- Click Listener ---
    const viewButton = card.querySelector('.view');
    const itemId = card.dataset.itemId;
    const itemType = card.dataset.itemType;

    const navigate = () => {
        if (itemType && itemId) {
            navigateToDetails(itemType, itemId);
        } else {
            console.error("[LikedContent V3] Missing item type or ID for navigation on card:", card);
        }
    };

    if (viewButton) {
        viewButton.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent card click if button is clicked
            navigate();
        });
    }
    // Make the whole card clickable as well
    card.addEventListener('click', (event) => {
         // Only navigate if the click wasn't on the button itself
         if (event.target !== viewButton) {
            navigate();
         }
    });
}


// ================================================
//      HELPER FUNCTIONS (Adapted from Original & Previous)
// ================================================

// --- Navigate to Details Page (Adapted from handlePosterClick) ---
function navigateToDetails(itemType, itemId) {
    console.log(`[LikedContent V3] Navigating to details - Type: ${itemType}, ID: ${itemId}`);
    let url = '';
    if (itemType === 'movie') {
        url = `../movie_details/movie_details.html?id=${itemId}`; // Path from liked_movies folder
    } else if (itemType === 'tv') {
        url = `../series_details/series_details.html?id=${itemId}`; // Path from liked_movies folder
    } else {
        console.error('[LikedContent V3] Unknown item type for navigation:', itemType);
        return;
    }
    window.location.href = url;
}

// --- Display Loading Message ---
function displayLoadingMessage(container, message) {
    if (container) {
        // Simple text message, assuming CSS handles styling via .loading-message class if needed
        container.innerHTML = `<p style="color: #ccc; text-align: center; padding: 40px 20px; font-style: italic;">${message}</p>`;
    } else {
        console.warn("[LikedContent V3] Attempted to display loading message in a null container.");
    }
}

// --- Display Empty Message ---
function displayEmptyMessage(container, message) {
    if (container) {
        container.innerHTML = `<p style="color: #ccc; text-align: center; padding: 40px 20px; font-style: italic;">${message}</p>`;
    } else {
         console.warn("[LikedContent V3] Attempted to display empty message in a null container.");
    }
}

// --- Display Error Message ---
function displayErrorMessage(container, message) {
     if (container) {
        container.innerHTML = `<p style="color: #ff8a8a; text-align: center; padding: 40px 20px; font-weight: bold;">${message}</p>`;
    } else {
         console.warn("[LikedContent V3] Attempted to display error message in a null container.");
    }
}

// --- Display Auth Message (Special case for logged out) ---
function displayAuthMessage(container, message) {
     if (container) {
        container.innerHTML = `<p style="color: #ffcc80; text-align: center; padding: 40px 20px;">${message}</p>`;
    } else {
        console.warn("[LikedContent V3] Attempted to display auth message in a null container.");
    }
}


// --- Handle Fetch Errors (Adapted from Original) ---
async function handleFetchError(response, container, type) {
   let errorMsg = `Could not load ${type}.`;
   try {
        // Try to get more specific error from response body
        const errorData = await response.json().catch(() => null); // Gracefully handle non-JSON response
        console.error(`[LikedContent V3] Error fetching ${type}. Status: ${response.status}. Data:`, errorData);

        if (response.status === 401 || response.status === 403) {
           errorMsg = `Please log in again to see your ${type}.`;
           // Consider auto-logout or clearer message
        } else if (errorData && errorData.message) {
            errorMsg = `Could not load ${type}: ${errorData.message}`;
        } else {
             errorMsg = `Could not load ${type} (Server Error ${response.status}).`;
        }
   } catch (e) {
        // Fallback if response parsing fails completely
        console.error(`[LikedContent V3] Error fetching ${type}. Status: ${response.status}. Could not parse response body.`);
        errorMsg = `Could not load ${type} (Network or Server Error ${response.status}).`;
   }
   displayErrorMessage(container, errorMsg);
    if (response.status >= 500) {
       console.warn(`[LikedContent V3] Hint: Check Vercel Function logs for backend errors related to ${type}.`);
   }
}


// ================================================
//      SIDEBAR & LOGOUT & SEARCH (Copied from Original - Check Paths!)
// ================================================
function setupSidebar() {
    let sidebar = document.querySelector(".sidebar");
    let closeBtn = document.querySelector("#btn");
    let searchBtn = document.querySelector(".bx-search");
    const mainContent = document.querySelector('.main-content');

    if (!sidebar || !closeBtn || !mainContent) {
        console.warn("[LikedContent V3] Sidebar elements not found for setup.");
        return;
    }

    const menuBtnChange = () => {
        const isOpen = sidebar.classList.contains("open");
        const targetMargin = isOpen ? '250px' : '80px';
        const targetWidth = isOpen ? 'calc(100% - 250px)' : 'calc(100% - 80px)';

        if (window.innerWidth < 992) { // Force closed on smaller screens
            sidebar.classList.remove("open");
            closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
            mainContent.style.marginLeft = '80px';
            mainContent.style.width = 'calc(100% - 80px)';
            return; // Don't proceed further
        }

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
        menuBtnChange();
    });

    if (searchBtn) {
        searchBtn.addEventListener("click", () => {
           if (!sidebar.classList.contains("open")) {
                sidebar.classList.add("open");
                menuBtnChange();
                document.getElementById('searchInput')?.focus();
           }
        });
    }

    // Initial check in case page loads with sidebar needing adjustment
    menuBtnChange();
    window.addEventListener('resize', menuBtnChange); // Adjust on resize
}

// --- Search Function ---
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                performSearch(searchInput.value);
            }
        });
    }
    // If you have a search icon that *triggers* the search (not just opens sidebar)
    // const searchIcon = document.querySelector('.bx-search'); // Or a more specific selector
    // if (searchIcon && searchInput) {
    //     searchIcon.addEventListener('click', () => {
    //         performSearch(searchInput.value);
    //     });
    // }
}

function performSearch(query) {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) return;
    // *** IMPORTANT: Check this relative path is correct from '/liked_movies/' folder ***
    const url = `../results/results.html?query=${encodeURIComponent(trimmedQuery)}`;
    console.log(`[LikedContent V3] Navigating to search results: ${url}`);
    window.location.href = url;
}


// --- Logout Functionality ---
function setupLogout() {
    const logoutButton = document.getElementById('log_out');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[LikedContent V3] Logging out...');
            localStorage.removeItem('authToken');
            // *** IMPORTANT: Check this relative path is correct from '/liked_movies/' folder ***
            window.location.href = '../auth/login.html';
        });
    } else {
        console.warn('[LikedContent V3] Logout button (#log_out) not found.');
    }
}

console.log('[LikedContent V3] Script finished loading.');