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
exports.addLike = async (req, res) => { // Keep async because of User.findByIdAndUpdate
    console.log("--- [addLike DEBUG] Function entered ---");
    const { movieId } = req.body; // Expecting { "movieId": 123 } in the request body
    const userId = req.user.id;   // Get user ID attached by the 'protect' middleware

    console.log(`--- [addLike DEBUG] UserID: ${userId}, MovieID: ${movieId} ---`); // <<< Log Input

    // Validate input: Check if movieId is provided and is a number.
    if (movieId === undefined || typeof movieId !== 'number') {
        console.log("--- [addLike DEBUG] Validation failed: Invalid Movie ID ---"); // <<< Log Validation Fail
        return res.status(400).json({ success: false, message: 'Please provide a valid movie ID (number).' });
    }

    try {

        console.log("--- [addLike DEBUG] Skipping database interaction ---"); // <<< Log Skip DB
        // Find the user by ID and add the movieId to their 'likedMovies' array.
        // $addToSet prevents duplicate entries in the array.
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { likedMovies: movieId } },
            { new: true, runValidators: true } // Options: return the updated document, run schema validations
        );

        console.log("--- [addLike DEBUG] User.findByIdAndUpdate completed ---"); // <<< Log After DB Call (if successful)
        // console.log("--- [addLike DEBUG] User result:", user ? user.toObject() : 'null'); // Optional: Log user result briefly

        // Handle case where user might not be found (e.g., ID mismatch, though unlikely after 'protect').
        if (!user) {
            console.log("--- [addLike DEBUG] User not found after update attempt ---"); // <<< Log User Not Found
            // Note: This log might appear if the findByIdAndUpdate itself succeeded but found no matching user.
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // --- Call Trigger Function ---
        console.log(`--- [addLike DEBUG] DB Update successful, about to call triggerRecommendationUpdate for userId: ${userId} ---`); // <<< Log Before Trigger

        // --- Trigger Recommendation Update (Fire-and-Forget) ---
        // Call the function to notify the Python service. This call returns immediately.
        triggerRecommendationUpdate(userId);
        // ----------------------------------------------------
        console.log("--- [addLike DEBUG] Returned from triggerRecommendationUpdate call ---"); // <<< Log After Trigger Call

        console.log("--- [addLike DEBUG] Preparing 200 OK response ---"); // <<< Log Before Response
        // Send a success response back to the frontend immediately.
        // Updated message reflects that the update was initiated, not completed.
        res.status(200).json({
            success: true,
            message: 'Movie liked successfully. Recommendation update initiated.',
            likedMovies: user.likedMovies // Return the user's full updated list of liked movies.
        });
        console.log("--- [addLike DEBUG] Sent 200 OK response ---"); // <<< Log After Response (might not show if function terminates)

    } catch (error) {
        // --- Enhanced Catch Block Logging ---
        console.error('--- [addLike DEBUG] ERROR Caught in addLike controller ---'); // <<< Log Catch Entry
        console.error('--- [addLike DEBUG] Error Message:', error.message);       // <<< Log Error Message
        console.error('--- [addLike DEBUG] Error Stack:', error.stack);         // <<< Log Error Stack (Important!)
        // console.error('--- [addLike DEBUG] Full Error Object:', error);       // <<< Log Full Error (can be verbose)        res.status(500).json({ success: false, message: 'Server error while liking movie.' });
    }

    console.log("--- [addLike DEBUG] Function finished ---"); // <<< Log End (might not show if function terminates)
};

// @desc    Get the list of liked movie IDs for the logged-in user
// @route   GET /api/user/likes
// @access  Private (Requires authentication)
exports.getLikes = async (req, res) => {
    const userId = req.user.id; // Get user ID from the 'protect' middleware

    try {
        // Find the user and select only the 'likedMovies' field for efficiency.
        const user = await User.findById(userId).select('likedMovies');

        if (!user) {
            // Defensive check, although 'protect' should ensure the user exists.
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Return the array of liked movie IDs. Send an empty array if the field is null/undefined.
        res.status(200).json({
            success: true,
            likedMovies: user.likedMovies || []
        });

    } catch (error) {
        console.error('Error fetching liked movies:', error);
        res.status(500).json({ success: false, message: 'Server error fetching liked movies.' });
    }
};

// @desc    Get the list of recommended movie IDs for the logged-in user
// @route   GET /api/user/recommendations
// @access  Private (Requires authentication)
exports.getRecommendations = async (req, res) => {
    const userId = req.user.id; // Get user ID from 'protect' middleware

    try {
        // Find the user and select only the 'recommendedMovies' field.
        const user = await User.findById(userId).select('recommendedMovies');

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Get the array of recommended movie IDs (pre-calculated by the Python service).
        const recommendedMovieIds = user.recommendedMovies || [];

        // --- TODO: Future Enhancement: Fetch Full Movie Details ---
        // Currently, we only send back the IDs stored in the database.
        // For the frontend to display posters, titles, etc., this backend route
        // should ideally take these IDs and make requests to the TMDB API
        // to fetch the full details for each recommended movie before sending the response.
        // This will be implemented in a later step.
        /*
        Example of fetching details (pseudo-code):
        const detailedRecommendations = [];
        if (recommendedMovieIds.length > 0) {
             const tmdbApiKey = process.env.TMDB_API_KEY; // Make sure key is available
             const fetchPromises = recommendedMovieIds.map(id =>
                 fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${tmdbApiKey}&language=en-US`)
                     .then(tmdbRes => tmdbRes.ok ? tmdbRes.json() : null) // Handle potential TMDB errors
             );
             const results = await Promise.all(fetchPromises);
             detailedRecommendations = results.filter(details => details !== null); // Filter out any failed fetches
        }
        res.status(200).json({
            success: true,
            recommendations: detailedRecommendations // Send detailed info
        });
        */
        // --- End Enhancement Placeholder ---


        // For now, just return the IDs.
        res.status(200).json({
            success: true,
            recommendations: recommendedMovieIds
        });

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ success: false, message: 'Server error fetching recommendations.' });
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