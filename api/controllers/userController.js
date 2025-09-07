// api/controllers/userController.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const fetch = require('node-fetch'); // This stays for the TMDB calls
require('dotenv').config();

// --- DynamoDB Client Setup ---
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);
const TableName = 'BingflixUsers';

// --- NOTE: We will replace this with SQS in the next phase. ---
// For now, we'll keep the direct invoke logic but it won't work until the Python Lambda is deployed.
// This is just a placeholder.
const triggerRecommendationUpdate = (userEmail) => {
  console.log(`Placeholder: Triggering recommendation update for user: ${userEmail}`);
  // In the next phase, this will become an SQS message send.
};

// @desc    Add a movie to the user's liked list
exports.addLike = async (req, res) => {
  const { movieId } = req.body;
  const userEmail = req.user.email; // From our 'protect' middleware

  if (movieId === undefined || typeof movieId !== 'number') {
    return res.status(400).json({ success: false, message: 'Please provide a valid movie ID (number).' });
  }

  try {
    // DynamoDB's way to add an item to a list (if it doesn't exist)
    // This is equivalent to Mongoose's $addToSet
    const updateExpression = "ADD likedMovies :movie";
    const expressionAttributeValues = {
      ":movie": new Set([movieId]), // We use a Set to ensure uniqueness
    };

    const updateCommand = new UpdateCommand({
      TableName,
      Key: { email: userEmail },
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "UPDATED_NEW", // Get the updated attributes back
    });

    const { Attributes } = await docClient.send(updateCommand);

    // Trigger the (placeholder) update
    triggerRecommendationUpdate(userEmail);

    res.status(200).json({
      success: true,
      message: 'Movie liked successfully. Recommendation update initiated.',
      likedMovies: Array.from(Attributes.likedMovies), // Convert Set back to Array
    });

  } catch (error) {
    console.error('Error in addLike controller:', error);
    res.status(500).json({ success: false, message: 'Server error while liking movie' });
  }
};

// @desc    Add a series to the user's liked list
exports.addSeriesLike = async (req, res) => {
  const { seriesId } = req.body;
  const userEmail = req.user.email;

  if (!seriesId || typeof seriesId !== 'number') {
    return res.status(400).json({ message: 'Valid seriesId is required.' });
  }

  try {
    const updateCommand = new UpdateCommand({
      TableName,
      Key: { email: userEmail },
      UpdateExpression: "ADD likedSeries :series",
      ExpressionAttributeValues: {
        ":series": new Set([seriesId]),
      },
      ReturnValues: "UPDATED_NEW",
    });

    const { Attributes } = await docClient.send(updateCommand);

    res.status(200).json({
      success: true,
      message: 'Series added to likes',
      likedSeries: Array.from(Attributes.likedSeries),
    });

  } catch (error) {
    console.error('[API] Error in addSeriesLike controller:', error);
    res.status(500).json({ message: 'Server error adding series like' });
  }
};

// @desc    Get the lists of liked movies and series for the user
exports.getLikes = async (req, res) => {
  const userEmail = req.user.email;
  try {
    const getCommand = new GetCommand({
      TableName,
      Key: { email: userEmail },
      // Request only the specific attributes we need to save on read costs
      ProjectionExpression: "likedMovies, likedSeries",
    });
    const { Item } = await docClient.send(getCommand);

    if (!Item) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      likedMovies: Array.from(Item.likedMovies || []),
      likedSeries: Array.from(Item.likedSeries || []),
    });

  } catch (error) {
    console.error('[API] Error in getLikes controller:', error);
    res.status(500).json({ message: 'Server error fetching likes' });
  }
};


// @desc    Get the list of recommended movie details
// NOTE: This function's logic for fetching from TMDB remains the same.
// Only the initial step of getting the user's recommendation IDs changes.
exports.getRecommendations = async (req, res) => {
  const userEmail = req.user.email;
  try {
    // 1. Fetch user document with only recommendedMovies field from DynamoDB
    const getCommand = new GetCommand({
        TableName,
        Key: { email: userEmail },
        ProjectionExpression: "recommendedMovies"
    });
    const { Item } = await docClient.send(getCommand);

    if (!Item) {
        return res.status(404).json({ message: 'User not found' });
    }

    const movieIds = Item.recommendedMovies ? Array.from(Item.recommendedMovies) : [];

    // 2. Check if there are any recommended movie IDs
    if (movieIds.length === 0) {
        return res.status(200).json({ recommendations: [] });
    }

    // 3. Fetch details for each movie ID from TMDB (THIS LOGIC IS UNCHANGED)
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ message: 'Server configuration error: TMDB API key missing.' });
    }

    const movieDetailsPromises = movieIds.map(async (movieId) => {
        const url = `https://api.themoviedb.org/3/movie/${movieId}?api_key=${apiKey}&language=en-US`;
        try {
            const tmdbResponse = await fetch(url);
            if (!tmdbResponse.ok) {
                console.error(`[API] TMDB API error for movie ${movieId}: ${tmdbResponse.status}`);
                return null;
            }
            const movieData = await tmdbResponse.json();
            return {
                id: movieData.id,
                title: movieData.title,
                overview: movieData.overview,
                poster_path: movieData.poster_path,
                vote_average: movieData.vote_average,
            };
        } catch (fetchError) {
            console.error(`[API] Network error getting details for movie ${movieId}:`, fetchError);
            return null;
        }
    });

    const resolvedMovieDetails = await Promise.all(movieDetailsPromises);
    const successfulMovieDetails = resolvedMovieDetails.filter(detail => detail !== null);
    res.status(200).json({ recommendations: successfulMovieDetails });

  } catch (error) {
      console.error('[API] Error in getRecommendations controller:', error);
      res.status(500).json({ message: 'Server error fetching recommendations' });
  }
};