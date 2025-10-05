# 🔧 Docker Authentication & WebSocket Fix Guide

## 🎯 **Issues Identified:**

1. **403 Forbidden Error**: `GET /api/events/:eventId/polls?status=active 403 (Forbidden)`
2. **WebSocket Connection Failed**: `WebSocket connection to 'ws://localhost:5000/socket.io/' failed`
3. **Offline Status**: Due to connection failures

## ✅ **Solutions Applied:**

### 1. **WebSocket Connection Improvements**
- Added better error handling for authentication failures
- Improved connection timeout and retry logic
- Added authentication error detection

### 2. **Debug Component Added**
- Added `DebugAuth` component to diagnose authentication issues
- Shows token status and validation results in development

### 3. **Docker Configuration Verified**
- All containers are running properly
- Server is healthy and accessible on port 5000
- Socket.io is initialized and running

## 🚀 **How to Fix the Issues:**

### **Step 1: Check Authentication Status**
1. Refresh the browser page
2. Look for the debug panel in the top-right corner
3. Check if the token is valid

### **Step 2: If Authentication is Invalid**
1. **Log out and log back in**:
   ```bash
   # Clear browser storage
   localStorage.clear()
   sessionStorage.clear()
   ```

2. **Or restart the containers**:
   ```bash
   cd /Users/brix/Documents/GitHub/MVPEVENT_i
   docker compose restart client server
   ```

### **Step 3: Verify WebSocket Connection**
After logging in, check the browser console for:
- ✅ `[PollSocket] Connected` - WebSocket connected successfully
- ✅ `🔍 Auth Debug: ✅ Token valid` - Authentication working

### **Step 4: Test Poll Creation**
1. Navigate to an event's polls page
2. Try creating a poll
3. Should work without 404 or 403 errors

## 🔍 **Troubleshooting Steps:**

### **If still getting 403 errors:**
```bash
# Check server logs
docker logs event_i_server --tail 20

# Check if user is properly authenticated
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/auth/me
```

### **If WebSocket still fails:**
```bash
# Test WebSocket endpoint
curl -I http://localhost:5000/socket.io/

# Check server Socket.io logs
docker logs event_i_server | grep -i socket
```

### **If containers are not responding:**
```bash
# Restart all services
docker compose down
docker compose up -d

# Check container status
docker compose ps
```

## 🎯 **Expected Results After Fix:**

1. **✅ Authentication**: Debug panel shows "Token valid"
2. **✅ WebSocket**: Console shows "[PollSocket] Connected"
3. **✅ Polls API**: No more 403 errors when loading polls
4. **✅ Poll Creation**: Can create polls without 404 errors
5. **✅ Real-time Updates**: Live poll updates work via WebSocket

## 🚨 **Common Issues & Solutions:**

### **Issue: "Access denied. No token provided"**
**Solution**: User needs to log in
```javascript
// Check if logged in
localStorage.getItem('authToken') // Should return a token
```

### **Issue: "Session expired. Please login again"**
**Solution**: Token expired, need to refresh login
```javascript
// Clear expired token and login again
localStorage.removeItem('authToken')
// Then login through the app
```

### **Issue: WebSocket connection fails repeatedly**
**Solution**: Check Docker networking
```bash
# Verify containers can communicate
docker exec event_i_client ping server
docker exec event_i_server ping client
```

## 📊 **Monitoring Commands:**

```bash
# Watch server logs in real-time
docker logs -f event_i_server

# Check container resource usage
docker stats

# Test API endpoints
curl -X GET http://localhost:5000/api/health
```

## 🎉 **Success Indicators:**

When everything is working correctly, you should see:
- ✅ Debug panel shows "Token valid"
- ✅ Browser console shows WebSocket connected
- ✅ Polls page loads without errors
- ✅ Can create new polls successfully
- ✅ Real-time poll updates work
