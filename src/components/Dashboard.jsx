import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CURRENCY_MAP } from './CurrencySelector';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { getTeamIds, PLAN_LIMITS } from '../lib/utils';
import { 
  updateLeadStatusAndCheckpoint, 
  applySuggestion, 
  getSuggestionForStatus, 
  REPLY_CHECK_STATUSES, 
  FOLLOW_UP_CHECK_STATUSES 
} from '../lib/reminders';
import { 
  Users, Mail, MessageSquare, ThumbsUp, Trophy, Bell,
  ArrowRight, Lock, TrendingUp, DollarSign, Activity,
  ChevronRight, Calendar, AlertCircle, Check, X, BarChart2
} from 'lucide-react';

import HelpPopover from './HelpPopover';
import { celebrateClosedWon } from '../utils/celebrateWin';


// Use the shared map so any currency code the user picks renders the correct symbol
const CURRENCY_SYMBOLS = CURRENCY_MAP;

function formatTimePhrasing(targetDateStr, type) {
  const targetDate = new Date(targetDateStr);
  const now = new Date();
  const diffMs = targetDate.getTime() - now.getTime();
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  
  if (type === 'invoice') {
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();
    
    if (isTomorrow || diffDays <= 1) {
      return "tomorrow";
    }
    return `in ${diffDays} days`;
  } else {
    if (diffHours < 24) {
      if (diffHours <= 0) {
        return "now";
      }
      if (diffHours === 1) {
        return "in 1 hour";
      }
      return `in ${diffHours} hours`;
    }
    
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = targetDate.toDateString() === tomorrow.toDateString();
    if (isTomorrow) {
      return "tomorrow";
    }
    
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return `in ${diffDays} days`;
  }
}

export default function Dashboard({ currentUser, onSelectLead }) {
  const navigate = useNavigate();
  const { showToast } = useAppContext() || {};
  const [metrics, setMetrics] = useState({ total: 0, contacted: 0, replied: 0, positive: 0 });
  const [copyAnalytics, setCopyAnalytics] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  // New States
  const [invoices, setInvoices] = useState([]);
  const [suggestionRules, setSuggestionRules] = useState([]);
  const [leadsList, setLeadsList] = useState([]);
  const [upNextFeed, setUpNextFeed] = useState([]);
  const [windowDays, setWindowDays] = useState(2);
  const [expandedReplies, setExpandedReplies] = useState({});
  const [ignoredMismatches, setIgnoredMismatches] = useState({});

  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  const plan = (currentUser.plan || 'trial').toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

  const loadDashboardData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const teamIds = await getTeamIds(currentUser.id);
      if (!teamIds || teamIds.length === 0 || teamIds.includes(undefined) || teamIds.includes(null)) {
        setLoading(false);
        return;
      }

      // Parallel Data Fetching
      const [invoicesRes, rulesRes, leadsRes, remindersRes] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', currentUser.id),
        supabase.from('action_suggestion_rules').select('*'),
        supabase.from('leads').select('id, first_name, last_name, status, created_at, last_contacted_at, action_to_take, next_checkpoint_at, template_used, reply_type, meeting_ends_at').in('user_id', teamIds).order('created_at', { ascending: false }).order('id', { ascending: true }),
        supabase.from('follow_up_reminders').select('*').eq('status', 'pending').lte('scheduled_at', new Date().toISOString()).order('scheduled_at', { ascending: true }).limit(3)
      ]);

      const loadedInvoices = invoicesRes.data || [];
      const loadedRules = rulesRes.data || [];
      const loadedLeads = leadsRes.data || [];
      const loadedReminders = remindersRes.data || [];

      setInvoices(loadedInvoices);
      setSuggestionRules(loadedRules);
      setLeadsList(loadedLeads);
      setReminders(loadedReminders);

      // 1. Calculate Core Metrics
      const totalLeads = loadedLeads.length;
      const contactedLeads = loadedLeads.filter(l => l.status === 'Contacted').length;
      const repliedLeads = loadedLeads.filter(l => ['Positive Reply', 'Booked', 'Closed Won'].includes(l.status)).length;
      const positiveReplies = loadedLeads.filter(l => l.status === 'Positive Reply').length;

      setMetrics({
        total: totalLeads,
        contacted: contactedLeads,
        replied: repliedLeads,
        positive: positiveReplies
      });

      // 2. Fetch Copy performance templates if allowed
      if (limits.copyAnalytics) {
        const { data: templatesData } = await supabase
          .from('templates')
          .select('id, title')
          .or(`user_id.eq.${currentUser.id},user_id.is.null`);

        const positiveLeadsByTemplate = loadedLeads.filter(l => l.reply_type === 'positive' && l.template_used);
        const counts = {};
        positiveLeadsByTemplate.forEach(l => {
          counts[l.template_used] = (counts[l.template_used] || 0) + 1;
        });

        const sortedAnalytics = Object.entries(counts).map(([templateId, count]) => {
          const matchedTemplate = (templatesData || []).find(t => t.id === templateId);
          return {
            id: templateId,
            title: matchedTemplate ? matchedTemplate.title : 'Unknown Template',
            count
          };
        }).sort((a, b) => b.count - a.count);

        setCopyAnalytics(sortedAnalytics);
      }

      // 3. Compile "Upcoming Next" Chronological Feed Items (priority: checkpoints -> invoices -> mismatches)
      const now = new Date();
      const nowStr = now.toISOString();
      const windowLimit = new Date(Date.now() + windowDays * 24 * 60 * 60 * 1000);
      const windowLimitStr = windowLimit.toISOString();

      // A. Upcoming Checkpoints (scheduled in the future, up to window days ahead)
      const upcomingCheckpoints = loadedLeads
        .filter(l => l.next_checkpoint_at && l.next_checkpoint_at > nowStr && l.next_checkpoint_at <= windowLimitStr)
        .map(l => ({
          id: `checkpoint-${l.id}`,
          type: 'checkpoint',
          lead: l,
          title: `Follow up with ${l.first_name || ''} ${l.last_name || ''}`,
          date: l.next_checkpoint_at,
          severity: 'high'
        }));

      // B. Upcoming Invoices Due (due_date in the future, up to window days ahead, unpaid)
      const upcomingInvoices = loadedInvoices
        .filter(inv => {
          if (inv.status?.toLowerCase() === 'paid') return false;
          if (!inv.due_date) return false;
          const dueDate = new Date(inv.due_date);
          return dueDate > now && dueDate <= windowLimit;
        })
        .map(inv => ({
          id: `invoice-${inv.id}`,
          type: 'invoice',
          invoice: inv,
          title: `Invoice #${inv.invoice_number} is due`,
          date: inv.due_date,
          severity: 'medium'
        }));

      // C. Suggestion Mismatches
      const mismatchItems = loadedLeads
        .filter(l => {
          const suggestion = getSuggestionForStatus(l.status, loadedRules);
          return suggestion && l.action_to_take !== suggestion;
        })
        .map(l => ({
          id: `mismatch-${l.id}`,
          type: 'mismatch',
          lead: l,
          title: `Suggestion mismatch for ${l.first_name || ''} ${l.last_name || ''}`,
          suggestion: getSuggestionForStatus(l.status, loadedRules),
          severity: 'medium'
        }));

      // D. Post-Meeting Check-Ins (lead status is 'Booked' and meeting_ends_at has already elapsed)
      const postMeetingCheckIns = loadedLeads
        .filter(l => l.status === 'Booked' && l.meeting_ends_at && l.meeting_ends_at <= nowStr)
        .map(l => ({
          id: `meeting-checkin-${l.id}`,
          type: 'meeting-checkin',
          lead: l,
          title: `How did your meeting with ${l.first_name || ''} go?`,
          date: l.meeting_ends_at,
          severity: 'high'
        }));

      // Sort and compile chronological feed: soonest first, mismatches last
      const combinedFeed = [...upcomingCheckpoints, ...upcomingInvoices, ...mismatchItems, ...postMeetingCheckIns];
      combinedFeed.sort((a, b) => {
        if (a.date && b.date) {
          return new Date(a.date) - new Date(b.date);
        }
        if (a.date && !b.date) return -1;
        if (!a.date && b.date) return 1;
        return 0;
      });

      setUpNextFeed(combinedFeed);

    } catch (err) {
      console.error('Error loading dashboard analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [currentUser, windowDays]);

  // Unified Handler: Suggestion mismatch apply
  const handleApplyMismatchSuggestion = async (lead, suggestion) => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({ action_to_take: suggestion })
        .eq('id', lead.id);
      if (error) throw error;
      loadDashboardData();
    } catch (err) {
      console.error('Error applying suggestion mismatch:', err);
      alert('Failed to apply suggestion: ' + err.message);
    }
  };

  // Unified Handler: Checkpoint outcome — uses same object signature as CheckpointPopover
  const handleLogCheckpointOutcome = async (lead, targetStatus, extraUpdates = {}) => {
    try {
      const updatedLead = await updateLeadStatusAndCheckpoint({
        lead,
        newStatus: targetStatus,
        suggestionRules,
        currentUser,
        extraUpdates
      });
      if (updatedLead?.draftCreated && showToast) {
        showToast(`Draft invoice generated for ${[updatedLead.first_name, updatedLead.last_name].filter(Boolean).join(' ') || 'Lead'}`);
      }
      
      // Mark corresponding pending reminders as completed
      const { error: cancelError } = await supabase
        .from('follow_up_reminders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('lead_id', lead.id)
        .eq('status', 'pending');

      if (cancelError) {
        console.warn('Could not cancel pending reminders:', cancelError);
      }

      loadDashboardData();
      if (targetStatus === 'Closed Won' && lead.status !== 'Closed Won') {
        celebrateClosedWon();
      }
    } catch (err) {
      console.error('Error logging checkpoint outcome:', err);
      alert('Failed to update: ' + err.message);
    }
  };

  // Unified Handler: Log Meeting Outcome
  const handleLogMeetingOutcome = async (lead, targetStatus) => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const updatedLead = await updateLeadStatusAndCheckpoint({
        lead,
        newStatus: targetStatus,
        suggestionRules,
        currentUser,
        extraUpdates: {
          last_contacted_at: todayStr,
          meeting_ends_at: null
        }
      });
      if (updatedLead?.draftCreated && showToast) {
        showToast(`Draft invoice generated for ${[updatedLead.first_name, updatedLead.last_name].filter(Boolean).join(' ') || 'Lead'}`);
      }
      
      // Mark corresponding pending reminders as completed
      const { error: cancelError } = await supabase
        .from('follow_up_reminders')
        .update({ status: 'completed', updated_at: new Date().toISOString() })
        .eq('lead_id', lead.id)
        .eq('status', 'pending');

      if (cancelError) {
        console.warn('Could not cancel pending reminders:', cancelError);
      }

      loadDashboardData();
      if (targetStatus === 'Closed Won' && lead.status !== 'Closed Won') {
        celebrateClosedWon();
      }
    } catch (err) {
      console.error('Error logging meeting outcome:', err);
      alert('Failed to update: ' + err.message);
    }
  };

  // Unified Handler: Overdue Invoice Friendly Reminder Copy
  const handleCopyInvoiceReminder = (inv) => {
    const template = `Hi ${inv.client_name},\n\nHope you are doing well.\n\nThis is a friendly reminder that invoice #${inv.invoice_number} for $${inv.total} was due on ${new Date(inv.due_date).toLocaleDateString()}.\n\nPlease let me know when we can expect payment.\n\nBest regards,\n${currentUser.full_name || 'ReachDesk User'}`;
    navigator.clipboard.writeText(template);
    alert(`Friendly reminder template copied for Invoice #${inv.invoice_number}!`);
  };

  if (loading) {
    return <div className="loading-container">Loading analytics...</div>;
  }

  // Calculate Monthly Collected Revenue (this calendar month only, case-insensitive)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const thisMonthPaidInvoices = invoices.filter(inv => {
    if (inv.status?.toLowerCase() !== 'paid') return false;
    const date = new Date(inv.issue_date || inv.created_at);
    return date.getFullYear() === currentYear && date.getMonth() === currentMonth;
  });
  const totalRevenueCollected = thisMonthPaidInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const revenueTarget = Number(currentUser.monthly_revenue_target) || 0;
  const targetPct = revenueTarget > 0 ? Math.min(100, Math.round((totalRevenueCollected / revenueTarget) * 100)) : 0;

  // Calculate Pitching Velocity (Leads created/contacted in last 7 days)
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const weeklyPitchCount = leadsList.filter(l => {
    const created = l.created_at ? new Date(l.created_at).getTime() : 0;
    const contacted = l.last_contacted_at ? new Date(l.last_contacted_at).getTime() : 0;
    return created >= sevenDaysAgo || contacted >= sevenDaysAgo;
  }).length;

  let velocityLevel = 'low';
  let velocityColor = 'var(--danger-color)';
  let velocityMsg = 'Pipeline is cooling down. Increase pitching velocity.';
  let dialPercentage = 20; // 0.2 of gauge

  if (weeklyPitchCount >= 8) {
    velocityLevel = 'high';
    velocityColor = 'var(--success-color)';
    velocityMsg = 'Excellent outreach drive. High pipeline growth!';
    dialPercentage = 100;
  } else if (weeklyPitchCount >= 3) {
    velocityLevel = 'medium';
    velocityColor = 'var(--warning-color)';
    velocityMsg = 'Healthy pitching volume. Keep the momentum going.';
    dialPercentage = 60;
  }

  const pathLength = 126; // arc circumference length
  const dashOffset = pathLength * (1 - dialPercentage / 100);

  // Stepper calculations (7 stages count)
  const forwardStages = ['Lead', 'Contacted', 'Positive Reply', 'Proposal Sent', 'Calendly Sent', 'Booked', 'Closed Won'];
  const stageCounts = {};
  forwardStages.forEach(st => {
    stageCounts[st] = leadsList.filter(l => l.status === st).length;
  });

  return (
    <div className="flex-col gap-4" style={{ textAlign: 'left' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2>Welcome back, <span>{currentUser.full_name ? currentUser.full_name.trim().split(' ')[0] : currentUser.email.split('@')[0]}</span>!</h2>
        <p className="color-muted">Outreach engine tracking, conversions, and follow-ups status.</p>
      </div>

      {metrics.total === 0 && !loading ? (
        <div className="card empty-state" style={{ marginTop: 'var(--space-5)' }}>
          <div className="empty-state-icon" style={{ width: 56, height: 56, color: 'var(--accent-blue)', background: 'var(--bg-selected)', borderColor: 'var(--border)' }}>
            <BarChart2 size={28} />
          </div>
          <h3 className="empty-state-title">Your Dashboard is Quiet</h3>
          <p className="empty-state-desc">
            Once you add leads and log interactions, your conversion metrics, pitching velocity, and pipeline progression will light up here.
          </p>
          <button onClick={() => navigate('/leads')} className="btn btn-primary">
            Go to CRM Leads →
          </button>
        </div>
      ) : (
        <>
          {/* Primary KPIs Row — uses dash-kpi-grid so the mobile @media override
              (max-width 768px → 1-column stack) applies correctly */}
      <div className="dash-kpi-grid">
        
        {/* Leads card */}
        <div className="card flex align-start gap-3" style={{ minHeight: 140 }}>
          <div style={{ padding: 'var(--space-3)', borderRadius: 'var(--radius-lg)', background: 'var(--bg-selected)', color: 'var(--accent-blue)', display: 'flex', alignSelf: 'center' }}>
            <Users size={24} />
          </div>
          <div style={{ width: '100%' }}>
            <span className="card-title">Leads Overview</span>
            <div className="card-value" style={{ margin: 'var(--space-1) 0' }}>{metrics.total}</div>
            
            {/* Contacted / Replied / Positive mini-stats
                flex-wrap + min-width ensures the 3rd item never clips
                regardless of sidebar state or card width */}
            <div style={{
              display: 'flex',
              gap: 'var(--space-3)',
              marginTop: 'var(--space-2)',
              borderTop: '1px solid var(--border)',
              paddingTop: 'var(--space-2)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-secondary)',
              flexWrap: 'wrap'
            }}>
              <div style={{ minWidth: '70px' }}>Contacted: <strong style={{ color: 'var(--text-primary)' }}>{metrics.contacted}</strong></div>
              <div style={{ minWidth: '60px' }}>Replied: <strong style={{ color: 'var(--text-primary)' }}>{metrics.replied}</strong></div>
              <div style={{ minWidth: '65px' }}>Positive: <strong style={{ color: 'var(--success-color)' }}>{metrics.positive}</strong></div>
            </div>
          </div>
        </div>

        {/* Revenue progress card */}
        <div className="card flex-col justify-between" style={{ minHeight: 140 }}>
          <div className="flex align-center justify-between" style={{ width: '100%' }}>
            <span className="card-title">Invoices Collected</span>
            <DollarSign size={18} style={{ color: 'var(--success-color)' }} />
          </div>

          {(() => {
            const userCurrency = CURRENCY_SYMBOLS[currentUser?.default_currency] || '$';
            return (
              <>
                {revenueTarget > 0 ? (
                  <div style={{ marginTop: 'var(--space-2)', width: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span className="card-value" style={{ fontSize: 'var(--text-xl)' }} data-ph-mask>{userCurrency}{totalRevenueCollected}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }} data-ph-mask>target: {userCurrency}{revenueTarget}</span>
                    </div>
                    <div style={{ width: '100%', height: 8, background: 'var(--border-strong)', borderRadius: 'var(--radius-sm)', marginTop: 'var(--space-2)', overflow: 'hidden' }}>
                      <div style={{ width: `${targetPct}%`, height: '100%', background: 'var(--success-color)', borderRadius: 'var(--radius-sm)', transition: 'width 0.4s ease' }} />
                    </div>
                    <span className="card-subtext">
                      {targetPct}% of your monthly target
                    </span>
                  </div>
                ) : (
                  <div style={{ marginTop: 'var(--space-2)', width: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      Set your monthly target to see progress here
                    </span>
                    <button 
                      onClick={() => navigate('/configuration')} 
                      className="btn btn-secondary btn-sm" 
                      style={{ marginTop: 'var(--space-2)', width: '100%', justifyContent: 'center' }}
                    >
                      Set Monthly Target
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Velocity Dial card */}
        <div className="card flex justify-between align-center" style={{ minHeight: 140 }}>
          <div>
            <span className="card-title">Outreach Velocity</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
              <span style={{ textTransform: 'uppercase', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-body)', fontWeight: 600, letterSpacing: 'var(--tracking-label)', color: velocityColor }}>
                {velocityLevel}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>({weeklyPitchCount} pitches)</span>
            </div>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)', maxWidth: 150, lineHeight: 'var(--leading-tight)', wordBreak: 'break-word' }}>
              {velocityMsg}
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="45" viewBox="0 0 100 55" style={{ display: 'block', margin: '0 auto' }}>
              {/* Back track */}
              <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="var(--border-strong)" strokeWidth="10" strokeLinecap="round" />
              {/* Filled progress */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke={velocityColor} 
                strokeWidth="10" 
                strokeLinecap="round" 
                strokeDasharray={pathLength} 
                strokeDashoffset={dashOffset} 
                style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
              />
            </svg>
            <span style={{ fontSize: 'var(--text-3xs)', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: 'var(--space-1)', fontWeight: 600, letterSpacing: 'var(--tracking-label)' }}>Last 7 Days</span>
          </div>
        </div>

      </div>

      {/* Stepper Pipeline Flow */}
      <div className="card" style={{ marginTop: '0.5rem' }}>
        <h3 style={{ fontSize: '0.9rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-secondary)' }}>
          <TrendingUp size={16} /> Lead Progression Pipeline
        </h3>

        {/*
          Two-row stepper that scrolls horizontally on mobile without breaking.
          Row 1: dots + inline dashed connectors (no absolute positioning)
          Row 2: labels aligned under each dot via the same fixed-width columns
          Both rows share a wrapper with overflow-x: auto.
        */}
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: '0.5rem' }}>
          {/* Shared grid: each stage gets a 72px column, connectors get 1fr */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: forwardStages.map((_, i) =>
              i < forwardStages.length - 1 ? '72px 1fr' : '72px'
            ).join(' '),
            minWidth: `${forwardStages.length * 72 + (forwardStages.length - 1) * 40}px`,
            rowGap: '0.4rem'
          }}>

            {/* Row 1 — dots + connectors */}
            {forwardStages.map((st, i) => {
              const hasLeads = stageCounts[st] > 0;
              return [
                /* Node column */
                <div key={`node-${st}`} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '28px' }}>
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    background: hasLeads ? 'var(--accent-blue)' : 'var(--bg-card)',
                    border: `2px solid ${hasLeads ? 'var(--accent-blue)' : 'var(--border-strong)'}`,
                    color: hasLeads ? '#fff' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 800,
                    flexShrink: 0,
                    boxShadow: hasLeads ? '0 0 8px rgba(91,143,185,0.35)' : 'none',
                    zIndex: 1,
                    position: 'relative'
                  }}>
                    {stageCounts[st]}
                  </div>
                </div>,

                /* Connector column (not rendered after last node) */
                i < forwardStages.length - 1 && (
                  <div key={`conn-${st}`} style={{ display: 'flex', alignItems: 'center', height: '28px' }}>
                    <div style={{
                      width: '100%',
                      height: '2px',
                      borderTop: '2px dashed var(--border-strong)'
                    }} />
                  </div>
                )
              ];
            })}

            {/* Row 2 — labels under each dot */}
            {forwardStages.map((st, i) => {
              const hasLeads = stageCounts[st] > 0;
              return [
                /* Label under node */
                <div key={`label-${st}`} style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    fontSize: '0.62rem',
                    color: hasLeads ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: hasLeads ? 600 : 400,
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    lineHeight: 1.2
                  }}>
                    {st}
                  </span>
                </div>,

                /* Empty spacer under connector */
                i < forwardStages.length - 1 && (
                  <div key={`label-space-${st}`} />
                )
              ];
            })}

          </div>
        </div>
      </div>


      {/* Main Dual Grid: Column 1 = Up Next chronological feed, Column 2 = Urgent Reminders & Templates */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '0.5rem' }}>
        
        {/* Column 1: Upcoming Next Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
            <Activity size={18} style={{ color: 'var(--accent-blue)' }} /> Upcoming Next
            <HelpPopover title="Upcoming Next Feed">
              Shows upcoming follow-up checkpoints, invoice due dates, and suggestion mismatches within the next N days. Use the days dropdown to widen or narrow the window.
            </HelpPopover>
          </h3>

          {upNextFeed.filter(item => item.type !== 'mismatch' || !ignoredMismatches[item.lead.id]).length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <div>Nothing coming up in the next {windowDays} days.</div>
              {windowDays === 2 ? (
                <div style={{ marginTop: '0.75rem' }}>
                  <button 
                    onClick={() => setWindowDays(7)} 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', display: 'inline-flex', padding: '0.25rem 0.5rem' }}
                  >
                    Show more (next 7 days)
                  </button>
                </div>
              ) : (
                <div style={{ marginTop: '0.75rem' }}>
                  <button 
                    onClick={() => setWindowDays(2)} 
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', display: 'inline-flex', padding: '0.25rem 0.5rem' }}
                  >
                    Show less (next 2 days)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-col gap-3">
              {upNextFeed
                .filter(item => item.type !== 'mismatch' || !ignoredMismatches[item.lead.id])
                .map((item) => {
                  const isCheckpoint = item.type === 'checkpoint';
                  const isInvoice = item.type === 'invoice';
                  const isMismatch = item.type === 'mismatch';
                  const isMeetingCheckIn = item.type === 'meeting-checkin';

                  if (isMeetingCheckIn) {
                    const firstName = item.lead.first_name || 'they';
                    return (
                      <div 
                        key={item.id} 
                        className="flex-col gap-2" 
                        style={{ 
                          padding: '0.85rem 1rem', 
                          borderRadius: '8px', 
                          background: 'var(--bg-card-hover)', 
                          border: '1px solid var(--border)' 
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          How did your meeting with <span data-ph-mask>{firstName}</span> go?
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginTop: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                          <button
                            onClick={() => handleLogMeetingOutcome(item.lead, 'Closed Won')}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px', justifyContent: 'center', height: '28px' }}
                          >
                            Closed Won
                          </button>
                          <button
                            onClick={() => handleLogMeetingOutcome(item.lead, 'Not Interested')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px', justifyContent: 'center', height: '28px' }}
                          >
                            Not Interested
                          </button>
                          <button
                            onClick={() => handleLogMeetingOutcome(item.lead, 'Rescheduled')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px', justifyContent: 'center', height: '28px' }}
                          >
                            Rescheduled
                          </button>
                          <button
                            onClick={() => handleLogMeetingOutcome(item.lead, 'Positive Reply')}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: '0.72rem', padding: '4px', justifyContent: 'center', height: '28px' }}
                          >
                            Still Deciding
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isCheckpoint) {
                    const firstName = item.lead.first_name || 'they';
                    const lowerName = firstName.toLowerCase();
                    const isFemale = ['sarah', 'priya', 'maria', 'anna', 'laura', 'jessica', 'emily', 'elizabeth', 'charlotte'].includes(lowerName);
                    const pronoun = isFemale ? 'she' : 'they';
                    const pronounWill = isFemale ? "she'll" : "they'll";
                    const pronounReplied = isFemale ? "she replied" : "they replied";
                    const isExpanded = !!expandedReplies[item.lead.id];

                    return (
                      <div 
                        key={item.id} 
                        className="flex-col gap-2" 
                        style={{ 
                          padding: '0.85rem 1rem', 
                          borderRadius: '8px', 
                          background: 'var(--bg-card-hover)', 
                          border: '1px solid var(--border)' 
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          Follow up with <span data-ph-mask>{item.lead.first_name || ''} {item.lead.last_name || ''}</span> — {pronounWill} need a follow-up {formatTimePhrasing(item.date, 'checkpoint')} if {pronoun} hasn't replied yet.
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                          {!isExpanded ? (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                              <button
                                onClick={() => handleLogCheckpointOutcome(item.lead, item.lead.status)}
                                className="btn btn-secondary btn-sm"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', height: '28px' }}
                              >
                                Not yet
                              </button>
                              <button
                                onClick={() => setExpandedReplies(prev => ({ ...prev, [item.lead.id]: true }))}
                                className="btn btn-primary btn-sm"
                                style={{ flex: 1, justifyContent: 'center', fontSize: '0.75rem', height: '28px' }}
                              >
                                Yes, {pronounReplied}
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>What was the outcome?</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                                <button
                                  onClick={() => handleLogCheckpointOutcome(item.lead, 'Positive Reply', { reply_type: 'positive' })}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px', borderColor: 'var(--success-color)', color: 'var(--success-color)', fontWeight: 600 }}
                                >
                                  Positive reply
                                </button>
                                <button
                                  onClick={() => handleLogCheckpointOutcome(item.lead, 'Booked', { reply_type: 'positive' })}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px', borderColor: '#8b5cf6', color: '#8b5cf6', fontWeight: 600 }}
                                >
                                  Call booked
                                </button>
                                <button
                                  onClick={() => handleLogCheckpointOutcome(item.lead, 'Not Interested', { reply_type: 'negative' })}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontWeight: 600 }}
                                >
                                  Not interested
                                </button>
                                <button
                                  onClick={() => handleLogCheckpointOutcome(item.lead, 'No Show / Rescheduled')}
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '0.72rem', padding: '4px', borderColor: 'var(--warning-color)', color: 'var(--warning-color)', fontWeight: 600 }}
                                >
                                  Other
                                </button>
                              </div>
                              <button
                                onClick={() => setExpandedReplies(prev => ({ ...prev, [item.lead.id]: false }))}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: '0.7rem', padding: '2px', border: 'none', color: 'var(--text-muted)' }}
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (isInvoice) {
                    return (
                      <div 
                        key={item.id} 
                        className="flex-col gap-2" 
                        style={{ 
                          padding: '0.85rem 1rem', 
                          borderRadius: '8px', 
                          background: 'var(--bg-card-hover)', 
                          border: '1px solid var(--border)' 
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          Invoice #${item.invoice.invoice_number} for {item.invoice.client_name || 'Client'} is due {formatTimePhrasing(item.date, 'invoice')} (${item.invoice.total || 0}).
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                          <button
                            onClick={() => navigate('/invoices')}
                            className="btn btn-primary btn-sm"
                            style={{ width: '100%', justifyContent: 'center', fontSize: '0.75rem', height: '28px' }}
                          >
                            View Invoice
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (isMismatch) {
                    return (
                      <div 
                        key={item.id} 
                        className="flex-col gap-2" 
                        style={{ 
                          padding: '0.85rem 1rem', 
                          borderRadius: '8px', 
                          background: 'var(--bg-card-hover)', 
                          border: '1px solid var(--border)' 
                        }}
                      >
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                          You marked {item.lead.first_name || ''}'s next step as '{item.lead.action_to_take || 'No Action'}' — we'd suggest '{item.suggestion}' instead.
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                          <button 
                            onClick={() => handleApplyMismatchSuggestion(item.lead, item.suggestion)}
                            className="btn btn-primary btn-sm" 
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', height: '28px' }}
                          >
                            Update to suggestion
                          </button>
                          <button 
                            onClick={() => setIgnoredMismatches(prev => ({ ...prev, [item.lead.id]: true }))}
                            className="btn btn-secondary btn-sm" 
                            style={{ flex: 1, justifyContent: 'center', fontSize: '0.72rem', height: '28px' }}
                          >
                            Keep as is
                          </button>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })}
              
              {/* Show more/less toggle at the bottom of the feed list */}
              <div style={{ marginTop: '0.5rem', textAlign: 'center' }}>
                {windowDays === 2 ? (
                  <button 
                    onClick={() => setWindowDays(7)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: '100%', justifyContent: 'center' }}
                  >
                    Show more (next 7 days)
                  </button>
                ) : (
                  <button 
                    onClick={() => setWindowDays(2)}
                    className="btn btn-secondary btn-sm"
                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', width: '100%', justifyContent: 'center' }}
                  >
                    Show less (next 2 days)
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Urgent Follow-ups Preview & Templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          
          {/* Urgent Follow-up Reminders */}
          <div className="card">
            <div className="flex justify-between align-center mb-3">
              <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Bell size={18} style={{ color: 'var(--danger-color)' }} /> Pending Reminders
              </h3>
              {reminders.length > 0 && (
                <button onClick={() => navigate('/reminders')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.15rem' }}>
                  All <ArrowRight size={12} />
                </button>
              )}
            </div>

            {reminders.length === 0 ? (
              <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No pending follow-up alerts.
              </div>
            ) : (
              <div className="flex-col gap-2">
                {reminders.map(rem => {
                  const diffMs = Date.now() - new Date(rem.scheduled_at).getTime();
                  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                  const diffMins = Math.floor(diffMs / (1000 * 60));
                  let timeLabel = 'Just now';
                  if (diffMins > 0 && diffMins < 60) timeLabel = `${diffMins} mins ago`;
                  else if (diffHours >= 1 && diffHours < 24) timeLabel = `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
                  else if (diffHours >= 24) {
                    const days = Math.floor(diffHours / 24);
                    timeLabel = `${days} day${days === 1 ? '' : 's'} ago`;
                  }

                  return (
                    <div key={rem.id} className="flex justify-between align-center" style={{ padding: '0.6rem 0.75rem', border: '1px solid var(--border)', borderRadius: '6px', background: 'var(--bg-card-hover)', fontSize: '0.8rem' }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{rem.lead_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Reminder #{rem.reminder_number}
                        </div>
                      </div>
                      <div className="flex gap-1 align-center">
                        <span style={{ fontSize: '0.65rem', marginRight: '0.4rem', color: 'var(--danger-color)', fontWeight: 600 }}>
                          {timeLabel}
                        </span>
                        <button 
                          onClick={async () => {
                            await supabase.from('follow_up_reminders').update({ status: 'completed' }).eq('id', rem.id);
                            setReminders(prev => prev.filter(r => r.id !== rem.id));
                          }}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '0.65rem', padding: '0.2rem 0.4rem' }}
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Copy Performance Analytics */}
          <div className="card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Trophy size={18} style={{ color: '#f59e0b' }} /> Template Stats
            </h3>

            {!limits.copyAnalytics ? (
              <div style={{ position: 'relative', minHeight: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <div style={{ filter: 'blur(3px)', width: '100%', opacity: 0.25, pointerEvents: 'none' }}>
                  <table style={{ width: '100%', fontSize: '0.75rem' }}>
                    <tbody>
                      <tr><td>Cold Pitch Template</td><td>3 replies</td></tr>
                      <tr><td>Follow-up sequence</td><td>1 reply</td></tr>
                    </tbody>
                  </table>
                </div>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}>
                  <Lock size={14} style={{ color: 'var(--text-muted)' }} />
                  <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Analytics Locked</span>
                  <button onClick={() => navigate('/configuration')} className="btn btn-secondary btn-sm" style={{ fontSize: '0.65rem', padding: '0.15rem 0.35rem', marginTop: '0.2rem' }}>
                    Upgrade
                  </button>
                </div>
              </div>
            ) : copyAnalytics.length === 0 ? (
              <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                No outreach metrics recorded.
              </div>
            ) : (
              <div style={{ overflowX: 'auto', maxHeight: '150px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '0.4rem' }}>Template</th>
                      <th style={{ padding: '0.4rem', textAlign: 'right' }}>Replies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {copyAnalytics.slice(0, 3).map((item, idx) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '0.4rem', fontWeight: 500 }}>
                          {idx === 0 && <Trophy size={13} style={{ color: '#E8A838', marginRight: '0.25rem', display: 'inline-block', verticalAlign: 'middle' }} />}
                          {item.title}
                        </td>
                        <td style={{ padding: '0.4rem', color: 'var(--success-color)', fontWeight: 600, textAlign: 'right' }}>
                          {item.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

      </div>
      </>
      )}
    </div>
  );
}
