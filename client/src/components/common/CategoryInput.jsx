import React, { useState, useEffect, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Tag, Check, AlertCircle, Plus, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { categoriesAPI } from "../../utils/organizerAPI";
import { useDebounce } from "../../utils/useDebounce";
import {
  updateFormData,
  setBlurField,
} from "../../store/slices/eventFormSlice";
import { validateField } from "../../utils/eventValidation";
import FieldValidation, { FieldSuccess } from "./FormValidation";

const CategoryInput = ({
  value,
  onChange,
  onBlur,
  error,
  touched,
  className = "",
}) => {
  const dispatch = useDispatch();
  const { formData } = useSelector((state) => state.eventForm);

  const [inputValue, setInputValue] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState("");
  const [showCreateOption, setShowCreateOption] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);

  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [categories, setCategories] = useState([]);

  // Debounced duplicate checking
  const debouncedValue = useDebounce(inputValue, 300);

  useEffect(() => {
    if (debouncedValue.length < 2) {
      setSuggestions([]);
      setDuplicateWarning("");
      setShowCreateOption(false);
      return;
    }

    const checkDuplicate = async () => {
      setIsChecking(true);
      try {
        const result = await categoriesAPI.checkDuplicate(debouncedValue);

        if (result.exists) {
          // Exact match found
          setDuplicateWarning(`Category "${debouncedValue}" already exists`);
          setSuggestions([]);
          setShowCreateOption(false);
        } else if (result.similarMatches.length > 0) {
          // Similar matches found
          setSuggestions(result.similarMatches);
          setDuplicateWarning("");
          setShowCreateOption(true);
        } else {
          // No matches found - can create new
          setSuggestions([]);
          setDuplicateWarning("");
          setShowCreateOption(true);
        }
      } catch (error) {
        console.error("Error checking category duplicate:", error);
        toast.error("Failed to check category availability");
      } finally {
        setIsChecking(false);
      }
    };

    checkDuplicate();
  }, [debouncedValue]);

  // Load categories on mount
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const cats = await categoriesAPI.getCategories();
        setCategories(cats);
      } catch (error) {
        console.error("Error loading categories:", error);
        toast.error("Failed to load categories");
      }
    };
    loadCategories();
  }, []);

  // Set initial value from form data
  useEffect(() => {
    if (value && categories.length > 0) {
      const category = categories.find((cat) => cat.id === value);
      if (category) {
        setInputValue(category.name);
        setSelectedCategory(category);
      }
    } else if (!value) {
      // Clear selection when value is cleared
      setInputValue("");
      setSelectedCategory(null);
    }
  }, [value, categories]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        inputRef.current &&
        !inputRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Filter categories based on input
  const filteredCategories = React.useMemo(() => {
    if (!inputValue.trim()) {
      return categories; // Show all categories when input is empty
    }
    
    const searchTerm = inputValue.toLowerCase().trim();
    return categories.filter(cat => 
      cat.name.toLowerCase().includes(searchTerm)
    );
  }, [inputValue, categories]);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    setSelectedCategory(null);

    // Clear previous warnings
    setDuplicateWarning("");

    // Always show dropdown when typing
    setIsOpen(true);
  };

  // Handle category selection
  const handleCategorySelect = (category) => {
    setInputValue(category.name);
    setSelectedCategory(category);
    setIsOpen(false);
    setSuggestions([]);
    setDuplicateWarning("");
    setShowCreateOption(false);

    // Update form data
    onChange(category.id);

    // Validate the field
    const fieldError = validateField("category", category.id, formData);
    if (fieldError) {
      // Handle validation error if needed
    }
  };

  // Handle creating new category
  const handleCreateCategory = async () => {
    if (!inputValue.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const result = await categoriesAPI.createCategory(inputValue.trim());

      if (result.success) {
        const newCategory = result.category;

        // Add to local categories list
        setCategories((prev) => [...prev, newCategory]);

        // Select the new category
        handleCategorySelect(newCategory);

        toast.success(`Category "${newCategory.name}" created successfully`);
      }
    } catch (error) {
      console.error("Error creating category:", error);
      if (error.response?.status === 409) {
        toast.error(error.response.data.error);
        if (error.response.data.existing) {
          handleCategorySelect(error.response.data.existing);
        }
      } else {
        toast.error("Failed to create category");
      }
    } finally {
      setIsCreating(false);
    }
  };

  // Handle input blur
  const handleInputBlur = (e) => {
    // Don't close if clicking on dropdown
    if (dropdownRef.current?.contains(e.relatedTarget)) {
      return;
    }

    setIsOpen(false);

    // If we have a selected category, use it
    if (selectedCategory) {
      onChange(selectedCategory.id);
    } else if (inputValue.trim() && !duplicateWarning) {
      // Try to create if no duplicate warning
      handleCreateCategory();
    }

    // Trigger blur field for auto-save
    dispatch(setBlurField("category"));

    if (onBlur) {
      onBlur();
    }
  };

  // Handle key down
  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // First check filtered categories
      if (filteredCategories.length > 0 && !duplicateWarning) {
        handleCategorySelect(filteredCategories[0]);
      } else if (suggestions.length > 0) {
        handleCategorySelect(suggestions[0]);
      } else if (showCreateOption && !duplicateWarning && inputValue.trim().length >= 2) {
        handleCreateCategory();
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder="Type to search or create a category..."
          className={`
            input-modern w-full pr-20
            ${
              error && touched
                ? "border-red-300 dark:border-red-600 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 dark:border-gray-600 focus:border-blue-500 focus:ring-blue-500"
            }
          `}
          disabled={isCreating}
        />

        {/* Loading indicator */}
        {isChecking && (
          <div className="absolute right-12 top-1/2 transform -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
          </div>
        )}

        {/* Tag icon */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
          <Tag className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {/* Duplicate warning */}
          {duplicateWarning && (
            <div className="p-3 border-b border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/20">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{duplicateWarning}</span>
              </div>
              <p className="text-xs text-red-500 dark:text-red-400 mt-1">
                Please select an existing category or choose a different name.
              </p>
            </div>
          )}

          {/* Existing Categories */}
          {filteredCategories.length > 0 && !duplicateWarning && (
            <div className="p-1">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide border-b border-gray-200 dark:border-gray-700">
                {inputValue.trim() ? 'Matching Categories' : 'All Categories'}
              </div>
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className={`w-full px-3 py-2.5 text-left hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-md flex items-center gap-3 transition-colors ${
                    selectedCategory?.id === category.id 
                      ? 'bg-blue-50 dark:bg-blue-900/20' 
                      : ''
                  }`}
                >
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color || '#3B82F6' }}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100 flex-1">
                    {category.name}
                  </span>
                  {category.eventCount > 0 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {category.eventCount} events
                    </span>
                  )}
                  {selectedCategory?.id === category.id && (
                    <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Similar matches from duplicate check */}
          {suggestions.length > 0 && (
            <div className="p-1 border-t border-gray-200 dark:border-gray-700">
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Similar Categories
              </div>
              {suggestions.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleCategorySelect(category)}
                  className="w-full px-3 py-2.5 text-left hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md flex items-center gap-3 transition-colors"
                >
                  <div 
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: category.color || '#3B82F6' }}
                  />
                  <span className="text-sm text-gray-900 dark:text-gray-100">
                    {category.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Create new option */}
          {showCreateOption && !duplicateWarning && inputValue.trim().length >= 2 && (
            <div className="p-1 border-t border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/10">
              <button
                onClick={handleCreateCategory}
                disabled={isCreating || !inputValue.trim()}
                className="w-full px-3 py-2.5 text-left hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-md flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Creating "{inputValue.trim()}"...
                    </span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                      Create new category: "{inputValue.trim()}"
                    </span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* No results message */}
          {filteredCategories.length === 0 && 
           suggestions.length === 0 && 
           inputValue.trim().length >= 2 && 
           !isChecking && 
           !duplicateWarning && (
            <div className="p-4 text-center">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                No categories found matching "{inputValue}"
              </p>
              {inputValue.trim().length >= 2 && (
                <button
                  onClick={handleCreateCategory}
                  disabled={isCreating}
                  className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 disabled:opacity-50"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      Create "{inputValue.trim()}"
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Empty state - show when input is empty */}
          {!inputValue.trim() && filteredCategories.length === 0 && categories.length === 0 && (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              <Tag className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No categories available. Start typing to create one.</p>
            </div>
          )}
        </div>
      )}

      {/* Field validation */}
      <FieldValidation error={error} touched={touched} />

      {/* Success message */}
      {!error && touched && selectedCategory && (
        <FieldSuccess
          message={`Category "${selectedCategory.name}" selected!`}
        />
      )}
    </div>
  );
};

export default CategoryInput;
