const express = require('express');
const router = express.Router();
const { getStatsByUsername } = require('../controllers/userController');

// @route   GET api/stats/:username
// @desc    Get user stats by username
// @access  Public
router.get('/:username', getStatsByUsername);

module.exports = router;
