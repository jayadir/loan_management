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
        const { amount, term_weeks } = req.body;
        const userId = req.user.id;
        const documentPath = (req.files && req.files.document && req.files.document[0]) ? req.files.document[0].filename : null;

        if (!amount || !term_weeks) {
            return res.status(400).json({ message: 'Amount and term are required' });
        }

        const query = 'INSERT INTO loans (user_id, amount, term_weeks, status, remaining_balance, document_path) VALUES (?, ?, ?, ?, ?, ?)';
        const values = [userId, amount, term_weeks, 'pending', amount, documentPath];

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