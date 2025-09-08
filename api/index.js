// api/index.js
const express = require('express');
const cors = require('cors');

// Load env vars for local development. In Lambda, they'll be set by our handler.
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();

// Body parser middleware
app.use(express.json());
app.use(cors());

// Mount routers
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user', require('./routes/user'));

// Check if we are running locally or in a serverless environment
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Server running locally on port ${PORT}`));
}

// Export the app for the serverless handler
// Trigger pipeline.
module.exports = app;