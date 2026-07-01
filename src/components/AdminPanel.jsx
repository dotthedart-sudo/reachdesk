import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { 
  Users, CheckCircle, ShieldAlert, Award, Zap, Bell, Clock, Eye, Trash2, RotateCcw, X, CreditCard, Check,
  ChevronDown, ChevronUp, Calendar, Search
} from 'lucide-react';

class AdminErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("AdminPanel Error Boundary caught an error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)', border: '1px solid var(--border-color)', margin: '2rem auto', maxWidth: '600px' }}>
          <h2 style={{ color: 'var(--danger-color)', marginBottom: '1rem' }}>Something went wrong.</h2>
          <p className="color-muted" style={{ marginBottom: '1.5rem' }}>
            The Admin Panel crashed due to a runtime error.
          </p>
          <pre style={{ textAlign: 'left', background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '8px', overflowX: 'auto', fontSize: '0.85rem', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
            {this.state.error?.toString()}
          </pre>
          <button className="btn btn-primary mt-4" onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AdminPanelContent({ currentUser }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useAppContext();
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState('requests'); // 'requests' | 'users'
  const [timeFilter, setTimeFilter] = useState('all_time');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedUserId, setExpandedUserId] = useState(null);
  const [userStats, setUserStats] = useState({});
  const [statsLoadingUserId, setStatsLoadingUserId] = useState(null);
  const [highlightEmail, setHighlightEmail] = useState(null);
  const highlightRef = useRef(null);
  const [requests, setRequests] = useState([]);
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  // Read URL params to jump to a specific tab/user
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    const userEmail = params.get('userEmail');
    if (tab === 'users') {
      setActiveTab('users');
    }
    if (userEmail) {
      setHighlightEmail(userEmail);
    }
  }, [location.search]);

  // Scroll highlighted user row into view
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightEmail, activeTab]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate('/login');
        return;
      }
      
      supabase.from('user_profiles')
        .select('role, email')
        .eq('id', session.user.id)
        .single()
        .then(({ data }) => {
          const isUserAdmin = data?.role === 'admin' || data?.email === 'dotthedart@gmail.com';
          if (!isUserAdmin) {
            navigate('/dashboard');
            return;
          }
          setIsAdmin(true);
          setAuthLoading(false);
        });
    });
  }, [navigate]);
  const [statsUser, setStatsUser] = useState(null);
  const [statsData, setStatsData] = useState({ leads: 0, templates: 0, revenue: 0, invoices: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  // 1. Fetch Upgrade Requests
  const fetchRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (err) {
      console.error('Error fetching requests:', err);
    }
  };

  // 2. Fetch User Profiles
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserList(data || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // 3. Auto-expire requests older than 3 days
  const runAutoExpireRequests = async () => {
    try {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      
      const { data: expired } = await supabase
        .from('admin_notifications')
        .select('from_user_id')
        .in('type', ['upgrade_request', 'plan_request'])
        .eq('is_read', false)
        .lt('created_at', threeDaysAgo);

      if (expired && expired.length > 0) {
        // Mark requests as read
        await supabase
          .from('admin_notifications')
          .update({ is_read: true })
          .in('type', ['upgrade_request', 'plan_request'])
          .eq('is_read', false)
          .lt('created_at', threeDaysAgo);

        // Reset user profiles pending state
        await supabase
          .from('user_profiles')
          .update({ payment_pending: false, requested_plan: null })
          .in('id', expired.map(e => e.from_user_id));
        
        fetchRequests();
        fetchUsers();
      }
    } catch (err) {
      console.error('Error running auto expire:', err);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;

    const init = async () => {
      setLoading(true);
      await Promise.all([fetchRequests(), fetchUsers(), runAutoExpireRequests()]);
      setLoading(false);
    };
    init();

    // Setup Realtime Subscription
    let channel;
    const hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
    
    try {
      channel = supabase.channel('admin-upgrades')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'admin_notifications' }, 
          (payload) => {
            setRequests(prev => [payload.new, ...prev]);
            if (hasNotificationSupport && Notification.permission === 'granted') {
              new Notification('ReachDesk', { body: payload.new.message });
            }
            fetchUsers();
          }
        )
        .subscribe();

      if (hasNotificationSupport && Notification.permission === 'default') {
        Notification.requestPermission();
      }
    } catch (err) {
      console.warn("Failed to initialize system notifications:", err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [isAdmin]);

  // Respond to User Upgrade Request
  const handleRespondRequest = async (reqId, action) => {
    const key = `${reqId}-${action}`;
    setActionLoading(prev => ({ ...prev, [key]: true }));
    try {
      const { data, error } = await supabase.functions.invoke('respond-upgrade-request', {
        body: { notificationId: reqId, action: action }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      showToast(`Request ${action === 'approve' ? 'approved' : 'declined'} successfully`, 'success');
      setRequests(prev => prev.filter(r => r.id !== reqId));
      fetchUsers();
    } catch (err) {
      console.error(err);
      alert(`Error responding to request: ${err.message || err}`);
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  // Delete/Deny User
  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to deny and lock out this user?')) return;
    try {
      const { error } = await supabase.from('user_profiles')
        .update({ status: 'denied' })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error('Error denying user:', err);
    }
  };

  // Restore User
  const handleRestoreUser = async (userId) => {
    try {
      const { error } = await supabase.from('user_profiles')
        .update({ status: 'pending' })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (err) {
      console.error('Error restoring user:', err);
    }
  };

  // View Read-Only Stats Modal
  const handleViewStats = async (user) => {
    setStatsUser(user);
    setStatsLoading(true);
    try {
      const { count: leadsCount } = await supabase.from('leads')
        .select('id', { count: 'exact', head: true }).eq('user_id', user.id);

      const { count: templatesCount } = await supabase.from('templates')
        .select('id', { count: 'exact', head: true }).eq('user_id', user.id);

      const { data: rev } = await supabase.from('revenue_entries')
        .select('amount').eq('user_id', user.id);

      const { count: invoicesCount } = await supabase.from('invoices')
        .select('id', { count: 'exact', head: true }).eq('user_id', user.id);

      const totalRevenue = rev?.reduce((s, r) => s + r.amount, 0) || 0;

      setStatsData({
        leads: leadsCount || 0,
        templates: templatesCount || 0,
        revenue: totalRevenue,
        invoices: invoicesCount || 0
      });
    } catch (err) {
      console.error('Error loading stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Acknowledge signup notification (no plan change)
  const handleAcknowledge = async (notifId) => {
    try {
      const { error } = await supabase.from('admin_notifications')
        .update({ is_read: true })
        .eq('id', notifId);
      if (error) throw error;
      setRequests(prev => prev.filter(r => r.id !== notifId));
    } catch (err) {
      console.error('Error acknowledging notification:', err);
    }
  };

  // ── Time filter helper ──
  const filterByTime = (user) => {
    if (timeFilter === 'all_time') return true;
    const now = new Date();
    const created = new Date(user.created_at);
    if (timeFilter === 'today') {
      return created.toDateString() === now.toDateString();
    }
    if (timeFilter === 'yesterday') {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      return created.toDateString() === y.toDateString();
    }
    if (timeFilter === 'this_week') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return created >= startOfWeek;
    }
    if (timeFilter === 'this_month') {
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }
    if (timeFilter === 'last_6mo') {
      const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 6);
      return created >= cutoff;
    }
    if (timeFilter === 'this_year') {
      return created.getFullYear() === now.getFullYear();
    }
    return true;
  };

  // ── Trial info helper ──
  const getTrialInfo = (user) => {
    const now = Date.now();
    const plan = (user.plan ?? '').toLowerCase();
    const status = (user.subscription_status ?? '').toLowerCase();
    const isPaid = ['starter', 'pro', 'teams', 'enterprise'].includes(plan) && plan !== 'trial';
    if (isPaid) return { label: 'Paid', color: '#3b82f6', badge: 'paid', daysLeft: null };
    const trialStart = user.created_at ? new Date(user.created_at) : null;
    const trialEnd = trialStart ? new Date(trialStart.getTime() + 7 * 24 * 60 * 60 * 1000) : null;
    if (!trialEnd) return { label: 'Unknown', color: 'var(--text-muted)', badge: 'unknown', daysLeft: null };
    const msLeft = trialEnd.getTime() - now;
    const daysLeft = Math.ceil(msLeft / (1000 * 60 * 60 * 24));
    if (daysLeft <= 0) return { label: 'Expired', color: '#ef4444', badge: 'expired', daysLeft: 0, trialStart, trialEnd };
    if (daysLeft <= 2) return { label: `${daysLeft}d left`, color: '#f59e0b', badge: 'expiring', daysLeft, trialStart, trialEnd };
    return { label: `${daysLeft}d left`, color: '#10b981', badge: 'active', daysLeft, trialStart, trialEnd };
  };

  // ── Expand / load per-user stats ──
  const handleToggleExpand = async (user) => {
    const uid = user.id;
    if (expandedUserId === uid) { setExpandedUserId(null); return; }
    setExpandedUserId(uid);
    if (userStats[uid]) return; // already loaded
    setStatsLoadingUserId(uid);
    try {
      const [{ count: leadsCount }, { count: stagesCount }] = await Promise.all([
        supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', uid),
        supabase.from('custom_statuses').select('id', { count: 'exact', head: true }).eq('user_id', uid),
      ]);
      const lastActivity = user.updated_at ?? user.created_at;
      setUserStats(prev => ({
        ...prev,
        [uid]: {
          leads: leadsCount ?? 0,
          stages: stagesCount ?? 0,
          lastActivity,
          plan: user.plan ?? 'trial',
        }
      }));
    } catch (err) {
      console.error('Failed to load user stats:', err);
    } finally {
      setStatsLoadingUserId(null);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem' }}>
        <div className="loading-spinner-inner" style={{ border: '3px solid rgba(139, 92, 246, 0.1)', borderTop: '3px solid var(--primary-purple)', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }}></div>
        <p className="color-muted">Checking administrator permissions...</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-container">Loading admin panel...</div>;
  }

  return (
    <div className="flex-col gap-4" style={{ textAlign: 'left' }}>
      <div className="flex justify-between align-center mb-4">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <img src="/reachdesk-logo.svg" alt="ReachDesk CRM" height="32" style={{objectFit: 'contain'}} />
            <span className="hp-logo" style={{ color: 'var(--text-primary)' }}>REACHDESK</span>
            <span style={{ fontSize: '0.85em', color: 'var(--text-muted)', fontWeight: 'normal', marginLeft: '0.25rem' }}>| System Admin Panel</span>
          </h2>
          <p className="color-muted" style={{ fontSize: '0.9rem' }}>
            Monitor users, manage subscriptions, and view system activity.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1px', marginBottom: '1.5rem' }}>
        <button 
          className={`btn ${activeTab === 'requests' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('requests')}
        >
          <Bell size={16} />
          Notifications ({requests.filter(r => !r.requested_plan).length})
        </button>
        <button 
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} />
          User Directory ({userList.length})
        </button>
      </div>

      {/* Active Tab View */}
      {activeTab === 'requests' ? (() => {
        const signups = requests.filter(r => !r.requested_plan);

        return (
          <div className="flex-col gap-4">
            {/* ── New Signups ── */}
            <div>
              <h4 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.75rem', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Users size={14} /> New Signups ({signups.length})
              </h4>
              {signups.length === 0 ? (
                <div className="card" style={{ padding: '1.25rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No new signup notifications.
                </div>
              ) : (
                <div className="flex-col gap-3">
                  {signups.map(req => (
                    <div key={req.id} className="card" style={{ border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                      <div>
                        <h4 style={{ fontWeight: 600 }}>{req.from_email ?? '—'}</h4>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          Signed up: {new Date(req.created_at).toLocaleString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAcknowledge(req.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ flexShrink: 0 }}
                      >
                        <CheckCircle size={14} /> Acknowledge
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {signups.length === 0 && (
              <div className="card flex align-center justify-center" style={{ minHeight: '200px', color: 'var(--text-muted)' }}>
                All caught up — no pending notifications.
              </div>
            )}
          </div>
        );
      })() : (
        /* ── User Directory ── */
        <div className="flex-col gap-3">

          {/* Controls Row: Time Filter + Search */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            {/* Time filter */}
            <div style={{ position: 'relative' }}>
              <Calendar size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <select
                value={timeFilter}
                onChange={e => setTimeFilter(e.target.value)}
                style={{
                  paddingLeft: '30px', paddingRight: '2rem', paddingTop: '0.45rem', paddingBottom: '0.45rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem',
                  cursor: 'pointer', outline: 'none', appearance: 'none', minWidth: '160px'
                }}
              >
                <option value="today">Today</option>
                <option value="yesterday">Yesterday</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
                <option value="last_6mo">Last 6 Months</option>
                <option value="this_year">This Year</option>
                <option value="all_time">All Time</option>
              </select>
              <ChevronDown size={12} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            </div>

            {/* Search */}
            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Search by email or name…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%', paddingLeft: '32px', paddingRight: '0.75rem',
                  paddingTop: '0.45rem', paddingBottom: '0.45rem',
                  background: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
                  borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.85rem', outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* User count */}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              {userList.filter(u => filterByTime(u) && (
                !searchQuery.trim() ||
                (u.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (u.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
              )).length} users
            </span>
          </div>

          {/* Table */}
          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '0.75rem 1rem', width: '28px' }}></th>
                  <th style={{ padding: '0.75rem 1rem' }}>User</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Signed Up</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Trial Status</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Plan</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {userList
                  .filter(user =>
                    filterByTime(user) && (
                      !searchQuery.trim() ||
                      (user.email ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                      (user.full_name ?? '').toLowerCase().includes(searchQuery.toLowerCase())
                    )
                  )
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map(user => {
                    const isHighlighted = highlightEmail && user.email === highlightEmail;
                    const isExpanded = expandedUserId === user.id;
                    const trial = getTrialInfo(user);
                    const stats = userStats[user.id];
                    const isStatsLoading = statsLoadingUserId === user.id;

                    // Trial badge styling
                    const badgeStyle = {
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      padding: '2px 8px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700,
                      background:
                        trial.badge === 'paid'     ? 'rgba(59,130,246,0.12)' :
                        trial.badge === 'active'   ? 'rgba(16,185,129,0.12)' :
                        trial.badge === 'expiring' ? 'rgba(245,158,11,0.12)' :
                        trial.badge === 'expired'  ? 'rgba(239,68,68,0.12)'  : 'rgba(100,116,139,0.12)',
                      color: trial.color,
                      border: `1px solid ${trial.color}33`,
                    };

                    return (
                      <React.Fragment key={user.id}>
                        {/* Main row */}
                        <tr
                          ref={isHighlighted ? highlightRef : null}
                          style={{
                            borderBottom: isExpanded ? 'none' : '1px solid var(--border-color)',
                            background: isHighlighted ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s ease',
                          }}
                          onClick={() => handleToggleExpand(user)}
                          onMouseEnter={e => { if (!isHighlighted) e.currentTarget.style.background = 'var(--bg-secondary)'; }}
                          onMouseLeave={e => { if (!isHighlighted) e.currentTarget.style.background = 'transparent'; }}
                        >
                          {/* Expand toggle */}
                          <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem', color: 'var(--text-muted)' }}>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </td>

                          {/* User Email */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user.email ?? '—'}</div>
                            {user.full_name && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '1px' }}>{user.full_name}</div>
                            )}
                            {isHighlighted && (
                              <span style={{ display: 'inline-block', fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, marginTop: '2px' }}>◄ New Signup</span>
                            )}
                            {user.payment_pending && (
                              <span className="badge badge-pending" style={{ fontSize: '0.68rem', marginTop: '2px' }}>Payment Pending</span>
                            )}
                          </td>

                          {/* Signed Up */}
                          <td style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            {user.created_at
                              ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                              : '—'}
                          </td>

                          {/* Trial Status Badge */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span style={badgeStyle}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: trial.color, flexShrink: 0 }} />
                              {trial.label}
                            </span>
                            {trial.trialEnd && trial.badge !== 'paid' && (
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                                Ends {trial.trialEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                              </div>
                            )}
                          </td>

                          {/* Plan */}
                          <td style={{ padding: '0.75rem 1rem' }}>
                            <span className={`badge ${
                              (user.plan ?? '') === 'enterprise' ? 'badge-approved' :
                              (user.plan ?? '') === 'pro' || (user.plan ?? '') === 'teams' ? 'badge-starter' :
                              'badge-pending'
                            }`} style={{ textTransform: 'capitalize' }}>
                              {user.plan ?? 'trial'}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                              <button onClick={() => handleViewStats(user)} className="btn btn-secondary btn-sm" title="View full stats">
                                <Eye size={12} /> Stats
                              </button>
                              {(user.status ?? '') === 'denied' ? (
                                <button onClick={() => handleRestoreUser(user.id)} className="btn btn-secondary btn-sm" style={{ color: 'var(--success-color)' }}>
                                  <RotateCcw size={12} /> Restore
                                </button>
                              ) : (
                                (user.email ?? '') !== 'dotthedart@gmail.com' && (
                                  <button onClick={() => handleDeleteUser(user.id)} className="btn btn-danger btn-sm">
                                    <Trash2 size={12} /> Delete
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expanded stats row */}
                        {isExpanded && (
                          <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td colSpan={6} style={{ padding: 0 }}>
                              <div style={{
                                background: 'var(--bg-tertiary)',
                                borderTop: '1px solid var(--border-color)',
                                padding: '1rem 1.25rem',
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                                gap: '1rem',
                              }}>
                                {isStatsLoading ? (
                                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.85rem', padding: '0.5rem 0' }}>
                                    Loading usage stats…
                                  </div>
                                ) : stats ? (
                                  <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Total Leads</span>
                                      <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.leads}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Pipeline Stages</span>
                                      <span style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-primary)' }}>{stats.stages}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Plan Type</span>
                                      <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'capitalize' }}>{stats.plan}</span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Last Activity</span>
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        {stats.lastActivity
                                          ? new Date(stats.lastActivity).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                          : '—'}
                                      </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                      <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Trial Start</span>
                                      <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        {user.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                                      </span>
                                    </div>
                                    {trial.trialEnd && (
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>Trial End</span>
                                        <span style={{ fontSize: '0.85rem', color: trial.color, fontWeight: 600 }}>
                                          {trial.trialEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                        </span>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <div style={{ gridColumn: '1 / -1', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No stats available.</div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Read-Only View Stats Modal */}
      {statsUser && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Eye size={18} /> Database Stats: {statsUser.email}
              </h3>
              <button onClick={() => setStatsUser(null)} className="theme-toggle"><X size={18} /></button>
            </div>
            {statsLoading ? (
              <div style={{ padding: '2rem', textAlign: 'center' }}>Loading user statistics...</div>
            ) : (
              <div className="flex-col gap-3" style={{ padding: '1rem 0' }}>
                <div className="flex justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span>Total Leads:</span>
                  <span style={{ fontWeight: 600 }}>{statsData.leads}</span>
                </div>
                <div className="flex justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span>Custom Templates:</span>
                  <span style={{ fontWeight: 600 }}>{statsData.templates}</span>
                </div>
                <div className="flex justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span>Client Invoices:</span>
                  <span style={{ fontWeight: 600 }}>{statsData.invoices}</span>
                </div>
                <div className="flex justify-between" style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--border-color)' }}>
                  <span>Total Earnings Logged:</span>
                  <span style={{ fontWeight: 600, color: 'var(--success-color)' }}>PKR {statsData.revenue.toLocaleString()}</span>
                </div>

                <div className="flex justify-end mt-4">
                  <button onClick={() => setStatsUser(null)} className="btn btn-primary">Close</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({ currentUser }) {
  return (
    <AdminErrorBoundary>
      <AdminPanelContent currentUser={currentUser} />
    </AdminErrorBoundary>
  );
}
