const db = require('../db');

exports.getAllLoans = async (req, res) => {
    try {
        const { role, id } = req.user;

        if (role === 'admin') {
            const [rows] = await db.query(`
                SELECT 
                    loans.id, 
                    loans.amount, 
                    loans.term_weeks, 
                    loans.status, 
                    loans.remaining_balance, 
                    loans.document_path,
                    loans.created_at, 
                    users.full_name, 
                    users.email 
                FROM loans 
                JOIN users ON loans.user_id = users.id 
                ORDER BY loans.created_at DESC
            `);
            // Fetch documents per loan
            const loanIds = rows.map(r => r.id);
            let documentsByLoan = {};
            if (loanIds.length) {
                const [docs] = await db.query(
                    'SELECT loan_id, doc_type, file_path, status FROM loan_documents WHERE loan_id IN (?)',
                    [loanIds]
                );
                documentsByLoan = docs.reduce((acc, d) => {
                    acc[d.loan_id] = acc[d.loan_id] || [];
                    acc[d.loan_id].push(d);
                    return acc;
                }, {});
            }
            const result = rows.map(r => ({ ...r, documents: documentsByLoan[r.id] || [] }));
            return res.json(result);
        } else {
            const [rows] = await db.query('SELECT id, amount, term_weeks, status, remaining_balance, document_path, created_at FROM loans WHERE user_id = ? ORDER BY created_at DESC', [id]);
            const loanIds = rows.map(r => r.id);
            let documentsByLoan = {};
            if (loanIds.length) {
                const [docs] = await db.query(
                    'SELECT loan_id, doc_type, file_path, status FROM loan_documents WHERE loan_id IN (?)',
                    [loanIds]
                );
                documentsByLoan = docs.reduce((acc, d) => {
                    acc[d.loan_id] = acc[d.loan_id] || [];
                    acc[d.loan_id].push(d);
                    return acc;
                }, {});
            }
            const result = rows.map(r => ({ ...r, documents: documentsByLoan[r.id] || [] }));
            return res.json(result);
        }
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

 exports.applyForLoan = async (req, res) => {
    try {
        const { amount, term_weeks, interest_rate } = req.body;
        const userId = req.user.id;
        const documentPath = (req.files && req.files.document && req.files.document[0]) ? req.files.document[0].filename : null;

        if (!amount || !term_weeks) {
            return res.status(400).json({ message: 'Amount and term are required' });
        }

        const query = 'INSERT INTO loans (user_id, amount, term_weeks, interest_rate, status, remaining_balance, document_path) VALUES (?, ?, ?, ?, ?, ?, ?)';
        const values = [userId, amount, term_weeks, interest_rate || 5.0, 'pending', amount, documentPath];

        const [result] = await db.query(query, values);
        const loanId = result.insertId;

        // Save typed documents if provided
        const mapField = (name) => (req.files && req.files[name] && req.files[name][0]) ? req.files[name][0].filename : null;
        const typedDocs = [
            { type: 'kyc', path: mapField('kyc') },
            { type: 'income_proof', path: mapField('income_proof') },
            { type: 'bank_statement', path: mapField('bank_statement') },
            { type: 'disbursement_proof', path: mapField('disbursement_proof') },
        ].filter(d => !!d.path);

        for (const d of typedDocs) {
            await db.query(
                `INSERT INTO loan_documents (loan_id, doc_type, file_path, status)
                 VALUES (?, ?, ?, ?)
                 ON DUPLICATE KEY UPDATE file_path = VALUES(file_path), status = VALUES(status)`,
                [loanId, d.type, d.path, 'uploaded']
            );
        }

        res.status(201).json({ message: 'Loan application submitted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateLoanStatus = async (req, res) => {
    try {
        const { role } = req.user;
        const { id } = req.params;
        const { status } = req.body;

        if (role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }

        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid status update' });
        }

        // Fetch current status
        const [rows] = await db.query('SELECT status FROM loans WHERE id = ?', [id]);
        const oldStatus = rows[0]?.status || null;
        await db.query('UPDATE loans SET status = ? WHERE id = ?', [status, id]);
        await db.query(
            'INSERT INTO loan_status_history (loan_id, old_status, new_status, changed_by, note) VALUES (?, ?, ?, ?, ?)',
            [id, oldStatus, status, req.user.id, null]
        );

        // On approval, generate repayment schedule using stored interest_rate
        if (status === 'approved') {
            const [loanRows] = await db.query('SELECT amount, term_weeks, interest_rate FROM loans WHERE id = ?', [id]);
            if (loanRows.length) {
                const amount = Number(loanRows[0].amount);
                const months = Math.max(1, Math.round(Number(loanRows[0].term_weeks) / 4.345));
                const annualRatePct = Number(loanRows[0].interest_rate) || 12;
                const r = annualRatePct / 12 / 100;
                const n = months;
                const emi = r === 0 ? amount / n : (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
                let remaining = amount;
                let due = new Date();
                for (let i = 1; i <= n; i++) {
                    const interest = remaining * r;
                    const principal = emi - interest;
                    remaining = Math.max(0, remaining - principal);
                    due.setMonth(due.getMonth() + 1);
                    const yyyy = due.getFullYear();
                    const mm = String(due.getMonth() + 1).padStart(2, '0');
                    const dd = String(due.getDate()).padStart(2, '0');
                    const dueDate = `${yyyy}-${mm}-${dd}`;
                    await db.query(
                        'INSERT INTO repayment_schedule (loan_id, installment_no, due_date, emi, principal, interest, remaining, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)\n                         ON DUPLICATE KEY UPDATE due_date = VALUES(due_date), emi = VALUES(emi), principal = VALUES(principal), interest = VALUES(interest), remaining = VALUES(remaining)',
                        [id, i, dueDate, emi.toFixed(2), principal.toFixed(2), interest.toFixed(2), remaining.toFixed(2), 'upcoming']
                    );
                }
            }
        }

        res.json({ message: `Loan ${status} successfully` });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateDocumentStatus = async (req, res) => {
    try {
        const { role } = req.user;
        if (role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        const { id, docType } = req.params;
        const { status } = req.body; // 'approved' | 'rejected'
        if (!['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ message: 'Invalid document status' });
        }
        const [exists] = await db.query('SELECT id FROM loan_documents WHERE loan_id = ? AND doc_type = ?', [id, docType]);
        if (!exists.length) {
            return res.status(404).json({ message: 'Document not found for loan' });
        }
        await db.query('UPDATE loan_documents SET status = ? WHERE loan_id = ? AND doc_type = ?', [status, id, docType]);
        res.json({ message: 'Document status updated' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getStatusHistory = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db.query(
            `SELECT lsh.id, lsh.old_status, lsh.new_status, lsh.note, lsh.changed_at, u.full_name AS changed_by_name
             FROM loan_status_history lsh
             LEFT JOIN users u ON u.id = lsh.changed_by
             WHERE lsh.loan_id = ?
             ORDER BY lsh.changed_at DESC`,
            [id]
        );
        res.json(rows);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

    exports.getRepaymentSchedule = async (req, res) => {
        try {
            const { id } = req.params;
            const [rows] = await db.query(
                `SELECT id, loan_id, installment_no AS installment_number, due_date, principal AS principal_component, interest AS interest_component, emi AS emi_amount, remaining AS remaining_balance, status
                 FROM repayment_schedule
                 WHERE loan_id = ?
                 ORDER BY installment_no ASC`,
                [id]
            );
            res.json(rows);
        } catch (error) {
            res.status(500).json({ message: 'Server error' });
        }
    };