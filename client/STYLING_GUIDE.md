# Event-i UI Styling Guide

## Overview

This guide ensures all pages and components follow a consistent, modern design pattern based on the Home page.

## 📐 Standard Layout Structure

All pages should follow this structure:

```jsx
import { motion } from "framer-motion";
import StandardPageLayout from "../components/common/StandardPageLayout";

const YourPage = () => {
  return (
    <StandardPageLayout heroTitle="Page Title" heroSubtitle="Optional subtitle">
      {/* Your content here */}
    </StandardPageLayout>
  );
};
```

## 🎨 Standard CSS Classes

### Layout Classes

- `.container-modern` - Standard page container
- `.section-modern` - Standard section padding
- `.hero-modern` - Hero section styling
- `.grid-modern` - Responsive grid for cards

### Typography Classes

- `.text-web3-primary` - Primary text color
- `.text-web3-secondary` - Secondary text color
- `.text-3xl md:text-5xl font-extrabold` - Hero titles
- `.text-2xl md:text-3xl font-bold` - Section titles
- `.text-base md:text-lg` - Body text

### Component Classes

- Use `EventCard` component for event listings
- Use `ViewMoreButton` for pagination
- Use framer-motion for animations

## ✨ Animation Standards

### Page Entry

```jsx
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.4 }}
>
  {/* content */}
</motion.div>
```

### Section Titles

```jsx
<h2 className="text-2xl md:text-3xl font-bold text-web3-primary mb-6">
  Section Title
</h2>
```

## 🎯 Background System

### DO NOT ADD

- ❌ Inline blob backgrounds
- ❌ Additional gradient layers
- ❌ Duplicate pattern overlays

### Background is handled by

- ✅ `ModernBackground` component in App.jsx
- ✅ Theme-based gradients
- ✅ Floating animated blobs

## 📋 Empty State Pattern

```jsx
const EmptyList = ({ loading, text }) => {
  if (loading) {
    return (
      <div className="min-h-[20vh] grid place-items-center">
        <div className="flex items-center space-x-2 text-web3-secondary">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-web3-accent opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-web3-accent" />
          </span>
          <span>Loading…</span>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-[20vh] grid place-items-center">
      <p className="text-web3-secondary">{text}</p>
    </div>
  );
};
```

## 🔄 Pages to Update

Based on current code, update these pages to match Home styling:

### High Priority

1. **UserProfile.jsx** - Remove inline backgrounds, use StandardPageLayout
2. **OrganizerDashboard.jsx** - Add hero section, standardize cards
3. **EventManagement.jsx** - Use grid-modern, add animations
4. **EventCreate.jsx** - Standardize form layout
5. **DirectCheckout.jsx** - Use section-modern, modernize UI

### Medium Priority

6. **TicketWallet.jsx** - Add grid layout, modernize cards
7. **Scanner.jsx** - Add hero section
8. **PaymentHistory.jsx** - Standardize list layout

## 🎨 Theme Colors

### Light Mode

- Background: White with subtle gradient
- Text Primary: `#111827`
- Text Secondary: `#374151`

### Dark Mode

- Background: Dark slate with subtle gradient
- Text Primary: `#f9fafb`
- Text Secondary: `#e5e7eb`

## 📱 Responsive Guidelines

- Mobile: Single column, reduced padding
- Tablet: 2 columns for grids
- Desktop: 3-4 columns for grids
- Use `md:` and `lg:` breakpoints

## ✅ Checklist for Each Page

- [ ] Uses StandardPageLayout or proper structure
- [ ] Has hero section with title (if needed)
- [ ] Uses container-modern for content
- [ ] Uses section-modern for sections
- [ ] Has framer-motion animations
- [ ] Uses grid-modern for card layouts
- [ ] Uses ViewMoreButton for pagination
- [ ] Has proper empty states
- [ ] Uses text-web3-\* classes
- [ ] No inline background styling
- [ ] Responsive design
- [ ] Smooth theme transitions
