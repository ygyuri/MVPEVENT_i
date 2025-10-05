# 🗳️ Polls Feature Testing Guide

This guide will help you test the complete polls feature implementation in your MERN stack application.

## 🚀 Quick Start

### 1. Start Your Application
```bash
# Start the backend server
cd server
npm start

# Start the frontend (in a new terminal)
cd client
npm run dev
```

### 2. Access the Polls Feature

#### **Option A: Direct Test Page (Recommended for Testing)**
- **URL**: `http://localhost:3000/polls-test`
- **Navigation**: Click "Polls Test" in the navbar
- **Purpose**: Dedicated testing page with all features

#### **Option B: Event Details Page**
- **URL**: `http://localhost:3000/events/[event-slug]`
- **Purpose**: Polls integrated into event pages

#### **Option C: Dedicated Polls Page**
- **URL**: `http://localhost:3000/events/[eventId]/polls`
- **Purpose**: Full polls management page

## 🔐 Authentication Setup

### 1. Login as Test User
1. Go to `http://localhost:3000/auth-test`
2. Use the test credentials:
   - **Email**: `test@example.com`
   - **Password**: `password123`
3. Or create a new user account

### 2. Test Different User Roles

#### **Organizer Account**
- Can create, manage, and close polls
- Access to all poll settings
- Can export results

#### **Regular User Account**
- Can vote on polls
- Can see results after voting
- Limited to attendee features

## 🧪 Testing Scenarios

### **Scenario 1: Create Your First Poll**

1. **Navigate to Polls Test Page**
   - Go to `http://localhost:3000/polls-test`
   - Ensure you're logged in as an organizer

2. **Create a Poll**
   - Click "Create Poll" button
   - Fill in the form:
     - **Question**: "What's your favorite music genre?"
     - **Description**: "Help us plan the perfect playlist"
     - **Poll Type**: "General Poll"
     - **Options**: 
       - "Pop"
       - "Rock"
       - "Electronic"
       - "Hip Hop"
     - **Max Votes**: 1
     - **Closing Date**: Set to tomorrow
     - **Settings**: Enable "Allow vote changes"

3. **Submit the Poll**
   - Click "Create Poll"
   - Verify the poll appears in the list

### **Scenario 2: Vote on a Poll**

1. **Switch to Attendee View**
   - Open a new browser tab/window
   - Go to `http://localhost:3000/polls-test`
   - Login as a regular user (not organizer)

2. **Vote on the Poll**
   - Find your created poll
   - Click "Vote Now"
   - Select an option
   - Click "Submit Vote"

3. **View Results**
   - Verify you can see the results
   - Check vote counts update

### **Scenario 3: Real-time Updates**

1. **Open Multiple Tabs**
   - Tab 1: Organizer view (polls-test)
   - Tab 2: Attendee view (polls-test)

2. **Test Real-time Features**
   - Create a new poll in Tab 1
   - Verify it appears in Tab 2 immediately
   - Vote on the poll in Tab 2
   - Verify results update in Tab 1

### **Scenario 4: Poll Management**

1. **Test Poll Settings**
   - Create polls with different types:
     - General Poll
     - Artist Selection
     - Theme Selection
     - Feature Selection

2. **Test Poll Actions**
   - Close a poll manually
   - Verify it shows as closed
   - Check final results are displayed

## 📊 Testing Checklist

### **✅ Core Functionality**
- [ ] Create poll as organizer
- [ ] Vote on poll as attendee
- [ ] View real-time results
- [ ] Close poll manually
- [ ] See final results when poll closes

### **✅ Poll Types**
- [ ] General Poll
- [ ] Artist Selection Poll
- [ ] Theme Selection Poll
- [ ] Feature Selection Poll

### **✅ Poll Settings**
- [ ] Single choice voting
- [ ] Multiple choice voting
- [ ] Anonymous voting
- [ ] Vote changes allowed/disabled
- [ ] Automatic poll closing

### **✅ Real-time Features**
- [ ] New poll appears instantly
- [ ] Vote counts update live
- [ ] Poll closure notifications
- [ ] WebSocket connection status

### **✅ UI/UX**
- [ ] Mobile responsive design
- [ ] Loading states
- [ ] Error handling
- [ ] Form validation
- [ ] Accessibility features

### **✅ Error Handling**
- [ ] Network errors
- [ ] Authentication errors
- [ ] Permission errors
- [ ] Validation errors

## 🔧 Troubleshooting

### **Common Issues**

#### **"No polls yet" Message**
- **Cause**: No polls created for the event
- **Solution**: Create a poll as an organizer

#### **WebSocket Connection Issues**
- **Cause**: Backend WebSocket not running
- **Solution**: Ensure backend server is running with WebSocket support

#### **"Failed to create poll" Error**
- **Cause**: Backend API not responding
- **Solution**: Check backend server and API endpoints

#### **"Access denied" Error**
- **Cause**: User doesn't have organizer permissions
- **Solution**: Login as organizer or check user role

### **Debug Information**

#### **Check Redux State**
```javascript
// In browser console
console.log(store.getState().polls);
```

#### **Check WebSocket Connection**
```javascript
// In browser console
console.log('WebSocket connected:', pollSocket.isConnected());
```

#### **Check API Endpoints**
```bash
# Test polls API
curl http://localhost:5000/api/events/[eventId]/polls
```

## 📱 Mobile Testing

### **Test on Mobile Devices**
1. **Open on Mobile Browser**
   - Navigate to `http://localhost:3000/polls-test`
   - Test touch interactions

2. **Test Responsive Design**
   - Resize browser window
   - Check mobile layout

3. **Test Mobile Features**
   - Touch voting
   - Swipe gestures
   - Mobile keyboard

## 🎯 Advanced Testing

### **Load Testing**
1. **Create Multiple Polls**
   - Create 5+ polls simultaneously
   - Test performance

2. **Multiple Users Voting**
   - Open multiple browser tabs
   - Simulate multiple users voting
   - Monitor real-time updates

### **Edge Cases**
1. **Rapid Voting**
   - Vote quickly multiple times
   - Test rate limiting

2. **Network Issues**
   - Disconnect internet
   - Test offline behavior
   - Reconnect and verify sync

3. **Large Polls**
   - Create polls with 10 options
   - Test UI with many options

## 📈 Performance Testing

### **Monitor Performance**
1. **Browser DevTools**
   - Open Network tab
   - Monitor API calls
   - Check WebSocket messages

2. **Redux DevTools**
   - Monitor state changes
   - Check action dispatching
   - Verify state updates

## 🚀 Production Deployment

### **Before Going Live**
1. **Test with Real Data**
   - Use production-like data
   - Test with real user accounts

2. **Performance Testing**
   - Load test with multiple users
   - Monitor server resources

3. **Security Testing**
   - Test rate limiting
   - Verify authentication
   - Check permission controls

## 📞 Support

### **If You Encounter Issues**
1. **Check Browser Console**
   - Look for JavaScript errors
   - Check network requests

2. **Check Backend Logs**
   - Monitor server console
   - Check database connections

3. **Verify Configuration**
   - Check environment variables
   - Verify API endpoints
   - Test WebSocket connections

## 🎉 Success Criteria

### **Feature is Working When:**
- ✅ Organizers can create polls
- ✅ Attendees can vote on polls
- ✅ Results update in real-time
- ✅ Polls can be closed manually
- ✅ All poll types work correctly
- ✅ Mobile experience is smooth
- ✅ Error handling works properly
- ✅ Performance is acceptable

---

**Happy Testing! 🎊**

The polls feature is now fully integrated and ready for production use. Test thoroughly and enjoy the real-time interactive polling experience!
