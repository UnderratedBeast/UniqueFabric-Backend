import Settings from '../models/Settings.js';

export const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create({});
    }
    
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching settings' });
  }
};

export const updateSettings = async (req, res) => {
  try {
    const updates = req.body;
    
    let settings = await Settings.findOne();
    
    if (!settings) {
      settings = await Settings.create(updates);
    } else {
      // Deep merge updates
      const storeUpdates = updates.store || {};
      const notificationUpdates = updates.notifications || {};
      
      settings.store = { ...settings.store, ...storeUpdates };
      settings.notifications = { ...settings.notifications, ...notificationUpdates };
      settings.lastUpdated = new Date();
      
      if (storeUpdates.socialMedia) {
        settings.store.socialMedia = { 
          ...settings.store.socialMedia, 
          ...storeUpdates.socialMedia 
        };
      }
      
      await settings.save();
    }
    
    res.json({ success: true, message: 'Settings updated', settings });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating settings' });
  }
};