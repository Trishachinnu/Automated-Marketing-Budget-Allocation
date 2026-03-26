import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { budgetAPI } from '../utils/api';
import './UploadData.css';

const UploadData = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setError('');
    } else {
      setError('Please select a valid CSV file');
      setFile(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Read CSV file
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      const headers = lines[0].split(',').map(h => h.trim());

      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const record = {};
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          // Try to parse numbers and dates
          if (!isNaN(value) && value !== '') {
            record[header] = parseFloat(value);
          } else if (value.match(/^\d{4}-\d{2}-\d{2}$/)) {
            record[header] = value; // Keep as string for date
          } else {
            record[header] = value;
          }
        });
        return record;
      });

      const response = await budgetAPI.uploadData({ data });
      setMessage(response.data.message);
      setFile(null);
      // Reset file input
      document.getElementById('file-input').value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const sampleData = [
    { date: '2023-01-01', channel: 'paid_search', spend: 5000, impressions: 100000, clicks: 2000, conversions: 50, revenue: 25000 },
    { date: '2023-01-01', channel: 'social_media', spend: 3000, impressions: 80000, clicks: 1600, conversions: 32, revenue: 16000 },
    { date: '2023-01-01', channel: 'email', spend: 1000, impressions: 50000, clicks: 2500, conversions: 75, revenue: 37500 },
  ];

  return (
    <div className="dashboard-root">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-sm">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4"  y="20" width="8" height="16" rx="2" fill="#00d4aa"/>
              <rect x="16" y="12" width="8" height="24" rx="2" fill="#00b8d9"/>
              <rect x="28" y="4"  width="8" height="32" rx="2" fill="#7c3aed"/>
            </svg>
          </div>
          <span>BudgetAI</span>
        </div>
        <nav className="sidebar-nav">
          {[
            { icon: '⬛', label: 'Dashboard', path: '/dashboard' },
            { icon: '📤', label: 'Upload Data', active: true },
            { icon: '🤖', label: 'Train Model', path: '/train-model' },
            { icon: '🎯', label: 'Recommendations', path: '/recommendations' },
            { icon: '📊', label: 'Analytics', path: '/analytics' },
            { icon: '📈', label: 'Campaigns', path: '/campaigns' },
          ].map(item => (
            <div
              key={item.label}
              className={`nav-item ${item.active ? 'active' : ''}`}
              onClick={() => item.path && navigate(item.path)}
              style={{ cursor: item.path ? 'pointer' : 'default' }}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
        <div className="sidebar-user">
          <div className="user-avatar">{user?.full_name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="user-info">
            <span className="user-name">{user?.full_name}</span>
            <span className="user-role">{user?.company || 'Marketing Team'}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"/>
            </svg>
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>Upload Budget Data 📤</h1>
            <p>Upload your historical marketing performance data to train the AI model</p>
          </div>
        </header>

        <div className="upload-container">
          <div className="card">
            <h2>CSV File Upload</h2>
            <p className="card-subtitle">Upload a CSV file with your marketing channel performance data</p>

            <div className="upload-section">
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="file-input"
              />
              <button
                className="btn-primary"
                onClick={handleUpload}
                disabled={!file || loading}
              >
                {loading ? 'Uploading...' : 'Upload Data'}
              </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {message && <div className="success-message">{message}</div>}
          </div>

          <div className="card">
            <h2>Expected Data Format</h2>
            <p className="card-subtitle">Your CSV should include these columns:</p>
            <div className="data-format">
              <div className="format-columns">
                <span className="required">date</span>
                <span className="required">channel</span>
                <span className="required">spend</span>
                <span>impressions</span>
                <span>clicks</span>
                <span>conversions</span>
                <span>revenue</span>
              </div>
              <div className="sample-data">
                <h4>Sample Data:</h4>
                <pre>{JSON.stringify(sampleData, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UploadData;