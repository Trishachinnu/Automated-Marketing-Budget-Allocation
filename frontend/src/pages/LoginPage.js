import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const LoginPage = () => {
  const [form, setForm]             = useState({ identifier: '', password: '' });
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPwd]  = useState(false);

  const { login }    = useAuth();
  const navigate     = useNavigate();
  const location     = useLocation();
  const from         = location.state?.from?.pathname || '/dashboard';

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.identifier || !form.password) { setError('Please fill in all fields'); return; }
    setLoading(true);
    try {
      await login(form.identifier, form.password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="grid-lines" />
      </div>

      <div className="auth-container">
        <div className="auth-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4"  y="20" width="8" height="16" rx="2" fill="#00d4aa"/>
              <rect x="16" y="12" width="8" height="24" rx="2" fill="#00b8d9"/>
              <rect x="28" y="4"  width="8" height="32" rx="2" fill="#7c3aed"/>
            </svg>
          </div>
          <span className="brand-name">BudgetAI</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Welcome back</h1>
            <p>Sign in to your marketing intelligence platform</p>
          </div>

          {error && (
            <div className="auth-error">
              <svg viewBox="0 0 20 20" fill="currentColor" width="16" height="16">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"/>
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email or Username</label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                  <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                </svg>
                <input
                  name="identifier" type="text"
                  placeholder="you@company.com"
                  value={form.identifier} onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Password
                <a href="#forgot" className="forgot-link" onClick={e => e.preventDefault()}>Forgot password?</a>
              </label>
              <div className="input-wrapper">
                <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                </svg>
                <input
                  name="password" type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password} onChange={handleChange}
                />
                <button type="button" className="toggle-password" onClick={() => setShowPwd(p => !p)}>
                  {showPassword ? '👁' : '👁‍🗨'}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <><span className="btn-spinner" /> Signing in...</> : <>Sign In <span className="btn-arrow">→</span></>}
            </button>
          </form>

          <div className="auth-footer">
            <span>Don't have an account?</span>
            <Link to="/signup">Create account</Link>
          </div>
        </div>

        <div className="auth-stats">
          <div className="stat"><span className="stat-value">$2.4B+</span><span className="stat-label">Budget Optimized</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-value">340%</span><span className="stat-label">Avg. ROI Increase</span></div>
          <div className="stat-divider" />
          <div className="stat"><span className="stat-value">12K+</span><span className="stat-label">Campaigns Analyzed</span></div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;