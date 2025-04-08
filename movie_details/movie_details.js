// Keep existing global variables if needed
let ImdbId;

// --- Keep Existing Helper Functions ---
function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, '\\$&');
    var regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)'),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function switchEmbed(embedUrl) {
    console.log("Switching embed to:", embedUrl);
    const iframe = document.getElementById('movieIframe');
    if (iframe) {
        iframe.src = embedUrl;
    } else {
        console.error("Iframe element not found");
    }
}

// --- Keep Existing API Interaction Functions (Modify URL if needed) ---
// Assuming your Node.js backend API is running at the root or adjust the base URL
const API_BASE_URL = ''; // Use '' for same origin deployment (Vercel), or 'http://localhost:PORT' for local dev if ports differ
const currentMovieId = getParameterByName('id'); // Get movie ID early

const extidsUrl = `${API_BASE_URL}/api/movies_details/extids/${currentMovieId}`; // Assuming this route exists in your Node backend
async function getImdbIdAndEmbed(embedUrlPrefix) {
    try {
        // Note: This fetch call seems to go to a different backend path than auth/likes.
        // Ensure 'https://bingflix-backend.vercel.app' corresponds to where your Node.js API (including the new /api/user routes) is deployed.
        // If it's the same backend, use relative paths like '/api/movies_details/...'
        const response = await fetch(`https://bingflix-backend.vercel.app/movies_details/extids/${currentMovieId}`); // Or use relative path if same backend
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        if (data && data.imdb_id) {
            console.log("IMDb ID:", data.imdb_id);
            const fullEmbedUrl = embedUrlPrefix + data.imdb_id;
            console.log("Embedding URL:", fullEmbedUrl);
            switchEmbed(fullEmbedUrl);
        } else {
            console.error("IMDb ID not found in response:", data);
            alert("Could not find IMDb ID for this embed server.");
        }
    } catch (error) {
        console.error('Error fetching external IDs or embedding:', error);
        alert("Error loading movie data for this server.");
    }
}


// ==============================================================
// --- NEW LIKES LOGIC (Backend Integration) ---
// ==============================================================

// Global variable to store the IDs of movies liked by the logged-in user
let userLikedMovies = new Set();
const likeButton = document.querySelector('.paw-button'); // Reference the like button

// --- Helper Functions for Authentication ---
function getAuthToken() {
    // *** IMPORTANT: Use the same key you use when storing the token after login ***
    return localStorage.getItem('authToken');
}

function isLoggedIn() {
    return !!getAuthToken(); // Returns true if a token exists, false otherwise
}

// --- Function to Update Like Button Visual State (No Animation) ---
function setLikeButtonState(movieId, isLiked) {
    if (!likeButton) return;

    // Get the span inside the button for text
    const buttonTextSpan = likeButton.querySelector('.text span'); // Target the span inside .text div

    // Clear existing state classes/text first
    likeButton.classList.remove('animation', 'liked', 'confetti');
    likeButton.querySelectorAll('i.confetti-piece').forEach(i => i.remove()); // Remove old confetti elements if any

    if (isLiked) {
        // Apply 'liked' state visuals
        likeButton.classList.add('liked');
        if (buttonTextSpan) buttonTextSpan.textContent = "Saved"; // Update text
    } else {
        // Ensure it's in the 'not liked' state
        likeButton.classList.remove('liked'); // Ensure liked class is removed
        if (buttonTextSpan) buttonTextSpan.textContent = "Like"; // Reset text or set to "Like"
    }
}

// --- Function to Fetch Liked Movies from Backend ---
async function fetchUserLikes() {
    if (!isLoggedIn()) {
        console.log("User not logged in. Cannot fetch likes.");
        userLikedMovies = new Set(); // Ensure set is empty if not logged in
        return;
    }
    console.log("Fetching user likes...");
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/likes`, { // Use the correct backend URL
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                // Ensure movie IDs are numbers before adding to Set
                const likedIds = data.likedMovies.map(id => Number(id));
                userLikedMovies = new Set(likedIds);
                console.log("Fetched user likes:", userLikedMovies);
            } else {
                console.error("Failed to fetch likes:", data.message);
                userLikedMovies = new Set();
            }
        } else if (response.status === 401) {
            console.error("Unauthorized (401). Token might be invalid or expired.");
            // Optional: Clear token, redirect?
            // localStorage.removeItem('authToken');
            // window.location.href = '/auth/login.html';
            userLikedMovies = new Set();
        } else {
            console.error(`Error fetching likes: ${response.status} ${response.statusText}`);
            userLikedMovies = new Set();
        }
    } catch (error) {
        console.error("Network error fetching likes:", error);
        userLikedMovies = new Set();
    }
}

// --- Function to LIKE a Movie via Backend API ---
async function likeMovieBackend(movieId) {
    if (!isLoggedIn()) {
        alert("Please log in to save movies.");
        return false; // Indicate action failed
    }

    // Ensure movieId is a number
    const numericMovieId = Number(movieId);
    if (isNaN(numericMovieId)) {
        console.error("Invalid movieId:", movieId);
        return false;
    }

    console.log(`Attempting to like movie ID: ${numericMovieId}`);
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/likes`, { // Use the correct backend URL
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ movieId: numericMovieId }) // Send numeric ID
        });

        const data = await response.json();

        if (response.ok && data.success) {
            console.log("Movie liked successfully via backend.");
            userLikedMovies.add(numericMovieId); // Update our local state
            return true; // Indicate success
        } else {
            console.error("Failed to like movie:", data.message || response.statusText);
            alert(`Failed to save movie: ${data.message || 'Server error'}`); // Inform user
            return false; // Indicate failure
        }
    } catch (error) {
        console.error("Network error liking movie:", error);
        alert("Network error. Could not save movie.");
        return false; // Indicate failure
    }
}

// --- Function to UNLIKE a Movie via Backend API (Placeholder) ---
// *** Requires backend endpoint (e.g., DELETE /api/user/likes/:movieId) ***
async function unlikeMovieBackend(movieId) {
     const numericMovieId = Number(movieId);
     if (isNaN(numericMovieId)) {
         console.error("Invalid movieId for unlike:", movieId);
         return false;
     }

    console.warn(`Unliking movie ID: ${numericMovieId} - Frontend logic called, but backend endpoint needs implementation.`);
    alert("Unliking feature is not yet fully implemented on the backend.");
    // Placeholder: Simulate success for UI testing if needed, but it won't persist.
    // userLikedMovies.delete(numericMovieId); // Update local state optimistically maybe?
    // return true; // Simulate success

    // --- When backend is ready, implement the actual fetch call: ---
    /*
    if (!isLoggedIn()) {
        alert("Please log in to manage saved movies.");
        return false;
    }
    const token = getAuthToken();
    try {
        const response = await fetch(`${API_BASE_URL}/api/user/likes/${numericMovieId}`, { // Example DELETE endpoint
            method: 'DELETE', // Or POST to an /unlike route
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        if (response.ok && data.success) {
            console.log("Movie unliked successfully via backend.");
            userLikedMovies.delete(numericMovieId); // Update local state
            return true;
        } else {
            console.error("Failed to unlike movie:", data.message || response.statusText);
            alert(`Failed to unlike movie: ${data.message || 'Server error'}`);
            return false;
        }
    } catch (error) {
        console.error("Network error unliking movie:", error);
        alert("Network error. Could not unlike movie.");
        return false;
    }
    */
   return false; // Return false until implemented
}

// --- New Like Button Click Handler ---
async function handleLikeButtonClick(event) {
    event.preventDefault(); // Prevent default anchor tag behavior
    if (!likeButton) return;

    const movieIdAttr = likeButton.getAttribute('data-movie-id');
    if (!movieIdAttr) {
        console.error("Movie ID attribute missing from button.");
        return;
    }
    const movieId = Number(movieIdAttr); // Ensure numeric ID

    if (!isLoggedIn()) {
        alert("Please log in to save or unsave movies.");
        return;
    }

    const isCurrentlyLiked = userLikedMovies.has(movieId);
    console.log(`Button clicked. Movie ID: ${movieId}, Currently Liked: ${isCurrentlyLiked}`);

    likeButton.disabled = true; // Disable button during operation
    likeButton.classList.remove('animation', 'confetti'); // Remove animation classes before action

    let success = false;
    if (isCurrentlyLiked) {
        // --- Attempt to UNLIKE ---
        success = await unlikeMovieBackend(movieId);
        if (success) {
             console.log("Unlike successful, updating UI.");
             setLikeButtonState(movieId, false); // Update visual state to 'not liked'
        } else {
             console.log("Unlike failed or not implemented, UI not changed.");
        }

    } else {
        // --- Attempt to LIKE ---
        success = await likeMovieBackend(movieId);
        if (success) {
            console.log("Like successful, updating UI and animating.");
            // 1. Update visual state FIRST
            setLikeButtonState(movieId, true);

            // 2. Trigger Animations (using existing confetti logic)
            likeButton.classList.add('animation');
            for (let i = 0; i < confettiAmount; i++) { // Use existing confettiAmount
                createConfetti(likeButton); // Use existing createConfetti
            }
            setTimeout(() => {
                likeButton.classList.add('confetti');
                // Ensure final state is visually correct after animation
                 setTimeout(() => {
                      // The 'liked' class and text should already be set by setLikeButtonState
                      // Remove confetti elements after animation
                      likeButton.querySelectorAll('i.confetti-piece').forEach(i => i.remove());
                 }, 600); // Adjust timing if needed
            }, 260); // Adjust timing if needed

        } else {
            console.log("Like failed, UI not changed.");
            // Revert UI if it was optimistically updated (it wasn't in this flow)
        }
    }

    likeButton.disabled = false; // Re-enable button
}


// ==============================================================
// --- Page Initialization (DOMContentLoaded) ---
// ==============================================================

document.addEventListener("DOMContentLoaded", async () => { // Make async to await fetchUserLikes
    console.log("Movie details page loading...");

    // Fetch movie details using movie ID from URL parameter
    // const movieId = getParameterByName('id'); // Already defined globally as currentMovieId
    if (!currentMovieId) {
        console.error("Movie ID not found in URL parameters.");
        // Optionally display an error message to the user on the page
        return;
    }
    console.log("Movie ID:", currentMovieId);

    // Construct URLs using the currentMovieId
    // Ensure the base URL and paths are correct for your backend API setup
    const movieDetailsUrl = `https://bingflix-backend.vercel.app/movies_details/${currentMovieId}`;
    const castUrl = `https://bingflix-backend.vercel.app/movies_details/credits/${currentMovieId}`;
    const videosUrl = `https://bingflix-backend.vercel.app/movies_details/videos/${currentMovieId}`;

    // --- Setup Like Button ---
    if (likeButton) {
        console.log("Like button found.");
        likeButton.setAttribute('data-movie-id', currentMovieId);

        // 1. Fetch the user's current likes (if logged in)
        await fetchUserLikes(); // Wait for likes to be fetched before setting state

        // 2. Set the initial visual state of the button
        setLikeButtonState(Number(currentMovieId), userLikedMovies.has(Number(currentMovieId)));

        // 3. Remove any old listeners (optional, but good practice)
        // likeButton.removeEventListener('click', oldClickListener); // If there was one

        // 4. Add the NEW click listener
        likeButton.addEventListener('click', handleLikeButtonClick);
        console.log("New like button click listener added.");

    } else {
        console.warn("Like button (.paw-button) not found on this page.");
    }

    // --- Fetch and Display Movie Details, Cast, etc. (Keep Existing Logic) ---
    function fetchCastDetails() {
        fetch(castUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Cast fetch failed: ${response.status}`);
                return response.json();
            })
            .then(data => {
                const castList = document.getElementById('castList');
                if (!castList) return;
                castList.innerHTML = ''; // Clear previous cast if any
                data.cast.slice(0, 10).forEach(actor => { // Increased to 10 actors
                    if (!actor.profile_path) return; // Skip actors without photos

                    const listItem = document.createElement('div');
                    listItem.style.width = 'fit-content';
                    listItem.style.display = 'flex';
                    listItem.style.flexDirection = 'column';
                    listItem.style.alignItems = 'center'; // Center items
                    listItem.style.paddingRight = '15px'; // Adjust padding
                     listItem.style.marginBottom = '10px'; // Add bottom margin
                    listItem.style.fontFamily = 'Poppins, sans-serif'; // Add fallback font
                    listItem.style.fontSize = 'clamp(10px, 1.1vw, 14px)'; // Responsive font size
                    listItem.style.textAlign = 'center'; // Center text


                    const actorImage = document.createElement('img');
                    actorImage.src = `https://image.tmdb.org/t/p/w185${actor.profile_path}`;
                    actorImage.alt = actor.name;
                    actorImage.style.borderRadius = "10px"; // Slightly less rounded
                    actorImage.style.width = '80px'; // Fixed width
                    actorImage.style.height = '120px'; // Fixed height
                    actorImage.style.objectFit = 'cover'; // Ensure image covers the area
                    actorImage.style.marginBottom = '5px'; // Space below image

                     const actorName = document.createElement('span');
                    actorName.textContent = actor.name;
                     actorName.style.wordWrap = 'break-word'; // Prevent long names overflowing
                     actorName.style.maxWidth = '80px'; // Match image width

                    listItem.appendChild(actorImage);
                    listItem.appendChild(actorName);
                    castList.appendChild(listItem);
                });
            })
            .catch(error => console.error('Error fetching cast details:', error));
    }

    fetch(movieDetailsUrl)
        .then(response => {
             if (!response.ok) throw new Error(`Movie details fetch failed: ${response.status}`);
             return response.json();
        })
        .then(data => {
            // Populate movie details
            const poster = document.getElementById('poster');
            const title = document.getElementById('title');
            const description = document.getElementById('description');

            if (poster) poster.src = data.backdrop_path ? `https://image.tmdb.org/t/p/w780${data.backdrop_path}` : 'path/to/default/backdrop.jpg'; // Add fallback
            if (title) title.textContent = data.title || "Title Not Available";
            if (description) description.textContent = data.overview || "Description not available.";

            fetchCastDetails(); // Fetch cast after getting movie details

            // Set default embed URL using existing logic
            const defaultEmbed = `https://vidsrc.xyz/embed/movie/${currentMovieId}`; // Use vidsrc.xyz/embed/movie/
            console.log("Setting default embed:", defaultEmbed);
            switchEmbed(defaultEmbed);

        })
        .catch(error => {
            console.error('Error fetching movie details:', error);
            // Display error message to user?
            const detailsContainer = document.getElementById('movieDetails');
            if (detailsContainer) {
                 detailsContainer.innerHTML = '<p style="color:red;">Could not load movie details. Please try again later.</p>';
            }
        });

    // --- Trailer Button Logic (Keep Existing) ---
    function fetchAndEmbedTrailer() {
        fetch(videosUrl)
            .then(response => {
                if (!response.ok) throw new Error(`Videos fetch failed: ${response.status}`);
                return response.json();
            })
            .then(data => {
                console.log("Fetching trailer...");
                const trailer = data.results?.find(video => video.type === "Trailer" && video.site === "YouTube");
                if (trailer && trailer.key) {
                    console.log("Trailer found:", trailer.key);
                    switchEmbed(`https://www.youtube.com/embed/${trailer.key}`);
                } else {
                    console.log("YouTube Trailer not found");
                    alert("Sorry, couldn't find a YouTube trailer for this movie.");
                }
            })
            .catch(error => {
                console.error('Error fetching trailer:', error);
                alert("Error loading trailer.");
            });
    }

    const trailerButton = document.getElementById('Trailerbtn');
    if (trailerButton) {
        trailerButton.addEventListener('click', fetchAndEmbedTrailer);
    }

}); // End DOMContentLoaded


// ==============================================================
// --- KEEP Other Existing JS (Sidebar, Search, Confetti) ---
// ==============================================================

// --- Sidebar logic (Keep Existing) ---
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");

if (closeBtn && sidebar) {
    closeBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        menuBtnChange();
    });
}
if (searchBtn && sidebar) {
    searchBtn.addEventListener("click", () => {
        sidebar.classList.toggle("open");
        menuBtnChange();
    });
}

function menuBtnChange() {
    if (!sidebar || !closeBtn) return;
    if (sidebar.classList.contains("open")) {
        closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");
    } else {
        closeBtn.classList.replace("bx-menu-alt-right", "bx-menu");
    }
}

// --- Search logic (Keep Existing) ---
function searchMovies() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    const query = searchInput.value.trim(); // Trim whitespace
    if (query.length < 1) { // Allow search for 1 character? Or keep 3?
        alert("Please enter a movie title to search.");
        return;
    }
    // Ensure the results page path is correct relative to movie_details folder
    const url = `../results/results.html?query=${encodeURIComponent(query)}`;
    window.location.href = url;
}
// Add listener to input for Enter key (if not already handled by onkeydown attribute)
const searchInputElem = document.getElementById('searchInput');
if (searchInputElem) {
    searchInputElem.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { // Use event.key for modern browsers
             event.preventDefault(); // Prevent potential form submission
             searchMovies();
        }
    });
}


// --- Confetti Animation Logic (Keep Existing) ---
let confettiAmount = 60,
    confettiColors = [
        '#7d32f5', '#f6e434', '#63fdf1', '#e672da', '#295dfe', '#6e57ff'
    ],
    random = (min, max) => {
        return Math.floor(Math.random() * (max - min + 1) + min);
    },
    createConfetti = to => {
        if (!to) return;
        let elem = document.createElement('i');
        elem.classList.add('confetti-piece'); // Add a class for potential cleanup
        elem.style.setProperty('--x', random(-260, 260) + 'px');
        elem.style.setProperty('--y', random(-160, 160) + 'px');
        elem.style.setProperty('--r', random(0, 360) + 'deg');
        elem.style.setProperty('--s', random(.6, 1));
        elem.style.setProperty('--b', confettiColors[random(0, confettiColors.length - 1)]);
        to.appendChild(elem);
    };


console.log("movie_details.js loaded and initialized."); // Add a log to confirm script execution