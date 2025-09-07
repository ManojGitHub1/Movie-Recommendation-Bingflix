// api/controllers/authController.js
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// --- DynamoDB Client Setup ---
// The SDK will automatically use credentials from your environment (local .aws folder or IAM role in Lambda)
const client = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(client);
const TableName = 'BingflixUsers'; // The name of the table we created

// @desc    Register a new user
exports.register = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password || password.length < 6) {
    return res.status(400).json({ success: false, message: 'Please provide a valid email and a password of at least 6 characters.' });
  }

  try {
    // 1. Check if user already exists using a Get operation
    const getCommand = new GetCommand({
      TableName,
      Key: { email: email.toLowerCase() }, // DynamoDB keys are case-sensitive
    });
    const { Item } = await docClient.send(getCommand);

    if (Item) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    // 2. Hash the password with bcryptjs
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 3. Prepare the new user object for DynamoDB
    const newUserItem = {
      email: email.toLowerCase(),
      password: hashedPassword,
      createdAt: new Date().toISOString(),
      likedMovies: [], // DynamoDB calls this a List
      likedSeries: [],
      recommendedMovies: [],
    };

    // 4. Save the new user item using a Put operation
    const putCommand = new PutCommand({
      TableName,
      Item: newUserItem,
    });
    await docClient.send(putCommand);

    // 5. Create a JWT. The payload now contains the user's email, which is our unique ID.
    const token = jwt.sign({ email: newUserItem.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(201).json({ success: true, token, email: newUserItem.email });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ success: false, message: 'Server Error during registration' });
  }
};

// @desc    Login user
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Please provide email and password' });
  }

  try {
    // 1. Fetch the user from DynamoDB by their email (the partition key)
    const getCommand = new GetCommand({
      TableName,
      Key: { email: email.toLowerCase() },
    });
    const { Item } = await docClient.send(getCommand);

    // 2. If no item was found, or if password doesn't match, send invalid credentials
    if (!Item) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, Item.password);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // 3. Create a JWT
    const token = jwt.sign({ email: Item.email }, process.env.JWT_SECRET, {
      expiresIn: '1h',
    });

    res.status(200).json({ success: true, token, email: Item.email });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, message: 'Server Error during login' });
  }
};