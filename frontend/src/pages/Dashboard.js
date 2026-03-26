import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { budgetAPI } from '../utils/api';
import './Dashboard.css';

const CHANNEL_COLORS = {
  paid_search:'#00d4aa', social_media:'#00b8d9', email:'#7c3aed',
  display:'#f59e0b', content_seo:'#ec4899', referral:'#3b82f6',
};
const STATUS_COLORS = {
  active:'#00d4aa', paused:'#f59e0b', completed:'#7c3aed', draft:'#6b7280',
};
const NAV_ITEMS = [
  { icon:'⬛', label:'Dashboard',       active:true },
  { icon:'🎯', label:'Recommendations', path:'/recommendations' },
  { icon:'📈', label:'Campaigns',       path:'/campaigns' },
];

function CampaignPerformanceChart({ campaigns }) {
  const [hovered, setHovered] = useState(null);
  if (!campaigns || campaigns.length === 0) return null;

  const STRAT_COLORS = { max_roi:'#00d4aa', balanced:'#00b8d9', growth:'#7c3aed', awareness:'#f59e0b' };

  // Sort by created_at so the line flows chronologically
  const sorted = [...campaigns].sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
  const budgets = sorted.map(c => Number(c.budget)||0);
  const maxB = Math.max(...budgets, 1);
  const minB = Math.min(...budgets, 0);
  const range = maxB - minB || 1;

  const W = 600, H = 180, PAD = { top:16, right:16, bottom:36, left:56 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top  - PAD.bottom;

  const toX = i => PAD.left + (sorted.length === 1 ? innerW/2 : (i / (sorted.length-1)) * innerW);
  const toY = v => PAD.top  + innerH - ((v - minB) / range) * innerH;

  // Smooth line path using cubic bezier
  const pts = sorted.map((c,i) => ({ x: toX(i), y: toY(Number(c.budget)||0), c }));
  let path = '';
  pts.forEach((p,i) => {
    if (i === 0) { path += `M ${p.x} ${p.y}`; return; }
    const prev = pts[i-1];
    const cpx  = (prev.x + p.x) / 2;
    path += ` C ${cpx} ${prev.y} ${cpx} ${p.y} ${p.x} ${p.y}`;
  });

  // Area fill (close path down to baseline)
  const areaPath = path
    + ` L ${pts[pts.length-1].x} ${PAD.top+innerH}`
    + ` L ${pts[0].x} ${PAD.top+innerH} Z`;

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({
    y: PAD.top + innerH - t * innerH,
    label: Math.round(minB + t * range).toLocaleString('en-IN', { notation:'compact' }),
  }));

  const hovPt = hovered !== null ? pts[hovered] : null;

  return (
    <div className="db-chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width:'100%', height:'auto', overflow:'visible' }}>
        <defs>
          <linearGradient id="lineAreaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#00d4aa" stopOpacity="0.25"/>
            <stop offset="100%" stopColor="#00d4aa" stopOpacity="0"/>
          </linearGradient>
          {hovPt && (
            <filter id="glowDot">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          )}
        </defs>

        {/* Grid lines */}
        {yTicks.map((t,i) => (
          <g key={i}>
            <line x1={PAD.left} y1={t.y} x2={W-PAD.right} y2={t.y}
              stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
            <text x={PAD.left-8} y={t.y+4} textAnchor="end"
              fill="rgba(255,255,255,0.3)" fontSize="10">
              ₹{t.label}
            </text>
          </g>
        ))}

        {/* Area fill */}
        {pts.length > 1 && (
          <path d={areaPath} fill="url(#lineAreaGrad)"/>
        )}

        {/* Line */}
        <path d={path} fill="none" stroke="#00d4aa" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round"/>

        {/* Hover vertical rule */}
        {hovPt && (
          <line x1={hovPt.x} y1={PAD.top} x2={hovPt.x} y2={PAD.top+innerH}
            stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeDasharray="4 3"/>
        )}

        {/* Data points */}
        {pts.map((p,i) => {
          const color = STRAT_COLORS[p.c.strategy]||'#00d4aa';
          const isHov = hovered===i;
          return (
            <g key={i}>
              {/* Invisible hit area */}
              <rect x={p.x-16} y={PAD.top} width={32} height={innerH}
                fill="transparent"
                onMouseEnter={()=>setHovered(i)}
                onMouseLeave={()=>setHovered(null)}
                style={{cursor:'crosshair'}}/>
              <circle cx={p.x} cy={p.y} r={isHov?6:4}
                fill={color} stroke="#080b12" strokeWidth="2"
                filter={isHov?'url(#glowDot)':undefined}
                style={{transition:'r 0.15s'}}/>
            </g>
          );
        })}

        {/* X-axis labels */}
        {pts.map((p,i) => (
          <text key={i} x={p.x} y={H-6} textAnchor="middle"
            fill="rgba(255,255,255,0.35)" fontSize="10">
            {(p.c.name||`C${i+1}`).slice(0,8)}
          </text>
        ))}
      </svg>

      {/* Tooltip */}
      {hovPt && (
        <div className="db-line-tooltip">
          <strong>{hovPt.c.name}</strong>
          <span>₹{Number(hovPt.c.budget).toLocaleString('en-IN')}</span>
          <span style={{color: STRAT_COLORS[hovPt.c.strategy]||'#00d4aa'}}>
            {hovPt.c.strategy?.replace('_',' ')}
          </span>
          <span style={{color:'rgba(255,255,255,0.4)', fontSize:'11px'}}>
            {hovPt.c.status}
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="db-chart-legend">
        {Object.entries(STRAT_COLORS).map(([k,c])=>(
          <div key={k} className="db-legend-item">
            <span className="db-legend-dot" style={{background:c}}/>
            <span>{k.replace('_',' ')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function KPICard({ icon, label, value, sub, color='#00d4aa' }) {
  return (
    <div className="db-kpi-card">
      <div className="db-kpi-icon" style={{background:color+'18', color}}>{icon}</div>
      <div className="db-kpi-body">
        <span className="db-kpi-label">{label}</span>
        <span className="db-kpi-value">{value}</span>
        {sub && <span className="db-kpi-sub" style={{color}}>{sub}</span>}
      </div>
    </div>
  );
}

function Sidebar({ user, onLogout, navigate }) {
  return (
    <>
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
        {NAV_ITEMS.map(item=>(
          <div key={item.label} className={`nav-item ${item.active?'active':''}`}
            onClick={()=>item.path&&navigate(item.path)}
            style={{cursor:item.path?'pointer':'default'}}>
            <span className="nav-icon">{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>
      <div className="sidebar-user">
        <div className="user-avatar">{user?.full_name?.[0]?.toUpperCase()||'U'}</div>
        <div className="user-info">
          <span className="user-name">{user?.full_name}</span>
          <span className="user-role">{user?.company||'Marketing Team'}</span>
        </div>
        <button className="logout-btn" onClick={onLogout} title="Sign out">
          <svg viewBox="0 0 20 20" fill="currentColor" width="18" height="18">
            <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z"/>
          </svg>
        </button>
      </div>
    </>
  );
}

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  useEffect(()=>{ fetchData(); },[]);

  const fetchData = async () => {
    setLoading(true); setError('');
    try {
      const res = await budgetAPI.getCampaigns();
      setCampaigns(res.data.campaigns||[]);
    } catch(err) {
      setError(err.response?.data?.error||'Failed to load data');
    } finally { setLoading(false); }
  };

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const isNewUser   = campaigns.length===0;
  const totalBudget = campaigns.reduce((s,c)=>s+Number(c.budget||0),0);
  const totalSpent  = campaigns.filter(c=>c.status==='active'||c.status==='completed').reduce((s,c)=>s+Number(c.budget||0),0);
  const activeCamps = campaigns.filter(c=>c.status==='active').length;
  const avgBudget   = campaigns.length ? Math.round(totalBudget/campaigns.length) : 0;
  const recentCamps = [...campaigns].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,5);

  if (loading) return (
    <div className="dashboard-root">
      <aside className="sidebar"><Sidebar user={user} onLogout={handleLogout} navigate={navigate}/></aside>
      <main className="dashboard-main">
        <div className="db-skeleton-wrap">{[1,2,3,4].map(i=><div key={i} className="db-skeleton"/>)}</div>
      </main>
    </div>
  );

  return (
    <div className="dashboard-root">
      <aside className="sidebar"><Sidebar user={user} onLogout={handleLogout} navigate={navigate}/></aside>
      <main className="dashboard-main">

        {/* Header */}
        <header className="dashboard-header">
          <div>
            <h1>{isNewUser ? `Welcome, ${user?.full_name?.split(' ')[0]||'there'} 👋` : 'Dashboard 📊'}</h1>
            <p>{isNewUser ? 'Your AI-powered marketing budget optimizer' : `${activeCamps} active campaign${activeCamps!==1?'s':''} · Last updated just now`}</p>
          </div>
          {!isNewUser && <button className="btn-primary" onClick={fetchData}>↻ Refresh</button>}
        </header>

        {error && <div className="error-banner">{error}</div>}

        {/* ── NEW USER ── */}
        {isNewUser && (
          <div className="db-new-user">
            <div className="db-welcome-card">
              <div className="db-welcome-glow"/>
              <div className="db-welcome-icon">🚀</div>
              <h2>You haven't created any campaigns yet</h2>
              <p>Create your first campaign and let BudgetAI's ML engine allocate your budget across the best-performing channels — powered by 208,000+ real campaign records.</p>
              <button className="db-cta-btn" onClick={()=>navigate('/campaigns')}>
                <span>📈</span> Create Your First Campaign
              </button>
            </div>
            <div className="db-hints-grid">
              {[
                { icon:'🤖', title:'ML-Powered Allocation', desc:'Ensemble model trained on 208k campaigns recommends the best channel mix for your budget.' },
                { icon:'🎯', title:'Industry-Specific Priors', desc:'Beauty, SaaS, Fintech and 14 other verticals get tailored channel weights automatically.' },
                { icon:'📊', title:'Real-Time Insights', desc:'Track performance, adjust allocations and see ROI projections update instantly.' },
              ].map((h,i)=>(
                <div key={i} className="db-hint-card">
                  <span className="db-hint-icon">{h.icon}</span>
                  <h3>{h.title}</h3>
                  <p>{h.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── EXISTING USER ── */}
        {!isNewUser && (
          <>
            {/* KPIs */}
            <div className="db-kpi-row">
              <KPICard icon="📈" label="Total Campaigns"       value={campaigns.length}                              sub={`${activeCamps} active`}          color="#00d4aa"/>
              <KPICard icon="💵" label="Total Budget"          value={`₹${totalBudget.toLocaleString('en-IN')}`}     sub="across all campaigns"             color="#00b8d9"/>
              <KPICard icon="🔥" label="Total Spent"           value={`₹${totalSpent.toLocaleString('en-IN')}`}      sub="active + completed"               color="#7c3aed"/>
              <KPICard icon="💡" label="Avg. Budget / Campaign" value={`₹${avgBudget.toLocaleString('en-IN')}`}      sub="per campaign"                     color="#f59e0b"/>
            </div>

            <div className="db-grid">

              {/* Chart */}
              <div className="card db-chart-card">
                <div className="db-card-header">
                  <div>
                    <h2>Campaign Performance</h2>
                    <p className="card-subtitle">Budget by campaign · hover for details</p>
                  </div>
                  <button className="db-view-all-btn" onClick={()=>navigate('/campaigns')}>View All →</button>
                </div>
                <CampaignPerformanceChart campaigns={campaigns}/>
              </div>

              {/* Recent */}
              <div className="card db-recent-card">
                <div className="db-card-header">
                  <div>
                    <h2>Recent Campaigns</h2>
                    <p className="card-subtitle">Latest activity</p>
                  </div>
                  <button className="db-view-all-btn" onClick={()=>navigate('/campaigns')}>+ New →</button>
                </div>
                <div className="db-recent-list">
                  {recentCamps.map((c,i)=>{
                    const sc = STATUS_COLORS[c.status]||'#6b7280';
                    return (
                      <div key={c.id||i} className="db-recent-row">
                        <div className="db-recent-left">
                          <div className="db-recent-dot" style={{background:sc}}/>
                          <div className="db-recent-info">
                            <span className="db-recent-name">{c.name}</span>
                            {c.company_name && <span className="db-recent-company">{c.company_name}</span>}
                          </div>
                        </div>
                        <div className="db-recent-right">
                          <span className="db-recent-budget">₹{Number(c.budget).toLocaleString('en-IN')}</span>
                          <span className="db-recent-status" style={{background:sc+'18',color:sc,border:`1px solid ${sc}44`}}>{c.status}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <button className="db-cta-btn db-cta-sm" onClick={()=>navigate('/campaigns')}>
                  <span>📈</span> Manage Campaigns
                </button>
              </div>

              {/* Strategy mix */}
              <div className="card db-strat-card">
                <h2>Strategy Mix</h2>
                <p className="card-subtitle">How campaigns are optimised</p>
                <div className="db-strat-list">
                  {[['max_roi','#00d4aa'],['balanced','#00b8d9'],['growth','#7c3aed'],['awareness','#f59e0b']].map(([strat,color])=>{
                    const count = campaigns.filter(c=>c.strategy===strat).length;
                    const pct   = campaigns.length ? Math.round((count/campaigns.length)*100) : 0;
                    if (!count) return null;
                    return (
                      <div key={strat} className="db-strat-row">
                        <span className="db-strat-label">{strat.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</span>
                        <div className="db-strat-bar-track">
                          <div className="db-strat-bar-fill" style={{width:`${pct}%`,background:color}}/>
                        </div>
                        <span className="db-strat-count" style={{color}}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick actions */}
              <div className="card db-actions-card">
                <h2>Quick Actions</h2>
                <p className="card-subtitle">Jump to the tools you need</p>
                <div className="db-actions-list">
                  {[
                    { icon:'📈', label:'Create Campaign',         sub:'Set up a new campaign',      path:'/campaigns',       color:'#00d4aa' },
                    { icon:'🎯', label:'Get AI Recommendations',  sub:'Optimise budget allocation', path:'/recommendations', color:'#00b8d9' },
                    { icon:'📊', label:'View All Campaigns',      sub:`${campaigns.length} total`,  path:'/campaigns',       color:'#7c3aed' },
                  ].map((a,i)=>(
                    <button key={i} className="db-action-btn" onClick={()=>navigate(a.path)} style={{'--action-color':a.color}}>
                      <span className="db-action-icon" style={{background:a.color+'18',color:a.color}}>{a.icon}</span>
                      <div className="db-action-text">
                        <span className="db-action-label">{a.label}</span>
                        <span className="db-action-sub">{a.sub}</span>
                      </div>
                      <span className="db-action-arrow" style={{color:a.color}}>→</span>
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </>
        )}

      </main>
    </div>
  );
};

export default Dashboard;