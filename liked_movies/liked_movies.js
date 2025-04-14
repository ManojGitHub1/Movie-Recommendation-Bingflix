// liked_movies_new.js - Displays Recommendations, Liked Movies, Liked Series (all from Backend) with new UI

document.addEventListener('DOMContentLoaded', function() {
    console.log('[LikedContent] DOM Content Loaded');

    // --- Configuration ---
    const API_BASE_URL = '/api'; // Your backend API base
    const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w780'; // Higher res for background
    const TMDB_API_KEY = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Your TMDB Key

    // --- DOM Elements ---
    const recommendationsContainer = document.getElementById('recommendationsContainer');
    const likedMoviesContainer = document.getElementById('likedMoviesContainer');
    const likedSeriesContainer = document.getElementById('likedSeriesContainer');
    const mainContent = document.querySelector('.main-content'); // For adjusting margin

    // --- Authentication ---
    const token = localStorage.getItem('authToken');
    if (!token) {
        console.log('[LikedContent] No auth token found. Redirecting to login.');
        // Optionally display a message before redirecting
        if (recommendationsContainer) recommendationsContainer.innerHTML = '<p class="empty-message">Please log in to see your content.</p>';
        if (likedMoviesContainer) likedMoviesContainer.innerHTML = '<p class="empty-message">Please log in to see your content.</p>';
        if (likedSeriesContainer) likedSeriesContainer.innerHTML = '<p class="empty-message">Please log in to see your content.</p>';
        document.title = "Log in to View";
        // Redirect after a short delay
        // setTimeout(() => { window.location.href = '../auth/login.html'; }, 1500);
        return; // Stop execution if not logged in
    }
    console.log('[LikedContent] Auth token found.');

    // --- Dynamic Title Update ---
    document.title = "Your Bingeflix Content";

    // --- Initial Setup ---
    setupSidebar(); // Handle sidebar interactions
    setupLogout(); // Handle logout button

    // --- Load Data ---
    loadAllContent(token);

}); // End DOMContentLoaded

// ================================================
//      LOAD ALL CONTENT (Entry Point)
// ================================================
async function loadAllContent(token) {
    console.log('[LikedContent] Starting data fetch for all sections...');

    // Show initial loading states
    displayLoadingMessage(document.getElementById('recommendationsContainer'), "Loading recommendations...");
    displayLoadingMessage(document.getElementById('likedMoviesContainer'), "Loading liked movies...");
    displayLoadingMessage(document.getElementById('likedSeriesContainer'), "Loading liked series...");

    try {
        // Fetch recommendations and liked IDs concurrently
        const [recsResponse, likesResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/user/recommendations`, { // Use constant
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_BASE_URL}/user/likes`, { // Use constant
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        // Process Recommendations
        await processRecommendations(recsResponse, document.getElementById('recommendationsContainer'));

        // Process Liked Items
        await processLikedItems(likesResponse, document.getElementById('likedMoviesContainer'), document.getElementById('likedSeriesContainer'));

    } catch (error) {
        console.error('[LikedContent] CRITICAL ERROR fetching initial data:', error);
        // Display error in all sections as a fallback
        displayErrorMessage(document.getElementById('recommendationsContainer'), 'Could not load content.');
        displayErrorMessage(document.getElementById('likedMoviesContainer'), 'Could not load content.');
        displayErrorMessage(document.getElementById('likedSeriesContainer'), 'Could not load content.');
    }
}

// ================================================
//      PROCESS RECOMMENDATIONS
// ================================================
async function processRecommendations(response, container) {
    if (!container) return;
    console.log('[LikedContent] Processing recommendations response...');

    try {
        if (!response.ok) {
            await handleFetchError(response, container, "recommendations");
            return;
        }
        const data = await response.json();
        console.log('[LikedContent] Recommendations data received:', data);

        if (!data || !Array.isArray(data.recommendations) || data.recommendations.length === 0) {
            displayEmptyMessage(container, "No movie recommendations yet. Like some movies!");
            return;
        }

        container.innerHTML = ''; // Clear loading message
        data.recommendations.forEach(movieData => {
            if (movieData && movieData.id) {
                const card = createContentCard(movieData, 'movie');
                if (card) container.appendChild(card);
            } else {
                console.warn("[LikedContent] Skipping invalid recommendation data:", movieData);
            }
        });
        console.log(`[LikedContent] Rendered ${data.recommendations.length} recommendation cards.`);

    } catch (error) {
        console.error('[LikedContent] Error processing recommendations data:', error);
        displayErrorMessage(container, 'Error displaying recommendations.');
    }
}

// ================================================
//      PROCESS LIKED ITEMS (Movies & Series)
// ================================================
async function processLikedItems(response, movieContainer, seriesContainer) {
    if (!movieContainer || !seriesContainer) return;
    console.log('[LikedContent] Processing liked items response...');

    try {
        if (!response.ok) {
            // Display error in both containers if the initial fetch fails
            await handleFetchError(response, movieContainer, "liked movies");
            await handleFetchError(response, seriesContainer, "liked series");
            return;
        }
        const data = await response.json();
        console.log('[LikedContent] Liked items data received:', data);

        const likedMovieIds = data.likedMovies || [];
        const likedSeriesIds = data.likedSeries || [];

        // Fetch details and render concurrently
        await Promise.all([
            fetchAndRenderLikedDetails(likedMovieIds, movieContainer, 'movie', 'liked movies'),
            fetchAndRenderLikedDetails(likedSeriesIds, seriesContainer, 'tv', 'liked series')
        ]);

    } catch (error) {
        console.error('[LikedContent] Error processing liked items data:', error);
        displayErrorMessage(movieContainer, 'Error displaying liked movies.');
        displayErrorMessage(seriesContainer, 'Error displaying liked series.');
    }
}

// ================================================
//      FETCH & RENDER LIKED ITEM DETAILS
// ================================================
async function fetchAndRenderLikedDetails(ids, container, type, contentTypeLabel) {
    if (!container) return;

    const apiKey = 'd37c49fbb30e8f5eb1000b388ab5bf71'; // Ensure this is correct
    if (!apiKey || apiKey === 'YOUR_TMDB_API_KEY') {
       console.error(`[LikedContent] TMDB API Key is missing for fetching ${contentTypeLabel} details!`);
       displayErrorMessage(container, `Cannot fetch ${contentTypeLabel} details (Config Error).`);
       return;
    }

    if (!Array.isArray(ids) || ids.length === 0) {
        displayEmptyMessage(container, `You haven't liked any ${contentTypeLabel} yet.`);
        return;
    }

    console.log(`[LikedContent] Fetching details for ${ids.length} ${contentTypeLabel}...`);
    container.innerHTML = ''; // Clear loading/previous message

    const detailPromises = ids.map(id => {
        const url = `https://api.themoviedb.org/3/${type}/${id}?api_key=${apiKey}&language=en-US`;
        return fetch(url)
            .then(res => {
                if (!res.ok) {
                    console.error(`[LikedContent] Error fetching ${type} details for ID ${id}: ${res.status}`);
                    return null; // Indicate failure for this specific item
                }
                return res.json();
            })
            .catch(err => {
                console.error(`[LikedContent] Network error fetching ${type} details for ID ${id}:`, err);
                return null;
            });
    });

    try {
        const results = await Promise.all(detailPromises);
        let displayedCount = 0;
        results.forEach(itemData => {
            if (itemData && itemData.id) {
                const card = createContentCard(itemData, type);
                 if (card) {
                    container.appendChild(card);
                    displayedCount++;
                 }
            } else {
                console.warn(`[LikedContent] Skipping null or invalid ${type} data.`);
            }
        });

        if (displayedCount === 0 && ids.length > 0) {
             displayErrorMessage(container, `Could not load details for ${contentTypeLabel}.`);
        } else if (displayedCount > 0) {
            console.log(`[LikedContent] Rendered ${displayedCount} ${contentTypeLabel} cards.`);
        }
        // If displayedCount is 0 and ids.length was 0, the empty message is already shown.

    } catch (error) {
        console.error(`[LikedContent] Error processing ${contentTypeLabel} details:`, error);
        displayErrorMessage(container, `Error displaying ${contentTypeLabel}.`);
    }
}


// ================================================
//      CREATE CONTENT CARD (New UI)
// ================================================
function createContentCard(itemData, type) {
    if (!itemData || !itemData.id) return null;

    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.itemId = itemData.id;
    card.dataset.itemType = type;

    const title = type === 'movie' ? itemData.title : itemData.name;
    const releaseDate = type === 'movie' ? itemData.release_date : itemData.first_air_date;
    const overview = itemData.overview || 'No overview available.';
    const tagline = itemData.tagline || ''; // May be empty

    const posterPath = itemData.poster_path ? `${TMDB_IMAGE_BASE_URL}${itemData.poster_path}` : null;
    if (posterPath) {
        card.style.backgroundImage = `url(${posterPath})`;
    } else {
        card.style.backgroundColor = '#333'; // Fallback background
         // Add placeholder text if no image
         card.innerHTML = `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888; text-align: center; padding: 10px;">${title}<br>(No Image)</div>`;
    }

    // Format Date (Optional, but nice)
    let formattedDate = '';
    if (releaseDate) {
        try {
            formattedDate = new Date(releaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
        } catch (e) {
            formattedDate = releaseDate; // Fallback to raw date string
        }
    }

    // Build Inner HTML using template literals for clarity
    card.innerHTML = `
        ${posterPath ? '' : `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #888; text-align: center; padding: 10px;">${title}<br>(No Image)</div>` }
        ${formattedDate ? `<div class="date">${formattedDate}</div>` : ''}
        <div class="content">
            <div class="title">${title || 'Title Unavailable'}</div>
            ${tagline ? `<div class="tagline">${tagline}</div>` : ''}
        </div>
        <div class="sinopse">
            <!-- Iframe will be populated on hover -->
            <iframe style="width: 100%; height: 50%; border: none;"
                    id="trailer-${type}-${itemData.id}"
                    type="text/html"
                    src="about:blank"
                    allowfullscreen
                    allow="autoplay"></iframe>
            <div class="content-sinopse">
                <div class="text">${overview}</div>
            </div>
            <div class="view">Details</div> <!-- Changed text -->
        </div>
    `;

     // Add event listeners after innerHTML is set
     addCardEventListeners(card, itemData.id, type);


    return card;
}

// ================================================
//      CARD EVENT LISTENERS (Hover & Click)
// ================================================
function addCardEventListeners(card, itemId, itemType) {
     const iframe = card.querySelector('iframe');
     let trailerUrl = null; // Store fetched trailer URL
     let isFetchingTrailer = false;

     card.addEventListener('mouseenter', async () => {
         if (!iframe) return;
         // Only fetch trailer URL once per card instance
         if (!trailerUrl && !isFetchingTrailer) {
             isFetchingTrailer = true;
             trailerUrl = await getYouTubeTrailerUrl(itemId, itemType); // Fetch URL
              isFetchingTrailer = false; // Reset flag
              console.log(`[LikedContent] Trailer URL for ${itemType} ${itemId}: ${trailerUrl}`);
         }

         // Set iframe src only if a valid URL was found
         if (trailerUrl) {
             iframe.src = trailerUrl;
         } else {
            // Optional: Display a message in the iframe space if no trailer
             iframe.src = "about:blank";
             try {
                 iframe.contentWindow.document.body.innerHTML = '<div style="color: #ccc; font-size: 12px; text-align: center; padding-top: 20%;">Trailer not available</div>';
             } catch (e) { console.warn("Could not write to iframe"); }
         }
     });

     card.addEventListener('mouseleave', () => {
          if (!iframe) return;
         // Clear the iframe src to stop playback
         iframe.src = 'about:blank';
     });

      // Click listener for the 'Details' button (or the whole card)
     const viewButton = card.querySelector('.view');
     if (viewButton) {
         viewButton.addEventListener('click', (event) => {
             event.stopPropagation(); // Prevent card click if button is clicked
             navigateToDetails(itemType, itemId);
         });
     }
      // Optional: Make the whole card clickable as a fallback
      card.addEventListener('click', () => {
           navigateToDetails(itemType, itemId);
      });
}

// ================================================
//      HELPER FUNCTIONS
// ================================================

// --- Navigate to Details Page ---
function navigateToDetails(itemType, itemId) {
     console.log(`[LikedContent] Navigating to details - Type: ${itemType}, ID: ${itemId}`);
     let url = '';
     if (itemType === 'movie') {
         url = `../movie_details/movie_details.html?id=${itemId}`; // Path from liked_movies folder
     } else if (itemType === 'tv') {
         url = `../series_details/series_details.html?id=${itemId}`; // Path from liked_movies folder
     } else {
         console.error('[LikedContent] Unknown item type for navigation:', itemType);
         return;
     }
     window.location.href = url;
}


// --- Fetch YouTube Trailer ---
async function getYouTubeTrailerUrl(itemId, itemType) {
    // Using the direct TMDB endpoint as an example, adapt if you use your backend proxy
    const apiKey = 'd37c49fbb30e8f5eb1000b388ab5bf71';
    const url = `https://api.themoviedb.org/3/${itemType}/${itemId}/videos?api_key=${apiKey}&language=en-US`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
             console.error(`[LikedContent] Error fetching videos for ${itemType} ${itemId}: ${response.status}`);
             return null;
        }
        const data = await response.json();
        const trailer = data.results?.find(video =>
            video.site === 'YouTube' &&
            (video.type === 'Trailer' || video.type === 'Teaser') && // Accept Teasers too
            video.official === true // Prefer official
        ) || data.results?.find(video => video.site === 'YouTube' && (video.type === 'Trailer' || video.type === 'Teaser')); // Fallback to any trailer/teaser

        if (trailer && trailer.key) {
            // Added modestbranding=1&showinfo=0&controls=1
            return `https://www.youtube.com/embed/${trailer.key}?autoplay=1&mute=1&enablejsapi=1&modestbranding=1&showinfo=0&controls=1&origin=${window.location.origin}`; // Added origin for JS API
        } else {
            return null; // No suitable trailer found
        }
    } catch (error) {
        console.error(`[LikedContent] Network error fetching videos for ${itemType} ${itemId}:`, error);
        return null;
    }
}


// --- Display Loading Message ---
function displayLoadingMessage(container, message) {
    if (container) {
        container.innerHTML = `<p class="loading-message">${message}</p>`;
    }
}

// --- Display Empty Message ---
function displayEmptyMessage(container, message) {
    if (container) {
        container.innerHTML = `<p class="empty-message">${message}</p>`;
    }
}

// --- Display Error Message ---
function displayErrorMessage(container, message) {
     if (container) {
        container.innerHTML = `<p class="empty-message" style="color: #ff8a8a;">${message}</p>`; // Use empty style, change color
    }
}

// --- Handle Fetch Errors ---
async function handleFetchError(response, container, type) {
   let errorMsg = `Could not load ${type}.`;
   try {
        const errorData = await response.json(); // Try parsing JSON error from backend
        console.error(`[LikedContent] Error fetching ${type}. Status: ${response.status}. Data:`, errorData);
        if (response.status === 401 || response.status === 403) {
           errorMsg = `Authentication error loading ${type}. Please log in again.`;
           // Maybe trigger logout automatically?
           // localStorage.removeItem('authToken');
           // window.location.href = '../auth/login.html';
        } else if (errorData && errorData.message) {
            errorMsg = `Could not load ${type}: ${errorData.message}`; // Use backend message if available
        } else {
             errorMsg = `Could not load ${type} (Error ${response.status}).`;
        }
   } catch (e) { // Handle cases where error response is not JSON
        const textError = await response.text();
        console.error(`[LikedContent] Error fetching ${type}. Status: ${response.status}. Response: ${textError}`);
        errorMsg = `Could not load ${type} (Error ${response.status}).`;
   }
   displayErrorMessage(container, errorMsg);
    if (response.status >= 500) {
       console.warn(`[LikedContent] Hint: Check Vercel Function logs for backend errors related to ${type}.`);
   }
}


// ================================================
//      SIDEBAR & LOGOUT (Copied & Adapted)
// ================================================
function setupSidebar() {
    let sidebar = document.querySelector(".sidebar");
    let closeBtn = document.querySelector("#btn");
    let searchBtn = document.querySelector(".bx-search"); // Keep search functionality if needed
    const mainContent = document.querySelector('.main-content');

    const menuBtnChange = () => {
        if (!sidebar || !closeBtn || !mainContent) return;
        const isOpen = sidebar.classList.contains("open");
        if (isOpen) {
            closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");
            mainContent.style.marginLeft = '250px';
             mainContent.style.width = 'calc(100% - 250px)';
        } else {
            closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
             mainContent.style.marginLeft = '80px';
              mainContent.style.width = 'calc(100% - 80px)';
        }
    };

    if (closeBtn && sidebar) {
        closeBtn.addEventListener("click", () => {
            sidebar.classList.toggle("open");
            menuBtnChange();
        });
    }

    // Optional: Search button toggles sidebar as well
    if (searchBtn && sidebar) {
         searchBtn.addEventListener("click", () => {
            if (!sidebar.classList.contains("open")) { // Only open if closed
                 sidebar.classList.add("open");
                 menuBtnChange();
                 // Focus the input?
                 document.getElementById('searchInput')?.focus();
            }
         });
    }

     // Initial adjustment in case styles didn't apply correctly
     setTimeout(menuBtnChange, 100); // Run shortly after load
     // Also run on resize if you want it to adapt more dynamically
     window.addEventListener('resize', () => {
        // Basic check to close sidebar on smaller screens if it was open
        if (window.innerWidth < 992 && sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            menuBtnChange();
        }
     });
}

// --- Search Function (Keep standard behavior) ---
function searchMovies() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const query = searchInput.value.trim();
    if (query.length === 0) return;
    // Navigate to results page (ensure path is correct from liked_movies folder)
    const url = `../results/results.html?query=${encodeURIComponent(query)}`;
    window.location.href = url;
}
// Add Enter key listener for search
const searchInput = document.getElementById('searchInput');
if (searchInput) {
    searchInput.addEventListener('keydown', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault(); // Prevent form submission if it were in a form
            searchMovies();
        }
    });
}


// --- Logout Functionality ---
function setupLogout() {
    const logoutButton = document.getElementById('log_out');
    if (logoutButton) {
        logoutButton.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('[LikedContent] Logging out...');
            localStorage.removeItem('authToken');
            // Redirect to login page (ensure path is correct)
            window.location.href = '../auth/login.html';
        });
    } else {
        console.warn('[LikedContent] Logout button (#log_out) not found.');
    }
}

console.log('[LikedContent] Script finished loading.');