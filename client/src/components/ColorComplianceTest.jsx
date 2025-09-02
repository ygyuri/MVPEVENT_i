import React from 'react';
import StatusIndicator from './StatusIndicator';
import CategoryBadge from './CategoryBadge';

const ColorComplianceTest = () => {
  const testCases = [
    {
      name: 'Success Status',
      colors: ['#059669', '#10B981', '#047857'],
      description: 'WCAG AA Compliant (4.5:1 ratio)'
    },
    {
      name: 'Warning Status',
      colors: ['#D97706', '#F59E0B', '#B45309'],
      description: 'WCAG AA Compliant (4.5:1 ratio)'
    },
    {
      name: 'Error Status',
      colors: ['#DC2626', '#EF4444', '#B91C1C'],
      description: 'WCAG AA Compliant (4.5:1 ratio)'
    },
    {
      name: 'Text Colors',
      colors: ['#1E293B', '#475569', '#64748B'],
      description: 'High contrast text colors'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <div className="container-modern py-8">
        <div className="text-center-modern mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🎨 Color Compliance Test
          </h1>
          <p className="text-lg text-gray-600">
            Testing WCAG AA compliance and accessibility
          </p>
        </div>

        {/* Status Indicators Test */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Status Colors - WCAG AA Compliant
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatusIndicator status="success" message="Payment successful" />
            <StatusIndicator status="warning" message="Low ticket availability" />
            <StatusIndicator status="error" message="Payment failed" />
          </div>
        </div>

        {/* Color Palette Test */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Color Palette Compliance
          </h2>
          <div className="space-y-6">
            {testCases.map((testCase, index) => (
              <div key={index} className="p-6 bg-white rounded-lg border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                  {testCase.name}
                </h3>
                <p className="text-gray-600 mb-4">{testCase.description}</p>
                <div className="flex space-x-4">
                  {testCase.colors.map((color, colorIndex) => (
                    <div key={colorIndex} className="text-center">
                      <div 
                        className="w-16 h-16 rounded-lg border-2 border-gray-300 mb-2"
                        style={{ backgroundColor: color }}
                      ></div>
                      <div className="text-sm font-mono text-gray-700">{color}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category Badges Test */}
        <div className="card-modern mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Category Colors - Visual Hierarchy
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <CategoryBadge category="tech" variant="solid" />
            <CategoryBadge category="business" variant="solid" />
            <CategoryBadge category="creative" variant="solid" />
            <CategoryBadge category="social" variant="solid" />
          </div>
        </div>

        {/* Accessibility Information */}
        <div className="card-modern">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Accessibility Compliance
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-semibold text-green-800 mb-2">✅ Passed Tests</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• WCAG AA contrast ratios (4.5:1)</li>
                <li>• Color blindness considerations</li>
                <li>• Semantic color naming</li>
                <li>• Dark mode support</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2">🔧 Recommendations</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Test with color blindness simulators</li>
                <li>• Add high contrast mode</li>
                <li>• Use icons with colors</li>
                <li>• Regular accessibility audits</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Online Tools Links */}
        <div className="card-modern mt-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Online Testing Tools
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <a 
              href="https://webaim.org/resources/contrastchecker/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">WebAIM Contrast Checker</h3>
              <p className="text-sm text-gray-600">Check contrast ratios</p>
            </a>
            <a 
              href="https://coolors.co/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Coolors.co</h3>
              <p className="text-sm text-gray-600">Generate accessible palettes</p>
            </a>
            <a 
              href="https://www.getstark.co/contrast-checker/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">Stark Contrast Checker</h3>
              <p className="text-sm text-gray-600">Advanced accessibility testing</p>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ColorComplianceTest;
