import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, Clock, CheckCircle, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { updateLeadStatusAndCheckpoint, REPLY_CHECK_STATUSES, FOLLOW_UP_CHECK_STATUSES } from '../lib/reminders';

export default function UserNotificationBell({ profile, onRefreshProfile }) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [dueReminders, setDueReminders] = useState([]);
  const [adminNotifs, setAdminNotifs] = useState([]);
  const [suggestionRules, setSuggestionRules] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeReminderForModal, setActiveReminderForModal] = useState(null);
  const dropdownRef = useRef(null);
  // Tracks which reminder IDs we've already fired a browser Notification for
  const notifiedIds = useRef(new Set());

  // Load notified IDs from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('reachdesk_notified_reminders');
      if (saved) {
        const ids = JSON.parse(saved);
        ids.forEach(id => notifiedIds.current.add(id));
      }
    } catch (e) {
      console.warn('[Bell] Error loading notified reminders from localStorage:', e);
    }
  }, []);

  const saveNotifiedReminders = (newIds) => {
    try {
      localStorage.setItem('reachdesk_notified_reminders', JSON.stringify(Array.from(newIds)));
    } catch (e) {
      console.warn('[Bell] Error saving notified reminders to localStorage:', e);
    }
  };

  // Check for reminderId in query parameters (when notification is clicked)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const reminderId = params.get('reminderId');
    if (reminderId && profile?.id) {
      supabase
        .from('follow_up_reminders')
        .select('*, lead:leads(*)')
        .eq('id', reminderId)
        .single()
        .then(({ data, error }) => {
          if (!error && data && data.status === 'pending') {
            setActiveReminderForModal(data);
          }
        });
    }
  }, [window.location.search, profile?.id]);

  const isAdmin = profile?.role === 'admin' || profile?.email === 'dotthedart@gmail.com';

  const fetchNotifications = async () => {
    if (!profile?.id) return;
    try {
      const { data, error } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', profile.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (!error) {
        setNotifications(data || []);
      }
    } catch (err) {
      console.error('Error fetching user notifications:', err);
    }
  };

  const fetchDueReminders = async () => {
    if (!profile?.id) return;
    try {
      const { data: rules, error: rulesErr } = await supabase.from('action_suggestion_rules').select('*');
      if (!rulesErr && rules) {
        setSuggestionRules(rules);
      }

      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('follow_up_reminders')
        .select('*, lead:leads(*)')
        .eq('user_id', profile.id)
        .eq('status', 'pending')
        .lte('scheduled_at', now)
        .order('scheduled_at', { ascending: true });

      if (!error) {
        setDueReminders(data || []);

        let hasNewNotification = false;
        const currentNotified = new Set(notifiedIds.current);

        (data || []).forEach((rem) => {
          if (!currentNotified.has(rem.id)) {
            currentNotified.add(rem.id);
            hasNewNotification = true;

            // Trigger the in-app modal automatically if the app is open
            setActiveReminderForModal(rem);

            // 1. Local browser notification fallback
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('ReachDesk — Follow-up Due', {
                  body: `Did ${rem.lead_name || 'Lead'} reply? Tap to update status and stop reminders.`,
                  icon: '/android-chrome-192x192.png',
                  tag: `reminder-${rem.id}`,
                });
              } catch (notifErr) {
                console.warn('[Bell] Browser Notification failed:', notifErr);
              }
            }

            // 2. Global Web Push notification (sent to all logged in devices/browsers)
            supabase.functions.invoke('send-push-notification', {
              body: {
                target_user_id: profile.id,
                title: 'ReachDesk — Follow-up Due',
                body: `Did ${rem.lead_name || 'Lead'} reply? Tap to update status and stop reminders.`,
                url: `/dashboard?reminderId=${rem.id}`,
                tag: `reminder-${rem.id}`
              }
            }).catch(err => console.warn('[Push] Follow-up reminder push failed:', err));
          }
        });

        if (hasNewNotification) {
          notifiedIds.current = currentNotified;
          saveNotifiedReminders(currentNotified);
        }
      }
    } catch (err) {
      console.error('Error fetching due reminders:', err);
    }
  };

  const fetchAdminNotifs = async () => {
    if (!isAdmin) return;
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false });
      if (!error) setAdminNotifs(data || []);
    } catch (err) {
      console.error('Error fetching admin notifications:', err);
    }
  };

  const handleAcknowledgeAdmin = async (id, e) => {
    e?.stopPropagation();
    try {
      await supabase.from('admin_notifications').update({ is_read: true }).eq('id', id);
      setAdminNotifs(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      console.error('Error acknowledging admin notif:', err);
    }
  };


  useEffect(() => {
    if (profile?.id) {
      fetchNotifications();
      fetchDueReminders();
      if (isAdmin) fetchAdminNotifs();

      // Check due reminders every 5 minutes (300,000 ms)
      const interval = setInterval(() => {
        fetchDueReminders();
        fetchNotifications();
        if (isAdmin) fetchAdminNotifs();
      }, 5 * 60 * 1000);

      // Realtime subscription for live updates
      const channel = supabase.channel(`user-notifications-${profile.id}`)
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${profile.id}` }, 
          (payload) => {
            if (payload.new && !payload.new.is_read) {
              setNotifications(prev => [payload.new, ...prev]);
              if (onRefreshProfile) onRefreshProfile();
              // Fire browser Notification popup for in-app / PWA
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  new Notification(payload.new.title || 'ReachDesk', {
                    body: payload.new.message || 'You have a new notification',
                    icon: '/android-chrome-192x192.png',
                    tag: `user-notif-${payload.new.id}`,
                  });
                } catch (notifErr) {
                  console.warn('[Bell] Browser Notification (user_notifications) failed:', notifErr);
                }
              }
            }
          }
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'follow_up_reminders', filter: `user_id=eq.${profile.id}` },
          () => {
            fetchDueReminders();
          }
        );

      // Admin: subscribe to new admin_notifications (signups, upgrade requests)
      if (isAdmin) {
        channel.on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
          (payload) => {
            if (payload.new && !payload.new.is_read) {
              setAdminNotifs(prev => [payload.new, ...prev]);
              if ('Notification' in window && Notification.permission === 'granted') {
                try {
                  const fromEmail = payload.new.from_email || 'Someone';
                  const notifTitle = payload.new.type === 'new_signup'
                    ? 'ReachDesk — New Signup'
                    : 'ReachDesk — Upgrade Request';
                  const notifBody = payload.new.type === 'new_signup'
                    ? `${fromEmail} just signed up`
                    : payload.new.message || `${fromEmail} requested an upgrade`;
                  new Notification(notifTitle, {
                    body: notifBody,
                    icon: '/android-chrome-192x192.png',
                    tag: `admin-notif-${payload.new.id}`,
                  });
                } catch (notifErr) {
                  console.warn('[Bell] Admin browser Notification failed:', notifErr);
                }
              }
            }
          }
        );
      }

      channel.subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [profile?.id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (onRefreshProfile) onRefreshProfile();
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { error } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);

      if (error) throw error;
      setNotifications([]);
      if (onRefreshProfile) onRefreshProfile();
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const handleYesReplied = async (reminder) => {
    try {
      // 1. Dismiss all pending reminders for this lead
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('lead_id', reminder.lead_id)
        .eq('status', 'pending');

      if (error) throw error;

      // 2. Remove from local active reminders list
      setDueReminders(prev => prev.filter(r => r.lead_id !== reminder.lead_id));

      // 3. Set sessionStorage for CRM auto-open
      sessionStorage.setItem('reachdesk_auto_open_lead', JSON.stringify({
        leadId: reminder.lead_id,
        preselectStatus: 'Positive Reply'
      }));

      // 4. Navigate to CRM
      navigate('/crm');

      // 5. Dispatch event
      window.dispatchEvent(new Event('reachdesk_trigger_auto_open'));

      // 6. Dismiss modal
      setActiveReminderForModal(null);
    } catch (err) {
      console.error('Error handling Yes Replied:', err);
    }
  };

  const handleReminderOutcome = async (reminderId, leadObj, newStatus, extra = {}) => {
    try {
      await updateLeadStatusAndCheckpoint({
        lead: leadObj,
        newStatus,
        suggestionRules,
        currentUser: profile,
        extraUpdates: extra
      });

      const { error } = await supabase
        .from('follow_up_reminders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;
      setDueReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Error completing reminder outcome:', err);
    }
  };

  const handleReminderDismiss = async (reminderId) => {
    try {
      const { error } = await supabase
        .from('follow_up_reminders')
        .update({ status: 'dismissed', updated_at: new Date().toISOString() })
        .eq('id', reminderId);

      if (error) throw error;
      setDueReminders(prev => prev.filter(r => r.id !== reminderId));
    } catch (err) {
      console.error('Error dismissing reminder:', err);
    }
  };

  if (!profile) return null;

  const totalCount = notifications.length + dueReminders.length + (isAdmin ? adminNotifs.length : 0);

  return (
    <div ref={dropdownRef} style={{ position: 'fixed', top: '1.25rem', right: '1.5rem', zIndex: 995 }}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          border: '1px solid var(--border-color)',
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--glow-shadow)',
          position: 'relative',
          transition: 'all 0.2s',
          outline: 'none'
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Bell size={20} />
        {totalCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            background: 'var(--danger-color, #ef4444)',
            color: '#fff',
            borderRadius: '50%',
            width: '18px',
            height: '18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 700,
            boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
          }}>
            {totalCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '50px',
          right: 0,
          width: '350px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxHeight: '450px',
          overflowY: 'auto',
          color: 'var(--text-primary)'
        }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
              Notifications {totalCount > 0 && `(${totalCount})`}
            </span>
            {notifications.length > 0 && (
              <button 
                onClick={handleMarkAllRead}
                style={{ background: 'none', border: 'none', color: 'var(--primary-purple)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
              >
                Mark all read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {totalCount === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                No new notifications or pending follow-ups
              </div>
            ) : (
              <>
                {dueReminders.map(rem => {
                  if (!rem.lead) {
                    return (
                      <div
                        key={rem.id}
                        style={{
                          padding: '0.85rem',
                          background: 'rgba(139, 92, 246, 0.08)',
                          borderRadius: '8px',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.4rem'
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          Deleted Lead (ID: {rem.lead_id})
                        </span>
                        <button
                          onClick={() => handleReminderDismiss(rem.id)}
                          style={{
                            padding: '0.35rem',
                            background: 'transparent',
                            border: '0.5px solid var(--border-strong)',
                            color: 'var(--text-secondary)',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          Dismiss Reminder
                        </button>
                      </div>
                    );
                  }

                  const leadStatus = rem.lead.status || 'Lead';
                  const isReplyCheck = REPLY_CHECK_STATUSES.includes(leadStatus);
                  const isFollowUpCheck = FOLLOW_UP_CHECK_STATUSES.includes(leadStatus);
                  const firstName = rem.lead.name?.split(' ')[0] || 'they';

                  return (
                    <div
                      key={rem.id}
                      style={{
                        padding: '0.85rem',
                        background: 'rgba(139, 92, 246, 0.08)',
                        borderRadius: '8px',
                        border: '1px solid rgba(139, 92, 246, 0.25)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.4rem'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-purple, #8b5cf6)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <Clock size={15} />
                        <span>Follow-up Due</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                        Follow up with {rem.lead_name || 'Lead'} — Reminder #{rem.reminder_number}
                      </p>
                      
                      {isReplyCheck ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', marginTop: '0.3rem' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.35rem', width: '100%' }}>
                            <button
                              onClick={() => handleReminderOutcome(rem.id, rem.lead, 'Positive Reply', { reply_type: 'positive' })}
                              style={{
                                padding: '0.3rem',
                                background: 'transparent',
                                border: '0.5px solid var(--border-strong)',
                                color: 'var(--success-color)',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Positive reply
                            </button>
                            <button
                              onClick={() => handleReminderOutcome(rem.id, rem.lead, 'Booked', { reply_type: 'positive' })}
                              style={{
                                padding: '0.3rem',
                                background: 'transparent',
                                border: '0.5px solid var(--border-strong)',
                                color: '#8b5cf6',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Call booked
                            </button>
                            <button
                              onClick={() => handleReminderOutcome(rem.id, rem.lead, 'No Show / Rescheduled')}
                              style={{
                                padding: '0.3rem',
                                background: 'transparent',
                                border: '0.5px solid var(--border-strong)',
                                color: 'var(--warning-color)',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              No show
                            </button>
                            <button
                              onClick={() => handleReminderOutcome(rem.id, rem.lead, 'Not Interested', { reply_type: 'negative' })}
                              style={{
                                padding: '0.3rem',
                                background: 'transparent',
                                border: '0.5px solid var(--border-strong)',
                                color: 'var(--danger-color)',
                                borderRadius: '4px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                cursor: 'pointer'
                              }}
                            >
                              Negative reply
                            </button>
                          </div>
                          <button
                            onClick={() => handleReminderDismiss(rem.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-muted)',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              marginTop: '0.2rem'
                            }}
                          >
                            Dismiss Reminder
                          </button>
                        </div>
                      ) : isFollowUpCheck ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', marginTop: '0.3rem' }}>
                          <button
                            onClick={() => handleReminderOutcome(rem.id, rem.lead, 'Waiting')}
                            style={{
                              padding: '0.35rem',
                              background: 'var(--accent-blue)',
                              color: '#0D1117',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <Check size={12} /> Mark as done
                          </button>
                          <button
                            onClick={() => handleReminderDismiss(rem.id)}
                            style={{
                              padding: '0.35rem',
                              background: 'transparent',
                              border: '0.5px solid var(--border-strong)',
                              color: 'var(--text-secondary)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.25rem'
                            }}
                          >
                            <X size={12} /> Dismiss
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%', marginTop: '0.3rem' }}>
                          <button
                            onClick={() => handleReminderDismiss(rem.id)}
                            style={{
                              padding: '0.35rem',
                              background: 'transparent',
                              border: '0.5px solid var(--border-strong)',
                              color: 'var(--text-secondary)',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              width: '100%'
                            }}
                          >
                            Archive Reminder
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Standard User Notifications */}
                {notifications.map(n => (
                  <div 
                    key={n.id} 
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-secondary)',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.25rem',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)', paddingRight: '1.5rem' }}>
                        {n.title || 'Notification'}
                      </span>
                      <button
                        onClick={(e) => handleMarkRead(n.id, e)}
                        style={{
                          position: 'absolute',
                          top: '0.5rem',
                          right: '0.5rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '4px',
                          padding: '2px'
                        }}
                        title="Mark read"
                      >
                        <Check size={14} style={{ color: 'var(--success-color)' }} />
                      </button>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                      {n.message}
                    </p>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {/* Admin Notifications — new signups / upgrade requests */}
                {isAdmin && adminNotifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      navigate(`/admin?tab=users&userEmail=${encodeURIComponent(n.from_email || '')}`);
                      handleAcknowledgeAdmin(n.id);
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '0.85rem',
                      background: 'rgba(91, 143, 185, 0.08)',
                      borderRadius: '8px',
                      border: '1px solid rgba(91, 143, 185, 0.25)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = 'rgba(91, 143, 185, 0.15)'}
                    onMouseOut={e => e.currentTarget.style.background = 'rgba(91, 143, 185, 0.08)'}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--accent-blue, #5b8fb9)', fontWeight: 700, fontSize: '0.8rem' }}>
                      <Users size={13} />
                      <span>{n.type === 'new_signup' ? 'New Signup' : 'Upgrade Request'}</span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                      {n.from_email || '—'}
                    </p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.2rem' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        onClick={(e) => handleAcknowledgeAdmin(n.id, e)}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                        title="Acknowledge"
                      >
                        <Check size={13} style={{ color: 'var(--success-color)' }} />
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Follow-up Reminder Modal */}
      {activeReminderForModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999
        }}>
          <div style={{
            background: 'var(--bg-card, #0D1117)',
            border: '1px solid var(--border-color, #30363D)',
            borderRadius: '16px',
            padding: '2rem',
            width: '400px',
            maxWidth: '90%',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
            color: 'var(--text-primary, #F0F6FC)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.5rem',
            animation: 'scaleUp 0.2s ease-out'
          }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={20} style={{ color: 'var(--accent-blue, #5B8FB9)' }} />
              Follow-up Reminder
            </h3>
            
            {activeReminderForModal.lead ? (() => {
              const leadStatus = activeReminderForModal.lead.status || 'Lead';
              const isReplyCheck = REPLY_CHECK_STATUSES.includes(leadStatus);
              const isFollowUpCheck = FOLLOW_UP_CHECK_STATUSES.includes(leadStatus);
              const firstName = activeReminderForModal.lead.name?.split(' ')[0] || 'they';

              return (
                <>
                  <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>
                    {isReplyCheck 
                      ? `Did ${firstName} reply?` 
                      : (activeReminderForModal.lead.status === 'Calendly Sent' ? 'Did they book a call yet?' : `Did you follow up with ${firstName}?`)}
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                    {isReplyCheck ? (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            handleReminderOutcome(activeReminderForModal.id, activeReminderForModal.lead, 'Positive Reply', { reply_type: 'positive' });
                            setActiveReminderForModal(null);
                          }}
                          className="btn btn-secondary"
                          style={{ borderColor: 'var(--success-color)', color: 'var(--success-color)', fontWeight: 600 }}
                        >
                          Positive reply
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleReminderOutcome(activeReminderForModal.id, activeReminderForModal.lead, 'Booked', { reply_type: 'positive' });
                            setActiveReminderForModal(null);
                          }}
                          className="btn btn-secondary"
                          style={{ borderColor: '#8b5cf6', color: '#8b5cf6', fontWeight: 600 }}
                        >
                          Call booked
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleReminderOutcome(activeReminderForModal.id, activeReminderForModal.lead, 'No Show / Rescheduled');
                            setActiveReminderForModal(null);
                          }}
                          className="btn btn-secondary"
                          style={{ borderColor: 'var(--warning-color)', color: 'var(--warning-color)', fontWeight: 600 }}
                        >
                          No show
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            handleReminderOutcome(activeReminderForModal.id, activeReminderForModal.lead, 'Not Interested', { reply_type: 'negative' });
                            setActiveReminderForModal(null);
                          }}
                          className="btn btn-secondary"
                          style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontWeight: 600 }}
                        >
                          Negative reply
                        </button>
                      </div>
                    ) : isFollowUpCheck ? (
                      <button
                        type="button"
                        onClick={() => {
                          handleReminderOutcome(activeReminderForModal.id, activeReminderForModal.lead, 'Waiting');
                          setActiveReminderForModal(null);
                        }}
                        className="btn btn-primary"
                      >
                        Mark as done
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          handleReminderDismiss(activeReminderForModal.id);
                          setActiveReminderForModal(null);
                        }}
                        className="btn btn-secondary"
                      >
                        Archive Reminder
                      </button>
                    )}
                    
                    <button
                      type="button"
                      onClick={() => setActiveReminderForModal(null)}
                      className="btn btn-secondary"
                    >
                      Close
                    </button>
                  </div>
                </>
              );
            })() : (
              <>
                <p style={{ margin: 0, fontSize: '1rem', lineHeight: 1.5 }}>
                  This lead no longer exists.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      handleReminderDismiss(activeReminderForModal.id);
                      setActiveReminderForModal(null);
                    }}
                    className="btn btn-secondary"
                  >
                    Dismiss Reminder
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
