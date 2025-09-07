# api/python/update_recommendations.py

import os
import requests
from flask import Flask, request, jsonify
import boto3  # AWS SDK for Python
from boto3.dynamodb.conditions import Key
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import pandas as pd
import numpy as np
import traceback

# --- Environment Setup ---
load_dotenv()

# AWS and TMDB configuration
AWS_REGION = os.environ.get('AWS_REGION', 'ap-south-1') # Default to your region
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
DYNAMODB_TABLE_NAME = 'BingflixUsers'

if not TMDB_API_KEY:
    print("ERROR: TMDB_API_KEY environment variable not set.")

# --- Flask App Initialization (will be replaced by Lambda handler later) ---
app = Flask(__name__)

# --- AWS DynamoDB Connection ---
try:
    # Boto3 will automatically use credentials from the environment
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    print("DynamoDB connected successfully.")
except Exception as e:
    print(f"ERROR: Could not connect to DynamoDB: {e}")
    table = None

# --- TMDB API Helpers (These functions do NOT need to change) ---
def get_movie_details(movie_id):
    # ... (This function is identical to your previous version)
    if not TMDB_API_KEY: return None
    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}&append_to_response=keywords"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        genres = [g['name'] for g in data.get('genres', [])]
        keywords = [k['name'] for k in data.get('keywords', {}).get('keywords', [])]
        overview = data.get('overview', '')
        soup = ' '.join(genres) + ' ' + ' '.join(keywords) + ' ' + overview
        return {'id': movie_id, 'title': data.get('title', ''), 'soup': soup}
    except requests.exceptions.RequestException as e:
        print(f"Error fetching TMDB data for movie {movie_id}: {e}")
        return None

def get_popular_movies(page=1):
    # ... (This function is identical to your previous version)
    if not TMDB_API_KEY: return []
    url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=en-US&page={page}"
    try:
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        return [movie['id'] for movie in data.get('results', [])]
    except requests.exceptions.RequestException as e:
        print(f"Error fetching popular movies from TMDB: {e}")
        return []

# --- Core Recommendation Logic (with DynamoDB changes) ---
def generate_recommendations(user_email_str):
    if not table:
        return False, "Database connection not available"

    try:
        # 1. Fetch User's Data from DynamoDB
        response = table.get_item(
            Key={'email': user_email_str.lower()},
            ProjectionExpression="likedMovies" # Only get the data we need
        )
        
        user_data = response.get('Item')
        if not user_data:
            print(f"User not found: {user_email_str}")
            return False, "User not found"

        # DynamoDB stores lists as Decimal types sometimes, ensure they are ints
        liked_movie_ids = [int(movie_id) for movie_id in user_data.get('likedMovies', [])]

        if not liked_movie_ids:
            print(f"User {user_email_str} has no liked movies. Clearing recommendations.")
            # Update the user item to have an empty list for recommendedMovies
            table.update_item(
                Key={'email': user_email_str.lower()},
                UpdateExpression="SET recommendedMovies = :empty_list",
                ExpressionAttributeValues={':empty_list': []}
            )
            return True, "User has no liked movies, recommendations cleared."
        
        # --- Steps 2 through 9 (Calculation) are IDENTICAL to your previous version ---
        # 2. Fetch Details for Liked Movies
        liked_movie_details = [d for d in (get_movie_details(mid) for mid in liked_movie_ids) if d]
        if not liked_movie_details:
            return False, "Could not fetch liked movie details."

        # 3. Fetch Candidate Movies
        candidate_movie_ids = get_popular_movies(page=1)
        candidate_movie_ids = [mid for mid in candidate_movie_ids if mid not in liked_movie_ids]
        if not candidate_movie_ids:
            return True, "No new candidate movies to recommend from."

        # 4. Fetch Details for Candidate Movies
        candidate_movie_details = [d for d in (get_movie_details(mid) for mid in candidate_movie_ids) if d]
        if not candidate_movie_details:
            return False, "Could not fetch candidate movie details."

        # 5. Combine and create DataFrame
        all_movie_details = liked_movie_details + candidate_movie_details
        if len(all_movie_details) < 2:
            return False, "Not enough movie data for comparison."
        df = pd.DataFrame(all_movie_details).drop_duplicates(subset='id').set_index('id')

        # 6. TF-IDF Vectorization
        tfidf = TfidfVectorizer(stop_words='english')
        df['soup'] = df['soup'].fillna('')
        tfidf_matrix = tfidf.fit_transform(df['soup'])

        # 7. Create User Profile Vector
        liked_indices = df.index.intersection(liked_movie_ids)
        if liked_indices.empty: return False, "Internal error processing liked movies."
        liked_vectors = tfidf_matrix[df.index.isin(liked_indices)]
        if liked_vectors.shape[0] == 0: return False, "Could not create profile from liked movies."
        user_profile_vector = np.mean(liked_vectors, axis=0)

        # 8. Calculate Cosine Similarity
        candidate_indices = df.index.intersection(candidate_movie_ids)
        if candidate_indices.empty: return True, "No valid candidates to compare."
        candidate_vectors = tfidf_matrix[df.index.isin(candidate_indices)]
        cosine_similarities = cosine_similarity(np.asarray(user_profile_vector), candidate_vectors)

        # 9. Rank and Select Top N
        sim_scores = sorted(list(zip(candidate_indices, cosine_similarities[0])), key=lambda x: x[1], reverse=True)
        top_n = 10
        recommended_ids = [int(movie_id) for movie_id, score in sim_scores[:top_n]]
        print(f"Generated recommendations for user {user_email_str}: {recommended_ids}")

        # 10. Store Recommendations in DynamoDB
        table.update_item(
            Key={'email': user_email_str.lower()},
            UpdateExpression="SET recommendedMovies = :rec_ids",
            ExpressionAttributeValues={':rec_ids': recommended_ids}
        )
        print(f"Stored recommendations for user {user_email_str} in database.")

        return True, "Recommendations generated successfully."

    except Exception as e:
        print(f"ERROR in generate_recommendations for user {user_email_str}: {e}\n{traceback.format_exc()}")
        return False, f"Server error: {e}"

# --- Flask Route (Temporary - will be replaced by Lambda handler) ---
@app.route("/api/python/update_recommendations", methods=["POST"])
def update_recommendations_endpoint():
    # ... (This logic is fine for now, but will be removed in a later phase)
    if not table:
        return jsonify({"success": False, "message": "Database connection error"}), 500
    
    data = request.get_json()
    if not data or 'userId' not in data:
        # Note: We are getting email now, not userId (_id). Let's accept 'email'.
        user_identifier = data.get('email')
        if not user_identifier:
            return jsonify({"success": False, "message": "Missing 'email' in request body"}), 400
    else:
        # For backward compatibility if the old key is sent
        user_identifier = data.get('userId') or data.get('email')

    print(f"Processing recommendations for user: {user_identifier}")
    success, message = generate_recommendations(user_identifier)

    if success:
        return jsonify({"success": True, "message": message})
    else:
        status_code = 404 if "User not found" in message else 500
        return jsonify({"success": False, "message": message}), status_code

@app.route("/api/python/ping")
def ping():
    return "Python recommendation service is alive!"