import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTeamIds, PLAN_LIMITS } from '../lib/utils';
import { 
  Users, Mail, MessageSquare, ThumbsUp, Trophy, Bell,
  ArrowRight, Lock
} from 'lucide-react';

export default function Dashboard({ currentUser, onSelectLead }) {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState({ total: 0, contacted: 0, replied: 0, positive: 0 });
  const [copyAnalytics, setCopyAnalytics] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  const plan = (currentUser.plan || 'trial').toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Get team IDs once
      const teamIds = await getTeamIds(currentUser.id);

      // Parallel fetches
      const metricPromise = (async () => {
        const [{ count: totalCount }, { count: contactedCount }, { count: repliedCount }, { count: positiveCount }] = await Promise.all([
          supabase.from('leads').select('id', { count: 'exact', head: true }).in('user_id', teamIds),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id).not('template_used', 'is', null),
          supabase.from('leads').select('id', { count: 'exact', head: true }).in('user_id', teamIds).not('reply_type', 'is', null),
          supabase.from('leads').select('id', { count: 'exact', head: true }).eq('user_id', currentUser.id).eq('reply_type', 'positive')
        ]);
        return { total: totalCount || 0, contacted: contactedCount || 0, replied: repliedCount || 0, positive: positiveCount || 0 };
      })();

      const copyPromise = (async () => {
        if (!limits.copyAnalytics) return [];
        
        // Fetch templates
        const { data: templatesData, error: templatesErr } = await supabase
          .from('templates')
          .select('id, title')
          .or(`user_id.eq.${currentUser.id},user_id.is.null`);
        if (templatesErr) throw templatesErr;

        // Fetch positive leads
        const { data: positiveLeads, error: leadsErr } = await supabase
          .from('leads')
          .select('template_used')
          .eq('user_id', currentUser.id)
          .eq('reply_type', 'positive')
          .not('template_used', 'is', null);
        if (leadsErr) throw leadsErr;

        // Group by template_used in JS
        const grouped = positiveLeads.reduce((acc, lead) => {
          acc[lead.template_used] = (acc[lead.template_used] || 0) + 1;
          return acc;
        }, {});

        // Map template UUIDs to titles and sort by count descending
        return Object.entries(grouped).map(([templateId, count]) => ({
          id: templateId,
          title: templatesData.find(t => t.id === templateId)?.title || 'Unknown',
          count
        })).sort((a, b) => b.count - a.count);
      })();

      const remindersPromise = (async () => {
        const now = new Date().toISOString();
        const { data: dueFollowups, error: remErr } = await supabase.from('follow_up_reminders')
          .select('*')
          .in('user_id', teamIds)
          .eq('status', 'pending')
          .lte('scheduled_at', now)
          .order('scheduled_at', { ascending: true })
          .limit(5);
        if (remErr) {
          console.error('Error fetching follow_up_reminders for dashboard:', remErr);
          return [];
        }
        return dueFollowups || [];
      })();

      const [metricsResult, copyAnalyticsResult, remindersResult] = await Promise.all([metricPromise, copyPromise, remindersPromise]);
      setMetrics(metricsResult);
      setCopyAnalytics(copyAnalyticsResult);
      setReminders(remindersResult);
    } catch (err) {
      console.error('Error loading dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };;

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser]);

  const getRateBarColor = (rate) => {
    if (rate >= 40) return 'var(--success-color)'; // Green
    if (rate >= 20) return 'var(--warning-color)'; // Amber
    return 'var(--danger-color)'; // Red
  };

  if (loading) {
    return <div className="loading-container">Loading analytics...</div>;
  }

  return (
    <div className="flex-col gap-4" style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Welcome back, {currentUser.full_name ? currentUser.full_name.trim().split(' ')[0] : currentUser.email.split('@')[0]}!</h2>
        <p className="color-muted">Outreach engine tracking, conversions, and follow-ups status.</p>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid-3 stats-grid">
        <div className="card flex align-center gap-3">
          <div style={{ padding: '0.75rem', borderRadius: '8px', background: 'rgba(91,143,185,0.1)', color: 'var(--accent-blue)' }}>
            <Users size={24} />
          </div>
          <div>
            <span className="card-title">Total CRM Leads</span>
            <div className="card-value">{metrics.total}</div>
          </div>
        </div>

        <div className="card flex align-center gap-3">
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6' }}>
            <Mail size={24} />
          </div>
          <div>
            <span className="card-title">Contacted Leads</span>
            <div className="card-value">{metrics.contacted}</div>
          </div>
        </div>

        <div className="card flex align-center gap-3">
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <MessageSquare size={24} />
          </div>
          <div>
            <span className="card-title">Replies Received</span>
            <div className="card-value">{metrics.replied}</div>
          </div>
        </div>

        <div className="card flex align-center gap-3">
          <div style={{ padding: '0.75rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success-color)' }}>
            <ThumbsUp size={24} />
          </div>
          <div>
            <span className="card-title">Positive Replies</span>
            <div className="card-value">{metrics.positive}</div>
          </div>
        </div>
      </div>

      {/* Copy Performance Section */}
      <div className="card" style={{ marginTop: '1.5rem', position: 'relative' }}>
        <h3 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Trophy size={18} style={{ color: '#f59e0b' }} /> Copy Performance & Reply Analytics
        </h3>

        {!limits.copyAnalytics ? (
          /* Locked Blurred View for Trial / Starter */
          <div style={{ position: 'relative', minHeight: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <div style={{ filter: 'blur(4px)', width: '100%', opacity: 0.3, pointerEvents: 'none' }}>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left' }}>
                    <th>Template</th>
                    <th>Platform</th>
                    <th>Sent</th>
                    <th>Positive</th>
                    <th>Rate</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Initial Cold Pitch red</td>
                    <td>LinkedIn</td>
                    <td>40</td>
                    <td>18</td>
                    <td>45%</td>
                  </tr>
                  <tr>
                    <td>LinkedIn Follow-up</td>
                    <td>Email</td>
                    <td>25</td>
                    <td>5</td>
                    <td>20%</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div 
              style={{
                position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', 
                alignItems: 'center', justifyContent: 'center', gap: '0.75rem', 
                background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(2px)', borderRadius: '8px'
              }}
            >
              <div style={{ padding: '0.75rem', borderRadius: '50%', background: 'rgba(91,143,185,0.1)', color: 'var(--accent-blue)' }}>
                <Lock size={20} />
              </div>
              <h4 style={{ fontWeight: 600 }}>Analytics Lockout</h4>
              <p className="color-muted" style={{ fontSize: '0.85rem', textAlign: 'center', maxWidth: '320px' }}>
                Upgrade to Pro, Teams, or Enterprise plan to view response tracking and template analytics.
              </p>
              <button onClick={() => navigate('/settings')} className="btn btn-primary btn-sm">
                Upgrade Plan
              </button>
            </div>
          </div>
        ) : copyAnalytics.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No outreach sends recorded yet. Use reply prompts in CRM to track results.
          </div>
        ) : (
          /* Normal performance table */
          <div style={{ overflowX: 'auto' }}>
            <table className="w-full" style={{ borderCollapse: 'collapse', width: '100%' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Template Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Positive Replies</th>
                </tr>
              </thead>
              <tbody>
                {copyAnalytics.map((item, index) => (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>
                      {index === 0 && <Trophy size={14} style={{ color: '#f59e0b', marginRight: '0.25rem', display: 'inline' }} />}
                      {item.title}
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: 'var(--success-color)', fontWeight: 600 }}>
                      {item.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Follow-up Reminders Preview Section */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="flex justify-between align-center mb-3">
          <h3 style={{ fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bell size={18} /> Urgent Follow-up Reminders
          </h3>
          {reminders.length > 0 && (
            <button onClick={() => navigate('/reminders')} className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              View All <ArrowRight size={14} />
            </button>
          )}
        </div>

        {reminders.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No pending follow-ups. You're completely up to date!
          </div>
        ) : (
          <div className="flex-col gap-3">
            {reminders.map(rem => {
              const diffMs = Date.now() - new Date(rem.scheduled_at).getTime();
              const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
              const diffMins = Math.floor(diffMs / (1000 * 60));
              let timeLabel = 'Just now';
              if (diffMins > 0 && diffMins < 60) timeLabel = `${diffMins} mins ago`;
              else if (diffHours >= 1 && diffHours < 24) timeLabel = `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
              else if (diffHours >= 24) {
                const days = Math.floor(diffHours / 24);
                timeLabel = `${days} day${days === 1 ? '' : 's'} ago`;
              }

              return (
                <div key={rem.id} className="flex justify-between align-center" style={{ padding: '0.75rem 1rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{rem.lead_name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Reminder #{rem.reminder_number} • Scheduled: {new Date(rem.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="flex gap-2 align-center">
                    <span className="badge badge-pending" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {timeLabel}
                    </span>
                    <button 
                      onClick={async () => {
                        await supabase.from('follow_up_reminders').update({ status: 'completed' }).eq('id', rem.id);
                        setReminders(prev => prev.filter(r => r.id !== rem.id));
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Mark Done
                    </button>
                    <button 
                      onClick={async () => {
                        await supabase.from('follow_up_reminders').update({ status: 'dismissed' }).eq('id', rem.id);
                        setReminders(prev => prev.filter(r => r.id !== rem.id));
                      }}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
