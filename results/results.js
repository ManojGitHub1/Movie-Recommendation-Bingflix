const resultsContainer = document.getElementById('results');

// Wait for the DOM to fully load
document.addEventListener('DOMContentLoaded', function() {
  //const resultsContainer = document.getElementById('results');

  function searchMovies(event) {
      console.log('searchMovies called');
      event.preventDefault(); // Prevent default form submission
      const query1 = document.getElementById('searchInput').value.trim(); // Trim whitespace
      console.log('Query:', query1);

      if (query1.length < 3) {
          alert("Please enter at least 3 characters for search.");
          return; // Exit the function if input is less than 3 characters
      }

      const newUrl = `../results/results.html?query=${query1}`;
      console.log('Redirecting to:', newUrl); // Log the new URL
      window.location.href = newUrl; // Redirect to the new URL
  }

  // Attach event listener to the form submission
  document.getElementById('searchForm').addEventListener('submit', searchMovies);
});

// Function to parse URL parameters
function getQueryVariable(variable) {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
      const pair = vars[i].split("=");
      if (pair[0] === variable) {
        return decodeURIComponent(pair[1]);
      }
    }
    return null;
  }

  const query = getQueryVariable('query');
  if (query) {
    // Perform search using query and display results
    searchMovies(query);
  
  } else {
    document.getElementById('results').innerHTML = '<p>No results found.</p>';
  }

  //this function is searching movies and bringing the response from api
  async function searchMovies(query) {
    const url = `https://bingflix-backend.vercel.app/search/${query}`;
    resultsContainer.innerHTML = '<p>Loading results...</p>';
    try {
      const response = await fetch(url);
      const data = await response.json();
      displayResults(data.results);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  }

  function displayResults(results) {
    //const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    if (!results) {
      resultsContainer.innerHTML = '<p>Error fetching data. Please try again.</p>';
      return;
  }

    if (results.length === 0) {
      resultsContainer.innerHTML = '<p>No results found.</p>';
      return;
    }

    console.log(results);

  results.forEach(item => {

     // Only process items that are movies or TV series
     if (item.media_type !== 'movie' && item.media_type !== 'tv') {
      return;
  }

    const itemElement = document.createElement('div');
    itemElement.classList.add('item');
    itemElement.style.position = 'relative';

    // Determine if it's a movie or a TV series
    const mediaType = item.media_type === 'movie' ? 'Movie' : 'TV Series';
    
    // Create a transparent box to indicate the media type
    const mediaTypeBox = document.createElement('div');
    mediaTypeBox.classList.add('media-type-box');
    mediaTypeBox.textContent = mediaType;
    itemElement.appendChild(mediaTypeBox);

    // Poster
    const posterPath = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://via.placeholder.com/200x300?text=No+Poster+Available';
    const imgElement = document.createElement('img');
    imgElement.src = posterPath;
    imgElement.alt = item.title;
    imgElement.addEventListener('click', () => {
      handlePosterClick(item.media_type, item.id);
    });
    itemElement.appendChild(imgElement);

     // Rating
     const ratingElement = document.createElement('div');
     ratingElement.classList.add('tmdb-rating');
     ratingElement.textContent = `${item.vote_average.toFixed(1)} ${getRatingStars(item.vote_average)}`;
     ratingElement.style.position = 'absolute'; // Set position to absolute
     ratingElement.style.top = '20px'; // Position at the top
     ratingElement.style.left = '0'; // Position at the left
     ratingElement.style.background = ''; // Example background color
     ratingElement.style.padding = '5px 10px'; // Example padding
     itemElement.appendChild(ratingElement);
 

    // Title and Release Year
    const h2Element = document.createElement('h2');
    h2Element.textContent = `${item.title || item.name} (${getReleaseDate(item)})`;
    itemElement.appendChild(h2Element);

    resultsContainer.appendChild(itemElement);
  });

  if (resultsContainer.innerHTML === '') {
    resultsContainer.innerHTML = '<p>No movies or series found.</p>';
  }

}


  // Function to handle poster click event to redirect to movie_details
  function handlePosterClick(mediaType, mediaId) {
    if (mediaType === 'movie') {
      window.location.href = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
    } else if (mediaType === 'tv') {
      window.location.href = `../series_details/series_details.html?type=tv&id=${mediaId}`;
    } else {
      console.error('Unknown media type');
    }
  }
  
  function getReleaseDate(item) {
    let releaseDate;
    if (item.media_type === 'movie') {
      releaseDate = item.release_date;
    } else if (item.media_type === 'tv') {
      releaseDate = item.first_air_date;
    }
    if (releaseDate) {
      const date = new Date(releaseDate);
      return date.getFullYear();
    } else {
      return 'N/A';
    }
  }

  function getRatingStars(rating) {
    const roundedRating = Math.round(rating / 2); // Convert TMDB rating scale (0-10) to a 5-star scale
    const stars = '★'.repeat(roundedRating) // Use Unicode characters for stars
    return stars;
  }