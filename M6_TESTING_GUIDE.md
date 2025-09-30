# M6 Event Creation & Management Testing Guide

## 🎯 Testing Overview
This guide covers comprehensive testing of the M6 Organizer Event Management features.

## 🚀 Quick Start Testing

### 1. Access the Application
```bash
# Frontend (React)
http://localhost:3001

# Backend API
http://localhost:5000

# Database Admin (Mongo Express)
http://localhost:8082
```

### 2. Login as Organizer
- Email: `organizer@example.com`
- Password: `password123`

## 📋 Feature Testing Checklist

### ✅ Multi-Step Event Creation Form

#### Step 1: Basic Information
- [ ] **Title Field**
  - Enter valid title (3-255 characters)
  - Try empty title (should show error)
  - Try very long title (should show error)
  - Auto-save works (check console logs)

- [ ] **Description Field**
  - Enter valid description (10-5000 characters)
  - Try short description (should show error)
  - Try very long description (should show error)

- [ ] **Short Description Field**
  - Enter brief summary
  - Optional field (can be empty)

- [ ] **Category Selection**
  - Select from dropdown
  - Try submitting without selection (should show error)

#### Step 2: Location & Venue
- [ ] **Venue Name**
  - Enter venue name
  - Required field validation

- [ ] **Address**
  - Enter full address
  - Optional field

- [ ] **City, State, Country**
  - Enter location details
  - City and Country are required

- [ ] **Coordinates**
  - Optional latitude/longitude
  - Should accept decimal numbers

#### Step 3: Schedule & Timing
- [ ] **Start Date**
  - Select future date
  - Try past date (should show error)
  - Date picker works correctly

- [ ] **End Date**
  - Select date after start date
  - Try date before start date (should show error)

- [ ] **Timezone**
  - Default to UTC
  - Can be changed if needed

#### Step 4: Pricing Setup
- [ ] **Free/Paid Toggle**
  - Switch between free and paid
  - UI updates correctly

- [ ] **Capacity**
  - Enter number (1-100,000)
  - Try invalid numbers (should show error)

- [ ] **Price (if paid)**
  - Enter price (0-10,000)
  - Currency selector works

#### Step 5: Ticket Types
- [ ] **Add Ticket Type**
  - Click "Add Ticket Type"
  - Fill in name, price, quantity
  - Save successfully

- [ ] **Remove Ticket Type**
  - Click remove button
  - Confirmation works

- [ ] **Quantity Validation**
  - Total quantities don't exceed capacity
  - Error shows if exceeded

#### Step 6: Recurrence Rules
- [ ] **Enable Recurrence**
  - Toggle recurrence on/off
  - UI shows/hides options

- [ ] **Frequency Selection**
  - Daily, Weekly, Monthly options
  - Interval setting works

- [ ] **Weekday Selection**
  - For weekly recurrence
  - Multiple days can be selected

- [ ] **Count/Until**
  - Set occurrence limits
  - Date picker works

#### Step 7: Media & Assets
- [ ] **Cover Image Upload**
  - Select image file
  - Preview shows correctly
  - Base64 conversion works
  - File size validation (5MB limit)

- [ ] **Gallery Images**
  - Upload multiple images
  - Reorder functionality
  - Remove images
  - Max 10 images limit

- [ ] **Image Types**
  - Test JPG, PNG, GIF, WebP
  - HEIC files show error message
  - Invalid files rejected

#### Step 8: Preview & Publish
- [ ] **Event Preview**
  - All data displays correctly
  - Images show properly
  - Formatting looks good

- [ ] **Missing Fields Detection**
  - Shows missing required fields
  - Click to navigate to field
  - Navigation works correctly

- [ ] **Publish Process**
  - Click "Preview & Publish"
  - Success message shows
  - Email notifications sent
  - Redirects to dashboard

### ✅ Draft Management

#### Auto-Save Functionality
- [ ] **Field Auto-Save**
  - Change any field
  - Wait 30 seconds
  - Check console for save logs
  - Verify data persists

- [ ] **Step Change Auto-Save**
  - Navigate between steps
  - Data saves automatically
  - No data loss

- [ ] **Page Refresh Recovery**
  - Fill out form partially
  - Refresh page
  - Recovery prompt appears
  - Data restored correctly

#### Manual Save
- [ ] **Save Draft Button**
  - Click "Save Draft"
  - Success indicator shows
  - Data persists in database

### ✅ Event Management Dashboard

#### Event List View
- [ ] **Event Display**
  - Shows all user's events
  - Status badges correct
  - Event details accurate

- [ ] **Search Functionality**
  - Search by title
  - Search by venue
  - Search by description
  - Results filter correctly

- [ ] **Status Filtering**
  - Filter by Draft
  - Filter by Published
  - Filter by Cancelled
  - Filter by Completed
  - Counts show correctly

- [ ] **Sorting**
  - Sort by date
  - Sort by title
  - Sort by status
  - Sort by capacity

- [ ] **Pagination**
  - Navigate through pages
  - Page size changes
  - Total count accurate

#### Event Actions
- [ ] **View Event**
  - Click view button
  - Opens event details
  - All information displays

- [ ] **Edit Event**
  - Click edit button
  - Opens edit form
  - Pre-filled with existing data
  - Can modify and save

- [ ] **Clone Event**
  - Click clone button
  - Creates new draft
  - Success message shows
  - New event appears in list

- [ ] **Publish Event**
  - For draft events
  - Click publish
  - Status changes to published
  - Success message shows

- [ ] **Unpublish Event**
  - For published events
  - Click unpublish
  - Status changes to draft
  - Success message shows

- [ ] **Cancel Event**
  - For published/draft events
  - Click cancel
  - Confirmation dialog
  - Status changes to cancelled

- [ ] **Delete Event**
  - For draft/cancelled events
  - Click delete
  - Confirmation dialog
  - Event removed from list

#### Bulk Actions
- [ ] **Select Multiple Events**
  - Check multiple checkboxes
  - Select all functionality
  - Bulk action buttons appear

- [ ] **Bulk Delete**
  - Select multiple events
  - Click bulk delete
  - Confirmation dialog
  - Events removed

- [ ] **Bulk Cancel**
  - Select multiple events
  - Click bulk cancel
  - Confirmation dialog
  - Events cancelled

### ✅ Mobile Experience

#### Touch Optimization
- [ ] **Touch Targets**
  - All buttons minimum 44px
  - Easy to tap on mobile
  - No accidental clicks

#### Swipe Navigation
- [ ] **Form Steps**
  - Swipe left to next step
  - Swipe right to previous step
  - Smooth transitions

#### Mobile Layout
- [ ] **Responsive Design**
  - Works on phone screens
  - Tablet layout
  - Desktop layout
  - All breakpoints tested

#### Mobile Keyboard
- [ ] **Keyboard Handling**
  - Inputs work with mobile keyboard
  - No layout issues
  - Proper focus management

### ✅ Accessibility

#### Keyboard Navigation
- [ ] **Tab Navigation**
  - Tab through all elements
  - Focus indicators visible
  - Logical tab order

- [ ] **Skip Links**
  - Skip to content works
  - Keyboard shortcuts
  - Screen reader friendly

#### Screen Reader
- [ ] **ARIA Labels**
  - All inputs labeled
  - Error messages announced
  - Status changes announced

#### Color Contrast
- [ ] **Text Readability**
  - Sufficient contrast ratios
  - Dark mode compatibility
  - Error states visible

### ✅ Performance

#### Loading Times
- [ ] **Initial Load**
  - Page loads < 2 seconds
  - No blocking resources
  - Smooth animations

#### Auto-Save Performance
- [ ] **Save Speed**
  - Auto-save < 1 second
  - No UI blocking
  - Success rate > 99%

#### Image Handling
- [ ] **Image Optimization**
  - Base64 conversion fast
  - Compression works
  - No memory leaks

### ✅ Error Handling

#### Network Errors
- [ ] **Offline Support**
  - Works offline
  - Data saves locally
  - Syncs when online

#### Validation Errors
- [ ] **Field Validation**
  - Real-time validation
  - Clear error messages
  - Helpful suggestions

#### API Errors
- [ ] **Server Errors**
  - Graceful error handling
  - User-friendly messages
  - Retry mechanisms

## 🧪 Automated Testing

### Run Unit Tests
```bash
cd client
npm test
```

### Run Integration Tests
```bash
# Test API endpoints
curl -X GET http://localhost:5000/api/health
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"organizer@example.com","password":"password123"}'
```

### Test Database
```bash
# Connect to MongoDB
docker exec -it event_i_mongodb mongosh -u admin -p password123 --authenticationDatabase admin event_i

# Check collections
show collections

# Check events
db.events.find().pretty()
```

## 🐛 Common Issues & Solutions

### Issue: Auto-save not working
**Solution**: Check browser console for errors, verify API connection

### Issue: Images not uploading
**Solution**: Check file size (5MB limit), verify file type support

### Issue: Form validation errors
**Solution**: Check field requirements, verify data format

### Issue: Mobile swipe not working
**Solution**: Ensure touch events are enabled, check device compatibility

### Issue: Draft recovery not working
**Solution**: Check localStorage permissions, verify data format

## 📊 Success Metrics

### User Experience
- [ ] >90% form completion rate
- [ ] <10 minutes to create event
- [ ] <5% error rate
- [ ] >4.5/5 user satisfaction

### Technical Performance
- [ ] <2 seconds initial load
- [ ] >99% auto-save success
- [ ] <1 second API response
- [ ] Smooth mobile performance

### Accessibility
- [ ] WCAG AA compliance
- [ ] Full keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast compliance

## 🎉 Testing Complete

Once all items are checked, the M6 Event Creation & Management system is ready for production use!

---

**Note**: This testing guide covers all M6 features. Test systematically and document any issues found.

