document.addEventListener('DOMContentLoaded', function () {

      const moviesContainer = document.getElementById('moviesContainer');
      const seriesContainer = document.getElementById('seriesContainer'); // Add a container for series if not already there
      const likedMovies = JSON.parse(localStorage.getItem('likedMovies')) || [];
      const likedSeries = JSON.parse(localStorage.getItem('likedSeries')) || [];
  
      // Fetch and display liked movies
      likedMovies.forEach(movieId => {
          const movieCard = document.createElement('div');
          movieCard.classList.add('movie-card');
  
          // Initially set the shimmer effect
          const shimmerDiv = document.createElement('div');
          shimmerDiv.classList.add('shimmer-bg');
          movieCard.appendChild(shimmerDiv);
  
          moviesContainer.appendChild(movieCard);
  
          fetch(`https://bingflix-backend.vercel.app/liked/${movieId}`)
              .then(response => response.json())
              .then(data => {
                  const movieElement = createMovieCard(data, 'movie');
  
                  // Replace the shimmer div with the actual content
                  moviesContainer.replaceChild(movieElement, movieCard);
              })
              .catch(error => console.error('Error:', error));
      });
  
      // Fetch and display liked series
      likedSeries.forEach(seriesId => {
          const seriesCard = document.createElement('div');
          seriesCard.classList.add('series-card'); // You can use a different class for series
  
          // Initially set the shimmer effect
          const shimmerDiv = document.createElement('div');
          shimmerDiv.classList.add('shimmer-bg');
          seriesCard.appendChild(shimmerDiv);
  
          seriesContainer.appendChild(seriesCard);
  
          fetch(`https://bingflix-backend.vercel.app/liked/series/${seriesId}`) // Modify API endpoint for series
              .then(response => response.json())
              .then(data => {
                  const seriesElement = createMovieCard(data, 'tv'); // Reuse createMovieCard for series
  
                  // Replace the shimmer div with the actual content
                  seriesContainer.replaceChild(seriesElement, seriesCard);
              })
              .catch(error => console.error('Error:', error));
      });
  
  });
  
  function createMovieCard(media, type) {
      const mediaCard = document.createElement('div');
      mediaCard.classList.add(type === 'movie' ? 'movie-card' : 'series-card');
      mediaCard.addEventListener('click', () => {
          handlePosterClick(type, media.id);
      });
  
      const img = new Image();
      img.src = `https://image.tmdb.org/t/p/w500${media.poster_path}`;
      console.log("title",media.title);
      console.log("name",media.name);
      img.alt = `${media.title || media.name}`; // Handle 'title' for movies and 'name' for series
  
      img.onload = function () {
          mediaCard.innerHTML = `
              <img src="${this.src}" alt="${this.alt}" style="width: 100%; height: auto; display: block;">
              <div class="media-details">
                  <h3 class="media-title">${media.title || media.name}</h3> <!-- Handle title/name -->
              </div>
          `;
      };
      img.onerror = function () {
          mediaCard.innerHTML = `
              <div class="media-details" style="padding: 10px;">
                  <h3 class="media-title">Image not available</h3>
              </div>
          `;
      };
  
      return mediaCard;
  }


  function handlePosterClick(mediaType, mediaId) {
    if (mediaType === 'movie') {
      window.location.href = `../movie_details/movie_details.html?type=movie&id=${mediaId}`;
    } else if (mediaType === 'tv') {
      window.location.href = `../series_details/series_details.html?type=tv&id=${mediaId}`;
    } else {
      console.error('Unknown media type');
    }
  }










    //sidebar logic
let sidebar = document.querySelector(".sidebar");
let closeBtn = document.querySelector("#btn");
let searchBtn = document.querySelector(".bx-search");
closeBtn.addEventListener("click", ()=>{
  sidebar.classList.toggle("open");
  menuBtnChange();//calling the function(optional)
});
searchBtn.addEventListener("click", ()=>{ // Sidebar open when you click on the search iocn
  sidebar.classList.toggle("open");
  menuBtnChange(); //calling the function(optional)
});
// following are the code to change sidebar button(optional)
function menuBtnChange() {
 if(sidebar.classList.contains("open")){
   closeBtn.classList.replace("bx-menu", "bx-menu-alt-right");//replacing the iocns class
 }else {
   closeBtn.classList.replace("bx-menu-alt-right","bx-menu");//replacing the iocns class
 }
}

function searchMovies() {
    const query = document.getElementById('searchInput').value;
    if (query.length < 3) {
      alert("Please enter at least 3 characters for search.");
      return;
    }
    const url = `../results/results.html?query=${query}`;
    window.location.href = url;
  }