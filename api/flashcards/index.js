import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  const { method } = req;

  // Add cache control headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  try {
    switch (method) {
      case 'GET':
        // Get all flashcards
        const flashcardsData = await getFlashcards();
        res.status(200).json({ success: true, flashcards: flashcardsData });
        break;

      case 'POST':
        // Save flashcards
        const { flashcards } = req.body;
        if (!flashcards) {
          return res.status(400).json({ error: 'Missing flashcards data' });
        }
        
        await saveFlashcards(flashcards);
        res.status(200).json({ success: true, message: 'Flashcards saved successfully' });
        break;

      case 'DELETE':
        // Clear all flashcards
        await clearFlashcards();
        res.status(200).json({ success: true, message: 'All flashcards cleared' });
        break;

      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).end(`Method ${method} Not Allowed`);
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// Helper function to get flashcards from Blob storage
async function getFlashcards() {
  try {
    // Try to get the specific flashcards.json file
    const flashcardsBlob = await list({
      prefix: 'flashcards-data/flashcards.json',
      limit: 1
    });

    if (flashcardsBlob.blobs.length === 0) {
      return [];
    }

    // Get the flashcards data
    const blob = flashcardsBlob.blobs[0];
    const response = await fetch(blob.url);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch flashcards data: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.flashcards || [];
  } catch (error) {
    console.error('Error getting flashcards:', error);
    return [];
  }
}

// Helper function to save flashcards to Blob storage
async function saveFlashcards(flashcards) {
  try {
    const filename = 'flashcards-data/flashcards.json'; // Fixed filename - always update the same file
    const data = {
      flashcards: flashcards,
      timestamp: new Date().toISOString()
    };

    await put(filename, JSON.stringify(data), {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (error) {
    console.error('Error saving flashcards:', error);
    throw error;
  }
}

// Helper function to clear all flashcards
async function clearFlashcards() {
  try {
    const allBlobs = await list({
      prefix: 'flashcards-data/',
      limit: 100
    });

    for (const blob of allBlobs.blobs) {
      await del(blob.url);
    }
  } catch (error) {
    console.error('Error clearing flashcards:', error);
    throw error;
  }
}
