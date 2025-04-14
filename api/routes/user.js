const express = require('express');
const router = express.Router();

// Import the authentication middleware
const { protect } = require('../middleware/auth');

// Import controller functions
// Make sure ONLY functions that actually exist in userController.js AND are needed right now are listed here.
const {
    addLike,            // Exists
    getLikes,           // Exists (and modified)
    getRecommendations, // Exists
    // getUserProfile,     // DOES NOT EXIST YET - Keep Commented Out
    addSeriesLike,      // Exists (newly added)
    // removeMovieLike,    // DOES NOT EXIST YET - Keep Commented Out
    // removeSeriesLike    // DOES NOT EXIST YET - Keep Commented Out

    // Important: Also make sure registerUser and loginUser are imported if they are in userController.js
    // registerUser, // Example - uncomment if needed for routes below
    // loginUser,    // Example - uncomment if needed for routes below

} = require('../controllers/userController');

// === Public Auth Routes (Assuming these are defined elsewhere or add imports if needed) ===
// router.post('/register', registerUser); // Example - uncomment if needed
// router.post('/login', loginUser);       // Example - uncomment if needed


// === Protected User Routes ===

// --- Getting Data ---

// Get Recommendations (Existing & Working)
router.get('/recommendations', protect, getRecommendations);

// Get All Likes (Movies & Series) (Existing Route, Modified Controller - Working)
router.get('/likes', protect, getLikes);

// Get User Profile (NOT IMPLEMENTED YET)
// router.get('/profile', protect, getUserProfile); // <<< COMMENT OUT THIS LINE


// --- Adding Likes ---

// Add Movie Like (Existing & Working)
router.post('/likes', protect, addLike);

// Add Series Like (New & Working)
router.post('/likes/series', protect, addSeriesLike);


// --- Removing Likes (NOT IMPLEMENTED YET) ---

// Remove Movie Like
// router.delete('/likes/movie/:movieId', protect, removeMovieLike); // <<< COMMENT OUT THIS LINE

// Remove Series Like
// router.delete('/likes/series/:seriesId', protect, removeSeriesLike); // <<< COMMENT OUT THIS LINE


module.exports = router;