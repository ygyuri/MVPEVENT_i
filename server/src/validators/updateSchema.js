const { body, validationResult } = require('express-validator');

/**
 * Update Schema Validators
 * Input validation for event updates
 */

/**
 * Validate update creation schema
 */
const validateUpdateSchema = [
  body('content')
    .isString()
    .withMessage('Content must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters')
    .trim()
    .escape(),

  body('media_urls')
    .optional()
    .isArray()
    .withMessage('Media URLs must be an array')
    .custom((urls) => {
      if (urls && urls.length > 10) {
        throw new Error('Maximum 10 media URLs allowed');
      }
      return true;
    })
    .custom((urls) => {
      if (urls) {
        for (const url of urls) {
          if (typeof url !== 'string') {
            throw new Error('All media URLs must be strings');
          }
          if (!isValidUrl(url)) {
            throw new Error('Invalid media URL format');
          }
        }
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent'),

  body('scheduled_at')
    .optional()
    .isISO8601()
    .withMessage('Scheduled time must be a valid ISO 8601 date')
    .custom((date) => {
      if (date && new Date(date) < new Date()) {
        throw new Error('Scheduled time must be in the future');
      }
      return true;
    })
];

/**
 * Validate update edit schema
 */
const validateUpdateEditSchema = [
  body('content')
    .optional()
    .isString()
    .withMessage('Content must be a string')
    .isLength({ min: 1, max: 1000 })
    .withMessage('Content must be between 1 and 1000 characters')
    .trim()
    .escape(),

  body('media_urls')
    .optional()
    .isArray()
    .withMessage('Media URLs must be an array')
    .custom((urls) => {
      if (urls && urls.length > 10) {
        throw new Error('Maximum 10 media URLs allowed');
      }
      return true;
    })
    .custom((urls) => {
      if (urls) {
        for (const url of urls) {
          if (typeof url !== 'string') {
            throw new Error('All media URLs must be strings');
          }
          if (!isValidUrl(url)) {
            throw new Error('Invalid media URL format');
          }
        }
      }
      return true;
    }),

  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Priority must be one of: low, normal, high, urgent')
];

/**
 * Validate reaction schema
 */
const validateReactionSchema = [
  body('reaction')
    .isIn(['like', 'love', 'clap', 'wow', 'sad', 'fire', 'thumbs_up', 'heart', 'laugh', 'angry'])
    .withMessage('Invalid reaction type')
];

/**
 * Validate bulk operations schema
 */
const validateBulkOperationSchema = [
  body('update_ids')
    .isArray()
    .withMessage('Update IDs must be an array')
    .isLength({ min: 1, max: 50 })
    .withMessage('Maximum 50 updates can be processed at once')
    .custom((ids) => {
      for (const id of ids) {
        if (typeof id !== 'string' || !isValidObjectId(id)) {
          throw new Error('Invalid update ID format');
        }
      }
      return true;
    })
];

/**
 * Validate moderation schema
 */
const validateModerationSchema = [
  body('action')
    .isIn(['approve', 'reject', 'flag'])
    .withMessage('Moderation action must be one of: approve, reject, flag'),

  body('reason')
    .optional()
    .isString()
    .withMessage('Reason must be a string')
    .isLength({ max: 500 })
    .withMessage('Reason must be less than 500 characters')
    .trim()
    .escape()
];

/**
 * Validate analytics query schema
 */
const validateAnalyticsSchema = [
  body('date_range')
    .optional()
    .isObject()
    .withMessage('Date range must be an object')
    .custom((range) => {
      if (range.start_date && !isValidDate(range.start_date)) {
        throw new Error('Invalid start date format');
      }
      if (range.end_date && !isValidDate(range.end_date)) {
        throw new Error('Invalid end date format');
      }
      if (range.start_date && range.end_date && new Date(range.start_date) > new Date(range.end_date)) {
        throw new Error('Start date must be before end date');
      }
      return true;
    }),

  body('group_by')
    .optional()
    .isIn(['hour', 'day', 'week', 'month'])
    .withMessage('Group by must be one of: hour, day, week, month')
];

/**
 * Custom validation middleware
 */
function validateUpdateSchema(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Invalid input data',
      details: errors.array()
    });
  }
  next();
}

/**
 * Validate update content for moderation
 */
function validateContentModeration(content) {
  const moderationRules = {
    maxLength: 1000,
    minLength: 1,
    forbiddenWords: ['spam', 'scam', 'fake'], // Add more as needed
    maxLinks: 5,
    maxMentions: 10
  };

  const issues = [];

  // Check length
  if (content.length > moderationRules.maxLength) {
    issues.push('Content exceeds maximum length');
  }
  if (content.length < moderationRules.minLength) {
    issues.push('Content is too short');
  }

  // Check for forbidden words
  const lowerContent = content.toLowerCase();
  for (const word of moderationRules.forbiddenWords) {
    if (lowerContent.includes(word)) {
      issues.push(`Content contains forbidden word: ${word}`);
    }
  }

  // Check for excessive links
  const linkCount = (content.match(/https?:\/\/[^\s]+/g) || []).length;
  if (linkCount > moderationRules.maxLinks) {
    issues.push('Content contains too many links');
  }

  // Check for excessive mentions
  const mentionCount = (content.match(/@\w+/g) || []).length;
  if (mentionCount > moderationRules.maxMentions) {
    issues.push('Content contains too many mentions');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Validate media URLs
 */
function validateMediaUrls(urls) {
  if (!Array.isArray(urls)) {
    return { isValid: false, issues: ['Media URLs must be an array'] };
  }

  const issues = [];
  const maxUrls = 10;
  const maxFileSize = 50 * 1024 * 1024; // 50MB
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.mp4', '.mov', '.webm'];

  if (urls.length > maxUrls) {
    issues.push(`Maximum ${maxUrls} media URLs allowed`);
  }

  for (const url of urls) {
    if (typeof url !== 'string') {
      issues.push('All media URLs must be strings');
      continue;
    }

    if (!isValidUrl(url)) {
      issues.push(`Invalid URL format: ${url}`);
      continue;
    }

    // Check file extension
    const extension = url.toLowerCase().split('.').pop();
    if (!allowedExtensions.includes(`.${extension}`)) {
      issues.push(`Unsupported file type: ${extension}`);
    }
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}

/**
 * Utility functions
 */
function isValidUrl(string) {
  try {
    new URL(string);
    return true;
  } catch (_) {
    return false;
  }
}

function isValidObjectId(id) {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

module.exports = {
  validateUpdateSchema,
  validateUpdateEditSchema,
  validateReactionSchema,
  validateBulkOperationSchema,
  validateModerationSchema,
  validateAnalyticsSchema,
  validateContentModeration,
  validateMediaUrls
};
