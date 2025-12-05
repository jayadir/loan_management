import { useState, useEffect, useContext } from 'react';
import AuthContext from '../context/AuthContext';
import api from '../utils/api';
import '../styles/dashboard.css';
import { toMonthlyCount, generateEmiSchedule } from '../utils/emi';

const Dashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const [loans, setLoans] = useState([]);
    const [amount, setAmount] = useState('');
    const [term, setTerm] = useState('');
    const [error, setError] = useState('');
    const [msg, setMsg] = useState('');
    const [docFile, setDocFile] = useState(null);
        const [openHistoryLoanId, setOpenHistoryLoanId] = useState(null);
        const [historyMap, setHistoryMap] = useState({});

        const fetchHistory = async (loanId) => {
            if (historyMap[loanId]) return; // cached
            try {
                const { data } = await api.get(`/loans/${loanId}/history`);
                setHistoryMap((prev) => ({ ...prev, [loanId]: data }));
            } catch (err) {
                setHistoryMap((prev) => ({ ...prev, [loanId]: [] }));
            }
        };

        const toggleHistory = async (loanId) => {
            const next = openHistoryLoanId === loanId ? null : loanId;
            setOpenHistoryLoanId(next);
            if (next) await fetchHistory(loanId);
        };
    const [kycFile, setKycFile] = useState(null);
    const [incomeFile, setIncomeFile] = useState(null);
    const [bankStmtFile, setBankStmtFile] = useState(null);
    const [disbFile, setDisbFile] = useState(null);
    const [annualRatePct, setAnnualRatePct] = useState('12');
    const [emiPreview, setEmiPreview] = useState(null);

    useEffect(() => {
        fetchLoans();
    }, []);

    const fetchLoans = async () => {
        try {
            const { data } = await api.get('/loans/all');
            setLoans(data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('term_weeks', term);
            formData.append('interest_rate', annualRatePct);
            if (docFile) formData.append('document', docFile);
            if (kycFile) formData.append('kyc', kycFile);
            if (incomeFile) formData.append('income_proof', incomeFile);
            if (bankStmtFile) formData.append('bank_statement', bankStmtFile);
            if (disbFile) formData.append('disbursement_proof', disbFile);

            await api.post('/loans/apply', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setMsg('Loan applied successfully');
            setAmount('');
            setTerm('');
            setDocFile(null);
            setKycFile(null);
            setIncomeFile(null);
            setBankStmtFile(null);
            setDisbFile(null);
            fetchLoans();
        } catch (err) {
            setError('Failed to apply');
        }
    };

    const handleStatusUpdate = async (id, status) => {
        try {
            await api.patch(`/loans/${id}/status`, { status });
            fetchLoans();
        } catch (err) {
            alert('Action failed');
        }
    };

    const handleRepay = async (id, currentBalance) => {
        const payAmount = prompt(`Enter amount to repay (Max: ${currentBalance}):`);
        if (!payAmount) return;

        try {
            await api.post('/repayments/pay', { loanId: id, amount: payAmount });
            alert('Repayment successful');
            fetchLoans();
        } catch (err) {
            alert(err.response?.data?.message || 'Repayment failed');
        }
    };

    if (!user) return null;

    return (
        <div className="dash-page">
            <div className="dash-container">
                <div className="dash-header">
                    <div>
                        <h1 className="dash-title">Dashboard</h1>
                        <p className="dash-sub">Welcome, {user.name} ({user.role})</p>
                    </div>
                    <button onClick={logout} className="dash-logout">Logout</button>
                </div>

                {user.role === 'customer' && (
                    <div className="dash-card">
                        <h2>Apply for a Loan</h2>
                        {msg && <div className="dash-msg">{msg}</div>}
                        {error && <div className="dash-err">{error}</div>}
                        <form onSubmit={handleApply} className="dash-inline">
                            <div>
                                <label className="dash-label">Amount </label>
                                <input
                                    className="dash-input"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="dash-label">Term (Weeks)</label>
                                <input
                                    className="dash-input"
                                    type="number"
                                    value={term}
                                    onChange={(e) => setTerm(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="dash-label">Interest Rate (% annual)</label>
                                <input
                                    className="dash-input"
                                    type="number"
                                    value={annualRatePct}
                                    onChange={(e) => setAnnualRatePct(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="dash-label">Supporting Document</label>
                                <input
                                    className="dash-input"
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                                />
                            </div>
                            <div>
                                <label className="dash-label">KYC</label>
                                <input className="dash-input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setKycFile(e.target.files?.[0] || null)} />
                            </div>
                            <div>
                                <label className="dash-label">Income Proof</label>
                                <input className="dash-input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setIncomeFile(e.target.files?.[0] || null)} />
                            </div>
                            <div>
                                <label className="dash-label">Bank Statement</label>
                                <input className="dash-input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setBankStmtFile(e.target.files?.[0] || null)} />
                            </div>
                            <div>
                                <label className="dash-label">Disbursement Proof</label>
                                <input className="dash-input" type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => setDisbFile(e.target.files?.[0] || null)} />
                            </div>
                            <button type="submit" className="dash-button">Apply</button>
                        </form>
                                                <div style={{ marginTop: 12 }}>
                                                        <button
                                                            className="dash-small-btn"
                                                            onClick={() => {
                                                                const months = toMonthlyCount(Number(term || 0));
                                                                const startDate = new Date();
                                                                const plan = generateEmiSchedule({ amount: Number(amount || 0), annualRatePct: Number(annualRatePct || 0), months, startDate });
                                                                setEmiPreview(plan);
                                                            }}
                                                            disabled={!amount || !term}
                                                        >
                                                            Preview EMI Plan
                                                        </button>
                                                        {emiPreview && (
                                                            <div className="dash-card" style={{ marginTop: 8 }}>
                                                                <h3 style={{ marginTop: 0 }}>EMI Preview</h3>
                                                                <div className="dash-inline">
                                                                    <div>
                                                                        <span className="dash-label">EMI</span>
                                                                        <div>₹{emiPreview.emi}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="dash-label">Total Interest</span>
                                                                        <div>₹{emiPreview.totalInterest}</div>
                                                                    </div>
                                                                    <div>
                                                                        <span className="dash-label">Months</span>
                                                                        <div>{toMonthlyCount(Number(term || 0))}</div>
                                                                    </div>
                                                                </div>
                                                                <table className="dash-table" style={{ marginTop: 8 }}>
                                                                    <thead className="dash-thead">
                                                                        <tr>
                                                                            <th>#</th>
                                                                            <th>Due Date</th>
                                                                            <th>EMI</th>
                                                                            <th>Principal</th>
                                                                            <th>Interest</th>
                                                                            <th>Remaining</th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {emiPreview.schedule.slice(0, 6).map(row => (
                                                                            <tr className="dash-row" key={row.installment}>
                                                                                <td>{row.installment}</td>
                                                                                <td>{new Date(row.dueDate).toLocaleDateString()}</td>
                                                                                <td>₹{row.emi}</td>
                                                                                <td>₹{row.principal}</td>
                                                                                <td>₹{row.interest}</td>
                                                                                <td>₹{row.remaining}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                                <div className="dash-empty">Showing first 6 installments</div>
                                                            </div>
                                                        )}
                                                </div>
                    </div>
                )}

                <div className="dash-card">
                    <h2>{user.role === 'admin' ? 'All Applications' : 'My Loans'}</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table className="dash-table">
                            <thead className="dash-thead">
                                <tr>
                                    <th>ID</th>
                                    <th>Amount</th>
                                    <th>Balance</th>
                                    <th>Status</th>
                                    {user.role === 'admin' && <th>User</th>}
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loans.map((loan) => (
                                    <>
                                    <tr className="dash-row" key={loan.id}>
                                        <td>#{loan.id}</td>
                                        <td>₹{loan.amount}</td>
                                        <td>₹{loan.remaining_balance}</td>
                                        <td>
                                            <span className={`dash-badge ${
                                                loan.status === 'approved' ? 'badge-approved' :
                                                loan.status === 'rejected' ? 'badge-rejected' :
                                                loan.status === 'paid' ? 'badge-paid' :
                                                'badge-pending'
                                            }`}>
                                                {loan.status}
                                            </span>
                                        </td>
                                        {user.role === 'admin' && (
                                            <td>
                                                {loan.full_name}<br />{loan.email}
                                            </td>
                                        )}
                                        {user.role === 'admin' && (
                                            <td>
                                                <div style={{ display:'grid', gap:6 }}>
                                                    {loan.document_path && (
                                                        <div>Primary: <a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/${loan.document_path}`} target="_blank" rel="noreferrer">View</a></div>
                                                    )}
                                                    {(loan.documents || []).map(doc => (
                                                        <div key={`${loan.id}-${doc.doc_type}`}>
                                                            {doc.doc_type.replace('_',' ')}: 
                                                            <a href={`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'}/uploads/${doc.file_path}`} target="_blank" rel="noreferrer">View</a>
                                                            <span style={{ marginLeft:8, fontSize:12, color:'#6b7a99' }}>({doc.status})</span>
                                                        </div>
                                                    ))}
                                                    {(!loan.document_path && (!loan.documents || loan.documents.length===0)) && (
                                                        <span style={{ color: '#6b7a99' }}>No documents</span>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            {user.role === 'admin' && loan.status === 'pending' && (
                                                <div style={{ display: 'flex', gap: 10 }}>
                                                    <button onClick={() => handleStatusUpdate(loan.id, 'approved')} className="dash-action-text">Approve</button>
                                                    <button onClick={() => handleStatusUpdate(loan.id, 'rejected')} className="dash-action-text reject">Reject</button>
                                                </div>
                                            )}
                                            {user.role === 'customer' && loan.status === 'approved' && parseFloat(loan.remaining_balance) > 0 && (
                                                <button onClick={() => handleRepay(loan.id, loan.remaining_balance)} className="dash-small-btn">Repay</button>
                                            )}
                                            <button onClick={() => toggleHistory(loan.id)} className="dash-small-btn" style={{ marginLeft: 8 }}>
                                                {openHistoryLoanId === loan.id ? 'Hide History' : 'View History'}
                                            </button>
                                        </td>
                                    </tr>
                                    {openHistoryLoanId === loan.id ? (
                                        <tr key={`hist-${loan.id}`}>
                                            <td colSpan={user.role === 'admin' ? 6 : 5}>
                                                <div className="dash-card" style={{ marginTop: 8 }}>
                                                    <h3 style={{ marginTop: 0 }}>Status History</h3>
                                                    {historyMap[loan.id] && historyMap[loan.id].length > 0 ? (
                                                        <table className="dash-table">
                                                            <thead className="dash-thead">
                                                                <tr>
                                                                    <th>Changed At</th>
                                                                    <th>From</th>
                                                                    <th>To</th>
                                                                    <th>By</th>
                                                                    <th>Note</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {historyMap[loan.id].map((h) => (
                                                                    <tr className="dash-row" key={h.id}>
                                                                        <td>{new Date(h.changed_at).toLocaleString()}</td>
                                                                        <td>{h.old_status || '-'}</td>
                                                                        <td>{h.new_status}</td>
                                                                        <td>{h.changed_by_name || '—'}</td>
                                                                        <td>{h.note || '—'}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="dash-empty">No history yet</div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : null}
                                    </>
                                ))}
                            </tbody>
                        </table>
                        {loans.length === 0 && <div className="dash-empty">No records found</div>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;