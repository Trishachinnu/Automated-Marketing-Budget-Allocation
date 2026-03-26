import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { budgetAPI } from '../utils/api';
import './Recommendations.css';

// ─── Constants ────────────────────────────────────────────────────────────────
const STRATEGIES = [
  { id: 'max_roi',   label: 'Max ROI',   icon: '💰', desc: 'Maximize return on every rupee' },
  { id: 'balanced',  label: 'Balanced',  icon: '⚖️', desc: 'Even distribution across channels' },
  { id: 'growth',    label: 'Growth',    icon: '🚀', desc: 'Scale aggressively for market share' },
  { id: 'awareness', label: 'Awareness', icon: '📣', desc: 'Boost brand visibility and reach' },
];

const CHANNEL_COLORS = {
  paid_search:  '#00d4aa',
  social_media: '#00b8d9',
  email:        '#7c3aed',
  seo:          '#f59e0b',
  referral:     '#ec4899',
  video:        '#3b82f6',
};

const CHANNEL_ICONS = {
  paid_search:  '🔍',
  social_media: 'f',
  email:        '✉',
  seo:          '🌐',
  referral:     '👥',
  video:        '▶',
};

const NAV_ITEMS = [
  { icon: '⬛', label: 'Dashboard',       path: '/dashboard' },
  { icon: '📈', label: 'Campaigns',       path: '/campaigns' },
  { icon: '🎯', label: 'Recommendations', active: true },
];

// ─── SVG Donut Chart ──────────────────────────────────────────────────────────
function DonutChart({ data, totalBudget, blendedROI }) {
  const size = 220;
  const cx = size / 2, cy = size / 2;
  const outerR = 90, innerR = 58;
  const [hovered, setHovered] = useState(null);

  const slices = [];
  let cumAngle = -Math.PI / 2;
  data.forEach(([key, d]) => {
    const angle = (d.percentage / 100) * 2 * Math.PI;
    const x1 = cx + outerR * Math.cos(cumAngle);
    const y1 = cy + outerR * Math.sin(cumAngle);
    const x2 = cx + outerR * Math.cos(cumAngle + angle);
    const y2 = cy + outerR * Math.sin(cumAngle + angle);
    const ix1 = cx + innerR * Math.cos(cumAngle);
    const iy1 = cy + innerR * Math.sin(cumAngle);
    const ix2 = cx + innerR * Math.cos(cumAngle + angle);
    const iy2 = cy + innerR * Math.sin(cumAngle + angle);
    const large = angle > Math.PI ? 1 : 0;
    slices.push({
      key, d,
      path: `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`,
    });
    cumAngle += angle;
  });

  return (
    <div className="donut-wrap">
      <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 240 }}>
        {slices.map(({ key, d, path }) => (
          <path
            key={key} d={path}
            fill={CHANNEL_COLORS[key]}
            opacity={hovered && hovered !== key ? 0.4 : 1}
            style={{
              cursor: 'pointer', transition: 'opacity 0.2s, transform 0.2s',
              transformOrigin: `${cx}px ${cy}px`,
              transform: hovered === key ? 'scale(1.04)' : 'scale(1)',
            }}
            onMouseEnter={() => setHovered(key)}
            onMouseLeave={() => setHovered(null)}
          >
            <title>{d.name}: {d.percentage}%</title>
          </path>
        ))}
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#f1f5f9" fontSize="22" fontWeight="700">
          {hovered ? `${data.find(([k]) => k === hovered)?.[1]?.percentage}%` : blendedROI}
        </text>
        <text x={cx} y={cy + 12} textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="500">
          {hovered ? data.find(([k]) => k === hovered)?.[1]?.name : 'BLENDED ROI'}
        </text>
      </svg>
      <div className="donut-legend">
        {data.map(([key, d]) => (
          <div key={key} className="donut-legend-row"
            onMouseEnter={() => setHovered(key)} onMouseLeave={() => setHovered(null)}
            style={{ opacity: hovered && hovered !== key ? 0.4 : 1, transition: 'opacity 0.2s' }}>
            <span className="donut-legend-dot" style={{ background: CHANNEL_COLORS[key] }} />
            <span className="donut-legend-name">{d.name}</span>
            <span className="donut-legend-pct">{d.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── ROI Bar Chart ────────────────────────────────────────────────────────────
function ROIBarChart({ data }) {
  const maxROI = Math.max(...data.map(([, d]) => parseFloat(d.expected_roi)));
  return (
    <div className="roi-bar-chart">
      <h3 className="chart-title">Expected ROI by Channel</h3>
      <div className="roi-bars">
        {data.map(([key, d]) => {
          const roi = parseFloat(d.expected_roi);
          const pct = maxROI > 0 ? (roi / maxROI) * 100 : 0;
          return (
            <div key={key} className="roi-bar-row">
              <div className="roi-bar-label">
                <span className="roi-channel-icon"
                  style={{ background: CHANNEL_COLORS[key] + '22', color: CHANNEL_COLORS[key] }}>
                  {CHANNEL_ICONS[key]}
                </span>
                <span>{d.name}</span>
              </div>
              <div className="roi-bar-track">
                <div className="roi-bar-fill"
                  style={{ width: `${pct}%`, background: `linear-gradient(90deg,${CHANNEL_COLORS[key]}bb,${CHANNEL_COLORS[key]})` }} />
                <span className="roi-bar-value">{d.expected_roi}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Channel Performance Bar Chart ───────────────────────────────────────────
// Replaces the radar chart — shows CTR, CVR, Conv P, Engagement as grouped bars
const PERF_METRICS = [
  { key: 'ctr',              label: 'CTR',    color: '#00d4aa' },
  { key: 'cvr',              label: 'CVR',    color: '#00b8d9' },
  { key: 'conv_probability', label: 'Conv P', color: '#7c3aed' },
  { key: 'engagement',       label: 'Engage', color: '#f59e0b' },
];

function PerformanceBarChart({ data }) {
  const [hovered, setHovered] = useState(null); // { channel, metric }

  // Compute max per metric for normalising bar heights
  const maxPerMetric = {};
  PERF_METRICS.forEach(({ key }) => {
    maxPerMetric[key] = Math.max(...data.map(([, d]) => parseFloat(d[key]) || 0));
  });

  return (
    <div className="perf-bar-chart">
      <h3 className="chart-title">Channel Performance</h3>

      {/* Legend */}
      <div className="perf-legend">
        {PERF_METRICS.map(m => (
          <div key={m.key} className="perf-legend-item">
            <span className="perf-legend-dot" style={{ background: m.color }} />
            <span>{m.label}</span>
          </div>
        ))}
      </div>

      {/* Bars */}
      <div className="perf-bar-group-wrap">
        {data.map(([key, d]) => (
          <div key={key} className="perf-bar-group">
            {/* Grouped bars for this channel */}
            <div className="perf-bars">
              {PERF_METRICS.map(m => {
                const val    = parseFloat(d[m.key]) || 0;
                const height = maxPerMetric[m.key] > 0 ? (val / maxPerMetric[m.key]) * 100 : 0;
                const isHov  = hovered?.channel === key && hovered?.metric === m.key;
                return (
                  <div key={m.key} className="perf-bar-col"
                    onMouseEnter={() => setHovered({ channel: key, metric: m.key, val, name: d.name, label: m.label })}
                    onMouseLeave={() => setHovered(null)}>
                    <div className="perf-bar-outer">
                      <div
                        className="perf-bar-fill"
                        style={{
                          height: `${height}%`,
                          background: m.color,
                          opacity: hovered && !isHov ? 0.35 : 1,
                        }}
                      />
                    </div>
                    {isHov && (
                      <div className="perf-bar-tooltip">
                        {val.toFixed(2)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Channel colour underline + label */}
            <div className="perf-bar-xlabel" style={{ borderColor: CHANNEL_COLORS[key] }}>
              {d.name.split(' ')[0]}
            </div>
          </div>
        ))}
      </div>

      {/* Hovered detail */}
      {hovered && (
        <div className="perf-hover-detail">
          <span style={{ color: CHANNEL_COLORS[hovered.channel] }}>{hovered.name}</span>
          {' · '}{hovered.label}: <strong>{hovered.val.toFixed(2)}</strong>
        </div>
      )}
    </div>
  );
}

// ─── Metric Bar ───────────────────────────────────────────────────────────────
function MetricBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="metric-bar-row">
      <span className="metric-bar-label">{label}</span>
      <div className="metric-bar-track">
        <div className="metric-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="metric-bar-val" style={{ color }}>{value}%</span>
    </div>
  );
}

// ─── Channel Slider  (fixed — no bleed) ──────────────────────────────────────
//
// Key changes vs previous version:
//   • .slider-track has overflow:hidden (set in CSS)
//   • The native <input> has margin:0 via CSS so browser default negative
//     margins can't push it outside the container
//   • The coloured fill is a sibling div, not absolutely positioned inside
//     the input — avoids stacking-context conflicts
//
function ChannelSlider({ channelKey, data, totalBudget, onManualChange }) {
  const [locked, setLocked] = useState(false);
  const color  = CHANNEL_COLORS[channelKey];
  const pct    = data.percentage;
  const amount = data.amount;
  const minPct = 5;
  // Max must be at least the current ML-recommended value so the slider isn't clamped
  const maxPct = Math.max(60, Math.ceil(pct / 5) * 5);
  const estReturn = amount * (1 + parseFloat(data.expected_roi) / 100);

  // The fill width as a fraction of the (maxPct - minPct) range
  const fillPct = Math.min(100, ((pct - minPct) / (maxPct - minPct)) * 100);

  return (
    <div className={`slider-channel-row${locked ? ' locked' : ''}`}>
      {/* Header */}
      <div className="slider-channel-header">
        <div className="slider-channel-left">
          <span className="slider-channel-icon" style={{ background: color + '22', color }}>
            {CHANNEL_ICONS[channelKey]}
          </span>
          <div>
            <span className="slider-channel-name">{data.name}</span>
            <span className="slider-channel-roi" style={{ color }}>{data.expected_roi} ROI</span>
          </div>
        </div>
        <div className="slider-channel-right">
          <span className="slider-pct">{pct}%</span>
          <span className="slider-amount">₹{amount.toLocaleString('en-IN')}</span>
          <button
            className={`lock-btn${locked ? ' lock-btn-active' : ''}`}
            onClick={() => setLocked(l => !l)}
            title={locked ? 'Unlock' : 'Lock allocation'}>
            {locked ? '🔒' : '🔓'}
          </button>
        </div>
      </div>

      {/* Slider track */}
      <div className="slider-track-wrap">
        <span className="slider-minmax">Min {minPct}%</span>

        {/*
          .slider-track has overflow:hidden — clips native input's default
          overflowing track line entirely.
          The fill div and the input are siblings; fill is behind (z-index 0),
          input is on top (z-index 1) but transparent so fill colour shows.
        */}
        <div className="slider-track">
          <div
            className="slider-fill"
            style={{ width: `${fillPct}%`, background: color }}
          />
          <input
            type="range"
            min={minPct}
            max={maxPct}
            step={1}
            value={pct}
            disabled={locked}
            onChange={e => !locked && onManualChange(channelKey, parseInt(e.target.value))}
            className="slider-input"
            style={{ '--slider-color': color }}
          />
        </div>

        <span className="slider-minmax">Max {maxPct}%</span>
      </div>

      {/* Metrics row */}
      <div className="slider-metrics-row">
        <span className="slider-metric">
          Est. return: <strong style={{ color }}>₹{Math.round(estReturn).toLocaleString('en-IN')}</strong>
        </span>
        <span className="slider-metric">CTR <strong>{data.ctr}%</strong></span>
        <span className="slider-metric">CVR <strong>{data.cvr}%</strong></span>
      </div>
    </div>
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────
function KPICards({ recommendations, totalBudget }) {
  const entries = Object.entries(recommendations);
  const totalEst = entries.reduce((s, [, d]) => s + d.amount * (1 + parseFloat(d.expected_roi) / 100), 0);
  const blendedROI = entries.length > 0
    ? (entries.reduce((s, [, d]) => s + parseFloat(d.expected_roi) * d.percentage, 0) / 100).toFixed(1)
    : '0';
  const topChannel = [...entries].sort(([, a], [, b]) => b.percentage - a.percentage)[0]?.[1];
  const activeChannels = entries.filter(([, d]) => d.percentage > 0).length;

  const kpis = [
    { icon: '💵', label: 'TOTAL BUDGET',    value: `₹${Number(totalBudget).toLocaleString('en-IN')}` },
    { icon: '📈', label: 'EST. REVENUE',    value: `₹${Math.round(totalEst).toLocaleString('en-IN')}` },
    { icon: '🎯', label: 'BLENDED ROI',     value: `${blendedROI}x` },
    { icon: '📡', label: 'ACTIVE CHANNELS', value: activeChannels, sub: `Top: ${topChannel?.name || '—'}` },
  ];

  return (
    <div className="kpi-row">
      {kpis.map((k, i) => (
        <div key={i} className="kpi-card">
          <div className="kpi-icon">{k.icon}</div>
          <div>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{k.value}</div>
            {k.sub && <div className="kpi-sub">{k.sub}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Recommendations() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const fromCampaign = location.state?.from_campaign   || false;
  const ctxBudget    = location.state?.budget          || 5000000;
  const ctxStrategy  = location.state?.strategy        || 'balanced';
  const ctxCampaign  = location.state?.campaign_name   || '';
  const ctxCompany   = location.state?.company_name    || '';
  const ctxProduct   = location.state?.product_service || '';

  const [totalBudget,     setTotalBudget]     = useState(ctxBudget);
  const [strategy,        setStrategy]        = useState(ctxStrategy);
  const [productService,  setProductService]  = useState(ctxProduct);
  const [campaignName,    setCampaignName]    = useState(ctxCampaign);
  const [companyName,     setCompanyName]     = useState(ctxCompany);
  const [targetAudience,  setTargetAudience]  = useState('');
  const [campaignType,    setCampaignType]    = useState('');
  const [recommendations, setRecommendations] = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const [activeTab,       setActiveTab]       = useState('allocation');
  const [manualAlloc,     setManualAlloc]     = useState(null);
  const [showControls,    setShowControls]    = useState(false);

  const debounceRef = useRef(null);

  // Refs to always have latest values inside debounced closures
  const budgetRef         = useRef(totalBudget);
  const strategyRef       = useRef(strategy);
  const productRef        = useRef(productService);
  const campaignNameRef   = useRef(campaignName);
  const companyNameRef    = useRef(companyName);
  const targetAudienceRef = useRef(targetAudience);
  const campaignTypeRef   = useRef(campaignType);

  // Keep refs in sync with state
  useEffect(() => { budgetRef.current         = totalBudget; },    [totalBudget]);
  useEffect(() => { strategyRef.current       = strategy; },        [strategy]);
  useEffect(() => { productRef.current        = productService; },  [productService]);
  useEffect(() => { campaignNameRef.current   = campaignName; },    [campaignName]);
  useEffect(() => { companyNameRef.current    = companyName; },     [companyName]);
  useEffect(() => { targetAudienceRef.current = targetAudience; },  [targetAudience]);
  useEffect(() => { campaignTypeRef.current   = campaignType; },    [campaignType]);

  useEffect(() => {
    // Only auto-fetch if user arrived from a campaign
    if (fromCampaign) {
      fetchRecommendations(ctxBudget, ctxStrategy, ctxProduct, ctxCampaign, ctxCompany, '', '');
    }
  }, [ctxBudget, ctxStrategy, fromCampaign]);

  const triggerFetch = (overrides = {}) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const args = {
        budget:        overrides.budget         ?? budgetRef.current,
        strategy:      overrides.strategy       ?? strategyRef.current,
        product:       overrides.product        ?? productRef.current,
        campaign_name: overrides.campaign_name  ?? campaignNameRef.current,
        company_name:  overrides.company_name   ?? companyNameRef.current,
        audience:      overrides.audience       ?? targetAudienceRef.current,
        campaign_type: overrides.campaign_type  ?? campaignTypeRef.current,
      };
      console.log('[BudgetAI] triggerFetch firing with:', JSON.stringify(args));
      fetchRecommendations(args.budget, args.strategy, args.product, args.campaign_name, args.company_name, args.audience, args.campaign_type);
    }, 700);
  };

  const handleBudgetChange = (val) => {
    setTotalBudget(val);
    budgetRef.current = val;
    setManualAlloc(null);
    triggerFetch({ budget: val });
  };

  const handleStrategyChange = (s) => {
    setStrategy(s);
    strategyRef.current = s;
    setManualAlloc(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchRecommendations(totalBudget, s, productRef.current, campaignNameRef.current, companyNameRef.current, targetAudienceRef.current, campaignTypeRef.current);
  };

  const handleProductChange = (val) => {
    setProductService(val);
    productRef.current = val;
    setManualAlloc(null);
    triggerFetch({ product: val });
  };

  const handleFieldChange = (setter, val, field) => {
    console.log('[BudgetAI] handleFieldChange:', field, '=', val);
    setter(val);
    setManualAlloc(null);
    // Update the matching ref immediately so triggerFetch reads the new value
    if (field === 'campaign_name')   campaignNameRef.current   = val;
    if (field === 'company_name')    companyNameRef.current    = val;
    if (field === 'target_audience') targetAudienceRef.current = val;
    if (field === 'campaign_type')   campaignTypeRef.current   = val;
    console.log('[BudgetAI] refs after update — name:', campaignNameRef.current, 'company:', companyNameRef.current, 'audience:', targetAudienceRef.current, 'type:', campaignTypeRef.current);
    triggerFetch();
  };

  const fetchRecommendations = async (budget, strat, product, campName, compName, audience, campType) => {
    if (!budget || budget <= 0) return;
    setLoading(true);
    setError('');

    const payload = {
      total_budget:    budget,
      strategy:        strat,
      product_service: product    || '',
      campaign_name:   campName   || '',
      company_name:    compName   || '',
      target_audience: audience   || '',
      campaign_type:   campType   || '',
      current_data: {
        strategy:        strat,
        product_service: product  || '',
        campaign_name:   campName || '',
        company_name:    compName || '',
        target_audience: audience || '',
        campaign_type:   campType || '',
      },
    };

    console.log('[BudgetAI] fetchRecommendations payload:', JSON.stringify(payload));

    try {
      const res = await budgetAPI.getRecommendations(payload);
      console.log('[BudgetAI] response allocations:', JSON.stringify(
        Object.entries(res.data.recommendations || {}).map(([k,v]) => ({channel:k, pct:v.percentage}))
      ));
      setRecommendations(res.data);
      setManualAlloc(null);
    } catch (err) {
      console.error('[BudgetAI] error:', err.response?.data || err.message);
      setError(err.response?.data?.error || 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleManualChange = useCallback((changedKey, newPct) => {
    if (!recommendations) return;
    const base    = manualAlloc || recommendations.recommendations;
    const updated = { ...base };
    const diff    = newPct - updated[changedKey].percentage;
    const others  = Object.keys(updated).filter(k => k !== changedKey);

    let remaining = -diff;
    others.forEach(k => {
      const adj    = remaining / others.length;
      const newVal = Math.max(5, Math.min(70, updated[k].percentage + adj));
      updated[k]   = { ...updated[k], percentage: parseFloat(newVal.toFixed(1)), amount: Math.round(totalBudget * newVal / 100) };
    });
    updated[changedKey] = {
      ...updated[changedKey],
      percentage: newPct,
      amount: Math.round(totalBudget * newPct / 100),
    };
    setManualAlloc(updated);
  }, [recommendations, manualAlloc, totalBudget]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const activeRec = manualAlloc || recommendations?.recommendations;
  const sorted    = activeRec
    ? Object.entries(activeRec).sort(([, a], [, b]) => b.percentage - a.percentage)
    : [];

  const totalPct = sorted.reduce((s, [, d]) => s + d.percentage, 0);
  const pctOver  = Math.round(totalPct) > 100;

  const blendedROI = sorted.length > 0
    ? (sorted.reduce((s, [, d]) => s + parseFloat(d.expected_roi) * d.percentage, 0) / 100).toFixed(1) + 'x'
    : '—';

  return (
    <div className="dashboard-root">

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-sm">
            <svg viewBox="0 0 40 40" fill="none">
              <rect x="4"  y="20" width="8"  height="16" rx="2" fill="#00d4aa"/>
              <rect x="16" y="12" width="8"  height="24" rx="2" fill="#00b8d9"/>
              <rect x="28" y="4"  width="8"  height="32" rx="2" fill="#7c3aed"/>
            </svg>
          </div>
          <span>BudgetAI</span>
        </div>
        <nav className="sidebar-nav">
          {NAV_ITEMS.map(item => (
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
          <button className="logout-btn" onClick={handleLogout} title="Sign out">
            <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
              <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"/>
            </svg>
          </button>
        </div>
      </aside>

      {/* ── Main ──────────────────────────────────────────────────────── */}
      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <h1>AI Recommendations 🎯</h1>
            <p>ML-powered allocation · Ensemble model · 208,005 real campaign records</p>
          </div>
          <div className="header-badges">
            {loading && <div className="loading-badge">⟳ Recalculating…</div>}
            {recommendations?.budget_tier && !loading && (
              <div className="loading-badge" style={{background:'rgba(124,58,237,0.12)',borderColor:'rgba(124,58,237,0.25)',color:'#a78bfa'}}>
                {recommendations.budget_tier.charAt(0).toUpperCase() + recommendations.budget_tier.slice(1)} Budget
              </div>
            )}
            {recommendations?.model_info && !loading && (
              <div className="loading-badge" style={{background:'rgba(0,212,170,0.10)',borderColor:'rgba(0,212,170,0.25)',color:'#00d4aa'}}>
                AUC {recommendations.model_info.cv_auc_mean || recommendations.model_info.auc}
              </div>
            )}
          </div>
        </header>

        {(fromCampaign || campaignName || companyName || productService) && (
          <div className="context-banner">
            <span className="context-icon">✦</span>
            <div className="context-text">
              {campaignName && <strong>{campaignName}</strong>}
              {companyName  && <span> · {companyName}</span>}
              {productService && <span> · {productService}</span>}
            </div>
            <span className="context-tag">{fromCampaign ? 'From Campaign' : 'Campaign Details'}</span>
          </div>
        )}

        {recommendations && (
          <KPICards recommendations={activeRec} totalBudget={totalBudget} />
        )}

        {/* ── No-campaign prompt ───────────────────────────────────────── */}
        {!fromCampaign && !recommendations && !loading && !showControls && (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: '60vh', gap: '24px', textAlign: 'center', padding: '40px 20px',
          }}>
            <div style={{
              width: '80px', height: '80px', borderRadius: '20px',
              background: 'rgba(0,212,170,0.12)', border: '1.5px solid rgba(0,212,170,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px',
            }}>🎯</div>
            <div>
              <h2 style={{ color: '#f1f5f9', fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>
                No Campaign Selected
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '15px', maxWidth: '400px', lineHeight: '1.6' }}>
                Select an existing campaign or create a new one to get AI-powered channel allocation recommendations.
              </p>
            </div>
            <button
              onClick={() => navigate('/campaigns')}
              style={{
                background: 'linear-gradient(135deg, #00d4aa, #00b8d9)',
                color: '#0f172a', border: 'none', borderRadius: '10px',
                padding: '14px 32px', fontSize: '15px', fontWeight: 700,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                boxShadow: '0 4px 20px rgba(0,212,170,0.3)',
              }}
            >
              <span style={{ fontSize: '18px' }}>📈</span>
              Go to Campaigns
            </button>
            <p style={{ color: '#475569', fontSize: '13px' }}>
              Or fill in the Campaign Details below to get instant recommendations
            </p>
            <button
              onClick={() => document.querySelector('.rec-layout')?.scrollIntoView({ behavior: 'smooth' }) || setShowControls(true)}
              style={{
                background: 'transparent', color: '#00d4aa',
                border: '1.5px solid rgba(0,212,170,0.4)', borderRadius: '8px',
                padding: '10px 24px', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ✦ Fill Campaign Details Manually
            </button>
          </div>
        )}

        <div className="rec-layout" style={!fromCampaign && !recommendations && !loading && !showControls ? {display:"none"} : {}}>

          {/* ── Left controls ───────────────────────────────────────── */}
          <div className="rec-controls">

            {/* Budget */}
            <div className="card control-card">
              <h2>Total Budget</h2>
              <p className="card-subtitle">Drag to adjust allocation</p>
              <div className="budget-input-wrap">
                <span className="budget-prefix">₹</span>
                <input
                  type="number" className="budget-input"
                  value={totalBudget}
                  onChange={e => handleBudgetChange(Number(e.target.value))}
                  min="10000" step="10000"
                />
              </div>
              <input type="range" className="budget-slider"
                min="100000" max="50000000" step="100000"
                value={totalBudget}
                onChange={e => handleBudgetChange(Number(e.target.value))}
              />
              <div className="budget-range-labels">
                <span>₹1L</span><span>₹5Cr</span>
              </div>
            </div>

            {/* Campaign Details */}
            <div className="card control-card">
              <h2>Campaign Details</h2>
              <p className="card-subtitle">More details = smarter channel allocation</p>

              <div className="campaign-field">
                <label className="field-label">Campaign Name</label>
                <input
                  type="text" className="product-input"
                  placeholder="e.g. Summer Sale 2024"
                  value={campaignName}
                  onChange={e => handleFieldChange(setCampaignName, e.target.value, 'campaign_name')}
                />
              </div>

              <div className="campaign-field">
                <label className="field-label">Company Name</label>
                <input
                  type="text" className="product-input"
                  placeholder="e.g. Zomato, Razorpay, Nykaa"
                  value={companyName}
                  onChange={e => handleFieldChange(setCompanyName, e.target.value, 'company_name')}
                />
              </div>

              <div className="campaign-field">
                <label className="field-label">Target Audience</label>
                <select
                  className="product-input"
                  value={targetAudience}
                  onChange={e => handleFieldChange(setTargetAudience, e.target.value, 'target_audience')}
                >
                  <option value="">— Select audience —</option>
                  <option value="b2b">🏢 B2B (Business to Business)</option>
                  <option value="b2c">🛍 B2C (Business to Consumer)</option>
                  <option value="youth">🎮 Youth (Under 25)</option>
                  <option value="gen z">⚡ Gen Z (Under 24)</option>
                  <option value="millennial">💼 Millennials (25–40)</option>
                  <option value="men">👨 Men</option>
                  <option value="women">👩 Women</option>
                  <option value="senior">👴 Senior (50+)</option>
                  <option value="enterprise">🏛 Enterprise</option>
                  <option value="startup">🚀 Startups</option>
                  <option value="india">🇮🇳 India (Domestic)</option>
                  <option value="global">🌍 Global</option>
                </select>
                {targetAudience && recommendations?.topic?.audience_applied && (
                  <div className="topic-tag">
                    <span className="topic-dot">✦</span>
                    <span>Audience bias applied: <strong>{targetAudience}</strong></span>
                  </div>
                )}
              </div>

              <div className="campaign-field">
                <label className="field-label">Campaign Objective</label>
                <select
                  className="product-input"
                  value={campaignType}
                  onChange={e => handleFieldChange(setCampaignType, e.target.value, 'campaign_type')}
                >
                  <option value="">— Select objective —</option>
                  <option value="awareness">Brand Awareness</option>
                  <option value="conversion">Conversions / Sales</option>
                  <option value="traffic">Website Traffic</option>
                  <option value="retention">Retention / Loyalty</option>
                  <option value="engagement">Engagement</option>
                </select>
                {campaignType && recommendations?.topic?.strategy_auto_hint && (
                  <div className="topic-tag">
                    <span className="topic-dot">✦</span>
                    <span>Strategy auto-set to <strong>{strategy}</strong> based on objective</span>
                  </div>
                )}
              </div>

              {/* Live "signals applied" feedback */}
              {(campaignName || companyName || targetAudience || campaignType) && (
                <div className="topic-tag" style={{marginTop:'12px', flexWrap:'wrap', gap:'6px'}}>
                  <span className="topic-dot">✦</span>
                  <span style={{fontWeight:600, marginRight:4}}>ML signals active:</span>
                  {campaignName   && <span style={{background:'rgba(0,212,170,0.12)',color:'#00d4aa',padding:'2px 8px',borderRadius:'4px',fontSize:'12px'}}>{campaignName}</span>}
                  {companyName    && <span style={{background:'rgba(0,184,217,0.12)',color:'#00b8d9',padding:'2px 8px',borderRadius:'4px',fontSize:'12px'}}>{companyName}</span>}
                  {targetAudience && <span style={{background:'rgba(124,58,237,0.12)',color:'#a78bfa',padding:'2px 8px',borderRadius:'4px',fontSize:'12px'}}>{targetAudience}</span>}
                  {campaignType   && <span style={{background:'rgba(245,158,11,0.12)',color:'#f59e0b',padding:'2px 8px',borderRadius:'4px',fontSize:'12px'}}>{campaignType}</span>}
                  {loading && <span style={{color:'#94a3b8',fontSize:'12px'}}>⟳ recalculating…</span>}
                </div>
              )}
            </div>

            {/* Product / Service */}
            <div className="card control-card">
              <h2>Product / Service</h2>
              <p className="card-subtitle">Industry-specific channel weighting</p>
              <input
                type="text" className="product-input"
                placeholder="e.g. SaaS CRM, Fashion brand, Food delivery…"
                value={productService}
                onChange={e => handleProductChange(e.target.value)}
              />
              {recommendations?.topic?.topic_matched && (
                <div className="topic-tag">
                  <span className="topic-dot">✦</span>
                  <span>Industry detected: <strong>{recommendations.topic.industry_label}</strong></span>
                </div>
              )}
              {productService && !recommendations?.topic?.topic_matched && (
                <div className="topic-tag topic-tag-miss">
                  <span className="topic-dot">○</span>
                  <span>Using general channel weights</span>
                </div>
              )}
            </div>

            {/* Strategy */}
            <div className="card control-card">
              <h2>Strategy</h2>
              <p className="card-subtitle">How should the budget be optimized?</p>
              <div className="strategy-list">
                {STRATEGIES.map(s => (
                  <label key={s.id} className={`strategy-row ${strategy === s.id ? 'selected' : ''}`}>
                    <input type="radio" name="strategy" value={s.id}
                      checked={strategy === s.id}
                      onChange={() => handleStrategyChange(s.id)}
                    />
                    <span className="strategy-icon-sm">{s.icon}</span>
                    <div className="strategy-text">
                      <span className="strategy-label">{s.label}</span>
                      <span className="strategy-desc">{s.desc}</span>
                    </div>
                    {strategy === s.id && <span className="strategy-check">✓</span>}
                  </label>
                ))}
              </div>
            </div>

            {/* ML Model Info */}
            {recommendations?.model_info && (
              <div className="card control-card model-card">
                <div className="model-badge">✦ ML Engine v3</div>
                <div className="model-stats">
                  <div className="model-stat">
                    <span className="model-stat-val">{recommendations.model_info.cv_auc_mean || recommendations.model_info.auc}</span>
                    <span className="model-stat-label">CV AUC</span>
                  </div>
                  <div className="model-stat">
                    <span className="model-stat-val">{(recommendations.model_info.training_samples || 0).toLocaleString()}</span>
                    <span className="model-stat-label">Records</span>
                  </div>
                  <div className="model-stat">
                    <span className="model-stat-val">{recommendations.model_info.feature_count || 27}</span>
                    <span className="model-stat-label">Features</span>
                  </div>
                </div>
                <p className="model-desc">
                  {recommendations.model_info.model_type || 'Voting Ensemble (GBM+RF+ET)'} · Isotonic calibration · 5-fold CV
                </p>
              </div>
            )}
          </div>

          {/* ── Right results ────────────────────────────────────────── */}
          <div className="rec-results">

            {error && <div className="error-banner">{error}</div>}

            {!recommendations && !loading && (
              <div className="empty-state" style={{
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                minHeight:'420px', gap:'24px', padding:'48px 32px', textAlign:'center'
              }}>
                <div style={{fontSize:'64px', lineHeight:1}}>📋</div>
                <div>
                  <h2 style={{color:'#f1f5f9', fontSize:'22px', fontWeight:700, marginBottom:'8px'}}>
                    No Campaign Selected
                  </h2>
                  <p style={{color:'#94a3b8', fontSize:'15px', maxWidth:'360px', lineHeight:1.6}}>
                    To get AI-powered recommendations, please select an existing campaign or create a new one from the Campaigns page.
                  </p>
                </div>
                <div style={{display:'flex', gap:'12px', flexWrap:'wrap', justifyContent:'center'}}>
                  <button
                    onClick={() => navigate('/campaigns')}
                    style={{
                      padding:'12px 28px', borderRadius:'10px', fontWeight:600, fontSize:'15px',
                      background:'linear-gradient(135deg,#00d4aa,#00b8d9)', color:'#0f172a',
                      border:'none', cursor:'pointer'
                    }}>
                    📈 Go to Campaigns
                  </button>
                  <button
                    onClick={() => navigate('/campaigns')}
                    style={{
                      padding:'12px 28px', borderRadius:'10px', fontWeight:600, fontSize:'15px',
                      background:'rgba(255,255,255,0.06)', color:'#f1f5f9',
                      border:'1px solid rgba(255,255,255,0.12)', cursor:'pointer'
                    }}>
                    + Create New Campaign
                  </button>
                </div>
                <p style={{color:'#475569', fontSize:'13px'}}>
                  Once you select a campaign, recommendations will load automatically.
                </p>
              </div>
            )}

            {loading && !recommendations && (
              <div className="skeleton-wrap">
                {[1,2,3].map(i => <div key={i} className="skeleton-card" />)}
              </div>
            )}

            {recommendations && (
              <>
                {/* Tab Nav */}
                <div className="tabs-nav">
                  {[
                    { id: 'allocation', label: '📊 Allocation' },
                    { id: 'analytics',  label: '📈 Analytics' },
                    { id: 'insights',   label: '💡 Insights' },
                  ].map(t => (
                    <button key={t.id}
                      className={`tab-btn ${activeTab === t.id ? 'tab-btn-active' : ''}`}
                      onClick={() => setActiveTab(t.id)}>
                      {t.label}
                    </button>
                  ))}
                </div>

                {/* ── Allocation Tab ─────────────────────────────────── */}
                {activeTab === 'allocation' && (
                  <div className="tab-content">
                    <div className="alloc-grid">

                      {/* Channel sliders */}
                      <div className="card alloc-sliders-card">
                        <div className="alloc-header">
                          <div>
                            <h2>Channel Allocation</h2>
                            <p className="card-subtitle">
                              {STRATEGIES.find(s => s.id === strategy)?.icon}{' '}
                              <strong>{STRATEGIES.find(s => s.id === strategy)?.label}</strong> strategy
                              {' · '}₹{Number(totalBudget).toLocaleString('en-IN')} total
                            </p>
                          </div>
                          <span className={`total-pct-badge${pctOver ? ' over' : ''}`}>
                            {Math.round(totalPct)}%
                          </span>
                        </div>

                        {/* Stacked progress bar */}
                        <div className="alloc-bar-track">
                          {sorted.map(([key, data]) => (
                            <div key={key} className="alloc-bar-seg"
                              style={{ width: `${data.percentage}%`, background: CHANNEL_COLORS[key] }}
                              title={`${data.name}: ${data.percentage}%`}
                            />
                          ))}
                        </div>

                        {/* Per-channel sliders */}
                        <div className="channels-breakdown">
                          {sorted.map(([key, data]) => (
                            <ChannelSlider
                              key={key}
                              channelKey={key}
                              data={data}
                              totalBudget={totalBudget}
                              onManualChange={handleManualChange}
                            />
                          ))}
                        </div>

                        {manualAlloc && (
                          <button className="reset-btn" onClick={() => setManualAlloc(null)}>
                            ↺ Reset to ML recommendation
                          </button>
                        )}
                      </div>

                      {/* Donut */}
                      <div className="card donut-card">
                        <h2>Budget Distribution</h2>
                        <DonutChart data={sorted} totalBudget={totalBudget} blendedROI={blendedROI} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Analytics Tab ──────────────────────────────────── */}
                {activeTab === 'analytics' && (
                  <div className="tab-content">
                    <div className="analytics-grid">

                      <div className="card">
                        <ROIBarChart data={sorted} />
                      </div>

                      <div className="card">
                        <PerformanceBarChart data={sorted} />
                      </div>

                      <div className="card analytics-card-wide">
                        <h3 className="chart-title">Channel Metrics Detail</h3>
                        <div className="metrics-thead">
                          <span>Channel</span><span>Alloc %</span><span>CTR</span>
                          <span>CVR</span><span>Conv P</span><span>Engagement</span><span>Est ROI</span>
                        </div>
                        {sorted.map(([key, d]) => (
                          <div key={key} className="metrics-trow">
                            <span className="metrics-channel-cell">
                              <span className="metrics-dot" style={{ background: CHANNEL_COLORS[key] }} />
                              {d.name}
                            </span>
                            <span className="metrics-pct-cell" style={{ color: CHANNEL_COLORS[key] }}>{d.percentage}%</span>
                            <span>{d.ctr}%</span>
                            <span>{d.cvr}%</span>
                            <span>{d.conv_probability}%</span>
                            <span>{d.engagement}</span>
                            <span className="metrics-roi-cell" style={{ color: CHANNEL_COLORS[key] }}>{d.expected_roi}</span>
                          </div>
                        ))}
                        <div className="mini-metrics-section">
                          <h4>CTR Comparison</h4>
                          {sorted.map(([key, d]) => (
                            <MetricBar key={key} label={d.name} value={d.ctr}
                              max={Math.max(...sorted.map(([, x]) => x.ctr))}
                              color={CHANNEL_COLORS[key]} />
                          ))}
                        </div>
                      </div>

                      {/* Conversion probability CI */}
                      <div className="card analytics-card-wide">
                        <h3 className="chart-title">Conversion Probability with 95% CI</h3>
                        <div className="ci-chart">
                          {sorted.map(([key, d]) => {
                            const lo = d.conv_ci?.low  || d.conv_probability * 0.97;
                            const hi = d.conv_ci?.high || d.conv_probability * 1.03;
                            const globalMin = 85, globalMax = 92;
                            const toX = v => ((v - globalMin) / (globalMax - globalMin)) * 100;
                            return (
                              <div key={key} className="ci-row">
                                <span className="ci-label">{d.name}</span>
                                <div className="ci-track">
                                  <div className="ci-range" style={{
                                    left: `${toX(lo)}%`, width: `${toX(hi) - toX(lo)}%`,
                                    background: CHANNEL_COLORS[key] + '44',
                                    border: `1.5px solid ${CHANNEL_COLORS[key]}`,
                                  }} />
                                  <div className="ci-point" style={{
                                    left: `${toX(d.conv_probability)}%`,
                                    background: CHANNEL_COLORS[key],
                                  }} />
                                </div>
                                <span className="ci-val" style={{ color: CHANNEL_COLORS[key] }}>
                                  {d.conv_probability}%{' '}
                                  <span className="ci-range-text">({lo}–{hi}%)</span>
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Insights Tab ────────────────────────────────────── */}
                {activeTab === 'insights' && (
                  <div className="tab-content">
                    <div className="insights-grid">

                      <div className="card">
                        <h2>AI Insights & Rationale</h2>
                        <p className="card-subtitle">Why the model chose this allocation</p>
                        <div className="insights-list">
                          {sorted.slice(0, 6).map(([key, data], i) => {
                            const templates = [
                              { icon: '🎯', text: `${data.name} gets ${data.percentage}% — ML conversion probability ${data.conv_probability}%`, tag: data.confidence === 'high' ? 'High Confidence' : 'Suggested' },
                              { icon: '💰', text: `₹${data.amount.toLocaleString('en-IN')} allocated with expected ROI of ${data.expected_roi}`, tag: 'ROI Focus' },
                              { icon: '📊', text: `${data.name}: CTR ${data.ctr}% · CVR ${data.cvr}% — from 208k campaign records`, tag: 'Data Driven' },
                              { icon: '🚀', text: `${data.name} shows ${data.growth_potential || 'strong'} potential — est. ${data.est_conversions} conversions`, tag: 'Growth' },
                              { icon: '⚡', text: `Engagement score ${data.engagement} — proven reach in similar markets`, tag: 'Proven' },
                              { icon: '🔬', text: `CI: ${data.conv_ci?.low}–${data.conv_ci?.high}% — calibrated ensemble confidence`, tag: 'Calibrated' },
                            ];
                            const ins = templates[i % templates.length];
                            return (
                              <div key={key} className="insight-item">
                                <span className="insight-icon">{ins.icon}</span>
                                <p>{ins.text}</p>
                                <span className="insight-tag">{ins.tag}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {sorted.some(([, d]) => d.context_boost) && (
                        <div className="card">
                          <h2>Industry Fit Analysis</h2>
                          <p className="card-subtitle">
                            {recommendations.topic?.topic_matched
                              ? `Optimised for: ${recommendations.topic.industry_label}`
                              : 'Using general channel weights'}
                          </p>
                          <div className="context-boost-list">
                            {sorted.map(([key, d]) => d.context_boost && (
                              <div key={key} className="context-boost-row">
                                <span className="cb-dot" style={{ background: CHANNEL_COLORS[key] }} />
                                <span className="cb-name">{d.name}</span>
                                <span className={`cb-tag ${d.context_boost.includes('Strong') ? 'cb-strong' : d.context_boost.includes('Good') ? 'cb-good' : 'cb-low'}`}>
                                  {d.context_boost}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="card">
                        <h2>Strategy Weights</h2>
                        <p className="card-subtitle">
                          Signal weighting for <strong>{STRATEGIES.find(s => s.id === strategy)?.label}</strong>
                        </p>
                        {(() => {
                          const cfg = {
                            max_roi:   { Conv: 40, CVR: 30, CTR: 12, Engagement: 8, Cost: 10 },
                            balanced:  { Conv: 25, CVR: 22, CTR: 22, Engagement: 18, Cost: 13 },
                            growth:    { Conv: 10, CVR: 15, CTR: 48, Engagement: 18, Cost: 9 },
                            awareness: { Conv: 5,  CVR: 5,  CTR: 44, Engagement: 40, Cost: 6 },
                          }[strategy] || {};
                          return (
                            <div className="strategy-weights">
                              {Object.entries(cfg).map(([signal, weight]) => (
                                <div key={signal} className="sw-row">
                                  <span className="sw-label">{signal}</span>
                                  <div className="sw-bar-track">
                                    <div className="sw-bar-fill" style={{ width: `${weight}%` }} />
                                  </div>
                                  <span className="sw-val">{weight}%</span>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </div>

                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}