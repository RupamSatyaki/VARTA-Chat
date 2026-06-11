const express = require('express');
const { fetchCalls, deleteCall } = require('../controllers/callController');
const protect = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/').get(protect, fetchCalls);
router.route('/:id').delete(protect, deleteCall);

module.exports = router;
