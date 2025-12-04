import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import '../styles/auth.css';

const Register = () => {
    const [formData, setFormData] = useState({ fullName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const { register } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await register(formData.fullName, formData.email, formData.password);
        
        if (result.success) {
            navigate('/login');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header-icon">📝</div>
                <h2 className="auth-title">Create your account</h2>
                <p className="auth-subtitle">Join to track loans, disbursements, and repayments</p>
                {error && <div className="auth-alert">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
                    <div className="auth-field">
                        <label>Full Name</label>
                        <input
                            className="auth-input"
                            type="text"
                            name="fullName"
                            placeholder="Jane Doe"
                            required
                            onChange={handleChange}
                        />
                    </div>
                    <div className="auth-field">
                        <label>Email</label>
                        <input
                            className="auth-input"
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            required
                            onChange={handleChange}
                        />
                    </div>
                    <div className="auth-field">
                        <label>Password</label>
                        <input
                            className="auth-input"
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            required
                            onChange={handleChange}
                        />
                    </div>
                    <div className="auth-actions">
                        <button type="submit" className="auth-button">Create Account</button>
                    </div>
                </form>
                <div className="auth-divider">or</div>
                <p className="auth-meta">
                    Already registered? <Link to="/login" className="auth-link">Sign in</Link>
                </p>
            </div>
        </div>
    );
};

export default Register;