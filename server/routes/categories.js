const express = require('express');
const router = express.Router();
const EventCategory = require('../models/EventCategory');
const auth = require('../middleware/auth');

// Helper function to generate slug
const slugify = (text) => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Get all active categories (public endpoint)
router.get('/categories', async (req, res) => {
  try {
    const categories = await EventCategory.find({ isActive: true })
      .select('name slug description color icon')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Get all categories for organizer (including inactive)
router.get('/organizer/categories', auth, async (req, res) => {
  try {
    // Only organizers can manage categories
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can manage categories'
      });
    }

    const categories = await EventCategory.find()
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories,
      count: categories.length
    });
  } catch (error) {
    console.error('Error fetching organizer categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch categories',
      error: error.message
    });
  }
});

// Create new category (organizer only)
router.post('/organizer/categories', auth, async (req, res) => {
  try {
    // Only organizers can create categories
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can create categories'
      });
    }

    const { name, description, color, icon } = req.body;

    // Validation
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required',
        field: 'name'
      });
    }

    if (name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be 100 characters or less',
        field: 'name'
      });
    }

    // Check if category already exists
    const existingCategory = await EventCategory.findOne({ 
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });

    if (existingCategory) {
      return res.status(409).json({
        success: false,
        message: 'A category with this name already exists',
        field: 'name'
      });
    }

    // Generate slug
    const slug = slugify(name);

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid color format. Use hex format like #3B82F6',
        field: 'color'
      });
    }

    // Create new category
    const newCategory = new EventCategory({
      name: name.trim(),
      slug,
      description: description?.trim() || '',
      color: color || '#3B82F6',
      icon: icon?.trim() || 'tag',
      isActive: true
    });

    await newCategory.save();

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory
    });

  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category',
      error: error.message
    });
  }
});

// Update category (organizer only)
router.put('/organizer/categories/:id', auth, async (req, res) => {
  try {
    // Only organizers can update categories
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can update categories'
      });
    }

    const { id } = req.params;
    const { name, description, color, icon, isActive } = req.body;

    const category = await EventCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Validation
    if (name && name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Category name cannot be empty',
        field: 'name'
      });
    }

    if (name && name.length > 100) {
      return res.status(400).json({
        success: false,
        message: 'Category name must be 100 characters or less',
        field: 'name'
      });
    }

    // Check if new name conflicts with existing category
    if (name && name.trim() !== category.name) {
      const existingCategory = await EventCategory.findOne({ 
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: id }
      });

      if (existingCategory) {
        return res.status(409).json({
          success: false,
          message: 'A category with this name already exists',
          field: 'name'
        });
      }
    }

    // Validate color format if provided
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid color format. Use hex format like #3B82F6',
        field: 'color'
      });
    }

    // Update category
    if (name) {
      category.name = name.trim();
      category.slug = slugify(name);
    }
    if (description !== undefined) category.description = description?.trim() || '';
    if (color) category.color = color;
    if (icon) category.icon = icon?.trim() || 'tag';
    if (isActive !== undefined) category.isActive = Boolean(isActive);

    await category.save();

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });

  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category',
      error: error.message
    });
  }
});

// Delete category (organizer only)
router.delete('/organizer/categories/:id', auth, async (req, res) => {
  try {
    // Only organizers can delete categories
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can delete categories'
      });
    }

    const { id } = req.params;

    const category = await EventCategory.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Check if category is being used by any events
    const Event = require('../models/Event');
    const eventsUsingCategory = await Event.countDocuments({ category: id });

    if (eventsUsingCategory > 0) {
      return res.status(409).json({
        success: false,
        message: `Cannot delete category. It is being used by ${eventsUsingCategory} event(s). Please reassign or delete those events first.`
      });
    }

    await EventCategory.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category',
      error: error.message
    });
  }
});

// Get category by ID (public endpoint)
router.get('/categories/:id', async (req, res) => {
  try {
    const category = await EventCategory.findById(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Error fetching category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category',
      error: error.message
    });
  }
});

module.exports = router;
