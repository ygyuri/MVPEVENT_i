# 🎨 Web3 Color Scheme Guide

## Overview
This document defines the consistent color palette for the Event-i application, emphasizing a modern Web3 aesthetic with blue as the primary color. All components must reference these colors to maintain UI consistency.

## 🌈 Primary Color Palette

### **Core Blues (Primary Brand Colors)**
```css
/* Primary Blue - Main brand color, buttons, links */
--primary-blue: #3B82F6
--primary-blue-hover: #2563EB
--primary-blue-dark: #1E40AF

/* Light Blue - Highlights, accents, secondary elements */
--light-blue: #60A5FA
--light-blue-hover: #3B82F6

/* Deep Blue - Depth, contrast, dark elements */
--deep-blue: #1E40AF
--deep-blue-hover: #1E3A8A
```

### **Cyan/Teal (Complementary to Blue)**
```css
/* Cyan - Modern tech feel, interactive elements */
--cyan: #06B6D4
--cyan-hover: #0891B2

/* Electric Blue - Bright accents, highlights */
--electric-blue: #00D4FF
--electric-blue-hover: #00B8E6
```

### **Indigo (Sophisticated Purple-Blue)**
```css
/* Indigo - Rich accents, sophisticated touches */
--indigo: #6366F1
--indigo-hover: #4F46E5
```

## 🎯 Background Colors

### **Dark Gradients (Primary Backgrounds)**
```css
/* Main background gradient */
--bg-primary: linear-gradient(135deg, #111827 0%, #1E3A8A 50%, #111827 100%)

/* Alternative background gradient */
--bg-secondary: linear-gradient(135deg, #111827 0%, #1E40AF 50%, #111827 100%)

/* Card backgrounds */
--bg-card: rgba(255, 255, 255, 0.05)
--bg-card-hover: rgba(255, 255, 255, 0.08)
```

### **Animated Background Elements**
```css
/* Floating blobs for Web3 feel */
--blob-primary: rgba(59, 130, 246, 0.2)    /* Blue blob */
--blob-secondary: rgba(6, 182, 212, 0.2)   /* Cyan blob */
--blob-accent: rgba(99, 102, 241, 0.2)     /* Indigo blob */
```

## 🔤 Text Colors

### **Primary Text**
```css
/* Main text */
--text-primary: #FFFFFF
--text-secondary: #E5E7EB
--text-muted: #9CA3AF
```

### **Accent Text**
```css
/* Blue accent text */
--text-blue: #60A5FA
--text-blue-light: #93C5FD
--text-blue-dark: #3B82F6

/* Cyan accent text */
--text-cyan: #06B6D4
--text-cyan-light: #22D3EE
```

## 🎨 Interactive Elements

### **Buttons**
```css
/* Primary button */
--btn-primary: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%)
--btn-primary-hover: linear-gradient(135deg, #2563EB 0%, #0891B2 100%)

/* Secondary button */
--btn-secondary: rgba(255, 255, 255, 0.1)
--btn-secondary-hover: rgba(255, 255, 255, 0.2)

/* Disabled button */
--btn-disabled: #6B7280
--btn-disabled-text: #9CA3AF
```

### **Form Elements**
```css
/* Input borders */
--input-border: rgba(59, 130, 246, 0.3)
--input-border-focus: #3B82F6
--input-border-error: #EF4444

/* Input backgrounds */
--input-bg: rgba(255, 255, 255, 0.1)
--input-bg-focus: rgba(59, 130, 246, 0.1)
```

## 🚦 Status Colors

### **Success States**
```css
--success: #10B981
--success-light: #34D399
--success-bg: rgba(16, 185, 129, 0.1)
--success-border: rgba(16, 185, 129, 0.3)
```

### **Warning States**
```css
--warning: #F59E0B
--warning-light: #FBBF24
--warning-bg: rgba(245, 158, 11, 0.1)
--warning-border: rgba(245, 158, 11, 0.3)
```

### **Error States**
```css
--error: #EF4444
--error-light: #F87171
--error-bg: rgba(239, 68, 68, 0.1)
--error-border: rgba(239, 68, 68, 0.3)
```

## 🎭 Component-Specific Colors

### **Cards & Containers**
```css
/* Glassmorphism effect */
--card-bg: rgba(255, 255, 255, 0.05)
--card-border: rgba(255, 255, 255, 0.1)
--card-shadow: 0 8px 32px rgba(0, 0, 0, 0.3)

/* Hover states */
--card-hover-bg: rgba(255, 255, 255, 0.08)
--card-hover-border: rgba(59, 130, 246, 0.2)
```

### **Navigation & Headers**
```css
/* Navbar background */
--nav-bg: rgba(17, 24, 39, 0.95)
--nav-border: rgba(59, 130, 246, 0.2)

/* Header text */
--header-primary: #FFFFFF
--header-secondary: #60A5FA
```

## 📱 Responsive Color Adjustments

### **Mobile Optimizations**
```css
/* Reduce opacity for better mobile performance */
--mobile-bg-opacity: 0.8
--mobile-blur: blur(20px)
```

### **Dark Mode Considerations**
```css
/* Ensure contrast ratios meet accessibility standards */
--contrast-ratio: 4.5:1 (minimum)
--text-contrast: #FFFFFF on dark backgrounds
```

## 🎨 Usage Examples

### **Gradient Backgrounds**
```css
/* Primary page background */
background: linear-gradient(135deg, #111827 0%, #1E3A8A 50%, #111827 100%);

/* Card background */
background: rgba(255, 255, 255, 0.05);
backdrop-filter: blur(20px);
border: 1px solid rgba(255, 255, 255, 0.1);
```

### **Button Styles**
```css
/* Primary button */
background: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%);
color: #FFFFFF;
box-shadow: 0 4px 16px rgba(59, 130, 246, 0.25);

/* Hover effect */
transform: scale(1.05);
box-shadow: 0 8px 24px rgba(59, 130, 246, 0.35);
```

### **Text Hierarchy**
```css
/* Main heading */
color: #FFFFFF;
font-weight: 700;

/* Subheading */
color: #60A5FA;
font-weight: 600;

/* Body text */
color: #E5E7EB;
font-weight: 400;

/* Muted text */
color: #9CA3AF;
font-weight: 400;
```

## 🔧 CSS Custom Properties

### **Complete CSS Variables**
```css
:root {
  /* Primary Colors */
  --primary-blue: #3B82F6;
  --primary-blue-hover: #2563EB;
  --primary-blue-dark: #1E40AF;
  --light-blue: #60A5FA;
  --light-blue-hover: #3B82F6;
  --deep-blue: #1E40AF;
  --deep-blue-hover: #1E3A8A;
  
  /* Complementary Colors */
  --cyan: #06B6D4;
  --cyan-hover: #0891B2;
  --electric-blue: #00D4FF;
  --electric-blue-hover: #00B8E6;
  --indigo: #6366F1;
  --indigo-hover: #4F46E5;
  
  /* Backgrounds */
  --bg-primary: linear-gradient(135deg, #111827 0%, #1E3A8A 50%, #111827 100%);
  --bg-secondary: linear-gradient(135deg, #111827 0%, #1E40AF 50%, #111827 100%);
  --bg-card: rgba(255, 255, 255, 0.05);
  --bg-card-hover: rgba(255, 255, 255, 0.08);
  
  /* Text Colors */
  --text-primary: #FFFFFF;
  --text-secondary: #E5E7EB;
  --text-muted: #9CA3AF;
  --text-blue: #60A5FA;
  --text-blue-light: #93C5FD;
  --text-blue-dark: #3B82F6;
  --text-cyan: #06B6D4;
  --text-cyan-light: #22D3EE;
  
  /* Interactive Elements */
  --btn-primary: linear-gradient(135deg, #3B82F6 0%, #06B6D4 100%);
  --btn-primary-hover: linear-gradient(135deg, #2563EB 0%, #0891B2 100%);
  --btn-secondary: rgba(255, 255, 255, 0.1);
  --btn-secondary-hover: rgba(255, 255, 255, 0.2);
  --btn-disabled: #6B7280;
  --btn-disabled-text: #9CA3AF;
  
  /* Form Elements */
  --input-border: rgba(59, 130, 246, 0.3);
  --input-border-focus: #3B82F6;
  --input-border-error: #EF4444;
  --input-bg: rgba(255, 255, 255, 0.1);
  --input-bg-focus: rgba(59, 130, 246, 0.1);
  
  /* Status Colors */
  --success: #10B981;
  --success-light: #34D399;
  --success-bg: rgba(16, 185, 129, 0.1);
  --success-border: rgba(16, 185, 129, 0.3);
  --warning: #F59E0B;
  --warning-light: #FBBF24;
  --warning-bg: rgba(245, 158, 11, 0.1);
  --warning-border: rgba(245, 158, 11, 0.3);
  --error: #EF4444;
  --error-light: #F87171;
  --error-bg: rgba(239, 68, 68, 0.1);
  --error-border: rgba(239, 68, 68, 0.3);
  
  /* Component Colors */
  --card-bg: rgba(255, 255, 255, 0.05);
  --card-border: rgba(255, 255, 255, 0.1);
  --card-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  --card-hover-bg: rgba(255, 255, 255, 0.08);
  --card-hover-border: rgba(59, 130, 246, 0.2);
  
  /* Blob Colors */
  --blob-primary: rgba(59, 130, 246, 0.2);
  --blob-secondary: rgba(6, 182, 212, 0.2);
  --blob-accent: rgba(99, 102, 241, 0.2);
}
```

## 📋 Implementation Checklist

### **Before Using Colors**
- [ ] Check this guide for the correct color values
- [ ] Use CSS custom properties when possible
- [ ] Ensure contrast ratios meet accessibility standards
- [ ] Test on both light and dark backgrounds

### **Color Usage Rules**
- [ ] Primary blue (#3B82F6) for main actions and branding
- [ ] Cyan (#06B6D4) for secondary actions and highlights
- [ ] White (#FFFFFF) for primary text on dark backgrounds
- [ ] Blue tints for secondary text and accents
- [ ] Consistent hover states using defined hover colors

### **Accessibility Requirements**
- [ ] Minimum contrast ratio: 4.5:1 for normal text
- [ ] Minimum contrast ratio: 3:1 for large text
- [ ] Color should not be the only way to convey information
- [ ] Test with color blindness simulators

## 🎯 Quick Reference

| Element | Primary Color | Secondary Color | Hover Color |
|---------|---------------|-----------------|-------------|
| Buttons | #3B82F6 | #06B6D4 | #2563EB |
| Text | #FFFFFF | #60A5FA | #93C5FD |
| Borders | rgba(59, 130, 246, 0.3) | rgba(6, 182, 212, 0.3) | #3B82F6 |
| Backgrounds | #111827 | #1E3A8A | #1E40AF |
| Success | #10B981 | #34D399 | #059669 |
| Warning | #F59E0B | #FBBF24 | #D97706 |
| Error | #EF4444 | #F87171 | #DC2626 |

---

**Remember**: Consistency is key! Always reference this guide when implementing new components or updating existing ones. The Web3 aesthetic relies on a cohesive color story that tells users they're experiencing something modern and cutting-edge. 🚀
