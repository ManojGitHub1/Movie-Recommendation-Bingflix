// api/controllers/userController.js
const User = require('../models/User');
const fetch = require('node-fetch'); // Using node-fetch for the asynchronous trigger
require('dotenv').config(); // Load environment variables if needed (e.g., for INTERNAL_SECRET_KEY)

// --- Function to trigger the Python ML service on Cloud Run ---
// This function sends a POST request to the deployed Python service endpoint.
// It operates in a 'fire-and-forget' manner - it sends the request but doesn't wait for the Python service to finish.
const triggerRecommendationUpdate = async (userId) => {
    // !!! IMPORTANT: Replace this placeholder with YOUR actual Cloud Run service URL !!!
    const pythonServiceUrl = 'https://movie-recommendation-service-97667244761.us-central1.run.app/api/python/update_recommendations';
    // Example format: 'https://your-service-name-random-suffix-region.a.run.app/api/python/update_recommendations'
    // Make sure the path '/api/python/update_recommendations' matches the route defined in your Python Flask app.

    // Log the trigger attempt for debugging purposes.
    console.log(`Triggering recommendation update for user: ${userId} -> ${pythonServiceUrl}`);

    try {
        // Send the userId to the Python service asynchronously using node-fetch.
        // We don't use 'await' here because we want the addLike function to respond quickly to the frontend.
        // The Python service will process the request in the background.
        fetch(pythonServiceUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Optional Security: If needed, you could add a pre-shared key known only
                // to this Node.js service and the Python service.
                // 'X-Internal-Secret': process.env.INTERNAL_SECRET_KEY
            },
            // Ensure the userId is sent as a string in the JSON body,
            // matching what the Python service expects.
            body: JSON.stringify({ userId: userId.toString() })
        });

        // Log confirmation that the request was *sent*.
        // This does NOT guarantee the Python service received or processed it successfully.
        console.log(`Recommendation update request sent for user: ${userId}`);

    } catch (error) {
        // Catch errors that occur during the *sending* of the fetch request itself
        // (e.g., network error, DNS lookup failure, invalid Cloud Run URL).
        // This won't catch HTTP errors (like 4xx, 5xx) from the Python service response,
        // as we are not awaiting or processing the response.
        console.error(`Error sending trigger request for recommendation update for user ${userId}:`, error.message);
        // Consider more robust logging (e.g., to an external service) in a production environment.
    }
};


// @desc    Add a movie to the user's liked list and trigger recommendation update
// @route   POST /api/user/likes
// @access  Private (Requires authentication via 'protect' middleware)
exports.addLike = async (req, res) => {
    const { movieId } = req.body; // Expecting { "movieId": 123 } in the request body
    const userId = req.user.id;   // Get user ID attached by the 'protect' middleware

    // Validate input: Check if movieId is provided and is a number.
    if (movieId === undefined || typeof movieId !== 'number') {
        return res.status(400).json({ success: false, message: 'Please provide a valid movie ID (number).' });
    }

    try {
        // Find the user by ID and add the movieId to their 'likedMovies' array.
        // $addToSet prevents duplicate entries in the array.
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { likedMovies: movieId } },
            { new: true, runValidators: true } // Options: return the updated document, run schema validations
        );

        // Handle case where user might not be found (e.g., ID mismatch, though unlikely after 'protect').
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // --- Trigger Recommendation Update ---
        // Call the async function to notify the Python service *after* successfully saving the like.
        // This runs in the background and does not delay the response to the frontend.
        triggerRecommendationUpdate(userId);
        // ------------------------------------

        // Send a success response back to the frontend immediately.
        res.status(200).json({
            success: true,
            message: 'Movie liked successfully and recommendation update triggered.',
            likedMovies: user.likedMovies // Return the user's full updated list of liked movies.
        });

    } catch (error) {
        // Catch potential database errors or other unexpected issues.
        console.error('Error in addLike controller:', error);
        res.status(500).json({ success: false, message: 'Server error while liking movie.' });
    }
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