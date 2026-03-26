import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { budgetAPI } from '../utils/api';
import './Analytics.css';

const Analytics = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await budgetAPI.getAnalytics();
      setAnalytics(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getChannelColor = (key) => {
    const colors = {
      paid_search: '#00d4aa',
      social_media: '#00b8d9',
      email: '#7c3aed',
      display: '#f59e0b',
      content_seo: '#ec4899'
    };
    return colors[key] || '#666';
  };

  if (loading) {
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
        </aside>
        <main className="dashboard-main">
          <div className="loading">Loading analytics...</div>
        </main>
      </div>
    );
  }

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
            { icon: '📤', label: 'Upload Data', path: '/upload-data' },
            { icon: '🤖', label: 'Train Model', path: '/train-model' },
            { icon: '🎯', label: 'Recommendations', path: '/recommendations' },
            { icon: '📊', label: 'Analytics', active: true },
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
            <h1>Marketing Analytics 📊</h1>
            <p>Detailed insights into your marketing performance</p>
          </div>
        </header>

        {error && <div className="error-message">{error}</div>}

        {analytics && (
          <div className="analytics-container">
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-label">Total Campaigns</span>
                <span className="metric-value">{analytics.total_campaigns || 0}</span>
                <span className="metric-change up">Active</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Data Records</span>
                <span className="metric-value">{analytics.total_budget_records || 0}</span>
                <span className="metric-change up">Uploaded</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Total Spend</span>
                <span className="metric-value">${(analytics.total_spend || 0).toLocaleString()}</span>
                <span className="metric-change up">Invested</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Total Revenue</span>
                <span className="metric-value">${(analytics.total_revenue || 0).toLocaleString()}</span>
                <span className="metric-change up">Generated</span>
              </div>
              <div className="metric-card">
                <span className="metric-label">Average ROI</span>
                <span className="metric-value">{analytics.avg_roi ? `${analytics.avg_roi.toFixed(1)}%` : '0%'}</span>
                <span className={`metric-change ${analytics.avg_roi > 100 ? 'up' : 'down'}`}>
                  {analytics.avg_roi > 100 ? '↑' : '↓'} Performance
                </span>
              </div>
            </div>

            {analytics.channel_performance && Object.keys(analytics.channel_performance).length > 0 && (
              <div className="card">
                <h2>Channel Performance</h2>
                <p className="card-subtitle">Performance metrics by marketing channel</p>
                <div className="channel-performance">
                  {Object.entries(analytics.channel_performance).map(([channel, data]) => (
                    <div key={channel} className="channel-performance-item">
                      <div className="channel-header">
                        <div className="channel-info">
                          <div
                            className="channel-dot"
                            style={{ background: getChannelColor(channel) }}
                          />
                          <span className="channel-name">
                            {channel.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </div>
                        <div className="channel-roi">
                          ROI: {data.roi ? `${data.roi.toFixed(1)}%` : 'N/A'}
                        </div>
                      </div>
                      <div className="channel-metrics">
                        <div className="metric">
                          <span className="metric-label">Spend</span>
                          <span className="metric-value">${(data.spend || 0).toLocaleString()}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Revenue</span>
                          <span className="metric-value">${(data.revenue || 0).toLocaleString()}</span>
                        </div>
                        <div className="metric">
                          <span className="metric-label">Conversions</span>
                          <span className="metric-value">{data.conversions || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card">
              <h2>Key Insights</h2>
              <div className="insights-list">
                <div className="insight-item">
                  <span className="insight-icon">💡</span>
                  <p>Your marketing campaigns have generated ${(analytics.total_revenue || 0).toLocaleString()} in revenue from ${(analytics.total_spend || 0).toLocaleString()} invested.</p>
                  <span className="insight-tag">Revenue</span>
                </div>
                <div className="insight-item">
                  <span className="insight-icon">📈</span>
                  <p>Average ROI of {analytics.avg_roi ? `${analytics.avg_roi.toFixed(1)}%` : '0%'} indicates {analytics.avg_roi > 100 ? 'profitable' : 'underperforming'} campaigns.</p>
                  <span className="insight-tag">ROI</span>
                </div>
                <div className="insight-item">
                  <span className="insight-icon">🎯</span>
                  <p>You have {analytics.total_campaigns || 0} active campaigns with {analytics.total_budget_records || 0} data points for analysis.</p>
                  <span className="insight-tag">Campaigns</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Analytics;