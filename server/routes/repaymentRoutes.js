const express = require('express');
const router = express.Router();
const repaymentController = require('../controllers/repaymentController');
const authMiddleware = require('../middleware/authMiddleware');

router.post('/pay', authMiddleware, repaymentController.submitRepayment);
router.get('/history', authMiddleware, repaymentController.getRepaymentHistory);

module.exports = router;