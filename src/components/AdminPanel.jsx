import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { 
  Users, CheckCircle, ShieldAlert, Award, Zap, Bell, Clock, Eye, Trash2, RotateCcw, X, CreditCard, Check 
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
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/reachdesk-logo.svg" height="32" alt="ReachDesk CRM" />
            System Admin Panel
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
        /* User Directory */
        <div className="flex-col gap-3">
          {/* Folder Filter */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            {[
              { key: 'all',     label: 'All Users',     icon: null },
              { key: 'trial',   label: 'Trial Users',   icon: null },
              { key: 'paid',    label: 'Paid Users',    icon: null },
              { key: 'expired', label: 'Expired Users', icon: null },
            ].map(folder => (
              <button
                key={folder.key}
                onClick={() => setUserFolder(folder.key)}
                className={`btn btn-sm ${userFolder === folder.key ? 'btn-primary' : 'btn-secondary'}`}
              >
                {folder.label}
                <span style={{ marginLeft: '4px', opacity: 0.7, fontSize: '0.75rem' }}>
                  ({userList.filter(u => {
                    if (folder.key === 'all') return true;
                    const now = Date.now();
                    const plan = (u.plan ?? '').toLowerCase();
                    const status = (u.subscription_status ?? '').toLowerCase();
                    const trialEnds = u.trial_ends_at ? new Date(u.trial_ends_at).getTime() : null;
                    const planExpires = u.plan_expires_at ? new Date(u.plan_expires_at).getTime() : null;
                    if (folder.key === 'trial') return plan === 'trial' || status === 'trial' || (trialEnds && trialEnds > now && !planExpires);
                    if (folder.key === 'paid') return (plan === 'starter' || plan === 'pro' || plan === 'teams' || plan === 'enterprise') && planExpires && planExpires > now;
                    if (folder.key === 'expired') return planExpires && planExpires < now;
                    return false;
                  }).length})
                </span>
              </button>
            ))}
          </div>

          <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>User Email</th>
                <th style={{ padding: '0.75rem 1rem' }}>Plan</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem' }}>Expiry</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {userList.filter(user => {
                const now = Date.now();
                const plan = (user.plan ?? '').toLowerCase();
                const status = (user.subscription_status ?? '').toLowerCase();
                const trialEnds = user.trial_ends_at ? new Date(user.trial_ends_at).getTime() : null;
                const planExpires = user.plan_expires_at ? new Date(user.plan_expires_at).getTime() : null;
                if (userFolder === 'all') return true;
                if (userFolder === 'trial') return plan === 'trial' || status === 'trial' || (trialEnds && trialEnds > now && !planExpires);
                if (userFolder === 'paid') return (plan === 'starter' || plan === 'pro' || plan === 'teams' || plan === 'enterprise') && planExpires && planExpires > now;
                if (userFolder === 'expired') return planExpires && planExpires < now;
                return false;
              }).map(user => {
                const isHighlighted = highlightEmail && user.email === highlightEmail;
                return (
                <tr
                  key={user.id}
                  ref={isHighlighted ? highlightRef : null}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    background: isHighlighted ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                    outline: isHighlighted ? '2px solid rgba(245, 158, 11, 0.5)' : 'none',
                    transition: 'background 0.3s ease'
                  }}
                >
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ fontWeight: 600 }}>{user.email ?? '—'}</div>
                    {user.payment_pending && (
                      <span className="badge badge-pending" style={{ fontSize: '0.7rem', marginTop: '0.2rem' }}>Payment Pending</span>
                    )}
                    {isHighlighted && (
                      <span style={{ display: 'inline-block', fontSize: '0.68rem', color: '#f59e0b', fontWeight: 700, marginLeft: '6px' }}>◄ New Signup</span>
                    )}
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span className={`badge ${
                      (user.plan ?? '') === 'enterprise' ? 'badge-approved' :
                      (user.plan ?? '') === 'pro' || (user.plan ?? '') === 'teams' ? 'badge-starter' :
                      'badge-pending'
                    }`} style={{ textTransform: 'capitalize' }}>
                      {user.plan ?? 'trial'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem' }}>
                    <span
                      className={`badge ${
                        (user.status ?? '') === 'approved' ? 'badge-approved' :
                        (user.status ?? '') === 'denied' ? 'badge-pending' : 'badge-starter'
                      }`}
                      style={(user.status ?? '') === 'denied' ? { backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' } : {}}
                    >
                      {user.status ?? '—'}
                    </span>
                  </td>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem' }}>
                    {(() => {
                      const isTrial = (user.plan ?? '') === 'trial' || (user.status ?? '') === 'trial';
                      if (isTrial) {
                        const dateStr = user.trial_ends_at 
                          ? new Date(user.trial_ends_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                          : '—';
                        return (
                          <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                            Trial — {dateStr}
                          </span>
                        );
                      }
                      
                      if ((user.plan ?? '') === 'enterprise') {
                        return (
                          <span style={{ color: '#8b5cf6', fontWeight: 600 }}>
                            Lifetime
                          </span>
                        );
                      }
                      
                      if (user.plan_expires_at) {
                        const dateStr = new Date(user.plan_expires_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                        const now = Date.now();
                        const expiry = new Date(user.plan_expires_at).getTime();
                        const daysLeft = (expiry - now) / (1000 * 60 * 60 * 24);
                        
                        let color = '#10b981'; // green
                        if (daysLeft < 0) {
                          color = '#ef4444'; // red
                        } else if (daysLeft < 30) {
                          color = '#f59e0b'; // orange
                        }
                        
                        return (
                          <span style={{ color, fontWeight: 600 }}>
                            {dateStr}
                          </span>
                        );
                      }
                      
                      return <span style={{ color: 'var(--text-muted)' }}>—</span>;
                    })()}
                  </td>
                  <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => handleViewStats(user)} className="btn btn-secondary btn-sm">
                        <Eye size={12} /> View
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
