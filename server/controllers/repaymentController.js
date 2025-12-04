const db = require('../db');

exports.submitRepayment = async (req, res) => {
    try {
        const { loanId, amount } = req.body;
        const userId = req.user.id;

        const [loans] = await db.query('SELECT * FROM loans WHERE id = ? AND user_id = ?', [loanId, userId]);

        if (loans.length === 0) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        const loan = loans[0];

        if (loan.status !== 'approved') {
            return res.status(400).json({ message: 'Loan is not approved for repayment' });
        }

        if (amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        if (parseFloat(amount) > parseFloat(loan.remaining_balance)) {
            return res.status(400).json({ message: 'Amount exceeds remaining balance' });
        }

        const newBalance = parseFloat(loan.remaining_balance) - parseFloat(amount);
        const newStatus = newBalance <= 0 ? 'paid' : 'approved';

        await db.query('INSERT INTO repayments (loan_id, amount) VALUES (?, ?)', [loanId, amount]);
        await db.query('UPDATE loans SET remaining_balance = ?, status = ? WHERE id = ?', [newBalance, newStatus, loanId]);

        res.json({ message: 'Repayment successful', remainingBalance: newBalance });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getRepaymentHistory = async (req, res) => {
    try {
        const userId = req.user.id;
        const [rows] = await db.query(`
            SELECT r.id, r.amount, r.payment_date, l.amount as total_loan_amount 
            FROM repayments r 
            JOIN loans l ON r.loan_id = l.id 
            WHERE l.user_id = ? 
            ORDER BY r.payment_date DESC
        `, [userId]);

        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};