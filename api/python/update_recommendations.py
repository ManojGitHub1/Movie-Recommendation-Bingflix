
import os
import requests # For TMDB API calls
from flask import Flask, request, jsonify
from pymongo import MongoClient
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np # For numerical operations

# --- Environment Setup ---
# Load environment variables from .env file for local development
# Vercel will use its own environment variable settings in deployment
load_dotenv()

MONGO_URI = os.environ.get('MONGO_URI')
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
# Fallback for Vercel URL if needed (though usually not for internal calls)
VERCEL_URL = os.environ.get('VERCEL_URL', 'http://localhost:3000')

if not MONGO_URI:
    print("ERROR: MONGO_URI environment variable not set.")
    # Potentially exit or handle error, Flask might fail later anyway
if not TMDB_API_KEY:
    print("ERROR: TMDB_API_KEY environment variable not set.")
    # Potentially exit or handle error

# --- Flask App Initialization ---
# Vercel expects the Flask app object to be named 'app' by default
app = Flask(__name__)

# --- Database Connection ---
# It's better practice to establish the connection outside the request handler
# but manage it properly (e.g., connection pooling).
# For simplicity here, we might reconnect or use a global client.
# Let's use a global client approach for this simple case.
try:
    client = MongoClient(MONGO_URI)
    db = client.get_database() # Get default DB from URI, or specify name: client['your_db_name']
    users_collection = db['users'] # Assuming your collection is named 'users'
    print("MongoDB connected successfully.")
except Exception as e:
    print(f"ERROR: Could not connect to MongoDB: {e}")
    client = None # Indicate connection failure

# --- TMDB API Helper ---
def get_movie_details(movie_id):
    """Fetches details (genres, keywords, overview) for a movie from TMDB."""
    if not TMDB_API_KEY:
        print("TMDB API Key not configured.")
        return None

    # Fetch main details + keywords in one call using append_to_response
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}&append_to_response=keywords"
    try:
        response = requests.get(url)
        response.raise_for_status() # Raise an exception for bad status codes (4xx or 5xx)
        data = response.json()

        # Extract relevant fields
        genres = [genre['name'] for genre in data.get('genres', [])]
        keywords = [keyword['name'] for keyword in data.get('keywords', {}).get('keywords', [])]
        overview = data.get('overview', '')
        title = data.get('title', '') # Keep title for context

        # Combine into a single text soup for TF-IDF
        # Repeat genres/keywords slightly to give them more weight? (Optional)
        soup = ' '.join(genres) + ' ' + ' '.join(keywords) + ' ' + overview

        return {
            'id': movie_id,
            'title': title,
            'soup': soup
        }
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDB data for movie {movie_id}: {e}")
        return None
    except Exception as e:
        print(f"Error processing TMDB data for movie {movie_id}: {e}")
        return None

def get_popular_movies(page=1):
    """Fetches a page of popular movies from TMDB as potential candidates."""
    if not TMDB_API_KEY:
        print("TMDB API Key not configured.")
        return []

    url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=en-US&page={page}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        # Return just the IDs for now, details will be fetched if needed
        return [movie['id'] for movie in data.get('results', [])]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching popular movies from TMDB: {e}")
        return []


# --- Recommendation Logic ---
def generate_recommendations(user_id_str):
    """The core function to generate and store recommendations for a user."""
    if not client:
        print("Database connection not available.")
        return False, "Database connection error"

    try:
        # 1. Fetch User's Liked Movies
        user_object_id = user_id_str # Assuming the ID from Node is already the correct string representation
        user_data = users_collection.find_one({'_id': user_object_id}) # Needs ObjectId conversion if not string

        # --- Handle ObjectId conversion if needed ---
        # If Node.js sends the plain string version of ObjectId, convert it:
        from bson import ObjectId
        try:
             user_object_id = ObjectId(user_id_str)
             user_data = users_collection.find_one({'_id': user_object_id})
        except Exception as oid_error:
             print(f"Could not convert user_id '{user_id_str}' to ObjectId: {oid_error}")
             return False, "Invalid user ID format"
        # --- End ObjectId handling ---


        if not user_data:
            print(f"User not found: {user_id_str}")
            return False, "User not found"

        liked_movie_ids = user_data.get('likedMovies', [])
        if not liked_movie_ids:
            print(f"User {user_id_str} has no liked movies.")
            # Clear recommendations or do nothing? Let's clear them.
            users_collection.update_one(
                {'_id': user_object_id},
                {'$set': {'recommendedMovies': []}}
            )
            return True, "User has no liked movies, recommendations cleared."

        # 2. Fetch Details for Liked Movies
        liked_movie_details = []
        for movie_id in liked_movie_ids:
            details = get_movie_details(movie_id)
            if details:
                liked_movie_details.append(details)

        if not liked_movie_details:
             print(f"Could not fetch details for any liked movies for user {user_id_str}.")
             # Maybe don't clear recommendations in this case? Or log error?
             return False, "Could not fetch liked movie details."


        # 3. Fetch Candidate Movies (e.g., Popular Movies)
        # Fetching one page (~20 movies) as a starting point
        candidate_movie_ids = get_popular_movies(page=1)
        # Add more pages or other sources (e.g., top rated) for a larger pool if desired
        # candidate_movie_ids.extend(get_popular_movies(page=2))

        # Filter out candidates that are already liked by the user
        candidate_movie_ids = [m_id for m_id in candidate_movie_ids if m_id not in liked_movie_ids]

        if not candidate_movie_ids:
             print("No candidate movies found after filtering liked movies.")
             # Keep existing recommendations or clear? Maybe keep.
             return True, "No new candidate movies to recommend from."


        # 4. Fetch Details for Candidate Movies
        candidate_movie_details = []
        for movie_id in candidate_movie_ids:
            details = get_movie_details(movie_id)
            if details:
                candidate_movie_details.append(details)

        if not candidate_movie_details:
            print("Could not fetch details for any candidate movies.")
            return False, "Could not fetch candidate movie details."

        # 5. Combine liked and candidate movies
        all_movie_details_list = liked_movie_details + candidate_movie_details

        # Ensure uniqueness based on 'id'
        seen_ids = set()
        unique_movie_details_list = []
        movie_id_map = {} # Map index in the list to movie ID
        movie_soups = []  # List to store the 'soup' text for TF-IDF
        all_movie_ids_ordered = [] # Keep track of movie IDs in order

        for idx, movie_data in enumerate(all_movie_details_list):
            movie_id = movie_data.get('id')
            if movie_id not in seen_ids:
                seen_ids.add(movie_id)
                unique_movie_details_list.append(movie_data)
                movie_id_map[idx] = movie_id # Store original index to ID mapping if needed (maybe not here)
                movie_soups.append(movie_data.get('soup', '')) # Get soup, default to empty string
                all_movie_ids_ordered.append(movie_id) # Store ID in the order they appear in movie_soups


        if len(unique_movie_details_list) < 2: # Need at least two movies to compare
            print("Not enough unique movie data (liked + candidates) to calculate similarities.")
            return False, "Not enough unique movie data for comparison."


        # 6. Feature Extraction (TF-IDF)
        tfidf = TfidfVectorizer(stop_words='english')
        tfidf_matrix = tfidf.fit_transform(movie_soups) # Pass the list of 'soup' strings

        # 7. Calculate User Profile Vector
        # Find the indices corresponding to the liked movies in our ordered list
        liked_indices_in_list = [i for i, movie_id in enumerate(all_movie_ids_ordered) if movie_id in liked_movie_ids]

        if not liked_indices_in_list:
            print("Internal error: Liked movie indices not found.")
            return False, "Internal error processing liked movies."

        # Select rows from tfidf_matrix based on these indices
        liked_vectors = tfidf_matrix[liked_indices_in_list]

        if liked_vectors.shape[0] == 0:
            print(f"No valid TF-IDF vectors found for liked movies of user {user_id_str}.")
            return False, "Could not create profile from liked movies."

        # Calculate the mean vector (works directly on sparse matrix)
        user_profile_vector = liked_vectors.mean(axis=0)


        # 8. Calculate Cosine Similarity
        # Find indices and vectors for candidate movies
        candidate_indices_in_list = [i for i, movie_id in enumerate(all_movie_ids_ordered) if movie_id in candidate_movie_ids]

        if not candidate_indices_in_list:
            print("No candidate movies found in the processed list.")
            return True, "No valid candidates to compare."

        candidate_vectors = tfidf_matrix[candidate_indices_in_list]

        # Get the actual IDs corresponding to these candidate vectors/indices
        candidate_ids_ordered = [all_movie_ids_ordered[i] for i in candidate_indices_in_list]


        # Calculate similarity (user_profile is already a row vector after .mean(axis=0))
        # Need to ensure user_profile_vector is treated as a row matrix (1, num_features)
        # It should be, but explicit reshape might be safer if issues arise.
        # user_profile_vector_dense = np.asarray(user_profile_vector).reshape(1, -1) # If needed

        cosine_similarities = cosine_similarity(user_profile_vector, candidate_vectors)

        # cosine_similarities[0] contains the scores for each candidate
        # Pair the scores with the actual candidate IDs
        sim_scores = list(zip(candidate_ids_ordered, cosine_similarities[0]))
    
    
        # 9. Rank and Select Top N Recommendations
        sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True) # Sort by score desc

        # Get the top N (e.g., 10) recommended movie IDs
        top_n = 10
        recommended_ids = [int(movie_id) for movie_id, score in sim_scores[:top_n]] # Ensure IDs are integers

        print(f"Generated recommendations for user {user_id_str}: {recommended_ids}")

        # 10. Store Recommendations in MongoDB
        users_collection.update_one(
            {'_id': user_object_id},
            {'$set': {'recommendedMovies': recommended_ids}}
        )
        print(f"Stored recommendations for user {user_id_str} in database.")

        return True, "Recommendations generated successfully."

    except Exception as e:
        # Log the full error for debugging
        import traceback
        print(f"ERROR in generate_recommendations for user {user_id_str}: {e}\n{traceback.format_exc()}")
        return False, f"Server error: {e}"


# --- Flask Route Definition ---
# This is the endpoint that Node.js will call
@app.route("/api/python/update_recommendations", methods=["POST"])
def update_recommendations_endpoint():
    """
    Flask endpoint to trigger recommendation generation for a user.
    Expects JSON body: { "userId": "..." }
    """
    if not client:
         # Return 500 if DB connection failed on startup
         return jsonify({"success": False, "message": "Database connection error"}), 500

    print("Received request to /api/python/update_recommendations") # Log request entry
    if not request.is_json:
        print("Request body is not JSON")
        return jsonify({"success": False, "message": "Request body must be JSON"}), 400

    data = request.get_json()
    user_id = data.get('userId')

    if not user_id:
        print("userId not found in request body")
        return jsonify({"success": False, "message": "Missing 'userId' in request body"}), 400

    print(f"Processing recommendations for userId: {user_id}")

    # Call the main recommendation logic
    success, message = generate_recommendations(user_id)

    if success:
        print(f"Successfully processed recommendations for {user_id}: {message}")
        return jsonify({"success": True, "message": message})
    else:
        print(f"Failed to process recommendations for {user_id}: {message}")
        # Return 500 for internal errors, 404 if user not found? Adjust as needed.
        status_code = 404 if message == "User not found" else 500
        return jsonify({"success": False, "message": message}), status_code

# --- Optional: Add a simple root route for testing ---
@app.route("/api/python/ping")
def ping():
     return "Python recommendation service is alive!"


# Vercel runs the script, so we don't need the __main__ block
# for running locally with `python api/python/update_recommendations.py`
# if __name__ == "__main__":
#     app.run(debug=True, port=5001) # Run on a different port than Node locally