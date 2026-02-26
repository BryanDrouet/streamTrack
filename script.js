const API_KEY = '66687c9ed9c8ae28195ab7c07709c263';
const BASE_URL = 'https://api.themoviedb.org/3';

const AVAILABLE_PLATFORMS = [
    { id: 8, name: 'Netflix' },
    { id: 381, name: 'Canal+' },
    { id: 119, name: 'Prime Video' },
    { id: 337, name: 'Disney+' },
    { id: 2, name: 'Apple TV' },
    { id: 531, name: 'Paramount+' },
    { id: 35, name: 'Rakuten TV' },
    { id: 564, name: 'OCS' }
];

document.addEventListener('DOMContentLoaded', () => {
    initPlatforms();
    requestNotificationPermission();
    loadTrackedMovies();
    autoCheckAll();
    lucide.createIcons();
});

function initPlatforms() {
    const container = document.getElementById('platform-checkboxes');
    AVAILABLE_PLATFORMS.forEach(p => {
        const label = document.createElement('label');
        label.className = 'platform-item';
        label.innerHTML = `<input type="checkbox" value="${p.id}" class="platform-check" checked> <span>${p.name}</span>`;
        container.appendChild(label);
    });
}

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
    document.getElementById('results-section').classList.remove('hidden');
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
            <div class="poster-container"><img src="https://image.tmdb.org/t/p/w400${movie.poster_path}" alt="${movie.title}" loading="lazy"></div>
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <div class="card-actions">
                    <button class="btn-secondary" onclick="showTrailer(${movie.id})"><i data-lucide="play"></i> VF</button>
                    <button class="btn-primary" onclick="trackMovie(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', '${movie.poster_path}')"><i data-lucide="bell"></i> Suivre</button>
                </div>
            </div>`;
        container.appendChild(card);
    });
    lucide.createIcons();
}

async function showTrailer(movieId) {
    const response = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}&language=fr-FR`);
    const data = await response.json();
    let trailer = data.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (!trailer) {
        const enRes = await fetch(`${BASE_URL}/movie/${movieId}/videos?api_key=${API_KEY}`);
        const enData = await enRes.json();
        trailer = enData.results.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    }
    if (trailer) {
        const modal = document.getElementById('trailer-modal');
        const container = document.getElementById('video-container');
        container.innerHTML = `<iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        modal.style.display = 'block';
    }
    lucide.createIcons();
}

document.querySelector('.close-modal').onclick = () => {
    document.getElementById('trailer-modal').style.display = 'none';
    document.getElementById('video-container').innerHTML = '';
};

function trackMovie(id, title, poster) {
    let tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    const selectedPlatforms = Array.from(document.querySelectorAll('.platform-check:checked')).map(cb => parseInt(cb.value));
    if (!tracked.find(m => m.id === id)) {
        tracked.push({ id, title, poster, platforms: selectedPlatforms, addedAt: Date.now() });
        localStorage.setItem('trackedMovies', JSON.stringify(tracked));
        loadTrackedMovies();
        checkAvailability(id, title, selectedPlatforms, true);
    }
}

function loadTrackedMovies() {
    const tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    const sortType = document.getElementById('sort-select').value;
    
    if(sortType === 'alpha') tracked.sort((a,b) => a.title.localeCompare(b.title));
    else tracked.sort((a,b) => b.addedAt - a.addedAt);

    const container = document.getElementById('tracked-movies');
    container.innerHTML = '';
    tracked.forEach(movie => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.id = `movie-${movie.id}`;
        card.innerHTML = `
            <div class="poster-container">
                <img src="https://image.tmdb.org/t/p/w400${movie.poster}" alt="${movie.title}">
                <div class="status-badge hidden" id="status-${movie.id}">DISPONIBLE</div>
            </div>
            <div class="movie-info">
                <h3>${movie.title}</h3>
                <div class="card-actions">
                    <button class="btn-secondary" onclick="checkAvailability(${movie.id}, '${movie.title.replace(/'/g, "\\'")}', [${movie.platforms}], true)"><i data-lucide="refresh-cw"></i></button>
                    <button class="btn-danger" onclick="untrackMovie(${movie.id})"><i data-lucide="trash-2"></i></button>
                </div>
            </div>`;
        container.appendChild(card);
    });
    lucide.createIcons();
}

async function checkAvailability(id, title, targetPlatforms, notify = false) {
    try {
        const response = await fetch(`${BASE_URL}/movie/${id}/watch/providers?api_key=${API_KEY}`);
        const data = await response.json();
        const frProviders = data.results?.FR?.flatrate || [];
        const availableIds = frProviders.map(p => p.provider_id);
        const found = targetPlatforms.some(p => availableIds.includes(p));
        const badge = document.getElementById(`status-${id}`);
        if (found) {
            if (badge) badge.classList.remove('hidden');
            if (notify) {
                const names = frProviders.filter(p => targetPlatforms.includes(p.provider_id)).map(p => p.provider_name).join(', ');
                if (Notification.permission === "granted") {
                    new Notification("Stream Track", { body: `${title} est dispo sur ${names} !`, icon: "https://lucide.dev/icons/tv.svg" });
                }
            }
        }
    } catch (e) { console.error("Erreur API"); }
}

async function autoCheckAll() {
    const tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    for (const movie of tracked) {
        await checkAvailability(movie.id, movie.title, movie.platforms, false);
        await new Promise(r => setTimeout(r, 300));
    }
}

document.getElementById('sort-select').onchange = loadTrackedMovies;
function untrackMovie(id) {
    let tracked = JSON.parse(localStorage.getItem('trackedMovies')) || [];
    tracked = tracked.filter(m => m.id !== id);
    localStorage.setItem('trackedMovies', JSON.stringify(tracked));
    loadTrackedMovies();
}