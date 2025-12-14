import RecentlyViewed from '../models/RecentlyViewed.js';

// Get user's recently viewed items
export const getRecentlyViewed = async (req, res) => {
  try {
    let recentlyViewed = await RecentlyViewed.findOne({ user: req.user.id });
    
    if (!recentlyViewed) {
      recentlyViewed = new RecentlyViewed({
        user: req.user.id,
        items: []
      });
      await recentlyViewed.save();
    }

    res.json(recentlyViewed.items.slice(0, 20)); // Return last 20 items
  } catch (error) {
    console.error('Error fetching recently viewed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Add product to recently viewed
export const addToRecentlyViewed = async (req, res) => {
  try {
    const { productId, name, price, image, category } = req.body;
    
    let retries = 3;
    let lastError = null;
    
    for (let i = 0; i < retries; i++) {
      try {
        let recentlyViewed = await RecentlyViewed.findOne({ user: req.user.id });
        
        if (!recentlyViewed) {
          recentlyViewed = new RecentlyViewed({
            user: req.user.id,
            items: []
          });
        }

        // Remove if already exists
        recentlyViewed.items = recentlyViewed.items.filter(
          item => item.productId.toString() !== productId
        );

        // Add to beginning of array
        recentlyViewed.items.unshift({
          productId,
          name,
          price,
          image,
          category,
          viewedAt: new Date()
        });

        // Keep only last 20 items
        if (recentlyViewed.items.length > 20) {
          recentlyViewed.items = recentlyViewed.items.slice(0, 20);
        }

        await recentlyViewed.save();
        
        return res.json(recentlyViewed.items);
        
      } catch (error) {
        lastError = error;
        
        // If it's not a version error, break immediately
        if (error.name !== 'VersionError') {
          break;
        }
        
        // Wait a bit before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 50));
        
        if (i === retries - 1) {
          // Last retry failed, break
          break;
        }
      }
    }
    
    // If we get here, all retries failed or it was a different error
    console.error('Error adding to recently viewed after retries:', lastError);
    throw lastError || new Error('Failed to update recently viewed');
    
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
    
    // Send specific error for version conflicts
    if (error.name === 'VersionError') {
      return res.status(409).json({ 
        message: 'Please try again',
        error: 'Conflict - document was modified concurrently'
      });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
};

// Clear all recently viewed items
export const clearRecentlyViewed = async (req, res) => {
  try {
    const recentlyViewed = await RecentlyViewed.findOne({ user: req.user.id });
    
    if (recentlyViewed) {
      recentlyViewed.items = [];
      await recentlyViewed.save();
    }

    res.json([]);
  } catch (error) {
    console.error('Error clearing recently viewed:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
