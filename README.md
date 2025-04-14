# Bingflix - Movie & Series Recommendation Web Application

[![Deployment](https://img.shields.io/badge/deployment-Vercel%20%26%20GCP-blue)](YOUR_VERCEL_DEPLOYMENT_LINK_HERE) <!-- Optional: Add a real deployment status badge if you set one up -->

Welcome to Bingflix! This project transforms a standard movie browsing website into a personalized experience by integrating a machine learning-based recommendation system. Users can sign up, log in, browse movies and series (powered by the TMDB API), "Like" content they enjoy, and receive personalized recommendations based on their tastes.

**Live Demo:** [Check out the deployed application here!](YOUR_VERCEL_DEPLOYMENT_LINK_HERE) <!-- MAKE SURE TO REPLACE THIS -->

## Features

*   **User Authentication:** Secure Sign Up and Log In functionality using JWT (JSON Web Tokens).
*   **Movie/Series Browsing:** Explore details about movies and series fetched from The Movie Database (TMDB).
*   **Embedded Video Players:** Watch content directly using players like Vidsrc, SmashyStream, etc. (Inherited feature).
*   **Personalized Likes:** Logged-in users can "Like" movies and series. Liked items are stored persistently per user in the database.
*   **Content-Based Recommendations:** Receive movie recommendations generated based on the content (genres, keywords, overview) of movies you have previously liked.
*   **Asynchronous Recommendation Updates:** The recommendation engine updates in the background shortly after a user likes a new movie, ensuring fresh suggestions without blocking user interaction.
*   **Dedicated User Space:** View your personalized recommendations, liked movies, and liked series on a dedicated page.
*   **(In Progress):** Unlike functionality, User Profile Page.

## Architecture Overview

This project utilizes a hybrid architecture combining a static frontend approach with dynamic backend services:

1.  **Frontend (Client-Side):**
    *   Built with standard **HTML, CSS, and JavaScript**.
    *   Handles UI rendering, user interactions (login forms, like buttons).
    *   Communicates with the Backend API via `fetch` requests.
    *   Stores JWT authentication token in `localStorage`.
    *   Hosted on **Vercel**.

2.  **Backend API (Server-Side):**
    *   Built with **Node.js** and the **Express.js** framework.
    *   Runs as **Vercel Serverless Functions**.
    *   Handles user registration, login (password hashing via bcrypt, JWT generation).
    *   Manages user data (likes, fetching recommendation IDs) via **Mongoose** ODM interacting with MongoDB.
    *   Provides protected API endpoints for authenticated actions (`/api/user/...`).
    *   **Triggers** the external ML service asynchronously when a user likes a movie.

3.  **ML Recommendation Service (Server-Side):**
    *   Built with **Python** and the **Flask** framework.
    *   Containerized using **Docker**.
    *   Hosted on **Google Cloud Run (GCP)**.
    *   Receives triggers (containing `userId`) from the Node.js Backend API.
    *   Fetches user's liked movie IDs from MongoDB (**Pymongo**).
    *   Fetches movie details (genres, keywords, overview) from **TMDB API**.
    *   Performs **Content-Based Filtering**:
        *   Calculates TF-IDF vectors for movie textual data (**Scikit-learn**).
        *   Builds a user profile based on liked movies.
        *   Computes Cosine Similarity between user profile and candidate movies.
        *   Selects top N recommendations.
    *   Saves the list of recommended movie IDs back to the user's document in MongoDB.

4.  **Database:**
    *   **MongoDB Atlas** (Cloud-hosted NoSQL database).
    *   Stores user credentials (hashed passwords), liked movie IDs, liked series IDs, and generated recommended movie IDs.

5.  **External APIs:**
    *   **The Movie Database (TMDB):** Source for all movie and series metadata (details, posters, etc.).


## Technology Stack

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+)
*   **Backend API:** Node.js, Express.js, Mongoose, JWT (jsonwebtoken), node-fetch, bcryptjs
*   **ML Service:** Python 3.12, Flask, Gunicorn, Pymongo, Requests, Scikit-learn, Pandas, Numpy, python-dotenv
*   **Database:** MongoDB Atlas
*   **External APIs:** TMDB API
*   **Deployment:**
    *   Frontend & Node.js API: Vercel
    *   Python ML Service: Google Cloud Run (GCP)
*   **Containerization:** Docker
*   **Container Registry:** Google Artifact Registry (GCP)
*   **Cloud Build:** Google Cloud Build (for automated Docker image builds - optional but recommended)

## Key Challenges & Learning Experiences

*   **Static Site Limitations:** Realized the initial static HTML/CSS/JS site couldn't handle user state, necessitating the backend API and database for login and likes.
*   **Authentication:** Implemented secure JWT-based authentication, including password hashing and middleware for protecting routes.
*   **State Management:** Migrated "Likes" from browser `localStorage` to MongoDB to enable backend processing and persistence across devices.
*   **Vercel Serverless Function Size Limits:** Encountered Vercel's Hobby plan size limitations (50MB unzipped) when trying to deploy the Python ML service with Scikit-learn and Pandas. This was a major blocker.
*   **Pivoting to Google Cloud Run:** Made the strategic decision to decouple the ML service and host it on GCP Cloud Run using Docker. This involved:
    *   Learning Docker basics (Dockerfile creation, building, pushing images).
    *   Setting up GCP services (Cloud Run, Artifact Registry).
    *   Configuring environment variables securely in Cloud Run.
    *   Debugging container startup issues (CMD path errors, `$PORT` variable substitution).
*   **Asynchronous Processing:** Designed the recommendation update to be asynchronous (fire-and-forget) using `node-fetch` from the Node.js API to the Python service. This prevents blocking the user response while the potentially long-running ML task executes.
*   **Debugging Distributed Systems:** Learned to trace requests and troubleshoot issues across multiple independent services (Frontend -> Vercel API -> Cloud Run ML -> MongoDB), relying heavily on logging in each component. Identified and resolved timing issues between Vercel function timeouts and Cloud Run cold starts.
*   **Cloud Deployment:** Gained hands-on experience deploying different application types (Node.js serverless, Python container) to different cloud platforms (Vercel, GCP).

## Setup and Local Development

**Prerequisites:**

*   Node.js & npm (or yarn)
*   Python 3.10+ & pip
*   Docker Desktop
*   Git
*   TMDB API Key (Get one from [themoviedb.org](https://www.themoviedb.org/))
*   MongoDB Atlas Account & Connection URI (Get one from [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas))

**Steps:**

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
    cd YOUR_REPO_NAME
    ```

2.  **Backend API Setup (Vercel / Node.js):**
    *   Navigate to the `api` directory (if your Node code is there, adjust if needed).
    *   Create a `.env` file in the `api` directory (or root, depending on your setup) with:
        ```dotenv
        MONGO_URI=YOUR_MONGODB_CONNECTION_URI
        JWT_SECRET=YOUR_SUPER_SECRET_JWT_KEY
        TMDB_API_KEY=YOUR_TMDB_API_KEY
        # Add the URL for your *locally running* Python service if testing end-to-end locally
        PYTHON_ML_SERVICE_URL=http://localhost:8080/api/python/update_recommendations
        ```
    *   Install dependencies:
        ```bash
        # If in the api directory:
        npm install
        # Or from the root directory if package.json is there:
        # npm install
        ```
    *   Run the Node.js server locally (often using `vercel dev` or `npm run dev` depending on your `package.json`):
        ```bash
        vercel dev
        # or
        # npm run start # Or whatever your start script is
        ```

3.  **ML Service Setup (GCP Cloud Run / Python):**
    *   Navigate to the `api/python` directory (adjust if needed).
    *   Create a `.env` file in this directory with:
        ```dotenv
        MONGO_URI=YOUR_MONGODB_CONNECTION_URI
        TMDB_API_KEY=YOUR_TMDB_API_KEY
        PORT=8080 # Port the local Flask server will use
        ```
    *   Install Python dependencies:
        ```bash
        pip install -r requirements.txt
        ```
    *   Run the Flask server locally:
        ```bash
        # Make sure your main script is named update_recommendations.py and app instance is 'app'
        # If using Flask's built-in server (for development):
        flask --app api.python.update_recommendations run --port 8080 --debug
        # Or using Gunicorn (closer to production):
        # gunicorn --bind "0.0.0.0:8080" api.python.update_recommendations:app
        ```
    *   *Alternatively, run using Docker:*
        ```bash
        # Build the image (run from root directory)
        docker build -t bingflix-ml-local -f api/python/Dockerfile .
        # Run the container, passing environment variables
        docker run -p 8080:8080 --env-file api/python/.env bingflix-ml-local
        ```

4.  **Frontend Setup:**
    *   Open the main `index.html` file in your browser (usually works directly if backend API is running).
    *   Ensure any `fetch` calls in your JavaScript point to the correct local backend API URL (e.g., `http://localhost:3000/api/...` if using `vercel dev`, or check the port).

## Deployment

*   **Frontend & Node.js API:** Deployed via Vercel. Connect your Git repository to a Vercel project. Configure necessary environment variables (`MONGO_URI`, `JWT_SECRET`, `TMDB_API_KEY`, `PYTHON_ML_SERVICE_URL` - pointing to the *live* Cloud Run URL) in the Vercel project settings. The `vercel.json` file configures builds and routing.
*   **Python ML Service:** Deployed via Google Cloud Run.
    1.  Build the Docker image using the `api/python/Dockerfile`.
    2.  Push the image to Google Artifact Registry.
    3.  Create a Cloud Run service, selecting the pushed image.
    4.  Configure the container port (e.g., 8080).
    5.  Set environment variables (`MONGO_URI`, `TMDB_API_KEY`, `PORT`) in the Cloud Run service configuration.
    6.  Ensure appropriate memory/CPU settings and allow unauthenticated invocations (if desired, or set up authentication).

## Future Enhancements

*   Implement "Unlike" functionality for movies and series.
*   Create a dedicated User Profile page showing details and like counts.
*   Refine the UI/UX of the recommendations and likes page.
*   Explore Collaborative Filtering or Hybrid recommendation approaches.
*   Add pagination or infinite scrolling for large lists.
*   Improve error handling and user feedback.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request or open an Issue. (Optional: Add more specific contribution guidelines if desired).
