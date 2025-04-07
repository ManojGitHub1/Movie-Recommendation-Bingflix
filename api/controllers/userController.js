// api/controllers/userController.js
const User = require('../models/User');
const fetch = require('node-fetch'); // Using node-fetch for async trigger
require('dotenv').config();

// Helper function to trigger Python recommendation update (we'll refine this later)
// It sends a POST request to the Python serverless function endpoint.
// IMPORTANT: Replace 'YOUR_VERCEL_DEPLOYMENT_URL' with your actual Vercel URL
const triggerRecommendationUpdate = async (userId) => {
    // Construct the URL to your Python serverless function
    // Make sure the Vercel URL and the Python function path are correct
    const pythonApiUrl = `${process.env.VERCEL_URL || 'http://localhost:3000'}/api/python/update_recommendations`; // Adjust path if needed

    console.log(`Triggering recommendation update for user ${userId} at ${pythonApiUrl}`);

    try {
        // Use node-fetch or another HTTP client to send a POST request
        // Send the userId in the body
        // We don't wait for the response ('fire-and-forget')
        fetch(pythonApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Optional: Add a secret header for basic security between services
                // 'X-Internal-Secret': process.env.INTERNAL_SECRET_KEY
            },
            body: JSON.stringify({ userId: userId })
        });
        // No await here - we want the Node.js function to return quickly

        console.log(`Recommendation update triggered for user ${userId}.`);
        // Note: This only confirms the request was sent, not that the Python function succeeded.
        // More robust solutions might involve queues or checking the Python function's logs.

    } catch (error) {
        // Log the error, but don't block the main Node.js response
        console.error(`Error triggering recommendation update for user ${userId}:`, error);
        // You might want more sophisticated error logging/handling here in production
    }
};


// @desc    Add a movie to the user's liked list
// @route   POST /api/user/likes
// @access  Private
exports.addLike = async (req, res) => {
    const { movieId } = req.body; // Expecting { "movieId": 123 } in the request body
    const userId = req.user.id; // Get user ID from the protect middleware

    // Basic validation
    if (!movieId || typeof movieId !== 'number') { // Ensure movieId is provided and is a number
        return res.status(400).json({ success: false, message: 'Please provide a valid movie ID (number).' });
    }

    try {
        // Find the user and add the movieId to their likedMovies array
        // Using $addToSet ensures the ID is only added if it doesn't already exist
        const user = await User.findByIdAndUpdate(
            userId,
            { $addToSet: { likedMovies: movieId } },
            { new: true, runValidators: true } // return the updated document
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // *** Trigger the recommendation update asynchronously ***
        triggerRecommendationUpdate(userId);

        // Send success response back to the frontend *immediately*
        res.status(200).json({
            success: true,
            message: 'Movie liked successfully',
            likedMovies: user.likedMovies // Optionally return the updated list
        });

    } catch (error) {
        console.error('Error liking movie:', error);
        res.status(500).json({ success: false, message: 'Server error while liking movie' });
    }
};

// @desc    Get the list of liked movie IDs for the logged-in user
// @route   GET /api/user/likes
// @access  Private
exports.getLikes = async (req, res) => {
    const userId = req.user.id; // Get user ID from the protect middleware

    try {
        const user = await User.findById(userId).select('likedMovies'); // Only select the likedMovies field

        if (!user) {
            // This shouldn't happen if protect middleware works, but good practice
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({
            success: true,
            likedMovies: user.likedMovies || [] // Return the array (or empty array if null/undefined)
        });

    } catch (error) {
        console.error('Error fetching liked movies:', error);
        res.status(500).json({ success: false, message: 'Server error fetching liked movies' });
    }
};

// @desc    Get the list of recommended movies for the logged-in user
// @route   GET /api/user/recommendations
// @access  Private
exports.getRecommendations = async (req, res) => {
    const userId = req.user.id; // Get user ID from protect middleware

    try {
        const user = await User.findById(userId).select('recommendedMovies'); // Select the recommendations field

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const recommendedMovieIds = user.recommendedMovies || [];

        // --- Enhancement: Fetch Movie Details from TMDB ---
        // In a real application, you would now take these IDs
        // and fetch the full movie details (title, poster_path, etc.)
        // from the TMDB API before sending the response.
        // For now, we'll just send the IDs. We will add TMDB fetching later.

        // Example placeholder for fetching details (replace with actual TMDB API call later)
        /*
        const detailedRecommendations = await Promise.all(recommendedMovieIds.map(async (id) => {
             // Replace with your actual TMDB API fetching logic
             // const movieDetails = await fetchTmdbDetails(id);
             // return movieDetails;
             return { id: id, title: `Movie ${id}`, poster_path: `/placeholder${id}.jpg` }; // Placeholder
        }));
        */

        res.status(200).json({
            success: true,
            // recommendations: detailedRecommendations // Send detailed info later
            recommendations: recommendedMovieIds // Send just IDs for now
        });

    } catch (error) {
        console.error('Error fetching recommendations:', error);
        res.status(500).json({ success: false, message: 'Server error fetching recommendations' });
    }
};


// Optional: If you added a DELETE route for unliking
/*
exports.removeLike = async (req, res) => {
    const { movieId } = req.params; // Get movieId from route parameters (e.g., /likes/123)
    const userId = req.user.id;

    // Convert movieId from string parameter to number for matching
    const movieIdNumber = parseInt(movieId, 10);
    if (isNaN(movieIdNumber)) {
         return res.status(400).json({ success: false, message: 'Invalid movie ID format.' });
    }

    try {
        const user = await User.findByIdAndUpdate(
            userId,
            { $pull: { likedMovies: movieIdNumber } }, // Use $pull to remove item from array
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        // Optional: Trigger recommendation update after unliking too?
        // triggerRecommendationUpdate(userId);

        res.status(200).json({
            success: true,
            message: 'Movie unliked successfully',
            likedMovies: user.likedMovies
        });

    } catch (error) {
        console.error('Error unliking movie:', error);
        res.status(500).json({ success: false, message: 'Server error while unliking movie' });
    }
};
*/