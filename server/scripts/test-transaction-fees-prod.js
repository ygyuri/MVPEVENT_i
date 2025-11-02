#!/usr/bin/env node

const mongoose = require("mongoose");
const transactionFeeService = require("./server/services/transactionFeeService");
const Order = require("./server/models/Order");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin";

async function testTransactionFees() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected\n");

    // Test fee calculations
    console.log("🧪 Testing Transaction Fee Calculations:\n");
    const testCases = [
      { amount: 1, expected: 0, desc: "Min (1 KES)" },
      { amount: 49, expected: 0, desc: "Tier 1 max (49 KES)" },
      { amount: 50, expected: 6, desc: "Tier 2 start (50 KES)" },
      { amount: 100, expected: 6, desc: "Mid Tier 2 (100 KES)" },
      { amount: 500, expected: 10, desc: "Tier 3 start (500 KES)" },
      { amount: 1500, expected: 20, desc: "Tier 5 start (1500 KES)" },
      { amount: 5000, expected: 40, desc: "Tier 8 start (5000 KES)" },
      { amount: 25000, expected: 80, desc: "Tier 12 (25000 KES)" },
      { amount: 100000, expected: 130, desc: "Tier 14 (100000 KES)" },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
      const result = await transactionFeeService.calculateTransactionFee(
        test.amount,
        "KES"
      );
      const match = result.fee === test.expected;
      if (match) passed++;
      else failed++;

      const status = match ? "✅" : "❌";
      console.log(
        `${status} ${test.amount.toLocaleString().padEnd(10)} → Fee: ${result.fee.toString().padEnd(5)} KES (Expected: ${test.expected}) [${result.feeDetails?.tierName || "N/A"}] - ${test.desc}`
      );
    }

    console.log(`\n📊 Results: ✅ ${passed}/${testCases.length} passed | ❌ ${failed}/${testCases.length} failed\n`);

    // Check actual orders
    console.log("📋 Checking Recent Orders:\n");
    const orders = await Order.find({
      "pricing.transactionFee": { $exists: true },
    })
      .limit(5)
      .sort({ createdAt: -1 })
      .lean();

    if (orders.length > 0) {
      console.log(`Found ${orders.length} order(s) with transaction fees:\n`);
      orders.forEach((order, i) => {
        console.log(`Order ${i + 1}:`);
        console.log(`  Order #: ${order.orderNumber}`);
        console.log(`  Created: ${order.createdAt ? new Date(order.createdAt).toLocaleDateString() : "N/A"}`);
        console.log(`  Subtotal: ${(order.pricing?.subtotal || 0).toLocaleString()} ${order.pricing?.currency || "KES"}`);
        console.log(`  Transaction Fee: ${(order.pricing?.transactionFee || 0).toLocaleString()} ${order.pricing?.currency || "KES"}`);
        if (order.pricing?.transactionFeeDetails) {
          console.log(`  Fee Tier: ${order.pricing.transactionFeeDetails.tierName}`);
        }
        console.log(`  Total: ${(order.pricing?.total || order.totalAmount || 0).toLocaleString()} ${order.pricing?.currency || "KES"}`);
        console.log(`  Status: ${order.paymentStatus || order.status || "N/A"}\n`);
      });
    } else {
      console.log("⚠️  No orders found with transaction fee field");
      console.log("   This is normal if no orders were created after the feature was added.\n");
    }

    await mongoose.disconnect();
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

testTransactionFees();

