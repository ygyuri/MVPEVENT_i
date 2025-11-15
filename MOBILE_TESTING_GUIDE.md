# 📱 Mobile Testing Guide - QR Code Endpoints

Complete guide for testing QR code generation and scanning on your phone using the same WiFi network.

## 🔍 Step 1: Find Your Computer's IP Address

### On Mac/Linux:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```
Look for something like: `inet 192.168.1.100`

### On Windows:
```bash
ipconfig
```
Look for "IPv4 Address" under your WiFi adapter, e.g., `192.168.1.100`

### Quick Alternative:
- Mac: System Preferences → Network → WiFi → Advanced → TCP/IP
- Windows: Settings → Network & Internet → WiFi → Properties

---

## 📲 Step 2: Access Test Pages on Your Phone

Make sure your phone and computer are on the **same WiFi network**.

### Option A: QR Test Page (Generate & Test QR Codes)
```
http://YOUR_IP_ADDRESS:5173/qr-test
```
**Example:** `http://192.168.1.100:5173/qr-test`

### Option B: Scanner Page (Scan QR Codes with Camera)
```
http://YOUR_IP_ADDRESS:5173/scanner
```
**Example:** `http://192.168.1.100:5173/scanner`

---

## 🎯 Step 3: Available Endpoints & How to Use Them

### 📱 **Endpoint 1: Generate QR Code**
**Page:** `/qr-test`  
**Method:** Click "Generate QR Code" button

**What it does:**
- Generates a QR code for a selected ticket
- Displays QR code visually
- Shows QR code string for copying

**Steps:**
1. Open `/qr-test` on your phone
2. Select a ticket from the list (look for "Valid Now" badge)
3. Click "Generate QR Code"
4. QR code appears - click "Full Screen" for larger view

**API Endpoint Used:**
```
POST /api/tickets/test/generate-qr/:ticketId
```

---

### 🔍 **Endpoint 2: Test Scan (Manual Input)**
**Page:** `/qr-test`  
**Method:** Paste QR string and click "Test Scan"

**What it does:**
- Validates a QR code string manually
- Shows detailed validation results
- Does NOT mark ticket as used (safe for testing)

**Steps:**
1. On `/qr-test` page
2. Copy a QR code string (from generated QR or elsewhere)
3. Paste into "QR Code String" field
4. Click "Test Scan"
5. Review results

**API Endpoint Used:**
```
POST /api/tickets/test/scan
Body: { qr: "QR_STRING_HERE", location: "Test Browser", device: {...} }
```

---

### 📷 **Endpoint 3: Camera Scanner**
**Page:** `/scanner`  
**Method:** Use phone camera to scan QR code

**What it does:**
- Opens phone camera
- Automatically scans QR codes
- Validates and shows results in real-time
- Marks ticket as used (production endpoint)

**Steps:**
1. Open `/scanner` on your phone
2. Grant camera permissions when prompted
3. Point camera at QR code (on computer screen or another device)
4. QR code is automatically detected and validated
5. Results appear on screen

**API Endpoint Used:**
```
POST /api/tickets/scan
Body: { qr: "SCANNED_QR", location: "Gate A", device: {...} }
```

**Note:** This requires authentication (organizer/admin role)

---

### 📋 **Endpoint 4: List Available Tickets**
**Page:** `/qr-test` (automatic)  
**Method:** Automatically loads when page opens

**What it does:**
- Lists all tickets in database
- Shows validity status
- Shows payment status
- Shows if QR code exists

**API Endpoint Used:**
```
GET /api/tickets/test/list?limit=20
```

---

## 🧪 Complete Testing Workflow

### **Scenario 1: Generate QR on Phone, Scan on Computer**

1. **On Phone:**
   - Open `http://YOUR_IP:5173/qr-test`
   - Select a valid ticket
   - Click "Generate QR Code"
   - Click "Full Screen" for large QR

2. **On Computer:**
   - Open `http://localhost:5173/scanner` (or use test scan)
   - Point camera at phone screen
   - QR code is scanned and validated

---

### **Scenario 2: Generate QR on Computer, Scan on Phone**

1. **On Computer:**
   - Open `http://localhost:5173/qr-test`
   - Generate a QR code
   - Click "Full Screen"

2. **On Phone:**
   - Open `http://YOUR_IP:5173/scanner`
   - Point phone camera at computer screen
   - QR code is automatically scanned

---

### **Scenario 3: Test with Manual QR String**

1. **On Computer:**
   - Open `/qr-test`
   - Generate QR code
   - Copy the QR string

2. **On Phone:**
   - Open `/qr-test`
   - Paste QR string into scan field
   - Click "Test Scan"
   - Review validation results

---

## 🔑 Key Differences Between Endpoints

| Endpoint | URL | Auth Required | Marks Ticket Used | Use Case |
|----------|-----|---------------|-------------------|----------|
| **Test Generate** | `/api/tickets/test/generate-qr/:id` | ❌ No | ❌ No | Testing QR generation |
| **Test Scan** | `/api/tickets/test/scan` | ❌ No | ❌ No | Testing validation logic |
| **Production Scan** | `/api/tickets/scan` | ✅ Yes (organizer/admin) | ✅ Yes | Real event scanning |

---

## 📝 Quick Reference URLs

Replace `YOUR_IP` with your computer's IP address (e.g., `192.168.1.100`):

```
# Test Pages (No Auth Required)
http://YOUR_IP:5173/qr-test          # Generate & test QR codes
http://YOUR_IP:5173/scanner           # Camera scanner (requires auth)

# API Endpoints (Direct)
http://YOUR_IP:5000/api/tickets/test/generate-qr/:ticketId
http://YOUR_IP:5000/api/tickets/test/scan
http://YOUR_IP:5000/api/tickets/test/list
```

---

## ⚠️ Troubleshooting

### Can't Access Page on Phone
- ✅ Check both devices are on same WiFi
- ✅ Check firewall isn't blocking port 5173
- ✅ Try computer's IP instead of `localhost`
- ✅ Check Vite dev server is running

### Camera Not Working on Scanner
- ✅ Grant camera permissions in browser
- ✅ Use HTTPS if required (some browsers need HTTPS for camera)
- ✅ Try different browser (Chrome/Safari)

### QR Code Not Scanning
- ✅ Ensure QR code is large enough (use Full Screen mode)
- ✅ Ensure good lighting
- ✅ Hold phone steady
- ✅ Check QR code hasn't expired (look for "Valid Now" badge)

### Authentication Errors
- ✅ `/scanner` requires login as organizer/admin
- ✅ Use `/qr-test` for testing without auth
- ✅ Test scan endpoint doesn't require auth

---

## 💡 Pro Tips

1. **Use Full Screen Mode:** Makes QR codes much easier to scan
2. **Check Validity:** Look for green "Valid Now" badge when selecting tickets
3. **Test Endpoints Don't Mark Used:** Safe to test same QR multiple times
4. **Production Scanner Marks Used:** Use test endpoints for development
5. **Network Access:** Both devices must be on same WiFi network

---

## 🎯 Recommended Testing Flow

1. Start with `/qr-test` on phone to generate QR codes
2. Use "Full Screen" for easy scanning
3. Test with `/scanner` on another device
4. Use "Test Scan" to validate without marking tickets as used
5. Check console logs for detailed error messages

Happy Testing! 🚀

