const express = require('express');
const router = express.Router();

// Import the authentication middleware
const { protect } = require('../middleware/auth');

// Import controller functions (we will create these in the next step)
const {
    addLike,
    getLikes,
    getRecommendations,
    getUserProfile,
    addSeriesLike,
    removeMovieLike,
    removeSeriesLike
} = require('../controllers/userController'); // We'll create this controller file next

// Define the routes

// @desc    Add a movie to the user's liked list
// @route   POST /api/user/likes
// @access  Private (requires authentication)
router.post('/likes', protect, addLike);
router.delete('/likes/movie/:movieId', protect, removeMovieLike);

// @desc    Get the list of liked movie IDs for the logged-in user
// @route   GET /api/user/likes
// @access  Private
router.get('/likes', protect, getLikes);

// @desc    Get the list of recommended movie IDs for the logged-in user
// @route   GET /api/user/recommendations
// @access  Private
router.get('/recommendations', protect, getRecommendations);

// Profile
router.get('/profile', protect, getUserProfile);

// Likes Series
router.post('/likes/series', protect, addSeriesLike);
router.delete('/likes/series/:seriesId', protect, removeSeriesLike);

/* Optional: Route for removing a like
// @desc    Remove a movie from the user's liked list
// @route   DELETE /api/user/likes/:movieId  // Or maybe POST /api/user/unlike
// @access  Private
router.delete('/likes/:movieId', protect, removeLike); // We'll add removeLike controller later if needed
*/

module.exports = router;