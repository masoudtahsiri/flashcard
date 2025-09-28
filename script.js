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

// Current flashcards (starts with defaults, can be modified)
let flashcards = [...defaultFlashcards];

// Current card index
let currentCardIndex = 0;

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
            console.log('Flashcards loaded from shared storage:', flashcards.length);
        } else {
            flashcards = []; // Start with empty array, no default cards
        }
    } catch (error) {
        console.error('Error loading flashcards:', error);
        // Fallback to empty array
        flashcards = [];
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
                <p>Please ask your teacher to add flashcards</p>
            </div>
        `;
        
        // Update card counter
        document.getElementById('currentCard').textContent = '0';
        document.getElementById('totalCards').textContent = '0';
        
        // Disable navigation buttons
        document.getElementById('prevBtn').disabled = true;
        document.getElementById('nextBtn').disabled = true;
        
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
    
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = currentCardIndex === flashcards.length - 1;
    
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

// Function to refresh flashcards from API
async function refreshFlashcards() {
    const oldCount = flashcards.length;
    await loadFlashcards();
    
    console.log('Refresh: Old count:', oldCount, 'New count:', flashcards.length);
    
    // If new cards were added, update the display
    if (flashcards.length > oldCount) {
        updateFlashcard();
        console.log('New flashcards loaded from teacher!');
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
    
    // Set up navigation buttons
    document.getElementById('prevBtn').addEventListener('click', goToPrevious);
    document.getElementById('nextBtn').addEventListener('click', goToNext);
    
    // Initialize with first card
    updateFlashcard();
    
    // Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            goToPrevious();
        } else if (event.key === 'ArrowRight') {
            goToNext();
        }
    });
    
    // Check for new flashcards every 2 seconds (in case teacher adds cards)
    setInterval(refreshFlashcards, 2000);
});