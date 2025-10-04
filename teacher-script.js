// Default flashcard data - empty array, all data comes from database
let defaultFlashcards = [];

// Default groups data with hierarchical structure
let defaultGroups = [
    {
        id: 1,
        name: "Science",
        color: "#4CAF50",
        parentId: null
    },
    {
        id: 2,
        name: "Animals",
        color: "#66BB6A",
        parentId: 1
    }
];

// Current flashcards and groups (starts with defaults, can be modified)
let flashcards = [...defaultFlashcards];
let groups = [...defaultGroups];
let nextGroupId = 3;
let currentClassId = null; // Currently selected class for management
let currentClassName = null; // Currently selected class name
let availableClasses = []; // List of all available classes

// Pagination variables
let currentPage = 1;
let itemsPerPage = getResponsiveItemsPerPage(); // Initialize with responsive value
let currentView = 'allCards'; // 'allCards', 'groupFolders', 'groupDetail'
let currentGroupIdForDetail = null;

// Function to calculate responsive items per page based on screen size
function getResponsiveItemsPerPage() {
    const screenWidth = window.innerWidth;
    
    // Match the actual visual display - what users actually see on screen
    if (screenWidth >= 2560) {
        return 28; // 7 columns x 4 rows = 28 cards - Ultra-wide screens (27+ inch)
    } else if (screenWidth >= 1920) {
        return 21; // 7 columns x 3 rows = 21 cards - Large screens (24+ inch)
    } else if (screenWidth >= 1600) {
        return 18; // 6 columns x 3 rows = 18 cards - Medium-large screens (20-24 inch)
    } else if (screenWidth >= 1400) {
        return 10; // 5 columns x 2 rows = 10 cards - Medium screens (17-20 inch)
    } else if (screenWidth >= 1200) {
        return 10; // 5 columns x 2 rows = 10 cards - 13-inch laptops
    } else if (screenWidth >= 900) {
        return 8; // 4 columns x 2 rows = 8 cards - Smaller laptops
    } else if (screenWidth >= 600) {
        return 6; // 3 columns x 2 rows = 6 cards - Tablets
    } else {
        return 4; // 2 columns x 2 rows = 4 cards - Mobile
    }
}

// Function to update itemsPerPage based on current screen size
function updateItemsPerPage() {
    const newItemsPerPage = getResponsiveItemsPerPage();
    const wasChanged = newItemsPerPage !== itemsPerPage;
    itemsPerPage = newItemsPerPage;
    
    if (wasChanged) {
        currentPage = 1; // Reset to first page when items per page changes
    }
    
    console.log(`Screen width: ${window.innerWidth}px, Items per page: ${itemsPerPage}, Current page: ${currentPage}`);
}

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


// Function to render grid view
function renderGridView() {
    currentView = 'allCards';
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
    
    // Get paginated flashcards
    const paginatedCards = getPaginatedItems(flashcards);
    
    paginatedCards.forEach((card, paginatedIndex) => {
        const originalIndex = flashcards.findIndex(c => c.id === card.id);
        const gridCard = document.createElement('div');
        gridCard.className = 'grid-flashcard';
        
        // Find the category name for this card (show full hierarchical path)
        const category = groups.find(g => g.id === card.categoryId);
        let categoryName = 'No Category';
        
        if (category) {
            if (category.parentId) {
                // This is a sub-category, show "Main Category > Sub Category"
                const parentCategory = groups.find(g => g.id === category.parentId);
                categoryName = parentCategory ? `${parentCategory.name} > ${category.name}` : category.name;
            } else {
                // This is a main category
                categoryName = category.name;
            }
        }
        
        // Build category select options HTML with hierarchical names
        let categoryOptionsHTML = '<option value="">No Category</option>';
        groups.forEach(group => {
            const selected = card.categoryId === group.id ? 'selected' : '';
            let displayName = group.name;
            if (group.parentId) {
                const parentGroup = groups.find(g => g.id === group.parentId);
                displayName = parentGroup ? `${parentGroup.name} > ${group.name}` : group.name;
            }
            categoryOptionsHTML += `<option value="${group.id}" ${selected}>${displayName}</option>`;
        });
        
        // Calculate the position within the card's category
        const cardsInSameCategory = flashcards
            .filter(c => c.categoryId === card.categoryId)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const positionInCategory = cardsInSameCategory.findIndex(c => c.id === card.id) + 1;
        
        gridCard.innerHTML = `
            <div class="card-checkbox">
                <input type="checkbox" id="card-${card.id}" class="card-select-checkbox" data-card-id="${card.id}" onchange="updateDeleteButton()">
            </div>
            <div class="card-position">#${positionInCategory}</div>
            <div class="grid-flashcard-category-top">${categoryName}</div>
            <img src="${getImageUrl(card.image)}" alt="${card.word}" class="grid-flashcard-image">
            <div class="grid-flashcard-text">${card.word}</div>
            <div class="grid-flashcard-edit-hint">Click to edit • Position: ${positionInCategory} in category</div>
        `;
        
        // Add click to open edit modal (but not when clicking checkbox)
        gridCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('card-select-checkbox')) {
                openCardEditModal(card.id);
            }
        });
        
        grid.appendChild(gridCard);
    });
    
    // Add pagination controls
    createPaginationControls('allCardsView', flashcards.length, renderGridView);
}

// Function to render grouped cards view (hierarchical navigation)
function renderGroupedCardsView() {
    currentView = 'groupFolders';
    const groupsGrid = document.getElementById('groupsGrid');
    groupsGrid.innerHTML = '';
    
    // Hide the header for main categories view (no back button needed at top level)
    const groupedViewHeader = document.getElementById('groupedViewHeader');
    if (groupedViewHeader) {
        groupedViewHeader.style.display = 'none';
    }
    
    // Show only main categories (parentId is null or undefined)
    const mainCategories = groups.filter(group => !group.parentId);
    
    if (mainCategories.length === 0) {
        groupsGrid.innerHTML = `
            <div class="empty-state">
                <h3>No main categories available</h3>
                <p>Create main categories using the Manage Units section</p>
                <p>Main categories are units with no parent category set</p>
            </div>
        `;
        return;
    }
    
    // Get paginated main categories
    const paginatedCategories = getPaginatedItems(mainCategories);
    
    // Render each main category
    paginatedCategories.forEach(category => {
        // Count cards in this category and all its sub-categories
        const subCategories = groups.filter(g => g.parentId === category.id);
        const directCards = flashcards.filter(card => card.categoryId === category.id);
        const subCategoryCards = flashcards.filter(card => 
            subCategories.some(sub => sub.id === card.categoryId)
        );
        const totalCards = directCards.length + subCategoryCards.length;
        
        const groupFolder = document.createElement('div');
        groupFolder.className = 'group-folder';
        groupFolder.innerHTML = `
            <div class="group-folder-icon">📁</div>
            <div class="group-folder-name">${category.name}</div>
            <div class="group-folder-count">${totalCards} cards</div>
        `;
        
        groupFolder.addEventListener('click', () => {
            // Show sub-categories or cards for this main category
            showCategoryDetail(category.id, category.name);
        });
        
        groupsGrid.appendChild(groupFolder);
    });
    
    // Add pagination controls
    createPaginationControls('groupedCardsView', mainCategories.length, renderGroupedCardsView);
}

// Function to show category detail (sub-categories or direct cards)
function showCategoryDetail(categoryId, categoryName) {
    // Check if this category has sub-categories
    const subCategories = groups.filter(g => g.parentId === categoryId);
    
    if (subCategories.length > 0) {
        // Show sub-categories
        renderSubCategories(categoryId, categoryName);
    } else {
        // No sub-categories, show cards directly
        showGroupDetail(categoryId, categoryName);
    }
}

// Function to render sub-categories view
function renderSubCategories(parentCategoryId, parentCategoryName) {
    currentView = 'subCategories';
    const groupsGrid = document.getElementById('groupsGrid');
    groupsGrid.innerHTML = '';
    
    // Show the header with back button for sub-categories view
    const groupedViewHeader = document.getElementById('groupedViewHeader');
    if (groupedViewHeader) {
        groupedViewHeader.style.display = 'flex';
    }
    
    // Update back button and header title
    const backBtn = document.getElementById('backToGroupsBtn');
    const headerTitle = document.getElementById('selectedGroupName');
    if (backBtn) {
        backBtn.textContent = '← Back';
    }
    if (headerTitle) {
        headerTitle.textContent = parentCategoryName;
    }
    
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
                <h3>No sub-categories in ${parentCategoryName}</h3>
                <p>Add flashcards to create sub-categories</p>
            </div>
        `;
        return;
    }
    
    // Get paginated sub-folders
    const paginatedSubFolders = getPaginatedItems(allSubFolders);
    
    // Render each sub-category
    paginatedSubFolders.forEach(subFolder => {
        const subCategoryCards = flashcards.filter(card => card.categoryId === subFolder.id);
        
        const groupFolder = document.createElement('div');
        groupFolder.className = 'group-folder';
        groupFolder.innerHTML = `
            <div class="group-folder-icon">📂</div>
            <div class="group-folder-name">${subFolder.name}</div>
            <div class="group-folder-count">${subCategoryCards.length} cards</div>
        `;
        
        groupFolder.addEventListener('click', () => {
            showGroupDetail(subFolder.id, subFolder.name);
        });
        
        groupsGrid.appendChild(groupFolder);
    });
    
    // Add pagination controls
    createPaginationControls('groupedCardsView', allSubFolders.length, () => renderSubCategories(parentCategoryId, parentCategoryName));
}

// Function to show group detail view (final level - shows actual flashcards)
function showGroupDetail(groupId, groupName) {
    currentView = 'groupDetail';
    currentGroupIdForDetail = groupId;
    currentPage = 1; // Reset to first page when opening group
    
    // Hide groups grid and show group detail
    document.getElementById('groupsGrid').style.display = 'none';
    document.getElementById('groupDetailView').style.display = 'block';
    
    // Show the header with back button for flashcards view
    const groupedViewHeader = document.getElementById('groupedViewHeader');
    if (groupedViewHeader) {
        groupedViewHeader.style.display = 'flex';
    }
    
    // Update header
    document.getElementById('selectedGroupName').textContent = groupName;
    
    // Update back button
    const backBtn = document.getElementById('backToGroupsBtn');
    if (backBtn) {
        backBtn.textContent = '← Back';
    }
    
    renderGroupDetailCards();
}

// Function to render cards in group detail view with pagination
function renderGroupDetailCards() {
    // Filter cards for this category
    const groupCards = currentGroupIdForDetail ? 
        flashcards.filter(card => card.categoryId === currentGroupIdForDetail) : 
        flashcards.filter(card => !card.categoryId);
    
    // Render cards
    const container = document.getElementById('groupCardsContainer');
    container.innerHTML = '';
    
    if (groupCards.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <h3>No cards in this group</h3>
                <p>Add cards to this group using the form above</p>
            </div>
        `;
        return;
    }
    
    // Get paginated cards
    const paginatedCards = getPaginatedItems(groupCards);
    
    paginatedCards.forEach((card, paginatedIndex) => {
        const originalIndex = flashcards.findIndex(c => c.id === card.id);
        const gridCard = document.createElement('div');
        gridCard.className = 'grid-flashcard';
        
        // Find the category name for this card (show full hierarchical path)
        const category = groups.find(g => g.id === card.categoryId);
        let categoryName = 'No Category';
        
        if (category) {
            if (category.parentId) {
                // This is a sub-category, show "Main Category > Sub Category"
                const parentCategory = groups.find(g => g.id === category.parentId);
                categoryName = parentCategory ? `${parentCategory.name} > ${category.name}` : category.name;
            } else {
                // This is a main category
                categoryName = category.name;
            }
        }
        
        // Calculate the position within the card's category
        const cardsInSameCategory = flashcards
            .filter(c => c.categoryId === card.categoryId)
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        const positionInCategory = cardsInSameCategory.findIndex(c => c.id === card.id) + 1;
        
        gridCard.innerHTML = `
            <div class="card-checkbox">
                <input type="checkbox" id="card-group-${card.id}" class="card-select-checkbox" data-card-id="${card.id}" onchange="updateDeleteButton()">
            </div>
            <div class="card-position">#${positionInCategory}</div>
            <div class="grid-flashcard-category-top">${categoryName}</div>
            <img src="${getImageUrl(card.image)}" alt="${card.word}" class="grid-flashcard-image">
            <div class="grid-flashcard-text">${card.word}</div>
            <div class="grid-flashcard-edit-hint">Click to edit • Position: ${positionInCategory} in category</div>
        `;
        
        // Add click to open edit modal (but not when clicking checkbox)
        gridCard.addEventListener('click', (e) => {
            if (!e.target.classList.contains('card-select-checkbox')) {
                openCardEditModal(card.id);
            }
        });
        
        container.appendChild(gridCard);
    });
    
    // Add pagination controls
    createPaginationControls('groupDetailView', groupCards.length, renderGroupDetailCards);
}

// Function to go back to previous view
function goBackToGroups() {
    document.getElementById('groupsGrid').style.display = 'grid';
    document.getElementById('groupDetailView').style.display = 'none';
    
    // Determine which view to go back to based on current context
    if (currentView === 'groupDetail') {
        // If we were viewing cards, check if we should go back to sub-categories or main categories
        const currentGroup = groups.find(g => g.id === currentGroupIdForDetail);
        
        if (currentGroup && currentGroup.parentId) {
            // Go back to sub-categories view
            const parentGroup = groups.find(g => g.id === currentGroup.parentId);
            if (parentGroup) {
                renderSubCategories(parentGroup.id, parentGroup.name);
                return;
            }
        }
    }
    
    // Default: go back to main categories
    setTimeout(() => {
        renderGroupedCardsView();
    }, 10);
}

// Function to handle tab switching
function showTab(tabName) {
    // Hide all tab panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab panel
    if (tabName === 'addCard') {
        document.getElementById('addCardContent').classList.add('active');
        document.getElementById('addCardTab').classList.add('active');
    } else if (tabName === 'manageGroups') {
        document.getElementById('manageGroupsContent').classList.add('active');
        document.getElementById('manageGroupsTab').classList.add('active');
    } else if (tabName === 'multiUpload') {
        document.getElementById('multiUploadContent').classList.add('active');
        document.getElementById('multiUploadTab').classList.add('active');
        // Populate category dropdown for multi upload
        populateMultiUploadCategories();
    } else if (tabName === 'settings') {
        document.getElementById('settingsContent').classList.add('active');
        document.getElementById('settingsTab').classList.add('active');
        // Update class management info when settings tab is opened
        updateSettingsTab();
    }
}

// Settings functions
function loadSettings() {
    // Load welcome title lines and font from localStorage or use defaults
    const line1 = localStorage.getItem('welcomeTitleLine1') || 'Welcome to';
    const line2 = localStorage.getItem('welcomeTitleLine2') || 'Mrs Sadaf 1B Class';
    const font = localStorage.getItem('welcomeFont') || 'Arial Black';

    document.getElementById('welcomeTitleLine1').value = line1;
    document.getElementById('welcomeTitleLine2').value = line2;
    document.getElementById('welcomeFontSelect').value = font;

    // Update preview
    updatePreview();
}

function updatePreview() {
    const line1 = document.getElementById('welcomeTitleLine1').value || 'Welcome to';
    const line2 = document.getElementById('welcomeTitleLine2').value || 'Mrs Sadaf 1B Class';
    const font = document.getElementById('welcomeFontSelect').value;

    document.getElementById('previewTitleLine1').textContent = line1;
    document.getElementById('previewTitleLine2').textContent = line2;

    // Apply font to preview
    const previewElements = document.querySelectorAll('.welcome-preview .welcome-section h1');
    previewElements.forEach(el => {
        el.style.fontFamily = font + ', Arial, sans-serif';
    });
}

async function saveWelcomeTitle() {
    const line1 = document.getElementById('welcomeTitleLine1').value.trim();
    const line2 = document.getElementById('welcomeTitleLine2').value.trim();
    const font = document.getElementById('welcomeFontSelect').value;

    if (!line1 || !line2) {
        alert('Please enter both lines of the welcome title.');
        return;
    }

    try {
        // Save to localStorage
        localStorage.setItem('welcomeTitleLine1', line1);
        localStorage.setItem('welcomeTitleLine2', line2);
        localStorage.setItem('welcomeFont', font);

        // Update preview
        updatePreview();

        // Update student interface if it's open
        updateStudentInterface();

        // Save to database immediately
        await saveFlashcards();

        alert('Welcome title settings saved and synced to database successfully!');
    } catch (error) {
        console.error('Error saving welcome title:', error);
        alert('Welcome title saved locally, but failed to sync to database. Please try again.');
    }
}

// Reset functionality removed - no longer needed

function updateStudentInterface() {
    if (window.studentWindow && !window.studentWindow.closed) {
        const line1 = localStorage.getItem('welcomeTitleLine1') || 'Welcome to';
        const line2 = localStorage.getItem('welcomeTitleLine2') || 'Mrs Sadaf 1B Class';
        const font = localStorage.getItem('welcomeFont') || 'Arial Black';

        const studentLine1 = window.studentWindow.document.getElementById('welcomeTitleLine1');
        const studentLine2 = window.studentWindow.document.getElementById('welcomeTitleLine2');

        if (studentLine1) studentLine1.textContent = line1;
        if (studentLine2) studentLine2.textContent = line2;

        // Apply font to student interface
        const studentElements = window.studentWindow.document.querySelectorAll('.welcome-section h1');
        studentElements.forEach(el => {
            el.style.fontFamily = font + ', Arial, sans-serif';
        });
    }
}

// Pagination functions
function createPaginationControls(containerId, totalItems, onPageChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    // Remove existing pagination
    const existingPagination = container.querySelector('.pagination-controls');
    if (existingPagination) {
        existingPagination.remove();
    }
    
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    if (totalPages <= 1) return; // No pagination needed
    
    const paginationDiv = document.createElement('div');
    paginationDiv.className = 'pagination-controls';
    
    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '← Previous';
    prevBtn.className = 'pagination-btn';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => {
        if (currentPage > 1) {
            currentPage--;
            onPageChange();
        }
    };
    
    // Page info
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pagination-info';
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
    
    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.textContent = 'Next →';
    nextBtn.className = 'pagination-btn';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => {
        if (currentPage < totalPages) {
            currentPage++;
            onPageChange();
        }
    };
    
    paginationDiv.appendChild(prevBtn);
    paginationDiv.appendChild(pageInfo);
    paginationDiv.appendChild(nextBtn);
    
    container.appendChild(paginationDiv);
}

function getPaginatedItems(items) {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = items.slice(startIndex, endIndex);
    
    console.log(`Total items: ${items.length}, Items per page: ${itemsPerPage}, Current page: ${currentPage}`);
    console.log(`Showing items ${startIndex + 1} to ${Math.min(endIndex, items.length)} of ${items.length}`);
    console.log(`Paginated items count: ${paginatedItems.length}`);
    
    return paginatedItems;
}

// View control functions
function showAllCards() {
    currentPage = 1; // Reset pagination
    document.getElementById('allCardsView').style.display = 'block';
    document.getElementById('groupedCardsView').style.display = 'none';
    document.getElementById('allCardsBtn').classList.add('active');
    document.getElementById('groupedCardsBtn').classList.remove('active');
    renderGridView();
}

function showGroupedCards() {
    currentPage = 1; // Reset pagination
    document.getElementById('allCardsView').style.display = 'none';
    document.getElementById('groupedCardsView').style.display = 'block';
    document.getElementById('groupsGrid').style.display = 'grid';
    document.getElementById('groupDetailView').style.display = 'none';
    document.getElementById('allCardsBtn').classList.remove('active');
    document.getElementById('groupedCardsBtn').classList.add('active');
    renderGroupedCardsView();
}

// Function to clear all storage (emergency cleanup)
async function clearAllStorage() {
    if (confirm('This will delete ALL flashcards AND categories and cannot be undone. Are you sure?')) {
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

            // Clear both arrays
            flashcards = []; // Empty flashcards array
            groups = []; // Empty groups/categories array
            nextId = 1; // Reset ID counter
            nextGroupId = 1; // Reset group ID counter
            
            // Refresh all UI components
            renderGridView();
            renderGroupsList();
            updateGroupSelect();
            updateParentGroupSelect();
            populateMultiUploadCategories();
            
            // If grouped view is visible, refresh it too
            if (document.getElementById('groupedCardsView').style.display !== 'none') {
                renderGroupedCardsView();
            }
            
            alert(`All data cleared successfully!\nDeleted: ${result.deletedFlashcards} flashcards, ${result.deletedGroups} categories`);
        } catch (error) {
            console.error('Error clearing all data:', error);
            alert('Error clearing data. Please try again.');
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
        audioUrl: card.audioUrl,
        groupId: card.groupId
    }));
    
    const cardsData = JSON.stringify(embeddedCards);
    const groupsData = JSON.stringify(groups);
    
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
        function loadVoices() { voices = speechSynthesis.getVoices(); const googleUSVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); if (googleUSVoices.length > 0) { selectedVoice = googleUSVoices[0]; console.log('🎯 Google US English voice:', selectedVoice.name); return; } const googleEnglishVoices = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); if (googleEnglishVoices.length > 0) { selectedVoice = googleEnglishVoices[0]; console.log('🎯 Google English voice:', selectedVoice.name); return; } const offlineVoices = voices.filter(v => v.localService && v.lang.startsWith('en')); const preferredNames = ['Samantha', 'Alex', 'Microsoft Zira', 'Microsoft David']; for (const name of preferredNames) { const found = offlineVoices.find(v => v.name.includes(name)); if (found) { selectedVoice = found; console.log('🎯 Offline voice:', found.name); return; } } if (offlineVoices.length > 0) { selectedVoice = offlineVoices[0]; console.log('🎯 First offline English voice:', offlineVoices[0].name); return; } const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); if (englishVoices.length > 0) { selectedVoice = englishVoices[0]; console.log('🎯 Fallback English voice:', englishVoices[0].name); } }
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
        
        function loadVoices() { voices = speechSynthesis.getVoices(); const googleUSVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); if (googleUSVoices.length > 0) { selectedVoice = googleUSVoices[0]; console.log('🎯 Google US English voice:', selectedVoice.name); return; } const googleEnglishVoices = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); if (googleEnglishVoices.length > 0) { selectedVoice = googleEnglishVoices[0]; console.log('🎯 Google English voice:', selectedVoice.name); return; } const offlineVoices = voices.filter(v => v.localService && v.lang.startsWith('en')); const preferredNames = ['Samantha', 'Alex', 'Microsoft Zira', 'Microsoft David']; for (const name of preferredNames) { const found = offlineVoices.find(v => v.name.includes(name)); if (found) { selectedVoice = found; console.log('🎯 Offline voice:', found.name); return; } } if (offlineVoices.length > 0) { selectedVoice = offlineVoices[0]; console.log('🎯 First offline English voice:', offlineVoices[0].name); return; } const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); if (englishVoices.length > 0) { selectedVoice = englishVoices[0]; console.log('🎯 Fallback English voice:', englishVoices[0].name); } }
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
            const googleUSVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); 
            if (googleUSVoices.length > 0) { 
                selectedVoice = googleUSVoices[0]; 
                console.log('🎯 Google US English voice:', selectedVoice.name); 
                return; 
            } 
            const googleEnglishVoices = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); 
            if (googleEnglishVoices.length > 0) { 
                selectedVoice = googleEnglishVoices[0]; 
                console.log('🎯 Google English voice:', selectedVoice.name); 
                return; 
            } 
            const offlineVoices = voices.filter(v => v.localService && v.lang.startsWith('en')); 
            const iosNames = ['Samantha', 'Alex', 'Susan', 'Daniel', 'Karen', 'Moira']; 
            const windowsNames = ['Microsoft Zira', 'Microsoft David', 'Microsoft Mark']; 
            const preferredNames = [...iosNames, ...windowsNames]; 
            for (const name of preferredNames) { 
                const found = offlineVoices.find(v => v.name.includes(name)); 
                if (found) { 
                    selectedVoice = found; 
                    console.log('🎯 Offline voice:', found.name); 
                    return; 
                } 
            } 
            if (offlineVoices.length > 0) { 
                selectedVoice = offlineVoices[0]; 
                console.log('🎯 First offline English voice:', offlineVoices[0].name); 
                return; 
            } 
            const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); 
            if (englishVoices.length > 0) { 
                selectedVoice = englishVoices[0]; 
                console.log('🎯 Fallback English voice:', englishVoices[0].name); 
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
            const googleUSVoices = voices.filter(voice => voice.name.includes('Google') && (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))); 
            if (googleUSVoices.length > 0) { 
                selectedVoice = googleUSVoices[0]; 
                console.log('🎯 Google US English voice:', selectedVoice.name); 
                return; 
            } 
            const googleEnglishVoices = voices.filter(voice => voice.name.includes('Google') && voice.lang.startsWith('en')); 
            if (googleEnglishVoices.length > 0) { 
                selectedVoice = googleEnglishVoices[0]; 
                console.log('🎯 Google English voice:', selectedVoice.name); 
                return; 
            } 
            const offlineVoices = voices.filter(v => v.localService && v.lang.startsWith('en')); 
            const iosNames = ['Samantha', 'Alex', 'Susan', 'Daniel', 'Karen', 'Moira']; 
            const windowsNames = ['Microsoft Zira', 'Microsoft David', 'Microsoft Mark']; 
            const preferredNames = [...iosNames, ...windowsNames]; 
            for (const name of preferredNames) { 
                const found = offlineVoices.find(v => v.name.includes(name)); 
                if (found) { 
                    selectedVoice = found; 
                    console.log('🎯 Offline voice:', found.name); 
                    return; 
                } 
            } 
            if (offlineVoices.length > 0) { 
                selectedVoice = offlineVoices[0]; 
                console.log('🎯 First offline English voice:', offlineVoices[0].name); 
                return; 
            } 
            const englishVoices = voices.filter(voice => voice.lang.startsWith('en')); 
            if (englishVoices.length > 0) { 
                selectedVoice = englishVoices[0]; 
                console.log('🎯 Fallback English voice:', englishVoices[0].name); 
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

        /* Group Selection Styles */
        .group-selection {
            text-align: center;
            max-width: 800px;
            margin: 0 auto;
        }

        .group-selection h2 {
            color: #333;
            margin-bottom: 40px;
            font-size: 2.5rem;
            font-weight: 300;
        }

        .groups-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 25px;
            justify-items: center;
            margin: 30px 0;
            padding: 25px;
        }

        .group-card {
            width: 250px;
            height: 200px;
            background: white;
            border-radius: 20px;
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
            border: 4px solid white;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: inherit;
        }

        .group-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
        }

        .group-card:active {
            transform: scale(0.98);
        }

        .group-icon {
            font-size: 4rem;
            margin-bottom: 15px;
            opacity: 0.8;
        }

        .group-name {
            font-size: 1.5rem;
            font-weight: 600;
            color: #333;
            text-align: center;
            margin-bottom: 10px;
        }

        .group-count {
            font-size: 1rem;
            color: #666;
            font-weight: 500;
        }

        .flashcard-view {
            text-align: center;
            max-width: 1200px;
            width: 100%;
        }

        .group-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 30px;
            padding: 20px 0;
            border-bottom: 2px solid #e0e0e0;
        }

        .back-btn {
            padding: 10px 20px;
            font-size: 1rem;
            font-weight: 600;
            background: #2196F3;
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
        }

        .back-btn:hover {
            background: #1976D2;
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(33, 150, 243, 0.4);
        }

        .back-btn:active {
            transform: translateY(0);
        }

        .group-header h2 {
            color: #333;
            font-size: 2rem;
            font-weight: 300;
            margin: 0;
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
        <div class="group-selection" id="groupSelection">
            <h2>Select a Group</h2>
            <div class="groups-grid" id="groupsGrid">
                <!-- Groups will be rendered here -->
            </div>
        </div>
        
        <div class="flashcard-view" id="flashcardView" style="display: none;">
            <div class="group-header">
                <button id="backToGroupsBtn" class="back-btn">← Back to Groups</button>
                <h2 id="currentGroupName">Group Name</h2>
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
            <div class="card-counter">
                <span id="currentCard">1</span> / <span id="totalCards">6</span>
            </div>
        </div>
    </div>
    
    <script>
        // Flashcard data embedded in the file
        const flashcards = ${cardsData};
        const groups = ${groupsData};
        let currentGroupId = null;
        let currentGroupCards = [];
        let currentCardIndex = 0;
        let selectedVoice = null;
        let voices = [];

        // Group management functions
        function renderGroups() {
            const groupsGrid = document.getElementById('groupsGrid');
            groupsGrid.innerHTML = '';
            
            if (groups.length === 0) {
                groupsGrid.innerHTML = \`
                    <div class="empty-state">
                        <h3>No units available</h3>
                    </div>
                \`;
                return;
            }
            
            groups.forEach(group => {
                const groupCards = flashcards.filter(card => card.groupId === group.id);
                const groupCard = document.createElement('div');
                groupCard.className = 'group-card';
                groupCard.innerHTML = \`
                    <div class="group-icon">📚</div>
                    <div class="group-name">\${group.name}</div>
                    <div class="group-count">\${groupCards.length} cards</div>
                \`;
                
                groupCard.addEventListener('click', () => {
                    selectGroup(group.id);
                });
                
                groupsGrid.appendChild(groupCard);
            });
        }

        function selectGroup(groupId) {
            currentGroupId = groupId;
            currentGroupCards = flashcards.filter(card => card.groupId === groupId);
            currentCardIndex = 0;
            
            // Update UI
            document.getElementById('groupSelection').style.display = 'none';
            document.getElementById('flashcardView').style.display = 'block';
            
            const group = groups.find(g => g.id === groupId);
            document.getElementById('currentGroupName').textContent = group.name;
            
            updateFlashcard();
        }

        function goBackToGroups() {
            document.getElementById('groupSelection').style.display = 'block';
            document.getElementById('flashcardView').style.display = 'none';
            currentGroupId = null;
            currentGroupCards = [];
            currentCardIndex = 0;
        }

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
            if (currentGroupCards.length === 0) {
                const flashcardElement = document.getElementById('currentFlashcard');
                flashcardElement.innerHTML = \`
                    <div class="empty-state">
                        <h3>No flashcards in this group</h3>
                        <p>Please ask your teacher to add flashcards to this group</p>
                    </div>
                \`;
                
                document.getElementById('currentCard').textContent = '0';
                document.getElementById('totalCards').textContent = '0';
                document.getElementById('prevBtn').disabled = true;
                document.getElementById('nextBtn').disabled = true;
                return;
            }
            
            const currentCard = currentGroupCards[currentCardIndex];
            const flashcardElement = document.getElementById('currentFlashcard');
            
            flashcardElement.innerHTML = \`
                <img src="\${currentCard.image}" alt="\${currentCard.word}" class="flashcard-image">
                <div class="flashcard-text">\${currentCard.word}</div>
            \`;
            
            document.getElementById('currentCard').textContent = currentCardIndex + 1;
            document.getElementById('totalCards').textContent = currentGroupCards.length;
            
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            
            prevBtn.disabled = currentCardIndex === 0;
            nextBtn.disabled = currentCardIndex === currentGroupCards.length - 1;
            
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
            if (currentCardIndex < currentGroupCards.length - 1) {
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
            
            // Set up navigation buttons
            const prevBtn = document.getElementById('prevBtn');
            const nextBtn = document.getElementById('nextBtn');
            const backBtn = document.getElementById('backToGroupsBtn');
            
            prevBtn.addEventListener('click', goToPrevious);
            nextBtn.addEventListener('click', goToNext);
            backBtn.addEventListener('click', goBackToGroups);
            
            // Initialize with groups view
            renderGroups();
            
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
        if (document.getElementById('groupedCardsView').style.display !== 'none') {
            renderGroupedCardsView();
        }
    }
}

// Function to edit card category
function editCardCategory(cardId) {
    const categoryDisplay = document.querySelector(`#cardCategory-${cardId} .category-display`);
    const categorySelect = document.getElementById(`categorySelect-${cardId}`);
    const editBtn = document.querySelector(`button[onclick="editCardCategory(${cardId})"]`);
    const saveBtn = document.getElementById(`saveCategory-${cardId}`);
    const cancelBtn = document.getElementById(`cancelCategory-${cardId}`);
    
    // Hide display and show select
    categoryDisplay.style.display = 'none';
    categorySelect.style.display = 'inline-block';
    
    // Update button visibility
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    
    // Focus on select
    categorySelect.focus();
}

// Function to save card category
function saveCardCategory(cardId) {
    const categorySelect = document.getElementById(`categorySelect-${cardId}`);
    const newCategoryId = categorySelect.value ? parseInt(categorySelect.value) : null;
    
    // Find and update the card
    const card = flashcards.find(c => c.id === cardId);
    if (card) {
        card.categoryId = newCategoryId;
        saveFlashcards();
        
        // Refresh views
        renderGridView();
        if (document.getElementById('groupedCardsView').style.display !== 'none') {
            renderGroupedCardsView();
        }
        
        alert('Card category updated successfully!');
    }
}

// Function to swap card positions within a category
function swapCardPositionsInCategory(cardId, newPosition, categoryId) {
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;
    
    // Get all cards in the target category, sorted by sortOrder
    const cardsInCategory = flashcards
        .filter(c => c.categoryId === categoryId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    if (newPosition < 1 || newPosition > cardsInCategory.length) {
        return;
    }
    
    // Find current position of the card in this category
    const currentPositionInCategory = cardsInCategory.findIndex(c => c.id === cardId) + 1;
    
    if (newPosition !== currentPositionInCategory) {
        // Remove the card from the category array
        const cardToMove = cardsInCategory.splice(currentPositionInCategory - 1, 1)[0];
        
        // Insert at new position
        cardsInCategory.splice(newPosition - 1, 0, cardToMove);
        
        // Update sortOrder for all cards in this category
        cardsInCategory.forEach((categoryCard, index) => {
            categoryCard.sortOrder = index + 1;
        });
        
        console.log(`Card "${cardToMove.word}" moved to position ${newPosition} in category ${categoryId || 'No Category'}`);
    }
}

// Modal-based card editing functions
let currentEditingCardId = null;

function openCardEditModal(cardId) {
    currentEditingCardId = cardId;
    const card = flashcards.find(c => c.id === cardId);
    if (!card) return;
    
    // Check if modal elements exist before trying to access them
    const editCardWord = document.getElementById('editCardWord');
    const editCardCategory = document.getElementById('editCardCategory');
    const editCardOrder = document.getElementById('editCardOrder');
    const editImagePreview = document.getElementById('editImagePreview');
    const cardEditModal = document.getElementById('cardEditModal');
    
    if (!editCardWord || !editCardCategory || !editCardOrder || !editImagePreview || !cardEditModal) {
        console.warn('Edit modal elements not found in DOM');
        return;
    }
    
    // Populate modal with current card data
    editCardWord.value = card.word;
    editCardCategory.value = card.categoryId || '';
    
    // Set the current order position within the category
    const cardsInSameCategory = flashcards
        .filter(c => c.categoryId === card.categoryId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const currentPositionInCategory = cardsInSameCategory.findIndex(c => c.id === cardId) + 1;
    editCardOrder.value = currentPositionInCategory;
    editCardOrder.max = cardsInSameCategory.length;
    
    // Show current image
    if (card.image) {
        editImagePreview.innerHTML = `<img src="${getImageUrl(card.image)}" alt="Current image" style="max-width: 200px; max-height: 150px; object-fit: contain;">`;
    } else {
        editImagePreview.innerHTML = '<p>No image</p>';
    }
    
    // Populate category dropdown with hierarchical names
    editCardCategory.innerHTML = '<option value="">No Category</option>';
    groups.forEach(group => {
        let displayName = group.name;
        if (group.parentId) {
            const parentGroup = groups.find(g => g.id === group.parentId);
            displayName = parentGroup ? `${parentGroup.name} > ${group.name}` : group.name;
        }
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = displayName;
        option.selected = card.categoryId === group.id;
        editCardCategory.appendChild(option);
    });
    
    // Show modal
    cardEditModal.style.display = 'flex';
}

function closeCardEditModal() {
    const cardEditModal = document.getElementById('cardEditModal');
    const editCardImage = document.getElementById('editCardImage');
    
    if (cardEditModal) cardEditModal.style.display = 'none';
    if (editCardImage) editCardImage.value = '';
    currentEditingCardId = null;
}

async function saveCardEdits() {
    if (!currentEditingCardId) return;
    
    const card = flashcards.find(c => c.id === currentEditingCardId);
    if (!card) return;
    
    // Check if modal elements exist
    const editCardWord = document.getElementById('editCardWord');
    const editCardCategory = document.getElementById('editCardCategory');
    const editCardOrder = document.getElementById('editCardOrder');
    const editCardImage = document.getElementById('editCardImage');
    
    if (!editCardWord || !editCardCategory || !editCardOrder || !editCardImage) {
        console.warn('Edit modal elements not found in DOM');
        return;
    }
    
    // Get new values
    const newWord = editCardWord.value.trim();
    const newCategoryId = editCardCategory.value;
    const newOrder = parseInt(editCardOrder.value);
    const imageFile = editCardImage.files[0];
    
    if (!newWord) {
        alert('Please enter a word/text for the flashcard.');
        return;
    }
    
    // Update card data first (in case category changed)
    const oldCategoryId = card.categoryId;
    card.word = newWord;
    card.categoryId = newCategoryId ? parseInt(newCategoryId) : null;
    
    // Get cards in the target category (after potential category change)
    const cardsInTargetCategory = flashcards
        .filter(c => c.categoryId === card.categoryId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    
    if (isNaN(newOrder) || newOrder < 1 || newOrder > cardsInTargetCategory.length) {
        alert(`Please enter a valid order position between 1 and ${cardsInTargetCategory.length} for this category.`);
        return;
    }
    
    // Handle order change - swap positions within category if needed
    const currentPositionInCategory = cardsInTargetCategory.findIndex(c => c.id === currentEditingCardId) + 1;
    if (newOrder !== currentPositionInCategory || oldCategoryId !== card.categoryId) {
        swapCardPositionsInCategory(currentEditingCardId, newOrder, card.categoryId);
    }
    
    // Handle image update if new image selected
    if (imageFile) {
        try {
            const compressedImage = await compressImage(imageFile);
            card.image = compressedImage;
        } catch (error) {
            console.error('Error processing image:', error);
            alert('Error processing image. Please try again.');
            return;
        }
    }
    
    // Save to database
    try {
        await saveFlashcards();
        
        // Refresh views
        renderGridView();
        if (document.getElementById('groupedCardsView').style.display !== 'none') {
            renderGroupedCardsView();
        }
        
        closeCardEditModal();
        alert('Card updated successfully!');
    } catch (error) {
        console.error('Error saving card:', error);
        alert('Error saving card. Please try again.');
    }
}

function deleteCardFromModal() {
    if (!currentEditingCardId) return;
    
    if (confirm('Are you sure you want to delete this card?')) {
        const cardIndex = flashcards.findIndex(c => c.id === currentEditingCardId);
        if (cardIndex !== -1) {
            flashcards.splice(cardIndex, 1);
            saveFlashcards();
            
            // Refresh views
            renderGridView();
            if (document.getElementById('groupedCardsView').style.display !== 'none') {
                renderGroupedCardsView();
            }
            
            closeCardEditModal();
            alert('Card deleted successfully!');
        }
    }
}

// Note: Images are now stored as base64 directly in MongoDB, no separate upload needed

// Function to compress image before storing
function compressImage(file, maxWidth = 800, maxHeight = 600, quality = 0.8) {
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
            
            // Enable image smoothing for better quality
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
            
            const finalSizeKB = ((compressedDataUrl.split(',')[1].length * 3) / 4) / 1024;
            console.log(`📸 Image compressed: ${finalSizeKB.toFixed(1)}KB (${width}x${height}, quality: ${quality})`);
            
            resolve(compressedDataUrl);
        };
        
        img.src = URL.createObjectURL(file);
    });
}


// Function to save a single flashcard
async function saveSingleFlashcard(flashcard) {
    try {
        const payload = {
            flashcards: [flashcard], // Only the new flashcard
            groups: [], // Empty for single flashcard saves
            settings: {}, // Empty for single flashcard saves
            classId: currentClassId,
            nextId: nextId
        };

        const payloadSize = estimatePayloadSize(payload);
        console.log(`📦 Single flashcard payload size: ${(payloadSize / 1024).toFixed(1)} KB`);

        const response = await fetch('/api/flashcards?single=true', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 413) {
                throw new Error('Single flashcard too large. Please reduce image size.');
            }
            throw new Error(`Save failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Save failed');
        }

        console.log('✅ Single flashcard saved successfully');
        return true;
    } catch (error) {
        console.error('Error saving single flashcard:', error);
        alert(`Error saving flashcard: ${error.message}`);
        return false;
    }
}

// Function to estimate payload size
function estimatePayloadSize(data) {
    return new Blob([JSON.stringify(data)]).size;
}

// Function to save flashcards and groups to API (shared storage)
async function saveFlashcards() {
    try {
        const payload = {
            flashcards: flashcards,
            groups: groups,
            settings: {
                welcomeTitleLine1: localStorage.getItem('welcomeTitleLine1') || 'Welcome to',
                welcomeTitleLine2: localStorage.getItem('welcomeTitleLine2') || 'Mrs Sadaf 1B Class',
                welcomeFont: localStorage.getItem('welcomeFont') || 'Arial Black'
            },
            classId: currentClassId, // Include current class ID
            nextId: nextId
        };

        const payloadSize = estimatePayloadSize(payload);
        console.log(`📦 Payload size: ${(payloadSize / 1024 / 1024).toFixed(2)} MB`);

        const response = await fetch('/api/flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            if (response.status === 413) {
                throw new Error('Payload too large. Please reduce image sizes or try again.');
            }
            throw new Error(`Save failed: ${response.statusText}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.error || 'Save failed');
        }

        console.log('Flashcards and groups saved to shared storage');
    } catch (error) {
        console.error('Error saving flashcards:', error);
        alert(`Error saving flashcards: ${error.message}`);
    }
}

// Function to load flashcards and groups from API (shared storage)
async function loadFlashcards() {
    try {
        // Build API URL with class parameter if specified
        let apiUrl = '/api/flashcards';
        
        if (currentClassId) {
            // Filter by classId for specific classes
            apiUrl += `?class=${encodeURIComponent(currentClassId)}`;
        }
        
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`Load failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.flashcards) {
            flashcards = result.flashcards;
            nextId = flashcards.length > 0 ? Math.max(...flashcards.map(card => card.id)) + 1 : 1;
            
            // Assign sortOrder to existing cards that don't have it (backwards compatibility)
            // Group by category and assign category-specific sortOrders
            let needsUpdate = false;
            const cardsByCategory = {};
            
            // Group cards by category
            flashcards.forEach(card => {
                const categoryKey = card.categoryId || 'null';
                if (!cardsByCategory[categoryKey]) {
                    cardsByCategory[categoryKey] = [];
                }
                cardsByCategory[categoryKey].push(card);
            });
            
            // Assign sortOrder within each category
            Object.values(cardsByCategory).forEach(categoryCards => {
                categoryCards.forEach((card, index) => {
                    if (card.sortOrder === undefined || card.sortOrder === null) {
                        card.sortOrder = index + 1;
                        needsUpdate = true;
                    }
                });
            });
            
            // Save updated cards with sortOrder if needed
            if (needsUpdate) {
                saveFlashcards().catch(error => {
                    console.error('Error updating card sort orders:', error);
                });
            }
        } else {
            flashcards = [];
            nextId = 1;
        }

        if (result.success && result.groups) {
            groups = result.groups;
            nextGroupId = groups.length > 0 ? Math.max(...groups.map(group => group.id)) + 1 : 1;
        } else {
            groups = [];
            nextGroupId = 1;
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
            // Update the settings form if it's visible
            loadSettings();
        }
    } catch (error) {
        console.error('Error loading flashcards:', error);
        // Fallback to empty arrays
        flashcards = [];
        groups = [];
        nextId = 1;
        nextGroupId = 1;
    }
}

// Group management functions
function addGroup() {
    const groupName = document.getElementById('groupNameInput').value.trim();
    const parentGroupId = document.getElementById('parentGroupSelect').value;
    
    if (!groupName) {
        alert('Please enter a unit name');
        return;
    }
    
    // Check if group name already exists within the same parent category
    const parentId = parentGroupId ? parseInt(parentGroupId) : null;
    const existingInSameParent = groups.some(group => 
        group.name.toLowerCase() === groupName.toLowerCase() && 
        group.parentId === parentId
    );
    
    if (existingInSameParent) {
        const parentName = parentId ? groups.find(g => g.id === parentId)?.name || 'Unknown' : 'top level';
        alert(`A unit with the name "${groupName}" already exists in ${parentName}. Please choose a different name.`);
        return;
    }
    
    const newGroup = {
        id: nextGroupId++,
        name: groupName,
        color: getRandomColor(),
        parentId: parentGroupId ? parseInt(parentGroupId) : null
    };
    
    groups.push(newGroup);
    saveFlashcards();
    renderGroupsList();
    updateGroupSelect();
    updateParentGroupSelect();
    populateMultiUploadCategories();
    
    // Clear inputs
    document.getElementById('groupNameInput').value = '';
    document.getElementById('parentGroupSelect').value = '';
    
    alert('Unit added successfully!');
}

function deleteGroup(groupId) {
    if (confirm('Are you sure you want to delete this unit? All flashcards in this unit will be moved to "No Unit".')) {
        // Move flashcards from this group to no group
        flashcards.forEach(card => {
            if (card.categoryId === groupId) {
                card.categoryId = null;
            }
        });
        
        // Also move any child categories to become top-level
        groups.forEach(group => {
            if (group.parentId === groupId) {
                group.parentId = null;
            }
        });
        
        // Remove the group
        groups = groups.filter(group => group.id !== groupId);
        
        saveFlashcards();
        renderGroupsList();
        updateGroupSelect();
        updateParentGroupSelect();
        populateMultiUploadCategories();
        renderGridView();
        if (document.getElementById('groupedCardsView').style.display !== 'none') {
            renderGroupedCardsView();
        }
        
        alert('Unit deleted successfully!');
    }
}

// Table-based editing functions
function editGroupTable(groupId) {
    const groupNameDisplay = document.getElementById(`groupName-${groupId}`);
    const parentNameDisplay = document.getElementById(`parentName-${groupId}`);
    const groupNameInput = document.getElementById(`groupInput-${groupId}`);
    const parentInput = document.getElementById(`parentInput-${groupId}`);
    const editBtn = document.getElementById(`editBtn-${groupId}`);
    const saveBtn = document.getElementById(`saveBtn-${groupId}`);
    const cancelBtn = document.getElementById(`cancelBtn-${groupId}`);
    
    // Hide display elements and show edit inputs
    groupNameDisplay.style.display = 'none';
    parentNameDisplay.style.display = 'none';
    groupNameInput.style.display = 'block';
    parentInput.style.display = 'block';
    
    // Update button visibility
    editBtn.style.display = 'none';
    saveBtn.style.display = 'inline-block';
    cancelBtn.style.display = 'inline-block';
    
    // Focus on name input and select all text
    groupNameInput.focus();
    groupNameInput.select();
    
    // Add enter key listener for quick save
    const handleKeydown = function(e) {
        if (e.key === 'Enter') {
            saveGroupTable(groupId);
        } else if (e.key === 'Escape') {
            cancelEditGroupTable(groupId);
        }
    };
    
    groupNameInput.addEventListener('keydown', handleKeydown);
    parentInput.addEventListener('keydown', handleKeydown);
}

function saveGroupTable(groupId) {
    const groupNameInput = document.getElementById(`groupInput-${groupId}`);
    const parentInput = document.getElementById(`parentInput-${groupId}`);
    const newName = groupNameInput.value.trim();
    const newParentId = parentInput.value ? parseInt(parentInput.value) : null;
    
    if (!newName) {
        alert('Please enter a unit name');
        return;
    }
    
    // Check if group name already exists within the same parent category (excluding current group)
    const parentId = newParentId ? parseInt(newParentId) : null;
    const existingInSameParent = groups.some(group => 
        group.id !== groupId && 
        group.name.toLowerCase() === newName.toLowerCase() && 
        group.parentId === parentId
    );
    
    if (existingInSameParent) {
        const parentName = parentId ? groups.find(g => g.id === parentId)?.name || 'Unknown' : 'top level';
        alert(`A unit with the name "${newName}" already exists in ${parentName}. Please choose a different name.`);
        return;
    }
    
    // Prevent circular references
    if (newParentId === groupId) {
        alert('A unit cannot be its own parent');
        return;
    }
    
    // Check if the new parent is a descendant of this group
    if (newParentId && isDescendant(groupId, newParentId)) {
        alert('Cannot set parent: this would create a circular reference');
        return;
    }
    
    // Find and update the group
    const group = groups.find(g => g.id === groupId);
    if (group) {
        group.name = newName;
        group.parentId = newParentId;
        saveFlashcards();
        
        // Update all UI elements that display group names
        updateAllGroupReferences();
        
        alert('Unit updated successfully!');
    }
    
    // Exit edit mode
    cancelEditGroupTable(groupId);
}

function cancelEditGroupTable(groupId) {
    const groupNameDisplay = document.getElementById(`groupName-${groupId}`);
    const parentNameDisplay = document.getElementById(`parentName-${groupId}`);
    const groupNameInput = document.getElementById(`groupInput-${groupId}`);
    const parentInput = document.getElementById(`parentInput-${groupId}`);
    const editBtn = document.getElementById(`editBtn-${groupId}`);
    const saveBtn = document.getElementById(`saveBtn-${groupId}`);
    const cancelBtn = document.getElementById(`cancelBtn-${groupId}`);
    
    // Reset input values to original
    const group = groups.find(g => g.id === groupId);
    if (group) {
        groupNameInput.value = group.name;
        parentInput.value = group.parentId || '';
    }
    
    // Show display elements and hide edit inputs
    groupNameDisplay.style.display = 'block';
    parentNameDisplay.style.display = 'block';
    groupNameInput.style.display = 'none';
    parentInput.style.display = 'none';
    
    // Update button visibility
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
}

// Legacy functions for backward compatibility (if needed elsewhere)
function editGroup(groupId) {
    editGroupTable(groupId);
}

function saveGroupName(groupId) {
    saveGroupTable(groupId);
}

function cancelEditGroup(groupId) {
    cancelEditGroupTable(groupId);
}

// Helper function to check if a group is a descendant of another
function isDescendant(parentId, potentialDescendantId) {
    const potentialDescendant = groups.find(g => g.id === potentialDescendantId);
    if (!potentialDescendant || !potentialDescendant.parentId) return false;
    
    if (potentialDescendant.parentId === parentId) return true;
    return isDescendant(parentId, potentialDescendant.parentId);
}

function cancelEditGroup(groupId) {
    const groupNameDisplay = document.getElementById(`groupName-${groupId}`);
    const editForm = document.getElementById(`editForm-${groupId}`);
    const groupNameInput = document.getElementById(`groupInput-${groupId}`);
    const parentInput = document.getElementById(`parentInput-${groupId}`);
    const editBtn = document.getElementById(`editBtn-${groupId}`);
    const saveBtn = document.getElementById(`saveBtn-${groupId}`);
    const cancelBtn = document.getElementById(`cancelBtn-${groupId}`);
    
    // Reset input values to original
    const group = groups.find(g => g.id === groupId);
    if (group) {
        groupNameInput.value = group.name;
        parentInput.value = group.parentId || '';
    }
    
    // Show display and hide edit form
    groupNameDisplay.style.display = 'block';
    editForm.style.display = 'none';
    
    // Show edit button, hide save and cancel buttons
    editBtn.style.display = 'inline-block';
    saveBtn.style.display = 'none';
    cancelBtn.style.display = 'none';
}

function updateAllGroupReferences() {
    // Update the groups list display
    renderGroupsList();
    
    // Update the group select dropdown
    updateGroupSelect();
    
    // Update the parent group select dropdown
    updateParentGroupSelect();
    
    // Update the multi upload category dropdown
    populateMultiUploadCategories();
    
    // Update grid view if visible
    renderGridView();
    
    // Update grouped cards view if visible
    if (document.getElementById('groupedCardsView').style.display !== 'none') {
        renderGroupedCardsView();
    }
    
    // Update group detail view if visible
    const groupDetailView = document.getElementById('groupDetailView');
    if (groupDetailView && groupDetailView.style.display !== 'none') {
        // We need to use the currentGroupIdForDetail to find the updated group
        if (typeof currentGroupIdForDetail !== 'undefined') {
            const group = groups.find(g => g.id === currentGroupIdForDetail);
            if (group) {
                document.getElementById('selectedGroupName').textContent = group.name;
            }
        }
    }
}

function renderGroupsList() {
    const tableBody = document.getElementById('groupsTableBody');
    const noGroupsMessage = document.getElementById('noGroupsMessage');
    const groupsTable = document.getElementById('groupsTable');
    
    tableBody.innerHTML = '';
    
    if (groups.length === 0) {
        groupsTable.style.display = 'none';
        noGroupsMessage.style.display = 'block';
        return;
    }
    
    groupsTable.style.display = 'table';
    noGroupsMessage.style.display = 'none';
    
    groups.forEach(group => {
        const row = document.createElement('tr');
        row.id = `groupRow-${group.id}`;
        
        // Get current parent name for display
        const parent = group.parentId ? groups.find(g => g.id === group.parentId) : null;
        const parentDisplayText = parent ? parent.name : 'None';
        const parentDisplayClass = parent ? 'parent-category-display' : 'no-parent';
        
        row.innerHTML = `
            <td>
                <div class="table-cell-content">
                    <span class="group-name-display" id="groupName-${group.id}">${group.name}</span>
                    <input type="text" class="table-edit-input" id="groupInput-${group.id}" value="${group.name}" style="display: none;">
                </div>
            </td>
            <td>
                <div class="table-cell-content">
                    <span class="parent-display ${parentDisplayClass}" id="parentName-${group.id}">${parentDisplayText}</span>
                    <select class="table-edit-select" id="parentInput-${group.id}" style="display: none;">
                        <option value="">None (Top Level)</option>
                    </select>
                </div>
            </td>
            <td>
                <div class="table-actions">
                    <button class="table-edit-btn" id="editBtn-${group.id}" onclick="editGroupTable(${group.id})">Edit</button>
                    <button class="table-save-btn" id="saveBtn-${group.id}" onclick="saveGroupTable(${group.id})" style="display: none;">Save</button>
                    <button class="table-cancel-btn" id="cancelBtn-${group.id}" onclick="cancelEditGroupTable(${group.id})" style="display: none;">Cancel</button>
                    <button class="table-delete-btn" onclick="deleteGroup(${group.id})">Delete</button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
        
        // Populate parent select options for this group
        const parentSelect = document.getElementById(`parentInput-${group.id}`);
        groups.filter(g => !g.parentId && g.id !== group.id).forEach(parentGroup => {
            const option = document.createElement('option');
            option.value = parentGroup.id;
            option.textContent = parentGroup.name;
            option.selected = group.parentId === parentGroup.id;
            parentSelect.appendChild(option);
        });
    });
}

function updateGroupSelect() {
    const groupSelect = document.getElementById('groupSelect');
    groupSelect.innerHTML = '<option value="">Select a unit</option>';
    
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        
        // Show hierarchy in dropdown
        if (group.parentId) {
            const parent = groups.find(g => g.id === group.parentId);
            option.textContent = parent ? `${parent.name} > ${group.name}` : group.name;
        } else {
        option.textContent = group.name;
        }
        
        groupSelect.appendChild(option);
    });
}

function updateParentGroupSelect() {
    const parentGroupSelect = document.getElementById('parentGroupSelect');
    if (!parentGroupSelect) return;
    
    parentGroupSelect.innerHTML = '<option value="">None (Top Level)</option>';
    
    // Only show top-level categories as parent options
    groups.filter(group => !group.parentId).forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        option.textContent = group.name;
        parentGroupSelect.appendChild(option);
    });
}

function getRandomColor() {
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#00BCD4', '#795548', '#607D8B'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// Function to add a new flashcard
function addFlashcard(word, imageFile, categoryId) {
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
    
    // Compress image and store directly as base64
    compressImage(imageFile).then(async (compressedImage) => {
        // Calculate next sort order within the specific category
        const targetCategoryId = categoryId ? parseInt(categoryId) : null;
        const cardsInCategory = flashcards.filter(card => card.categoryId === targetCategoryId);
        const maxSortOrderInCategory = cardsInCategory.length > 0 ? 
            Math.max(...cardsInCategory.map(card => card.sortOrder || 0)) : 0;
        
        const newCard = {
            id: nextId++,
            word: word.trim(),
            image: compressedImage, // Store base64 data directly - no external dependencies
            audioUrl: '', // Will use text-to-speech
            categoryId: targetCategoryId,
            sortOrder: maxSortOrderInCategory + 1 // Add sort order within category
        };
        
        console.log('Adding card with categoryId:', newCard.categoryId, 'Original categoryId:', categoryId);
        
        flashcards.push(newCard);
        
        // Save only the new flashcard instead of all flashcards
        try {
            const success = await saveSingleFlashcard(newCard);
            if (!success) {
                // Remove the card from local array if save failed
                flashcards.pop();
                nextId--; // Reset nextId
                return;
            }
            
            // Refresh both views
            renderGridView();
            if (document.getElementById('groupedCardsView').style.display !== 'none') {
                // If we're in group detail view, refresh it; otherwise refresh folders
                if (document.getElementById('groupDetailView').style.display !== 'none') {
                    const groupName = document.getElementById('selectedGroupName').textContent;
                    const currentGroupId = groups.find(g => g.name === groupName)?.id || null;
                    showGroupDetail(currentGroupId, groupName);
                } else {
                    renderGroupedCardsView();
                }
            }
            
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
    
    // If no voices are loaded yet, try again after a short delay
    if (voices.length === 0) {
        console.log('🔄 No voices loaded yet, retrying in 100ms...');
        setTimeout(loadVoices, 100);
        return;
    }
    
    console.log(`🔊 Loaded ${voices.length} voices`);
    
    // Priority 1: Google US English voices (highest priority for consistency across devices)
    const googleUSVoices = voices.filter(voice => 
        voice.name.includes('Google') && 
        (voice.lang === 'en-US' || voice.lang.startsWith('en-US'))
    );
    
    if (googleUSVoices.length > 0) {
        selectedVoice = googleUSVoices[0];
        console.log('🎯 Using Google US English voice:', selectedVoice.name);
        return;
    }
    
    // Priority 2: Any Google English voice (online, high quality)
    const googleEnglishVoices = voices.filter(voice => 
        voice.name.includes('Google') && voice.lang.startsWith('en')
    );
    
    if (googleEnglishVoices.length > 0) {
        selectedVoice = googleEnglishVoices[0];
        console.log('🎯 Using Google English voice:', selectedVoice.name);
        return;
    }
    
    // Priority 3: Best offline voices (for when Google is not available)
    const offlineVoices = voices.filter(v => v.localService && v.lang.startsWith('en'));
    
    // iOS/iPhone specific voice preferences (most natural sounding)
    const iosPreferredNames = ['Samantha', 'Alex', 'Susan', 'Daniel', 'Karen', 'Moira'];
    // Windows specific voice preferences
    const windowsPreferredNames = ['Microsoft Zira', 'Microsoft David', 'Microsoft Mark'];
    // Combined preferences with iOS first (since it's more common on mobile)
    const preferredOfflineNames = [...iosPreferredNames, ...windowsPreferredNames];
    
    for (const name of preferredOfflineNames) {
        const found = offlineVoices.find(v => v.name.includes(name));
        if (found) {
            selectedVoice = found;
            console.log('🎯 Using offline voice:', found.name);
            return;
        }
    }
    
    // Priority 4: Any offline English voice
    if (offlineVoices.length > 0) {
        selectedVoice = offlineVoices[0];
        console.log('🎯 Using first offline English voice:', offlineVoices[0].name);
        return;
    }
    
    // Final fallback: Any English voice
    const englishVoices = voices.filter(voice => voice.lang.startsWith('en'));
    if (englishVoices.length > 0) {
        selectedVoice = englishVoices[0];
        console.log('🎯 Using fallback English voice:', englishVoices[0].name);
    } else {
        console.warn('❌ No English voice found');
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

// Multi Upload Variables
let multiUploadFiles = [];
let multiUploadData = [];

// Function to populate multi upload category dropdown
function populateMultiUploadCategories() {
    const categorySelect = document.getElementById('multiUploadDefaultCategory');
    if (!categorySelect) return;
    
    // Clear existing options
    categorySelect.innerHTML = '<option value="">No default unit</option>';
    
    // Add all groups as options with hierarchy (same as groupSelect in add card tab)
    groups.forEach(group => {
        const option = document.createElement('option');
        option.value = group.id;
        
        // Show hierarchy in dropdown
        if (group.parentId) {
            const parent = groups.find(g => g.id === group.parentId);
            option.textContent = parent ? `${parent.name} > ${group.name}` : group.name;
        } else {
            option.textContent = group.name;
        }
        
        categorySelect.appendChild(option);
    });
}

// Function to handle multi image file selection
function handleMultiImageSelection() {
    const fileInput = document.getElementById('multiImageInput');
    const newFiles = Array.from(fileInput.files);
    
    if (newFiles.length === 0) {
        return;
    }
    
    // Add new files to existing list (maintain order)
    multiUploadFiles = [...multiUploadFiles, ...newFiles];
    
    // Clear the file input so same files can be selected again
    fileInput.value = '';
    
    // Re-render the form with all files
    renderMultiUploadForm();
}

// Function to check if execute button should be enabled
function checkExecuteButtonState() {
    const rows = document.querySelectorAll('#multiUploadTableBody tr');
    const executeBtn = document.getElementById('executeMultiUploadBtn');
    
    if (!executeBtn) return;
    
    let hasValidEntries = false;
    
    rows.forEach((row, index) => {
        const wordInput = row.querySelector(`#word_${index}`);
        if (wordInput && wordInput.value.trim()) {
            hasValidEntries = true;
        }
    });
    
    executeBtn.disabled = !hasValidEntries;
}

// Function to render multi upload form
function renderMultiUploadForm() {
    const previewSection = document.getElementById('multiUploadPreview');
    const tableBody = document.getElementById('multiUploadTableBody');
    
    // Clear previous content
    tableBody.innerHTML = '';
    
    // If no files, hide preview section
    if (multiUploadFiles.length === 0) {
        previewSection.style.display = 'none';
        return;
    }
    
    // Create table rows first to maintain order
    multiUploadFiles.forEach((file, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="multi-upload-image-cell">
                <div class="multi-upload-loading">Loading...</div>
                <div class="multi-upload-filename">${file.name}</div>
            </td>
            <td>
                <input type="text" id="word_${index}" placeholder="Enter word or text" class="multi-upload-input" required>
            </td>
            <td>
                <select id="category_${index}" class="multi-upload-select">
                    <option value="">Use default unit</option>
                </select>
            </td>
            <td class="multi-upload-actions-cell">
                <button type="button" class="remove-row-btn" onclick="removeMultiUploadRow(${index})">Remove</button>
            </td>
        `;
        
        // Populate category dropdown for this item with hierarchy
        const categorySelect = row.querySelector(`#category_${index}`);
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.id;
            
            // Show hierarchy in dropdown
            if (group.parentId) {
                const parent = groups.find(g => g.id === group.parentId);
                option.textContent = parent ? `${parent.name} > ${group.name}` : group.name;
            } else {
                option.textContent = group.name;
            }
            
            categorySelect.appendChild(option);
        });
        
        // Add event listener to word input to check button state
        const wordInput = row.querySelector(`#word_${index}`);
        wordInput.addEventListener('input', checkExecuteButtonState);
        
        // Append row immediately to maintain order
        tableBody.appendChild(row);
        
        // Load image asynchronously and update the specific row
        const reader = new FileReader();
        reader.onload = function(e) {
            const imageCell = row.querySelector('.multi-upload-image-cell');
            imageCell.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}" class="multi-upload-image">
                <div class="multi-upload-filename">${file.name}</div>
            `;
        };
        reader.readAsDataURL(file);
    });
    
    // Show preview section
    previewSection.style.display = 'block';
    
    // Check button state after rendering
    checkExecuteButtonState();
}

// Function to remove a row from multi upload table
function removeMultiUploadRow(index) {
    // Remove from files array
    multiUploadFiles.splice(index, 1);
    
    // Re-render the form with updated indices
    renderMultiUploadForm();
    
    // Check button state after removal
    checkExecuteButtonState();
}

// Function to clear all images
function clearAllImages() {
    multiUploadFiles = [];
    document.getElementById('multiUploadPreview').style.display = 'none';
    document.getElementById('executeMultiUploadBtn').disabled = true;
}

// Function to execute multi upload
async function executeMultiUpload() {
    const rows = document.querySelectorAll('#multiUploadTableBody tr');
    multiUploadData = [];
    
    let hasErrors = false;
    
    rows.forEach((row, index) => {
        const wordInput = row.querySelector(`#word_${index}`);
        const categorySelect = row.querySelector(`#category_${index}`);
        
        if (!wordInput || !categorySelect) return; // Skip if elements don't exist
        
        const word = wordInput.value.trim();
        const categoryId = categorySelect.value;
        
        if (!word) {
            wordInput.style.borderColor = '#dc3545';
            hasErrors = true;
        } else {
            wordInput.style.borderColor = '#ced4da';
        }
        
        multiUploadData.push({
            word: word,
            categoryId: categoryId ? parseInt(categoryId) : null,
            imageFile: multiUploadFiles[index],
            index: index
        });
    });
    
    if (hasErrors) {
        alert('Please fill in all required fields (Word/Text)');
        return;
    }
    
    if (multiUploadData.length === 0) {
        alert('No data to upload. Please select images and fill in details first.');
        return;
    }
    
    const defaultCategoryId = document.getElementById('multiUploadDefaultCategory').value;
    
    // Show progress
    const progressSection = document.getElementById('multiUploadProgress');
    const progressFill = document.getElementById('multiProgressFill');
    const progressText = document.getElementById('multiProgressText');
    const resultsSection = document.getElementById('multiUploadResults');
    const resultsContent = document.getElementById('multiResultsContent');
    
    progressSection.style.display = 'block';
    resultsSection.style.display = 'none';
    
    const results = {
        success: [],
        errors: [],
        warnings: []
    };
    
    // Process each card
    for (let i = 0; i < multiUploadData.length; i++) {
        const item = multiUploadData[i];
        const progress = ((i + 1) / multiUploadData.length) * 100;
        
        progressFill.style.width = progress + '%';
        progressText.textContent = `Creating ${i + 1} of ${multiUploadData.length}: ${item.word}`;
        
        try {
            // Determine category ID
            let categoryId = item.categoryId;
            if (!categoryId) {
                categoryId = defaultCategoryId ? parseInt(defaultCategoryId) : null;
            }
            
            // Compress image
            const compressedImage = await compressImage(item.imageFile);
            
            // Calculate sort order
            const cardsInCategory = flashcards.filter(card => card.categoryId === categoryId);
            const maxSortOrderInCategory = cardsInCategory.length > 0 ? 
                Math.max(...cardsInCategory.map(card => card.sortOrder || 0)) : 0;
            
            // Create new card
            const newCard = {
                id: nextId++,
                word: item.word,
                image: compressedImage,
                audioUrl: '',
                categoryId: categoryId,
                sortOrder: maxSortOrderInCategory + 1
            };
            
            // Add card to local array
            flashcards.push(newCard);
            
            // Save to database
            const success = await saveSingleFlashcard(newCard);
            if (!success) {
                throw new Error('Failed to save to database');
            }
            
            results.success.push(`"${item.word}": Created successfully`);
            
        } catch (error) {
            results.errors.push(`"${item.word}": ${error.message}`);
            console.error('Multi upload error for', item.word, ':', error);
        }
    }
    
    // Hide progress and show results
    progressSection.style.display = 'none';
    resultsSection.style.display = 'block';
    
    // Render results
    resultsContent.innerHTML = [
        ...results.success.map(msg => `<div class="multi-result-item multi-result-success">✓ ${msg}</div>`),
        ...results.warnings.map(msg => `<div class="multi-result-item multi-result-warning">⚠ ${msg}</div>`),
        ...results.errors.map(msg => `<div class="multi-result-item multi-result-error">✗ ${msg}</div>`)
    ].join('');
    
    // Refresh views
    renderGridView();
    if (document.getElementById('groupedCardsView').style.display !== 'none') {
        renderGroupedCardsView();
    }
    
    // Clear upload data
    multiUploadFiles = [];
    multiUploadData = [];
    document.getElementById('multiImageInput').value = '';
    document.getElementById('executeMultiUploadBtn').disabled = true;
    document.getElementById('multiUploadPreview').style.display = 'none';
    
    // Show summary
    const totalProcessed = results.success.length + results.warnings.length + results.errors.length;
    alert(`Upload completed!\n\nSuccess: ${results.success.length}\nWarnings: ${results.warnings.length}\nErrors: ${results.errors.length}\n\nTotal processed: ${totalProcessed}`);
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    // Load classes first
    await loadClasses();
    
    // Show class selection screen initially
    document.getElementById('classSelectionScreen').style.display = 'block';
    document.getElementById('managementInterface').style.display = 'none';
    
    // Render class selection
    renderClassSelection();
    
    // Load voices immediately
    loadVoices();
    
    // Load voices again when they become available (some browsers load them asynchronously)
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    // Additional retry mechanism for voice loading
    setTimeout(() => {
        if (!selectedVoice) {
            console.log('🔄 Retrying voice loading after 500ms...');
            loadVoices();
        }
    }, 500);
    
    // Final retry after 2 seconds
    setTimeout(() => {
        if (!selectedVoice) {
            console.log('🔄 Final voice loading retry after 2s...');
            loadVoices();
        }
    }, 2000);
    
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
        const categoryId = document.getElementById('groupSelect').value;
        addFlashcard(word, imageFile, categoryId);
    });

    // Set up multi upload functionality
    document.getElementById('multiImageInput').addEventListener('change', handleMultiImageSelection);
    document.getElementById('executeMultiUploadBtn').addEventListener('click', executeMultiUpload);

    // Set up add group button
    document.getElementById('addGroupBtn').addEventListener('click', addGroup);

    // Set up back to groups button
    document.getElementById('backToGroupsBtn').addEventListener('click', goBackToGroups);

    // Set up settings form event listeners
    const welcomeTitleLine1 = document.getElementById('welcomeTitleLine1');
    const welcomeTitleLine2 = document.getElementById('welcomeTitleLine2');
    const welcomeFontSelect = document.getElementById('welcomeFontSelect');
    
    if (welcomeTitleLine1) welcomeTitleLine1.addEventListener('input', updatePreview);
    if (welcomeTitleLine2) welcomeTitleLine2.addEventListener('input', updatePreview);
    if (welcomeFontSelect) welcomeFontSelect.addEventListener('change', updatePreview);
    
    // Set up modal image preview
    const editCardImage = document.getElementById('editCardImage');
    if (editCardImage) {
        editCardImage.addEventListener('change', function(e) {
            const file = e.target.files[0];
            const preview = document.getElementById('editImagePreview');
            if (file && preview) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.innerHTML = `<img src="${e.target.result}" alt="New image preview" style="max-width: 200px; max-height: 150px; object-fit: contain;">`;
                };
                reader.readAsDataURL(file);
            }
        });
    }
    
    // Close modal when clicking outside
    const cardEditModal = document.getElementById('cardEditModal');
    if (cardEditModal) {
        cardEditModal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeCardEditModal();
            }
        });
    }
    
    // Set up navigation buttons (only if they exist)
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    
    if (prevBtn) prevBtn.addEventListener('click', goToPrevious);
    if (nextBtn) nextBtn.addEventListener('click', goToNext);
    if (deleteBtn) deleteBtn.addEventListener('click', deleteCurrentCard);
    
    // Initialize responsive pagination first
    updateItemsPerPage();
    
    // Initialize with grid view
    renderGridView();
    
    // Add window resize listener for responsive pagination
    window.addEventListener('resize', () => {
        updateItemsPerPage();
        // Re-render current view to update pagination
        if (currentView === 'allCards') {
            renderGridView();
        } else if (currentView === 'groupFolders') {
            renderGroupedCardsView();
        } else if (currentView === 'groupDetail') {
            renderGroupDetailView(currentGroupIdForDetail);
        }
    });
    
    // Add keyboard navigation
    document.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            goToPrevious();
        } else if (event.key === 'ArrowRight') {
            goToNext();
        }
    });
});

// Bulk selection and deletion functions
function updateDeleteButton() {
    const checkboxes = document.querySelectorAll('.card-select-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.card-select-checkbox:checked');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectAllBtn = document.getElementById('selectAllBtn');
    
    if (deleteBtn) {
        if (selectedCheckboxes.length > 0) {
            deleteBtn.disabled = false;
            deleteBtn.textContent = `Delete Selected (${selectedCheckboxes.length})`;
        } else {
            deleteBtn.disabled = true;
            deleteBtn.textContent = 'Delete Selected (0)';
        }
    }
    
    // Update Select All button text
    if (selectAllBtn) {
        if (selectedCheckboxes.length === checkboxes.length && checkboxes.length > 0) {
            selectAllBtn.textContent = 'Select None';
        } else {
            selectAllBtn.textContent = 'Select All';
        }
    }
}

function toggleSelectAll() {
    const checkboxes = document.querySelectorAll('.card-select-checkbox');
    const selectedCheckboxes = document.querySelectorAll('.card-select-checkbox:checked');
    const selectAll = selectedCheckboxes.length < checkboxes.length;
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
    });
    
    updateDeleteButton();
}

async function deleteSelectedCards() {
    const selectedCheckboxes = document.querySelectorAll('.card-select-checkbox:checked');
    
    if (selectedCheckboxes.length === 0) {
        alert('No cards selected for deletion.');
        return;
    }
    
    const selectedIds = Array.from(selectedCheckboxes).map(cb => parseInt(cb.dataset.cardId));
    const selectedCards = flashcards.filter(card => selectedIds.includes(card.id));
    
    const confirmMessage = `Are you sure you want to delete ${selectedCards.length} selected card(s)?\n\nCards to delete:\n${selectedCards.map(card => `• ${card.word}`).join('\n')}`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Remove selected cards
    flashcards = flashcards.filter(card => !selectedIds.includes(card.id));
    
    // Update sortOrder for remaining cards within each category
    const cardsByCategory = {};
    
    // Group remaining cards by category
    flashcards.forEach(card => {
        const categoryKey = card.categoryId || 'null';
        if (!cardsByCategory[categoryKey]) {
            cardsByCategory[categoryKey] = [];
        }
        cardsByCategory[categoryKey].push(card);
    });
    
    // Update sortOrder within each category
    Object.values(cardsByCategory).forEach(categoryCards => {
        categoryCards
            .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
            .forEach((card, index) => {
                card.sortOrder = index + 1;
            });
    });
    
    try {
        await saveFlashcards();
        
        // Refresh views
        renderGridView();
        if (document.getElementById('groupedCardsView').style.display !== 'none') {
            renderGroupedCardsView();
        }
        
        // Update delete button
        updateDeleteButton();
        
        alert(`Successfully deleted ${selectedCards.length} card(s).`);
    } catch (error) {
        console.error('Error deleting cards:', error);
        alert('Error deleting cards. Please try again.');
    }
}

// Load all classes from the API
async function loadClasses() {
    try {
        const response = await fetch('/api/classes');
        
        if (!response.ok) {
            throw new Error(`Load classes failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        if (result.success && result.classes) {
            availableClasses = result.classes;
        } else {
            availableClasses = [];
        }

        console.log('Classes loaded:', availableClasses.length);
    } catch (error) {
        console.error('Error loading classes:', error);
        availableClasses = [];
    }
}


// Migrate existing data without classId to the default class
async function migrateExistingDataToDefaultClass(defaultClassId) {
    try {
        console.log('Migrating existing data to default class...');
        
        // Load current data
        const response = await fetch('/api/flashcards');
        if (!response.ok) return;
        
        const result = await response.json();
        if (!result.success) return;
        
        const flashcards = result.flashcards || [];
        const groups = result.groups || [];
        const settings = result.settings || {};
        
        console.log('Current data loaded:', { 
            flashcardsCount: flashcards.length, 
            groupsCount: groups.length,
            hasSettings: !!settings
        });
        
        // Find data without classId
        const flashcardsToMigrate = flashcards.filter(card => !card.classId);
        const groupsToMigrate = groups.filter(group => !group.classId);
        const settingsToMigrate = settings && !settings.classId ? settings : null;
        
        console.log('Data to migrate:', {
            flashcardsToMigrate: flashcardsToMigrate.length,
            groupsToMigrate: groupsToMigrate.length,
            settingsToMigrate: !!settingsToMigrate
        });
        
        if (flashcardsToMigrate.length === 0 && groupsToMigrate.length === 0 && !settingsToMigrate) {
            console.log('No data needs migration');
            return;
        }
        
        // Create updated versions with classId
        // Remove MongoDB _id field to avoid conflicts
        const updatedFlashcards = flashcardsToMigrate.map(card => {
            const { _id, ...cardWithoutId } = card;
            return {
                ...cardWithoutId,
                classId: defaultClassId
            };
        });
        
        const updatedGroups = groupsToMigrate.map(group => {
            const { _id, ...groupWithoutId } = group;
            return {
                ...groupWithoutId,
                classId: defaultClassId
            };
        });
        
        const updatedSettings = settingsToMigrate ? (() => {
            const { _id, ...settingsWithoutId } = settingsToMigrate;
            return {
                ...settingsWithoutId,
                classId: defaultClassId
            };
        })() : null;
        
        console.log('Attempting safe migration with only unassigned data...');
        console.log('Migration target classId:', defaultClassId);
        
        // Use a safer approach: only send the data that needs classId assignment
        const saveResponse = await fetch('/api/flashcards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                flashcards: updatedFlashcards,
                groups: updatedGroups,
                settings: updatedSettings,
                classId: defaultClassId
            })
        });
        
        const saveResult = await saveResponse.json();
        
        if (saveResponse.ok && saveResult.success) {
            console.log('Successfully migrated existing data to default class');
        } else {
            console.error('Failed to migrate existing data:', saveResult.error);
            console.error('Response status:', saveResponse.status);
            
            // If migration fails, we'll skip it for now to prevent data loss
            console.log('Migration failed, but data is safe. You can manually assign class later.');
        }
        
    } catch (error) {
        console.error('Error migrating existing data:', error);
        console.log('Migration failed, but your existing data is safe.');
    }
}

// Render the class selection screen
function renderClassSelection() {
    const classesGrid = document.getElementById('classesGrid');
    
    if (availableClasses.length === 0) {
        classesGrid.innerHTML = `
            <div class="empty-classes">
                <p>No classes created yet.</p>
                <p>Create your first class below!</p>
            </div>
        `;
        return;
    }
    
    classesGrid.innerHTML = availableClasses.map(classInfo => {
        const isDefaultClass = classInfo.name === 'My Class' || classInfo.id.includes('my-class');
        const cardClass = isDefaultClass ? 'class-card default-class-card' : 'class-card';
        const badgeHtml = isDefaultClass ? '<div class="default-badge">Your existing data</div>' : '';
        
        return `
            <div class="${cardClass}" onclick="selectClass('${classInfo.id}', '${classInfo.name.replace(/'/g, "\\'")}')">
                ${badgeHtml}
                <div class="class-card-name">${classInfo.name}</div>
                <div class="class-card-info">Created: ${new Date(classInfo.createdAt).toLocaleDateString()}</div>
            </div>
        `;
    }).join('');
}

// Select a class and show management interface
async function selectClass(classId, className) {
    currentClassId = classId;
    currentClassName = className;
    
    // Hide class selection screen
    document.getElementById('classSelectionScreen').style.display = 'none';
    
    // Show management interface
    document.getElementById('managementInterface').style.display = 'block';
    
    // Update current class header
    document.getElementById('currentClassName').textContent = className;
    updateClassLink();
    
    // Load class-specific data
    await loadFlashcards();
    
    // Refresh views
    renderGridView();
    renderGroupedCardsView();
    renderGroupsList();
    updateGroupSelect();
    updateParentGroupSelect();
    populateMultiUploadCategories();
    
    // Update settings tab with current class info
    updateSettingsTab();
    
    console.log(`Selected class: ${className} (${classId})`);
}

// Create a new class
async function createNewClass() {
    const newClassNameInput = document.getElementById('newClassName');
    const className = newClassNameInput.value.trim();
    
    if (!className) {
        alert('Please enter a class name.');
        return;
    }
    
    if (className.length > 50) {
        alert('Class name must be 50 characters or less.');
        return;
    }
    
    const createBtn = document.getElementById('createClassBtn');
    const originalText = createBtn.textContent;
    
    try {
        createBtn.textContent = 'Creating...';
        createBtn.disabled = true;
        
        const response = await fetch('/api/classes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ className })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to create class');
        }
        
        if (result.success && result.class) {
            // Add new class to the list
            availableClasses.unshift(result.class);
            
            // Clear input
            newClassNameInput.value = '';
            
            // Refresh class selection
            renderClassSelection();
            
            // Automatically select the new class
            await selectClass(result.class.id, result.class.name);
            
            alert(`Class "${className}" created successfully!`);
        } else {
            throw new Error('Failed to create class');
        }
    } catch (error) {
        console.error('Error creating class:', error);
        alert(`Error creating class: ${error.message}`);
    } finally {
        createBtn.textContent = originalText;
        createBtn.disabled = false;
    }
}

// Switch back to class selection
function switchClass() {
    // Show class selection screen
    document.getElementById('classSelectionScreen').style.display = 'block';
    
    // Hide management interface
    document.getElementById('managementInterface').style.display = 'none';
    
    // Reset current class
    currentClassId = null;
    currentClassName = null;
    
    // Refresh class selection
    renderClassSelection();
}

// Update class link display
function updateClassLink() {
    const baseUrl = window.location.origin;
    const classLink = currentClassId ? `${baseUrl}/?class=${currentClassId}` : baseUrl;
    
    const currentClassLinkElement = document.getElementById('currentClassLink');
    if (currentClassLinkElement) {
        currentClassLinkElement.textContent = classLink;
    }
}

// Copy class link to clipboard
function copyClassLink() {
    const classLinkElement = document.getElementById('currentClassLink');
    if (classLinkElement) {
        const link = classLinkElement.textContent;
        navigator.clipboard.writeText(link).then(() => {
            // Show feedback
            const originalText = classLinkElement.textContent;
            classLinkElement.textContent = 'Copied!';
            classLinkElement.style.background = '#4CAF50';
            classLinkElement.style.color = 'white';
            
            setTimeout(() => {
                classLinkElement.textContent = originalText;
                classLinkElement.style.background = '';
                classLinkElement.style.color = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            alert('Failed to copy link. Please copy manually.');
        });
    }
}

// Update settings tab with current class information
async function updateSettingsTab() {
    // Update class name input
    const editClassNameInput = document.getElementById('editClassName');
    if (editClassNameInput && currentClassName) {
        editClassNameInput.value = currentClassName;
    }
    
    // Update class information display
    const displayClassName = document.getElementById('displayClassName');
    const displayClassLink = document.getElementById('displayClassLink');
    const classCardCount = document.getElementById('classCardCount');
    const classUnitCount = document.getElementById('classUnitCount');
    
    if (displayClassName) {
        displayClassName.textContent = currentClassName || 'No class selected';
    }
    
    if (displayClassLink) {
        const baseUrl = window.location.origin;
        const classLink = currentClassId ? `${baseUrl}/?class=${currentClassId}` : baseUrl;
        displayClassLink.textContent = classLink;
    }
    
    if (classCardCount) {
        classCardCount.textContent = flashcards.length.toString();
    }
    
    if (classUnitCount) {
        classUnitCount.textContent = groups.length.toString();
    }
    
    // Check if we should show migration section
    const migrationSection = document.getElementById('migrationSection');
    if (migrationSection) {
        // Check if there's existing data that could be migrated
        // We need to check for data WITHOUT any classId (unassigned data)
        try {
            const response = await fetch('/api/flashcards?unassigned=true');
            if (response.ok) {
                const result = await response.json();
                const hasUnassignedData = (result.flashcards && result.flashcards.length > 0) ||
                                        (result.groups && result.groups.length > 0);
                
                migrationSection.style.display = hasUnassignedData ? 'block' : 'none';
            } else {
                migrationSection.style.display = 'none';
            }
        } catch (error) {
            console.error('Error checking for unassigned data:', error);
            migrationSection.style.display = 'none';
        }
    }
}


// Update current class name
async function updateCurrentClass() {
    const editClassNameInput = document.getElementById('editClassName');
    const newClassName = editClassNameInput.value.trim();
    
    if (!newClassName) {
        alert('Please enter a class name.');
        return;
    }
    
    if (newClassName.length > 50) {
        alert('Class name must be 50 characters or less.');
        return;
    }
    
    if (newClassName === currentClassName) {
        alert('Class name is already up to date.');
        return;
    }
    
    const updateBtn = document.getElementById('updateClassBtn');
    const originalText = updateBtn.textContent;
    
    try {
        updateBtn.textContent = 'Updating...';
        updateBtn.disabled = true;
        
        const response = await fetch('/api/classes', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
                classId: currentClassId, 
                className: newClassName 
            })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to update class');
        }
        
        if (result.success) {
            // Update local data
            currentClassName = newClassName;
            
            // Update class ID if it changed
            if (result.newClassId && result.newClassId !== currentClassId) {
                const oldClassId = currentClassId;
                currentClassId = result.newClassId;
                
                // Update in availableClasses array
                const classIndex = availableClasses.findIndex(c => c.id === oldClassId);
                if (classIndex !== -1) {
                    availableClasses[classIndex].id = result.newClassId;
                    availableClasses[classIndex].name = newClassName;
                }
                
                console.log(`Class ID updated from ${oldClassId} to ${result.newClassId}`);
                console.log(`Updated ${result.updatedCounts.flashcards} flashcards, ${result.updatedCounts.groups} groups, ${result.updatedCounts.settings} settings`);
            } else {
                // Update in availableClasses array (name only)
                const classIndex = availableClasses.findIndex(c => c.id === currentClassId);
                if (classIndex !== -1) {
                    availableClasses[classIndex].name = newClassName;
                }
            }
            
            // Update UI
            document.getElementById('currentClassName').textContent = newClassName;
            updateSettingsTab();
            updateClassLink();
            
            alert(`Class name updated successfully!${result.newClassId ? `\n\nNew student link: ${window.location.origin}/?class=${result.newClassId}` : ''}`);
        } else {
            throw new Error('Failed to update class');
        }
    } catch (error) {
        console.error('Error updating class:', error);
        alert(`Error updating class: ${error.message}`);
    } finally {
        updateBtn.textContent = originalText;
        updateBtn.disabled = false;
    }
}

// Delete current class
async function deleteCurrentClass() {
    if (!currentClassId || !currentClassName) {
        alert('No class selected.');
        return;
    }
    
    const confirmMessage = `Are you sure you want to delete the class "${currentClassName}"?\n\nThis will permanently delete:\n- ${flashcards.length} flashcards\n- ${groups.length} units\n- All class settings\n\nThis action cannot be undone.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        const response = await fetch('/api/classes', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ classId: currentClassId })
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Failed to delete class');
        }
        
        if (result.success) {
            // Remove from availableClasses array
            availableClasses = availableClasses.filter(c => c.id !== currentClassId);
            
            alert(`Class "${currentClassName}" and all associated data deleted successfully.`);
            
            // Switch back to class selection
            switchClass();
        } else {
            throw new Error('Failed to delete class');
        }
    } catch (error) {
        console.error('Error deleting class:', error);
        alert(`Error deleting class: ${error.message}`);
    }
}


// Copy current class link (for manage classes tab)
function copyCurrentClassLink() {
    const displayClassLink = document.getElementById('displayClassLink');
    if (displayClassLink) {
        const link = displayClassLink.textContent;
        navigator.clipboard.writeText(link).then(() => {
            // Show feedback
            const copyBtn = displayClassLink.nextElementSibling;
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.style.background = '#4CAF50';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy link: ', err);
            alert('Failed to copy link. Please copy manually.');
        });
    }
}

// Manual migration function for existing data
async function migrateExistingData() {
    if (!currentClassId || !currentClassName) {
        alert('No class selected for migration.');
        return;
    }
    
    const confirmMessage = `Are you sure you want to migrate your existing flashcards and groups to "${currentClassName}"?\n\nThis will assign all unorganized flashcards and groups to this class.\n\nThis action can be reversed later if needed.`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        console.log('Starting manual migration...');
        await migrateExistingDataToDefaultClass(currentClassId);
        
        // Refresh the data and UI
        await loadFlashcards();
        renderGridView();
        renderGroupedCardsView();
        updateGroupSelect();
        updateParentGroupSelect();
        populateMultiUploadCategories();
        updateSettingsTab();
        
        // Hide migration section
        const migrationSection = document.getElementById('migrationSection');
        if (migrationSection) {
            migrationSection.style.display = 'none';
        }
        
        alert('Migration completed successfully! Your existing data is now organized under this class.');
        
    } catch (error) {
        console.error('Manual migration error:', error);
        alert('Migration failed. Your data is safe, but the migration could not be completed. Please try again later.');
    }
}

