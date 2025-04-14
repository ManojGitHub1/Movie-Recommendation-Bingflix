// api/controllers/userController.js
const User = require('../models/User');
const fetch = require('node-fetch'); // Using node-fetch for the asynchronous trigger
require('dotenv').config(); // Load environment variables if needed (e.g., for INTERNAL_SECRET_KEY)

// --- Function to trigger the Python ML service on Cloud Run ---
// This function sends a POST request to the deployed Python service endpoint.
// It uses the final "fire-and-forget" approach.
const triggerRecommendationUpdate = (userId) => { // Removed 'async' as we are not awaiting fetch
    // !!! IMPORTANT: Ensure this is YOUR actual Cloud Run service URL !!!
    const pythonServiceUrl = 'https://movie-recommendation-service-97667244761.us-central1.run.app/api/python/update_recommendations';
    // Example format: 'https://your-service-name-random-suffix-region.a.run.app/api/python/update_recommendations'
    // Make sure the path '/api/python/update_recommendations' matches the route defined in your Python Flask app.

    // Log the trigger attempt.
    console.log(`Triggering recommendation update for user: ${userId} -> ${pythonServiceUrl}`);


    // --- Commented Out Debugging Code (Using await) ---
    /*
    try {
        // Prepare the request body
        const requestBody = JSON.stringify({ userId: userId.toString() });
        console.log("[DEBUG] Fetch Body:", requestBody); // Log the exact body being sent

        // --- TEMPORARY DEBUGGING: Await the fetch call and log response details ---
        console.log("[DEBUG] Awaiting fetch response..."); // Log before starting the fetch
        const response = await fetch(pythonServiceUrl, { // Temporarily use await
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Optional Security Header (Example)
                // 'X-Internal-Secret': process.env.INTERNAL_SECRET_KEY
            },
            body: requestBody,
            // Optional: Timeout (syntax might vary slightly between node-fetch v2/v3)
            // timeout: 15000 // e.g., 15 seconds
        });

        // Log the HTTP status code received from the Cloud Run service (or infrastructure).
        console.log(`[DEBUG] Python service response Status: ${response.status}`); // <-- KEY DEBUG LOG 1

        // Log the first part of the response body text.
        const responseText = await response.text();
        console.log(`[DEBUG] Python service response Text: ${responseText.substring(0, 500)}...`); // <-- KEY DEBUG LOG 2
        // --- END TEMPORARY DEBUGGING ---

        // Log confirmation that the awaited request completed (doesn't mean success).
        console.log(`Recommendation update request processed (awaited) for user: ${userId}`);

    } catch (error) {
        // Catch errors during the fetch process (network, DNS, timeouts, etc.)
        // Log the *entire* error object for maximum detail during debugging.
        console.error(`[DEBUG] Error during fetch/trigger for recommendation update for user ${userId}:`, error); // <-- KEY DEBUG LOG 3
        // Consider more sophisticated error logging in production.
    }
    */
    // --- End Commented Out Debugging Code ---


    // --- Active Fire-and-Forget Logic ---
    try {
        const requestBody = JSON.stringify({ userId: userId.toString() });
        console.log("Sending fetch Body:", requestBody); // Log the body being sent

        // Initiate the fetch call but don't wait for it to complete.
        fetch(pythonServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: requestBody
        })
        .then(res => {
            // Optional: Log the immediate response status. This confirms the request reached
            // Cloud Run's frontend, but *not* that the Python code finished successfully.
            console.log(`Trigger response status from Cloud Run: ${res.status} (User: ${userId})`);
        })
        .catch(fetchError => {
            // Catch errors *only* if the fetch call itself fails immediately (e.g., network issue, DNS).
            // This will NOT catch HTTP errors (like 500) from the Python service later.
            console.error(`Error sending trigger request (fetch failed) for user ${userId}:`, fetchError.message);
        });

        // Log immediately after starting the fetch call, indicating the request was sent off.
        console.log(`Recommendation update request initiated for user: ${userId}`);

    } catch (error) {
        // Catch synchronous errors that might occur *before* the fetch call is even made
        // (e.g., if JSON.stringify fails, though unlikely here).
        console.error(`Synchronous error before sending trigger for user ${userId}:`, error.message);
    }
    // --- End Active Fire-and-Forget Logic ---

};


// @desc    Add a movie to the user's liked list and trigger recommendation update
// @route   POST /api/user/likes
// @access  Private (Requires authentication via 'protect' middleware)
exports.addLike = async (req, res) => {
    console.log("--- [addLike DEBUG] Function entered ---");
    const { movieId } = req.body;
    const userId = req.user.id;
    console.log(`--- [addLike DEBUG] UserID: ${userId}, MovieID: ${movieId} ---`);

    if (movieId === undefined || typeof movieId !== 'number') {
        console.log("--- [addLike DEBUG] Validation failed: Invalid Movie ID ---");
        return res.status(400).json({ success: false, message: 'Please provide a valid movie ID (number).' });
    }

    try {
        // --- Database Interaction (RESTORED) ---
        console.log("--- [addLike DEBUG] Preparing to call User.findByIdAndUpdate ---"); // Log Before DB Call

        // Find the user by ID and add the movieId to their 'likedMovies' array.
        // $addToSet prevents duplicate entries in the array.
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { likedMovies: movieId } },
            { new: true, runValidators: true } // Options: return the updated document, run schema validations
        );

        console.log("--- [addLike DEBUG] User.findByIdAndUpdate completed ---"); // Log After DB Call (only if successful)
        // -----------------------------------------

        // Handle case where user might not be found
        if (!user) {
            console.log("--- [addLike DEBUG] User not found after update attempt ---");
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // --- Trigger Recommendation Update (Fire-and-Forget) ---
        console.log(`--- [addLike DEBUG] DB Update successful, about to call triggerRecommendationUpdate for userId: ${userId} ---`);
        triggerRecommendationUpdate(userId); // Call the trigger function
        console.log("--- [addLike DEBUG] Returned from triggerRecommendationUpdate call ---");
        // ----------------------------------------------------

        console.log("--- [addLike DEBUG] Preparing 200 OK response ---");
        res.status(200).json({
            success: true,
            message: 'Movie liked successfully. Recommendation update initiated.',
            likedMovies: user.likedMovies
        });
        console.log("--- [addLike DEBUG] Sent 200 OK response ---");

    } catch (error) {
        // --- Enhanced Catch Block Logging ---
        console.error('--- [addLike DEBUG] ERROR Caught in addLike controller ---'); // Log Catch Entry
        console.error('--- [addLike DEBUG] Error Message:', error.message);       // Log Error Message
        console.error('--- [addLike DEBUG] Error Stack:', error.stack);         // Log Error Stack (Important!)
        // console.error('--- [addLike DEBUG] Full Error Object:', error);       // Log Full Error (can be verbose)
        // ------------------------------------
        res.status(500).json({ success: false, message: 'Server error while liking movie' });
    }

    console.log("--- [addLike DEBUG] Function finished ---"); // Log Function End
};


exports.addSeriesLike = async (req, res) => {
    // Assuming the series ID is sent in the request body like { seriesId: 12345 }
    const { seriesId } = req.body;

    if (!seriesId || typeof seriesId !== 'number') {
        return res.status(400).json({ message: 'Valid seriesId is required in request body' });
    }

    try {
        // Find the user and add the seriesId to the likedSeries array using $addToSet
        // $addToSet ensures the ID is only added if it doesn't already exist
        const updatedUser = await User.findByIdAndUpdate(
            req.user.id, // User ID from the 'protect' middleware
            { $addToSet: { likedSeries: seriesId } },
            { new: true, select: 'likedSeries' } // Return the updated document, only the likedSeries field
        );

        if (!updatedUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[API] Series ID ${seriesId} added to likedSeries for user ${req.user.id}`);

        // Decision: Should liking a series trigger movie recommendation updates?
        // For now, we are NOT triggering it. If you want to, uncomment the next line:
        // triggerRecommendationUpdate(req.user.id);

        // Send back the updated list of liked series IDs (or just success)
        res.status(200).json({
            message: 'Series added to likes',
            likedSeries: updatedUser.likedSeries // Send back the current list
        });

    } catch (error) {
        console.error('[API] Error in addSeriesLike controller:', error);
        res.status(500).json({ message: 'Server error adding series like' });
    }
};


// @desc    Get the list of liked movie IDs for the logged-in user
// @route   GET /api/user/likes
// @access  Private (Requires authentication)
exports.getLikes = async (req, res) => {
    console.log(`[API] GET /api/user/likes invoked for user ${req.user.id}`);
    try {
        // Fetch user document selecting BOTH likedMovies and likedSeries fields
        const user = await User.findById(req.user.id).select('likedMovies likedSeries');

        if (!user) {
            console.log('[API] User not found for ID:', req.user.id);
            return res.status(404).json({ message: 'User not found' });
        }

        console.log(`[API] Found likes for user ${req.user.id}: Movies=${user.likedMovies?.length || 0}, Series=${user.likedSeries?.length || 0}`);

        // Return both arrays in the response
        res.status(200).json({
            likedMovies: user.likedMovies || [], // Default to empty array if null/undefined
            likedSeries: user.likedSeries || []  // Default to empty array if null/undefined
        });

    } catch (error) {
        console.error('[API] Error in getLikes controller:', error);
        res.status(500).json({ message: 'Server error fetching likes' });
    }
};

// @desc    Get the list of recommended movie IDs for the logged-in user
// @route   GET /api/user/recommendations
// @access  Private (Requires authentication)
exports.getRecommendations = async (req, res) => {
    console.log('[API] GET /api/user/recommendations invoked'); // Keep for initial testing
    try {
        // 1. Fetch user document with only recommendedMovies field
        const user = await User.findById(req.user.id).select('recommendedMovies');

        if (!user) {
            console.log('[API] User not found for ID:', req.user.id);
            return res.status(404).json({ message: 'User not found' });
        }

        const movieIds = user.recommendedMovies;

        // 2. Check if there are any recommended movie IDs
        if (!movieIds || movieIds.length === 0) {
            console.log('[API] No recommendations found for user:', req.user.id);
            // Return an empty array if no recommendations exist yet
            return res.status(200).json({ recommendations: [] });
        }

        console.log(`[API] Found ${movieIds.length} recommendation IDs for user ${req.user.id}:`, movieIds);

        // 3. Fetch details for each movie ID from TMDB
        const apiKey = process.env.TMDB_API_KEY;
        if (!apiKey) {
            console.error('[API] TMDB_API_KEY environment variable not set.');
            return res.status(500).json({ message: 'Server configuration error: TMDB API key missing.' });
        }

        const movieDetailsPromises = movieIds.map(async (movieId) => {
            const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`;
            try {
                // console.log(`[API] Fetching details for movie ID: ${movieId}`); // Optional: verbose logging
                const tmdbResponse = await fetch(url);
                if (!tmdbResponse.ok) {
                    // Log TMDB error but don't fail the whole request, just skip this movie
                    console.error(`[API] TMDB API error for movie ${movieId}: ${tmdbResponse.status} ${tmdbResponse.statusText}`);
                    // Attempt to read body for more detail if possible (might fail)
                    try {
                        const errorBody = await tmdbResponse.text();
                        console.error(`[API] TMDB error body for movie ${movieId}: ${errorBody.substring(0, 200)}...`);
                    } catch (bodyError) {
                        // Ignore if reading body fails
                    }
                    return null; // Indicate failure for this specific movie
                }
                const movieData = await tmdbResponse.json();
                // console.log(`[API] Successfully fetched details for movie ID: ${movieId}`); // Optional: verbose logging

                // Select and structure the data needed by the frontend
                return {
                    id: movieData.id,
                    title: movieData.title,
                    overview: movieData.overview,
                    poster_path: movieData.poster_path, // Frontend will need to prepend base URL
                    release_date: movieData.release_date, // Format: 'YYYY-MM-DD'
                    vote_average: movieData.vote_average,
                    // Add any other fields you might want (e.g., genres)
                    // genres: movieData.genres.map(g => g.name) // Example if needed
                };
            } catch (fetchError) {
                console.error(`[API] Network or fetch error getting details for movie ${movieId}:`, fetchError);
                return null; // Indicate failure for this specific movie
            }
        });

        // 4. Wait for all TMDB requests to complete
        const resolvedMovieDetails = await Promise.all(movieDetailsPromises);

        // 5. Filter out any null results (due to TMDB errors)
        const successfulMovieDetails = resolvedMovieDetails.filter(detail => detail !== null);

        console.log(`[API] Successfully fetched details for ${successfulMovieDetails.length} out of ${movieIds.length} recommendations.`);

        // 6. Send the array of detailed movie objects
        res.status(200).json({ recommendations: successfulMovieDetails });

    } catch (error) {
        console.error('[API] Error in getRecommendations controller:', error);
        res.status(500).json({ message: 'Server error fetching recommendations' });
    }
};


// Optional: If you implement an "unlike" feature on the frontend and backend.
/*
// @desc    Remove a movie from the user's liked list
// @route   DELETE /api/user/likes/:movieId  (Example using route parameter)
// @access  Private
exports.removeLike = async (req, res) => {
    const { movieId } = req.params; // Get movieId from route parameters (e.g., /likes/123)
    const userId = req.user.id;

    // Convert movieId from string parameter to number for matching in the database array.
    const movieIdNumber = parseInt(movieId, 10);
    if (isNaN(movieIdNumber)) {
         return res.status(400).json({ success: false, message: 'Invalid movie ID format in URL parameter.' });
    }

    try {
        // Find the user and remove the movieIdNumber from the likedMovies array using $pull.
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { likedMovies: movieIdNumber } },
            { new: true } // Return the updated document
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Optional: Trigger recommendation update after unliking too?
        // It might make sense to regenerate recommendations if a user unlikes a movie.
        // triggerRecommendationUpdate(userId);

        res.status(200).json({
            success: true,
            message: 'Movie unliked successfully',
            likedMovies: user.likedMovies // Return the updated list
        });

    } catch (error) {
        console.error('Error unliking movie:', error);
        res.status(500).json({ success: false, message: 'Server error while unliking movie.' });
    }
};
*/