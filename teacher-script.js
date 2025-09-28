// Default flashcard data
let defaultFlashcards = [
    {
        id: 1,
        word: "animals",
        image: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=400&h=300&fit=crop",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    },
    {
        id: 2,
        word: "elephant",
        image: "https://images.unsplash.com/photo-1564760055775-d63b17a55c44?w=400&h=300&fit=crop",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    },
    {
        id: 3,
        word: "lion",
        image: "https://images.unsplash.com/photo-1552410260-0fd9b577afa6?w=400&h=300&fit=crop",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    },
    {
        id: 4,
        word: "tiger",
        image: "https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=300&fit=crop",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    },
    {
        id: 5,
        word: "giraffe",
        image: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    },
    {
        id: 6,
        word: "panda",
        image: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=400&h=300&fit=crop",
        audioUrl: "https://www.soundjay.com/misc/sounds/bell-ringing-05.wav"
    }
];

// Display mode functionality
let currentViewMode = 'single'; // 'single' or 'grid'

// Function to switch between single and grid view
function switchViewMode(mode) {
    currentViewMode = mode;
    const singleView = document.getElementById('singleView');
    const gridView = document.getElementById('gridView');
    const singleBtn = document.getElementById('singleViewBtn');
    const gridBtn = document.getElementById('gridViewBtn');
    
    if (mode === 'single') {
        singleView.style.display = 'block';
        gridView.style.display = 'none';
        singleBtn.classList.add('active');
        gridBtn.classList.remove('active');
    } else {
        singleView.style.display = 'none';
        gridView.style.display = 'block';
        singleBtn.classList.remove('active');
        gridBtn.classList.add('active');
        renderGridView();
    }
}

// Function to get image URL with cache-busting
function getImageUrl(baseUrl) {
    if (!baseUrl) return '';
    // Remove any existing timestamp and add a fresh one
    const cleanUrl = baseUrl.split('?')[0];
    return `${cleanUrl}?t=${Date.now()}`;
}

// Function to render grid view
function renderGridView() {
    const grid = document.getElementById('flashcardGrid');
    grid.innerHTML = '';
    
    if (flashcards.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <h3>No flashcards available</h3>
                <p>Add a new flashcard using the form above</p>
            </div>
        `;
        return;
    }
    
    flashcards.forEach((card, index) => {
        const gridCard = document.createElement('div');
        gridCard.className = 'grid-flashcard';
        gridCard.innerHTML = `
            <img src="${getImageUrl(card.image)}" alt="${card.word}" class="grid-flashcard-image" 
                 onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjZjBmMGYwIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTAwIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPg==';">
            <div class="grid-flashcard-text">${card.word}</div>
            <button class="grid-flashcard-delete" onclick="deleteCardFromGrid(${index})">×</button>
        `;
        
        // Add click to play audio
        gridCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('grid-flashcard-delete')) {
                playAudio(card.word, card.audioUrl);
            }
        });
        
        grid.appendChild(gridCard);
    });
}

// Function to clear all storage (emergency cleanup)
async function clearAllStorage() {
    if (confirm('This will delete ALL flashcards and cannot be undone. Are you sure?')) {
        try {
            const response = await fetch('/api/flashcards', {
                method: 'DELETE'
            });

            if (!response.ok) {
                throw new Error(`Clear failed: ${response.statusText}`);
            }

            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Clear failed');
            }

            flashcards = []; // Empty array, no default cards
            nextId = 1; // Reset ID counter
            renderGridView();
            alert('All flashcards cleared!');
        } catch (error) {
            console.error('Error clearing flashcards:', error);
            alert('Error clearing flashcards. Please try again.');
        }
    }
}


// Function to generate standalone student HTML
function generateStudentHTML() {
    // Create a copy of flashcards with properly embedded images
    const embeddedCards = flashcards.map(card => ({
        id: card.id,
        word: card.word,
        image: card.image, // This is already base64 data
        audioUrl: card.audioUrl
    }));
    
    const cardsData = JSON.stringify(embeddedCards);
    
    // Create ZIP file using JSZip
    if (typeof JSZip === 'undefined') {
        // Load JSZip library dynamically
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => {
            createZipFile(htmlContent);
        };
        document.head.appendChild(script);
    } else {
        createZipFile(htmlContent);
    }
    
    function createZipFile(htmlContent) {
        const zip = new JSZip();
        
        // Add HTML file
        zip.file('flashcards.html', htmlContent);
        
        // Add images as separate files
        flashcards.forEach((card, index) => {
            if (card.image) {
                // Convert base64 to blob
                const base64Data = card.image.split(',')[1];
                const imageBlob = base64ToBlob(base64Data, 'image/jpeg');
                zip.file(`images/card-${index + 1}.jpg`, imageBlob);
            }
        });
        
        // Generate ZIP file
        zip.generateAsync({type: 'blob'}).then(function(content) {
            // Download ZIP file
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'flashcards-student.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset button
            compileBtn.textContent = originalText;
            compileBtn.disabled = false;
            
            const zipSizeKB = Math.round(content.size / 1024);
            alert(`ZIP file created successfully!\n\nFile: flashcards-student.zip\nCards: ${flashcards.length}\nFile size: ${zipSizeKB} KB\n\nInstructions:\n1. Extract the ZIP file\n2. Open flashcards.html in any browser\n3. Images are in the images/ folder`);
        });
    }
}

// Helper function to convert base64 to blob
function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], {type: mimeType});
}

// Function to generate HTML for ZIP (with separate images)
function generateStudentHTMLForZip() {
    const cardsData = flashcards.map((card, index) => ({
        id: card.id,
        word: card.word,
        image: `images/card-${index + 1}.jpg`, // Reference to separate image file
        audioUrl: card.audioUrl
    }));
    
    const cardsDataString = JSON.stringify(cardsData);
    
    // Return the same HTML template but with image references instead of embedded data
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Flashcards</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: linear-gradient(to bottom, #FFD700 50%, #F5F5F5 50%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { text-align: center; max-width: 1200px; width: 100%; }
        h1 { color: #333; margin-bottom: 40px; font-size: 2.5rem; font-weight: 300; }
        .card-counter { font-size: 1.2rem; color: #666; margin-bottom: 20px; font-weight: 500; }
        .flashcard-container { display: flex; justify-content: center; align-items: center; margin: 40px 0; }
        .flashcard { width: 500px; height: 350px; background: white; border-radius: 20px; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2); cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; border: 4px solid white; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .flashcard:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2); }
        .flashcard:active { transform: scale(0.98); }
        .flashcard-image { width: 100%; height: 70%; object-fit: cover; border-radius: 12px 12px 0 0; }
        .flashcard-text { height: 30%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 600; color: #333; background: white; border-radius: 0 0 16px 16px; }
        .flashcard::after { content: '🔊'; position: absolute; top: 10px; right: 10px; font-size: 1.2rem; opacity: 0.7; transition: opacity 0.3s ease; }
        .flashcard:hover::after { opacity: 1; }
        .navigation { display: flex; justify-content: center; gap: 20px; margin-top: 30px; }
        .nav-btn { padding: 12px 24px; font-size: 1.1rem; font-weight: 600; background: #4CAF50; color: white; border: none; border-radius: 25px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .nav-btn:hover { background: #45a049; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4); }
        .nav-btn:active { transform: translateY(0); background: #3d8b40; }
        .nav-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 40px; }
        .empty-state h3 { font-size: 1.5rem; margin-bottom: 10px; color: #999; }
        .empty-state p { font-size: 1rem; color: #aaa; }
        @media (max-width: 768px) { .flashcard { width: 350px; height: 250px; } .flashcard-text { font-size: 2rem; } h1 { font-size: 2rem; } .nav-btn { padding: 10px 20px; font-size: 1rem; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>Interactive Flashcards</h1>
        <div class="card-counter"><span id="currentCard">1</span> / <span id="totalCards">${flashcards.length}</span></div>
        <div class="flashcard-container"><div class="flashcard" id="currentFlashcard"></div></div>
        <div class="navigation">
            <button id="prevBtn" class="nav-btn">← Previous</button>
            <button id="nextBtn" class="nav-btn">Next →</button>
        </div>
    </div>
    <script>
        const flashcards = ${cardsDataString};
        let currentCardIndex = 0;
        let selectedVoice = null;
        let voices = [];
        function loadVoices() { voices = speechSynthesis.getVoices(); const googleVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); if (googleVoices.length > 0) { selectedVoice = googleVoices[0]; } else { const anyGoogleEnglish = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); if (anyGoogleEnglish.length > 0) { selectedVoice = anyGoogleEnglish[0]; } else { const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); if (englishVoices.length > 0) { selectedVoice = englishVoices[0]; } } } }
        function playAudio(word, audioUrl) { if ('speechSynthesis' in window) { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word); if (selectedVoice) { utterance.voice = selectedVoice; } utterance.lang = 'en-US'; utterance.rate = 0.9; utterance.pitch = 1.1; utterance.volume = 1.0; utterance.text = word; speechSynthesis.speak(utterance); } }
        function updateFlashcard() { if (flashcards.length === 0) { const flashcardElement = document.getElementById('currentFlashcard'); flashcardElement.innerHTML = \`<div class="empty-state"><h3>No flashcards available</h3><p>Please ask your teacher to add flashcards</p></div>\`; document.getElementById('currentCard').textContent = '0'; document.getElementById('totalCards').textContent = '0'; document.getElementById('prevBtn').disabled = true; document.getElementById('nextBtn').disabled = true; return; } const currentCard = flashcards[currentCardIndex]; const flashcardElement = document.getElementById('currentFlashcard'); flashcardElement.innerHTML = \`<img src="\${currentCard.image}" alt="\${currentCard.word}" class="flashcard-image"><div class="flashcard-text">\${currentCard.word}</div>\`; document.getElementById('currentCard').textContent = currentCardIndex + 1; document.getElementById('totalCards').textContent = flashcards.length; const prevBtn = document.getElementById('prevBtn'); const nextBtn = document.getElementById('nextBtn'); prevBtn.disabled = currentCardIndex === 0; nextBtn.disabled = currentCardIndex === flashcards.length - 1; flashcardElement.onclick = () => { playAudio(currentCard.word, currentCard.audioUrl); }; flashcardElement.addEventListener('touchend', (e) => { e.preventDefault(); playAudio(currentCard.word, currentCard.audioUrl); }); }
        function goToPrevious() { if (currentCardIndex > 0) { currentCardIndex--; updateFlashcard(); } }
        function goToNext() { if (currentCardIndex < flashcards.length - 1) { currentCardIndex++; updateFlashcard(); } }
        document.addEventListener('DOMContentLoaded', () => { loadVoices(); if (speechSynthesis.onvoiceschanged !== undefined) { speechSynthesis.onvoiceschanged = loadVoices; } const prevBtn = document.getElementById('prevBtn'); const nextBtn = document.getElementById('nextBtn'); prevBtn.addEventListener('click', goToPrevious); prevBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToPrevious(); }); nextBtn.addEventListener('click', goToNext); nextBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToNext(); }); updateFlashcard(); document.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') { goToPrevious(); } else if (event.key === 'ArrowRight') { goToNext(); } }); let startX = 0; let startY = 0; document.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }); document.addEventListener('touchend', (e) => { if (!startX || !startY) return; const endX = e.changedTouches[0].clientX; const endY = e.changedTouches[0].clientY; const diffX = startX - endX; const diffY = startY - endY; if (Math.abs(diffX) > Math.abs(diffY)) { if (diffX > 50) { goToNext(); } else if (diffX < -50) { goToPrevious(); } } startX = 0; startY = 0; }); });
    </script>
</body>
</html>`;
}

// Function to compile PWA (Progressive Web App)
function compilePWA() {
    if (flashcards.length === 0) {
        alert('No flashcards to compile! Please add some flashcards first.');
        return;
    }
    
    // Show loading state
    const compileBtn = document.getElementById('compilePwaBtn');
    const originalText = compileBtn.textContent;
    compileBtn.textContent = 'Creating PWA...';
    compileBtn.disabled = true;
    
    // Generate PWA files
    const pwaFiles = generatePWAFiles();
    
    // Create ZIP file with PWA files
    if (typeof JSZip === 'undefined') {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = () => {
            createPWAZip(pwaFiles);
        };
        document.head.appendChild(script);
    } else {
        createPWAZip(pwaFiles);
    }
    
    function createPWAZip(files) {
        const zip = new JSZip();
        
        // Add all PWA files
        Object.keys(files).forEach(filename => {
            zip.file(filename, files[filename]);
        });
        
        // Generate ZIP file
        zip.generateAsync({type: 'blob'}).then(function(content) {
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'flashcards-pwa.zip';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset button
            compileBtn.textContent = originalText;
            compileBtn.disabled = false;
            
            const zipSizeKB = Math.round(content.size / 1024);
            alert(`PWA created successfully!\n\nFile: flashcards-pwa.zip\nCards: ${flashcards.length}\nFile size: ${zipSizeKB} KB\n\nInstructions:\n1. Extract the ZIP file\n2. Upload to a web server\n3. Open in browser\n4. Install as app!\n\nWorks on: iOS, Android, Windows, Mac`);
        });
    }
}

// Function to generate PWA files
function generatePWAFiles() {
    const embeddedCards = flashcards.map(card => ({
        id: card.id,
        word: card.word,
        image: card.image, // Embedded base64
        audioUrl: card.audioUrl
    }));
    
    const cardsData = JSON.stringify(embeddedCards);
    
    // Generate manifest.json
    const manifest = {
        "name": "Interactive Flashcards",
        "short_name": "Flashcards",
        "description": "Interactive flashcards for learning",
        "start_url": "./index.html",
        "display": "standalone",
        "background_color": "#FFD700",
        "theme_color": "#4CAF50",
        "orientation": "portrait",
        "icons": [
            {
                "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM0Q0FGNTAiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+",
                "sizes": "192x192",
                "type": "image/svg+xml"
            },
            {
                "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTEyIiBoZWlnaHQ9IjUxMiIgdmlld0JveD0iMCAwIDUxMiA1MTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI1MTIiIGhlaWdodD0iNTEyIiByeD0iNjQiIGZpbGw9IiM0Q0FGNTAiLz4KPHN2ZyB4PSIxMjgiIHk9IjEyOCIgd2lkdGg9IjI1NiIgaGVpZ2h0PSIyNTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSI+CjxwYXRoIGQ9Ik0xMiAyTDEzLjA5IDguMjZMMjAgOUwxMy4wOSAxNS43NEwxMiAyMkwxMC45MSAxNS43NEw0IDlMMTAuOTEgOC4yNkwxMiAyWiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+Cjwvc3ZnPg==",
                "sizes": "512x512",
                "type": "image/svg+xml"
            }
        ]
    };
    
    // Generate service worker
    const serviceWorker = `
const CACHE_NAME = 'flashcards-v1';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json'
];

self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request)
            .then(function(response) {
                if (response) {
                    return response;
                }
                return fetch(event.request);
            }
        )
    );
});`;

    // Generate main HTML file
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Flashcards</title>
    <link rel="manifest" href="./manifest.json">
    <meta name="theme-color" content="#4CAF50">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Flashcards">
    <link rel="apple-touch-icon" href="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM0Q0FGNTAiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: linear-gradient(to bottom, #FFD700 50%, #F5F5F5 50%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { text-align: center; max-width: 1200px; width: 100%; }
        h1 { color: #333; margin-bottom: 40px; font-size: 2.5rem; font-weight: 300; }
        .card-counter { font-size: 1.2rem; color: #666; margin-bottom: 20px; font-weight: 500; }
        .flashcard-container { display: flex; justify-content: center; align-items: center; margin: 40px 0; }
        .flashcard { width: 500px; height: 350px; background: white; border-radius: 20px; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2); cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; border: 4px solid white; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .flashcard:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2); }
        .flashcard:active { transform: scale(0.98); }
        .flashcard-image { width: 100%; height: 70%; object-fit: cover; border-radius: 12px 12px 0 0; }
        .flashcard-text { height: 30%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 600; color: #333; background: white; border-radius: 0 0 16px 16px; }
        .flashcard::after { content: '🔊'; position: absolute; top: 10px; right: 10px; font-size: 1.2rem; opacity: 0.7; transition: opacity 0.3s ease; }
        .flashcard:hover::after { opacity: 1; }
        .navigation { display: flex; justify-content: center; gap: 20px; margin-top: 30px; }
        .nav-btn { padding: 12px 24px; font-size: 1.1rem; font-weight: 600; background: #4CAF50; color: white; border: none; border-radius: 25px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .nav-btn:hover { background: #45a049; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4); }
        .nav-btn:active { transform: translateY(0); background: #3d8b40; }
        .nav-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 40px; }
        .empty-state h3 { font-size: 1.5rem; margin-bottom: 10px; color: #999; }
        .empty-state p { font-size: 1rem; color: #aaa; }
        .install-prompt { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: #4CAF50; color: white; padding: 15px 25px; border-radius: 25px; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); cursor: pointer; z-index: 1000; display: none; }
        .install-prompt:hover { background: #45a049; }
        @media (max-width: 768px) { .flashcard { width: 350px; height: 250px; } .flashcard-text { font-size: 2rem; } h1 { font-size: 2rem; } .nav-btn { padding: 10px 20px; font-size: 1rem; } }
    </style>
</head>
<body>
    <div class="container">
        <h1>Interactive Flashcards</h1>
        <div class="card-counter"><span id="currentCard">1</span> / <span id="totalCards">${flashcards.length}</span></div>
        <div class="flashcard-container"><div class="flashcard" id="currentFlashcard"></div></div>
        <div class="navigation">
            <button id="prevBtn" class="nav-btn">← Previous</button>
            <button id="nextBtn" class="nav-btn">Next →</button>
        </div>
    </div>
    <div id="installPrompt" class="install-prompt">📱 Install App</div>
    <script>
        const flashcards = ${cardsData};
        let currentCardIndex = 0;
        let selectedVoice = null;
        let voices = [];
        let deferredPrompt;
        
        function loadVoices() { voices = speechSynthesis.getVoices(); const googleVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); if (googleVoices.length > 0) { selectedVoice = googleVoices[0]; } else { const anyGoogleEnglish = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); if (anyGoogleEnglish.length > 0) { selectedVoice = anyGoogleEnglish[0]; } else { const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); if (englishVoices.length > 0) { selectedVoice = englishVoices[0]; } } } }
        function playAudio(word, audioUrl) { if ('speechSynthesis' in window) { speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(word); if (selectedVoice) { utterance.voice = selectedVoice; } utterance.lang = 'en-US'; utterance.rate = 0.9; utterance.pitch = 1.1; utterance.volume = 1.0; utterance.text = word; speechSynthesis.speak(utterance); } }
        function updateFlashcard() { if (flashcards.length === 0) { const flashcardElement = document.getElementById('currentFlashcard'); flashcardElement.innerHTML = \`<div class="empty-state"><h3>No flashcards available</h3><p>Please ask your teacher to add flashcards</p></div>\`; document.getElementById('currentCard').textContent = '0'; document.getElementById('totalCards').textContent = '0'; document.getElementById('prevBtn').disabled = true; document.getElementById('nextBtn').disabled = true; return; } const currentCard = flashcards[currentCardIndex]; const flashcardElement = document.getElementById('currentFlashcard'); flashcardElement.innerHTML = \`<img src="\${currentCard.image}" alt="\${currentCard.word}" class="flashcard-image"><div class="flashcard-text">\${currentCard.word}</div>\`; document.getElementById('currentCard').textContent = currentCardIndex + 1; document.getElementById('totalCards').textContent = flashcards.length; const prevBtn = document.getElementById('prevBtn'); const nextBtn = document.getElementById('nextBtn'); prevBtn.disabled = currentCardIndex === 0; nextBtn.disabled = currentCardIndex === flashcards.length - 1; flashcardElement.onclick = () => { playAudio(currentCard.word, currentCard.audioUrl); }; flashcardElement.addEventListener('touchend', (e) => { e.preventDefault(); playAudio(currentCard.word, currentCard.audioUrl); }); }
        function goToPrevious() { if (currentCardIndex > 0) { currentCardIndex--; updateFlashcard(); } }
        function goToNext() { if (currentCardIndex < flashcards.length - 1) { currentCardIndex++; updateFlashcard(); } }
        
        // PWA Install functionality
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            document.getElementById('installPrompt').style.display = 'block';
        });
        
        document.getElementById('installPrompt').addEventListener('click', async () => {
            if (deferredPrompt) {
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    document.getElementById('installPrompt').style.display = 'none';
                }
                deferredPrompt = null;
            }
        });
        
        document.addEventListener('DOMContentLoaded', () => { loadVoices(); if (speechSynthesis.onvoiceschanged !== undefined) { speechSynthesis.onvoiceschanged = loadVoices; } const prevBtn = document.getElementById('prevBtn'); const nextBtn = document.getElementById('nextBtn'); prevBtn.addEventListener('click', goToPrevious); prevBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToPrevious(); }); nextBtn.addEventListener('click', goToNext); nextBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToNext(); }); updateFlashcard(); document.addEventListener('keydown', (event) => { if (event.key === 'ArrowLeft') { goToPrevious(); } else if (event.key === 'ArrowRight') { goToNext(); } }); let startX = 0; let startY = 0; document.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; startY = e.touches[0].clientY; }); document.addEventListener('touchend', (e) => { if (!startX || !startY) return; const endX = e.changedTouches[0].clientX; const endY = e.changedTouches[0].clientY; const diffX = startX - endX; const diffY = startY - endY; if (Math.abs(diffX) > Math.abs(diffY)) { if (diffX > 50) { goToNext(); } else if (diffX < -50) { goToPrevious(); } } startX = 0; startY = 0; }); });
        
        // Register service worker
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then((registration) => {
                        console.log('SW registered: ', registration);
                    })
                    .catch((registrationError) => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    </script>
</body>
</html>`;

    return {
        'index.html': htmlContent,
        'manifest.json': JSON.stringify(manifest, null, 2),
        'sw.js': serviceWorker
    };
}

// Function to compile standalone file (works without web server)
function compileStandalone() {
    if (flashcards.length === 0) {
        alert('No flashcards to compile! Please add some flashcards first.');
        return;
    }
    
    // Debug: Check if images exist
    const cardsWithImages = flashcards.filter(card => card.image && card.image.length > 100);
    console.log('Total cards:', flashcards.length);
    console.log('Cards with images:', cardsWithImages.length);
    console.log('Sample image data length:', flashcards[0]?.image?.length || 0);
    
    if (cardsWithImages.length === 0) {
        alert('No images found in flashcards! Please make sure you have added cards with images.');
        return;
    }
    
    // Show loading state
    const compileBtn = document.getElementById('compileStandaloneBtn');
    const originalText = compileBtn.textContent;
    compileBtn.textContent = 'Creating Standalone...';
    compileBtn.disabled = true;
    
    // Generate standalone HTML with embedded manifest and service worker
    const standaloneHTML = generateStandaloneHTML();
    
    // Download the standalone file
    const blob = new Blob([standaloneHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'flashcards-standalone.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // Reset button
    compileBtn.textContent = originalText;
    compileBtn.disabled = false;
    
    const fileSizeKB = Math.round(blob.size / 1024);
    alert(`Standalone file created successfully!\n\nFile: flashcards-standalone.html\nCards: ${flashcards.length}\nCards with images: ${cardsWithImages.length}\nFile size: ${fileSizeKB} KB\n\n✅ Works completely offline\n✅ No web server needed\n✅ Send via email/WhatsApp\n✅ Double-click to open\n\nPerfect for direct file sharing!`);
}

// Function to generate standalone HTML with embedded PWA features
function generateStandaloneHTML() {
    const embeddedCards = flashcards.map(card => ({
        id: card.id,
        word: card.word,
        image: card.image, // Embedded base64
        audioUrl: card.audioUrl
    }));
    
    // Debug: Log first card's image data
    console.log('First card image preview:', embeddedCards[0]?.image?.substring(0, 100) + '...');
    console.log('First card image length:', embeddedCards[0]?.image?.length || 0);
    
    const cardsData = JSON.stringify(embeddedCards);
    
    // Embedded manifest as data URI
    const manifest = {
        "name": "Interactive Flashcards",
        "short_name": "Flashcards",
        "description": "Interactive flashcards for learning",
        "start_url": "./",
        "display": "standalone",
        "background_color": "#FFD700",
        "theme_color": "#4CAF50",
        "orientation": "portrait",
        "icons": [
            {
                "src": "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyIiBoZWlnaHQ9IjE5MiIgdmlld0JveD0iMCAwIDE5MiAxOTIiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxOTIiIGhlaWdodD0iMTkyIiByeD0iMjQiIGZpbGw9IiM0Q0FGNTAiLz4KPHN2ZyB4PSI0OCIgeT0iNDgiIHdpZHRoPSI5NiIgaGVpZ2h0PSI5NiIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4KPC9zdmc+",
                "sizes": "192x192",
                "type": "image/svg+xml"
            }
        ]
    };
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Flashcards</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; background: linear-gradient(to bottom, #FFD700 50%, #F5F5F5 50%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 20px; }
        .container { text-align: center; max-width: 1200px; width: 100%; }
        h1 { color: #333; margin-bottom: 40px; font-size: 2.5rem; font-weight: 300; }
        .card-counter { font-size: 1.2rem; color: #666; margin-bottom: 20px; font-weight: 500; }
        .flashcard-container { display: flex; justify-content: center; align-items: center; margin: 40px 0; }
        .flashcard { width: 500px; height: 350px; background: white; border-radius: 20px; box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2); cursor: pointer; transition: all 0.3s ease; position: relative; overflow: hidden; border: 4px solid white; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .flashcard:hover { transform: translateY(-5px); box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2); }
        .flashcard:active { transform: scale(0.98); }
        .flashcard-image { width: 100%; height: 70%; object-fit: cover; border-radius: 12px 12px 0 0; }
        .flashcard-text { height: 30%; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; font-weight: 600; color: #333; background: white; border-radius: 0 0 16px 16px; }
        .flashcard::after { content: '🔊'; position: absolute; top: 10px; right: 10px; font-size: 1.2rem; opacity: 0.7; transition: opacity 0.3s ease; }
        .flashcard:hover::after { opacity: 1; }
        .navigation { display: flex; justify-content: center; gap: 20px; margin-top: 30px; }
        .nav-btn { padding: 12px 24px; font-size: 1.1rem; font-weight: 600; background: #4CAF50; color: white; border: none; border-radius: 25px; cursor: pointer; transition: all 0.3s ease; box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3); -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .nav-btn:hover { background: #45a049; transform: translateY(-2px); box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4); }
        .nav-btn:active { transform: translateY(0); background: #3d8b40; }
        .nav-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 40px; }
        .empty-state h3 { font-size: 1.5rem; margin-bottom: 10px; color: #999; }
        .empty-state p { font-size: 1rem; color: #aaa; }
        .debug-info { position: fixed; top: 10px; right: 10px; background: rgba(0,0,0,0.8); color: white; padding: 10px; border-radius: 5px; font-size: 12px; z-index: 1000; }
        @media (max-width: 768px) { .flashcard { width: 350px; height: 250px; } .flashcard-text { font-size: 2rem; } h1 { font-size: 2rem; } .nav-btn { padding: 10px 20px; font-size: 1rem; } }
    </style>
</head>
<body>
    <div class="debug-info" id="debugInfo">Loading...</div>
    <div class="container">
        <h1>Interactive Flashcards</h1>
        <div class="card-counter"><span id="currentCard">1</span> / <span id="totalCards">${flashcards.length}</span></div>
        <div class="flashcard-container"><div class="flashcard" id="currentFlashcard"></div></div>
        <div class="navigation">
            <button id="prevBtn" class="nav-btn">← Previous</button>
            <button id="nextBtn" class="nav-btn">Next →</button>
        </div>
    </div>
    <script>
        // Debug info
        console.log('Standalone flashcards loaded');
        console.log('Total cards:', ${flashcards.length});
        
        const flashcards = ${cardsData};
        let currentCardIndex = 0;
        let selectedVoice = null;
        let voices = [];
        
        // Debug: Check first card
        console.log('First card:', flashcards[0]);
        console.log('First card image length:', flashcards[0]?.image?.length || 0);
        console.log('First card image preview:', flashcards[0]?.image?.substring(0, 50) + '...');
        
        function loadVoices() { 
            voices = speechSynthesis.getVoices(); 
            const googleVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); 
            if (googleVoices.length > 0) { 
                selectedVoice = googleVoices[0]; 
            } else { 
                const anyGoogleEnglish = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); 
                if (anyGoogleEnglish.length > 0) { 
                    selectedVoice = anyGoogleEnglish[0]; 
                } else { 
                    const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); 
                    if (englishVoices.length > 0) { 
                        selectedVoice = englishVoices[0]; 
                    } 
                } 
            } 
        }
        
        function playAudio(word, audioUrl) { 
            console.log('Playing audio for:', word);
            if ('speechSynthesis' in window) { 
                speechSynthesis.cancel(); 
                const utterance = new SpeechSynthesisUtterance(word); 
                if (selectedVoice) { 
                    utterance.voice = selectedVoice; 
                } 
                utterance.lang = 'en-US'; 
                utterance.rate = 0.9; 
                utterance.pitch = 1.1; 
                utterance.volume = 1.0; 
                utterance.text = word; 
                speechSynthesis.speak(utterance); 
            } 
        }
        
        function updateFlashcard() { 
            console.log('Updating flashcard, index:', currentCardIndex);
            if (flashcards.length === 0) { 
                const flashcardElement = document.getElementById('currentFlashcard'); 
                flashcardElement.innerHTML = \`<div class="empty-state"><h3>No flashcards available</h3><p>Please ask your teacher to add flashcards</p></div>\`; 
                document.getElementById('currentCard').textContent = '0'; 
                document.getElementById('totalCards').textContent = '0'; 
                document.getElementById('prevBtn').disabled = true; 
                document.getElementById('nextBtn').disabled = true; 
                return; 
            } 
            const currentCard = flashcards[currentCardIndex]; 
            console.log('Current card:', currentCard);
            const flashcardElement = document.getElementById('currentFlashcard'); 
            flashcardElement.innerHTML = \`<img src="\${currentCard.image}" alt="\${currentCard.word}" class="flashcard-image"><div class="flashcard-text">\${currentCard.word}</div>\`; 
            document.getElementById('currentCard').textContent = currentCardIndex + 1; 
            document.getElementById('totalCards').textContent = flashcards.length; 
            const prevBtn = document.getElementById('prevBtn'); 
            const nextBtn = document.getElementById('nextBtn'); 
            prevBtn.disabled = currentCardIndex === 0; 
            nextBtn.disabled = currentCardIndex === flashcards.length - 1; 
            flashcardElement.onclick = () => { playAudio(currentCard.word, currentCard.audioUrl); }; 
            flashcardElement.addEventListener('touchend', (e) => { e.preventDefault(); playAudio(currentCard.word, currentCard.audioUrl); }); 
            
            // Update debug info
            document.getElementById('debugInfo').textContent = \`Card \${currentCardIndex + 1}/\${flashcards.length} | Image: \${currentCard.image ? 'Yes' : 'No'}\`;
        }
        
        function goToPrevious() { 
            if (currentCardIndex > 0) { 
                currentCardIndex--; 
                updateFlashcard(); 
            } 
        }
        
        function goToNext() { 
            if (currentCardIndex < flashcards.length - 1) { 
                currentCardIndex++; 
                updateFlashcard(); 
            } 
        }
        
        document.addEventListener('DOMContentLoaded', () => { 
            console.log('DOM loaded, initializing...');
            loadVoices(); 
            if (speechSynthesis.onvoiceschanged !== undefined) { 
                speechSynthesis.onvoiceschanged = loadVoices; 
            } 
            const prevBtn = document.getElementById('prevBtn'); 
            const nextBtn = document.getElementById('nextBtn'); 
            prevBtn.addEventListener('click', goToPrevious); 
            prevBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToPrevious(); }); 
            nextBtn.addEventListener('click', goToNext); 
            nextBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToNext(); }); 
            updateFlashcard(); 
            document.addEventListener('keydown', (event) => { 
                if (event.key === 'ArrowLeft') { 
                    goToPrevious(); 
                } else if (event.key === 'ArrowRight') { 
                    goToNext(); 
                } 
            }); 
            let startX = 0; 
            let startY = 0; 
            document.addEventListener('touchstart', (e) => { 
                startX = e.touches[0].clientX; 
                startY = e.touches[0].clientY; 
            }); 
            document.addEventListener('touchend', (e) => { 
                if (!startX || !startY) return; 
                const endX = e.changedTouches[0].clientX; 
                const endY = e.changedTouches[0].clientY; 
                const diffX = startX - endX; 
                const diffY = startY - endY; 
                if (Math.abs(diffX) > Math.abs(diffY)) { 
                    if (diffX > 50) { 
                        goToNext(); 
                    } else if (diffX < -50) { 
                        goToPrevious(); 
                    } 
                } 
                startX = 0; 
                startY = 0; 
            }); 
        });
    </script>
</body>
</html>`;
}

// Function to compile for mobile devices (creates shareable link)
function compileMobile() {
    if (flashcards.length === 0) {
        alert('No flashcards to compile! Please add some flashcards first.');
        return;
    }
    
    // Show loading state
    const compileBtn = document.getElementById('compileMobileBtn');
    const originalText = compileBtn.textContent;
    compileBtn.textContent = 'Creating Mobile Link...';
    compileBtn.disabled = true;
    
    // Generate mobile-optimized HTML
    const mobileHTML = generateMobileHTML();
    
    // Create a data URL that can be shared
    const dataURL = 'data:text/html;charset=utf-8,' + encodeURIComponent(mobileHTML);
    
    // Create a temporary link to copy
    const tempLink = document.createElement('textarea');
    tempLink.value = dataURL;
    document.body.appendChild(tempLink);
    tempLink.select();
    document.execCommand('copy');
    document.body.removeChild(tempLink);
    
    // Reset button
    compileBtn.textContent = originalText;
    compileBtn.disabled = false;
    
    const fileSizeKB = Math.round(new Blob([mobileHTML]).size / 1024);
    
    // Show instructions
    alert(`Mobile link created successfully!\n\nCards: ${flashcards.length}\nFile size: ${fileSizeKB} KB\n\n📱 MOBILE INSTRUCTIONS:\n\n1. The link has been copied to your clipboard\n2. Send it via WhatsApp/Email/SMS\n3. Students click the link to open directly\n4. Works on ALL mobile devices!\n\n✅ No file downloads needed\n✅ Works on iOS, Android\n✅ Opens directly in browser\n✅ Perfect for mobile sharing!`);
}

// Function to generate mobile-optimized HTML
function generateMobileHTML() {
    const embeddedCards = flashcards.map(card => ({
        id: card.id,
        word: card.word,
        image: card.image, // Embedded base64
        audioUrl: card.audioUrl
    }));
    
    const cardsData = JSON.stringify(embeddedCards);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Interactive Flashcards</title>
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="default">
    <meta name="apple-mobile-web-app-title" content="Flashcards">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#4CAF50">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(to bottom, #FFD700 50%, #F5F5F5 50%); min-height: 100vh; display: flex; justify-content: center; align-items: center; padding: 10px; touch-action: manipulation; }
        .container { text-align: center; max-width: 100%; width: 100%; }
        h1 { color: #333; margin-bottom: 20px; font-size: 1.8rem; font-weight: 300; }
        .card-counter { font-size: 1rem; color: #666; margin-bottom: 15px; font-weight: 500; }
        .flashcard-container { display: flex; justify-content: center; align-items: center; margin: 20px 0; }
        .flashcard { width: 90vw; max-width: 400px; height: 60vh; max-height: 300px; background: white; border-radius: 15px; box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15); cursor: pointer; transition: all 0.2s ease; position: relative; overflow: hidden; border: 3px solid white; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
        .flashcard:active { transform: scale(0.98); }
        .flashcard-image { width: 100%; height: 70%; object-fit: cover; border-radius: 10px 10px 0 0; }
        .flashcard-text { height: 30%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 600; color: #333; background: white; border-radius: 0 0 12px 12px; }
        .flashcard::after { content: '🔊'; position: absolute; top: 8px; right: 8px; font-size: 1rem; opacity: 0.7; }
        .navigation { display: flex; justify-content: center; gap: 15px; margin-top: 20px; }
        .nav-btn { padding: 12px 20px; font-size: 1rem; font-weight: 600; background: #4CAF50; color: white; border: none; border-radius: 20px; cursor: pointer; transition: all 0.2s ease; box-shadow: 0 3px 10px rgba(76, 175, 80, 0.3); -webkit-tap-highlight-color: transparent; touch-action: manipulation; min-width: 100px; }
        .nav-btn:active { transform: scale(0.95); background: #3d8b40; }
        .nav-btn:disabled { background: #ccc; cursor: not-allowed; transform: none; box-shadow: none; }
        .empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #666; text-align: center; padding: 30px; }
        .empty-state h3 { font-size: 1.3rem; margin-bottom: 10px; color: #999; }
        .empty-state p { font-size: 0.9rem; color: #aaa; }
        .install-hint { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(76, 175, 80, 0.9); color: white; padding: 10px 20px; border-radius: 20px; font-size: 0.9rem; text-align: center; max-width: 90%; }
        @media (max-width: 480px) { 
            h1 { font-size: 1.5rem; margin-bottom: 15px; }
            .flashcard { width: 95vw; height: 55vh; }
            .flashcard-text { font-size: 1.5rem; }
            .nav-btn { padding: 10px 16px; font-size: 0.9rem; min-width: 80px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Interactive Flashcards</h1>
        <div class="card-counter"><span id="currentCard">1</span> / <span id="totalCards">${flashcards.length}</span></div>
        <div class="flashcard-container"><div class="flashcard" id="currentFlashcard"></div></div>
        <div class="navigation">
            <button id="prevBtn" class="nav-btn">← Previous</button>
            <button id="nextBtn" class="nav-btn">Next →</button>
        </div>
    </div>
    <div class="install-hint">💡 Tap card to hear pronunciation</div>
    <script>
        const flashcards = ${cardsData};
        let currentCardIndex = 0;
        let selectedVoice = null;
        let voices = [];
        
        function loadVoices() { 
            voices = speechSynthesis.getVoices(); 
            const googleVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); 
            if (googleVoices.length > 0) { 
                selectedVoice = googleVoices[0]; 
            } else { 
                const anyGoogleEnglish = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); 
                if (anyGoogleEnglish.length > 0) { 
                    selectedVoice = anyGoogleEnglish[0]; 
                } else { 
                    const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); 
                    if (englishVoices.length > 0) { 
                        selectedVoice = englishVoices[0]; 
                    } 
                } 
            } 
        }
        
        function playAudio(word) { 
            if ('speechSynthesis' in window) { 
                speechSynthesis.cancel(); 
                const utterance = new SpeechSynthesisUtterance(word); 
                if (selectedVoice) { 
                    utterance.voice = selectedVoice; 
                } 
                utterance.lang = 'en-US'; 
                utterance.rate = 0.9; 
                utterance.pitch = 1.1; 
                utterance.volume = 1.0; 
                speechSynthesis.speak(utterance); 
            } 
        }
        
        function updateFlashcard() { 
            if (flashcards.length === 0) { 
                const flashcardElement = document.getElementById('currentFlashcard'); 
                flashcardElement.innerHTML = \`<div class="empty-state"><h3>No flashcards available</h3><p>Please ask your teacher to add flashcards</p></div>\`; 
                document.getElementById('currentCard').textContent = '0'; 
                document.getElementById('totalCards').textContent = '0'; 
                document.getElementById('prevBtn').disabled = true; 
                document.getElementById('nextBtn').disabled = true; 
                return; 
            } 
            const currentCard = flashcards[currentCardIndex]; 
            const flashcardElement = document.getElementById('currentFlashcard'); 
            flashcardElement.innerHTML = \`<img src="\${currentCard.image}" alt="\${currentCard.word}" class="flashcard-image"><div class="flashcard-text">\${currentCard.word}</div>\`; 
            document.getElementById('currentCard').textContent = currentCardIndex + 1; 
            document.getElementById('totalCards').textContent = flashcards.length; 
            const prevBtn = document.getElementById('prevBtn'); 
            const nextBtn = document.getElementById('nextBtn'); 
            prevBtn.disabled = currentCardIndex === 0; 
            nextBtn.disabled = currentCardIndex === flashcards.length - 1; 
            
            // Add touch events for mobile
            flashcardElement.onclick = () => { playAudio(currentCard.word); };
            flashcardElement.ontouchend = (e) => { e.preventDefault(); playAudio(currentCard.word); };
        }
        
        function goToPrevious() { 
            if (currentCardIndex > 0) { 
                currentCardIndex--; 
                updateFlashcard(); 
            } 
        }
        
        function goToNext() { 
            if (currentCardIndex < flashcards.length - 1) { 
                currentCardIndex++; 
                updateFlashcard(); 
            } 
        }
        
        document.addEventListener('DOMContentLoaded', () => { 
            loadVoices(); 
            if (speechSynthesis.onvoiceschanged !== undefined) { 
                speechSynthesis.onvoiceschanged = loadVoices; 
            } 
            const prevBtn = document.getElementById('prevBtn'); 
            const nextBtn = document.getElementById('nextBtn'); 
            prevBtn.addEventListener('click', goToPrevious); 
            prevBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToPrevious(); }); 
            nextBtn.addEventListener('click', goToNext); 
            nextBtn.addEventListener('touchend', (e) => { e.preventDefault(); goToNext(); }); 
            updateFlashcard(); 
            
            // Swipe support for mobile
            let startX = 0; 
            let startY = 0; 
            document.addEventListener('touchstart', (e) => { 
                startX = e.touches[0].clientX; 
                startY = e.touches[0].clientY; 
            }); 
            document.addEventListener('touchend', (e) => { 
                if (!startX || !startY) return; 
                const endX = e.changedTouches[0].clientX; 
                const endY = e.changedTouches[0].clientY; 
                const diffX = startX - endX; 
                const diffY = startY - endY; 
                if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) { 
                    if (diffX > 0) { 
                        goToNext(); 
                    } else { 
                        goToPrevious(); 
                    } 
                } 
                startX = 0; 
                startY = 0; 
            }); 
        });
    </script>
</body>
</html>`;
}

// Function to generate standalone student HTML
function generateStudentHTML() {
    // Create a copy of flashcards with properly embedded images
    const embeddedCards = flashcards.map(card => ({
        id: card.id,
        word: card.word,
        image: card.image, // This is already base64 data
        audioUrl: card.audioUrl
    }));
    
    const cardsData = JSON.stringify(embeddedCards);
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Interactive Flashcards</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', sans-serif;
            background: linear-gradient(to bottom, #FFD700 50%, #F5F5F5 50%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            text-align: center;
            max-width: 1200px;
            width: 100%;
        }

        h1 {
            color: #333;
            margin-bottom: 40px;
            font-size: 2.5rem;
            font-weight: 300;
        }

        .card-counter {
            font-size: 1.2rem;
            color: #666;
            margin-bottom: 20px;
            font-weight: 500;
        }

        .flashcard-container {
            display: flex;
            justify-content: center;
            align-items: center;
            margin: 40px 0;
        }

        .flashcard {
            width: 500px;
            height: 350px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 12px 35px rgba(0, 0, 0, 0.2);
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            border: 4px solid white;
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }

        .flashcard:hover {
            transform: translateY(-5px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }

        .flashcard:active {
            transform: scale(0.98);
        }

        .flashcard-image {
            width: 100%;
            height: 70%;
            object-fit: cover;
            border-radius: 12px 12px 0 0;
        }

        .flashcard-text {
            height: 30%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2.5rem;
            font-weight: 600;
            color: #333;
            background: white;
            border-radius: 0 0 16px 16px;
        }

        .flashcard:active {
            transform: scale(0.98);
        }

        .flashcard::after {
            content: '🔊';
            position: absolute;
            top: 10px;
            right: 10px;
            font-size: 1.2rem;
            opacity: 0.7;
            transition: opacity 0.3s ease;
        }

        .flashcard:hover::after {
            opacity: 1;
        }

        .navigation {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-top: 30px;
        }

        .nav-btn {
            padding: 12px 24px;
            font-size: 1.1rem;
            font-weight: 600;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(76, 175, 80, 0.3);
            -webkit-tap-highlight-color: transparent;
            touch-action: manipulation;
        }

        .nav-btn:hover {
            background: #45a049;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(76, 175, 80, 0.4);
        }

        .nav-btn:active {
            transform: translateY(0);
            background: #3d8b40;
        }

        .nav-btn:disabled {
            background: #ccc;
            cursor: not-allowed;
            transform: none;
            box-shadow: none;
        }

        .empty-state {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            color: #666;
            text-align: center;
            padding: 40px;
        }

        .empty-state h3 {
            font-size: 1.5rem;
            margin-bottom: 10px;
            color: #999;
        }

        .empty-state p {
            font-size: 1rem;
            color: #aaa;
        }

        @media (max-width: 768px) {
            .flashcard {
                width: 350px;
                height: 250px;
            }
            
            .flashcard-text {
                font-size: 2rem;
            }
            
            h1 {
                font-size: 2rem;
            }
            
            .nav-btn {
                padding: 10px 20px;
                font-size: 1rem;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Interactive Flashcards</h1>
        <div class="card-counter">
            <span id="currentCard">1</span> / <span id="totalCards">${flashcards.length}</span>
        </div>
        
        <div class="flashcard-container">
            <div class="flashcard" id="currentFlashcard">
                <!-- Current flashcard will be displayed here -->
            </div>
        </div>
        <div class="navigation">
            <button id="prevBtn" class="nav-btn">← Previous</button>
            <button id="nextBtn" class="nav-btn">Next →</button>
        </div>
    </div>
    
    <script>
        // Flashcard data embedded in the file
        const flashcards = ${cardsData};
        let currentCardIndex = 0;
        let selectedVoice = null;
        let voices = [];

        // Load available voices and set Google US English as default
        function loadVoices() {
            voices = speechSynthesis.getVoices();
            
            // Look specifically for Google US English voices
            const googleVoices = voices.filter(voice => 
                voice.name.includes('Google') && 
                (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))
            );
            
            if (googleVoices.length > 0) {
                selectedVoice = googleVoices[0];
            } else {
                const anyGoogleEnglish = voices.filter(voice => 
                    voice.name.includes('Google') && voice.lang.startsWith('en')
                );
                
                if (anyGoogleEnglish.length > 0) {
                    selectedVoice = anyGoogleEnglish[0];
                } else {
                    const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
                    if (englishVoices.length > 0) {
                        selectedVoice = englishVoices[0];
                    }
                }
            }
        }

        // Function to play audio pronunciation
        function playAudio(word, audioUrl) {
            if ('speechSynthesis' in window) {
                speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(word);
                
                if (selectedVoice) {
                    utterance.voice = selectedVoice;
                }
                
                utterance.lang = 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.1;
                utterance.volume = 1.0;
                utterance.text = word;
                
                speechSynthesis.speak(utterance);
            }
        }

        // Function to update the displayed flashcard
        function updateFlashcard() {
            if (flashcards.length === 0) {
                const flashcardElement = document.getElementById('currentFlashcard');
                flashcardElement.innerHTML = \`
                    <div class="empty-state">
                        <h3>No flashcards available</h3>
                        <p>Please ask your teacher to add flashcards</p>
                    </div>
                \`;
                
                document.getElementById('currentCard').textContent = '0';
                document.getElementById('totalCards').textContent = '0';
                document.getElementById('prevBtn').disabled = true;
                document.getElementById('nextBtn').disabled = true;
                return;
            }
            
            const currentCard = flashcards[currentCardIndex];
            const flashcardElement = document.getElementById('currentFlashcard');
            
            flashcardElement.innerHTML = \`
                <img src="\${currentCard.image}" alt="\${currentCard.word}" class="flashcard-image">
                <div class="flashcard-text">\${currentCard.word}</div>
            \`;
            
            document.getElementById('currentCard').textContent = currentCardIndex + 1;
            document.getElementById('totalCards').textContent = flashcards.length;
            
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.disabled = currentCardIndex === 0;
            nextBtn.disabled = currentCardIndex === flashcards.length - 1;
            
            // Add both click and touch events for mobile compatibility
            flashcardElement.onclick = () => {
                playAudio(currentCard.word, currentCard.audioUrl);
            };
            
            flashcardElement.addEventListener('touchend', (e) => {
                e.preventDefault();
                playAudio(currentCard.word, currentCard.audioUrl);
            });
        }

        // Navigation functions
        function goToPrevious() {
            if (currentCardIndex > 0) {
                currentCardIndex--;
                updateFlashcard();
            }
        }

        function goToNext() {
            if (currentCardIndex < flashcards.length - 1) {
                currentCardIndex++;
                updateFlashcard();
            }
        }

        // Initialize the app
        document.addEventListener('DOMContentLoaded', () => {
            loadVoices();
            
            if (speechSynthesis.onvoiceschanged !== undefined) {
                speechSynthesis.onvoiceschanged = loadVoices;
            }
            
            // Add both click and touch events for mobile compatibility
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.addEventListener('click', goToPrevious);
            prevBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                goToPrevious();
            });
            
            nextBtn.addEventListener('click', goToNext);
            nextBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                goToNext();
            });
            
            updateFlashcard();
            
            document.addEventListener('keydown', (event) => {
                if (event.key === 'ArrowLeft') {
                    goToPrevious();
                } else if (event.key === 'ArrowRight') {
                    goToNext();
                }
            });
            
            // Add swipe support for mobile
            let startX = 0;
            let startY = 0;
            
            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
                startY = e.touches[0].clientY;
            });
            
            document.addEventListener('touchend', (e) => {
                if (!startX || !startY) return;
                
                const endX = e.changedTouches[0].clientX;
                const endY = e.changedTouches[0].clientY;
                
                const diffX = startX - endX;
                const diffY = startY - endY;
                
                // Only trigger if horizontal swipe is greater than vertical
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX > 50) {
                        // Swipe left - go to next
                        goToNext();
                    } else if (diffX < -50) {
                        // Swipe right - go to previous
                        goToPrevious();
                    }
                }
                
                startX = 0;
                startY = 0;
            });
        });
    </script>
</body>
</html>`;
}

// Function to delete card from grid view
function deleteCardFromGrid(index) {
    if (confirm('Are you sure you want to delete this card?')) {
        flashcards.splice(index, 1);
        saveFlashcards();
        renderGridView();
        
        // Update single view if it's currently showing
        if (currentViewMode === 'single') {
            if (currentCardIndex >= flashcards.length) {
                currentCardIndex = flashcards.length - 1;
            }
            updateFlashcard();
        }
    }
}

// Function to upload image to Vercel Blob Storage
async function uploadToBlob(imageData, filename) {
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                imageData: imageData,
                filename: filename
            })
        });

        if (!response.ok) {
            throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Upload failed');
        }

        return result.url;
    } catch (error) {
        console.error('Blob upload error:', error);
        throw error;
    }
}

// Function to compress image before storing
function compressImage(file, maxWidth = 300, maxHeight = 225, quality = 0.7) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Calculate new dimensions
            let { width, height } = img;
            if (width > height) {
                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedDataUrl);
        };
        
        img.src = URL.createObjectURL(file);
    });
}

// Function to save flashcards to API (shared storage)
async function saveFlashcards() {
    try {
        const response = await fetch('/api/flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                flashcards: flashcards,
                nextId: nextId
            })
        });

        if (!response.ok) {
            throw new Error(`Save failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Save failed');
        }

        console.log('Flashcards saved to shared storage');
    } catch (error) {
        console.error('Error saving flashcards:', error);
        alert('Error saving flashcards. Please try again.');
    }
}

// Function to load flashcards from API (shared storage)
async function loadFlashcards() {
    try {
        const response = await fetch('/api/flashcards');
        
        if (!response.ok) {
            throw new Error(`Load failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.flashcards) {
            flashcards = result.flashcards;
            nextId = flashcards.length > 0 ? Math.max(...flashcards.map(card => card.id)) + 1 : 1;
        } else {
            flashcards = [];
            nextId = 1;
        }
    } catch (error) {
        console.error('Error loading flashcards:', error);
        // Fallback to empty array
        flashcards = [];
        nextId = 1;
    }
}

// Function to add a new flashcard
function addFlashcard(word, imageFile) {
    if (!word.trim()) {
        alert('Please enter a word');
        return;
    }
    
    if (!imageFile) {
        alert('Please select an image');
        return;
    }
    
    // Show loading state
    const addBtn = document.getElementById('addCardBtn');
    const originalText = addBtn.textContent;
    addBtn.textContent = 'Compressing...';
    addBtn.disabled = true;
    
    // Compress image and upload to Vercel Blob
    compressImage(imageFile).then(compressedImage => {
        // Generate unique filename
        const filename = `flashcard-${nextId}-${Date.now()}.jpg`;
        
        // Upload to Vercel Blob
        addBtn.textContent = 'Uploading...';
        uploadToBlob(compressedImage, filename).then(async (blobUrl) => {
            const newCard = {
                id: nextId++,
                word: word.trim(),
                image: blobUrl, // Store the Blob URL instead of base64
                audioUrl: '' // Will use text-to-speech
            };
            
            flashcards.push(newCard);
            
            // Wait for save to complete before proceeding
            try {
                await saveFlashcards();
                
                // Refresh grid view
                renderGridView();
                
                // Clear form
                document.getElementById('wordInput').value = '';
                document.getElementById('imageInput').value = '';
                document.getElementById('imagePreview').innerHTML = '';
                
                // Reset button
                addBtn.textContent = originalText;
                addBtn.disabled = false;
                
                alert('Card added successfully!');
            } catch (saveError) {
                console.error('Error saving flashcard:', saveError);
                alert('Card added but failed to save to shared storage. Please try again.');
                
                // Reset button
                addBtn.textContent = originalText;
                addBtn.disabled = false;
            }
        }).catch(uploadError => {
            console.error('Error uploading to Blob:', uploadError);
            alert('Error uploading image. Please try again.');
            
            // Reset button
            addBtn.textContent = originalText;
            addBtn.disabled = false;
        });
    }).catch(error => {
        console.error('Error compressing image:', error);
        alert('Error processing image. Please try a different image.');
        
        // Reset button
        addBtn.textContent = originalText;
        addBtn.disabled = false;
    });
}

// Function to delete current flashcard
function deleteCurrentCard() {
    if (confirm('Are you sure you want to delete this card?')) {
        flashcards.splice(currentCardIndex, 1);
        
        // Adjust current index if needed
        if (currentCardIndex >= flashcards.length) {
            currentCardIndex = flashcards.length - 1;
        }
        
        saveFlashcards();
        updateFlashcard();
    }
}

// Function to update the displayed flashcard
function updateFlashcard() {
    if (flashcards.length === 0) {
        // Handle empty state
        const flashcardElement = document.getElementById('currentFlashcard');
        flashcardElement.innerHTML = `
            <div class="empty-state">
                <h3>No flashcards available</h3>
                <p>Add a new flashcard using the form above</p>
            </div>
        `;
        
        // Update card counter
        document.getElementById('currentCard').textContent = '0';
        document.getElementById('totalCards').textContent = '0';
        
        // Disable navigation buttons
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        document.getElementById('deleteBtn').disabled = true;
        
        return;
    }
    
    const currentCard = flashcards[currentCardIndex];
    const flashcardElement = document.getElementById('currentFlashcard');
    
    flashcardElement.innerHTML = `
        <img src="${currentCard.image}" alt="${currentCard.word}" class="flashcard-image">
        <div class="flashcard-text">${currentCard.word}</div>
    `;
    
    // Update card counter
    document.getElementById('currentCard').textContent = currentCardIndex + 1;
    document.getElementById('totalCards').textContent = flashcards.length;
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = currentCardIndex === flashcards.length - 1;
    deleteBtn.disabled = false;
    
    // Add click event to play audio
    flashcardElement.onclick = () => {
        playAudio(currentCard.word, currentCard.audioUrl);
    };
}

// Voice settings
let selectedVoice = null;
let voices = [];

// Load available voices and set Google US English as default
function loadVoices() {
    voices = speechSynthesis.getVoices();
    
    // Look specifically for Google US English voices
    const googleVoices = voices.filter(voice => 
        voice.name.includes('Google') && 
        (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))
    );
    
    if (googleVoices.length > 0) {
        // Prefer Google US English voices
        selectedVoice = googleVoices[0];
        console.log('Using Google US English voice:', selectedVoice.name);
    } else {
        // Fallback to any Google English voice
        const anyGoogleEnglish = voices.filter(voice => 
            voice.name.includes('Google') && voice.lang.startsWith('en')
        );
        
        if (anyGoogleEnglish.length > 0) {
            selectedVoice = anyGoogleEnglish[0];
            console.log('Using Google English voice:', selectedVoice.name);
        } else {
            // Final fallback to any English voice
            const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
            if (englishVoices.length > 0) {
                selectedVoice = englishVoices[0];
                console.log('Using fallback English voice:', selectedVoice.name);
            }
        }
    }
}

// Function to play audio pronunciation with improved voice
function playAudio(word, audioUrl) {
    if ('speechSynthesis' in window) {
        // Stop any current speech
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(word);
        
        // Use selected voice if available
        if (selectedVoice) {
            utterance.voice = selectedVoice;
        }
        
        // Optimized voice settings for natural speech
        utterance.lang = 'en-US';
        utterance.rate = 0.9;        // Slightly slower for clarity
        utterance.pitch = 1.1;       // Slightly higher pitch for warmth
        utterance.volume = 1.0;       // Full volume
        
        // Add natural pauses and emphasis
        utterance.text = word;
        
        // Event handlers for better control
        utterance.onstart = () => {
            console.log('Speaking:', word);
        };
        
        utterance.onerror = (event) => {
            console.log('Speech error:', event.error);
        };
        
        speechSynthesis.speak(utterance);
    } else {
        // Fallback to audio file
        const audio = new Audio(audioUrl);
        audio.play().catch(error => {
            console.log('Audio playback failed:', error);
        });
    }
}

// Navigation functions
function goToPrevious() {
    if (currentCardIndex > 0) {
        currentCardIndex--;
        updateFlashcard();
    }
}

function goToNext() {
    if (currentCardIndex < flashcards.length - 1) {
        currentCardIndex++;
        updateFlashcard();
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved flashcards
    await loadFlashcards();
    
    // Load voices immediately
    loadVoices();
    
    // Load voices again when they become available (some browsers load them asynchronously)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Initialize with grid view only
    renderGridView();
    
    // Set up image preview
    document.getElementById('imageInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').innerHTML = 
                    `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Set up add card button
    document.getElementById('addCardBtn').addEventListener('click', function() {
        const word = document.getElementById('wordInput').value;
        const imageFile = document.getElementById('imageInput').files[0];
        addFlashcard(word, imageFile);
    });
    
    // Set up navigation buttons (only if they exist)
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', goToPrevious);
    if (nextBtn) nextBtn.addEventListener('click', goToNext);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCurrentCard);
    
    // Initialize with grid view
    renderGridView();
    
    // Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            goToPrevious();
        } else if (event.key === 'ArrowRight') {
            goToNext();
        }
    });
});
