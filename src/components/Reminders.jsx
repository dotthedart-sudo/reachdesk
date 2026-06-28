import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTeamIds } from '../lib/utils';
import { Bell, CheckCircle, Clock, Check, X } from 'lucide-react';

export default function Reminders({ currentUser, onSelectLead }) {
  const navigate = useNavigate();
  const [reminders, setReminders] = useState([]);
  const [adminRequests, setAdminRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReminders = async () => {
    setLoading(true);
    try {
      const teamIds = await getTeamIds(currentUser.id);
      const { data, error } = await supabase
        .from('follow_up_reminders')
        .select('*')
        .in('user_id', teamIds)
        .eq('status', 'pending')
        .order('scheduled_at', { ascending: true });

      if (error) {
        console.error('Error querying follow_up_reminders:', error);
      } else {
        setReminders(data || []);
      }

      const isAdmin = currentUser.role === 'admin' || currentUser.email === 'dotthedart@gmail.com';
      if (isAdmin) {
        const { data: reqs, error: reqsErr } = await supabase
          .from('admin_notifications')
          .select('*')
          .eq('type', 'upgrade_request')
          .eq('request_status', 'pending')
          .order('created_at', { ascending: false });

        if (!reqsErr) setAdminRequests(reqs || []);
      }
    } catch (err) {
      console.error('Error fetching reminders page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchReminders();
    }
  }, [currentUser]);

  const handleReminderAction = async (reminderId, actionStatus) => {
    try {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({ status: actionStatus, updated_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;
      setReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error(`Error updating reminder to ${actionStatus}:`, err);
    }
  };

  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  if (loading) {
    return <div className="loading-container">Loading reminders...</div>;
  }

  return (
    <div className="flex-col gap-4" style={{ textAlign: 'left' }}>
      <div className="flex justify-between align-center mb-4">
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Bell size={22} /> Follow-up Reminders</h2>
          <p className="color-muted" style={{ fontSize: '0.9rem' }}>
            Automated outreach follow-up schedule (+12h, +24h, +72h, +5d, +7d, +14d, +21d).
          </p>
        </div>
      </div>

      {reminders.length === 0 && adminRequests.length === 0 ? (
        <div className="card flex align-center gap-3 justify-center" style={{ minHeight: '200px', padding: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <CheckCircle size={40} style={{ color: 'var(--success-color)' }} />
            <h4 style={{ marginTop: '1rem', color: 'var(--success-color)' }}>You're all caught up!</h4>
            <p className="color-muted" style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>
              No pending follow-ups or upgrade requests right now.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {adminRequests.map(req => (
            <div key={req.id} className="card flex-col gap-3" style={{ border: '1px solid rgba(139, 92, 246, 0.4)', background: 'rgba(139, 92, 246, 0.03)', justifyContent: 'space-between' }}>
              <div>
                <div className="flex justify-between align-start">
                  <h4 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                    Upgrade Request
                  </h4>
                  <span className="badge badge-pending">
                    Pending
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                  User: {req.from_email}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Requested Plan: {req.requested_plan?.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Amount: Rs {req.paid_amount || 0} ({req.billing_cycle})
                </div>
              </div>
              <div className="flex gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                <button 
                  onClick={() => navigate('/admin')}
                  className="btn btn-primary btn-sm"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Review in Admin Panel
                </button>
              </div>
            </div>
          ))}

          {reminders.map(rem => {
            const isDue = new Date(rem.scheduled_at) <= new Date();
            const diffMs = Date.now() - new Date(rem.scheduled_at).getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

            return (
              <div key={rem.id} className="card flex-col gap-3" style={{ border: '1px solid var(--border-color)', justifyContent: 'space-between', background: isDue ? 'rgba(239, 68, 68, 0.02)' : 'var(--bg-card)' }}>
                <div>
                  <div className="flex justify-between align-start">
                    <h4 style={{ fontWeight: 600, fontSize: '1rem', margin: 0 }}>
                      {rem.lead_name || 'Lead'}
                    </h4>
                    <span className={`badge ${isDue ? 'badge-pending' : 'badge-starter'}`} style={isDue ? { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)', fontSize: '0.75rem', fontWeight: 600 } : { fontSize: '0.75rem' }}>
                      {isDue ? `Overdue (${diffHours}h)` : 'Scheduled'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Clock size={14} /> Reminder #{rem.reminder_number}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    Scheduled: {new Date(rem.scheduled_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-2" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '0.5rem' }}>
                  <button 
                    onClick={() => handleReminderAction(rem.id, 'completed')}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <Check size={14} /> Mark Done
                  </button>
                  <button 
                    onClick={() => handleReminderAction(rem.id, 'dismissed')}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center' }}
                  >
                    <X size={14} /> Dismiss
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
