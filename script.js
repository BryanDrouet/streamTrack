const API_KEY = '66687c9ed9c8ae28195ab7c07709c263';
const BASE_URL = 'https://api.themoviedb.org/3';

document.addEventListener('DOMContentLoaded', () => {
    lucide.createIcons();
    requestNotificationPermission();
    loadTrackedMovies();
});

function requestNotificationPermission() {
    if ("Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission();
    }
}

document.getElementById('search-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('search-input').value;
    const response = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=fr-FR`);
    const data = await response.json();
    displayResults(data.results);
});

function displayResults(movies) {
    const container = document.getElementById('search-results');
    container.innerHTML = '';
    
    movies.forEach(movie => {
        if (!movie.poster_path) return;
        
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w200${movie.poster_path}" alt="${movie.title}">
            <h3>${movie.title}</h3>
            <button onclick="showTrailer(${movie.id})"><i data-lucide="play"></i> Trailer VF</button>
            <button onclick="trackMovie(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${movie.poster_path}')"><i data-lucide="bell"></i> Suivre</button>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

async function showTrailer(movieId) {
    const response = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=fr-FR`);
    const data = await response.json();
    
    let trailer = data.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    if (!trailer) {
        const enResponse = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
        const enData = await enResponse.json();
        trailer = enData.results.find(video => video.type === 'Trailer' && video.site === 'YouTube');
    }

    if (trailer) {
        const modal = document.getElementById('trailer-modal');
        const container = document.getElementById('video-container');
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}" allowfullscreen></iframe>`;
        modal.style.display = 'block';
    } else {
        alert("Aucun trailer trouvé pour ce film.");
    }
}

document.querySelector('.close-modal').addEventListener('click', () => {
    document.getElementById('trailer-modal').style.display = 'none';
    document.getElementById('video-container').innerHTML = '';
});

function trackMovie(id, title, poster) {
    let tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    
    const selectedPlatforms = Array.from(document.querySelectorAll('.platform-check:checked')).map(cb => parseInt(cb.value));
    
    if (!tracked.find(m => m.id === id)) {
        tracked.push({ id, title, poster, platforms: selectedPlatforms });
        localStorage.setItem('trackedMovies', JSON.stringify(tracked));
        loadTrackedMovies();
        checkAvailability(id, title, selectedPlatforms);
    }
}

function loadTrackedMovies() {
    const tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    const container = document.getElementById('tracked-movies');
    container.innerHTML = '';
    
    tracked.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w200${movie.poster}" alt="${movie.title}">
            <h3>${movie.title}</h3>
            <button onclick="untrackMovie(${movie.id})"><i data-lucide="trash-2"></i> Retirer</button>
            <button onclick="checkAvailability(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', [${movie.platforms}])"><i data-lucide="refresh-cw"></i> Vérifier</button>
        `;
        container.appendChild(card);
    });
    lucide.createIcons();
}

function untrackMovie(id) {
    let tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    tracked = tracked.filter(m => m.id !== id);
    localStorage.setItem('trackedMovies', JSON.stringify(tracked));
    loadTrackedMovies();
}

async function checkAvailability(id, title, targetPlatforms) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`);
        const data = await response.json();
        
        const frProviders = data.results?.FR?.flatrate || [];
        const availablePlatforms = frProviders.map(p => p.provider_id);
        
        const found = targetPlatforms.some(p => availablePlatforms.includes(p));
        
        if (found) {
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("Film Disponible !", {
                    body: `${title} est maintenant disponible sur l'une de vos plateformes !`,
                    icon: "https://lucide.dev/icons/popcorn.svg"
                });
            } else {
                alert(`Bonne nouvelle ! ${title} est disponible sur l'une de vos plateformes.`);
            }
        } else {
            console.log(`${title} n'est pas encore dispo sur vos plateformes.`);
        }
    } catch (error) {
        console.error(error);
    }
}