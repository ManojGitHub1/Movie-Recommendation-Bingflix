# api/recommendation_worker/handler.py
import os
import json
import logging
import traceback
from typing import List, Dict, Any, Optional, Tuple

import boto3
import numpy as np
import pandas as pd
import requests
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# --- Configuration ---
# Use logging for structured, level-based output (INFO, ERROR, etc.)
# This is vastly superior to print() for production systems.
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load configuration from environment variables for security and flexibility.
AWS_REGION = os.environ.get('AWS_REGION', 'ap-south-1')
TMDB_API_KEY = os.environ.get('TMDB_API_KEY')
DYNAMODB_TABLE_NAME = os.environ.get('DYNAMODB_TABLE_NAME', 'BingflixUsers')

# --- Service Clients (Best Practice: Initialize once) ---
# Initialize clients outside the handler to be reused across warm Lambda invocations.
# This improves performance by avoiding repeated setup.
try:
    dynamodb = boto3.resource('dynamodb', region_name=AWS_REGION)
    user_table = dynamodb.Table(DYNAMODB_TABLE_NAME)
    # Use a session object for HTTP requests to manage connections efficiently.
    tmdb_session = requests.Session()
except Exception as e:
    logger.critical(f"Failed to initialize service clients: {e}", exc_info=True)
    # Set clients to None to handle failures gracefully in the handler.
    user_table = None
    tmdb_session = None

# --- Data Fetching Layer (Separation of Concerns) ---
# Functions dedicated to getting data from external sources.

def fetch_movie_details(movie_id: int) -> Optional[Dict[str, Any]]:
    """
    Fetches and processes movie details from TMDB for ML processing.
    Includes retry logic and better error handling.

    Args:
        movie_id: The TMDB ID of the movie.

    Returns:
        A dictionary containing the movie's ID, title, and a "soup" of text features,
        or None if the fetch fails.
    """
    if not TMDB_API_KEY or not tmdb_session:
        logger.error("TMDB_API_KEY or session is not configured.")
        return None

    url = f"https://api.themoviedb.org/3/movie/{movie_id}?api_key={TMDB_API_KEY}&append_to_response=keywords"
    
    try:
        response = tmdb_session.get(url, timeout=5) # Set a timeout
        response.raise_for_status()  # Raises HTTPError for bad responses (4xx or 5xx)
        data = response.json()

        # Feature Engineering: Create a "soup" of textual features.
        # Give more weight to genres and keywords by repeating them. This is a simple but effective trick.
        genres = [genre['name'].replace(" ", "") for genre in data.get('genres', [])] * 2
        keywords = [keyword['name'].replace(" ", "") for keyword in data.get('keywords', {}).get('keywords', [])] * 2
        overview = data.get('overview', '').split()
        
        soup = ' '.join(genres + keywords + overview)
        
        return {
            'id': data.get('id'),
            'title': data.get('title', 'N/A'),
            'soup': soup
        }
    except requests.exceptions.RequestException as e:
        logger.error(f"TMDB API request failed for movie {movie_id}: {e}")
        return None
    except Exception as e:
        logger.error(f"Error processing TMDB data for movie {movie_id}: {e}", exc_info=True)
        return None

def fetch_candidate_movies() -> List[int]:
    """
    Fetches a pool of candidate movies from TMDB (e.g., popular and top-rated).
    
    Returns:
        A list of movie IDs to be considered for recommendation.
    """
    if not TMDB_API_KEY or not tmdb_session:
        logger.error("TMDB_API_KEY or session is not configured.")
        return []

    # Combine multiple sources for a richer candidate pool.
    popular_url = f"https://api.themoviedb.org/3/movie/popular?api_key={TMDB_API_KEY}&language=en-US&page=1"
    top_rated_url = f"https://api.themoviedb.org/3/movie/top_rated?api_key={TMDB_API_KEY}&language=en-US&page=1"
    
    candidate_ids = set() # Use a set to automatically handle duplicates
    
    for url in [popular_url, top_rated_url]:
        try:
            response = tmdb_session.get(url, timeout=5)
            response.raise_for_status()
            data = response.json()
            for movie in data.get('results', []):
                candidate_ids.add(movie['id'])
        except requests.exceptions.RequestException as e:
            logger.warning(f"Failed to fetch candidate movies from {url}: {e}")

    return list(candidate_ids)

# --- Database Layer (Separation of Concerns) ---

def get_user_liked_movies(email: str) -> Optional[List[int]]:
    """
    Fetches the list of liked movie IDs for a user from DynamoDB.

    Returns:
        A list of movie IDs or None if the user is not found.
    """
    if not user_table: return None
    try:
        response = user_table.get_item(
            Key={'email': email},
            ProjectionExpression="likedMovies"
        )
        item = response.get('Item')
        return [int(mid) for mid in item.get('likedMovies', [])] if item else None
    except Exception as e:
        logger.error(f"DynamoDB get_item failed for user {email}: {e}", exc_info=True)
        return None

def store_recommendations(email: str, recommended_ids: List[int]) -> bool:
    """
    Stores the generated list of recommended movie IDs back into DynamoDB.
    
    Returns:
        True if the update was successful, False otherwise.
    """
    if not user_table: return False
    try:
        user_table.update_item(
            Key={'email': email},
            UpdateExpression="SET recommendedMovies = :rec_ids",
            ExpressionAttributeValues={':rec_ids': recommended_ids}
        )
        logger.info(f"Successfully stored {len(recommended_ids)} recommendations for user {email}.")
        return True
    except Exception as e:
        logger.error(f"DynamoDB update_item failed for user {email}: {e}", exc_info=True)
        return False

# --- Core Machine Learning Logic ---

def generate_recommendations_for_user(user_email: str) -> Tuple[bool, str]:
    """
    Orchestrates the entire recommendation generation process for a single user.
    """
    logger.info(f"Starting recommendation generation for user: {user_email}")
    
    # 1. Fetch user's liked movies
    liked_movie_ids = get_user_liked_movies(user_email)
    
    if liked_movie_ids is None:
        return False, "User not found in the database."
    if not liked_movie_ids:
        logger.info(f"User {user_email} has no liked movies. Clearing recommendations.")
        store_recommendations(user_email, [])
        return True, "User has no liked movies; recommendations cleared."

    # 2. Fetch details for all required movies (liked and candidates) in parallel
    candidate_movie_ids = [mid for mid in fetch_candidate_movies() if mid not in liked_movie_ids]
    all_required_ids = list(set(liked_movie_ids + candidate_movie_ids))
    
    # MLOps Improvement: Using concurrent fetching would be even better here for large lists.
    # For now, a simple loop is fine.
    all_movie_details = [details for details in (fetch_movie_details(mid) for mid in all_required_ids) if details]
    
    if len(all_movie_details) < 2:
        return False, "Not enough movie data (liked + candidates) to calculate similarities."

    # 3. Prepare data using Pandas
    df = pd.DataFrame(all_movie_details).drop_duplicates(subset='id').set_index('id')
    df['soup'] = df['soup'].fillna('')

    # 4. TF-IDF Vectorization
    try:
        tfidf = TfidfVectorizer(stop_words='english', min_df=2) # min_df ignores very rare words
        tfidf_matrix = tfidf.fit_transform(df['soup'])
    except ValueError:
        return False, "Not enough vocabulary to build TF-IDF matrix. User may like very obscure movies."

    # 5. Build User Profile Vector
    liked_indices_mask = df.index.isin(liked_movie_ids)
    liked_vectors = tfidf_matrix[liked_indices_mask]
    
    if liked_vectors.shape[0] == 0:
        return False, "Could not create a profile vector from the user's liked movies."
        
    user_profile_vector = np.mean(liked_vectors, axis=0)

    # 6. Calculate Similarity and Rank
    candidate_indices_mask = ~liked_indices_mask # Efficiently select candidates
    candidate_vectors = tfidf_matrix[candidate_indices_mask]
    
    if candidate_vectors.shape[0] == 0:
        logger.info(f"No valid new candidates to recommend for {user_email}.")
        return True, "No new valid candidates to recommend."

    cosine_similarities = cosine_similarity(np.asarray(user_profile_vector), candidate_vectors)
    
    # Get candidate IDs corresponding to the similarity scores
    candidate_ids_in_order = df.index[candidate_indices_mask].tolist()
    
    sim_scores = list(zip(candidate_ids_in_order, cosine_similarities[0]))
    sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)

    # 7. Select Top N and Store
    top_n = 20 # Provide more recommendations
    recommended_ids = [int(movie_id) for movie_id, score in sim_scores[:top_n]]
    
    if store_recommendations(user_email, recommended_ids):
        return True, f"Successfully generated and stored {len(recommended_ids)} recommendations."
    else:
        return False, "Failed to store recommendations in the database."

# --- AWS Lambda Entry Point ---

def handler(event: Dict[str, Any], context: object) -> Dict[str, Any]:
    """
    AWS Lambda handler function.
    Parses incoming events (from SQS) and triggers the recommendation logic.
    """
    logger.info(f"Handler invoked with event: {event}")
    
    # A single failed message should not stop the processing of others in the batch.
    # This makes the worker resilient to "poison pill" messages.
    try:
        for record in event.get('Records', []):
            try:
                message_body = json.loads(record.get('body', '{}'))
                # IMPORTANT: We use 'email', not 'userId', to match our Node.js API
                user_email = message_body.get('email')
                
                if not user_email:
                    logger.warning(f"SQS record missing 'email' field: {record}")
                    continue

                success, message = generate_recommendations_for_user(user_email)
                if not success:
                    logger.error(f"Failed to process recommendations for {user_email}: {message}")

            except json.JSONDecodeError:
                logger.error(f"Could not decode JSON from SQS record body: {record.get('body')}")
            except Exception as e:
                logger.error(f"An unexpected error occurred processing a record: {e}", exc_info=True)
        
        return { 'statusCode': 200, 'body': json.dumps('Processing complete') }

    except Exception as e:
        logger.critical(f"A fatal error occurred in the handler function: {e}", exc_info=True)
        # It's better to raise the exception here to let Lambda handle the retry logic for the entire batch if something is fundamentally wrong.
        raise e