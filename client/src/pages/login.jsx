import { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthContext from '../context/AuthContext';
import '../styles/auth.css';

const Login = () => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(formData.email, formData.password);
        
        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header-icon">🔐</div>
                <h2 className="auth-title">Welcome back</h2>
                <p className="auth-subtitle">Sign in to manage your loans and repayments</p>
                {error && <div className="auth-alert">{error}</div>}
                <form onSubmit={handleSubmit} className="auth-form">
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
                    <div className="auth-helper">
                        <label className="auth-checkbox"><input type="checkbox" /> Remember me</label>
                        <span className="auth-forgot"><a className="auth-link" href="#">Forgot password?</a></span>
                    </div>
                    <div className="auth-actions">
                        <button type="submit" className="auth-button">Sign In</button>
                    </div>
                </form>
                <div className="auth-divider">or</div>
                <p className="auth-meta">
                    New here? <Link to="/register" className="auth-link">Create an account</Link>
                </p>
            </div>
        </div>
    );
};

export default Login;