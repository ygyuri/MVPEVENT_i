const Joi = require('joi');

const createPollSchema = Joi.object({
  question: Joi.string().min(10).max(300).required().messages({
    'string.min': 'Question must be at least 10 characters',
    'string.max': 'Question cannot exceed 300 characters'
  }),
  description: Joi.string().max(1000).optional(),
  poll_type: Joi.string().valid('artist_selection', 'theme_selection', 'feature_selection', 'general').required(),
  options: Joi.array().min(2).max(10).items(
    Joi.object({
      id: Joi.string().optional(),
      label: Joi.string().min(1).max(200).required(),
      description: Joi.string().max(500).optional(),
      image_url: Joi.string().uri().optional(),
      artist_name: Joi.when('..poll_type', { is: 'artist_selection', then: Joi.string().required(), otherwise: Joi.string().optional() }),
      artist_genre: Joi.string().optional(),
      theme_color_hex: Joi.string().pattern(/^#[0-9A-F]{6}$/i).optional(),
      feature_cost: Joi.number().min(0).optional()
    })
  ).required(),
  allow_anonymous: Joi.boolean().default(false),
  max_votes: Joi.number().min(1).max(10).default(1),
  allow_vote_changes: Joi.boolean().default(true),
  closes_at: Joi.alternatives().try(
    Joi.date().greater('now'),
    Joi.string().pattern(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/).custom((value, helpers) => {
      const date = new Date(value);
      if (isNaN(date.getTime()) || date <= new Date()) {
        return helpers.error('date.greater');
      }
      return value;
    })
  ).required().messages({
    'date.greater': 'Poll must close in the future',
    'alternatives.match': 'Invalid date format'
  })
});

module.exports = { createPollSchema };






