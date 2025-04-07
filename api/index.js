const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// Load env vars
dotenv.config(); // Load from .env file in the api directory

// Connect to database
connectDB();

const app = express();

// Body parser middleware
app.use(express.json());

// Enable CORS - Configure appropriately for production
// For development, allow all origins. For production, restrict it.
app.use(cors());
// Example for production:
// const allowedOrigins = ['https://your-vercel-frontend-url.vercel.app'];
// app.use(cors({
//   origin: function (origin, callback) {
//     if (!origin || allowedOrigins.indexOf(origin) !== -1) {
//       callback(null, true)
//     } else {
//       callback(new Error('Not allowed by CORS'))
//     }
//   }
// }));


// Mount routers
app.use('/api/auth', require('./routes/auth'));
// Mount user-specific routes under /api/user
app.use('/api/user', require('./routes/user'));

// Export the app for Vercel
module.exports = app;
