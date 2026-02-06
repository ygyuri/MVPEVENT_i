#!/usr/bin/env node

/**
 * Test Transaction Fee Calculations
 * 
 * Tests various transaction amounts to verify correct fee calculation
 */

// Change to server directory for proper module resolution
process.chdir(__dirname + "/server");

const mongoose = require("mongoose");
const transactionFeeService = require("./services/transactionFeeService");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://admin:password123@127.0.0.1:27017/event_i?authSource=admin";

async function testTransactionFees() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Test cases based on the official fee schedule
    const testCases = [
      { amount: 25, expectedFee: 0, description: "Low amount (1-49 range)" },
      { amount: 49, expectedFee: 0, description: "Edge: 49 KES" },
      { amount: 50, expectedFee: 6, description: "Edge: 50 KES" },
      { amount: 100, expectedFee: 6, description: "Mid range (50-499)" },
      { amount: 499, expectedFee: 6, description: "Edge: 499 KES" },
      { amount: 500, expectedFee: 10, description: "Edge: 500 KES" },
      { amount: 750, expectedFee: 10, description: "Mid range (500-999)" },
      { amount: 1000, expectedFee: 15, description: "Edge: 1,000 KES" },
      { amount: 1500, expectedFee: 20, description: "Edge: 1,500 KES" },
      { amount: 2500, expectedFee: 25, description: "Edge: 2,500 KES" },
      { amount: 3500, expectedFee: 30, description: "Edge: 3,500 KES" },
      { amount: 5000, expectedFee: 40, description: "Edge: 5,000 KES" },
      { amount: 7500, expectedFee: 45, description: "Edge: 7,500 KES" },
      { amount: 10000, expectedFee: 50, description: "Edge: 10,000 KES" },
      { amount: 15000, expectedFee: 55, description: "Edge: 15,000 KES" },
      { amount: 20000, expectedFee: 80, description: "Edge: 20,000 KES" },
      { amount: 35000, expectedFee: 105, description: "Edge: 35,000 KES" },
      { amount: 50000, expectedFee: 130, description: "Edge: 50,000 KES" },
      { amount: 150000, expectedFee: 160, description: "Edge: 150,000 KES" },
      { amount: 250000, expectedFee: 195, description: "Edge: 250,000 KES" },
      { amount: 350000, expectedFee: 230, description: "Edge: 350,000 KES" },
      { amount: 550000, expectedFee: 275, description: "Edge: 550,000 KES" },
      { amount: 750000, expectedFee: 320, description: "Edge: 750,000 KES" },
      { amount: 1000000, expectedFee: 320, description: "Edge: 1,000,000 KES" },
      { amount: 2000000, expectedFee: 320, description: "Above 1M (catch-all)" },
    ];

    console.log("🧪 Testing Transaction Fee Calculations\n");
    console.log("=" .repeat(80));
    console.log(
      `${"Amount".padEnd(15)} ${"Expected".padEnd(10)} ${"Calculated".padEnd(10)} ${"Tier".padEnd(25)} ${"Status"}`
    );
    console.log("=".repeat(80));

    let passed = 0;
    let failed = 0;
    const failures = [];

    for (const testCase of testCases) {
      const result = await transactionFeeService.calculateTransactionFee(
        testCase.amount,
        "KES"
      );

      const calculatedFee = result.fee;
      const tierName = result.feeDetails?.tierName || "N/A";
      const isMatch = calculatedFee === testCase.expectedFee;
      const status = isMatch ? "✅ PASS" : "❌ FAIL";
      
      if (isMatch) {
        passed++;
      } else {
        failed++;
        failures.push({
          amount: testCase.amount,
          expected: testCase.expectedFee,
          calculated: calculatedFee,
          description: testCase.description,
        });
      }

      console.log(
        `${testCase.amount.toLocaleString().padEnd(15)} ` +
        `${testCase.expectedFee.toString().padEnd(10)} ` +
        `${calculatedFee.toString().padEnd(10)} ` +
        `${tierName.substring(0, 24).padEnd(25)} ` +
        `${status}`
      );
    }

    console.log("=".repeat(80));
    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passed}/${testCases.length}`);
    console.log(`   ❌ Failed: ${failed}/${testCases.length}`);

    if (failures.length > 0) {
      console.log(`\n❌ Failed Test Cases:`);
      failures.forEach((failure) => {
        console.log(
          `   - Amount: ${failure.amount.toLocaleString()} KES | Expected: ${failure.expected} KES | Got: ${failure.calculated} KES | ${failure.description}`
        );
      });
    } else {
      console.log(`\n🎉 All tests passed! Transaction fee calculation is working correctly.`);
    }

    // Test total calculation (subtotal + fee)
    console.log(`\n💰 Example Order Calculations:`);
    console.log("=".repeat(80));
    const orderExamples = [
      { subtotal: 500, quantity: 1 },
      { subtotal: 1500, quantity: 2 },
      { subtotal: 5000, quantity: 5 },
      { subtotal: 25000, quantity: 1 },
    ];

    for (const example of orderExamples) {
      const feeCalc = await transactionFeeService.calculateTransactionFee(
        example.subtotal,
        "KES"
      );
      const total = example.subtotal + feeCalc.fee;
      console.log(
        `   Subtotal: ${example.subtotal.toLocaleString()} KES + ` +
        `Fee: ${feeCalc.fee.toLocaleString()} KES = ` +
        `Total: ${total.toLocaleString()} KES ` +
        `(${example.quantity} ticket${example.quantity > 1 ? "s" : ""})`
      );
    }

    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
    process.exit(failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error.stack);
    await mongoose.disconnect().catch(() => {});
    process.exit(1);
  }
}

if (require.main === module) {
  testTransactionFees();
}

module.exports = { testTransactionFees };

