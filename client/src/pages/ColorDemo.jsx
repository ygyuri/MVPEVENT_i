import React from 'react';
import EnhancedButton from '../components/EnhancedButton';
import StatusIndicator from '../components/StatusIndicator';
import CategoryBadge from '../components/CategoryBadge';
import { ShoppingCart, Heart, Star, Zap } from 'lucide-react';

const ColorDemo = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container-modern py-8">
        <div className="text-center-modern mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            🎨 Enhanced Color System Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Showcasing the improved color diversity, distinct status colors, and enhanced visual hierarchy
          </p>
        </div>

        {/* Enhanced Button Variants */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Enhanced Button Variants</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <EnhancedButton variant="primary" icon={ShoppingCart}>
              Primary
            </EnhancedButton>
            <EnhancedButton variant="secondary">
              Secondary
            </EnhancedButton>
            <EnhancedButton variant="success" icon={Heart}>
              Success
            </EnhancedButton>
            <EnhancedButton variant="warning">
              Warning
            </EnhancedButton>
            <EnhancedButton variant="error">
              Error
            </EnhancedButton>
            <EnhancedButton variant="info">
              Info
            </EnhancedButton>
            <EnhancedButton variant="ghost">
              Ghost
            </EnhancedButton>
            <EnhancedButton variant="outline">
              Outline
            </EnhancedButton>
          </div>
        </div>

        {/* Status Indicators */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Distinct Status Colors</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatusIndicator status="success" message="Payment successful" />
            <StatusIndicator status="warning" message="Low ticket availability" />
            <StatusIndicator status="error" message="Payment failed" />
            <StatusIndicator status="info" message="Event updated" />
            <StatusIndicator status="pending" message="Processing payment" />
          </div>
        </div>

        {/* Category Badges */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Category Colors for Visual Hierarchy</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryBadge category="tech" variant="solid" />
            <CategoryBadge category="business" variant="solid" />
            <CategoryBadge category="creative" variant="solid" />
            <CategoryBadge category="social" variant="solid" />
            <CategoryBadge category="education" variant="outline" />
            <CategoryBadge category="entertainment" variant="outline" />
            <CategoryBadge category="sports" variant="outline" />
            <CategoryBadge category="food" variant="outline" />
          </div>
        </div>

        {/* Priority Levels */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Priority Levels</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-600 font-semibold">High Priority</div>
              <div className="text-sm text-red-500">Critical tasks</div>
            </div>
            <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="text-amber-600 font-semibold">Medium Priority</div>
              <div className="text-sm text-amber-500">Important tasks</div>
            </div>
            <div className="text-center p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
              <div className="text-emerald-600 font-semibold">Low Priority</div>
              <div className="text-sm text-emerald-500">Optional tasks</div>
            </div>
            <div className="text-center p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="text-gray-600 font-semibold">No Priority</div>
              <div className="text-sm text-gray-500">Background tasks</div>
            </div>
          </div>
        </div>

        {/* Color Palette Showcase */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Enhanced Color Palette</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Blue</div>
              <div className="text-xs text-gray-500">#3B82F6</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Emerald</div>
              <div className="text-xs text-gray-500">#10B981</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Purple</div>
              <div className="text-xs text-gray-500">#8B5CF6</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-amber-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Amber</div>
              <div className="text-xs text-gray-500">#F59E0B</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-rose-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Rose</div>
              <div className="text-xs text-gray-500">#F43F5E</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-teal-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Teal</div>
              <div className="text-xs text-gray-500">#14B8A6</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-cyan-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Cyan</div>
              <div className="text-xs text-gray-500">#06B6D4</div>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-500 rounded-lg mx-auto mb-2"></div>
              <div className="text-sm font-medium text-gray-700">Orange</div>
              <div className="text-xs text-gray-500">#F97316</div>
            </div>
          </div>
        </div>

        {/* Usage Examples */}
        <div className="card-modern">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Real-World Usage Examples</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Event Management</h3>
              <div className="space-y-3">
                <StatusIndicator status="success" message="Event published successfully" />
                <CategoryBadge category="tech" variant="solid" />
                <EnhancedButton variant="primary" size="sm" icon={Star}>
                  Edit Event
                </EnhancedButton>
              </div>
            </div>
            <div className="p-6 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
              <h3 className="text-lg font-semibold text-emerald-900 mb-3">Payment Processing</h3>
              <div className="space-y-3">
                <StatusIndicator status="pending" message="Processing payment..." />
                <CategoryBadge category="business" variant="outline" />
                <EnhancedButton variant="success" size="sm" icon={ShoppingCart}>
                  Complete Payment
                </EnhancedButton>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorDemo;
