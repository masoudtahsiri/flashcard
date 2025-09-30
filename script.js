// Default flashcard data - empty array, all data comes from database
let defaultFlashcards = [];

// Current flashcards and groups (starts with defaults, can be modified)
let flashcards = [...defaultFlashcards];
let groups = [];
let currentGroupId = null;
let currentGroupCards = [];
let currentCardIndex = 0;

// Track navigation history for back button
let navigationHistory = [];

// Get class ID from URL parameter for class-specific content
let currentClassId = null;

// Function to get URL parameters
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Function to show class selection screen
async function showClassSelection() {
    try {
        // Hide main content
        const welcomeSection = document.querySelector('.welcome-section');
        const groupSelectionSection = document.querySelector('.group-selection');
        const flashcardSection = document.querySelector('.flashcard-section');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (groupSelectionSection) groupSelectionSection.style.display = 'none';
        if (flashcardSection) flashcardSection.style.display = 'none';
        
        // Show class selection screen
        const classSelectionScreen = document.getElementById('classSelectionScreen');
        if (classSelectionScreen) {
            classSelectionScreen.style.display = 'block';
        }
        
        // Load available classes
        await loadAvailableClasses();
        
    } catch (error) {
        console.error('Error showing class selection:', error);
    }
}

// Function to load available classes
async function loadAvailableClasses() {
    try {
        const response = await fetch('/api/classes');
        if (!response.ok) {
            throw new Error('Failed to load classes');
        }
        
        const result = await response.json();
        if (result.success && result.classes) {
            renderClassSelection(result.classes);
        } else {
            throw new Error('No classes found');
        }
    } catch (error) {
        console.error('Error loading classes:', error);
        // Show error message
        const classList = document.getElementById('classList');
        if (classList) {
            classList.innerHTML = '<p style="text-align: center; color: #666;">Unable to load classes. Please try again later.</p>';
        }
    }
}

// Function to render class selection
function renderClassSelection(classes) {
    const classList = document.getElementById('classList');
    if (!classList) return;
    
    if (classes.length === 0) {
        classList.innerHTML = '<p style="text-align: center; color: #666;">No classes available.</p>';
        return;
    }
    
    classList.innerHTML = classes.map(cls => `
        <div class="class-card" onclick="selectClass('${cls.id}')">
            <div class="class-name">${cls.name}</div>
            <div class="class-info">Click to enter</div>
        </div>
    `).join('');
}

// Function to select a class
function selectClass(classId) {
    // Update URL with class parameter
    const url = new URL(window.location);
    url.searchParams.set('class', classId);
    window.location.href = url.toString();
}

// Function to get emoji for category based on name
function getCategoryEmoji(categoryName) {
    if (!categoryName) return '📚';
    
    const name = categoryName.toLowerCase().trim();
    
    // Check for unit numbers first (Unit 1, Unit 2, etc.)
    const unitMatch = name.match(/unit\s*(\d+)/);
    if (unitMatch) {
        const unitNumber = parseInt(unitMatch[1]);
        return getNumberEmoji(unitNumber);
    }
    
    // Check for standalone numbers (1, 2, 3, etc.)
    const numberMatch = name.match(/^\d+$/);
    if (numberMatch) {
        const number = parseInt(name);
        return getNumberEmoji(number);
    }
    
    // Map specific subjects to emojis
    const emojiMap = {
        'english': '📖',
        'math': 'custom-math-icon',
        'mathematics': 'custom-math-icon',
        'maths': 'custom-math-icon',
        'science': '🔬',
        'sciences': '🔬',
        'p.e': '⚽',
        'pe': '⚽',
        'physical education': '⚽',
        'history': '📜',
        'geography': '🌍',
        'geo': '🌍'
    };
    
    // Check for exact matches first
    if (emojiMap[name]) {
        return emojiMap[name];
    }
    
    // Check for partial matches (in case of "Science Unit 1", etc.)
    for (const [key, emoji] of Object.entries(emojiMap)) {
        if (name.includes(key)) {
            return emoji;
        }
    }
    
    // Default emoji for unknown categories
    return '📚';
}

// Function to get color class for category based on subject
function getCategoryColorClass(categoryName) {
    if (!categoryName) return 'color-default';
    
    const lowerName = categoryName.toLowerCase().trim();
    
    // Map specific subjects to color classes
    const colorMap = {
        'english': 'color-english',
        'language': 'color-english',
        'literature': 'color-english',
        'reading': 'color-english',
        'writing': 'color-english',
        
        'math': 'color-math',
        'mathematics': 'color-math',
        'maths': 'color-math',
        'algebra': 'color-math',
        'geometry': 'color-math',
        'calculus': 'color-math',
        
        'science': 'color-science',
        'sciences': 'color-science',
        'biology': 'color-science',
        'chemistry': 'color-science',
        'physics': 'color-science',
        
        'p.e': 'color-pe',
        'pe': 'color-pe',
        'physical education': 'color-pe',
        'sports': 'color-pe',
        'fitness': 'color-pe',
        
        'history': 'color-history',
        'social studies': 'color-history',
        'civics': 'color-history',
        
        'geography': 'color-geography',
        'earth science': 'color-geography',
        'geology': 'color-geography'
    };
    
    // Check for exact matches first
    if (colorMap[lowerName]) {
        return colorMap[lowerName];
    }
    
    // Check for partial matches
    for (const [key, colorClass] of Object.entries(colorMap)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
            return colorClass;
        }
    }
    
    return 'color-default';
}

// Function to get number emoji for units
function getNumberEmoji(number) {
    if (number < 1 || number > 100) return '📚';
    
    // Number emojis 1-10
    const numberEmojis = {
        1: '1️⃣', 2: '2️⃣', 3: '3️⃣', 4: '4️⃣', 5: '5️⃣',
        6: '6️⃣', 7: '7️⃣', 8: '8️⃣', 9: '9️⃣', 10: '🔟'
    };
    
    if (numberEmojis[number]) {
        return numberEmojis[number];
    }
    
    // For numbers 11-100, we'll use a combination approach
    // Since there are no direct emojis for 11-100, we'll use creative alternatives
    if (number >= 11 && number <= 20) {
        return '🔢'; // Use math emoji for teens
    } else if (number >= 21 && number <= 30) {
        return '📊'; // Use chart emoji for 20s
    } else if (number >= 31 && number <= 40) {
        return '📈'; // Use trending up for 30s
    } else if (number >= 41 && number <= 50) {
        return '📉'; // Use trending down for 40s
    } else if (number >= 51 && number <= 60) {
        return '📋'; // Use clipboard for 50s
    } else if (number >= 61 && number <= 70) {
        return '📑'; // Use bookmark tabs for 60s
    } else if (number >= 71 && number <= 80) {
        return '📄'; // Use page for 70s
    } else if (number >= 81 && number <= 90) {
        return '📃'; // Use page with curl for 80s
    } else if (number >= 91 && number <= 100) {
        return '💯'; // Use 100 emoji for 90s and 100
    }
    
    return '📚'; // Fallback
}

// Function to load flashcards from API (shared storage)
async function loadFlashcards() {
    try {
        // Build API URL with class parameter if specified
        let apiUrl = `/api/flashcards?t=${Date.now()}`;
        if (currentClassId) {
            apiUrl += `&class=${encodeURIComponent(currentClassId)}`;
        }
        
        // Add timestamp to prevent caching
        const response = await fetch(apiUrl, {
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

        // Load welcome settings from database
        if (result.success && result.settings) {
            // Save welcome settings to localStorage for immediate use
            if (result.settings.welcomeTitleLine1) {
                localStorage.setItem('welcomeTitleLine1', result.settings.welcomeTitleLine1);
            }
            if (result.settings.welcomeTitleLine2) {
                localStorage.setItem('welcomeTitleLine2', result.settings.welcomeTitleLine2);
            }
            if (result.settings.welcomeFont) {
                localStorage.setItem('welcomeFont', result.settings.welcomeFont);
            }
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
        const emoji = getCategoryEmoji(category.name);
        const iconContent = emoji === 'custom-math-icon' ? '' : emoji;
        const iconClass = emoji === 'custom-math-icon' ? 'group-icon custom-math-icon' : 'group-icon';
        const colorClass = getCategoryColorClass(category.name);
        groupCard.classList.add(colorClass);
        groupCard.innerHTML = `
            <div class="${iconClass}">${iconContent}</div>
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
        const emoji = getCategoryEmoji(subFolder.name);
        const iconContent = emoji === 'custom-math-icon' ? '' : emoji;
        const iconClass = emoji === 'custom-math-icon' ? 'group-icon custom-math-icon' : 'group-icon';
        const colorClass = getCategoryColorClass(subFolder.name);
        subCard.classList.add(colorClass);
        subCard.innerHTML = `
            <div class="${iconClass}">${iconContent}</div>
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
    
    // Sort cards by sortOrder for consistent display order
    currentGroupCards.sort((a, b) => {
        const orderA = a.sortOrder || 0;
        const orderB = b.sortOrder || 0;
        return orderA - orderB;
    });
    
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

    // Set category title in "category - subcategory" format
    let categoryTitle = groupName || 'Topic';
    
    // Check if we have parent category information from navigation history
    if (navigationHistory.length > 0) {
        const parentLevel = navigationHistory.find(level => level.type === 'subcategories');
        if (parentLevel && parentLevel.parentName && groupName) {
            // Remove "(Direct)" suffix if present for cleaner display
            const cleanGroupName = groupName.replace(' (Direct)', '');
            categoryTitle = `${parentLevel.parentName} - ${cleanGroupName}`;
        }
    }
    
    document.getElementById('flashcardCategoryTitle').textContent = categoryTitle;

    // Always call updateFlashcard to handle both empty and populated states correctly
    updateFlashcard();
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
    // Get class ID from URL parameter
    currentClassId = getUrlParameter('class');
    
    // If no class is selected, show class selection screen
    if (!currentClassId) {
        showClassSelection();
        return;
    }
    
    // Load saved flashcards (will be filtered by class if specified)
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
    
    // Set up navigation buttons with proper event handling
    document.getElementById('prevBtn').addEventListener('click', (e) => {
        e.preventDefault();
        goToPrevious();
    });
    document.getElementById('nextBtn').addEventListener('click', (e) => {
        e.preventDefault();
        goToNext();
    });
    
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