import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Eye, EyeOff, Tag } from 'lucide-react';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
    icon: 'tag'
  });

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/organizer/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data.data || []);
      } else {
        console.error('Failed to fetch categories');
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

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const url = editingCategory 
        ? `/api/organizer/categories/${editingCategory._id}`
        : '/api/organizer/categories';
      
      const method = editingCategory ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Category saved:', data.message);
        
        // Reset form and refresh categories
        setFormData({ name: '', description: '', color: '#3B82F6', icon: 'tag' });
        setShowCreateForm(false);
        setEditingCategory(null);
        fetchCategories();
      } else {
        const error = await response.json();
        console.error('Error saving category:', error.message);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving category:', error);
      alert('Failed to save category');
    }
  };

  // Handle edit
  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || '',
      color: category.color,
      icon: category.icon || 'tag'
    });
    setShowCreateForm(true);
  };

  // Handle delete
  const handleDelete = async (categoryId) => {
    if (!confirm('Are you sure you want to delete this category? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizer/categories/${categoryId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        console.log('Category deleted successfully');
        fetchCategories();
      } else {
        const error = await response.json();
        console.error('Error deleting category:', error.message);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      alert('Failed to delete category');
    }
  };

  // Toggle category active status
  const toggleActive = async (category) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/organizer/categories/${category._id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isActive: !category.isActive })
      });

      if (response.ok) {
        console.log('Category status updated');
        fetchCategories();
      } else {
        const error = await response.json();
        console.error('Error updating category:', error.message);
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error updating category:', error);
      alert('Failed to update category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Event Categories</h2>
          <p className="text-gray-600">Manage categories for your events</p>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(true);
            setEditingCategory(null);
            setFormData({ name: '', description: '', color: '#3B82F6', icon: 'tag' });
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border">
          <h3 className="text-lg font-semibold mb-4">
            {editingCategory ? 'Edit Category' : 'Create New Category'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Technology, Music, Business"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., laptop, music, briefcase"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Describe what types of events belong to this category"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Color
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-12 h-10 border border-gray-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#3B82F6"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                {editingCategory ? 'Update Category' : 'Create Category'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingCategory(null);
                  setFormData({ name: '', description: '', color: '#3B82F6', icon: 'tag' });
                }}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      <div className="bg-white rounded-lg shadow-md border">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Your Categories ({categories.length})</h3>
          
          {categories.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Tag className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No categories created yet</p>
              <p className="text-sm">Create your first category to organize your events</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div
                  key={category._id}
                  className={`p-4 rounded-lg border-2 ${
                    category.isActive 
                      ? 'border-gray-200 bg-white' 
                      : 'border-gray-100 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.icon || 'tag'}
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{category.name}</h4>
                        <p className="text-xs text-gray-500">/{category.slug}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleActive(category)}
                        className={`p-1 rounded ${
                          category.isActive 
                            ? 'text-green-600 hover:bg-green-50' 
                            : 'text-gray-400 hover:bg-gray-50'
                        }`}
                        title={category.isActive ? 'Hide category' : 'Show category'}
                      >
                        {category.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleEdit(category)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit category"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(category._id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {category.description && (
                    <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className={`px-2 py-1 rounded ${
                      category.isActive 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {category.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span>Created {new Date(category.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
