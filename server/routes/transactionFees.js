const express = require("express");
const { verifyToken, requireRole } = require("../middleware/auth");
const { body, param, validationResult } = require("express-validator");
const TransactionFee = require("../models/TransactionFee");
const transactionFeeService = require("../services/transactionFeeService");

const router = express.Router();

// Get all transaction fee tiers (admin only)
router.get("/", verifyToken, requireRole("admin"), async (req, res) => {
  try {
    const { currency = "KES" } = req.query;

    const feeTiers = await TransactionFee.find({
      currency: currency.toUpperCase(),
    })
      .sort({ priority: 1, minAmount: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        feeTiers,
        currency: currency.toUpperCase(),
        count: feeTiers.length,
      },
    });
  } catch (error) {
    console.error("Get transaction fees error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch transaction fee tiers",
    });
  }
});

// Get a single transaction fee tier (admin only)
router.get(
  "/:tierId",
  verifyToken,
  requireRole("admin"),
  [param("tierId").isMongoId().withMessage("Invalid tier ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Invalid tier ID",
          details: errors.array(),
        });
      }

      const { tierId } = req.params;
      const tier = await TransactionFee.findById(tierId).lean();

      if (!tier) {
        return res.status(404).json({
          success: false,
          error: "Transaction fee tier not found",
        });
      }

      res.json({
        success: true,
        data: tier,
      });
    } catch (error) {
      console.error("Get transaction fee tier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch transaction fee tier",
      });
    }
  }
);

// Create a new transaction fee tier (admin only)
router.post(
  "/",
  verifyToken,
  requireRole("admin"),
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("minAmount").isNumeric().withMessage("Min amount must be numeric"),
    body("feeType")
      .isIn(["fixed", "percentage"])
      .withMessage("Fee type must be 'fixed' or 'percentage'"),
    body("currency")
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage("Currency must be 3 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const tierData = {
        name: req.body.name,
        minAmount: Number(req.body.minAmount),
        maxAmount: req.body.maxAmount ? Number(req.body.maxAmount) : null,
        feeType: req.body.feeType,
        fixedFee: req.body.fixedFee ? Number(req.body.fixedFee) : 0,
        percentageRate: req.body.percentageRate
          ? Number(req.body.percentageRate)
          : 0,
        additionalFixedFee: req.body.additionalFixedFee
          ? Number(req.body.additionalFixedFee)
          : 0,
        currency: (req.body.currency || "KES").toUpperCase(),
        priority: req.body.priority ? Number(req.body.priority) : 0,
        description: req.body.description || "",
        isActive: req.body.isActive !== undefined ? req.body.isActive : true,
      };

      // Validate fee type specific fields
      if (tierData.feeType === "fixed" && tierData.fixedFee <= 0) {
        return res.status(400).json({
          success: false,
          error: "Fixed fee must be greater than 0 for fixed fee type",
        });
      }

      if (tierData.feeType === "percentage" && tierData.percentageRate <= 0) {
        return res.status(400).json({
          success: false,
          error:
            "Percentage rate must be greater than 0 for percentage fee type",
        });
      }

      const tier = new TransactionFee(tierData);
      await tier.save();

      res.status(201).json({
        success: true,
        message: "Transaction fee tier created successfully",
        data: tier,
      });
    } catch (error) {
      console.error("Create transaction fee tier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to create transaction fee tier",
        details: error.message,
      });
    }
  }
);

// Update a transaction fee tier (admin only)
router.put(
  "/:tierId",
  verifyToken,
  requireRole("admin"),
  [param("tierId").isMongoId().withMessage("Invalid tier ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Invalid tier ID",
          details: errors.array(),
        });
      }

      const { tierId } = req.params;
      const tier = await TransactionFee.findById(tierId);

      if (!tier) {
        return res.status(404).json({
          success: false,
          error: "Transaction fee tier not found",
        });
      }

      // Update allowed fields
      const updateableFields = [
        "name",
        "minAmount",
        "maxAmount",
        "feeType",
        "fixedFee",
        "percentageRate",
        "additionalFixedFee",
        "currency",
        "priority",
        "description",
        "isActive",
      ];

      updateableFields.forEach((field) => {
        if (req.body[field] !== undefined) {
          if (
            [
              "minAmount",
              "maxAmount",
              "fixedFee",
              "percentageRate",
              "additionalFixedFee",
              "priority",
            ].includes(field)
          ) {
            tier[field] = Number(req.body[field]);
          } else if (field === "currency") {
            tier[field] = String(req.body[field]).toUpperCase();
          } else if (field === "maxAmount" && req.body[field] === null) {
            tier[field] = null;
          } else {
            tier[field] = req.body[field];
          }
        }
      });

      await tier.save();

      res.json({
        success: true,
        message: "Transaction fee tier updated successfully",
        data: tier,
      });
    } catch (error) {
      console.error("Update transaction fee tier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to update transaction fee tier",
        details: error.message,
      });
    }
  }
);

// Delete a transaction fee tier (admin only)
router.delete(
  "/:tierId",
  verifyToken,
  requireRole("admin"),
  [param("tierId").isMongoId().withMessage("Invalid tier ID")],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Invalid tier ID",
          details: errors.array(),
        });
      }

      const { tierId } = req.params;
      const tier = await TransactionFee.findByIdAndDelete(tierId);

      if (!tier) {
        return res.status(404).json({
          success: false,
          error: "Transaction fee tier not found",
        });
      }

      res.json({
        success: true,
        message: "Transaction fee tier deleted successfully",
      });
    } catch (error) {
      console.error("Delete transaction fee tier error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete transaction fee tier",
      });
    }
  }
);

// Initialize default fee tiers (admin only)
router.post(
  "/initialize-defaults",
  verifyToken,
  requireRole("admin"),
  async (req, res) => {
    try {
      const { currency = "KES" } = req.body;
      await transactionFeeService.initializeDefaultTiers(currency);

      const tiers = await transactionFeeService.getFeeTiers(currency);

      res.json({
        success: true,
        message: `Default fee tiers initialized for ${currency}`,
        data: {
          currency,
          tiers,
          count: tiers.length,
        },
      });
    } catch (error) {
      console.error("Initialize default tiers error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to initialize default fee tiers",
        details: error.message,
      });
    }
  }
);

// Calculate fee for a test amount (admin only)
router.post(
  "/calculate",
  verifyToken,
  requireRole("admin"),
  [
    body("amount").isNumeric().withMessage("Amount must be numeric"),
    body("currency")
      .optional()
      .isString()
      .isLength({ min: 3, max: 3 })
      .withMessage("Currency must be 3 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: errors.array(),
        });
      }

      const amount = Number(req.body.amount);
      const currency = (req.body.currency || "KES").toUpperCase();

      const calculation = await transactionFeeService.calculateTransactionFee(
        amount,
        currency
      );

      res.json({
        success: true,
        data: {
          amount,
          currency,
          ...calculation,
        },
      });
    } catch (error) {
      console.error("Calculate fee error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to calculate transaction fee",
        details: error.message,
      });
    }
  }
);

module.exports = router;
