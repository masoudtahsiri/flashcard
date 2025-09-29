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

// Current flashcards and groups (starts with defaults, can be modified)
let flashcards = [...defaultFlashcards];
let groups = [];
let currentGroupId = null;
let currentGroupCards = [];
let currentCardIndex = 0;

// Track navigation history for back button
let navigationHistory = [];

// Function to load flashcards from API (shared storage)
async function loadFlashcards() {
    try {
        // Add timestamp to prevent caching
        const response = await fetch(`/api/flashcards?t=${Date.now()}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`Load failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.flashcards && result.flashcards.length > 0) {
            flashcards = result.flashcards;
        } else {
            // Only set empty if we're sure there are no flashcards
            flashcards = [];
        }

        if (result.success && result.groups && result.groups.length > 0) {
            groups = result.groups;
        } else {
            groups = [];
        }
    } catch (error) {
        console.error('Error loading flashcards:', error);
        // Don't change flashcards array on error - keep existing data
    }
}

// Function to get image URL (handles both base64 and blob URLs)
function getImageUrl(imageData) {
    if (!imageData) return '';
    
    // If it's already a base64 data URL, return as is
    if (imageData.startsWith('data:')) {
        return imageData;
    }
    
    // If it's a blob URL, add cache-busting timestamp
    const cleanUrl = imageData.split('?')[0];
    return `${cleanUrl}?t=${Date.now()}`;
}

// Group management functions
function renderGroups() {
    const groupsGrid = document.getElementById('groupsGrid');
    groupsGrid.innerHTML = '';

    // Ensure back button is hidden for main categories (first level)
    const groupSelectionHeader = document.getElementById('groupSelectionHeader');
    if (groupSelectionHeader) {
        groupSelectionHeader.classList.remove('show');
    }

    if (groups.length === 0) {
        groupsGrid.innerHTML = `
            <div class="empty-state">
                <h3>No topics available</h3>
                <p>Ask your teacher to add some topics!</p>
            </div>
        `;
        return;
    }
    
    // Show only main categories (no parentId)
    const mainCategories = groups.filter(group => !group.parentId);
    
    mainCategories.forEach(category => {
        // Count cards in this category and all its sub-categories
        const subCategories = groups.filter(g => g.parentId === category.id);
        const directCards = flashcards.filter(card => card.categoryId === category.id);
        const subCategoryCards = flashcards.filter(card => 
            subCategories.some(sub => sub.id === card.categoryId)
        );
        const totalCards = directCards.length + subCategoryCards.length;
        
        const groupCard = document.createElement('div');
        groupCard.className = 'group-card';
        groupCard.innerHTML = `
            <div class="group-icon">📚</div>
            <div class="group-name">${category.name}</div>
            <div class="group-count">${totalCards} cards</div>
        `;
        
        groupCard.addEventListener('click', () => {
            showCategoryDetail(category.id, category.name);
        });
        
        groupsGrid.appendChild(groupCard);
    });
}

// Function to show category detail (sub-categories or direct cards)
function showCategoryDetail(categoryId, categoryName) {
    // Check if this category has sub-categories
    const subCategories = groups.filter(g => g.parentId === categoryId);

    if (subCategories.length > 0) {
        // Show sub-categories with "Choose a Unit" title
        renderSubCategories(categoryId, categoryName);
    } else {
        // No sub-categories, show cards directly
        selectGroup(categoryId, categoryName);
    }
}

// Function to render sub-categories
function renderSubCategories(parentCategoryId, parentCategoryName) {
    const groupsGrid = document.getElementById('groupsGrid');
    groupsGrid.innerHTML = '';

    // Hide welcome section when navigating to sub-categories
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }

    // Add to navigation history
    navigationHistory.push({
        type: 'subcategories',
        title: 'Choose a Unit',
        parentId: parentCategoryId,
        parentName: parentCategoryName
    });

    // Show back button for sub-categories
    const groupSelectionHeader = document.getElementById('groupSelectionHeader');
    if (groupSelectionHeader) {
        groupSelectionHeader.classList.add('show');
        console.log('Setting groupSelectionHeader to show for sub-categories');
    }

    // Update title to show we're choosing units
    document.getElementById('topicSelectionTitle').textContent = 'Choose a Unit';

    // Get sub-categories for this parent
    const subCategories = groups.filter(g => g.parentId === parentCategoryId);

    // Add cards that belong directly to the parent category (if any)
    const directCards = flashcards.filter(card => card.categoryId === parentCategoryId);
    let allSubFolders = [...subCategories];

    if (directCards.length > 0) {
        allSubFolders.unshift({
            id: parentCategoryId,
            name: `${parentCategoryName} (Direct)`,
            isDirect: true
        });
    }

    if (allSubFolders.length === 0) {
        groupsGrid.innerHTML = `
            <div class="empty-state">
                <h3>No units available</h3>
                <p>This topic doesn't have any units yet!</p>
            </div>
        `;
        return;
    }

    allSubFolders.forEach(subFolder => {
        const subCards = flashcards.filter(card => card.categoryId === subFolder.id);
        const subCard = document.createElement('div');
        subCard.className = 'group-card';
        subCard.innerHTML = `
            <div class="group-icon">${subFolder.isDirect ? '📖' : '📚'}</div>
            <div class="group-name">${subFolder.name}</div>
            <div class="group-count">${subCards.length} cards</div>
        `;

        subCard.addEventListener('click', () => {
            selectGroup(subFolder.id, subFolder.name);
        });

        groupsGrid.appendChild(subCard);
    });
}

function selectGroup(groupId, groupName) {
    currentGroupId = groupId;
    currentGroupCards = flashcards.filter(card => card.categoryId === groupId);
    currentCardIndex = 0;

    // Hide welcome section when viewing flashcards
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'none';
    }

    // Add to navigation history
    navigationHistory.push({
        type: 'flashcards',
        title: groupName || 'Topic',
        groupId: groupId,
        groupName: groupName
    });

    // Update UI
    document.getElementById('groupSelection').style.display = 'none';
    document.getElementById('flashcardView').style.display = 'block';

    document.getElementById('currentGroupName').textContent = groupName || 'Topic';
    document.getElementById('flashcardCategoryTitle').textContent = groupName || 'Topic';

    if (currentGroupCards.length > 0) {
        updateFlashcard();
    } else {
        document.getElementById('currentFlashcard').innerHTML = `
            <div class="no-cards">
                <h3>No cards in this unit</h3>
                <p>Ask your teacher to add some cards!</p>
            </div>
        `;
    }
}

function goBackToGroups() {
    const flashcardView = document.getElementById('flashcardView');
    const groupSelection = document.getElementById('groupSelection');
    const groupSelectionHeader = document.getElementById('groupSelectionHeader');

    if (flashcardView.style.display !== 'none') {
        // We're in flashcards view, go back to sub-categories
        flashcardView.style.display = 'none';
        groupSelection.style.display = 'block';

        // Show the back button for sub-categories
        if (groupSelectionHeader) {
            groupSelectionHeader.classList.add('show');
        }

        // Hide welcome section when returning to sub-categories
        const welcomeSection = document.querySelector('.welcome-section');
        if (welcomeSection) {
            welcomeSection.style.display = 'none';
        }

        // Go back to the last sub-category view
        if (navigationHistory.length > 0) {
            const lastLevel = navigationHistory[navigationHistory.length - 1];
            if (lastLevel.type === 'subcategories') {
                document.getElementById('topicSelectionTitle').textContent = lastLevel.title;
                renderSubCategories(lastLevel.parentId, lastLevel.parentName);
            }
        }

        currentGroupId = null;
        currentGroupCards = [];
        currentCardIndex = 0;
    } else {
        // We're in group selection view, check if we need to go back to main categories
        const groupSelectionHeader = document.getElementById('groupSelectionHeader');
        if (groupSelectionHeader && groupSelectionHeader.classList.contains('show')) {
            // We're in sub-categories, go back to main categories
            groupSelectionHeader.classList.remove('show');
            document.getElementById('topicSelectionTitle').textContent = 'Choose your Topic';
            navigationHistory = []; // Clear history when going to main
            renderGroups();

            // Show welcome section when returning to main categories
            const welcomeSection = document.querySelector('.welcome-section');
            if (welcomeSection) {
                welcomeSection.style.display = 'block';
            }
        }
    }
}

function goToMainMenu() {
    // Go directly to main categories from anywhere
    const flashcardView = document.getElementById('flashcardView');
    const groupSelection = document.getElementById('groupSelection');
    const groupSelectionHeader = document.getElementById('groupSelectionHeader');
    const welcomeSection = document.querySelector('.welcome-section');

    // Hide everything and show main categories
    if (flashcardView) flashcardView.style.display = 'none';
    if (groupSelection) groupSelection.style.display = 'block';
    if (groupSelectionHeader) groupSelectionHeader.classList.remove('show');
    if (welcomeSection) welcomeSection.style.display = 'block';

    // Reset to main categories
    document.getElementById('topicSelectionTitle').textContent = 'Choose your Topic';
    navigationHistory = [];
    renderGroups();
}

// Function to update the displayed flashcard
function updateFlashcard() {
    if (currentGroupCards.length === 0) {
        // Handle empty state
        const flashcardElement = document.getElementById('currentFlashcard');
        flashcardElement.innerHTML = `
            <div class="empty-state">
                <h3>No flashcards in this group</h3>
                <p>Please ask your teacher to add flashcards to this group</p>
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
    
    const currentCard = currentGroupCards[currentCardIndex];
    const flashcardElement = document.getElementById('currentFlashcard');
    
    // Show loading state first
    flashcardElement.innerHTML = `
        <div class="loading-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 300px; color: #666;">
            <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
            <div>Loading...</div>
        </div>
    `;
    
    // Create image element and wait for it to load
    const img = new Image();
    img.onload = function() {
        // Image loaded successfully, now display the card
        flashcardElement.innerHTML = `
            <img src="${getImageUrl(currentCard.image)}" alt="${currentCard.word}" class="flashcard-image">
            <div class="flashcard-text">${currentCard.word}</div>
        `;
        
        // Add click event to play audio
        flashcardElement.onclick = () => {
            playAudio(currentCard.word, currentCard.audioUrl);
        };
    };
    
    img.onerror = function() {
        // Image failed to load, show error state
        flashcardElement.innerHTML = `
            <div class="error-state" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; min-height: 300px; color: #f44336;">
                <div style="font-size: 3rem; margin-bottom: 15px;">📷</div>
                <div class="flashcard-text" style="font-size: 2rem; margin-bottom: 10px;">${currentCard.word}</div>
                <div style="font-size: 1rem; opacity: 0.7;">Image not available</div>
            </div>
        `;
        
        // Add click event to play audio even when image fails
        flashcardElement.onclick = () => {
            playAudio(currentCard.word, currentCard.audioUrl);
        };
    };
    
    // Start loading the image
    img.src = getImageUrl(currentCard.image);
    
    // Update card counter
    document.getElementById('currentCard').textContent = currentCardIndex + 1;
    document.getElementById('totalCards').textContent = currentGroupCards.length;
    
    // Update navigation buttons
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    
    prevBtn.disabled = currentCardIndex === 0;
    nextBtn.disabled = currentCardIndex === currentGroupCards.length - 1;
}

// Voice settings
let selectedVoice = null;
let voices = [];

// Load available voices and set Google US English as default
// Load welcome title from localStorage or use default
function loadWelcomeTitle() {
    const line1 = localStorage.getItem('welcomeTitleLine1') || 'Welcome to';
    const line2 = localStorage.getItem('welcomeTitleLine2') || 'Mrs Sadaf 1B Class';
    const font = localStorage.getItem('welcomeFont') || 'Arial Black';

    const titleLine1Element = document.getElementById('welcomeTitleLine1');
    const titleLine2Element = document.getElementById('welcomeTitleLine2');

    if (titleLine1Element) {
        titleLine1Element.textContent = line1;
    }
    if (titleLine2Element) {
        titleLine2Element.textContent = line2;
    }

    // Apply font to welcome title
    const welcomeElements = document.querySelectorAll('.welcome-section h1');
    welcomeElements.forEach(el => {
        el.style.fontFamily = font + ', Arial, sans-serif';
    });
}

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
    if (currentCardIndex < currentGroupCards.length - 1) {
        currentCardIndex++;
        updateFlashcard();
    }
}


// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved flashcards
    await loadFlashcards();

    // Load welcome title and show welcome section
    loadWelcomeTitle();

    // Ensure welcome section is visible on initial load
    const welcomeSection = document.querySelector('.welcome-section');
    if (welcomeSection) {
        welcomeSection.style.display = 'block';
    }

    // Load voices immediately
    loadVoices();
    
    // Load voices again when they become available (some browsers load them asynchronously)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Set up navigation buttons
    document.getElementById('prevBtn').addEventListener('click', goToPrevious);
    document.getElementById('nextBtn').addEventListener('click', goToNext);
    
    // Initialize with groups view
    renderGroups();
    
    // Ensure back button is hidden on main page
    const groupSelectionHeader = document.getElementById('groupSelectionHeader');
    if (groupSelectionHeader) {
        groupSelectionHeader.classList.remove('show');
    }

    // Set up back button event listeners
    const backFromUnitsBtn = document.getElementById('backFromUnitsBtn');
    const backFromCardsBtn = document.getElementById('backFromCardsBtn');
    const mainMenuBtn = document.getElementById('mainMenuBtn');

    if (backFromUnitsBtn) backFromUnitsBtn.addEventListener('click', goBackToGroups);
    if (backFromCardsBtn) backFromCardsBtn.addEventListener('click', goBackToGroups);
    if (mainMenuBtn) mainMenuBtn.addEventListener('click', goToMainMenu);

    // Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            goToPrevious();
        } else if (event.key === 'ArrowRight') {
            goToNext();
        }
    });

    // No auto-refresh needed - flashcards load once on page load
    // Teachers can refresh the student page manually when they add new cards
});