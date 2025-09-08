// api/controllers/userController.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { SQSClient, SendMessageCommand } = require("@aws-sdk/client-sqs");
const fetch = require('node-fetch');
require('dotenv').config();

// --- Service Clients Setup ---
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const TableName = 'BingflixUsers';
const QueueUrl = process.env.SQS_QUEUE_URL;

// --- SQS Message Sender Function ---
const triggerRecommendationUpdate = async (userEmail) => {
  if (!QueueUrl) {
    console.error("SQS_QUEUE_URL environment variable not set. Cannot queue recommendation task.");
    return;
  }
  
  console.log(`Queueing recommendation task for user: ${userEmail}`);
  
  const command = new SendMessageCommand({
    QueueUrl: QueueUrl,
    MessageBody: JSON.stringify({ email: userEmail }), 
  });

  try {
    await sqsClient.send(command);
    console.log("Successfully queued recommendation task.");
  } catch (error) {
    console.error("Error sending message to SQS:", error);
  }
};

// --- Controllers ---

// @desc    Add a movie to the user's liked list
exports.addLike = async (req, res) => {
  const { movieId } = req.body;
  const userEmail = req.user.email;

  if (movieId === undefined || typeof movieId !== 'number') {
    return res.status(400).json({ success: false, message: 'Please provide a valid movie ID.' });
  }

  try {
    // Step 1: Get the current user data to safely update the list
    const getCommand = new GetCommand({
      TableName,
      Key: { email: userEmail },
    });
    const { Item } = await docClient.send(getCommand);

    if (!Item) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Step 2: Update the likedMovies list in the code, ensuring no duplicates
    // Initialize with an empty array if the attribute doesn't exist yet
    const likedMovies = Item.likedMovies ? Array.from(Item.likedMovies) : [];
    if (!likedMovies.includes(movieId)) {
      likedMovies.push(movieId);
    }

    // Step 3: Write the updated list back to DynamoDB
    const updateCommand = new UpdateCommand({
      TableName,
      Key: { email: userEmail },
      UpdateExpression: "SET likedMovies = :movies",
      ExpressionAttributeValues: {
        ":movies": likedMovies,
      },
      ReturnValues: "UPDATED_NEW",
    });
    const { Attributes } = await docClient.send(updateCommand);

    // Trigger the recommendation update via SQS
    await triggerRecommendationUpdate(userEmail);

    res.status(200).json({
      success: true,
      message: 'Movie liked successfully. Recommendation update has been queued.',
      likedMovies: Attributes.likedMovies,
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
    // Step 1: Get the current user data
    const getCommand = new GetCommand({
      TableName,
      Key: { email: userEmail },
    });
    const { Item } = await docClient.send(getCommand);

    if (!Item) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Step 2: Update the likedSeries list in the code, ensuring no duplicates
    const likedSeries = Item.likedSeries ? Array.from(Item.likedSeries) : [];
    if (!likedSeries.includes(seriesId)) {
      likedSeries.push(seriesId);
    }

    // Step 3: Write the updated list back to DynamoDB
    const updateCommand = new UpdateCommand({
      TableName,
      Key: { email: userEmail },
      UpdateExpression: "SET likedSeries = :series",
      ExpressionAttributeValues: {
        ":series": likedSeries,
      },
      ReturnValues: "UPDATED_NEW",
    });
    const { Attributes } = await docClient.send(updateCommand);

    res.status(200).json({
      success: true,
      message: 'Series added to likes',
      likedSeries: Attributes.likedSeries,
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

    // 3. Fetch details for each movie ID from TMDB
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