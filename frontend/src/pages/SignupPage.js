import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

const SignupPage = () => {
  const [form, setForm] = useState({
    full_name: '', username: '', email: '', company: '', password: '', confirm_password: ''
  });
  const [errors, setErrors]         = useState({});
  const [loading, setLoading]       = useState(false);
  const [showPassword, setShowPwd]  = useState(false);
  const [step, setStep]             = useState(1);

  const { signup } = useAuth();
  const navigate   = useNavigate();

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setErrors(prev => ({ ...prev, [e.target.name]: '', general: '' }));
  };

  const validateStep1 = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = 'Full name is required';
    if (!form.username.trim()) errs.username = 'Username is required';
    else if (form.username.length < 3) errs.username = 'Min 3 characters';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email';
    return errs;
  };

  const validateStep2 = () => {
    const errs = {};
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Min 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Must include uppercase';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Must include a number';
    if (form.password !== form.confirm_password) errs.confirm_password = 'Passwords do not match';
    return errs;
  };

  const handleNextStep = () => {
    const errs = validateStep1();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validateStep2();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setLoading(true);
    try {
      await signup({ full_name: form.full_name, username: form.username,
                     email: form.email, company: form.company, password: form.password });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setErrors({ general: err.response?.data?.error || 'Signup failed.' });
    } finally {
      setLoading(false);
    }
  };

  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' };
    let s = 0;
    if (pwd.length >= 8)  s++;
    if (pwd.length >= 12) s++;
    if (/[A-Z]/.test(pwd)) s++;
    if (/[0-9]/.test(pwd)) s++;
    if (/[^A-Za-z0-9]/.test(pwd)) s++;
    const labels = ['','Weak','Fair','Good','Strong','Excellent'];
    const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#00d4aa'];
    return { score: s, label: labels[s], color: colors[s] };
  };
  const strength = getStrength(form.password);

  return (
    <div className="auth-root">
      <div className="auth-bg">
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="grid-lines" />
      </div>
      <div className="auth-container">
        <div className="auth-brand">
          <div className="brand-icon">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4" y="20" width="8" height="16" rx="2" fill="#00d4aa"/>
              <rect x="16" y="12" width="8" height="24" rx="2" fill="#00b8d9"/>
              <rect x="28" y="4" width="8" height="32" rx="2" fill="#7c3aed"/>
            </svg>
          </div>
          <span className="brand-name">BudgetAI</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-header">
            <h1>Get started free</h1>
            <p>AI-powered marketing budget allocation</p>
          </div>

          <div className="step-indicator">
            <div className={`step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
              {step > 1 ? '✓' : '1'}
            </div>
            <div className={`step-line ${step > 1 ? 'active' : ''}`} />
            <div className={`step-dot ${step >= 2 ? 'active' : ''}`}>2</div>
          </div>

          {errors.general && (
            <div className="auth-error">{errors.general}</div>
          )}

          {step === 1 && (
            <div className="auth-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"/>
                    </svg>
                    <input name="full_name" type="text" placeholder="John Smith"
                      value={form.full_name} onChange={handleChange}
                      className={errors.full_name ? 'error' : ''} />
                  </div>
                  {errors.full_name && <span className="field-error">{errors.full_name}</span>}
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <div className="input-wrapper">
                    <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z"/>
                    </svg>
                    <input name="username" type="text" placeholder="johnsmith"
                      value={form.username} onChange={handleChange}
                      className={errors.username ? 'error' : ''} />
                  </div>
                  {errors.username && <span className="field-error">{errors.username}</span>}
                </div>
              </div>

              <div className="form-group">
                <label>Work Email</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"/>
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z"/>
                  </svg>
                  <input name="email" type="email" placeholder="john@company.com"
                    value={form.email} onChange={handleChange}
                    className={errors.email ? 'error' : ''} />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="form-group">
                <label>Company <span className="optional">(optional)</span></label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-2a1 1 0 00-1-1H9a1 1 0 00-1 1v2a1 1 0 01-1 1H4a1 1 0 110-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z"/>
                  </svg>
                  <input name="company" type="text" placeholder="Acme Corp"
                    value={form.company} onChange={handleChange} />
                </div>
              </div>

              <button type="button" className="auth-btn" onClick={handleNextStep}>
                Continue <span className="btn-arrow">→</span>
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label>Create Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                  </svg>
                  <input name="password" type={showPassword ? 'text' : 'password'}
                    placeholder="Min 8 characters"
                    value={form.password} onChange={handleChange}
                    className={errors.password ? 'error' : ''} />
                  <button type="button" className="toggle-password" onClick={() => setShowPwd(p => !p)}>
                    {showPassword ? '👁' : '👁‍🗨'}
                  </button>
                </div>
                {form.password && (
                  <div className="password-strength">
                    <div className="strength-bars">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className="strength-bar"
                          style={{ background: i <= strength.score ? strength.color : 'rgba(255,255,255,0.1)' }} />
                      ))}
                    </div>
                    <span style={{ color: strength.color, fontSize: '12px' }}>{strength.label}</span>
                  </div>
                )}
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <div className="form-group">
                <label>Confirm Password</label>
                <div className="input-wrapper">
                  <svg className="input-icon" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"/>
                  </svg>
                  <input name="confirm_password" type={showPassword ? 'text' : 'password'}
                    placeholder="Repeat password"
                    value={form.confirm_password} onChange={handleChange}
                    className={errors.confirm_password ? 'error' : ''} />
                </div>
                {errors.confirm_password && <span className="field-error">{errors.confirm_password}</span>}
              </div>

              <div className="form-actions-row">
                <button type="button" className="auth-btn-secondary" onClick={() => setStep(1)}>← Back</button>
                <button type="submit" className="auth-btn" disabled={loading}>
                  {loading ? <><span className="btn-spinner" /> Creating...</> : <>Create Account <span className="btn-arrow">→</span></>}
                </button>
              </div>
            </form>
          )}

          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;