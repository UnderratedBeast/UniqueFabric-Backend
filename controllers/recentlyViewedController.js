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
    
    let recentlyViewed = await RecentlyViewed.findOne({ user: req.user.id });
    
    if (!recentlyViewed) {
      recentlyViewed = new RecentlyViewed({
        user: req.user.id,
        items: []
      });
    }

    // Remove if already exists (to avoid duplicates)
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
    res.json(recentlyViewed.items);
  } catch (error) {
    console.error('Error adding to recently viewed:', error);
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