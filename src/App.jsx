import React, { useState, useEffect, useRef, createContext, useContext, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { getTeamIds, PLAN_LIMITS } from './lib/utils';
import { Lock } from 'lucide-react';
import { subscribeToPush } from './utils/pushNotifications';

// Components
// Lazy‑loaded route components for better initial load performance
const CRM = lazy(() => import('./components/CRM'));
const Templates = lazy(() => import('./components/Templates'));
const InvoiceGenerator = lazy(() => import('./components/InvoiceGenerator'));
const RevenueTracker = lazy(() => import('./components/RevenueTracker'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const Homepage = lazy(() => import('./components/Homepage'));
const Auth = lazy(() => import('./components/Auth'));
const Configuration = lazy(() => import('./components/Configuration'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const NotesList = lazy(() => import('./components/NotesList'));
const NoteEditor = lazy(() => import('./components/NoteEditor'));
const Reminders = lazy(() => import('./components/Reminders'));
const AppLayout = lazy(() => import('./components/AppLayout'));
const ProtectedRoute = lazy(() => import('./components/ProtectedRoute'));
const UpgradeRoute = lazy(() => import('./components/ProtectedRoute').then(m => ({ default: m.UpgradeRoute })));
const AdminRoute = lazy(() => import('./components/AdminRoute'));
const LoadingSpinner = lazy(() => import('./components/LoadingSpinner'));
const UpgradePage = lazy(() => import('./components/Paywalls').then(m => ({ default: m.UpgradePage })));
const PublicInvoice = lazy(() => import('./components/PublicInvoice'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const TermsOfService = lazy(() => import('./components/LegalPages').then(m => ({ default: m.TermsOfService })));
const PrivacyPolicy = lazy(() => import('./components/LegalPages').then(m => ({ default: m.PrivacyPolicy })));
const RefundPolicy = lazy(() => import('./components/LegalPages').then(m => ({ default: m.RefundPolicy })));
const GetStarted = lazy(() => import('./components/GetStarted'));
import UserNotificationBell from './components/UserNotificationBell';

// App Context
export const AppContext = createContext(null);
export const useAppContext = () => useContext(AppContext);

const STARTER_TEMPLATES = [
  // 1. INITIAL TEMPLATES
  {
    id: 'starter-new-1',
    title: 'Cold Opener — Straight Up',
    platform: 'INITIAL TEMPLATES',
    subject: '',
    body: "Hey [Name], came across your work and thought there might be a good fit here. I help [niche] with [result]. Worth a quick chat?",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-2',
    title: 'Cold Opener — Value First',
    platform: 'INITIAL TEMPLATES',
    subject: '',
    body: "Hey [Name], noticed [specific thing about them]. I recently helped someone in a similar space get [result]. Would love to share how — open to a 10-min call?",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-3',
    title: 'Cold Opener — Question Hook',
    platform: 'INITIAL TEMPLATES',
    subject: '',
    body: "Hey [Name], quick question — are you currently looking to [goal/pain point]? Working with a few [niche] clients on exactly this.",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-4',
    title: 'Cold Opener — Compliment + Ask',
    platform: 'INITIAL TEMPLATES',
    subject: '',
    body: "Hey [Name], loved [specific work/post]. I work with [niche] to help them [result]. Would it make sense to connect?",
    is_starter: true,
    user_id: null
  },
  // 2. FOLLOW UPS
  {
    id: 'starter-new-5',
    title: 'Follow Up #1 — Day 2',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], just checking if you saw my last message. Still think there's something here worth exploring — let me know!",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-6',
    title: 'Follow Up #2 — Day 4',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], I know you're busy. Just wanted to bump this up. Happy to keep it super short — even 10 mins works.",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-7',
    title: 'Follow Up #3 — Day 7',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], throwing this back up in case it got buried. Would love to show you what we've been doing for [niche] lately.",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-8',
    title: 'Follow Up #4 — Day 10',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], still here if the timing wasn't right before. Things move fast — happy to reconnect whenever works for you.",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-9',
    title: 'Follow Up #5 — Day 14',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], one more nudge — I genuinely think [result] is achievable for you. Worth 10 mins to find out?",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-10',
    title: 'Follow Up #6 — Day 21',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], been a while! Circling back in case things have changed on your end. Still happy to help with [pain point].",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-11',
    title: 'Follow Up #7 — Breakup',
    platform: 'FOLLOW UPS',
    subject: '',
    body: "Hey [Name], I'll stop reaching out after this — don't want to clutter your inbox. If you ever need help with [result], you know where to find me. Wishing you the best!",
    is_starter: true,
    user_id: null
  },
  // 3. BOOKING MESSAGES
  {
    id: 'starter-new-12',
    title: 'Calendar Link Send',
    platform: 'BOOKING MESSAGES',
    subject: '',
    body: "Hey [Name], great connecting! Here's my calendar link to book a time that works for you: [Calendar Link]. Looking forward to it!",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-13',
    title: 'Reschedule Request',
    platform: 'BOOKING MESSAGES',
    subject: '',
    body: "Hey [Name], something came up on my end — so sorry! Would you be open to rescheduling? Here's my link: [Calendar Link].",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-14',
    title: 'Reminder Before Call',
    platform: 'BOOKING MESSAGES',
    subject: '',
    body: "Hey [Name], just a quick reminder — we have a call scheduled for [Date/Time]. Looking forward to chatting!",
    is_starter: true,
    user_id: null
  },
  // 4. AFTER BOOKED
  {
    id: 'starter-new-15',
    title: 'Confirmation Message',
    platform: 'AFTER BOOKED',
    subject: '',
    body: "Hey [Name], confirmed for [Date/Time]! I'll send over a quick agenda beforehand. Feel free to reach out if anything changes.",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-16',
    title: 'Pre-Call Prep',
    platform: 'AFTER BOOKED',
    subject: '',
    body: "Hey [Name], our call is tomorrow! Just wanted to share what we'll cover: [agenda points]. See you then!",
    is_starter: true,
    user_id: null
  },
  // 5. AFTER CLIENT BOOKED
  {
    id: 'starter-new-17',
    title: 'Onboarding Welcome',
    platform: 'AFTER CLIENT BOOKED',
    subject: '',
    body: "Hey [Name], so excited to work together! Here's what happens next: [onboarding steps]. Feel free to reach out anytime.",
    is_starter: true,
    user_id: null
  },
  {
    id: 'starter-new-18',
    title: 'First Check-In',
    platform: 'AFTER CLIENT BOOKED',
    subject: '',
    body: "Hey [Name], checking in after our first week together! How's everything going? Any questions or feedback — I'm all ears.",
    is_starter: true,
    user_id: null
  }
];

function AppProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subStatus, setSubStatus] = useState('active');
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState('dark');
  const [brandName, setBrandName] = useState('ReachDesk');
  const [currencySymbol, setCurrencySymbol] = useState('PKR');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [bankAccount, setBankAccount] = useState('');
  const [bankIban, setBankIban] = useState('');
  const [teamIds, setTeamIds] = useState([]);
  const [teamProfilesMap, setTeamProfilesMap] = useState({});
  const [leads, setLeads] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [revenueLogs, setRevenueLogs] = useState([]);
  const [adminNotifCount, setAdminNotifCount] = useState(0);
  const [remindersCount, setRemindersCount] = useState(0);
  const [toast, setToast] = useState(null);

  // Tracks the user ID whose profile is currently loaded.
  // Using a ref (not state) so the onAuthStateChange closure always reads
  // the latest value — refs are never stale even inside [] effects.
  const loadedUserIdRef = useRef(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Realtime subscription for admin upgrade requests
  useEffect(() => {
    const isAdmin = profile?.role === 'admin' || profile?.email === 'dotthedart@gmail.com';
    if (!session || !isAdmin) return;

    const channel = supabase.channel('admin-notifications-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'admin_notifications' },
        (payload) => {
          if (payload.new && payload.new.type === 'upgrade_request' && payload.new.request_status === 'pending') {
            showToast(`New upgrade request from ${payload.new.from_email || 'user'}`, 'info');
            setAdminNotifCount(prev => prev + 1);
            setRemindersCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session, profile]);

  // Subscribe to web push after profile is loaded
  useEffect(() => {
    if (profile?.id) {
      subscribeToPush(supabase, profile.id);
    }
  }, [profile?.id]);

  // Initial setup
  useEffect(() => {
    const localTheme = localStorage.getItem('reachdesk_theme') || 'dark';
    setTheme(localTheme);
    if (localTheme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');

    setBrandName(localStorage.getItem('reachdesk_brand_name') || 'ReachDesk');
    setCurrencySymbol(localStorage.getItem('reachdesk_currency_symbol') || 'PKR');
    setWebhookUrl(localStorage.getItem('reachdesk_webhook_url') || '');
    setBankAccount(localStorage.getItem('reachdesk_bank_account') || '');
    setBankIban(localStorage.getItem('reachdesk_bank_iban') || '');
  }, []);

  // Auth listener
  useEffect(() => {
    // Intercept recovery token early in the lifecycle before Supabase cleans it up
    const hash = window.location.hash || '';
    if (hash.includes('type=recovery') || hash.includes('access_token')) {
      sessionStorage.setItem('is_recovering_password', 'true');
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchProfile(session.user.id, session);
      } else {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);

      if (event === 'PASSWORD_RECOVERY') {
        sessionStorage.setItem('is_recovering_password', 'true');
      }

      if (session) {
        // Only run fetchProfile if we haven't already loaded this user's profile.
        // loadedUserIdRef is a ref — it always reads the live value, never stale.
        // This suppresses TOKEN_REFRESHED, SIGNED_IN, INITIAL_SESSION re-fires
        // that happen on every tab switch, which were wiping forms and showing
        // the full-page loading spinner unnecessarily.
        if (loadedUserIdRef.current !== session.user.id) {
          // Pass the live session explicitly — the React `session` state is still
          // stale inside fetchProfile's closure when called from this callback.
          fetchProfile(session.user.id, session);
        }
      } else {
        // Signed out — clear the ref so next login loads fresh
        loadedUserIdRef.current = null;
        setProfile(null);
        setSubStatus('active');
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkSubscriptionStatus = async (p) => {
    if (p.role === 'admin' || p.email === 'dotthedart@gmail.com') return 'active';
    if (p.status === 'denied') return 'denied';
    if (p.plan === 'enterprise') return 'active';

    if (p.plan === 'trial') {
      if (p.trial_ends_at && new Date(p.trial_ends_at) < new Date()) {
        return 'trial_expired';
      }
    } else {
      if (p.plan_expires_at && new Date(p.plan_expires_at) < new Date()) {
        return 'subscription_expired';
      }
    }

    if (p.status === 'pending') return 'pending';
    return 'active';
  };

  const fetchProfile = async (userId, liveSession) => {
    if (!userId) {
      setLoading(false);
      return;
    }
    // Only show the loading spinner on first load (ref not yet set).
    // On any subsequent call for the same user, keep the UI intact.
    if (!loadedUserIdRef.current) {
      setLoading(true);
    }
    let attempts = 0;
    const maxAttempts = 4;
    while (attempts < maxAttempts) {
      try {
        let { data: p, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) throw error;

        // Use the explicitly-passed liveSession (fresh from Supabase callback) so we
        // never read the stale React `session` state — it may still be null when
        // onAuthStateChange calls fetchProfile for a new Google OAuth user.
        const activeSession = liveSession ?? session;
        // Only create a profile from scratch when the row doesn't exist at all.
        // Do NOT enter this block for existing users with an empty full_name —
        // that would upsert a fresh trial_ends_at and reset their trial.
        if (activeSession && activeSession.user.id === userId && !p) {
          const email = activeSession.user.email;
          const fullName = activeSession.user.user_metadata?.full_name || activeSession.user.user_metadata?.name || '';
          const avatarUrl = activeSession.user.user_metadata?.avatar_url || null;
          const requestedPlan = activeSession.user.user_metadata?.requested_plan || 'trial';
          const referralSource = activeSession.user.user_metadata?.referral_source || null;
          const marketingConsent = activeSession.user.user_metadata?.marketing_consent || false;

          const { data: invite } = await supabase.from('team_invitations')
            .select('*').eq('invited_email', email).eq('status', 'pending').maybeSingle();

          const teamId = invite ? invite.team_id : null;
          const status = 'approved';
          const userPlan = invite ? 'teams' : 'trial';
          const trialEnds = new Date(Date.now() + 168 * 60 * 60 * 1000).toISOString();

          const profileData = {
            id: userId,
            email,
            status,
            plan: userPlan,
            requested_plan: invite ? 'teams' : requestedPlan,
            trial_ends_at: trialEnds,
            team_id: teamId,
            team_role: teamId ? 'member' : 'owner',
            full_name: fullName,
            referral_source: referralSource,
            marketing_consent: marketingConsent
          };

          // Only include avatar_url if it's set in metadata, to avoid overwriting a non-null database value
          if (avatarUrl) {
            profileData.avatar_url = avatarUrl;
          }

          const { data: newProfile, error: profileErr } = await supabase.from('user_profiles').upsert(profileData).select().single();

          if (profileErr) {
            console.error('Failed to auto-create/update user profile:', profileErr);
            throw profileErr;
          }

          if (invite) {
            await supabase.from('team_invitations').update({ status: 'accepted' }).eq('id', invite.id);
          }

          const isGoogle = activeSession.user.app_metadata?.provider === 'google';
          supabase.functions.invoke('send-push-notification', {
            body: {
              notify_admin: true,
              notification_type: 'new_signup',
              from_email: email,
              title: isGoogle ? 'New Signup (Google)' : 'New Signup',
              body: isGoogle 
                ? `${email} just signed up via Google on ReachDesk` 
                : `${email} just signed up on ReachDesk`,
              url: '/admin',
            }
          }).catch(err => console.warn('[Push] Admin new-signup notification failed:', err));

          p = newProfile;
        }

        // Existing profile but missing full_name (e.g. OAuth signup without a display name).
        // Patch ONLY that field — never upsert the whole row — so trial_ends_at is never touched.
        if (p && !p.full_name && activeSession && activeSession.user.id === userId) {
          const patchedName = activeSession.user.user_metadata?.full_name
            || activeSession.user.user_metadata?.name
            || '';
          if (patchedName) {
            await supabase.from('user_profiles')
              .update({ full_name: patchedName })
              .eq('id', userId);
            p = { ...p, full_name: patchedName };
          }
        }

        if (p) {
          const now = new Date();
          const isAdminOrDotthedart = p.role === 'admin' || p.email === 'dotthedart@gmail.com';
          const isEnterprise = p.plan === 'enterprise';
          
          let isTrialExpired = false;
          if (p.plan === 'trial') {
            const trialEnds = p.trial_ends_at ? new Date(p.trial_ends_at) : null;
            isTrialExpired = trialEnds && now > trialEnds && p.status !== 'approved';
          }
          
          let isSubscriptionExpired = false;
          if (p.plan !== 'trial') {
            const planExpires = p.plan_expires_at ? new Date(p.plan_expires_at) : null;
            isSubscriptionExpired = planExpires && now > planExpires;
          }

          const shouldLock = !isAdminOrDotthedart && !isEnterprise && (isTrialExpired || isSubscriptionExpired);
          
          let profileToSet = p;
          if (shouldLock && !p.account_locked) {
            const lockedAt = now.toISOString();
            const { data: updatedProfile, error: updateError } = await supabase
              .from('user_profiles')
              .update({ account_locked: true, locked_at: lockedAt })
              .eq('id', userId)
              .select()
              .single();
            if (!updateError && updatedProfile) {
              profileToSet = updatedProfile;
            } else {
              profileToSet = { ...p, account_locked: true, locked_at: lockedAt };
            }
          }

          // Stamp last_active_at on every successful login/session load.
          // Fire-and-forget — never awaited, so it never delays the UI.
          // Isolated update so it cannot accidentally overwrite unrelated columns.
          supabase.from('user_profiles')
            .update({ last_active_at: new Date().toISOString() })
            .eq('id', userId)
            .then(({ error: laErr }) => {
              if (laErr) console.warn('[Profile] Failed to update last_active_at:', laErr);
            });

          setProfile(profileToSet);
          // Mark this user's profile as loaded so future auth events are ignored
          loadedUserIdRef.current = userId;
          const status = await checkSubscriptionStatus(profileToSet);
          setSubStatus(status);

          const ids = await getTeamIds(userId);
          setTeamIds(ids);

          const { data: members } = await supabase.from('user_profiles')
            .select('id, email')
            .in('id', ids);
          const mapping = {};
          members?.forEach(m => { mapping[m.id] = m.email; });
          setTeamProfilesMap(mapping);

          // Fetch workspace data
          await fetchAllData(ids, userId, p.role === 'admin' || p.email === 'dotthedart@gmail.com');
          setLoading(false);
          return; // Success, exit function
        }
      } catch (err) {
        console.error(`Error loading profile (attempt ${attempts + 1}):`, err);
      }

      attempts++;
      if (attempts < maxAttempts) {
        // Wait 500ms before retrying
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    // If we reach here, we failed to fetch the profile after all attempts
    setProfile(null);
    setLoading(false);
  };

  const fetchAllData = async (ids, userId, isAdmin) => {
    try {
      const [inv, rev, l, t] = await Promise.all([
        supabase.from('invoices').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('revenue_entries').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
        supabase.from('leads').select('*').in('user_id', ids),
        supabase.from('templates').select('*').eq('user_id', userId),
      ]);

      let email = session?.user?.email || profile?.email || '';
      if (!email) {
        const { data: { session: activeSession } } = await supabase.auth.getSession();
        email = activeSession?.user?.email || '';
      }
      const mappedInvoices = (inv.data || []).map(item => ({
        id: item.id,
        user_id: item.user_id,
        invoiceNumber: item.invoice_number,
        clientName: item.client_name,
        clientEmail: item.client_email,
        issueDate: item.issue_date,
        dueDate: item.due_date,
        currency: item.currency,
        items: item.items || [],
        status: item.status,
        notes: item.notes,
        subtotal: item.subtotal || 0,
        tax: item.tax || 0,
        total: item.total || 0,
        paymentDetails: item.payment_instructions,
        userEmail: email
      }));
      setInvoices(mappedInvoices);
      // Map DB columns → frontend shape
      const mappedRevenue = (rev.data || []).map(r => ({
        id: r.id,
        user_id: r.user_id,
        amount: r.amount || 0,
        currency: r.currency || 'USD',
        source: r.client_name || '',     // DB: client_name → frontend: source
        date: r.paid_at ? r.paid_at.split('T')[0] : '',  // DB: paid_at → frontend: date
        description: r.notes || '',      // DB: notes → frontend: description
        service: r.service || '',        // DB: service → frontend: service
        dateAdded: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
        userEmail: email
      }));
      setRevenueLogs(mappedRevenue);
      setLeads(l.data || []);

      const customMapped = (t.data || []).map(tmpl => {
        try {
          if (tmpl.content && tmpl.content.startsWith('{') && tmpl.content.endsWith('}')) {
            const parsed = JSON.parse(tmpl.content);
            return {
              ...tmpl,
              subject: parsed.subject || '',
              body: parsed.body || ''
            };
          }
        } catch (e) {
          // fallback
        }
        return {
          ...tmpl,
          subject: '',
          body: tmpl.content || ''
        };
      });

      setTemplates([...STARTER_TEMPLATES, ...customMapped]);

      // Reminders count
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase.from('leads')
        .select('*', { count: 'exact', head: true })
        .in('user_id', ids).eq('status', 'Contacted').is('reply_type', null).lt('created_at', oneDayAgo);
      
      let totalReminders = count || 0;
      if (isAdmin) {
        const { count: adminNotifsCount } = await supabase.from('admin_notifications')
          .select('*', { count: 'exact', head: true })
          .eq('type', 'upgrade_request')
          .eq('request_status', 'pending');
        totalReminders += (adminNotifsCount || 0);
      }
      setRemindersCount(totalReminders);

      if (isAdmin) {
        const { count: notifCount } = await supabase.from('admin_notifications')
          .select('*', { count: 'exact', head: true }).eq('is_read', false);
        setAdminNotifCount(notifCount || 0);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setSubStatus('active');
  };

  const handleRegisterUser = async (email, password, plan, fullName, avatarFile, referralSource, marketingConsent) => {
    const displayName = fullName ? fullName.trim().split(' ')[0] : '';
    // Sign up user and store all form fields in metadata so that they are securely written
    // to the database by fetchProfile once the user is authenticated (post-OTP).
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          full_name: fullName,
          requested_plan: plan,
          referral_source: referralSource || null,
          marketing_consent: marketingConsent || false
        }
      }
    });
    if (error) throw error;
    if (!data.user) throw new Error('Registration failed.');
  };

  const handleLoginUser = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('reachdesk_theme', newTheme);
    if (newTheme === 'light') document.documentElement.classList.add('light');
    else document.documentElement.classList.remove('light');
  };

  const handleSaveSettings = (newBrand, newCurrency, newWebhook, newBankAccount, newBankIban) => {
    localStorage.setItem('reachdesk_brand_name', newBrand);
    localStorage.setItem('reachdesk_currency_symbol', newCurrency);
    localStorage.setItem('reachdesk_webhook_url', newWebhook);
    localStorage.setItem('reachdesk_bank_account', newBankAccount || '');
    localStorage.setItem('reachdesk_bank_iban', newBankIban || '');
    setBrandName(newBrand);
    setCurrencySymbol(newCurrency);
    setWebhookUrl(newWebhook);
    setBankAccount(newBankAccount || '');
    setBankIban(newBankIban || '');
    alert('Settings saved successfully!');
  };

  // Invoices & Revenue handlers
  const handleAddInvoice = async (invoice) => {
    const dbInvoice = {
      invoice_number: invoice.invoiceNumber,
      client_name: invoice.clientName,
      client_email: invoice.clientEmail,
      issue_date: invoice.issueDate,
      due_date: invoice.dueDate,
      currency: invoice.currency,
      items: invoice.items,
      status: invoice.status,
      notes: invoice.notes,
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      total: invoice.total,
      payment_instructions: invoice.paymentDetails,
      user_id: session.user.id
    };
    const { data, error } = await supabase.from('invoices').insert(dbInvoice).select().single();
    if (!error && data) {
      const mapped = {
        id: data.id,
        user_id: data.user_id,
        invoiceNumber: data.invoice_number,
        clientName: data.client_name,
        clientEmail: data.client_email,
        issueDate: data.issue_date,
        dueDate: data.due_date,
        currency: data.currency,
        items: data.items || [],
        status: data.status,
        notes: data.notes,
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        paymentDetails: data.payment_instructions,
        userEmail: session?.user?.email || ''
      };
      setInvoices(prev => [mapped, ...prev]);
    }
  };
  const handleDeleteInvoice = async (id) => {
    const { error } = await supabase.from('invoices').delete().eq('id', id);
    if (!error) setInvoices(prev => prev.filter(i => i.id !== id));
  };
  const handleUpdateInvoiceStatus = async (id, status) => {
    const { data, error } = await supabase.from('invoices').update({ status }).eq('id', id).select().single();
    if (!error && data) {
      const mapped = {
        id: data.id,
        user_id: data.user_id,
        invoiceNumber: data.invoice_number,
        clientName: data.client_name,
        clientEmail: data.client_email,
        issueDate: data.issue_date,
        dueDate: data.due_date,
        currency: data.currency,
        items: data.items || [],
        status: data.status,
        notes: data.notes,
        subtotal: data.subtotal || 0,
        tax: data.tax || 0,
        total: data.total || 0,
        paymentDetails: data.payment_instructions,
        userEmail: session?.user?.email || profile?.email || ''
      };
      setInvoices(prev => prev.map(i => i.id === id ? mapped : i));
    }
  };
  const handleAddRevenueLog = async (log) => {
    // Map frontend fields → DB columns
    const dbRow = {
      user_id: session.user.id,
      client_name: log.source || 'Unknown',     // frontend: source → DB: client_name (NOT NULL)
      amount: log.amount,
      currency: log.currency,
      paid_at: log.date ? new Date(log.date).toISOString() : new Date().toISOString(),  // frontend: date → DB: paid_at
      notes: log.description || log.notes || null,  // frontend: description/notes → DB: notes
      service: log.service || log.type || null       // frontend: service/type → DB: service
    };
    const { data, error } = await supabase.from('revenue_entries').insert(dbRow).select().single();
    if (!error && data) {
      // Map response back to frontend shape
      const mapped = {
        id: data.id,
        user_id: data.user_id,
        amount: data.amount || 0,
        currency: data.currency || 'USD',
        source: data.client_name || '',          // DB: client_name → frontend: source
        date: data.paid_at ? data.paid_at.split('T')[0] : log.date || '',
        description: data.notes || '',           // DB: notes → frontend: description
        service: data.service || '',             // DB: service → frontend: service
        dateAdded: data.created_at ? new Date(data.created_at).toLocaleDateString() : log.dateAdded || '',
        userEmail: log.userEmail || session.user.email
      };
      setRevenueLogs(prev => [...prev, mapped]);
    } else if (error) {
      console.error('Error adding revenue log:', error);
    }
  };
  const handleDeleteRevenueLog = async (id) => {
    const { error } = await supabase.from('revenue_entries').delete().eq('id', id);
    if (!error) setRevenueLogs(prev => prev.filter(r => r.id !== id));
  };
  const handleAddTemplate = async (template) => {
    const serialized = {
      title: template.title,
      content: JSON.stringify({ subject: template.subject || '', body: template.body || '' }),
      platform: template.platform,
      is_starter: false,
      tags: template.tags || []
    };
    const { data, error } = await supabase.from('templates').insert({ ...serialized, user_id: session.user.id }).select().single();
    if (error) throw error;
    if (!error && data) {
      const parsedData = {
        ...data,
        subject: template.subject || '',
        body: template.body || ''
      };
      setTemplates(prev => [...prev, parsedData]);
      return parsedData;
    }
  };
  const handleDeleteTemplate = async (id) => {
    const { error } = await supabase.from('templates').delete().eq('id', id);
    if (!error) setTemplates(prev => prev.filter(t => t.id !== id));
  };
  const handleUpdateTemplate = async (id, fields) => {
    const serializedFields = {};
    if (fields.title !== undefined) serializedFields.title = fields.title;
    if (fields.platform !== undefined) serializedFields.platform = fields.platform;
    if (fields.is_starter !== undefined) serializedFields.is_starter = fields.is_starter;
    if (fields.tags !== undefined) serializedFields.tags = fields.tags;
    if (fields.subject !== undefined || fields.body !== undefined) {
      const existing = templates.find(t => t.id === id) || {};
      const subject = fields.subject !== undefined ? fields.subject : (existing.subject || '');
      const body = fields.body !== undefined ? fields.body : (existing.body || '');
      serializedFields.content = JSON.stringify({ subject, body });
    }
    const { data, error } = await supabase.from('templates').update(serializedFields).eq('id', id).select().single();
    if (!error && data) {
      const parsedData = {
        ...data,
        subject: fields.subject !== undefined ? fields.subject : (templates.find(t => t.id === id)?.subject || ''),
        body: fields.body !== undefined ? fields.body : (templates.find(t => t.id === id)?.body || '')
      };
      setTemplates(prev => prev.map(t => t.id === id ? parsedData : t));
    }
  };

  const value = {
    session, profile, subStatus, loading,
    theme, toggleTheme, brandName, currencySymbol, webhookUrl, bankAccount, bankIban,
    teamIds, teamProfilesMap, leads, templates, invoices, revenueLogs,
    adminNotifCount, remindersCount,
    toast, showToast,
    handleLogout, handleRegisterUser, handleLoginUser, handleSaveSettings,
    handleAddInvoice, handleDeleteInvoice, handleUpdateInvoiceStatus,
    handleAddRevenueLog, handleDeleteRevenueLog,
    handleAddTemplate, handleDeleteTemplate, handleUpdateTemplate,
    fetchProfile: () => fetchProfile(session?.user?.id),
    fetchAllData: () => fetchAllData(teamIds, session?.user?.id, profile?.role === 'admin' || profile?.email === 'dotthedart@gmail.com'),
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '2rem',
          right: '2rem',
          zIndex: 100000,
          background: toast.type === 'error' ? 'var(--danger-color, #ef4444)' : toast.type === 'info' ? 'var(--primary-purple, #8b5cf6)' : 'var(--success-color, #10b981)',
          color: '#fff',
          padding: '0.85rem 1.5rem',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: 600,
          animation: 'slideInUp 0.3s ease',
          fontSize: '0.9rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>{toast.message}</span>
          <button 
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0 0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>
      )}
      <style>{`
        @keyframes slideInUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </AppContext.Provider>
  );
}

// Layout wrapper that provides AppLayout with context
function AppLayoutWrapper({ children }) {
  const {
    profile, theme, toggleTheme, remindersCount, adminNotifCount,
    brandName, handleLogout, subStatus
  } = useAppContext();

  return (
    <AppLayout
      profile={profile}
      theme={theme}
      toggleTheme={toggleTheme}
      remindersCount={remindersCount}
      adminNotifCount={adminNotifCount}
      brandName={brandName}
      handleLogout={handleLogout}
      subStatus={subStatus}
    >
      {children}
    </AppLayout>
  );
}

// Protected Page wrapper
function ProtectedPage({ children }) {
  const { session, profile, subStatus, loading, handleLogout } = useAppContext();
  return (
    <ProtectedRoute session={session} profile={profile} subStatus={subStatus} loading={loading} handleLogout={handleLogout}>
      <AppLayoutWrapper>{children}</AppLayoutWrapper>
    </ProtectedRoute>
  );
}

// Upgrade page route wrapper
function UpgradeRoutePage() {
  const { session, profile, subStatus, loading, handleLogout, fetchProfile, bankAccount, bankIban } = useAppContext();
  const isForcedPaywall = subStatus === 'trial_expired' || subStatus === 'subscription_expired';

  const pageContent = (
    <UpgradePage
      profile={profile}
      handleLogout={handleLogout}
      onRefreshProfile={fetchProfile}
      bankAccount={bankAccount}
      bankIban={bankIban}
      isEmbedded={!isForcedPaywall}
    />
  );

  return (
    <UpgradeRoute session={session} profile={profile} subStatus={subStatus} loading={loading} handleLogout={handleLogout}>
      {isForcedPaywall ? pageContent : <AppLayoutWrapper>{pageContent}</AppLayoutWrapper>}
    </UpgradeRoute>
  );
}

// Main page components wired to context
function DashboardPage() {
  const { profile } = useAppContext();
  return <Dashboard currentUser={profile} />;
}

function CRMPage() {
  const { profile, teamProfilesMap, teamIds } = useAppContext();
  return <CRM currentUser={profile} teamProfilesMap={teamProfilesMap} isTeamView={teamIds.length > 1} />;
}

function TemplatesPage() {
  const { profile, templates, teamProfilesMap, teamIds, handleAddTemplate, handleDeleteTemplate, handleUpdateTemplate } = useAppContext();
  return (
    <Templates
      currentUser={profile}
      templates={templates}
      onAddTemplate={handleAddTemplate}
      onDeleteTemplate={handleDeleteTemplate}
      onUpdateTemplate={handleUpdateTemplate}
      teamProfilesMap={teamProfilesMap}
      isTeamView={teamIds.length > 1}
    />
  );
}

function InvoicesPage() {
  const { profile, invoices, leads, currencySymbol, bankAccount, bankIban, handleAddInvoice, handleDeleteInvoice, handleUpdateInvoiceStatus } = useAppContext();
  return (
    <InvoiceGenerator
      currentUser={profile}
      invoices={invoices}
      leads={leads}
      onAddInvoice={handleAddInvoice}
      onDeleteInvoice={handleDeleteInvoice}
      onUpdateInvoiceStatus={handleUpdateInvoiceStatus}
      currencySymbol={currencySymbol}
      bankAccount={bankAccount}
      bankIban={bankIban}
    />
  );
}

function RevenuePage() {
  const { profile, revenueLogs, currencySymbol, handleAddRevenueLog, handleDeleteRevenueLog } = useAppContext();
  return (
    <RevenueTracker
      currentUser={profile}
      revenueLogs={revenueLogs}
      onAddRevenueLog={handleAddRevenueLog}
      onDeleteRevenueLog={handleDeleteRevenueLog}
      currencySymbol={currencySymbol}
    />
  );
}

function NotesPage() {
  const { profile } = useAppContext();
  const limits = PLAN_LIMITS[(profile?.plan || 'trial').toLowerCase()] || PLAN_LIMITS.trial;
  if (!limits.notes) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--text-muted)' }}>
        <Lock size={36} style={{ color: 'var(--text-muted)' }} />
        <h3>Notes are a Pro feature</h3>
        <p>Upgrade to Pro, Teams, or Enterprise to access drawing boards and text notes.</p>
      </div>
    );
  }
  return <NotesList currentUser={profile} />;
}

function NoteEditorPage() {
  const { profile } = useAppContext();
  const limits = PLAN_LIMITS[(profile?.plan || 'trial').toLowerCase()] || PLAN_LIMITS.trial;
  if (!limits.notes) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: 'var(--text-muted)' }}>
        <Lock size={36} style={{ color: 'var(--text-muted)' }} />
        <h3>Notes are a Pro feature</h3>
        <p>Upgrade to Pro, Teams, or Enterprise to access drawing boards and text notes.</p>
      </div>
    );
  }
  return <NoteEditor currentUser={profile} />;
}

function RemindersPage() {
  const { profile } = useAppContext();
  return <Reminders currentUser={profile} />;
}

function SettingsPage() {
  const { profile, brandName, currencySymbol, webhookUrl, bankAccount, bankIban, leads, templates, handleSaveSettings, fetchAllData, fetchProfile } = useAppContext();
  const userTemplatesCount = (templates || []).filter(t => t.user_id === profile?.id && !t.is_starter).length;
  return (
    <Configuration
      brandName={brandName}
      currencySymbol={currencySymbol}
      webhookUrl={webhookUrl}
      bankAccount={bankAccount}
      bankIban={bankIban}
      onSaveSettings={handleSaveSettings}
      currentUser={profile}
      leadsCount={leads.length}
      templatesCount={userTemplatesCount}
      onRefreshStatuses={fetchAllData}
      onRefreshProfile={fetchProfile}
    />
  );
}

function AdminPanelPage() {
  const { profile } = useAppContext();
  return (
    <AdminRoute profile={profile}>
      <AdminPanel currentUser={profile} />
    </AdminRoute>
  );
}

function AuthPage({ mode }) {
  const { session, loading, handleRegisterUser, handleLoginUser } = useAppContext();
  // If already logged in, go straight to dashboard
  if (!loading && session) return <Navigate to="/dashboard" replace />;
  return <Auth onRegister={handleRegisterUser} onLogin={handleLoginUser} mode={mode} />;
}

function HomepagePage() {
  const { session, loading, brandName } = useAppContext();
  // If already logged in, redirect to dashboard
  if (!loading && session) return <Navigate to="/dashboard" replace />;
  return <Homepage currentUserEmail={session?.user?.email} brandName={brandName} />;
}

// Root app
export default function App() {
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState(null);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then((reg) => {
          if (reg.waiting) {
            setSwUpdateAvailable(true);
            setWaitingWorker(reg.waiting);
          }
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  setSwUpdateAvailable(true);
                  setWaitingWorker(reg.waiting || newWorker);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[SW] ServiceWorker registration failed:', err);
        });

      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    }
  }, []);

  const handleSwUpdateRefresh = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  return (
    <BrowserRouter>
      <AppProvider>
        {swUpdateAvailable && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            backgroundColor: '#5B8FB9',
            color: '#0D1117',
            padding: '0.75rem 1rem',
            textAlign: 'center',
            zIndex: 99999,
            fontFamily: 'Mattone, sans-serif',
            fontWeight: 600,
            fontSize: '0.9rem',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem'
          }}>
            <span>A new version of ReachDesk CRM is available.</span>
            <button 
              onClick={handleSwUpdateRefresh}
              style={{
                backgroundColor: '#0D1117',
                color: '#FFFFFF',
                border: 'none',
                padding: '4px 12px',
                borderRadius: '3px',
                cursor: 'pointer',
                fontFamily: 'Mattone, sans-serif',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              Refresh Now
            </button>
          </div>
        )}
        <div style={{ paddingTop: swUpdateAvailable ? '40px' : '0px' }}>
          <AppRoutes />
        </div>
      </AppProvider>
    </BrowserRouter>
  );
}

function AppRoutes() {
  const { loading, session, profile, fetchProfile } = useAppContext();
  if (loading) return <LoadingSpinner />;

  return (
    <Suspense fallback={<LoadingSpinner />}>
      {session && profile && (
        <UserNotificationBell profile={profile} onRefreshProfile={fetchProfile} />
      )}
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Navigate to="/homepage" replace />} />
        <Route path="/homepage" element={<HomepagePage />} />
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/signup" element={<AuthPage mode="signup" />} />
        <Route path="/i/:token" element={<PublicInvoice />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/terms" element={<TermsOfService />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />
        <Route path="/refund" element={<RefundPolicy />} />
        <Route path="/get-started" element={session ? <ProtectedPage><GetStarted /></ProtectedPage> : <GetStarted />} />

        {/* Upgrade/Paywall route */}
        <Route path="/upgrade" element={<UpgradeRoutePage />} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/leads" element={<ProtectedPage><CRMPage /></ProtectedPage>} />
        <Route path="/templates" element={<ProtectedPage><TemplatesPage /></ProtectedPage>} />
        <Route path="/invoices" element={<ProtectedPage><InvoicesPage /></ProtectedPage>} />
        <Route path="/revenue" element={<ProtectedPage><RevenuePage /></ProtectedPage>} />
        <Route path="/notes" element={<ProtectedPage><NotesPage /></ProtectedPage>} />
        <Route path="/notes/:id" element={<ProtectedPage><NoteEditorPage /></ProtectedPage>} />
        <Route path="/reminders" element={<ProtectedPage><RemindersPage /></ProtectedPage>} />
        <Route path="/settings" element={<ProtectedPage><SettingsPage /></ProtectedPage>} />
        <Route path="/admin" element={<ProtectedPage><AdminPanelPage /></ProtectedPage>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/homepage" replace />} />
      </Routes>
    </Suspense>
  );
}
