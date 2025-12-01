const express = require('express');
const router = express.Router();

// Get previous orders for reordering
router.get('/previous-orders', async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    
    const orders = await Order.find({ userId })
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('items.productId');
    
    // Check stock availability for each item
    const ordersWithStock = await Promise.all(
      orders.map(async (order) => {
        const itemsWithStock = await Promise.all(
          order.items.map(async (item) => {
            const product = await Product.findById(item.productId);
            return {
              ...item.toObject(),
              inStock: product.stockQuantity >= item.quantity
            };
          })
        );
        return { ...order.toObject(), items: itemsWithStock };
      })
    );
    
    res.json(ordersWithStock);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch previous orders' });
  }
});

// Add reorder items to cart
router.post('/add-to-cart', async (req, res) => {
  try {
    const userId = req.user.id;
    const { items } = req.body;
    
    // Add items to user's cart
    for (const item of items) {
      const existingCartItem = await Cart.findOne({
        userId,
        productId: item.productId
      });
      
      if (existingCartItem) {
        existingCartItem.quantity += item.quantity;
        await existingCartItem.save();
      } else {
        await Cart.create({
          userId,
          productId: item.productId,
          quantity: item.quantity
        });
      }
    }
    
    res.json({ message: 'Items added to cart successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add items to cart' });
  }
});

module.exports = router;