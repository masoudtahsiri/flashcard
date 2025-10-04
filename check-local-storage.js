// Check browser local storage for flashcards
console.log('🔍 Checking browser local storage for flashcards...');

// Check various possible storage keys
const possibleKeys = [
    'flashcards',
    'flashcardData', 
    'teacherFlashcards',
    'classData',
    'savedFlashcards'
];

console.log('\n📦 LOCAL STORAGE CHECK:');
let foundData = false;

possibleKeys.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
        console.log(`✅ Found data in key "${key}":`);
        try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
                console.log(`   Array with ${parsed.length} items`);
                if (parsed.length > 0 && parsed[0].word) {
                    console.log(`   Sample: "${parsed[0].word}"`);
                    foundData = true;
                }
            } else if (parsed.flashcards) {
                console.log(`   Object with flashcards array: ${parsed.flashcards.length} items`);
                if (parsed.flashcards.length > 0) {
                    console.log(`   Sample: "${parsed.flashcards[0].word}"`);
                    foundData = true;
                }
            }
        } catch (e) {
            console.log(`   Raw data (${data.length} chars)`);
        }
    }
});

if (!foundData) {
    console.log('❌ No flashcard data found in local storage');
    console.log('\n💡 Try opening the teacher interface and check if flashcards are visible there');
}

// Check all localStorage keys
console.log('\n🔑 ALL LOCAL STORAGE KEYS:');
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`  ${key}: ${localStorage.getItem(key).length} chars`);
}

