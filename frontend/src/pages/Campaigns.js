import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { budgetAPI } from '../utils/api';
import './Campaigns.css';

// ── Constants ─────────────────────────────────────────────────────────────────
const STRATEGIES = [
  { id: 'max_roi',   label: 'Max ROI',   icon: '💰', description: 'Maximize return on every rupee' },
  { id: 'balanced',  label: 'Balanced',  icon: '⚖️', description: 'Even distribution across channels' },
  { id: 'growth',    label: 'Growth',    icon: '🚀', description: 'Scale aggressively for market share' },
  { id: 'awareness', label: 'Awareness', icon: '📣', description: 'Boost brand visibility and reach' },
];

const CAMPAIGN_OBJECTIVES = [
  { value: '',           label: '— Select objective —' },
  { value: 'awareness',  label: '📣 Brand Awareness' },
  { value: 'conversion', label: '💰 Conversions / Sales' },
  { value: 'traffic',    label: '🚀 Website Traffic' },
  { value: 'retention',  label: '🔁 Retention / Loyalty' },
  { value: 'engagement', label: '⚡ Engagement' },
];

const AUDIENCE_OPTIONS = [
  { value: '',           label: '— Select audience —' },
  { value: 'b2b',        label: '🏢 B2B (Business to Business)' },
  { value: 'b2c',        label: '🛍 B2C (Business to Consumer)' },
  { value: 'youth',      label: '🎮 Youth (Under 25)' },
  { value: 'gen z',      label: '⚡ Gen Z (Under 24)' },
  { value: 'millennial', label: '💼 Millennials (25–40)' },
  { value: 'men',        label: '👨 Men' },
  { value: 'women',      label: '👩 Women' },
  { value: 'senior',     label: '👴 Senior (50+)' },
  { value: 'enterprise', label: '🏛 Enterprise' },
  { value: 'startup',    label: '🚀 Startups' },
  { value: 'india',      label: '🇮🇳 India (Domestic)' },
  { value: 'global',     label: '🌍 Global' },
];

const STATUS_COLORS = {
  active:    '#00d4aa',
  paused:    '#f59e0b',
  completed: '#7c3aed',
  draft:     '#6b7280',
};

const emptyForm = {
  company_name: '', name: '', product_service: '',
  target_audience: '', campaign_objective: '',
  budget: '', strategy: '', start_date: '', end_date: '', status: 'active',
};

// ── Campaign Card ─────────────────────────────────────────────────────────────
function CampaignCard({ campaign, onViewRec, onEdit, onDelete, onStatusChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const statusColor  = STATUS_COLORS[campaign.status] || STATUS_COLORS.draft;
  const stratMeta    = STRATEGIES.find(s => s.id === campaign.strategy);
  const audienceLabel    = AUDIENCE_OPTIONS.find(a => a.value === campaign.target_audience)?.label || campaign.target_audience;
  const objectiveLabel   = CAMPAIGN_OBJECTIVES.find(o => o.value === campaign.campaign_objective)?.label || campaign.campaign_objective;

  const daysLeft = campaign.end_date
    ? Math.max(0, Math.ceil((new Date(campaign.end_date) - new Date()) / 86400000))
    : null;

  const progress = campaign.start_date && campaign.end_date
    ? Math.min(100, Math.max(0, Math.round(
        (new Date() - new Date(campaign.start_date)) /
        (new Date(campaign.end_date) - new Date(campaign.start_date)) * 100
      )))
    : null;

  return (
    <div className="campaign-card">

      {/* Header */}
      <div className="campaign-header">
        <div className="campaign-title-wrap">
          <h3>{campaign.name}</h3>
          {campaign.company_name && (
            <span className="campaign-company">🏢 {campaign.company_name}</span>
          )}
        </div>
        <div className="campaign-header-right">
          <span className="status-badge"
            style={{ background: statusColor + '20', color: statusColor, border: `1px solid ${statusColor}55` }}>
            {campaign.status}
          </span>
          <div className="card-menu-wrap">
            <button className="card-menu-btn" onClick={() => setMenuOpen(o => !o)}>⋮</button>
            {menuOpen && (
              <div className="card-menu" onClick={() => setMenuOpen(false)}>
                <button onClick={() => onEdit(campaign)}>✏️ Edit</button>
                {campaign.status !== 'active'    && <button onClick={() => onStatusChange(campaign.id, 'active')}>▶ Mark Active</button>}
                {campaign.status !== 'paused'    && <button onClick={() => onStatusChange(campaign.id, 'paused')}>⏸ Mark Paused</button>}
                {campaign.status !== 'completed' && <button onClick={() => onStatusChange(campaign.id, 'completed')}>✓ Mark Completed</button>}
                <div className="card-menu-divider" />
                <button className="menu-delete" onClick={() => onDelete(campaign.id)}>🗑 Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tags */}
      {(campaign.product_service || campaign.target_audience || campaign.campaign_objective) && (
        <div className="campaign-tags">
          {campaign.product_service    && <span className="camp-tag tag-product">🛍 {campaign.product_service}</span>}
          {campaign.target_audience    && <span className="camp-tag tag-audience">{audienceLabel?.replace(/^[^\s]+ /, '') || campaign.target_audience}</span>}
          {campaign.campaign_objective && <span className="camp-tag tag-objective">{objectiveLabel}</span>}
        </div>
      )}

      {/* Details */}
      <div className="campaign-details">
        <div className="detail-item">
          <span className="detail-label">Budget</span>
          <span className="detail-value">₹{Number(campaign.budget).toLocaleString('en-IN')}</span>
        </div>
        {stratMeta && (
          <div className="detail-item">
            <span className="detail-label">Strategy</span>
            <span className="detail-value strategy-pill">{stratMeta.icon} {stratMeta.label}</span>
          </div>
        )}
        {campaign.start_date && (
          <div className="detail-item">
            <span className="detail-label">Start</span>
            <span className="detail-value">{new Date(campaign.start_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        )}
        {campaign.end_date && (
          <div className="detail-item">
            <span className="detail-label">End</span>
            <span className="detail-value">{new Date(campaign.end_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>
        )}
        {daysLeft !== null && (
          <div className="detail-item">
            <span className="detail-label">Days Left</span>
            <span className="detail-value" style={{ color: daysLeft < 7 ? '#f59e0b' : '#00d4aa' }}>{daysLeft} days</span>
          </div>
        )}
      </div>

      {/* Progress */}
      {progress !== null && (
        <div className="camp-progress-wrap">
          <div className="camp-progress-track">
            <div className="camp-progress-fill" style={{ width: `${progress}%`, background: statusColor }} />
          </div>
          <span className="camp-progress-label">{progress}% elapsed</span>
        </div>
      )}

      {/* Action buttons */}
      <div className="campaign-actions">
        <button className="btn-edit"   onClick={() => onEdit(campaign)}>✏️ Edit</button>
        <button className="btn-delete" onClick={() => onDelete(campaign.id)}>🗑 Delete</button>
        <button className="btn-view-rec" onClick={() => onViewRec(campaign)}>
          View AI Recommendations →
        </button>
      </div>

    </div>
  );
}

// ── Edit Modal ────────────────────────────────────────────────────────────────
function EditModal({ campaign, onSave, onClose }) {
  const [form, setForm] = useState({
    company_name:       campaign.company_name       || '',
    name:               campaign.name               || '',
    product_service:    campaign.product_service    || '',
    target_audience:    campaign.target_audience    || '',
    campaign_objective: campaign.campaign_objective || '',
    budget:             campaign.budget             || '',
    strategy:           campaign.strategy           || '',
    start_date:         campaign.start_date ? campaign.start_date.split('T')[0] : '',
    end_date:           campaign.end_date   ? campaign.end_date.split('T')[0]   : '',
    status:             campaign.status             || 'active',
  });
  const f = (key, val) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit Campaign</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" value={form.company_name} onChange={e => f('company_name', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Campaign Name</label>
              <input type="text" value={form.name} onChange={e => f('name', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Product / Service</label>
              <input type="text" value={form.product_service} onChange={e => f('product_service', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Budget (₹)</label>
              <input type="number" value={form.budget} onChange={e => f('budget', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Target Audience</label>
              <select className="camp-select" value={form.target_audience} onChange={e => f('target_audience', e.target.value)}>
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Campaign Objective</label>
              <select className="camp-select" value={form.campaign_objective} onChange={e => f('campaign_objective', e.target.value)}>
                {CAMPAIGN_OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Strategy</label>
            <div className="strategy-grid">
              {STRATEGIES.map(s => (
                <label key={s.id} className={`strategy-card ${form.strategy === s.id ? 'selected' : ''}`}>
                  <input type="radio" name="edit-strategy" value={s.id}
                    checked={form.strategy === s.id} onChange={() => f('strategy', s.id)} />
                  <span className="strategy-icon">{s.icon}</span>
                  <span className="strategy-label">{s.label}</span>
                  <span className="strategy-desc">{s.description}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={form.start_date} onChange={e => f('start_date', e.target.value)} />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={form.end_date} onChange={e => f('end_date', e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select className="camp-select" value={form.status} onChange={e => f('status', e.target.value)}>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-optimize"
            onClick={() => onSave({ ...campaign, ...form, budget: Number(form.budget) })}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function SidebarContent({ user, navigate, onLogout }) {
  return (
    <>
      <div className="sidebar-brand">
        <div className="brand-icon-sm">
          <svg viewBox="0 0 40 40" fill="none">
            <rect x="4"  y="20" width="8"  height="16" rx="2" fill="#00d4aa" />
            <rect x="16" y="12" width="8"  height="24" rx="2" fill="#00b8d9" />
            <rect x="28" y="4"  width="8"  height="32" rx="2" fill="#7c3aed" />
          </svg>
        </div>
        <span>BudgetAI</span>
      </div>
      <nav className="sidebar-nav">
        {[
          { icon: '⬛', label: 'Dashboard',       path: '/dashboard' },
          { icon: '📈', label: 'Campaigns',       active: true },
          { icon: '🎯', label: 'Recommendations', path: '/recommendations' },
        ].map(item => (
          <div key={item.label}
            className={`nav-item ${item.active ? 'active' : ''}`}
            onClick={() => item.path && navigate(item.path)}
            style={{ cursor: item.path ? 'pointer' : 'default' }}>
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
        <button className="logout-btn" onClick={onLogout} title="Sign out">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" />
          </svg>
        </button>
      </div>
    </>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
const Campaigns = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [campaigns,      setCampaigns]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [submitting,     setSubmitting]     = useState(false);
  const [error,          setError]          = useState('');
  const [success,        setSuccess]        = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData,       setFormData]       = useState(emptyForm);
  const [editCampaign,   setEditCampaign]   = useState(null);
  const [filterStatus,   setFilterStatus]   = useState('all');
  const [searchQuery,    setSearchQuery]    = useState('');

  useEffect(() => { fetchCampaigns(); }, []);

  const fetchCampaigns = async () => {
    try {
      const res = await budgetAPI.getCampaigns();
      setCampaigns(res.data.campaigns || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    const { company_name, name, product_service, budget, strategy } = formData;
    if (!company_name || !name || !product_service || !budget || !strategy) {
      setError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    try {
      await budgetAPI.saveCampaign({ ...formData, budget: Number(formData.budget) });
      setSuccess(`"${name}" created! Redirecting to recommendations…`);
      setFormData(emptyForm);
      setShowCreateForm(false);
      fetchCampaigns();
      setTimeout(() => navigate('/recommendations', {
        state: {
          from_campaign:      true,
          campaign_name:      name,
          company_name:       formData.company_name,
          product_service:    formData.product_service,
          target_audience:    formData.target_audience,
          campaign_objective: formData.campaign_objective,
          budget:             Number(formData.budget),
          strategy:           formData.strategy,
        },
      }), 1400);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit   = (updated) => { setCampaigns(c => c.map(x => x.id === updated.id ? { ...x, ...updated } : x)); setEditCampaign(null); setSuccess('Campaign updated.'); };
  const handleDelete = (id) => { if (!window.confirm('Delete this campaign?')) return; setCampaigns(c => c.filter(x => x.id !== id)); setSuccess('Campaign deleted.'); };
  const handleStatusChange = (id, status) => setCampaigns(c => c.map(x => x.id === id ? { ...x, status } : x));
  const handleViewRec = (campaign) => navigate('/recommendations', { state: { from_campaign: true, campaign_name: campaign.name, company_name: campaign.company_name, product_service: campaign.product_service, target_audience: campaign.target_audience || '', campaign_objective: campaign.campaign_objective || '', budget: campaign.budget, strategy: campaign.strategy } });
  const handleLogout = async () => { await logout(); navigate('/login'); };
  const field = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  const totalBudget     = campaigns.reduce((s, c) => s + Number(c.budget || 0), 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'active').length;

  const filtered = campaigns.filter(c => {
    const matchStatus = filterStatus === 'all' || c.status === filterStatus;
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || c.name?.toLowerCase().includes(q) || c.company_name?.toLowerCase().includes(q) || c.product_service?.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  if (loading) {
    return (
      <div className="dashboard-root">
        <aside className="sidebar"><SidebarContent user={user} navigate={navigate} onLogout={handleLogout} /></aside>
        <main className="dashboard-main"><div className="loading">Loading campaigns…</div></main>
      </div>
    );
  }

  return (
    <div className="dashboard-root">
      <aside className="sidebar"><SidebarContent user={user} navigate={navigate} onLogout={handleLogout} /></aside>

      <main className="dashboard-main">

        <header className="dashboard-header">
          <div>
            <h1>Campaign Management 📈</h1>
            <p>Create and manage your marketing campaigns</p>
          </div>
          <button className="btn-primary"
            onClick={() => { setShowCreateForm(o => !o); setError(''); setSuccess(''); }}>
            {showCreateForm ? '✕ Close' : '+ New Campaign'}
          </button>
        </header>

        {error   && <div className="alert alert-error">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        {/* Summary Stats */}
        {campaigns.length > 0 && (
          <div className="summary-stats">
            <div className="summary-stat-card"><span className="ss-icon">📈</span><span className="ss-val">{campaigns.length}</span><span className="ss-label">Total</span></div>
            <div className="summary-stat-card"><span className="ss-icon" style={{color:'#00d4aa'}}>⚡</span><span className="ss-val" style={{color:'#00d4aa'}}>{activeCampaigns}</span><span className="ss-label">Active</span></div>
            <div className="summary-stat-card"><span className="ss-icon" style={{color:'#00b8d9'}}>💵</span><span className="ss-val" style={{color:'#00b8d9'}}>₹{totalBudget.toLocaleString('en-IN')}</span><span className="ss-label">Total Budget</span></div>
            <div className="summary-stat-card"><span className="ss-icon" style={{color:'#7c3aed'}}>📊</span><span className="ss-val" style={{color:'#7c3aed'}}>₹{campaigns.length ? Math.round(totalBudget/campaigns.length).toLocaleString('en-IN') : 0}</span><span className="ss-label">Avg. Budget</span></div>
          </div>
        )}

        {/* Create Form */}
        {showCreateForm && (
          <div className="card form-card">
            <h2>Create New Campaign</h2>
            <p className="form-subtitle">Fill in the details — every field powers the ML allocation engine.</p>
            <form onSubmit={handleSubmit} className="campaign-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Company Name <span className="required">*</span></label>
                  <input type="text" placeholder="e.g. Zomato, Nykaa" value={formData.company_name} onChange={e => field('company_name', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Campaign Name <span className="required">*</span></label>
                  <input type="text" placeholder="e.g. Summer Sale 2024" value={formData.name} onChange={e => field('name', e.target.value)} required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Product / Service <span className="required">*</span> <span className="field-hint">— drives industry detection</span></label>
                  <input type="text" placeholder="e.g. SaaS platform, Fashion brand, Food delivery" value={formData.product_service} onChange={e => field('product_service', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Budget (₹) <span className="required">*</span></label>
                  <input type="number" placeholder="e.g. 500000" value={formData.budget} onChange={e => field('budget', e.target.value)} min="0" step="10000" required />
                  {formData.budget > 0 && <span className="budget-preview">₹{Number(formData.budget).toLocaleString('en-IN')}</span>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Target Audience <span className="field-hint">— biases channel scoring</span></label>
                  <select className="camp-select" value={formData.target_audience} onChange={e => field('target_audience', e.target.value)}>
                    {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Campaign Objective <span className="field-hint">— auto-sets strategy</span></label>
                  <select className="camp-select" value={formData.campaign_objective} onChange={e => field('campaign_objective', e.target.value)}>
                    {CAMPAIGN_OBJECTIVES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Strategy <span className="required">*</span></label>
                <div className="strategy-grid">
                  {STRATEGIES.map(s => (
                    <label key={s.id} className={`strategy-card ${formData.strategy === s.id ? 'selected' : ''}`}>
                      <input type="radio" name="strategy" value={s.id} checked={formData.strategy === s.id} onChange={() => field('strategy', s.id)} />
                      <span className="strategy-icon">{s.icon}</span>
                      <span className="strategy-label">{s.label}</span>
                      <span className="strategy-desc">{s.description}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={formData.start_date} onChange={e => field('start_date', e.target.value)} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={formData.end_date} onChange={e => field('end_date', e.target.value)} />
                </div>
              </div>
              {(formData.product_service || formData.target_audience || formData.campaign_objective) && (
                <div className="ml-signal-box">
                  <span className="ml-signal-title">✦ ML signals detected:</span>
                  {formData.product_service    && <span className="ml-signal-tag">🛍 {formData.product_service}</span>}
                  {formData.target_audience    && <span className="ml-signal-tag">{AUDIENCE_OPTIONS.find(a => a.value === formData.target_audience)?.label}</span>}
                  {formData.campaign_objective && <span className="ml-signal-tag">{CAMPAIGN_OBJECTIVES.find(o => o.value === formData.campaign_objective)?.label}</span>}
                </div>
              )}
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowCreateForm(false); setError(''); }}>Cancel</button>
                <button type="submit" className="btn-optimize" disabled={submitting}>
                  {submitting ? <><span className="spinner" /> Saving…</> : '✦ Save & Get AI Recommendations'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Toolbar */}
        {campaigns.length > 0 && (
          <div className="camp-toolbar">
            <div className="camp-search-wrap">
              <span>🔍</span>
              <input className="camp-search" type="text" placeholder="Search campaigns…" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              {searchQuery && <button className="camp-search-clear" onClick={() => setSearchQuery('')}>✕</button>}
            </div>
            <div className="camp-filter-tabs">
              {['all','active','paused','completed','draft'].map(s => (
                <button key={s} className={`camp-filter-tab ${filterStatus === s ? 'active' : ''}`}
                  onClick={() => setFilterStatus(s)}
                  style={filterStatus === s && s !== 'all' ? { color: STATUS_COLORS[s], borderColor: STATUS_COLORS[s] } : {}}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                  <span className="filter-count">{s === 'all' ? campaigns.length : campaigns.filter(c => c.status === s).length}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Grid */}
        <div className="campaigns-list">
          {campaigns.length === 0 ? (
            <div className="no-campaigns">
              <div className="no-campaigns-icon">📋</div>
              <p>No campaigns yet. Click <strong>+ New Campaign</strong> to get started.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="no-campaigns">
              <div className="no-campaigns-icon">🔍</div>
              <p>No campaigns match your search or filter.</p>
            </div>
          ) : (
            <div className="campaigns-grid">
              {filtered.map(campaign => (
                <CampaignCard key={campaign.id} campaign={campaign}
                  onViewRec={handleViewRec} onEdit={setEditCampaign}
                  onDelete={handleDelete} onStatusChange={handleStatusChange} />
              ))}
            </div>
          )}
        </div>

      </main>

      {editCampaign && (
        <EditModal campaign={editCampaign} onSave={handleEdit} onClose={() => setEditCampaign(null)} />
      )}
    </div>
  );
};

export default Campaigns;