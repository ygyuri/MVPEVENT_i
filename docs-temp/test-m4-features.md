# 🛒 M4 Ticket Purchase & Checkout - Test Checklist

## 🎯 **M4 Requirements Verification**

### ✅ **Core Features**
- [ ] **Guest Checkout**: No login required for ticket purchase
- [ ] **MPESA Integration**: Full Daraja API integration (replaces Stripe)
- [ ] **Price Breakdown**: Subtotal + 5% service fee calculation
- [ ] **Email Receipt**: Automatic email notifications after purchase

### ✅ **Best Practices**
- [ ] **Server-Side Pricing**: All calculations done on backend
- [ ] **Inventory Validation**: Check ticket availability before payment
- [ ] **Order Storage**: Successful payments stored as Order with ticket IDs

---

## 🧪 **Step-by-Step Testing Guide**

### **1. 🏠 Home Page Test**
```
URL: http://localhost:3000
```
**Verify:**
- [ ] Page loads without errors
- [ ] Theme toggle works (dark/light mode)
- [ ] Navigation to Events page works

### **2. 📅 Events Page Test**
```
URL: http://localhost:3000/events
```
**Verify:**
- [ ] Events list displays
- [ ] Each event has "Add to Cart" button
- [ ] Event cards show correct information

### **3. 🎫 Event Details Test**
```
URL: http://localhost:3000/events/[event-slug]
```
**Verify:**
- [ ] Event details load correctly
- [ ] Ticket types are displayed
- [ ] Quantity selector works
- [ ] "Add to Cart" button is functional

### **4. 🛒 Cart Functionality Test**
```
Action: Click "Add to Cart" on any event
```
**Verify:**
- [ ] Cart icon in navbar updates with count
- [ ] Multiple tickets of same type can be added
- [ ] Different ticket types from different events can be added
- [ ] Console shows debug logs for cart updates

### **5. 🛒 Cart Page Test**
```
URL: http://localhost:3000/checkout
```
**Verify:**
- [ ] Cart page loads with cart items
- [ ] Progress bar shows "Cart" step as active
- [ ] Cart items display with correct prices
- [ ] Order summary shows subtotal, service fee (5%), and total
- [ ] "Proceed to Checkout" button is enabled

### **6. 👤 Customer Information Test**
```
Action: Click "Proceed to Checkout"
```
**Verify:**
- [ ] Progress bar advances to "Customer Info" step
- [ ] Form loads with required fields
- [ ] Form validation works:
  - Empty form submission shows errors
  - Invalid phone format shows error
  - Valid data submission proceeds to payment

### **7. 💳 Payment Test**
```
Action: Fill customer info and continue
```
**Verify:**
- [ ] Progress bar advances to "Payment" step
- [ ] Order summary displays correctly
- [ ] MPESA phone number input appears
- [ ] Phone validation works (254XXXXXXXXX format)
- [ ] "Pay with MPESA" button is enabled

### **8. 🎯 MPESA Integration Test**
```
Action: Enter phone number and click "Pay with MPESA"
```
**Verify:**
- [ ] Button shows loading state
- [ ] Payment status updates to "Payment Pending"
- [ ] MPESA prompt message appears
- [ ] Instructions show 4-step process

### **9. ✅ Order Confirmation Test**
```
Action: After payment simulation
```
**Verify:**
- [ ] Progress bar shows "Confirmation" step
- [ ] Success message with checkmark appears
- [ ] Order details are displayed correctly
- [ ] Next steps instructions are shown

---

## 🔧 **Backend API Testing**

### **Order Creation**
```bash
curl -X POST http://localhost:5000/api/orders/create \
  -H "Content-Type: application/json" \
  -d '{
    "customer": {
      "email": "test@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "254712345678"
    },
    "items": [{
      "eventId": "507f1f77bcf86cd799439011",
      "eventTitle": "Test Event",
      "ticketType": "VIP",
      "quantity": 2,
      "unitPrice": 1000,
      "subtotal": 2000
    }]
  }'
```

### **Payment Initiation**
```bash
curl -X POST http://localhost:5000/api/orders/[orderId]/pay \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "254712345678"
  }'
```

### **Health Check**
```bash
curl http://localhost:5000/api/orders/health
```

---

## 🐛 **Common Issues & Solutions**

### **Cart Not Updating**
- [ ] Check browser console for errors
- [ ] Verify Redux DevTools shows state changes
- [ ] Check if `addToCart` action is dispatched
- [ ] Verify cart state structure

### **Payment Not Working**
- [ ] Check backend logs for MPESA errors
- [ ] Verify environment variables are set
- [ ] Check network connectivity
- [ ] Verify callback URL configuration

### **Email Not Sending**
- [ ] Check SMTP configuration
- [ ] Verify email service is running
- [ ] Check email templates
- [ ] Verify email addresses

---

## 📊 **Success Criteria**

### **✅ M4 Complete When:**
- [ ] Complete checkout flow works end-to-end
- [ ] Cart management functions properly
- [ ] MPESA integration is functional
- [ ] Email receipts are sent
- [ ] Order and ticket creation works
- [ ] Web3 design is consistent
- [ ] Mobile experience is smooth
- [ ] Error handling is robust

### **🎉 M4 Features Verified:**
- [ ] Guest checkout ✅
- [ ] MPESA integration ✅
- [ ] Price breakdown ✅
- [ ] Email receipt ✅
- [ ] Server-side pricing ✅
- [ ] Inventory validation ✅
- [ ] Order storage ✅

---

## 🚀 **Ready for Testing**

**Frontend:** http://localhost:3000
**Backend:** http://localhost:5000
**API Health:** http://localhost:5000/api/orders/health

**Start testing now!** 🧪
