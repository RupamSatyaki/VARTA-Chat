const express = require('express');
const router = express.Router();
const { createStatus, getAllStatuses, viewStatus } = require('../controllers/statusController');
const protect = require('../middleware/authMiddleware');

router.post('/', protect, createStatus);
router.get('/', protect, getAllStatuses);
router.post('/view/:statusId', protect, viewStatus);

module.exports = router;
