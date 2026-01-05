const API_KEY = '08bbfbd3373af26b822418cc24fc9768';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

const moviesGrid = document.getElementById('moviesGrid');
const loadingDiv = document.getElementById('loading');
const sectionTitle = document.getElementById('sectionTitle');
const genreSelect = document.getElementById('genreSelect');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const movieModal = document.getElementById('movieModal');
const modalBody = document.getElementById('modalBody');
const favoritesGrid = document.getElementById('favoritesGrid');
const aboutModal = document.getElementById('aboutModal');

let currentPage = 1;
let totalPages = 1;
let currentQuery = '';
let currentGenre = null;
let favorites = JSON.parse(localStorage.getItem('movieFavorites')) || [];

function scrollToFavorites() {
    document.getElementById('favorites').scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

function showAboutModal() {
    aboutModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeAboutModal() {
    aboutModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function updateFavCount() {
    const favCount = document.getElementById('favCount');
    if (favCount) {
        favCount.textContent = favorites.length;
    }
}

function showLoading(show) {
    if (show) {
        loadingDiv.style.display = 'flex';
        moviesGrid.style.display = 'none';
    } else {
        loadingDiv.style.display = 'none';
        moviesGrid.style.display = 'grid';
    }
}

async function fetchMovies(genreId = null, genreName = null, page = 1) {
    try {
        showLoading(true);
        
        let url;
        if (currentQuery) {
            url = `${BASE_URL}/search/movie?api_key=${API_KEY}&query=${currentQuery}&language=en-US&page=${page}`;
            sectionTitle.innerHTML = `Search Results for "${currentQuery}" <i class="fas fa-search title-icon"></i>`;
        } else if (genreId) {
            url = `${BASE_URL}/discover/movie?api_key=${API_KEY}&with_genres=${genreId}&language=en-US&page=${page}`;
            sectionTitle.innerHTML = `${genreName} Movies <i class="fas fa-film title-icon"></i>`;
            currentGenre = { id: genreId, name: genreName };
        } else {
            url = `${BASE_URL}/movie/popular?api_key=${API_KEY}&language=en-US&page=${page}`;
            sectionTitle.innerHTML = 'Popular Movies <i class="fas fa-fire title-icon"></i>';
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        totalPages = data.total_pages > 500 ? 500 : data.total_pages;
        currentPage = page;
        
        updatePagination();
        displayMovies(data.results);
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error fetching movies:', error);
        moviesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="font-size: 1.5rem; margin-bottom: 1rem;">😕 Oops! Something went wrong</p>
                <p style="font-size: 1.1rem; opacity: 0.8;">Please check your internet connection and try again</p>
            </div>
        `;
    } finally {
        showLoading(false);
    }
}

function displayMovies(movies) {
    moviesGrid.innerHTML = '';
    
    if (movies.length === 0) {
        moviesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="font-size: 1.5rem; margin-bottom: 1rem;">🎬 No movies found</p>
                <p style="font-size: 1.1rem; opacity: 0.8;">Try searching for something else</p>
            </div>
        `;
        return;
    }
    
    movies.forEach((movie) => {
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        
        const isFav = favorites.some(fav => fav.id === movie.id);

        movieCard.innerHTML = `
            <div class="movie-poster-wrapper">
                <img src="${movie.poster_path ? IMG_URL + movie.poster_path : 'https://via.placeholder.com/280x420/0a0e27/1e90ff?text=No+Poster'}" 
                     alt="${movie.title}"
                     class="movie-poster"
                     loading="lazy"
                     onerror="this.src='https://via.placeholder.com/280x420/0a0e27/1e90ff?text=No+Poster'">
                <button class="poster-fav-btn ${isFav ? 'active' : ''}" data-movie-id="${movie.id}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-rating"><i class="fas fa-star"></i> ${movie.vote_average.toFixed(1)}/10</p>
                <p class="movie-date"><i class="fas fa-calendar"></i> ${movie.release_date ? movie.release_date.split('-')[0] : 'N/A'}</p>
            </div>
        `;
        
        movieCard.addEventListener('click', (e) => {
            if (!e.target.closest('.poster-fav-btn')) {
                showMovieDetails(movie.id);
            }
        });
        
        moviesGrid.appendChild(movieCard);
        
        const favBtn = movieCard.querySelector('.poster-fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(movie.id, movie.title, movie.poster_path, movie.vote_average);
            
            const allCards = document.querySelectorAll('.movie-card');
            allCards.forEach(card => {
                const btn = card.querySelector(`[data-movie-id="${movie.id}"]`);
                if (btn) {
                    const isNowFav = favorites.some(fav => fav.id === movie.id);
                    if (isNowFav) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
        });
    });
}

async function showMovieDetails(movieId) {
    try {
        movieModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        modalBody.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <div class="spinner"></div>
                <p style="margin-top: 1rem;">Loading movie details...</p>
            </div>
        `;
        
        const [movieData, creditsData, videosData] = await Promise.all([
            fetch(`${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=en-US`).then(r => r.json()),
            fetch(`${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}`).then(r => r.json()),
            fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`).then(r => r.json())
        ]);
        
        const cast = creditsData.cast.slice(0, 6);
        
        const trailer = videosData.results.find(video => 
            video.type === 'Trailer' && video.site === 'YouTube'
        );
        
        const isFavorite = favorites.some(fav => fav.id === movieId);
        
        modalBody.innerHTML = `
            <div class="movie-details">
                <div>
                    <img src="${movieData.poster_path ? IMG_URL + movieData.poster_path : 'https://via.placeholder.com/400x600/0a0e27/1e90ff?text=No+Poster'}" 
                         alt="${movieData.title}"
                         class="movie-poster-large">
                </div>
                
                <div class="movie-details-content">
                    <h2 class="movie-details-title">${movieData.title}</h2>
                    
                    <div class="movie-meta">
                        <div class="meta-item">
                            <i class="fas fa-star meta-icon"></i>
                            <span>${movieData.vote_average.toFixed(1)}/10</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-calendar meta-icon"></i>
                            <span>${movieData.release_date ? movieData.release_date.split('-')[0] : 'N/A'}</span>
                        </div>
                        <div class="meta-item">
                            <i class="fas fa-clock meta-icon"></i>
                            <span>${movieData.runtime ? movieData.runtime + ' min' : 'N/A'}</span>
                        </div>
                    </div>
                    
                    <div class="movie-genres">
                        ${movieData.genres.map(g => `<span class="genre-tag"><i class="fas fa-tag"></i> ${g.name}</span>`).join('')}
                    </div>
                    
                    <div class="movie-overview-section">
                        <h3 class="overview-title"><i class="fas fa-align-left"></i> Overview</h3>
                        <p class="overview-text">${movieData.overview || 'No overview available'}</p>
                    </div>
                    
                    ${cast.length > 0 ? `
                        <div class="movie-cast-section">
                            <h3 class="overview-title"><i class="fas fa-users"></i> Cast</h3>
                            <div class="cast-grid">
                                ${cast.map(actor => `
                                    <div class="cast-member">
                                        <img src="${actor.profile_path ? IMG_URL + actor.profile_path : 'https://via.placeholder.com/100x150/0a0e27/1e90ff?text=No+Photo'}" 
                                             alt="${actor.name}"
                                             class="cast-photo"
                                             onerror="this.src='https://via.placeholder.com/100x150/0a0e27/1e90ff?text=No+Photo'">
                                        <p class="cast-name">${actor.name}</p>
                                        <p class="cast-character">${actor.character || 'Unknown'}</p>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <div class="movie-actions">
                        ${trailer ? `
                            <a href="https://www.youtube.com/watch?v=${trailer.key}" target="_blank" class="trailer-btn primary-btn">
                                <i class="fas fa-play-circle"></i>
                                <span>Watch Trailer</span>
                            </a>
                        ` : `
                            <button class="trailer-btn primary-btn" disabled>
                                <i class="fas fa-video-slash"></i>
                                <span>No Trailer</span>
                            </button>
                        `}
                        
                        <button class="favorite-btn-modal ${isFavorite ? 'active' : ''}" onclick="toggleFavorite(${movieId}, '${movieData.title.replace(/'/g, "\\'")}', '${movieData.poster_path}', ${movieData.vote_average})">
                            <i class="fas fa-heart"></i>
                            <span>${isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error fetching movie details:', error);
        modalBody.innerHTML = `
            <div style="padding: 3rem; text-align: center;">
                <p style="font-size: 1.5rem; margin-bottom: 1rem;">😕 Oops!</p>
                <p>Could not load movie details. Please try again.</p>
            </div>
        `;
    }
}

function closeModal() {
    movieModal.classList.remove('active');
    document.body.style.overflow = 'auto';
}

function toggleFavorite(id, title, poster, rating) {
    const index = favorites.findIndex(fav => fav.id === id);
    
    if (index === -1) {
        favorites.push({ id, title, poster, rating });
    } else {
        favorites.splice(index, 1);
    }
    
    localStorage.setItem('movieFavorites', JSON.stringify(favorites));
    updateFavCount();
    displayFavorites();
    showMovieDetails(id);
}

function displayFavorites() {
    if (favorites.length === 0) {
        favoritesGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <p style="font-size: 1.5rem; margin-bottom: 1rem;">💔 No favorites yet</p>
                <p style="font-size: 1.1rem; opacity: 0.8;">Start adding movies to your favorites!</p>
            </div>
        `;
        updateFavCount();
        return;
    }
    
    favoritesGrid.innerHTML = '';
    
    favorites.forEach((movie) => {
        const movieCard = document.createElement('div');
        movieCard.classList.add('movie-card');
        
        const isFav = favorites.some(fav => fav.id === movie.id);
        
        movieCard.innerHTML = `
            <div class="movie-poster-wrapper">
                <img src="${movie.poster ? IMG_URL + movie.poster : 'https://via.placeholder.com/280x420/0a0e27/1e90ff?text=No+Poster'}" 
                     alt="${movie.title}"
                     class="movie-poster"
                     loading="lazy">
                <button class="poster-fav-btn ${isFav ? 'active' : ''}" data-movie-id="${movie.id}">
                    <i class="fas fa-heart"></i>
                </button>
            </div>
            
            <div class="movie-info">
                <h3 class="movie-title">${movie.title}</h3>
                <p class="movie-rating"><i class="fas fa-star"></i> ${movie.rating.toFixed(1)}/10</p>
            </div>
        `;
        
        movieCard.addEventListener('click', (e) => {
            if (!e.target.closest('.poster-fav-btn')) {
                showMovieDetails(movie.id);
            }
        });
        
        favoritesGrid.appendChild(movieCard);
        
        const favBtn = movieCard.querySelector('.poster-fav-btn');
        favBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleFavorite(movie.id, movie.title, movie.poster, movie.rating);
            
            const allCards = document.querySelectorAll('.movie-card');
            allCards.forEach(card => {
                const btn = card.querySelector(`[data-movie-id="${movie.id}"]`);
                if (btn) {
                    const isNowFav = favorites.some(fav => fav.id === movie.id);
                    if (isNowFav) {
                        btn.classList.add('active');
                    } else {
                        btn.classList.remove('active');
                    }
                }
            });
        });
    });
    
    updateFavCount();
}

function updatePagination() {
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

genreSelect.addEventListener('change', () => {
    const genreId = genreSelect.value;
    const genreName = genreSelect.options[genreSelect.selectedIndex].text;
    
    if (genreId) {
        currentQuery = '';
        searchInput.value = '';
        fetchMovies(genreId, genreName, 1);
    } else {
        currentQuery = '';
        searchInput.value = '';
        fetchMovies(null, null, 1);
    }
    
    setTimeout(() => {
        document.getElementById('movies').scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start' 
        });
    }, 300);
});

searchBtn.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        currentQuery = query;
        currentGenre = null;
        genreSelect.value = '';
        fetchMovies(null, null, 1);
    }
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        searchBtn.click();
    }
});

prevBtn.addEventListener('click', () => {
    if (currentPage > 1) {
        if (currentGenre) {
            fetchMovies(currentGenre.id, currentGenre.name, currentPage - 1);
        } else {
            fetchMovies(null, null, currentPage - 1);
        }
    }
});

nextBtn.addEventListener('click', () => {
    if (currentPage < totalPages) {
        if (currentGenre) {
            fetchMovies(currentGenre.id, currentGenre.name, currentPage + 1);
        } else {
            fetchMovies(null, null, currentPage + 1);
        }
    }
});

fetchMovies();
displayFavorites();
updateFavCount();

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});