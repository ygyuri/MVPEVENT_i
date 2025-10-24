import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Tag } from 'lucide-react';

const CategorySelector = ({ selectedCategory, onCategoryChange, className = '' }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCategory, setNewCategory] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'tag'
  });

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Handle creating new category
  const handleCreateCategory = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/organizer/categories', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newCategory)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Category created:', data.message);
        
        // Refresh categories and select the new one
        await fetchCategories();
        onCategoryChange(data.data);
        setShowCreateForm(false);
        setNewCategory({ name: '', description: '', color: '#3B82F6', icon: 'tag' });
      } else {
        const error = await response.json();
        console.error('Error creating category:', error.message);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating category:', error);
      alert('Failed to create category');
    }
  };

  const selectedCategoryData = categories.find(cat => cat._id === selectedCategory);

  if (loading) {
    return (
      <div className={`${className}`}>
        <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Event Category *
      </label>
      
      {/* Category Selector */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full px-3 py-2 text-left border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white flex items-center justify-between"
        >
          {selectedCategoryData ? (
            <div className="flex items-center gap-2">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                style={{ backgroundColor: selectedCategoryData.color }}
              >
                {selectedCategoryData.icon || 'tag'}
              </div>
              <span>{selectedCategoryData.name}</span>
            </div>
          ) : (
            <span className="text-gray-500">Select a category</span>
          )}
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
            {categories.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Tag className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No categories available</p>
                <p className="text-xs">Create a category to organize your events</p>
              </div>
            ) : (
              <>
                {categories.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() => {
                      onCategoryChange(category._id);
                      setShowDropdown(false);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium"
                      style={{ backgroundColor: category.color }}
                    >
                      {category.icon || 'tag'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{category.name}</div>
                      {category.description && (
                        <div className="text-xs text-gray-500">{category.description}</div>
                      )}
                    </div>
                  </button>
                ))}
                
                {/* Create New Category Button */}
                <div className="border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowCreateForm(true);
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-blue-600"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create New Category</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Create Category Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Create New Category</h3>
            
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technology, Music, Business"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Describe what types of events belong to this category"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Icon
                  </label>
                  <input
                    type="text"
                    value={newCategory.icon}
                    onChange={(e) => setNewCategory({ ...newCategory, icon: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g., laptop, music"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-10 h-8 border border-gray-300 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="flex-1 px-2 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create Category
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewCategory({ name: '', description: '', color: '#3B82F6', icon: 'tag' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
