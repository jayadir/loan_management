const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const loanController = require('../controllers/loanController');
const authMiddleware = require('../middleware/authMiddleware');

// Multer storage for uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
const storage = multer.diskStorage({
	destination: uploadDir,
	filename: (req, file, cb) => {
		const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
		const ext = path.extname(file.originalname);
		cb(null, unique + ext);
	}
});
const upload = multer({ storage });

router.get('/all', authMiddleware, loanController.getAllLoans);
// Support multiple typed documents
router.post(
	'/apply',
	authMiddleware,
	upload.fields([
		{ name: 'kyc', maxCount: 1 },
		{ name: 'income_proof', maxCount: 1 },
		{ name: 'bank_statement', maxCount: 1 },
		{ name: 'disbursement_proof', maxCount: 1 },
		{ name: 'document', maxCount: 1 }, // backward compatibility
	]),
	loanController.applyForLoan
);
router.patch('/:id/status', authMiddleware, loanController.updateLoanStatus);

// Admin can update document review status (approve/reject)
router.patch('/:id/document/:docType/status', authMiddleware, loanController.updateDocumentStatus);

// List audit history for a loan
router.get('/:id/history', authMiddleware, loanController.getStatusHistory);

// Fetch repayment schedule for a loan
router.get('/:id/schedule', authMiddleware, loanController.getRepaymentSchedule);

module.exports = router;