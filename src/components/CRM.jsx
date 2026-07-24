import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAppContext } from '../App';
import { getTeamIds, PLAN_LIMITS } from '../lib/utils';
import { LeadLimitModal, LeadLimitToast, getRemainingLeadQuota, shouldShowCountdownToast, prepareBulkImport, BulkImportLimitModal, getPlanLeadLimit } from '../lib/leadLimits';
import {
  Search, Plus, Download, Upload, Trash2, Edit3, X,
  Filter, CheckSquare, Square, Folder, FolderPlus,
  MoreVertical, Check, ThumbsUp, ThumbsDown, SkipForward, AlertCircle, ChevronDown, FileText,
  Settings as Gear, MessageCircle, Zap, ExternalLink, Lock, Lightbulb, Copy, Sparkles, Mail,
  Database, Info, Users
} from 'lucide-react';

import EditableDropdown from './CRM/EditableDropdown';
import ColumnManager from './CRM/ColumnManager';
import LeadDrawer from './CRM/LeadDrawer';
import CSVImporter from './CRM/CSVImporter';
import CSVImportModal from './CRM/CSVImportModal';
import ExportSheetsModal from './CRM/ExportSheetsModal';
import SheetsImportModal from './CRM/SheetsImportModal';
import ConvertModal from './CRM/ConvertModal';
import LeadFormFields from './CRM/LeadFormFields';
import GroupedStatusDropdown from './CRM/GroupedStatusDropdown';
import GroupedTemplateDropdown from './CRM/GroupedTemplateDropdown';
import CheckpointPopover from './CRM/CheckpointPopover';
import HelpPopover from './HelpPopover';
import { ReachIcons, PhonePopup, detectDomainIcon, detectPlatformLabel } from './icons/PlatformIcons';
import { updateLeadStatusAndCheckpoint, getSuggestionForStatus, REPLY_CHECK_STATUSES, FOLLOW_UP_CHECK_STATUSES } from '../lib/reminders';
import PriorityDropdown from './CRM/PriorityDropdown';
import { exportLeads, exportNotes } from '../utils/exportUtils';
import { mergeTemplateFields, normalizePhoneNumber, generatePrefilledUrl } from '../utils/templateMerge';
import { celebrateClosedWon } from '../utils/celebrateWin';
import { generateAIDraft } from '../utils/aiDraft';

const PRESET_COLORS = [
  '#ef4444', // Red
  '#f59e0b', // Amber/Yellow
  '#10b981', // Emerald/Green
  '#3b82f6', // Blue
  '#8b5cf6', // Violet/Purple
  '#ec4899', // Pink
  '#6366f1', // Indigo
  '#6b7280'  // Slate/Gray
];

const DEFAULT_STATUSES = [
  { label: 'Lead', color: '#3b82f6' },
  { label: 'Contacted', color: '#f59e0b' },
  { label: 'Positive Reply', color: '#8b5cf6' },
  { label: 'Proposal Sent', color: '#06b6d4' },
  { label: 'Calendly Sent', color: '#6B9FD4' },
  { label: 'Followed up', color: '#10b981' },
  { label: 'Booked', color: '#ec4899' },
  { label: 'No show', color: '#ef4444' },
  { label: 'Rescheduled', color: '#a855f7' },
  { label: 'Not Interested', color: '#6b7280' },
  { label: 'Closed Won', color: '#22c55e' }
];

const SORT_OPTIONS = [
  { value: 'newest',    label: 'Recently Added' },
  { value: 'contacted', label: 'Recently Contacted' },
  { value: 'hot',       label: 'Hot First' },
  { value: 'name',      label: 'Name A → Z' },
  { value: 'status',    label: 'By Status' },
];

export default function CRM({ 
  currentUser, 
  teamProfilesMap = {}, 
  isTeamView = false, 
  onRefreshReminders 
}) {
  const navigate = useNavigate();
  const { showToast, userSnippets } = useAppContext() || {};
  const [leads, setLeads] = useState([]);

  // Reach Link Click System states
  const [reachModalOpen, setReachModalOpen] = useState(false);
  const [reachLead, setReachLead] = useState(null);
  const [reachChannel, setReachChannel] = useState('');
  const [reachUrl, setReachUrl] = useState('');
  const [selectedReachTemplateId, setSelectedReachTemplateId] = useState('');
  const [reachTemplateBody, setReachTemplateBody] = useState('');
  const [reachTemplateSubject, setReachTemplateSubject] = useState('');
  const [reachWarning, setReachWarning] = useState('');
  const [reachDestination, setReachDestination] = useState('mailto');
  const [reachAiLoading, setReachAiLoading] = useState(false);
  const [reachAiError, setReachAiError] = useState('');
  const [reachAiInstructions, setReachAiInstructions] = useState('');
  const [folders, setFolders] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_folders');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [userFolders, setUserFolders] = useState([]);
  const [clients, setClients] = useState([]);
  const [statuses, setStatuses] = useState(() => {
    const defaults = [
      { label: 'Lead', color: '#3b82f6' },
      { label: 'Contacted', color: '#f59e0b' },
      { label: 'Positive Reply', color: '#8b5cf6' },
      { label: 'Proposal Sent', color: '#06b6d4' },
      { label: 'Calendly Sent', color: '#6B9FD4' },
      { label: 'Followed up', color: '#10b981' },
      { label: 'Booked', color: '#ec4899' },
      { label: 'No show', color: '#ef4444' },
      { label: 'Rescheduled', color: '#a855f7' },
      { label: 'Not Interested', color: '#6b7280' },
      { label: 'Closed Won', color: '#22c55e' }
    ];
    try {
      const saved = localStorage.getItem('crm_custom_statuses');
      return saved ? JSON.parse(saved) : defaults;
    } catch (e) {
      return defaults;
    }
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Smart Folder modal and filters state
  const [showSmartFolderModal, setShowSmartFolderModal] = useState(false);
  const [smartFolderForm, setSmartFolderForm] = useState({ name: '', rules: [{ field: 'Status', operator: 'is', value: '' }] });
  const [priorityFilter, setPriorityFilter] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);
  const [showLeadLimitBlockModal, setShowLeadLimitBlockModal] = useState(false);
  const [toastRemaining, setToastRemaining] = useState(null);
  const [importResult, setImportResult] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Folder names local state
  const [systemFolderNames, setSystemFolderNames] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_system_folder_names');
      return saved ? JSON.parse(saved) : {
        all: 'All Leads',
        hot: 'Hot',
        warm: 'Warm',
        cold: 'Cold',
        calendly: 'Calendly Sent',
        clients: 'Clients'
      };
    } catch {
      return {
        all: 'All Leads',
        hot: 'Hot',
        warm: 'Warm',
        cold: 'Cold',
        calendly: 'Calendly Sent',
        clients: 'Clients'
      };
    }
  });

  // View and Folder states persisted in URL
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'contact_details';
  const folderParam = searchParams.get('folder');
  const selectedFolderId = folderParam === 'all' || !folderParam ? null : folderParam;

  const handleViewChange = (newView) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('view', newView);
      return next;
    });
  };
  const [columnDefs, setColumnDefs] = useState(() => {
    try {
      const saved = localStorage.getItem('crm_columns');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [selectedLead, setSelectedLead] = useState(null);
  const [pastedLink, setPastedLink] = useState('');

  const handleCopyPersonalizedMessage = (lead, templateId) => {
    if (!templateId) return;
    const foundTmpl = templates.find(t => t.id === templateId);
    if (!foundTmpl) {
      showToast?.('Template not found', 'error');
      return;
    }
    const merged = mergeTemplateFields(foundTmpl.body || '', lead, userSnippets, columnDefs);
    navigator.clipboard.writeText(merged);
    showToast?.(`Personalized message for ${lead.first_name || 'Lead'} copied!`);
  };

  const handleReachClick = (e, platform, url, lead) => {
    const mapKey = platform.toLowerCase();

    // 1. Classify channel type: messaging vs profile_only
    let channelKey = mapKey;
    let channelType = 'profile_only';
    let supportsPrefill = false;

    if (
      mapKey === 'email' ||
      mapKey === 'whatsapp' ||
      mapKey === 'sms' ||
      mapKey === 'linkedin_url' ||
      mapKey === 'instagram_url' ||
      mapKey === 'twitter_url' ||
      mapKey === 'linkedin' ||
      mapKey === 'instagram' ||
      mapKey === 'twitter' ||
      mapKey === 'x'
    ) {
      channelKey = mapKey.includes('linkedin') ? 'linkedin_url' : mapKey.includes('instagram') ? 'instagram_url' : mapKey.includes('twitter') ? 'twitter_url' : mapKey;
      channelType = 'messaging';
      supportsPrefill = ['email', 'whatsapp', 'sms'].includes(mapKey);
    } else {
      // For custom domain fields, detect via detectPlatformLabel
      const detectedLabel = detectPlatformLabel(url).toLowerCase();
      if (detectedLabel === 'linkedin' || detectedLabel === 'instagram' || detectedLabel === 'twitter') {
        channelKey = `${detectedLabel}_url`;
        channelType = 'messaging';
        supportsPrefill = false;
      }
    }

    // Fallback path: profile_only channels just open the url directly
    if (channelType === 'profile_only') {
      return; // Do NOT call e.preventDefault(), browser navigates naturally
    }

    // Intercept messaging channel
    e.preventDefault();

    // 2. Normalize Phone details if WhatsApp/SMS/Call
    let warningMsg = '';
    if (['whatsapp', 'sms', 'phone'].includes(channelKey)) {
      const defCode = currentUser?.default_country_code || '+92';
      const normResult = normalizePhoneNumber(lead.phone, defCode);
      if (!normResult.isValid) {
        warningMsg = normResult.error;
      }
    }

    // 3. User configuration check: always_draft_before_sending
    const alwaysDraft = currentUser?.always_draft_before_sending !== false;
    
    // Choose template to load (user-scoped last-used)
    const storedTmplId = localStorage.getItem(`reach_last_tmpl_${currentUser?.id}_${channelKey}`);
    const activeTemplates = templates || [];
    const initialTemplate = activeTemplates.find(t => t.id === storedTmplId) || activeTemplates[0];

    const initialSubject = initialTemplate?.subject || '';
    const initialBody = initialTemplate ? mergeTemplateFields(initialTemplate.body || '', lead, userSnippets, columnDefs) : '';

    if (alwaysDraft) {
      // Open Reach Draft Modal
      setReachLead(lead);
      setReachChannel(channelKey);
      setReachUrl(url);
      setSelectedReachTemplateId(initialTemplate?.id || '');
      setReachTemplateSubject(initialSubject);
      setReachTemplateBody(initialBody);
      setReachWarning(warningMsg);
      setReachDestination(channelKey === 'email' ? localStorage.getItem(`reach_last_dest_${currentUser?.id}_${channelKey}`) || 'mailto' : channelKey);
      setReachAiError('');
      setReachAiInstructions('');
      setReachAiLoading(false);
      setReachModalOpen(true);
    } else {
      // Auto-send (direct prefill url opening or clipboard copying)
      if (supportsPrefill) {
        const dest = channelKey === 'email' ? localStorage.getItem(`reach_last_dest_${currentUser?.id}_${channelKey}`) || 'mailto' : channelKey;
        const prefillResult = generatePrefilledUrl(
          channelKey,
          dest,
          { email: lead.email, phone: lead.phone },
          initialSubject,
          initialBody,
          currentUser?.default_country_code || '+92'
        );
        if (prefillResult.warning) {
          alert(`Warning: ${prefillResult.warning}`);
        }
        window.open(prefillResult.url, '_blank');
      } else {
        // Clipboard copy + open profile URL
        navigator.clipboard.writeText(initialBody);
        showToast?.(`Copied! Paste it on ${lead.first_name || 'their'} profile.`);
        window.open(url, '_blank');
      }
    }
  };

  const handleReachTemplateChange = (templateId) => {
    setSelectedReachTemplateId(templateId);
    const found = templates.find(t => t.id === templateId);
    if (found && reachLead) {
      const mergedBody = mergeTemplateFields(found.body || '', reachLead, userSnippets, columnDefs);
      setReachTemplateSubject(found.subject || '');
      setReachTemplateBody(mergedBody);
      localStorage.setItem(`reach_last_tmpl_${currentUser?.id}_${reachChannel}`, templateId);
    }
  };

  const handleGenerateReachAI = async () => {
    if (reachAiLoading || !reachLead) return;
    setReachAiLoading(true);
    setReachAiError('');

    try {
      const draft = await generateAIDraft({
        leadContext: reachLead,
        platform: reachChannel,
        extraInstructions: reachAiInstructions,
      });
      setReachTemplateBody(draft);
    } catch (err) {
      console.error('[Reach Modal AI] Error:', err);
      setReachAiError("Couldn't generate, try again");
    } finally {
      setReachAiLoading(false);
    }
  };

  const handleReachSend = (dest) => {
    localStorage.setItem(`reach_last_dest_${currentUser?.id}_${reachChannel}`, dest);
    localStorage.setItem(`reach_last_tmpl_${currentUser?.id}_${reachChannel}`, selectedReachTemplateId);

    const isPrefill = ['email', 'whatsapp', 'sms'].includes(reachChannel);
    if (isPrefill) {
      const prefillResult = generatePrefilledUrl(
        reachChannel,
        dest,
        { email: reachLead.email, phone: reachLead.phone },
        reachTemplateSubject,
        reachTemplateBody,
        currentUser?.default_country_code || '+92'
      );
      window.open(prefillResult.url, '_blank');
    } else {
      navigator.clipboard.writeText(reachTemplateBody);
      showToast?.(`Copied! Paste it on ${reachLead?.first_name || 'their'} profile.`);
      window.open(reachUrl, '_blank');
    }
    setReachModalOpen(false);
  };

  const handleAddPastedLink = (e) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const val = pastedLink.trim();
      if (!val) return;
      
      const label = detectPlatformLabel(val);
      const cleanUrl = val.startsWith('http') ? val : `https://${val}`;
      
      setLeadForm(prev => {
        const currentLinks = prev.links || [];
        if (currentLinks.some(l => l.url === cleanUrl)) {
          alert('This link is already in the list.');
          return prev;
        }
        return {
          ...prev,
          links: [...currentLinks, { url: cleanUrl, label }]
        };
      });
      setPastedLink('');
    }
  };

  const handleFolderChange = (value) => {
    if (!value) {
      setLeadForm(prev => ({ ...prev, folder_id: '' }));
    } else if (value.startsWith('sys:')) {
      const sysType = value.split(':')[1];
      if (sysType === 'hot') {
        setLeadForm(prev => ({ ...prev, folder_id: '', priority: 'Hot' }));
      } else if (sysType === 'warm') {
        setLeadForm(prev => ({ ...prev, folder_id: '', priority: 'Warm' }));
      } else if (sysType === 'cold') {
        setLeadForm(prev => ({ ...prev, folder_id: '', priority: 'Cold' }));
      } else if (sysType === 'calendly') {
        setLeadForm(prev => ({ ...prev, folder_id: '', status: 'Calendly Sent' }));
      } else if (sysType === 'clients') {
        setLeadForm(prev => ({ ...prev, folder_id: '', status: 'Closed Won' }));
      }
    } else if (value.startsWith('manual:')) {
      const folderId = value.split(':')[1];
      setLeadForm(prev => ({ ...prev, folder_id: folderId }));
    }
  };

  const getFolderSelectValue = () => {
    if (leadForm.folder_id) {
      return `manual:${leadForm.folder_id}`;
    }
    return '';
  };
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showCSVImporter, setShowCSVImporter] = useState(false);

  // Advanced Filter Drawer States
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState([]);
  const [filterPriorities, setFilterPriorities] = useState([]);
  const [filterActions, setFilterActions] = useState([]);
  const [filterProjects, setFilterProjects] = useState([]);
  const [filterDateRange, setFilterDateRange] = useState('all'); // 'all' | 'today' | '7days' | '30days'
  const [filterDateField, setFilterDateField] = useState('created_at'); // 'created_at' | 'last_contacted_at'

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    first_name: '',
    platform: 'LinkedIn',
    priority: 'Warm'
  });
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [newFieldType, setNewFieldType] = useState('text');
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewImportModal, setShowNewImportModal] = useState(false);
  const [showExportSheetsModal, setShowExportSheetsModal] = useState(false);
  const [showSheetsImportModal, setShowSheetsImportModal] = useState(false);
  const [sheetsConnected, setSheetsConnected] = useState(false);
  const [sheetsConnectedChecked, setSheetsConnectedChecked] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  
  // Reply Type prompt state
  const [replyPromptLead, setReplyPromptLead] = useState(null);
  const [replyPromptStatus, setReplyPromptStatus] = useState('');
  const [replyType, setReplyType] = useState('positive'); // 'positive' | 'negative' | 'skip'
  const [replyTemplateId, setReplyTemplateId] = useState('');
  const [replyNotes, setReplyNotes] = useState('');
  const [nextStep, setNextStep] = useState(null); // 'proposal' | 'meeting' | 'skip' | null
  const [nextStepLink, setNextStepLink] = useState('');

  // Suggestions & Checkpoints states
  const [suggestionRules, setSuggestionRules] = useState([]);
  const [checkpointPopoverLead, setCheckpointPopoverLead] = useState(null);
  const [checkpointPopoverAnchor, setCheckpointPopoverAnchor] = useState(null);

  // Form states
  const [leadForm, setLeadForm] = useState({
    name: '', email: '', phone: '', company: '', niche: '',
    priority: 'Warm', status: 'Lead', notes: '', folder_id: '',
    template_used: '',
    links: [],
    custom_fields: {}
  });
  const [folderForm, setFolderForm] = useState({ name: '', color: '#3b82f6' });
  const [importText, setImportText] = useState('');
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exporting, setExporting] = useState(null);

  const handleExportLeadsClick = async () => {
    if (exporting) return;
    setExporting('leads');
    setShowExportDropdown(false);
    try {
      await exportLeads(currentUser.id, leads);
    } catch (err) {
      console.error('Export leads error:', err);
      alert('Failed to export leads: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const handleExportNotesClick = async () => {
    if (exporting) return;
    setExporting('notes');
    setShowExportDropdown(false);
    try {
      await exportNotes(currentUser.id);
    } catch (err) {
      console.error('Export notes error:', err);
      alert('Failed to export notes: ' + err.message);
    } finally {
      setExporting(null);
    }
  };

  const [showQuickClean, setShowQuickClean] = useState(false);
  const [showBulkStatusMenu, setShowBulkStatusMenu] = useState(false);

  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  const plan = (currentUser.plan || 'trial').toLowerCase();
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.trial;

  // 1. Fetch CRM Data
  const fetchData = async () => {
    if (!currentUser?.id) return;
    setLoading(true);
    try {
      const teamIds = await getTeamIds(currentUser.id);
      if (!teamIds || teamIds.length === 0 || teamIds.includes(undefined) || teamIds.includes(null)) {
        setLoading(false);
        return;
      }

      const [
        foldersRes,
        smartFoldersRes,
        statusesRes,
        templatesRes,
        columnsRes,
        leadsRes,
        rulesRes
      ] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
        supabase.from('user_folders').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true }),
        supabase.from('custom_statuses').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
        supabase.from('templates').select('id, title, platform, is_starter, content').or(`user_id.eq.${currentUser.id},user_id.is.null`),
        supabase.from('column_definitions').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
        supabase.from('leads').select('*').in('user_id', teamIds).order('created_at', { ascending: false }).order('id', { ascending: true }),
        supabase.from('action_suggestion_rules').select('*')
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (columnsRes.error) throw columnsRes.error;

      const fData = foldersRes.data || [];
      const ufData = smartFoldersRes.data || [];
      const sData = statusesRes.data || [];
      const tData = templatesRes.data || [];
      const cols = columnsRes.data || [];
      const rawLeads = leadsRes.data || [];
      const lData = rawLeads.map(lead => {
        if (lead.priority && /🔥|⚡|📦|🧊/.test(lead.priority)) {
          let cleanPriority = lead.priority.replace(/🔥|⚡|📦|🧊/g, '').trim();
          if (cleanPriority.toLowerCase() === 'hot') cleanPriority = 'Hot';
          else if (cleanPriority.toLowerCase() === 'warm') cleanPriority = 'Warm';
          else if (cleanPriority.toLowerCase() === 'cold') cleanPriority = 'Cold';
          
          // Trigger background update in Supabase
          supabase
            .from('leads')
            .update({ priority: cleanPriority })
            .eq('id', lead.id)
            .then(({ error }) => {
              if (error) console.error(`Failed to migrate priority for lead ${lead.id}:`, error);
            });
          return { ...lead, priority: cleanPriority };
        }
        return lead;
      });
      const cData = lData.filter(l => l.status === 'Client');
      const rData = rulesRes.data || [];

      setFolders(fData);
      localStorage.setItem('crm_folders', JSON.stringify(fData));
      setUserFolders(ufData);
      
      if (sData.length > 0) {
        setStatuses(sData);
        localStorage.setItem('crm_custom_statuses', JSON.stringify(sData));
      }
      
      const parsedTemplates = tData.map(tmpl => {
        let subject = '';
        let body = '';
        if (tmpl.content) {
          if (tmpl.content.startsWith('{') && tmpl.content.endsWith('}')) {
            try {
              const parsed = JSON.parse(tmpl.content);
              subject = parsed.subject || '';
              body = parsed.body || '';
            } catch (e) {
              console.error('Error parsing custom template JSON content:', e);
            }
          } else {
            body = tmpl.content;
          }
        }
        return {
          ...tmpl,
          subject,
          body
        };
      });
      setTemplates(parsedTemplates);
      
      setLeads(lData);
      setClients(cData);
      setSuggestionRules(rData);

      if (!cols || cols.length === 0) {
        const defaultDefs = [
          // ── Contact Details view — Default visible: Name, Status, Reach
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'name',              column_label: 'Name',             column_type: 'text',     is_visible: true,  is_default: true, sort_order: 0, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'status',            column_label: 'Status',           column_type: 'status',   is_visible: true,  is_default: true, sort_order: 1, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'platform',          column_label: 'Reach',            column_type: 'reach',    is_visible: true,  is_default: true, sort_order: 2, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'email',             column_label: 'Email',            column_type: 'text',     is_visible: false, is_default: true, sort_order: 3, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'phone',             column_label: 'Phone',            column_type: 'text',     is_visible: false, is_default: true, sort_order: 4, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'company',           column_label: 'Company',          column_type: 'text',     is_visible: false, is_default: true, sort_order: 5, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'instagram_url',     column_label: 'Instagram',        column_type: 'text',     is_visible: false, is_default: true, sort_order: 6, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'website',           column_label: 'Website',          column_type: 'text',     is_visible: false, is_default: true, sort_order: 7, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'priority',          column_label: 'Priority',         column_type: 'priority', is_visible: false, is_default: true, sort_order: 8, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'niche',             column_label: 'Niche',            column_type: 'text',     is_visible: false, is_default: true, sort_order: 9, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'template_used',     column_label: 'Template Used',   column_type: 'link',     is_visible: false, is_default: true, sort_order: 10, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'action_to_take',    column_label: 'Action to Take',   column_type: 'dropdown', is_visible: false, is_default: true, sort_order: 11, dropdown_options: [
            { label: 'Send first pitch', color: '#3b82f6' },
            { label: 'Wait for reply', color: '#6b7280' },
            { label: 'Send a follow up', color: '#f59e0b' },
            { label: 'Send a different pitch', color: '#8b5cf6' },
            { label: 'Send proposal', color: '#5B8FB9' },
            { label: 'Send Calendly', color: '#6366f1' },
            { label: 'Prepare for call', color: '#8b5cf6' },
            { label: 'Send invoice', color: '#10b981' },
            { label: 'No action needed', color: '#6b7280' }
          ] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'last_contacted_at', column_label: 'Last Contacted At',column_type: 'date',     is_visible: false, is_default: true, sort_order: 12, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'linkedin_url',      column_label: 'LinkedIn',         column_type: 'text',     is_visible: false, is_default: true, sort_order: 13, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'twitter_url',       column_label: 'Twitter / X',      column_type: 'text',     is_visible: false, is_default: true, sort_order: 14, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'contact_details', column_key: 'created_at',        column_label: 'Added On',         column_type: 'date',     is_visible: false, is_default: true, sort_order: 15, dropdown_options: [] },

          // ── Pipeline view — Default visible: Name, Priority, Status, Action to Take, Last Contacted At, Template Used, Reach
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'name',              column_label: 'Name',              column_type: 'text',     is_visible: true,  is_default: true, sort_order: 0, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'priority',          column_label: 'Priority',          column_type: 'dropdown', is_visible: true,  is_default: true, sort_order: 1, dropdown_options: [
            { label: 'Hot', color: '#ef4444' },
            { label: 'Warm', color: '#f59e0b' },
            { label: 'Cold', color: '#3b82f6' }
          ] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'status',            column_label: 'Status',            column_type: 'dropdown', is_visible: true,  is_default: true, sort_order: 2, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'action_to_take',    column_label: 'Action to Take',    column_type: 'dropdown', is_visible: true,  is_default: true, sort_order: 3, dropdown_options: [
            { label: 'Send first pitch', color: '#3b82f6' },
            { label: 'Wait for reply', color: '#6b7280' },
            { label: 'Send a follow up', color: '#f59e0b' },
            { label: 'Send a different pitch', color: '#8b5cf6' },
            { label: 'Send proposal', color: '#5B8FB9' },
            { label: 'Send Calendly', color: '#6366f1' },
            { label: 'Prepare for call', color: '#8b5cf6' },
            { label: 'Send invoice', color: '#10b981' },
            { label: 'No action needed', color: '#6b7280' }
          ] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'last_contacted_at', column_label: 'Last Contacted At', column_type: 'date',     is_visible: true,  is_default: true, sort_order: 4, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'template_used',     column_label: 'Template Used',    column_type: 'link',     is_visible: true,  is_default: true, sort_order: 5, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'platform',          column_label: 'Reach',             column_type: 'reach',    is_visible: true,  is_default: true, sort_order: 6, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'niche',             column_label: 'Niche',             column_type: 'text',     is_visible: false, is_default: true, sort_order: 7, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'email',             column_label: 'Email',             column_type: 'text',     is_visible: false, is_default: true, sort_order: 8, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'phone',             column_label: 'Phone',             column_type: 'text',     is_visible: false, is_default: true, sort_order: 9, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'pipeline', column_key: 'company',           column_label: 'Company',           column_type: 'text',     is_visible: false, is_default: true, sort_order: 10, dropdown_options: [] },
          
          { user_id: currentUser.id, table_view: 'clients', column_key: 'name', column_label: 'Client Name', column_type: 'text', is_visible: true, is_default: true, sort_order: 0, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'clients', column_key: 'email', column_label: 'Email', column_type: 'text', is_visible: true, is_default: true, sort_order: 1, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'clients', column_key: 'phone', column_label: 'Phone', column_type: 'text', is_visible: true, is_default: true, sort_order: 2, dropdown_options: [] },
          { 
            user_id: currentUser.id, 
            table_view: 'clients', 
            column_key: 'project_status', 
            column_label: 'Project Status', 
            column_type: 'dropdown', 
            is_visible: true, 
            is_default: true, 
            sort_order: 3, 
            dropdown_options: [
              { label: 'Onboarding', color: '#3b82f6' },
              { label: 'In Progress', color: '#f59e0b' },
              { label: 'On Hold', color: '#ef4444' },
              { label: 'Completed', color: '#10b981' }
            ] 
          },
          { user_id: currentUser.id, table_view: 'clients', column_key: 'contract_value', column_label: 'Contract Value', column_type: 'text', is_visible: true, is_default: true, sort_order: 4, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'clients', column_key: 'billing_invoice_link', column_label: 'Invoice Link', column_type: 'link', is_visible: true, is_default: true, sort_order: 5, dropdown_options: [] },
          { user_id: currentUser.id, table_view: 'clients', column_key: 'start_date', column_label: 'Start Date', column_type: 'date', is_visible: true, is_default: true, sort_order: 6, dropdown_options: [] }
        ];

        const { data: seeded, error: seedErr } = await supabase
          .from('column_definitions')
          .insert(defaultDefs)
          .select();

        if (seedErr) throw seedErr;
        const seededList = seeded || [];
        setColumnDefs(seededList);
        localStorage.setItem('crm_columns', JSON.stringify(seededList));
      } else {
        // ── Deduplicate: keep only the first entry per (table_view, column_key) ──
        const seen = new Set();
        const dedupedCols = cols.filter(c => {
          const key = `${c.table_view}::${c.column_key}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        // ── Seed any missing default columns for existing users ──
        const allDefaultKeys = [
          // contact_details
          { table_view: 'contact_details', column_key: 'name',              column_label: 'Name',             column_type: 'text',     is_visible: true,  sort_order: 0,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'status',            column_label: 'Status',           column_type: 'status',   is_visible: true,  sort_order: 1,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'platform',          column_label: 'Reach',            column_type: 'reach',    is_visible: true,  sort_order: 2,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'email',             column_label: 'Email',            column_type: 'text',     is_visible: false, sort_order: 3,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'phone',             column_label: 'Phone',            column_type: 'text',     is_visible: false, sort_order: 4,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'company',           column_label: 'Company',          column_type: 'text',     is_visible: false, sort_order: 5,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'instagram_url',     column_label: 'Instagram',        column_type: 'text',     is_visible: false, sort_order: 6,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'website',           column_label: 'Website',          column_type: 'text',     is_visible: false, sort_order: 7,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'priority',          column_label: 'Priority',         column_type: 'priority', is_visible: false, sort_order: 8,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'niche',             column_label: 'Niche',            column_type: 'text',     is_visible: false, sort_order: 9,  dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'template_used',     column_label: 'Template Used',   column_type: 'link',     is_visible: false, sort_order: 10, dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'action_to_take',    column_label: 'Action to Take',   column_type: 'dropdown', is_visible: false, sort_order: 11, dropdown_options: [
            { label: 'Send first pitch', color: '#3b82f6' }, { label: 'Wait for reply', color: '#6b7280' }, { label: 'Send a follow up', color: '#f59e0b' }, { label: 'Send a different pitch', color: '#8b5cf6' }, { label: 'Send proposal', color: '#5B8FB9' }, { label: 'Send Calendly', color: '#6366f1' }, { label: 'Prepare for call', color: '#8b5cf6' }, { label: 'Send invoice', color: '#10b981' }, { label: 'No action needed', color: '#6b7280' }
          ] },
          { table_view: 'contact_details', column_key: 'last_contacted_at', column_label: 'Last Contacted At', column_type: 'date',    is_visible: false, sort_order: 12, dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'linkedin_url',      column_label: 'LinkedIn',          column_type: 'text',    is_visible: false, sort_order: 13, dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'twitter_url',       column_label: 'Twitter / X',       column_type: 'text',    is_visible: false, sort_order: 14, dropdown_options: [] },
          { table_view: 'contact_details', column_key: 'created_at',        column_label: 'Added On',          column_type: 'date',    is_visible: false, sort_order: 15, dropdown_options: [] },
          // pipeline
          { table_view: 'pipeline', column_key: 'name',              column_label: 'Name',              column_type: 'text',     is_visible: true,  sort_order: 0, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'priority',          column_label: 'Priority',          column_type: 'dropdown', is_visible: true,  sort_order: 1, dropdown_options: [
            { label: 'Hot', color: '#ef4444' }, { label: 'Warm', color: '#f59e0b' }, { label: 'Cold', color: '#3b82f6' }
          ] },
          { table_view: 'pipeline', column_key: 'status',            column_label: 'Status',            column_type: 'dropdown', is_visible: true,  sort_order: 2, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'action_to_take',    column_label: 'Action to Take',    column_type: 'dropdown', is_visible: true,  sort_order: 3, dropdown_options: [
            { label: 'Send first pitch', color: '#3b82f6' }, { label: 'Wait for reply', color: '#6b7280' }, { label: 'Send a follow up', color: '#f59e0b' }, { label: 'Send a different pitch', color: '#8b5cf6' }, { label: 'Send proposal', color: '#5B8FB9' }, { label: 'Send Calendly', color: '#6366f1' }, { label: 'Prepare for call', color: '#8b5cf6' }, { label: 'Send invoice', color: '#10b981' }, { label: 'No action needed', color: '#6b7280' }
          ] },
          { table_view: 'pipeline', column_key: 'last_contacted_at', column_label: 'Last Contacted At', column_type: 'date',     is_visible: true,  sort_order: 4, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'template_used',     column_label: 'Template Used',    column_type: 'link',     is_visible: true,  sort_order: 5, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'platform',          column_label: 'Reach',             column_type: 'reach',    is_visible: true,  sort_order: 6, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'niche',             column_label: 'Niche',             column_type: 'text',     is_visible: false, sort_order: 7, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'email',             column_label: 'Email',             column_type: 'text',     is_visible: false, sort_order: 8, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'phone',             column_label: 'Phone',             column_type: 'text',     is_visible: false, sort_order: 9, dropdown_options: [] },
          { table_view: 'pipeline', column_key: 'company',           column_label: 'Company',           column_type: 'text',     is_visible: false, sort_order: 10, dropdown_options: [] },
        ];

        const existingKeys = new Set(dedupedCols.map(c => `${c.table_view}::${c.column_key}`));
        const missingDefs = allDefaultKeys
          .filter(d => !existingKeys.has(`${d.table_view}::${d.column_key}`))
          .map(d => ({ ...d, user_id: currentUser.id, is_default: true }));

        if (missingDefs.length > 0) {
          const { data: newCols } = await supabase
            .from('column_definitions')
            .insert(missingDefs)
            .select();
          const combined = [...dedupedCols, ...(newCols || [])];
          setColumnDefs(combined);
          localStorage.setItem('crm_columns', JSON.stringify(combined));
        } else {
          setColumnDefs(dedupedCols);
          localStorage.setItem('crm_columns', JSON.stringify(dedupedCols));
        }
      }
    } catch (err) {
      console.error('Error fetching CRM data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDropdownChange = async (leadId, field, newVal) => {
    if (field === 'status') {
      handleStatusChange(leadId, newVal);
      return;
    }

    const targetData = view === 'clients' ? clients : leads;
    const targetSetData = view === 'clients' ? setClients : setLeads;
    const targetTable = view === 'clients' ? 'clients' : 'leads';

    const item = targetData.find(l => l.id === leadId);
    const originalVal = item ? item[field] : null;

    try {
      const { data, error } = await supabase.from(targetTable)
        .update({ [field]: newVal })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      targetSetData(prev => prev.map(l => l.id === leadId ? data : l));

      if (targetTable === 'leads') {
        // log activity
        await supabase.from('lead_activity').insert({
          user_id: currentUser.id,
          lead_id: leadId,
          action_type: `${field.charAt(0).toUpperCase() + field.slice(1)} Updated`,
          action_detail: { from: originalVal || 'None', to: newVal }
        });
      }
    } catch (err) {
      console.error(`Error updating field ${field}:`, err);
    }
  };

  const handleClearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setFilterStatuses([]);
    setFilterPriorities([]);
    setFilterActions([]);
    setFilterProjects([]);
    setFilterDateRange('all');
    setFilterDateField('created_at');
    setSearchQuery('');
  };

  const handleResetToDefault = async (targetView) => {
    const viewToReset = targetView || view;
    if (!confirm(`Are you sure you want to reset ${viewToReset === 'contact_details' ? 'Contact Details' : 'Pipeline'} to default? All custom columns for this view will be deleted.`)) return;
    try {
      await supabase
        .from('column_definitions')
        .delete()
        .eq('user_id', currentUser.id)
        .eq('table_view', viewToReset);

      await fetchData();
    } catch (err) {
      console.error('Error resetting columns:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchData();
    }
  }, [currentUser]);

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter, selectedFolderId]);

  // Auto-open lead from follow-up reminder action
  useEffect(() => {
    const checkAutoOpen = async () => {
      const stored = sessionStorage.getItem('reachdesk_auto_open_lead');
      if (stored && currentUser) {
        sessionStorage.removeItem('reachdesk_auto_open_lead');
        try {
          const { leadId, preselectStatus } = JSON.parse(stored);
          if (leadId) {
            const { data: lead, error } = await supabase
              .from('leads')
              .select('*')
              .eq('id', leadId)
              .maybeSingle();

            if (!error && lead) {
              const modifiedLead = { ...lead, status: preselectStatus };
              setSelectedLead(modifiedLead);
            }
          }
        } catch (e) {
          console.error('[CRM] Error parsing auto-open lead:', e);
        }
      }
    };

    checkAutoOpen();

    window.addEventListener('reachdesk_trigger_auto_open', checkAutoOpen);
    return () => {
      window.removeEventListener('reachdesk_trigger_auto_open', checkAutoOpen);
    };
  }, [currentUser]);

  // Google Sheets: check connection status & handle callback success banner
  useEffect(() => {
    async function checkSheetsConnection() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('sheets_integrations')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      setSheetsConnected(!!data?.id);
      setSheetsConnectedChecked(true);
    }
    checkSheetsConnection();

    // Handle ?connected=sheets callback after OAuth
    const connectedParam = new URLSearchParams(window.location.search).get('connected');
    if (connectedParam === 'sheets') {
      setSheetsConnected(true);
      showToast?.('Google Sheets connected successfully!', 'success');
      // Clean the URL param
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.delete('connected');
      window.history.replaceState(null, '', nextUrl.toString());
    }
  }, [currentUser]);


  const totalLeadsCount = leads.length;
  const leadLimit = getPlanLeadLimit(plan, currentUser.billing_cycle) || Infinity;
  const isLeadLimitReached = leadLimit !== Infinity && totalLeadsCount >= leadLimit;
  const canUseIntegrations = PLAN_LIMITS[(currentUser?.plan || 'trial').toLowerCase()]?.sheetsIntegration ?? false;

  const leadLimitTooltip = 'Lead limit reached. Delete leads or upgrade.';

  const handleOpenAddLead = () => {
    if (isLeadLimitReached) {
      setShowLeadLimitBlockModal(true);
      return;
    }
    setLeadForm({
      name: '', email: '', phone: '', company: '', niche: '',
      priority: 'Warm', status: 'Lead', notes: '', folder_id: selectedFolderId || '',
      template_used: '',
      links: [],
      custom_fields: {}
    });
    setPastedLink('');
    setShowAddLeadModal(true);
  };

  // Add Lead
  const handleAddLead = async (e) => {
    e.preventDefault();
    if (isLeadLimitReached) return;

    try {
      const parts = (leadForm.name || '').trim().split(' ');
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || null;

      const linksArray = [...(leadForm.links || [])];
      if (pastedLink && pastedLink.trim()) {
        const val = pastedLink.trim();
        const cleanUrl = val.startsWith('http') ? val : `https://${val}`;
        const label = detectPlatformLabel(val);
        if (!linksArray.some(l => l.url === cleanUrl)) {
          linksArray.push({ url: cleanUrl, label });
        }
      }

      const urlUpdates = { linkedin_url: null, instagram_url: null, twitter_url: null, website: null };
      linksArray.forEach(link => {
        const url = typeof link === 'string' ? link : link.url;
        if (url.includes('linkedin.com')) urlUpdates.linkedin_url = url;
        else if (url.includes('instagram.com')) urlUpdates.instagram_url = url;
        else if (url.includes('twitter.com') || url.includes('x.com')) urlUpdates.twitter_url = url;
        else urlUpdates.website = url;
      });

      const finalCustomFields = {
        ...(leadForm.custom_fields || {}),
        links: linksArray
      };

      const { data, error } = await supabase.from('leads')
        .insert({
          first_name,
          last_name,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          company: leadForm.company || null,
          niche: leadForm.niche || null,
          linkedin_url: urlUpdates.linkedin_url,
          instagram_url: urlUpdates.instagram_url,
          twitter_url: urlUpdates.twitter_url,
          website: urlUpdates.website,
          priority: leadForm.priority || 'Warm',
          status: leadForm.status || 'Lead',
          notes: leadForm.notes || null,
          user_id: currentUser.id,
          folder_id: leadForm.folder_id || null,
          template_used: leadForm.template_used || null,
          custom_fields: finalCustomFields
        })
        .select()
        .single();

      if (error) throw error;
      setLeads(prev => [data, ...prev]);
      setShowAddLeadModal(false);

      // Check remaining quota for countdown toast
      try {
        const remaining = await getRemainingLeadQuota(currentUser.id);
        if (shouldShowCountdownToast(remaining)) {
          setToastRemaining(remaining);
        }
      } catch (quotaErr) {
        console.error('Error fetching remaining lead quota:', quotaErr);
      }
    } catch (err) {
      if (err?.message?.includes('Lead limit reached')) {
        setShowLeadLimitBlockModal(true);
      } else {
        console.error('Error adding lead:', err);
      }
    }
  };

  // Quick Add Lead
  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();

    try {
      const { data, error } = await supabase.from('leads')
        .insert({
          first_name: quickAddForm.first_name,
          priority: quickAddForm.priority,
          status: 'Lead',
          user_id: currentUser.id,
          folder_id: selectedFolderId || null
        })
        .select()
        .single();

      if (error) throw error;
      setLeads(prev => [data, ...prev]);
      setShowQuickAddModal(false);
      setQuickAddForm({ first_name: '', priority: 'Warm' });

      // Check remaining quota for countdown toast
      try {
        const remaining = await getRemainingLeadQuota(currentUser.id);
        if (shouldShowCountdownToast(remaining)) {
          setToastRemaining(remaining);
        }
      } catch (quotaErr) {
        console.error('Error fetching remaining lead quota:', quotaErr);
      }
    } catch (err) {
      if (err?.message?.includes('Lead limit reached')) {
        setShowLeadLimitBlockModal(true);
      } else {
        console.error('Error quick adding lead:', err);
      }
    }
  };

  const handleAddNewCustomField = async (name, type) => {
    if (!name.trim()) return;
    try {
      const { data, error } = await supabase
        .from('column_definitions')
        .insert({
          user_id: currentUser.id,
          table_view: view === 'pipeline' ? 'pipeline' : 'contact_details',
          column_key: name.trim().toLowerCase().replace(/\s+/g, '_'),
          column_label: name.trim(),
          column_type: type,
          is_visible: true,
          is_default: false,
          sort_order: columnDefs.length
        })
        .select()
        .single();
      if (error) throw error;
      setColumnDefs(prev => [...prev, data]);
    } catch (err) {
      console.error('Error adding custom field:', err);
      alert('Failed to add custom field: ' + err.message);
    }
  };

  const handleRemoveCustomFieldVal = (columnKey) => {
    setLeadForm(prev => {
      const updatedFields = { ...(prev.custom_fields || {}) };
      delete updatedFields[columnKey];
      return {
        ...prev,
        custom_fields: updatedFields
      };
    });
  };

  // Open Edit Lead
  const handleOpenEditLead = (lead) => {
    setActiveLead(lead);
    const existingLinks = lead.custom_fields?.links ? [...lead.custom_fields.links] : [];
    
    // Ensure all URL columns are also present in existingLinks to pre-populate correctly
    const addIfMissing = (url, label) => {
      if (url && !existingLinks.some(l => l.url === url)) {
        existingLinks.push({ url, label });
      }
    };
    
    addIfMissing(lead.linkedin_url, 'LinkedIn');
    addIfMissing(lead.instagram_url, 'Instagram');
    addIfMissing(lead.twitter_url, 'Twitter');
    addIfMissing(lead.website, 'Website');

    setLeadForm({
      name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      niche: lead.niche || '',
      priority: lead.priority || 'Warm',
      status: lead.status || 'Lead',
      notes: lead.notes || '',
      folder_id: lead.folder_id || '',
      template_used: lead.template_used || '',
      links: existingLinks,
      custom_fields: lead.custom_fields || {}
    });
    setPastedLink('');
    setShowEditLeadModal(true);
  };

  // Edit Lead
  const handleEditLead = async (e) => {
    e.preventDefault();
    try {
      const parts = (leadForm.name || '').trim().split(' ');
      const first_name = parts[0] || '';
      const last_name = parts.slice(1).join(' ') || null;

      const linksArray = [...(leadForm.links || [])];
      if (pastedLink && pastedLink.trim()) {
        const val = pastedLink.trim();
        const cleanUrl = val.startsWith('http') ? val : `https://${val}`;
        const label = detectPlatformLabel(val);
        if (!linksArray.some(l => l.url === cleanUrl)) {
          linksArray.push({ url: cleanUrl, label });
        }
      }

      const urlUpdates = { linkedin_url: null, instagram_url: null, twitter_url: null, website: null };
      linksArray.forEach(link => {
        const url = typeof link === 'string' ? link : link.url;
        if (url.includes('linkedin.com')) urlUpdates.linkedin_url = url;
        else if (url.includes('instagram.com')) urlUpdates.instagram_url = url;
        else if (url.includes('twitter.com') || url.includes('x.com')) urlUpdates.twitter_url = url;
        else urlUpdates.website = url;
      });

      const finalCustomFields = {
        ...(leadForm.custom_fields || {}),
        links: linksArray
      };

      const { data, error } = await supabase.from('leads')
        .update({
          first_name,
          last_name,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          company: leadForm.company || null,
          niche: leadForm.niche || null,
          linkedin_url: urlUpdates.linkedin_url,
          instagram_url: urlUpdates.instagram_url,
          twitter_url: urlUpdates.twitter_url,
          website: urlUpdates.website,
          priority: leadForm.priority || 'Warm',
          status: leadForm.status || 'Lead',
          notes: leadForm.notes || null,
          folder_id: leadForm.folder_id || null,
          template_used: leadForm.template_used || null,
          custom_fields: finalCustomFields
        })
        .eq('id', activeLead.id)
        .select()
        .single();

      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === activeLead.id ? data : l));
      // Only re-trigger checkpoint/reminder logic if the status was actually changed
      if (leadForm.status !== activeLead.status) {
        await updateLeadStatusAndCheckpoint({
          lead: data,
          newStatus: leadForm.status,
          suggestionRules,
          currentUser
        });
        if (leadForm.status === 'Closed Won') {
          celebrateClosedWon();
        }
      }
      setShowEditLeadModal(false);
      if (onRefreshReminders) onRefreshReminders();
    } catch (err) {
      console.error('Error updating lead:', err);
    }
  };

  // Handle lead status inline change (with Reply Prompt triggers)
  const handleStatusChange = async (leadId, newStatus) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const lowerStatus = newStatus.toLowerCase().replace(/[\s_]+/g, '_');
    const isReplyTrigger = ['positive_reply', 'booked'].includes(lowerStatus);

    if (isReplyTrigger && !lead.reply_type) {
      // Show Reply Prompt Modal
      setReplyPromptLead(lead);
      setReplyPromptStatus(newStatus);
      setReplyType('positive');
      setReplyTemplateId('');
      setReplyNotes('');
      setNextStep(null);
      setNextStepLink('');
      return;
    }

    try {
      const updatedLead = await updateLeadStatusAndCheckpoint({
        lead,
        newStatus,
        suggestionRules,
        currentUser
      });

      if (updatedLead?.draftCreated && showToast) {
        showToast(`Draft invoice generated for ${[updatedLead.first_name, updatedLead.last_name].filter(Boolean).join(' ') || 'Lead'}`);
      }

      setLeads(prev => prev.map(l => l.id === leadId ? updatedLead : l));
      if (onRefreshReminders) onRefreshReminders();

      if (newStatus === 'Closed Won' && lead.status !== 'Closed Won') {
        celebrateClosedWon();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Save Reply Type Prompt
  const handleSaveReplyPrompt = async (forcedNextStep = null, forcedLink = null) => {
    if (!replyPromptLead) return;
    try {
      const repType = replyType === 'skip' ? null : replyType;

      // 1. Insert Outreach Log
      const { error: logErr } = await supabase.from('outreach_log').insert({
        user_id: currentUser.id,
        lead_id: replyPromptLead.id,
        template_id: replyTemplateId || null,
        reply_received: replyType !== 'skip',
        reply_type: repType,
        reply_notes: replyNotes,
        sent: true,
        sent_at: new Date().toISOString()
      });

      if (logErr) throw logErr;

      // Determine next status and custom action_to_take if user chose proposal/meeting step
      let targetStatus = replyPromptStatus;
      const extraUpdates = {
        reply_type: repType,
        template_used: replyTemplateId || null
      };

      const isBooked = (replyPromptStatus || '').toLowerCase() === 'booked';
      const activeNextStep = forcedNextStep !== null ? forcedNextStep : nextStep;
      const activeLink = forcedLink !== null ? forcedLink : nextStepLink;

      if (replyType === 'positive' && !isBooked) {
        if (activeNextStep === 'proposal') {
          targetStatus = 'Proposal Sent';
          if (activeLink) {
            extraUpdates.action_to_take = activeLink;
          }
        } else if (activeNextStep === 'meeting') {
          targetStatus = 'Calendly Sent';
          if (activeLink) {
            extraUpdates.action_to_take = activeLink;
          }
        }
      }

      // 2. Update Lead status and reply details via unified checkpoint logic
      const updatedLead = await updateLeadStatusAndCheckpoint({
        lead: replyPromptLead,
        newStatus: targetStatus,
        suggestionRules,
        currentUser,
        extraUpdates
      });

      if (updatedLead?.draftCreated && showToast) {
        showToast(`Draft invoice generated for ${[updatedLead.first_name, updatedLead.last_name].filter(Boolean).join(' ') || 'Lead'}`);
      }

      setLeads(prev => prev.map(l => l.id === replyPromptLead.id ? updatedLead : l));
      setReplyPromptLead(null);
      setNextStep(null);
      setNextStepLink('');
      if (onRefreshReminders) onRefreshReminders();
    } catch (err) {
      console.error('Error saving reply prompt:', err);
    }
  };

  // Convert to Client
  const handleConvertSubmit = async (lead, clientData) => {
    try {
      // 1. Update Lead lifecycle stage and status to Client
      const updatedLead = await updateLeadStatusAndCheckpoint({
        lead,
        newStatus: 'Client',
        suggestionRules,
        currentUser,
        extraUpdates: { lifecycle_stage: 'client' }
      });

      // 2. Insert into Clients
      const { data: newClient, error: clientErr } = await supabase.from('clients')
        .insert({
          lead_id: lead.id,
          user_id: currentUser.id,
          ...clientData,
          contract_value: clientData.contract_value ? parseFloat(clientData.contract_value) : null
        })
        .select()
        .single();
      
      if (clientErr) throw clientErr;

      // 2b. Link existing lead_notes to this new client
      await supabase.from('lead_notes')
        .update({ client_id: newClient.id })
        .eq('lead_id', lead.id);

      // 3. Update States
      setLeads(prev => prev.map(l => l.id === lead.id ? updatedLead : l));
      setClients(prev => [newClient, ...prev]);
      setConvertingLead(null);
      
      // Optionally update selectedLead if the drawer is open
      if (selectedLead && selectedLead.id === lead.id) {
        setSelectedLead(updatedLead);
      }
      if (activeLead && activeLead.id === lead.id) {
        setActiveLead(updatedLead);
      }
      
      alert('Successfully converted to client!');
    } catch (err) {
      console.error('Error converting lead to client:', err);
      alert('Failed to convert: ' + err.message);
    }
  };

  // ── Folders Management CRUD ───────────────────────────────────────────────

  const handleCreateFolder = async (e) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.from('folders')
        .insert({
          user_id: currentUser.id,
          name: folderForm.name,
          color: folderForm.color,
          sort_order: folders.length
        })
        .select()
        .single();

      if (error) throw error;
      setFolders(prev => [...prev, data]);
      setFolderForm({ name: '', color: '#3b82f6' });
      setShowFolderModal(false);
    } catch (err) {
      console.error('Error creating folder:', err);
    }
  };

  const handleDeleteFolder = async (folderId) => {
    const leadsInFolder = leads.filter(l => l.folder_id === folderId);
    
    let deleteLeads = false;
    if (leadsInFolder.length > 0) {
      const choice = window.confirm(
        `Folder contains ${leadsInFolder.length} leads. \n\nClick [OK] to move leads to "All Leads".\nClick [Cancel] to delete all leads inside this folder too.`
      );
      deleteLeads = !choice;
    } else {
      if (!confirm('Delete this folder?')) return;
    }

    try {
      if (deleteLeads) {
        const leadIds = leadsInFolder.map(l => l.id);
        // Delete logs, then leads
        await supabase.from('outreach_log').delete().in('lead_id', leadIds);
        await supabase.from('leads').delete().in('id', leadIds);
        setLeads(prev => prev.filter(l => l.folder_id !== folderId));
      } else {
        // Remove leads folder reference
        await supabase.from('leads').update({ folder_id: null }).eq('folder_id', folderId);
        setLeads(prev => prev.map(l => l.folder_id === folderId ? { ...l, folder_id: null } : l));
      }

      await supabase.from('folders').delete().eq('id', folderId);
      setFolders(prev => prev.filter(f => f.id !== folderId));
      if (selectedFolderId === folderId) handleSelectFolder(null);
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  const handleDeleteSmartFolder = async (folderId) => {
    if (!confirm('Delete this smart folder?')) return;
    try {
      await supabase.from('user_folders').delete().eq('id', folderId);
      setUserFolders(prev => prev.filter(uf => uf.id !== folderId));
      if (selectedFolderId === folderId) handleSelectFolder(null);
    } catch (err) {
      console.error('Error deleting smart folder:', err);
    }
  };

  const matchRule = (lead, rule) => {
    const { field, operator, value } = rule;
    if (!field) return true;
    
    let leadValue = '';
    if (field === 'Status') {
      leadValue = lead.status || '';
    } else if (field === 'Priority') {
      leadValue = lead.priority || '';
    } else if (field === 'Tag') {
      leadValue = lead.niche || lead.tags || lead.tag || '';
    }

    const leadStr = String(leadValue).toLowerCase();
    const ruleStr = String(value).toLowerCase();

    let isMatch = leadStr === ruleStr;
    if (field === 'Status') {
      const normalizeStatus = (val) => {
        if (!val) return '';
        const lower = val.toLowerCase().trim();
        if (lower === 'booked' || lower === 'call booked') return 'booked';
        if (lower === 'no show' || lower === 'no show / rescheduled') return 'no show';
        return lower.replace(/_/g, ' ');
      };
      isMatch = normalizeStatus(leadValue) === normalizeStatus(value);
    } else if (field === 'Priority') {
      isMatch = leadStr === ruleStr || matchesPriority(leadValue, value);
    }

    if (operator === 'is') {
      return isMatch;
    } else if (operator === 'is not') {
      return !isMatch;
    }
    return true;
  };

  const matchesPriority = (leadPriority, filterValue) => {
    if (!filterValue || filterValue === 'All') return true;
    if (!leadPriority) return false;
    
    const norm = leadPriority.toLowerCase();
    if (filterValue === 'High') {
      return norm.includes('hot') || norm.includes('high');
    }
    if (filterValue === 'Medium') {
      return norm.includes('warm') || norm.includes('medium');
    }
    if (filterValue === 'Low') {
      return norm.includes('cold') || norm.includes('low');
    }
    return false;
  };

  const handleRenameFolder = async (folderId, newName) => {
    if (['all', 'hot', 'warm', 'cold', 'needs-followup', 'recently-followed-up', 'calendly', 'clients'].includes(folderId)) {
      setSystemFolderNames(prev => {
        const next = { ...prev, [folderId]: newName };
        localStorage.setItem('crm_system_folder_names', JSON.stringify(next));
        return next;
      });
      return;
    }
    try {
      const { error } = await supabase.from('folders')
        .update({ name: newName })
        .eq('id', folderId);
      if (error) throw error;
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, name: newName } : f));
    } catch (err) {
      console.error('Error renaming folder:', err);
    }
  };

  const triggerRename = (folderId, currentName) => {
    const newName = prompt('Enter new folder name:', currentName);
    if (newName && newName.trim()) {
      handleRenameFolder(folderId, newName.trim());
    }
  };

  // ── Bulk Actions & Quick Clean ────────────────────────────────────────────

  const handleToggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (filteredLeads) => {
    const allIds = filteredLeads.map(l => l.id);
    const areAllSelected = allIds.every(id => selectedIds.includes(id));
    if (areAllSelected) {
      setSelectedIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete ${selectedIds.length} leads?`)) return;

    try {
      await supabase.from('outreach_log').delete().in('lead_id', selectedIds);
      await supabase.from('leads').delete().in('id', selectedIds);

      setLeads(prev => prev.filter(l => !selectedIds.includes(l.id)));
      setSelectedIds([]);
    } catch (err) {
      console.error('Error during bulk delete:', err);
    }
  };

  const handleBulkStatusChange = async (newStatus) => {
    try {
      const updatedLeads = await Promise.all(
        selectedIds.map(id => {
          const lead = leads.find(l => l.id === id);
          return updateLeadStatusAndCheckpoint({
            lead,
            newStatus,
            suggestionRules,
            currentUser
          });
        })
      );

      const draftsCreated = updatedLeads.filter(l => l?.draftCreated);
      if (draftsCreated.length > 0 && showToast) {
        if (draftsCreated.length === 1) {
          const u = draftsCreated[0];
          showToast(`Draft invoice generated for ${[u.first_name, u.last_name].filter(Boolean).join(' ') || 'Lead'}`);
        } else {
          showToast(`Draft invoices generated for ${draftsCreated.length} leads`);
        }
      }

      setLeads(prev => prev.map(l => {
        const u = updatedLeads.find(item => item.id === l.id);
        return u ? u : l;
      }));

      // Trigger confetti if status changed to Closed Won
      if (newStatus === 'Closed Won') {
        const anyChangedToClosedWon = selectedIds.some(id => {
          const lead = leads.find(l => l.id === id);
          return lead && lead.status !== 'Closed Won';
        });
        if (anyChangedToClosedWon) {
          celebrateClosedWon();
        }
      }

      setSelectedIds([]);
      setShowBulkStatusMenu(false);
      if (onRefreshReminders) onRefreshReminders();
    } catch (err) {
      console.error('Error during bulk status update:', err);
    }
  };

  const handleBulkMoveToFolder = async (folderId) => {
    try {
      const fid = folderId || null;
      await supabase.from('leads').update({ folder_id: fid }).in('id', selectedIds);
      setLeads(prev => prev.map(l => selectedIds.includes(l.id) ? { ...l, folder_id: fid } : l));
      setSelectedIds([]);
    } catch (err) {
      console.error('Error during bulk folder movement:', err);
    }
  };

  const handleQuickCleanSelect = (type) => {
    setShowQuickClean(false);
    if (type === 'not_interested') {
      setSelectedIds(leads.filter(l => l.status === 'Not Interested').map(l => l.id));
    } else if (type === 'no_reply_24h') {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      setSelectedIds(leads.filter(l => 
        l.status === 'Contacted' && !l.reply_type && new Date(l.created_at) < oneDayAgo
      ).map(l => l.id));
    } else if (type === 'current_folder') {
      setSelectedIds(leads.filter(l => l.folder_id === selectedFolderId).map(l => l.id));
    }
  };

  // ── CSV Import ────────────────────────────────────────────────────────────

  const handleImportCSVSubmit = async (e) => {
    e.preventDefault();
    if (isLeadLimitReached) {
      alert('Lead limit reached. Delete leads or upgrade to import more.');
      return;
    }

    const lines = importText.split('\n').filter(l => l.trim());
    if (lines.length < 2) {
      alert('CSV must contain a header row and at least one lead row.');
      return;
    }

    // Simple parser
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const firstIdx = headers.indexOf('first name') !== -1 ? headers.indexOf('first name') : headers.indexOf('name');
    const lastIdx = headers.indexOf('last name');
    const emailIdx = headers.indexOf('email');
    const companyIdx = headers.indexOf('company');
    const phoneIdx = headers.indexOf('phone');
    const roleIdx = headers.indexOf('role');

    // Only first name (or name) column is required
    if (firstIdx === -1) {
      alert('CSV headers must include a "First Name" or "Name" column.');
      return;
    }

    const importedLeads = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      if (cols.length < headers.length) continue;

      let fName = cols[firstIdx] || '';
      let lName = lastIdx !== -1 ? cols[lastIdx] : '';

      // Split first/last name if only Name was supplied
      if (firstIdx !== -1 && lastIdx === -1) {
        const nameParts = fName.split(' ');
        fName = nameParts[0] || '';
        lName = nameParts.slice(1).join(' ') || '';
      }

      importedLeads.push({
        user_id: currentUser.id,
        first_name: fName,
        last_name: lName,
        email: emailIdx !== -1 ? (cols[emailIdx] || '') : '',
        phone: phoneIdx !== -1 ? (cols[phoneIdx] || '') : '',
        company: companyIdx !== -1 ? cols[companyIdx] : '',
        platform: 'LinkedIn',
        status: statuses[0]?.label || 'Lead',
        priority: 'Warm',
        niche: roleIdx !== -1 ? cols[roleIdx] : '',
        folder_id: selectedFolderId || null
      });
    }

    try {
      const { toImport, skippedCount } = await prepareBulkImport(currentUser.id, importedLeads);

      let data = [];
      if (toImport.length > 0) {
        const { data: insertedData, error } = await supabase.from('leads').insert(toImport).select();
        if (error) throw error;
        data = insertedData || [];
        setLeads(prev => [...data, ...prev]);
      }

      setShowImportModal(false);
      setImportText('');

      if (skippedCount > 0) {
        setImportResult({ imported: toImport.length, skipped: skippedCount });
      } else {
        alert(`Imported ${data.length} leads successfully!`);
      }
    } catch (err) {
      console.error('Error importing leads:', err);
    }
  };

  // ── Render Helpers ────────────────────────────────────────────────────────

  const getStatusStyle = (statusVal) => {
    const match = statuses.find(s => s.label.toLowerCase() === (statusVal || '').toLowerCase());
    const colors = match ? { bg: `${match.color}22`, text: match.color } : { bg: '#374151', text: '#D1D5DB' };
    return {
      background: colors.bg,
      color: colors.text,
      border: `1px solid ${colors.text}33`,
      borderRadius: '6px',
      padding: '0.2rem 0.55rem',
      fontSize: '0.75rem',
      fontWeight: 700,
      whiteSpace: 'nowrap'
    };
  };

  const filteredLeads = leads.filter(l => {
    // Search
    const fullSearch = `${l.first_name || ''} ${l.last_name || ''} ${l.company || ''} ${l.email || ''}`.toLowerCase();
    const searchMatch = fullSearch.includes(searchQuery.toLowerCase());

    // Filter by Folder
    // null / undefined selectedFolderId = "All Leads" — no folder filter applied
    let folderMatch = true;
    if (selectedFolderId === null || selectedFolderId === undefined) {
      folderMatch = true; // All Leads: show everything regardless of folder_id
    } else if (selectedFolderId === 'hot') {
      folderMatch = l.priority?.toLowerCase() === 'hot';
    } else if (selectedFolderId === 'warm') {
      folderMatch = l.priority?.toLowerCase() === 'warm';
    } else if (selectedFolderId === 'cold') {
      folderMatch = l.priority?.toLowerCase() === 'cold';
    } else if (selectedFolderId === 'needs-followup') {
      folderMatch = l.next_checkpoint_at && new Date(l.next_checkpoint_at) <= new Date();
    } else if (selectedFolderId === 'recently-followed-up') {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
      folderMatch = l.last_contacted_at && new Date(l.last_contacted_at) >= fiveDaysAgo;
    } else if (selectedFolderId === 'calendly') {
      folderMatch = l.status?.toLowerCase() === 'calendly_sent' || l.status === 'Calendly Sent';
    } else if (selectedFolderId === 'clients') {
      folderMatch = l.status === 'Client';
    } else {
      // Smart folder check
      const smartFolder = userFolders.find(uf => uf.id === selectedFolderId);
      if (smartFolder) {
        const config = smartFolder.filter_config || {};
        const rules = config.rules || [];
        folderMatch = rules.length === 0 || rules.every(rule => matchRule(l, rule));
      } else if (folders.find(f => f.id === selectedFolderId)) {
        folderMatch = l.folder_id === selectedFolderId;
      } else {
        folderMatch = true; // Unknown folder ID — show all rather than hide all
      }
    }

    // Status filter matches case-insensitively (supports code and labels)
    const statusMatch = !statusFilter || (() => {
      const normalizeStatus = (val) => {
        if (!val) return '';
        const lower = val.toLowerCase().trim();
        if (lower === 'booked' || lower === 'call booked') return 'booked';
        if (lower === 'no show' || lower === 'no show / rescheduled') return 'no show';
        return lower.replace(/_/g, ' ');
      };
      return normalizeStatus(l.status) === normalizeStatus(statusFilter);
    })();

    // Priority filter matches via helper
    const priorityMatch = matchesPriority(l.priority, priorityFilter);

    // Multi-select status filter from Drawer
    const statusDrawerMatch = filterStatuses.length === 0 || 
      filterStatuses.includes(l.status);

    // Multi-select priority filter from Drawer
    const priorityDrawerMatch = filterPriorities.length === 0 ||
      filterPriorities.includes(l.priority);

    // Multi-select action filter from Drawer
    const actionDrawerMatch = filterActions.length === 0 ||
      filterActions.includes(l.action_to_take);

    // Multi-select project filter from Drawer (supports null/undefined comparison dynamically)
    const projectDrawerMatch = filterProjects.length === 0 ||
      filterProjects.includes(l.project);

    // Date range filter
    let dateRangeMatch = true;
    if (filterDateRange !== 'all') {
      const dateVal = l[filterDateField];
      if (!dateVal) {
        dateRangeMatch = false;
      } else {
        const dateMs = new Date(dateVal).getTime();
        const nowMs = Date.now();
        if (filterDateRange === 'today') {
          const startOfToday = new Date();
          startOfToday.setHours(0, 0, 0, 0);
          dateRangeMatch = dateMs >= startOfToday.getTime();
        } else if (filterDateRange === '7days') {
          const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
          dateRangeMatch = dateMs >= sevenDaysAgo;
        } else if (filterDateRange === '30days') {
          const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
          dateRangeMatch = dateMs >= thirtyDaysAgo;
        }
      }
    }
    return searchMatch && folderMatch && statusMatch && priorityMatch && statusDrawerMatch && priorityDrawerMatch && actionDrawerMatch && projectDrawerMatch && dateRangeMatch;
  });

  // Apply sort
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return new Date(b.created_at) - new Date(a.created_at) || (a.id || '').localeCompare(b.id || '');
      
      case 'contacted': {
        const aDate = a.last_contacted_at ? new Date(a.last_contacted_at) : new Date(0);
        const bDate = b.last_contacted_at ? new Date(b.last_contacted_at) : new Date(0);
        return bDate - aDate;
      }
      
      case 'hot': {
        const priorityOrder = { 'Hot': 0, 'Warm': 1, 'Cold': 2 };
        const aPriority = priorityOrder[a.priority] ?? 3;
        const bPriority = priorityOrder[b.priority] ?? 3;
        return aPriority - bPriority;
      }
      
      case 'name': {
        const aName = (a.first_name || '').toLowerCase();
        const bName = (b.first_name || '').toLowerCase();
        return aName.localeCompare(bName);
      }
      
      case 'status': {
        const statusOrder = [
          'lead',
          'contacted',
          'waiting',
          'positive reply',
          'proposal sent',
          'calendly sent',
          'booked',
          'no show',
          'no show / rescheduled',
          'rescheduled',
          'followed up',
          'not interested',
          'closed won',
          'client'
        ];
        const aStatus = statusOrder.indexOf((a.status || '').toLowerCase().trim());
        const bStatus = statusOrder.indexOf((b.status || '').toLowerCase().trim());
        return (aStatus === -1 ? 99 : aStatus) - (bStatus === -1 ? 99 : bStatus);
      }
      
      default:
        return 0;
    }
  });

  const filteredClients = clients.filter(c => {
    const fullSearch = `${c.name} ${c.email} ${c.phone}`.toLowerCase();
    const searchMatch = fullSearch.includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const handleSelectFolder = (id) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (id === null || id === 'all') {
        next.delete('folder');
      } else {
        next.set('folder', id);
      }
      return next;
    });
    if (view === 'clients') {
      handleViewChange('contact_details');
    }
  };

  const activeList = view === 'clients' ? filteredClients : sortedLeads;
  const totalFiltered = activeList.length;
  const paginatedList = activeList.slice((currentPage - 1) * pageSize, currentPage * pageSize);



  return (
    <div className="flex gap-4 w-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Folders Sidebar Section */}
      <div className="folder-sidebar sidebar-folders">
        {limits.folders ? (
          <>
            <h4 style={{ fontSize: 'var(--text-3xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: 'var(--space-2)', marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              System Folders
              <HelpPopover title="System Folders">
                System folders (Hot, Warm, Cold, Clients, Calendly Sent) are auto-populated by lead Priority and Status. They can't be deleted but their names can be changed in Configuration.
              </HelpPopover>
            </h4>
            
            {/* System Folders */}
            {[
              { id: 'all', dbId: null, defaultLabel: 'All Leads', iconColor: 'var(--text-muted)' },
              { id: 'hot', dbId: 'hot', defaultLabel: 'Hot', iconColor: 'var(--status-hot)' },
              { id: 'warm', dbId: 'warm', defaultLabel: 'Warm', iconColor: 'var(--status-warm)' },
              { id: 'cold', dbId: 'cold', defaultLabel: 'Cold', iconColor: 'var(--status-cold)' },
              { id: 'needs-followup', dbId: 'needs-followup', defaultLabel: 'Needs Follow-Up', iconColor: 'var(--accent-blue)' },
              { id: 'recently-followed-up', dbId: 'recently-followed-up', defaultLabel: 'Recently Followed Up', iconColor: 'var(--accent-green)' },
              { id: 'calendly', dbId: 'calendly', defaultLabel: 'Calendly Sent', iconColor: 'var(--accent-blue)' },
              { id: 'clients', dbId: 'clients', defaultLabel: 'Clients', iconColor: 'var(--accent-blue)' }
            ].map(sysFolder => {
              const label = systemFolderNames[sysFolder.id] || sysFolder.defaultLabel;
              const isSelected = selectedFolderId === sysFolder.dbId;
              return (
                <div key={sysFolder.id} className="group-hover flex justify-between align-center" style={{ width: '100%' }}>
                  <button 
                    onClick={() => handleSelectFolder(sysFolder.dbId)}
                    className={`folder-item ${isSelected ? 'active' : ''}`}
                  >
                    <Folder size={16} style={{ color: sysFolder.iconColor }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{label}</span>
                  </button>
                  <button 
                    onClick={() => triggerRename(sysFolder.id, label)}
                    className="btn-icon edit-btn" 
                    style={{ padding: 'var(--space-1)', color: 'var(--text-secondary)', display: 'none' }}
                    title="Rename Folder"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }}></div>

            <h4 style={{ fontSize: 'var(--text-3xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: 'var(--space-5)', marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-2)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              Smart Folders
              <HelpPopover title="Smart Folders">
                Smart folders auto-filter leads using rules you define (e.g. Status = Contacted). They update live as your leads change. Create them with the + Smart Folder button.
              </HelpPopover>
            </h4>
            {userFolders.map(uf => {
              const count = leads.filter(l => {
                const config = uf.filter_config || {};
                const rules = config.rules || [];
                if (rules.length === 0) return true;
                return rules.every(rule => matchRule(l, rule));
              }).length;

              return (
                <div key={uf.id} className="group-hover flex justify-between align-center" style={{ width: '100%' }}>
                  <button
                    onClick={() => handleSelectFolder(uf.id)}
                    className={`folder-item ${selectedFolderId === uf.id ? 'active' : ''}`}
                  >
                    <Folder size={16} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{uf.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>({count})</span>
                  </button>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => handleDeleteSmartFolder(uf.id)}
                      className="btn-icon delete-btn" 
                      style={{ padding: '0.2rem', color: 'var(--danger-color)', display: 'none' }}
                      title="Delete Smart Folder"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            <button 
              onClick={() => {
                setSmartFolderForm({ name: '', rules: [{ field: 'Status', operator: 'is', value: '' }] });
                setShowSmartFolderModal(true);
              }}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.25rem', fontSize: '0.75rem', justifyContent: 'center' }}
            >
              <FolderPlus size={14} /> + Smart Folder
            </button>

            <div style={{ borderTop: '1px solid var(--border)', margin: 'var(--space-2) 0' }}></div>

            <h4 style={{ fontSize: 'var(--text-3xs)', letterSpacing: 'var(--tracking-label)', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: 'var(--space-5)', marginBottom: 'var(--space-2)', paddingLeft: 'var(--space-2)' }}>Manual Folders</h4>
            {folders.map(f => {
              const count = leads.filter(l => l.folder_id === f.id).length;
              return (
                <div key={f.id} className="group-hover flex justify-between align-center" style={{ width: '100%' }}>
                  <button
                    onClick={() => handleSelectFolder(f.id)}
                    className={`folder-item ${selectedFolderId === f.id ? 'active' : ''}`}
                  >
                    <Folder size={16} style={{ color: f.color }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{f.name}</span>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>({count})</span>
                  </button>
                  <div className="flex gap-1">
                    <button 
                      onClick={() => triggerRename(f.id, f.name)}
                      className="btn-icon edit-btn" 
                      style={{ padding: '0.2rem', color: 'var(--text-secondary)', display: 'none' }}
                      title="Rename Folder"
                    >
                      <Edit3 size={12} />
                    </button>
                    <button 
                      onClick={() => handleDeleteFolder(f.id)}
                      className="btn-icon delete-btn" 
                      style={{ padding: '0.2rem', color: 'var(--danger-color)', display: 'none' }}
                      title="Delete Folder"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })}
            <button 
              onClick={() => setShowFolderModal(true)}
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.25rem', fontSize: '0.75rem', justifyContent: 'center' }}
            >
              <FolderPlus size={14} /> + Manual Folder
            </button>
          </>
        ) : (
          <div className="card flex-col gap-2" style={{ padding: '0.75rem', fontSize: '0.8rem', borderColor: 'var(--border-color)' }}>
            <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Folder size={14} /> Folders</span>
            <p className="color-muted" style={{ fontSize: '0.75rem' }}>Create and manage folders to organize your leads.</p>
          </div>
        )}
      </div>

      {/* Leads Table Content Section */}
      <div className="flex-col gap-4" style={{ flex: 1, textAlign: 'left' }}>
        {/* View Switcher Tabs */}
        <div className="flex gap-2" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1px', marginBottom: '1rem' }}>
          <button 
            type="button"
            onClick={() => handleViewChange('contact_details')}
            className={`btn btn-sm ${view === 'contact_details' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            Contact Details
          </button>
          <button 
            type="button"
            onClick={() => handleViewChange('pipeline')}
            className={`btn btn-sm ${view === 'pipeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}
          >
            Pipeline View
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex justify-between align-center" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex gap-2 align-center" style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
              </span>
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="form-input w-full"
                style={{ paddingLeft: '2.5rem' }}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowQuickClean(!showQuickClean)} className="btn btn-secondary">
                <Zap size={14} /> Quick Clean <ChevronDown size={14} />
              </button>
              {showQuickClean && (
                <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', width: '200px', boxShadow: 'var(--glow-shadow)', padding: '0.25rem' }}>
                  <button onClick={() => handleQuickCleanSelect('not_interested')} className="dropdown-item" style={{ background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>Select "Not Interested"</button>
                  <button onClick={() => handleQuickCleanSelect('no_reply_24h')} className="dropdown-item" style={{ background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>Select No Reply (24h+)</button>
                  <button onClick={() => handleQuickCleanSelect('current_folder')} className="dropdown-item" style={{ background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)' }}>Select Current Folder</button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowNewImportModal(true)}
              className="btn btn-secondary"
              disabled={isLeadLimitReached}
              title={isLeadLimitReached ? leadLimitTooltip : undefined}
              style={isLeadLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Upload size={16} /> Import CSV
            </button>

            {/* Import from Google Sheets — Pro+ only */}
            {canUseIntegrations && (
              <button
                onClick={() => {
                  if (!sheetsConnected) {
                    // Start OAuth directly, save CRM path so user returns here
                    sessionStorage.setItem('sheets_oauth_return', window.location.pathname + window.location.search);
                    const redirectUri = `${window.location.origin}/auth/google-sheets/callback`;
                    const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
                    const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
                    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
                    window.location.href = authUrl;
                  } else {
                    setShowSheetsImportModal(true);
                  }
                }}
                className="btn btn-secondary"
                title={!sheetsConnectedChecked ? 'Checking connection…' : undefined}
                disabled={isLeadLimitReached}
                style={isLeadLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              >
                <Database size={16} />
                {sheetsConnected ? 'Import from Sheets' : 'Connect Sheets to Import'}
              </button>
            )}

            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowExportDropdown(!showExportDropdown)} className="btn btn-secondary" disabled={!!exporting}>
                <Download size={16} /> Export Data <ChevronDown size={14} />
              </button>
              {showExportDropdown && (
                <div className="dropdown-menu" style={{ position: 'absolute', right: 0, top: '100%', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 100, display: 'flex', flexDirection: 'column', width: '180px', boxShadow: 'var(--glow-shadow)', padding: '0.25rem' }}>
                  <button onClick={handleExportLeadsClick} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)', width: '100%' }}>
                    <Download size={14} /> Export Leads (CSV)
                  </button>
                  <button onClick={handleExportNotesClick} className="dropdown-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)', width: '100%' }}>
                    <FileText size={14} /> Export Notes (TXT)
                  </button>
                  {/* Google Sheets export — Pro+ only */}
                  {canUseIntegrations && (
                    <>
                      <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.25rem 0.5rem' }} />
                      <button
                        onClick={() => {
                          setShowExportDropdown(false);
                          if (!sheetsConnected) {
                            sessionStorage.setItem('sheets_oauth_return', window.location.pathname + window.location.search);
                            const redirectUri = `${window.location.origin}/auth/google-sheets/callback`;
                            const clientId = import.meta.env.VITE_GOOGLE_SHEETS_CLIENT_ID;
                            const scope = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';
                            const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent`;
                            window.location.href = authUrl;
                          } else {
                            setShowExportSheetsModal(true);
                          }
                        }}
                        className="dropdown-item"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', padding: '0.5rem 0.75rem', textAlign: 'left', cursor: 'pointer', color: '#10b981', width: '100%', fontSize: '0.875rem' }}
                      >
                        <Download size={14} />
                        {sheetsConnected ? 'Export to Google Sheets' : 'Connect Sheets to Export'}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={handleOpenAddLead}
              className="btn btn-primary"
              disabled={isLeadLimitReached}
              title={isLeadLimitReached ? leadLimitTooltip : undefined}
              style={isLeadLimitReached ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <Plus size={16} /> Add Lead
            </button>
          </div>
        </div>

        {/* 🔍 Filter Bar Row */}
        {view !== 'clients' && (
          <div className="flex gap-4 align-center" style={{ marginTop: '0.75rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem', background: 'var(--bg-secondary)', borderRadius: '8px', flexWrap: 'wrap', border: '1px solid var(--border-color)' }}>
            
            <button
              type="button"
              onClick={() => setShowFilterDrawer(true)}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.8rem',
                padding: '0.35rem 0.75rem',
                position: 'relative'
              }}
            >
              <Filter size={14} /> Advanced Filters
              {(filterStatuses.length > 0 || filterPriorities.length > 0 || filterActions.length > 0 || filterProjects.length > 0 || filterDateRange !== 'all') && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: 'var(--accent-blue)',
                  boxShadow: '0 0 6px var(--accent-blue)'
                }} />
              )}
            </button>

            <div className="flex gap-2 align-center">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status:</span>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="form-select"
                style={{ minWidth: '150px', fontSize: '0.8rem', padding: '0.35rem 0.5rem', height: 'auto' }}
              >
                <option value="">All</option>
                {statuses.length > 0 ? (
                  statuses.map(s => (
                    <option key={s.id || s.label} value={s.label}>{s.label}</option>
                  ))
                ) : (
                  DEFAULT_STATUSES.map(s => (
                    <option key={s.label} value={s.label}>{s.label}</option>
                  ))
                )}
              </select>
            </div>

            <div className="flex gap-2 align-center">
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Priority:</span>
              <select
                value={priorityFilter}
                onChange={e => setPriorityFilter(e.target.value)}
                className="form-select"
                style={{ minWidth: '120px', fontSize: '0.8rem', padding: '0.35rem 0.5rem', height: 'auto' }}
              >
                <option value="">All</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className="sort-btn"
                onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  height: 'auto',
                  border: '1px solid var(--border-color)',
                  borderRadius: '4px',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <line x1="6" y1="12" x2="18" y2="12"/>
                  <line x1="9" y1="18" x2="15" y2="18"/>
                </svg>
                Sort
                {sortOption !== 'newest' && (
                  <span className="sort-active-dot" />
                )}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="6,9 12,15 18,9"/>
                </svg>
              </button>

              {sortDropdownOpen && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div
                    style={{ position: 'fixed', inset: 0, zIndex: 99 }}
                    onClick={() => setSortDropdownOpen(false)}
                  />
                  <div className="sort-dropdown" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}>
                    {SORT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        className={`sort-option ${sortOption === opt.value ? 'active' : ''}`}
                        onClick={() => {
                          setSortOption(opt.value);
                          setSortDropdownOpen(false);
                        }}
                      >
                        <span>{opt.label}</span>
                        {sortOption === opt.value && (
                          <svg style={{ marginLeft: 'auto' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20,6 9,17 4,12"/>
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {(statusFilter || priorityFilter || filterStatuses.length > 0 || filterPriorities.length > 0 || filterActions.length > 0 || filterProjects.length > 0 || filterDateRange !== 'all') && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                  handleClearFilters();
                }}
                className="btn btn-secondary btn-sm"
                style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem', height: 'auto' }}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Bulk Actions Menu Overlay */}
        {selectedIds.length > 0 && (
          <div className="flex justify-between align-center" style={{ background: 'var(--bg-card)', border: '0.5px solid var(--border-strong)', borderRadius: '6px', gap: '1rem', flexWrap: 'wrap' }}>
            <div className="flex align-center gap-3">
              <span style={{ fontWeight: 600 }}>{selectedIds.length} leads selected</span>
              {selectedIds.length === paginatedList.length && activeList.length > paginatedList.length && (
                <button 
                  onClick={() => setSelectedIds(activeList.map(l => l.id))} 
                  className="btn btn-secondary btn-sm"
                  style={{ border: '1px dashed var(--border-strong)', padding: '0.2rem 0.6rem', color: 'var(--accent-blue, #58A6FF)', fontWeight: 600, background: 'rgba(56, 139, 253, 0.05)' }}
                >
                  Select all {activeList.length} leads in this view
                </button>
              )}
              {selectedIds.length === activeList.length && activeList.length > paginatedList.length && (
                <button 
                  onClick={() => setSelectedIds(paginatedList.map(l => l.id))} 
                  className="btn btn-secondary btn-sm"
                  style={{ border: '1px dashed var(--border-strong)', padding: '0.2rem 0.6rem', color: 'var(--accent-blue, #58A6FF)', fontWeight: 600, background: 'rgba(56, 139, 253, 0.05)' }}
                >
                  Clear selection (keep current page only)
                </button>
              )}
            </div>
            <div className="flex gap-2">
              {/* Change Status Dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)} className="btn btn-secondary btn-sm">
                  Change Status ▾
                </button>
                 {showBulkStatusMenu && (
                  <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', marginTop: '0.25rem', right: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '0.25rem', maxHeight: '300px', overflowY: 'auto', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {(statuses.length > 0 ? statuses : DEFAULT_STATUSES).map(s => (
                      <button key={s.label} onClick={() => { handleBulkStatusChange(s.label); setShowBulkStatusMenu(false); }} className="dropdown-item" style={{ background: 'transparent', border: 'none', padding: '0.4rem 0.8rem', textAlign: 'left', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {folders.length > 0 && (
                <select
                  onChange={(e) => handleBulkMoveToFolder(e.target.value)}
                  className="form-select btn-sm"
                  defaultValue=""
                  style={{ width: '130px', padding: '0.2rem 0.5rem', height: 'auto' }}
                >
                  <option value="" disabled>Move to Folder</option>
                  <option value="">(All Leads)</option>
                  {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                </select>
              )}

              <button onClick={handleBulkDelete} className="btn btn-danger btn-sm" style={{ backgroundColor: 'var(--danger-color)', color: 'white' }}>
                <Trash2 size={12} /> Delete Selected
              </button>
              
              <button onClick={() => setSelectedIds([])} className="btn btn-secondary btn-sm">
                Clear
              </button>
            </div>
          </div>
        )}

        {/* First Lead Prompt Banner */}
        {(() => {
          const hasOneLeadInState = leads.length === 1 && (leads[0].status || '').toLowerCase() === 'lead';
          const isPromptDismissed = localStorage.getItem('rd_first_lead_prompt_dismissed') === 'true';
          if (hasOneLeadInState && !isPromptDismissed) {
            return (
              <div style={{
                background: 'rgba(59, 130, 246, 0.08)',
                border: '1px solid var(--accent-blue, #5B8FB9)',
                borderRadius: '6px',
                padding: '0.75rem 1.25rem',
                marginBottom: '1.25rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                fontSize: '0.85rem',
                color: 'var(--text-secondary, #C9D1D9)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Info size={13} style={{ color: 'var(--accent-blue, #5B8FB9)', flexShrink: 0 }} />
                  <span>
                    Great start! Now mark <strong data-ph-mask>{[leads[0].first_name, leads[0].last_name].filter(Boolean).join(' ') || 'your lead'}</strong> as <strong>"Contacted"</strong> to start your automated follow-up sequence.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem('rd_first_lead_prompt_dismissed', 'true');
                    // force re-render
                    setLeads([...leads]);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted, #8B949E)',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    padding: '2px 6px'
                  }}
                  title="Dismiss"
                >
                  ✕
                </button>
              </div>
            );
          }
          return null;
        })()}

        {/* Lead Table or Empty State */}
        {leads.length === 0 && !loading ? (
          <div className="card empty-state">
            <div className="empty-state-icon" style={{ width: 56, height: 56, color: 'var(--accent-blue)', background: 'var(--bg-selected)', borderColor: 'var(--border)' }}>
              <Users size={28} />
            </div>
            <h3 className="empty-state-title">Your CRM is Empty</h3>
            <p className="empty-state-desc">
              Add your first lead to start tracking outreach, template performance, and automated follow-ups.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center', marginTop: 'var(--space-2)' }}>
              <button onClick={() => setShowAddLeadModal(true)} className="btn btn-primary">
                <Plus size={14} /> Add Lead Manually
              </button>
              <button onClick={() => setShowCSVImporter(true)} className="btn btn-secondary">
                <Upload size={14} /> Import CSV
              </button>
              {PLAN_LIMITS[(currentUser?.plan || 'trial').toLowerCase()]?.sheetsIntegration && (
                <button onClick={() => setShowSheetsImportModal(true)} className="btn btn-secondary">
                  <Database size={14} /> Import from Sheets
                </button>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Need help? Read our <Link to="/get-started#how-it-works" style={{ color: 'var(--accent-blue)', textDecoration: 'underline' }}>quick-start guide</Link>.
            </p>
          </div>
        ) : (
          <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'visible', height: 'auto' }}>
            <table className="data-table" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', textAlign: 'left', background: 'var(--bg-tertiary)' }}>
                <th style={{ width: '40px' }}>
                  <button 
                    type="button"
                    onClick={() => handleSelectAll(paginatedList)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 0 }}
                  >
                    {paginatedList.length > 0 && paginatedList.every(l => selectedIds.includes(l.id)) ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                {view === 'contact_details' && (
                  <th style={{ width: '36px', userSelect: 'none' }}>#</th>
                )}
                {(() => {
                  const allViewCols = columnDefs
                    .filter(c => c.table_view === view)
                    .filter((c, index, self) => self.findIndex(t => t.column_key === c.column_key) === index);
                  const pinnedKeys = view === 'contact_details' ? ['name', 'status', 'platform'] : ['name', 'status'];
                  const pinnedCols = pinnedKeys
                    .map(key => allViewCols.find(c => c.column_key === key))
                    .filter(Boolean);
                  const otherCols = allViewCols
                    .filter(c => !pinnedKeys.includes(c.column_key) && c.is_visible)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  const headerCols = [...pinnedCols, ...otherCols];
                  return headerCols.map(col => {
                    const isProject = col.column_key === 'project';
                    const userPlan = (currentUser?.plan || 'trial').toLowerCase();
                    const isProjectUnlocked = !['trial', 'starter'].includes(userPlan);
                    return (
                      <th key={col.id}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}>
                          {col.column_key === 'status' ? (
                            <>
                              Status
                              <HelpPopover title="Status & Checkpoints" align="left">
                                The checkpoint bubble next to Status tracks whether a lead has replied or needs a follow-up check. Click it to log outcomes and automatically schedule/cancel reminders.
                              </HelpPopover>
                            </>
                          ) : col.column_key === 'platform' ? (
                            <>
                              Reach
                              <HelpPopover title="Reach Link System" align="left">
                                Click a lead's Reach icon to open their outreach channel (LinkedIn, email, etc.) and optionally select a template. The app tracks that you reached out and updates Last Contacted.
                              </HelpPopover>
                            </>
                          ) : col.column_label}
                          {isProject && !isProjectUnlocked && (
                            <Lock size={12} style={{ color: 'var(--text-muted)' }} title="Locked on Starter/Trial plans" />
                          )}
                        </div>
                      </th>
                    );
                  });
                })()
                }
                {isTeamView && <th>Added By</th>}
                <th style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <HelpPopover title="Column Manager" align="right">
                      Customise which columns appear in your CRM table, in what order, and for which view (Contact Details / Pipeline / Clients). Add custom columns on Pro/Teams.
                    </HelpPopover>
                    <button 
                      type="button"
                      onClick={() => setShowColumnManager(true)}
                      className="btn-icon" 
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                      title="Manage Columns"
                    >
                      <Gear size={16} />
                    </button>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedList.length === 0 ? (
                <tr>
                  <td colSpan={columnDefs.filter(c => c.table_view === view && c.is_visible).length + (isTeamView ? 3 : 2) + (view === 'contact_details' ? 1 : 0)} style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No records found matching current parameters.
                  </td>
                </tr>
              ) : (
                paginatedList.map((lead, rowIndex) => {
                  const isSelected = selectedIds.includes(lead.id);
                  const addedByEmail = teamProfilesMap[lead.user_id];
                  const allViewCols = columnDefs
                    .filter(c => c.table_view === view)
                    .filter((c, index, self) => self.findIndex(t => t.column_key === c.column_key) === index);

                  // FIX 2B: Pin Name, Status, Reach to front; append other visible cols sorted by sort_order
                  const pinnedKeys = view === 'contact_details' ? ['name', 'status', 'platform'] : ['name', 'status'];
                  const pinnedCols = pinnedKeys
                    .map(key => allViewCols.find(c => c.column_key === key))
                    .filter(Boolean);
                  const otherCols = allViewCols
                    .filter(c => !pinnedKeys.includes(c.column_key) && c.is_visible)
                    .sort((a, b) => a.sort_order - b.sort_order);
                  const activeCols = [...pinnedCols, ...otherCols];

                  return (
                    <tr 
                      key={lead.id} 
                      onClick={() => setSelectedLead(lead)}
                      style={{ 
                        borderBottom: '1px solid var(--border-color)', 
                        background: isSelected ? 'rgba(91, 143, 185, 0.06)' : 'transparent',
                        cursor: 'pointer'
                      }}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleToggleSelect(lead.id)}
                          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 0 }}
                        >
                          {isSelected ? <CheckSquare size={16} /> : <Square size={16} />}
                        </button>
                      </td>
                      {view === 'contact_details' && (
                        <td style={{ padding: '0.75rem 0.5rem 0.75rem 1rem', fontSize: '0.75rem', color: 'var(--text-muted)', userSelect: 'none', fontVariantNumeric: 'tabular-nums' }}>
                          {(currentPage - 1) * pageSize + rowIndex + 1}
                        </td>
                      )}
                      
                      {activeCols.map(col => {
                        const isCustom = !col.is_default;
                        const cellValue = isCustom ? lead.custom_fields?.[col.column_key] : lead[col.column_key];

                        if (col.column_key === 'name') {
                          const folder = folders.find(f => f.id === lead.folder_id);
                          return (
                            <td key={col.id}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }} data-ph-mask>
                                  {`${lead.first_name || ''} ${lead.last_name || ''}`.trim() || '—'}
                                </span>
                                {folder && (
                                  <span className="badge" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem', padding: '0.1rem 0.35rem', borderColor: folder.color, color: folder.color, background: `${folder.color}11` }}>
                                    <Folder size={10} /> {folder.name}
                                  </span>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.column_key === 'template_used') {
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <GroupedTemplateDropdown
                                    value={lead.template_used || ''}
                                    onChange={(val) => handleDropdownChange(lead.id, 'template_used', val)}
                                    templates={templates}
                                    placeholder="None"
                                  />
                                </div>
                                {lead.template_used && (
                                  <button
                                    type="button"
                                    onClick={() => handleCopyPersonalizedMessage(lead, lead.template_used)}
                                    className="btn btn-secondary btn-sm"
                                    style={{
                                      padding: '4px 6px',
                                      minHeight: 'auto',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      borderColor: 'var(--border)',
                                      borderRadius: '3px'
                                    }}
                                    title="Copy personalized message"
                                  >
                                    <Copy size={13} />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.column_key === 'status') {
                          const currentStatus = cellValue || 'Lead';
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <GroupedStatusDropdown
                                value={currentStatus}
                                onChange={(newVal) => handleDropdownChange(lead.id, 'status', newVal)}
                                isTableInline={true}
                                onUpdate={fetchData}
                              />
                            </td>
                          );
                        }

                        if (col.column_key === 'priority') {
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <PriorityDropdown
                                value={lead.priority}
                                onChange={(val) => handleDropdownChange(lead.id, 'priority', val)}
                                onUpdate={fetchData}
                              />
                            </td>
                          );
                        }

                        if (col.column_type === 'dropdown') {
                          const isActionToTake = col.column_key === 'action_to_take';
                          const expectedSuggestion = isActionToTake ? getSuggestionForStatus(lead.status, suggestionRules) : null;
                          const suggestionsEnabled = currentUser?.suggestions_enabled !== false;
                          const remindersEnabled = currentUser?.reminders_enabled !== false;
                          const isSuggestionMismatch = suggestionsEnabled && expectedSuggestion && cellValue !== expectedSuggestion;
                          const isCheckpointDue = remindersEnabled && lead.next_checkpoint_at && new Date(lead.next_checkpoint_at) <= new Date();
                          const showLightbulb = isActionToTake && (isSuggestionMismatch || isCheckpointDue);

                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <EditableDropdown
                                  value={cellValue}
                                  columnDef={col}
                                  onChange={(val) => {
                                    if (isCustom) {
                                      const custom = { ...(lead.custom_fields || {}) };
                                      custom[col.column_key] = val;
                                      supabase.from('leads').update({ custom_fields: custom }).eq('id', lead.id).then(() => {
                                        setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, custom_fields: custom } : l));
                                        supabase.from('lead_activity').insert({
                                          user_id: currentUser.id,
                                          lead_id: lead.id,
                                          action_type: 'Field Updated',
                                          action_detail: { field: col.column_key, from: lead.custom_fields?.[col.column_key] || 'None', to: val }
                                        });
                                      });
                                    } else {
                                      handleDropdownChange(lead.id, col.column_key, val);
                                    }
                                  }}
                                  onUpdateColumnDef={(id, newOpts) => {
                                    setColumnDefs(prev => prev.map(c => c.id === id ? { ...c, dropdown_options: newOpts } : c));
                                  }}
                                />
                                {showLightbulb && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setCheckpointPopoverLead(lead);
                                      setCheckpointPopoverAnchor(e.currentTarget);
                                    }}
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '2px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      color: isCheckpointDue ? '#ef4444' : '#f59e0b',
                                    }}
                                    title={
                                      isCheckpointDue 
                                        ? 'Action checkpoint is due!' 
                                        : `Suggested action: "${expectedSuggestion}"`
                                    }
                                  >
                                    <Lightbulb size={16} />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (col.column_type === 'link') {
                          const linkHref = cellValue?.startsWith('http') ? cellValue : cellValue ? `https://${cellValue}` : null;
                          let domain = '—';
                          if (cellValue) {
                            try { domain = new URL(linkHref).hostname.replace('www.', ''); }
                            catch { domain = cellValue.slice(0, 22); }
                          }
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              {linkHref ? (
                                <a href={linkHref} target="_blank" rel="noopener noreferrer"
                                  style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <ExternalLink size={11} />{domain}
                                </a>
                              ) : (
                                <span style={{ color: 'var(--text-muted)' }}>—</span>
                              )}
                            </td>
                          );
                        }

                        if (col.column_type === 'date') {
                          let formatted = '—';
                          if (cellValue) {
                            try {
                              const d = new Date(cellValue);
                              if (!isNaN(d)) {
                                formatted = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                              }
                            } catch {}
                          }
                          return (
                            <td key={col.id} style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {formatted}
                            </td>
                          );
                        }

                        if (col.column_key === 'platform' || col.column_type === 'reach' || col.column_type === 'system') {
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <ReachIcons lead={lead} columnDefs={columnDefs} onReachClick={handleReachClick} />
                            </td>
                          );
                        }

                        // ── Clickable URL columns ──────────────────────────────
                        if (['linkedin_url', 'instagram_url', 'twitter_url', 'website'].includes(col.column_key) && cellValue) {
                          const url = cellValue.startsWith('http') ? cellValue : `https://${cellValue}`;
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}
                                data-ph-mask>
                                {cellValue}
                              </a>
                            </td>
                          );
                        }

                        // ── Clickable email ────────────────────────────────────
                        if (col.column_key === 'email' && cellValue) {
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()}>
                              <a href={`mailto:${cellValue}`}
                                style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}
                                data-ph-mask>
                                {cellValue}
                              </a>
                            </td>
                          );
                        }

                        // ── Phone popup ────────────────────────────────────────
                        if (col.column_key === 'phone') {
                          return (
                            <td key={col.id} onClick={(e) => e.stopPropagation()} data-ph-mask>
                              <PhonePopup phone={cellValue} />
                            </td>
                          );
                        }

                        return (
                          <td key={col.id} data-ph-mask>
                            {cellValue || '—'}
                          </td>
                        );
                      })}

                      {isTeamView && (
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {addedByEmail || 'Unknown'}
                        </td>
                      )}
                      
                      <td style={{ textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.25rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => handleOpenEditLead(lead)} className="btn btn-secondary btn-sm" title="Edit Lead">
                            <Edit3 size={12} />
                          </button>
                          
                          {/* Folder dropdown selector directly from row */}
                          {folders.length > 0 && (
                            <select
                              value={lead.folder_id || ''}
                              onChange={(e) => handleBulkMoveToFolder(e.target.value)}
                              style={{ width: '80px', fontSize: '0.75rem', padding: '0.1rem', borderRadius: '4px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)' }}
                              onClick={(e) => { e.stopPropagation(); setSelectedIds([lead.id]); }}
                            >
                              <option value="">Move...</option>
                              <option value="">(All)</option>
                              {folders.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                            </select>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* Pagination Section */}
        <div className="flex justify-between align-center" style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
          <div className="flex gap-4 align-center" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <span>
              Showing {totalFiltered === 0 ? 0 : (currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered} leads
            </span>
            <div className="flex align-center gap-1">
              <span>Page Size:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="form-select"
                style={{ width: '80px', padding: '0.15rem 0.35rem', fontSize: '0.8rem', height: 'auto' }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="btn btn-secondary btn-sm"
              style={{ minWidth: '70px' }}
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalFiltered / pageSize)))}
              disabled={currentPage * pageSize >= totalFiltered}
              className="btn btn-secondary btn-sm"
              style={{ minWidth: '70px' }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Add Lead Modal */}
      {showAddLeadModal && (
        <div className="modal-backdrop">
          <div className="modal-content rd-modal">
            <div className="rd-modal-header">
              <div>
                <h3>Add lead</h3>
                <p className="rd-modal-sub">Name is enough — everything else is optional.</p>
              </div>
              <button type="button" onClick={() => setShowAddLeadModal(false)} className="rd-modal-close" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAddLead} className="rd-modal-form">
              <div className="rd-modal-body">
                <LeadFormFields
                  leadForm={leadForm}
                  setLeadForm={setLeadForm}
                  pastedLink={pastedLink}
                  setPastedLink={setPastedLink}
                  onAddPastedLink={handleAddPastedLink}
                  getFolderSelectValue={getFolderSelectValue}
                  onFolderChange={handleFolderChange}
                  folders={folders}
                  userFolders={userFolders}
                  plan={plan}
                  templates={templates}
                  onStatusUpdate={fetchData}
                  showCustomFields
                  columnDefs={columnDefs}
                  view={view}
                  onClearCustomField={handleRemoveCustomFieldVal}
                  newFieldName={newFieldName}
                  setNewFieldName={setNewFieldName}
                  newFieldType={newFieldType}
                  setNewFieldType={setNewFieldType}
                  onAddCustomField={handleAddNewCustomField}
                />
              </div>
              <div className="rd-modal-footer">
                <button type="button" onClick={() => setShowAddLeadModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Floating Quick Add Button for Mobile */}
      <button 
        className="floating-quick-add-btn" 
        onClick={() => {
          if (isLeadLimitReached) {
            setShowLeadLimitBlockModal(true);
            return;
          }
          setQuickAddForm({ first_name: '', platform: 'LinkedIn', priority: 'Warm' });
          setShowQuickAddModal(true);
        }}
        aria-label="Quick add lead"
      >
        +
      </button>

      {/* Minimal Quick Add Modal */}
      {showQuickAddModal && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content rd-modal rd-modal-sm">
            <div className="rd-modal-header">
              <div>
                <h3>Quick add</h3>
                <p className="rd-modal-sub">Capture a lead in seconds.</p>
              </div>
              <button type="button" onClick={() => setShowQuickAddModal(false)} className="rd-modal-close" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="rd-modal-form">
              <div className="rd-modal-body">
                <div className="rd-form">
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="quick-first-name">First name *</label>
                    <input
                      id="quick-first-name"
                      type="text"
                      required
                      value={quickAddForm.first_name}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, first_name: e.target.value })}
                      className="form-input"
                      autoFocus
                    />
                  </div>
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="quick-source">Source</label>
                    <select
                      id="quick-source"
                      value={quickAddForm.platform}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, platform: e.target.value })}
                      className="form-select"
                    >
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="Cold Email">Cold Email</option>
                      <option value="Twitter">Twitter</option>
                      <option value="WhatsApp">WhatsApp</option>
                    </select>
                  </div>
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="quick-priority">Priority</label>
                    <select
                      id="quick-priority"
                      value={quickAddForm.priority}
                      onChange={(e) => setQuickAddForm({ ...quickAddForm, priority: e.target.value })}
                      className="form-select"
                    >
                      <option value="Cold">Cold</option>
                      <option value="Warm">Warm</option>
                      <option value="Hot">Hot</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="rd-modal-footer">
                <button type="button" onClick={() => setShowQuickAddModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && (
        <div className="modal-backdrop">
          <div className="modal-content rd-modal">
            <div className="rd-modal-header">
              <div>
                <h3>Edit lead</h3>
                <p className="rd-modal-sub">Update contact details and pipeline status.</p>
              </div>
              <button type="button" onClick={() => setShowEditLeadModal(false)} className="rd-modal-close" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditLead} className="rd-modal-form">
              <div className="rd-modal-body">
                <LeadFormFields
                  leadForm={leadForm}
                  setLeadForm={setLeadForm}
                  pastedLink={pastedLink}
                  setPastedLink={setPastedLink}
                  onAddPastedLink={handleAddPastedLink}
                  getFolderSelectValue={getFolderSelectValue}
                  onFolderChange={handleFolderChange}
                  folders={folders}
                  userFolders={userFolders}
                  plan={plan}
                  templates={templates}
                  onStatusUpdate={fetchData}
                />
              </div>
              <div className="rd-modal-footer">
                <button type="button" onClick={() => setShowEditLeadModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📁 Create Folder Modal */}
      {showFolderModal && (
        <div className="modal-backdrop">
          <div className="modal-content rd-modal rd-modal-sm">
            <div className="rd-modal-header">
              <div>
                <h3>Create folder</h3>
                <p className="rd-modal-sub">Group leads however you work.</p>
              </div>
              <button type="button" onClick={() => setShowFolderModal(false)} className="rd-modal-close" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="rd-modal-form">
              <div className="rd-modal-body">
                <div className="rd-form">
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="folder-name">Folder name *</label>
                    <input
                      id="folder-name"
                      type="text"
                      required
                      autoFocus
                      value={folderForm.name}
                      onChange={(e) => setFolderForm({ ...folderForm, name: e.target.value })}
                      className="form-input"
                      placeholder="e.g. VIP Prospects"
                    />
                  </div>
                  <div className="rd-form-group">
                    <span className="form-label">Color</span>
                    <div className="rd-color-dots">
                      {PRESET_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`rd-color-dot ${folderForm.color === c ? 'is-selected' : ''}`}
                          onClick={() => setFolderForm({ ...folderForm, color: c })}
                          style={{ background: c }}
                          aria-label={`Color ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="rd-modal-footer">
                <button type="button" onClick={() => setShowFolderModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create folder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 Import CSV Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="modal-content rd-modal">
            <div className="rd-modal-header">
              <div>
                <h3>Import CSV</h3>
                <p className="rd-modal-sub">First row must include Name (or First/Last) and Email.</p>
              </div>
              <button type="button" onClick={() => setShowImportModal(false)} className="rd-modal-close" aria-label="Close">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleImportCSVSubmit} className="rd-modal-form">
              <div className="rd-modal-body">
                <div className="rd-form-group">
                  <label className="form-label" htmlFor="import-csv">Paste CSV</label>
                  <textarea
                    id="import-csv"
                    className="form-textarea rd-mono-textarea"
                    placeholder={"First Name,Last Name,Email,Company\nAhmed,Khan,ahmed@test.com,Acme"}
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="rd-modal-footer">
                <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Import leads</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🚀 Reach Message Draft Modal Overlay */}
      {reachModalOpen && reachLead && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '520px', width: '90%', padding: '1.75rem', borderRadius: '12px', background: 'var(--bg-card)', border: '1px solid var(--border-strong)', boxShadow: '0 20px 40px rgba(0,0,0,0.6)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles size={18} style={{ color: 'var(--accent-blue)' }} />
                <span>Draft Message ({reachChannel === 'email' ? 'Email' : reachChannel === 'whatsapp' ? 'WhatsApp' : reachChannel === 'sms' ? 'SMS' : 'Social Profile'})</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setReachModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-col gap-4" style={{ textAlign: 'left' }}>
              {/* Lead Details */}
              <div style={{ background: 'var(--bg-page)', borderRadius: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>
                <strong>Lead:</strong> {reachLead.first_name} {reachLead.last_name || ''} ({reachLead.company || 'No Company'})
              </div>

              {/* Validation Warning */}
              {reachWarning && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '6px', background: 'rgba(224, 82, 82, 0.1)', border: '1px solid rgba(224, 82, 82, 0.25)', color: 'var(--status-hot)', fontSize: '0.8rem' }}>
                  <AlertCircle size={16} />
                  <span><strong>Warning:</strong> {reachWarning}</span>
                </div>
              )}

              {/* Template Picker & AI Option */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>Select Template</label>
                  {['trial', 'starter', 'pro', 'teams', 'enterprise'].includes((currentUser?.plan || 'trial').toLowerCase()) ? (
                    <button
                      type="button"
                      onClick={handleGenerateReachAI}
                      disabled={reachAiLoading}
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.78rem', padding: '0.25rem 0.5rem' }}
                    >
                      <Sparkles size={12} style={{ color: 'var(--accent-blue)' }} />
                      {reachAiLoading ? 'Generating...' : 'Generate with AI'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      title="Available on Pro plan"
                      className="btn btn-secondary btn-sm"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', padding: '0.25rem 0.5rem', opacity: 0.7, cursor: 'not-allowed' }}
                    >
                      <Lock size={12} /> Available on Pro
                    </button>
                  )}
                </div>
                <select
                  value={selectedReachTemplateId}
                  onChange={(e) => handleReachTemplateChange(e.target.value)}
                  className="form-select"
                  style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: '36px', borderRadius: '4px' }}
                >
                  <option value="">(No Template - Free Text)</option>
                  {(templates || []).map(t => (
                    <option key={t.id} value={t.id}>{t.title} ({t.platform})</option>
                  ))}
                </select>
                <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder='AI prompt instructions (optional, e.g. "mention 20% discount")'
                    value={reachAiInstructions}
                    onChange={(e) => setReachAiInstructions(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter' && !reachAiLoading) handleGenerateReachAI(); }}
                    disabled={reachAiLoading}
                    style={{ flex: 1, fontSize: '0.78rem', height: '30px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0 8px' }}
                  />
                </div>
                {reachAiError && (
                  <div style={{ color: 'var(--danger-color)', fontSize: '0.75rem', marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {reachAiError}
                  </div>
                )}
              </div>

              {/* Subject (Email Only) */}
              {reachChannel === 'email' && (
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Subject</label>
                  <input
                    type="text"
                    className="form-input"
                    value={reachTemplateSubject}
                    onChange={(e) => setReachTemplateSubject(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)', height: '36px', borderRadius: '4px', padding: '0 8px' }}
                  />
                </div>
              )}

              {/* Message Body Preview & Edit */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Personalized Preview</label>
                <textarea
                  className="form-textarea"
                  value={reachTemplateBody}
                  onChange={(e) => setReachTemplateBody(e.target.value)}
                  style={{ width: '100%', minHeight: '160px', background: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', padding: '8px', fontFamily: 'inherit', fontSize: '0.9rem', lineHeight: 1.5 }}
                />
              </div>

              {/* Destination/Send Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setReachModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ height: '36px' }}
                >
                  Cancel
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  {reachChannel === 'email' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleReachSend('mailto')}
                        className="btn btn-secondary"
                        style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      >
                        <Mail size={14} /> Device Mail App
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReachSend('gmail')}
                        className="btn btn-secondary"
                        style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      >
                        Gmail Web
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReachSend('outlook')}
                        className="btn btn-secondary"
                        style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.25rem', whiteSpace: 'nowrap' }}
                      >
                        Outlook Web
                      </button>
                    </>
                  ) : reachChannel === 'whatsapp' ? (
                    <button
                      type="button"
                      onClick={() => handleReachSend('whatsapp')}
                      className="btn btn-primary"
                      style={{ height: '36px', background: '#25D366', borderColor: '#25D366', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Open WhatsApp
                    </button>
                  ) : reachChannel === 'sms' ? (
                    <button
                      type="button"
                      onClick={() => handleReachSend('sms')}
                      className="btn btn-primary"
                      style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      Send SMS
                    </button>
                  ) : (
                    // LinkedIn, Instagram, Twitter (no prefill support)
                    <button
                      type="button"
                      onClick={() => handleReachSend(reachChannel)}
                      className="btn btn-primary"
                      style={{ height: '36px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
                    >
                      <Copy size={14} /> Copy & Open Profile
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 💬 Reply Type Prompt Overlay Dialog */}
      {replyPromptLead && (
        <div className="modal-backdrop" style={{ zIndex: 1100 }}>
          <div className="modal-content" style={{ maxWidth: '450px', width: '90%', padding: '1.5rem', borderRadius: '12px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}><MessageCircle size={18} /> Reply from {replyPromptLead.first_name} {replyPromptLead.last_name}</span>
              </h3>
            </div>
            <div className="flex-col gap-3" style={{ textAlign: 'left', marginTop: '1rem' }}>
              
              {replyPromptStatus && replyPromptStatus.toLowerCase() !== 'booked' && (
                <div className="form-group">
                  <label className="form-label">Was this a positive reply?</label>
                  <div className="flex gap-2 w-block" style={{ width: '100%' }}>
                    <button 
                      type="button" 
                      onClick={() => {
                        setReplyType('positive');
                        setNextStep(null);
                        setNextStepLink('');
                      }}
                      className={`btn btn-sm ${replyType === 'positive' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, justifyContent: 'center', gap: '0.25rem' }}
                    >
                      <ThumbsUp size={14} /> Positive
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setReplyType('negative');
                        setNextStep(null);
                        setNextStepLink('');
                      }}
                      className={`btn btn-sm ${replyType === 'negative' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, justifyContent: 'center', gap: '0.25rem', borderColor: replyType === 'negative' ? 'var(--danger-color)' : 'var(--border-color)', color: replyType === 'negative' ? '#ef4444' : 'var(--text-primary)' }}
                    >
                      <ThumbsDown size={14} /> Negative
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setReplyType('skip');
                        setNextStep(null);
                        setNextStepLink('');
                      }}
                      className={`btn btn-sm ${replyType === 'skip' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, justifyContent: 'center', gap: '0.25rem' }}
                    >
                      <SkipForward size={14} /> Skip
                    </button>
                  </div>
                </div>
              )}

              {replyType === 'positive' && replyPromptStatus && replyPromptStatus.toLowerCase() !== 'booked' && (
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">Great! What's the next step?</label>
                  <div className="flex gap-2 w-block" style={{ width: '100%' }}>
                    <button 
                      type="button" 
                      onClick={() => setNextStep('proposal')}
                      className={`btn btn-sm ${nextStep === 'proposal' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Send Proposal
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setNextStep('meeting')}
                      className={`btn btn-sm ${nextStep === 'meeting' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Send Meeting Link
                    </button>
                    <button 
                      type="button" 
                      onClick={() => handleSaveReplyPrompt('skip')}
                      className={`btn btn-sm btn-secondary`}
                      style={{ flex: 1, justifyContent: 'center' }}
                    >
                      Skip for now
                    </button>
                  </div>
                </div>
              )}

              {replyType === 'positive' && nextStep && nextStep !== 'skip' && replyPromptStatus && replyPromptStatus.toLowerCase() !== 'booked' && (
                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                  <label className="form-label">
                    {nextStep === 'proposal' 
                      ? "Paste your proposal link or describe the next step:" 
                      : "Paste your meeting/calendar link (Calendly, Google Meet, etc.):"}
                  </label>
                  <input 
                    type="text" 
                    value={nextStepLink} 
                    onChange={e => setNextStepLink(e.target.value)} 
                    placeholder={nextStep === 'proposal' ? "e.g. https://proposal.com/123" : "e.g. https://calendly.com/user"}
                    className="form-input" 
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Which template did you use? (optional)</label>
                <GroupedTemplateDropdown 
                  value={replyTemplateId} 
                  onChange={setReplyTemplateId} 
                  templates={templates} 
                />
              </div>

              <div className="form-group">
                <label className="form-label">Quick conversation note:</label>
                <input 
                  type="text" 
                  value={replyNotes} 
                  onChange={e => setReplyNotes(e.target.value)} 
                  placeholder="e.g. Wants a call on Friday"
                  className="form-input" 
                />
              </div>

              <div className="flex justify-end gap-2 mt-4" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setReplyPromptLead(null)} className="btn btn-secondary">Cancel</button>
                <button type="button" onClick={handleSaveReplyPrompt} className="btn btn-primary">Save Conversation</button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Column Manager Modal */}
      <ColumnManager
        isOpen={showColumnManager}
        onClose={() => setShowColumnManager(false)}
        view={view}
        columns={columnDefs}
        onUpdateColumns={(newCols) => {
          setColumnDefs(newCols.sort((a, b) => a.sort_order - b.sort_order));
        }}
        onResetToDefault={handleResetToDefault}
        userId={currentUser.id}
        currentUser={currentUser}
      />

      {/* Convert to Client Modal */}
      {convertingLead && (
        <ConvertModal
          lead={convertingLead}
          onClose={() => setConvertingLead(null)}
          onConvert={handleConvertSubmit}
        />
      )}

      {/* Lead Detail Slide-out Drawer */}
      {selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          isClientView={view === 'clients'}
          onClose={() => setSelectedLead(null)}
          onUpdateLead={(updated) => {
            if (view === 'clients') {
              setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
            } else {
              setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
            }
            setSelectedLead(updated);
          }}
          columnDefs={columnDefs}
          currentUser={currentUser}
          templates={templates}
          onConvertToClient={setConvertingLead}
          onRefresh={fetchData}
          statuses={statuses}
          suggestionRules={suggestionRules}
        />
      )}

      {/* CSV Mapping Importer Modal */}
      <CSVImporter
        isOpen={showCSVImporter}
        onClose={() => setShowCSVImporter(false)}
        onImportComplete={() => {
          fetchData();
          setShowCSVImporter(false);
        }}
        columnDefs={columnDefs}
        currentUser={currentUser}
        folderId={selectedFolderId}
      />

      {/* NEW CSV Import Modal */}
      {showNewImportModal && (
        <CSVImportModal 
          onClose={() => setShowNewImportModal(false)}
          onImportComplete={() => {
            setShowNewImportModal(false);
            fetchData();
          }}
        />
      )}

      {/* Google Sheets Export Modal */}
      {showExportSheetsModal && (
        <ExportSheetsModal
          leads={leads}
          currentUser={currentUser}
          onClose={() => setShowExportSheetsModal(false)}
        />
      )}

      {/* Google Sheets Import Modal */}
      {showSheetsImportModal && (
        <SheetsImportModal
          onClose={() => setShowSheetsImportModal(false)}
          onImportComplete={() => {
            setShowSheetsImportModal(false);
            fetchData();
          }}
        />
      )}


      {showSmartFolderModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h3>Create Smart Folder</h3>
              <button onClick={() => setShowSmartFolderModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!smartFolderForm.name.trim()) return;
              try {
                const newFolder = {
                  user_id: currentUser.id,
                  name: smartFolderForm.name,
                  filter_config: {
                    rules: smartFolderForm.rules
                  }
                };
                const { data, error } = await supabase
                  .from('user_folders')
                  .insert(newFolder)
                  .select()
                  .single();
                if (error) throw error;
                setUserFolders(prev => [...prev, data]);
                setShowSmartFolderModal(false);
                setSmartFolderForm({ name: '', rules: [{ field: 'Status', operator: 'is', value: '' }] });
                handleSelectFolder(data.id);
              } catch (err) {
                console.error('Error creating smart folder:', err);
                alert('Failed to create smart folder: ' + err.message);
              }
            }} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Folder Name *</label>
                <input 
                  type="text" 
                  required 
                  value={smartFolderForm.name} 
                  onChange={e => setSmartFolderForm({...smartFolderForm, name: e.target.value})} 
                  className="form-input" 
                  placeholder="e.g. Hot LinkedIn Leads" 
                />
              </div>
              
              <div className="form-group">
                <label className="form-label">Rules (All rules must match - AND logic)</label>
                <div className="flex-col gap-2" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
                  {smartFolderForm.rules.map((rule, idx) => (
                    <div key={idx} className="flex gap-2 align-center" style={{ flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <select
                        value={rule.field}
                        onChange={e => {
                          const newRules = [...smartFolderForm.rules];
                          newRules[idx].field = e.target.value;
                          newRules[idx].value = ''; // Reset value
                          setSmartFolderForm({...smartFolderForm, rules: newRules});
                        }}
                        className="form-select"
                        style={{ flex: 1, minWidth: '120px' }}
                      >
                        <option value="Status">Status</option>
                        <option value="Priority">Priority</option>
                        <option value="Tag">Tag</option>
                      </select>

                      <select
                        value={rule.operator}
                        onChange={e => {
                          const newRules = [...smartFolderForm.rules];
                          newRules[idx].operator = e.target.value;
                          setSmartFolderForm({...smartFolderForm, rules: newRules});
                        }}
                        className="form-select"
                        style={{ flex: 1, minWidth: '100px' }}
                      >
                        <option value="is">is</option>
                        <option value="is not">is not</option>
                      </select>

                      {rule.field === 'Status' ? (
                        <select
                          value={rule.value}
                          onChange={e => {
                            const newRules = [...smartFolderForm.rules];
                            newRules[idx].value = e.target.value;
                            setSmartFolderForm({...smartFolderForm, rules: newRules});
                          }}
                          className="form-select"
                          style={{ flex: 1.5, minWidth: '150px' }}
                          required
                        >
                          <option value="">-- Select Status --</option>
                          {statuses.length > 0 ? (
                            statuses.map(s => (
                              <option key={s.id || s.label} value={s.label}>{s.label}</option>
                            ))
                          ) : (
                            DEFAULT_STATUSES.map(s => (
                              <option key={s.label} value={s.label}>{s.label}</option>
                            ))
                          )}
                        </select>
                      ) : rule.field === 'Priority' ? (
                        <select
                          value={rule.value}
                          onChange={e => {
                            const newRules = [...smartFolderForm.rules];
                            newRules[idx].value = e.target.value;
                            setSmartFolderForm({...smartFolderForm, rules: newRules});
                          }}
                          className="form-select"
                          style={{ flex: 1.5, minWidth: '120px' }}
                          required
                        >
                          <option value="">-- Select Priority --</option>
                          <option value="Hot">Hot</option>
                          <option value="Warm">Warm</option>
                          <option value="Cold">Cold</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={rule.value}
                          onChange={e => {
                            const newRules = [...smartFolderForm.rules];
                            newRules[idx].value = e.target.value;
                            setSmartFolderForm({...smartFolderForm, rules: newRules});
                          }}
                          placeholder="Value..."
                          className="form-input"
                          style={{ flex: 1.5, minWidth: '150px' }}
                          required
                        />
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          const newRules = smartFolderForm.rules.filter((_, rIdx) => rIdx !== idx);
                          setSmartFolderForm({...smartFolderForm, rules: newRules});
                        }}
                        className="btn btn-secondary btn-icon"
                        style={{ padding: '0.35rem', color: 'var(--danger-color)' }}
                        disabled={smartFolderForm.rules.length <= 1}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                
                <button
                  type="button"
                  onClick={() => {
                    setSmartFolderForm({
                      ...smartFolderForm,
                      rules: [...smartFolderForm.rules, { field: 'Status', operator: 'is', value: '' }]
                    });
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'flex', alignSelf: 'flex-start' }}
                >
                  <Plus size={14} /> Add Rule
                </button>
              </div>

              <div className="flex justify-between mt-4">
                <button 
                  type="button" 
                  onClick={() => setShowSmartFolderModal(false)} 
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">Create Smart Folder</button>
              </div>
            </form>
          </div>
        </div>
      )}



      <LeadLimitModal
        open={showLeadLimitBlockModal}
        plan={plan}
        limit={leadLimit || 0}
        onCleanup={() => { setShowLeadLimitBlockModal(false); navigate('/leads'); }}
        onUpgrade={() => { setShowLeadLimitBlockModal(false); navigate('/upgrade'); }}
        onClose={() => setShowLeadLimitBlockModal(false)}
      />

      {toastRemaining !== null && (
        <LeadLimitToast
          remaining={toastRemaining}
          onUpgrade={() => { setToastRemaining(null); navigate('/upgrade'); }}
          onCleanup={() => { setToastRemaining(null); navigate('/leads'); }}
          onDismiss={() => setToastRemaining(null)}
        />
      )}

      <BulkImportLimitModal
        open={!!importResult}
        importedCount={importResult?.imported ?? 0}
        skippedCount={importResult?.skipped ?? 0}
        plan={plan}
        onCleanup={() => { setImportResult(null); navigate('/leads'); }}
        onUpgrade={() => { setImportResult(null); navigate('/upgrade'); }}
        onClose={() => setImportResult(null)}
      />

      {/* 🔍 Advanced Filter Drawer */}
      {showFilterDrawer && (
        <div className="modal-backdrop" style={{ justifyContent: 'flex-end', backdropFilter: 'blur(3px)' }}>
          <div 
            className="modal-content"
            style={{
              maxWidth: '380px',
              height: '100vh',
              borderRadius: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '-10px 0 30px rgba(0,0,0,0.3)',
              borderLeft: '0.5px solid var(--border)',
              borderTop: 'none',
              borderRight: 'none',
              borderBottom: 'none',
              animation: 'slideInRight 0.3s ease-out',
              textAlign: 'left',
              padding: '1.5rem',
              background: 'var(--bg-card)'
            }}
          >
            {/* Header */}
            <div className="modal-header" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontFamily: 'var(--font-heading)' }}>
                <Filter size={16} /> Advanced Filters
              </h3>
              <button type="button" onClick={() => setShowFilterDrawer(false)} className="theme-toggle"><X size={18} /></button>
            </div>

            {/* Scrollable filters list */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', paddingRight: '4px' }}>
              
              {/* Priorities filter */}
              <div>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Priority</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {['Hot', 'Warm', 'Cold'].map(pr => (
                    <label key={pr} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input 
                        type="checkbox" 
                        checked={filterPriorities.includes(pr)} 
                        onChange={() => {
                          setFilterPriorities(prev => prev.includes(pr) ? prev.filter(x => x !== pr) : [...prev, pr]);
                        }} 
                        style={{ accentColor: 'var(--accent-blue)' }}
                      />
                      {pr}
                    </label>
                  ))}
                </div>
              </div>

              {/* Statuses filter */}
              <div>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Lead Status</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px' }}>
                  {statuses.map(st => (
                    <label key={st.id || st.label} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input 
                        type="checkbox" 
                        checked={filterStatuses.includes(st.label)} 
                        onChange={() => {
                          setFilterStatuses(prev => prev.includes(st.label) ? prev.filter(x => x !== st.label) : [...prev, st.label]);
                        }} 
                        style={{ accentColor: 'var(--accent-blue)' }}
                      />
                      {st.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions to Take filter */}
              <div>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Action to Take</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px' }}>
                  {[
                    'Send first pitch', 'Wait for reply', 'Send a follow up',
                    'Send a different pitch', 'Send proposal', 'Send Calendly',
                    'Prepare for call', 'Send invoice', 'No action needed'
                  ].map(act => (
                    <label key={act} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <input 
                        type="checkbox" 
                        checked={filterActions.includes(act)} 
                        onChange={() => {
                          setFilterActions(prev => prev.includes(act) ? prev.filter(x => x !== act) : [...prev, act]);
                        }} 
                        style={{ accentColor: 'var(--accent-blue)' }}
                      />
                      {act}
                    </label>
                  ))}
                </div>
              </div>

              {/* Projects filter (gated) */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Project</span>
                  {!(!['trial', 'starter'].includes((currentUser?.plan || 'trial').toLowerCase())) && (
                    <Lock size={11} style={{ color: 'var(--text-muted)' }} />
                  )}
                </div>

                {!(!['trial', 'starter'].includes((currentUser?.plan || 'trial').toLowerCase())) ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '4px', border: '1px dashed var(--border)' }}>
                    Gated feature. Upgrade to Pro/Teams to categorize and filter leads by project.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: '4px' }}>
                    {Array.from(new Set(leads.map(l => l.project).filter(Boolean))).length === 0 ? (
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No projects defined yet.</span>
                    ) : (
                      Array.from(new Set(leads.map(l => l.project).filter(Boolean))).map(proj => (
                        <label key={proj} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                          <input 
                            type="checkbox" 
                            checked={filterProjects.includes(proj)} 
                            onChange={() => {
                              setFilterProjects(prev => prev.includes(proj) ? prev.filter(x => x !== proj) : [...prev, proj]);
                            }} 
                            style={{ accentColor: 'var(--accent-blue)' }}
                          />
                          {proj}
                        </label>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Date Filters */}
              <div>
                <span style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>Date range</span>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filter field:</span>
                    <select 
                      value={filterDateField} 
                      onChange={e => setFilterDateField(e.target.value)} 
                      className="form-select"
                      style={{ fontSize: '0.75rem', padding: '0.2rem 0.4rem', height: 'auto', width: 'auto' }}
                    >
                      <option value="created_at">Added Date</option>
                      <option value="last_contacted_at">Last Contacted</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {[
                      { label: 'All Time', value: 'all' },
                      { label: 'Today', value: 'today' },
                      { label: 'Last 7 Days', value: '7days' },
                      { label: 'Last 30 Days', value: '30days' }
                    ].map(preset => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => setFilterDateRange(preset.value)}
                        className={`btn btn-sm ${filterDateRange === preset.value ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
              <button 
                type="button" 
                onClick={handleClearFilters}
                className="btn btn-secondary" 
                style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
              >
                Clear All
              </button>
              <button 
                type="button" 
                onClick={() => setShowFilterDrawer(false)}
                className="btn btn-primary" 
                style={{ flex: 1, fontSize: '0.8rem', justifyContent: 'center' }}
              >
                Apply Filters
              </button>
            </div>

          </div>
        </div>
      )}

      {checkpointPopoverLead && (
        <CheckpointPopover
          lead={checkpointPopoverLead}
          anchorEl={checkpointPopoverAnchor}
          suggestionRules={suggestionRules}
          currentUser={currentUser}
          onClose={() => {
            setCheckpointPopoverLead(null);
            setCheckpointPopoverAnchor(null);
          }}
          onResolved={(updatedLead) => {
            setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
            if (onRefreshReminders) onRefreshReminders();
          }}
        />
      )}
    </div>
  );
}
