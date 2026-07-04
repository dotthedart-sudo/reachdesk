import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTeamIds, PLAN_LIMITS } from '../lib/utils';
import { LeadLimitModal, LeadLimitToast, getRemainingLeadQuota, shouldShowCountdownToast, prepareBulkImport, BulkImportLimitModal, getPlanLeadLimit } from '../lib/leadLimits';
import {
  Search, Plus, Download, Upload, Trash2, Edit3, X,
  Filter, CheckSquare, Square, Folder, FolderPlus,
  MoreVertical, Check, ThumbsUp, ThumbsDown, SkipForward, AlertCircle, ChevronDown, FileText,
  Settings as Gear, MessageCircle, Zap, ExternalLink, Lock
} from 'lucide-react';

import EditableDropdown from './CRM/EditableDropdown';
import ColumnManager from './CRM/ColumnManager';
import LeadDrawer from './CRM/LeadDrawer';
import CSVImporter from './CRM/CSVImporter';
import CSVImportModal from './CRM/CSVImportModal';
import ConvertModal from './CRM/ConvertModal';
import GroupedStatusDropdown from './CRM/GroupedStatusDropdown';
import { ReachIcons, PhonePopup, detectDomainIcon, detectPlatformLabel } from './icons/PlatformIcons';
import { handleLeadReminderTrigger } from '../lib/reminders';
import PriorityDropdown from './CRM/PriorityDropdown';
import { exportLeads, exportNotes } from '../utils/exportUtils';

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

const STATUS_COLORS = {
  'lead':           { bg: '#8B949E22', text: '#8B949E' },
  'contacted':      { bg: '#5B8FB922', text: '#5B8FB9' },
  'calendly_sent':  { bg: '#6B9FD422', text: '#6B9FD4' },
  'booked':         { bg: '#E8A83822', text: '#E8A838' },
  'follow_up':      { bg: '#F9731622', text: '#F97316' },
  'positive_reply': { bg: '#7FB5A022', text: '#7FB5A0' },
  'client':         { bg: '#4ADE8022', text: '#4ADE80' },
  'not_interested': { bg: '#E0525222', text: '#E05252' },
  'no_show':        { bg: '#6B728022', text: '#6B7280' }
};

const STATUS_LABELS = {
  'lead':           'Lead',
  'contacted':      'Contacted',
  'positive_reply': 'Positive Reply',
  'not_interested': 'Not Interested',
  'booked':         'Call Booked',
  'calendly_sent':  'Calendly Sent',
  'client':         'Client',
  'follow_up':      'Follow Up',
  'no_show':        'No Show'
};

export default function CRM({ 
  currentUser, 
  teamProfilesMap = {}, 
  isTeamView = false, 
  onRefreshReminders 
}) {
  const navigate = useNavigate();
  const [leads, setLeads] = useState([]);
  const [folders, setFolders] = useState([]);
  const [userFolders, setUserFolders] = useState([]);
  const [clients, setClients] = useState([]);
  const [statuses, setStatuses] = useState([
    { label: 'Lead', color: '#3b82f6' },
    { label: 'Contacted', color: '#f59e0b' },
    { label: 'Waiting', color: '#10b981' },
    { label: 'Positive Reply', color: '#8b5cf6' },
    { label: 'Booked', color: '#ec4899' },
    { label: 'Proposal Sent', color: '#06b6d4' },
    { label: 'No Show / Rescheduled', color: '#ef4444' },
    { label: 'Not Interested', color: '#6b7280' },
    { label: 'Client', color: '#10b981' }
  ]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active filters and views
  const [selectedFolderId, setSelectedFolderId] = useState(null); // null = All Leads
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Smart Folder modal and filters state
  const [showSmartFolderModal, setShowSmartFolderModal] = useState(false);
  const [smartFolderForm, setSmartFolderForm] = useState({ name: '', rules: [{ field: 'Status', operator: 'is', value: '' }] });
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalMessage, setLimitModalMessage] = useState('');
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

  // View state persisted in URL — ?view=contact_details (default) | ?view=pipeline
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'contact_details';

  const handleViewChange = (newView) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.set('view', newView);
      return next;
    });
  };
  const [columnDefs, setColumnDefs] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [pastedLink, setPastedLink] = useState('');

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
        setLeadForm(prev => ({ ...prev, folder_id: '', status: 'calendly_sent' }));
      } else if (sysType === 'clients') {
        setLeadForm(prev => ({ ...prev, folder_id: '', status: 'client' }));
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

  // Modals state
  const [showAddLeadModal, setShowAddLeadModal] = useState(false);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    first_name: '',
    platform: 'LinkedIn',
    priority: 'Warm'
  });
  const [showEditLeadModal, setShowEditLeadModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNewImportModal, setShowNewImportModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [activeLead, setActiveLead] = useState(null);
  const [convertingLead, setConvertingLead] = useState(null);
  
  // Reply Type prompt state
  const [replyPromptLead, setReplyPromptLead] = useState(null);
  const [replyPromptStatus, setReplyPromptStatus] = useState('');
  const [replyType, setReplyType] = useState('positive'); // 'positive' | 'negative' | 'skip'
  const [replyTemplateId, setReplyTemplateId] = useState('');
  const [replyNotes, setReplyNotes] = useState('');

  // Form states
  const [leadForm, setLeadForm] = useState({
    name: '', email: '', phone: '', company: '', niche: '',
    priority: 'Warm', status: 'lead', notes: '', folder_id: '',
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
      await exportLeads(currentUser.id);
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
    setLoading(true);
    try {
      const teamIds = await getTeamIds(currentUser.id);

      const [
        foldersRes,
        smartFoldersRes,
        statusesRes,
        templatesRes,
        columnsRes,
        leadsRes,
        clientsRes
      ] = await Promise.all([
        supabase.from('folders').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
        plan !== 'starter'
          ? supabase.from('user_folders').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true })
          : Promise.resolve({ data: [] }),
        supabase.from('custom_statuses').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
        supabase.from('templates').select('id, title').or(`user_id.eq.${currentUser.id},user_id.is.null`),
        supabase.from('column_definitions').select('*').eq('user_id', currentUser.id).order('sort_order', { ascending: true }),
        supabase.from('leads').select('*').in('user_id', teamIds).order('created_at', { ascending: false }),
        supabase.from('leads').select('*').in('user_id', teamIds).eq('status', 'client').order('created_at', { ascending: false })
      ]);

      if (leadsRes.error) throw leadsRes.error;
      if (columnsRes.error) throw columnsRes.error;

      const fData = foldersRes.data || [];
      const ufData = smartFoldersRes.data || [];
      const sData = statusesRes.data || [];
      const tData = templatesRes.data || [];
      const cols = columnsRes.data || [];
      const lData = leadsRes.data || [];
      const cData = clientsRes.data || [];

      setFolders(fData);
      setUserFolders(ufData);
      
      if (sData.length > 0) {
        setStatuses(sData);
      }
      
      setTemplates(tData);
      setLeads(lData);
      setClients(cData);

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
            { label: 'Follow Up', color: '#3b82f6' },
            { label: 'Send Template', color: '#5B8FB9' },
            { label: 'Schedule Call', color: '#f59e0b' },
            { label: 'No Action', color: '#6b7280' }
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
            { label: 'Follow Up', color: '#3b82f6' },
            { label: 'Send Template', color: '#5B8FB9' },
            { label: 'Schedule Call', color: '#f59e0b' },
            { label: 'No Action', color: '#6b7280' }
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
        setColumnDefs(seeded || []);
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
            { label: 'Follow Up', color: '#3b82f6' }, { label: 'Send Template', color: '#5B8FB9' }, { label: 'Schedule Call', color: '#f59e0b' }, { label: 'No Action', color: '#6b7280' }
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
            { label: 'Follow Up', color: '#3b82f6' }, { label: 'Send Template', color: '#5B8FB9' }, { label: 'Schedule Call', color: '#f59e0b' }, { label: 'No Action', color: '#6b7280' }
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
          setColumnDefs([...dedupedCols, ...(newCols || [])]);
        } else {
          setColumnDefs(dedupedCols);
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

  // Lead warnings & locks
  const totalLeadsCount = leads.length;
  const leadLimit = getPlanLeadLimit(plan, currentUser.billing_cycle) || Infinity;
  const isLeadLimitReached = leadLimit !== Infinity && totalLeadsCount >= leadLimit;

  // Show warnings when approaching the limit
  const limitThreshold = leadLimit === 50 ? 5 : leadLimit === 600 ? 50 : leadLimit === 2500 ? 200 : leadLimit === 10000 ? 500 : 0;
  const showLimitWarning = leadLimit !== Infinity && totalLeadsCount >= (leadLimit - limitThreshold) && totalLeadsCount < leadLimit;

  const remainingLeads = (() => {
    if (leadLimit !== Infinity) return Math.max(0, leadLimit - totalLeadsCount);
    return null;
  })();

  const leadLimitTooltip = 'Lead limit reached. Delete leads or upgrade.';

  const handleOpenAddLead = () => {
    if (isLeadLimitReached) {
      const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
      const limitFormatted = leadLimit.toLocaleString();
      let nextPlan = '';
      let nextLimit = '';
      if (plan === 'trial') { nextPlan = 'Starter'; nextLimit = '600'; }
      else if (plan === 'starter') { nextPlan = 'Pro'; nextLimit = '2,500'; }
      else if (plan === 'pro') { nextPlan = 'Teams'; nextLimit = '10,000'; }
      else if (plan === 'teams') { nextPlan = 'Enterprise'; nextLimit = 'unlimited'; }
      
      setLimitModalMessage(`You've reached your ${planName} plan limit of ${limitFormatted} leads. ${nextPlan ? `Upgrade to ${nextPlan} for ${nextLimit} leads.` : ''}`);
      setShowLimitModal(true);
      return;
    }
    setLeadForm({
      name: '', email: '', phone: '', company: '', niche: '',
      priority: 'Warm', status: 'lead', notes: '', folder_id: selectedFolderId || '',
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

      const linkedin = (leadForm.links || []).find(l => l.label === 'LinkedIn')?.url || null;
      const instagram = (leadForm.links || []).find(l => l.label === 'Instagram')?.url || null;
      const twitter = (leadForm.links || []).find(l => l.label === 'Twitter')?.url || null;
      const website = (leadForm.links || []).find(l => l.label === 'Website')?.url || null;

      const finalCustomFields = {
        ...(leadForm.custom_fields || {}),
        links: leadForm.links || []
      };

      const { data, error } = await supabase.from('leads')
        .insert({
          first_name,
          last_name,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          company: leadForm.company || null,
          niche: leadForm.niche || null,
          linkedin_url: linkedin,
          instagram_url: instagram,
          twitter_url: twitter,
          website: website,
          priority: leadForm.priority || 'Warm',
          status: leadForm.status || 'lead',
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
          status: 'lead', // Status defaults to lead (lowercase as per db requirement)
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

  // Open Edit Lead
  const handleOpenEditLead = (lead) => {
    setActiveLead(lead);
    const existingLinks = lead.custom_fields?.links ? [...lead.custom_fields.links] : [];
    if (existingLinks.length === 0) {
      if (lead.linkedin_url) existingLinks.push({ url: lead.linkedin_url, label: 'LinkedIn' });
      if (lead.instagram_url) existingLinks.push({ url: lead.instagram_url, label: 'Instagram' });
      if (lead.twitter_url) existingLinks.push({ url: lead.twitter_url, label: 'Twitter' });
      if (lead.website) existingLinks.push({ url: lead.website, label: 'Website' });
    }

    setLeadForm({
      name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      email: lead.email || '',
      phone: lead.phone || '',
      company: lead.company || '',
      niche: lead.niche || '',
      priority: lead.priority || 'Warm',
      status: lead.status || 'lead',
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

      const linkedin = (leadForm.links || []).find(l => l.label === 'LinkedIn')?.url || null;
      const instagram = (leadForm.links || []).find(l => l.label === 'Instagram')?.url || null;
      const twitter = (leadForm.links || []).find(l => l.label === 'Twitter')?.url || null;
      const website = (leadForm.links || []).find(l => l.label === 'Website')?.url || null;

      const finalCustomFields = {
        ...(leadForm.custom_fields || {}),
        links: leadForm.links || []
      };

      const { data, error } = await supabase.from('leads')
        .update({
          first_name,
          last_name,
          email: leadForm.email || null,
          phone: leadForm.phone || null,
          company: leadForm.company || null,
          niche: leadForm.niche || null,
          linkedin_url: linkedin,
          instagram_url: instagram,
          twitter_url: twitter,
          website: website,
          priority: leadForm.priority || 'Warm',
          status: leadForm.status || 'lead',
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
      await handleLeadReminderTrigger(activeLead, { status: leadForm.status }, currentUser.id);
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

    const lowerStatus = newStatus.toLowerCase();
    const isReplyTrigger = ['positive_reply', 'booked'].includes(lowerStatus);

    if (isReplyTrigger && !lead.reply_type) {
      // Show Reply Prompt Modal
      setReplyPromptLead(lead);
      setReplyPromptStatus(newStatus);
      setReplyType('positive');
      setReplyTemplateId('');
      setReplyNotes('');
      return;
    }

    try {
      const { data, error } = await supabase.from('leads')
        .update({ status: newStatus })
        .eq('id', leadId)
        .select()
        .single();

      if (error) throw error;
      setLeads(prev => prev.map(l => l.id === leadId ? data : l));
      await handleLeadReminderTrigger(lead, { status: newStatus }, currentUser.id);
      if (onRefreshReminders) onRefreshReminders();
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  // Save Reply Type Prompt
  const handleSaveReplyPrompt = async () => {
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

      // 2. Update Lead status and reply details
      const { data: updatedLead, error: leadErr } = await supabase.from('leads')
        .update({
          status: replyPromptStatus,
          reply_type: repType,
          template_used: replyTemplateId || null
        })
        .eq('id', replyPromptLead.id)
        .select()
        .single();

      if (leadErr) throw leadErr;

      setLeads(prev => prev.map(l => l.id === replyPromptLead.id ? updatedLead : l));
      await handleLeadReminderTrigger(replyPromptLead, { status: replyPromptStatus }, currentUser.id);
      setReplyPromptLead(null);
      if (onRefreshReminders) onRefreshReminders();
    } catch (err) {
      console.error('Error saving reply prompt:', err);
    }
  };

  // Convert to Client
  const handleConvertSubmit = async (lead, clientData) => {
    try {
      // 1. Update Lead lifecycle stage
      const { data: updatedLead, error: leadErr } = await supabase.from('leads')
        .update({ lifecycle_stage: 'converted' })
        .eq('id', lead.id)
        .select()
        .single();
      
      if (leadErr) throw leadErr;
      await handleLeadReminderTrigger(lead, { status: 'client' }, currentUser.id);

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
      if (selectedFolderId === folderId) setSelectedFolderId(null);
    } catch (err) {
      console.error('Error deleting folder:', err);
    }
  };

  const handleDeleteSmartFolder = async (folderId) => {
    if (!confirm('Delete this smart folder?')) return;
    try {
      await supabase.from('user_folders').delete().eq('id', folderId);
      setUserFolders(prev => prev.filter(uf => uf.id !== folderId));
      if (selectedFolderId === folderId) setSelectedFolderId(null);
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
      isMatch = leadStr === ruleStr || 
        (STATUS_LABELS[leadValue] || '').toLowerCase() === ruleStr ||
        Object.entries(STATUS_LABELS).some(([key, val]) => key.toLowerCase() === leadStr && val.toLowerCase() === ruleStr);
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
    if (['all', 'hot', 'warm', 'cold', 'calendly', 'clients'].includes(folderId)) {
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
      await supabase.from('leads').update({ status: newStatus }).in('id', selectedIds);
      setLeads(prev => prev.map(l => selectedIds.includes(l.id) ? { ...l, status: newStatus } : l));
      setSelectedIds([]);
      setShowBulkStatusMenu(false);
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
    } else if (selectedFolderId === 'calendly') {
      folderMatch = l.status === 'calendly_sent';
    } else if (selectedFolderId === 'clients') {
      folderMatch = l.status === 'client';
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
    const statusMatch = !statusFilter || 
      (l.status || '').toLowerCase() === statusFilter.toLowerCase() ||
      (STATUS_LABELS[l.status] || '').toLowerCase() === statusFilter.toLowerCase();

    // Priority filter matches via helper
    const priorityMatch = matchesPriority(l.priority, priorityFilter);

    return searchMatch && folderMatch && statusMatch && priorityMatch;
  });

  const filteredClients = clients.filter(c => {
    const fullSearch = `${c.name} ${c.email} ${c.phone}`.toLowerCase();
    const searchMatch = fullSearch.includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const handleSelectFolder = (id) => {
    setSelectedFolderId(id);
    if (view === 'clients') {
      handleViewChange('contact_details');
    }
  };

  const activeList = view === 'clients' ? filteredClients : filteredLeads;
  const totalFiltered = activeList.length;
  const paginatedList = activeList.slice((currentPage - 1) * pageSize, currentPage * pageSize);



  return (
    <div className="flex gap-4 w-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* 📁 Folders Sidebar Section */}
      <div 
        className="sidebar-folders" 
        style={{
          width: '200px', borderRight: '1px solid var(--border-color)',
          paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem',
          textAlign: 'left'
        }}
      >
        {limits.folders ? (
          <>
            <h4 style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: '8px', marginBottom: '6px', paddingLeft: '8px' }}>System Folders</h4>
            
            {/* System Folders */}
            {[
              { id: 'all', dbId: null, defaultLabel: 'All Leads', iconColor: 'var(--text-muted)' },
              { id: 'hot', dbId: 'hot', defaultLabel: 'Hot', iconColor: '#EF4444' },
              { id: 'warm', dbId: 'warm', defaultLabel: 'Warm', iconColor: '#F59E0B' },
              { id: 'cold', dbId: 'cold', defaultLabel: 'Cold', iconColor: '#6B7280' },
              { id: 'calendly', dbId: 'calendly', defaultLabel: 'Calendly Sent', iconColor: '#06B6D4' },
              { id: 'clients', dbId: 'clients', defaultLabel: 'Clients', iconColor: '#5B8FB9' }
            ].map(sysFolder => {
              const label = systemFolderNames[sysFolder.id] || sysFolder.defaultLabel;
              const isSelected = selectedFolderId === sysFolder.dbId;
              return (
                <div key={sysFolder.id} className="group-hover flex justify-between align-center" style={{ width: '100%' }}>
                  <button 
                    onClick={() => handleSelectFolder(sysFolder.dbId)}
                    className={`folder-item ${isSelected ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1,
                      padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'transparent',
                      border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                      fontWeight: isSelected ? 600 : 400
                    }}
                  >
                    <Folder size={16} style={{ color: sysFolder.iconColor }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '120px' }}>{label}</span>
                  </button>
                  <button 
                    onClick={() => triggerRename(sysFolder.id, label)}
                    className="btn-icon edit-btn" 
                    style={{ padding: '0.2rem', color: 'var(--text-secondary)', display: 'none' }}
                    title="Rename Folder"
                  >
                    <Edit3 size={12} />
                  </button>
                </div>
              );
            })}

            <div style={{ borderTop: '0.5px solid var(--border)', margin: '0.5rem 0' }}></div>

            <h4 style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: '24px', marginBottom: '6px', paddingLeft: '8px' }}>Smart Folders</h4>
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
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1,
                      padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'transparent',
                      border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                      fontWeight: selectedFolderId === uf.id ? 600 : 400
                    }}
                  >
                    <Folder size={16} style={{ color: 'var(--accent-blue)' }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{uf.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({count})</span>
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
            {plan === 'starter' ? (
              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.35rem', 
                  color: 'var(--text-muted)', 
                  fontSize: '0.75rem', 
                  marginTop: '0.5rem', 
                  paddingLeft: '8px'
                }}
                title="Available on Pro plan"
              >
                <Lock size={12} />
                <span>Available on Pro plan</span>
              </div>
            ) : (
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
            )}

            <div style={{ borderTop: '0.5px solid var(--border)', margin: '0.5rem 0' }}></div>

            <h4 style={{ fontSize: '0.65rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginTop: '24px', marginBottom: '6px', paddingLeft: '8px' }}>Manual Folders</h4>
            {folders.map(f => {
              const count = leads.filter(l => l.folder_id === f.id).length;
              return (
                <div key={f.id} className="group-hover flex justify-between align-center" style={{ width: '100%' }}>
                  <button
                    onClick={() => handleSelectFolder(f.id)}
                    className={`folder-item ${selectedFolderId === f.id ? 'active' : ''}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1,
                      padding: '0.5rem 0.75rem', borderRadius: '6px', background: 'transparent',
                      border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
                      fontWeight: selectedFolderId === f.id ? 600 : 400
                    }}
                  >
                    <Folder size={16} style={{ color: f.color }} />
                    <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '100px' }}>{f.name}</span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>({count})</span>
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
        {/* Warning Banners */}
        {showLimitWarning && (
          <div className="auth-error-banner" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <AlertCircle size={16} /> You have {remainingLeads} leads remaining in your plan. Delete unused leads or upgrade to add more.
          </div>
        )}


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
                  Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
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

            {(statusFilter || priorityFilter) && (
              <button
                onClick={() => { setStatusFilter(''); setPriorityFilter(''); }}
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
          <div className="flex justify-between align-center" style={{ padding: '0.75rem 1rem', background: 'var(--bg-card)', border: '0.5px solid var(--border-strong)', borderRadius: '6px' }}>
            <span style={{ fontWeight: 600 }}>{selectedIds.length} leads selected</span>
            <div className="flex gap-2">
              {/* Change Status Dropdown */}
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowBulkStatusMenu(!showBulkStatusMenu)} className="btn btn-secondary btn-sm">
                  Change Status ▾
                </button>
                {showBulkStatusMenu && (
                  <div className="dropdown-menu" style={{ position: 'absolute', top: '100%', marginTop: '0.25rem', right: 0, background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)', borderRadius: '8px', zIndex: 9999, display: 'flex', flexDirection: 'column', padding: '0.25rem', maxHeight: '300px', overflowY: 'auto', minWidth: '160px', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
                    {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                      <button key={val} onClick={() => { handleBulkStatusChange(val); setShowBulkStatusMenu(false); }} className="dropdown-item" style={{ background: 'transparent', border: 'none', padding: '0.4rem 0.8rem', textAlign: 'left', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '6px', fontSize: '0.85rem' }}>
                        {lbl}
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

        {/* Lead Table */}
        <div className="card" style={{ padding: 0, overflowX: 'auto', overflowY: 'visible', height: 'auto' }}>
          <table className="w-full" style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'left', background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '0.75rem 1rem', width: '40px' }}>
                  <button 
                    type="button"
                    onClick={() => handleSelectAll(activeList)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', padding: 0 }}
                  >
                    {activeList.length > 0 && activeList.every(l => selectedIds.includes(l.id)) ? (
                      <CheckSquare size={16} />
                    ) : (
                      <Square size={16} />
                    )}
                  </button>
                </th>
                {view === 'contact_details' && (
                  <th style={{ padding: '0.75rem 0.5rem 0.75rem 1rem', width: '36px', color: 'var(--text-muted)', fontSize: '0.72rem', fontWeight: 600, userSelect: 'none' }}>#</th>
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
                  return headerCols.map(col => (
                    <th key={col.id} style={{ padding: '0.75rem 1rem' }}>
                      {col.column_key === 'platform' ? 'Reach' : col.column_label}
                    </th>
                  ));
                })()
                }
                {isTeamView && <th style={{ padding: '0.75rem 1rem' }}>Added By</th>}
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
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
                      <td style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
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
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 600 }}>
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
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <select
                                value={lead.template_used || ''}
                                onChange={(e) => handleDropdownChange(lead.id, 'template_used', e.target.value || null)}
                                className="form-select btn-sm"
                                style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem', height: 'auto', width: 'auto', background: 'transparent' }}
                              >
                                <option value="">None</option>
                                {templates.map(t => (
                                  <option key={t.id} value={t.id}>{t.title}</option>
                                ))}
                              </select>
                            </td>
                          );
                        }

                        if (col.column_key === 'status') {
                          const currentStatus = cellValue || 'lead';
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <GroupedStatusDropdown
                                value={currentStatus}
                                onChange={(newVal) => handleDropdownChange(lead.id, 'status', newVal)}
                                isTableInline={true}
                                onUpdate={fetchData}
                              />
                            </td>
                          );
                        }

                        if (col.column_type === 'dropdown') {
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
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
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
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
                            <td key={col.id} style={{ padding: '0.75rem 1rem', fontSize: '0.82rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                              {formatted}
                            </td>
                          );
                        }

                        if (col.column_key === 'platform' || col.column_type === 'reach' || col.column_type === 'system') {
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <ReachIcons lead={lead} columnDefs={columnDefs} />
                            </td>
                          );
                        }

                        if (col.column_key === 'status') {
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }}>
                              {(() => {
                                const match = statuses.find(s => s.label.toLowerCase() === (lead.status || '').toLowerCase());
                                const bg = match ? `${match.color}22` : '#374151';
                                const text = match ? match.color : '#D1D5DB';
                                const label = match ? match.label : (lead.status || '—');
                                return (
                                  <span style={{
                                    background: bg,
                                    color: text,
                                    padding: '2px 10px',
                                    borderRadius: '12px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    whiteSpace: 'nowrap',
                                    display: 'inline-block'
                                  }}>
                                    {label}
                                  </span>
                                );
                              })()}
                            </td>
                          );
                        }

                        if (col.column_key === 'priority') {
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <PriorityDropdown
                                value={lead.priority}
                                onChange={(val) => handleDropdownChange(lead.id, 'priority', val)}
                                onUpdate={fetchData}
                              />
                            </td>
                          );
                        }

                        // ── Clickable URL columns ──────────────────────────────
                        if (['linkedin_url', 'instagram_url', 'twitter_url', 'website'].includes(col.column_key) && cellValue) {
                          const url = cellValue.startsWith('http') ? cellValue : `https://${cellValue}`;
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <a href={url} target="_blank" rel="noopener noreferrer"
                                style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                {cellValue}
                              </a>
                            </td>
                          );
                        }

                        // ── Clickable email ────────────────────────────────────
                        if (col.column_key === 'email' && cellValue) {
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <a href={`mailto:${cellValue}`}
                                style={{ color: 'var(--accent-blue)', textDecoration: 'none', fontSize: '0.85rem' }}>
                                {cellValue}
                              </a>
                            </td>
                          );
                        }

                        // ── Phone popup ────────────────────────────────────────
                        if (col.column_key === 'phone') {
                          return (
                            <td key={col.id} style={{ padding: '0.75rem 1rem' }} onClick={(e) => e.stopPropagation()}>
                              <PhonePopup phone={cellValue} />
                            </td>
                          );
                        }

                        return (
                          <td key={col.id} style={{ padding: '0.75rem 1rem' }}>
                            {cellValue || '—'}
                          </td>
                        );
                      })}

                      {isTeamView && (
                        <td style={{ padding: '0.75rem 1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {addedByEmail || 'Unknown'}
                        </td>
                      )}
                      
                      <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
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
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h3>Add Lead</h3>
              <button onClick={() => setShowAddLeadModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>
            <form onSubmit={handleAddLead} className="flex-col gap-3">
              {/* Row 1: Name */}
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sophie Laurent"
                  value={leadForm.name}
                  onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  className="form-input"
                />
              </div>

              {/* Row 2: Email | Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Row 3: Company | Niche */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    value={leadForm.company}
                    onChange={e => setLeadForm({...leadForm, company: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Niche</label>
                  <input
                    type="text"
                    placeholder="e.g. SaaS Founders"
                    value={leadForm.niche}
                    onChange={e => setLeadForm({...leadForm, niche: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Links Section */}
              <div className="form-group" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
                <label className="form-label">Links — paste any URL</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {(leadForm.links || []).map((link, idx) => {
                    const detected = detectDomainIcon(link.url);
                    const IconComp = detected.icon;
                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <IconComp size={15} color={detected.color} style={{ flexShrink: 0 }} />
                        <span
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={link.url}
                        >
                          {link.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLeadForm(prev => ({
                              ...prev,
                              links: prev.links.filter((_, i) => i !== idx)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--status-hot, #ef4444)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Remove link"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                <input
                  type="text"
                  placeholder="+ Paste any link and press Enter..."
                  value={pastedLink}
                  onChange={e => setPastedLink(e.target.value)}
                  onKeyDown={handleAddPastedLink}
                  className="form-input"
                  style={{ borderStyle: 'dashed', borderColor: 'var(--border)' }}
                />
              </div>

              {/* Row 5: Priority | Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={leadForm.priority}
                    onChange={e => setLeadForm({...leadForm, priority: e.target.value})}
                    className="form-select"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <GroupedStatusDropdown
                    value={leadForm.status}
                    onChange={val => setLeadForm({...leadForm, status: val})}
                    onUpdate={fetchData}
                  />
                </div>
              </div>

              {/* Row 6: Assign to Folder | Template Used */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Assign to Folder</label>
                  <select
                    value={getFolderSelectValue()}
                    onChange={e => handleFolderChange(e.target.value)}
                    className="form-select"
                  >
                    <option value="">(No Folder / All Leads)</option>
                    <optgroup label="System Folders">
                      <option value="sys:hot">🔴 Hot</option>
                      <option value="sys:warm">🟡 Warm</option>
                      <option value="sys:cold">⚫ Cold</option>
                      <option value="sys:calendly">📅 Calendly Sent</option>
                      <option value="sys:clients">💼 Clients</option>
                    </optgroup>
                    {folders.length > 0 && (
                      <optgroup label="Manual Folders">
                        {folders.map(f => <option key={f.id} value={`manual:${f.id}`}>{f.name}</option>)}
                      </optgroup>
                    )}
                    <optgroup label="Smart Folders">
                      {userFolders.map(uf => (
                        <option key={uf.id} value={`smart:${uf.id}`} disabled>
                          {uf.name} (rule-based)
                        </option>
                      ))}
                      {plan === 'starter' && userFolders.length === 0 && (
                        <option value="" disabled>🔒 Upgrade to Pro to use Smart Folders</option>
                      )}
                    </optgroup>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Template Used</label>
                  <select
                    value={leadForm.template_used}
                    onChange={e => setLeadForm({...leadForm, template_used: e.target.value})}
                    className="form-select"
                  >
                    <option value="">None</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 7: Notes textarea (full width) */}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={e => setLeadForm({...leadForm, notes: e.target.value})}
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                />
              </div>

              {/* Custom Fields Section */}
              <div style={{ borderTop: '0.5px solid var(--border)', marginTop: '1.5rem', paddingTop: '1rem' }}>
                <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Custom Fields</span>
              </div>

              {/* Render existing custom fields */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                {columnDefs.filter(c => !c.is_default && c.table_view === (view === 'pipeline' ? 'pipeline' : 'contact_details')).map(col => {
                  const val = leadForm.custom_fields?.[col.column_key] || '';
                  return (
                    <div key={col.id} className="form-group" style={{ position: 'relative' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                        <label className="form-label" style={{ marginBottom: 0 }}>{col.column_label}</label>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomFieldVal(col.column_key)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--status-hot, #ef4444)',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Clear value"
                        >
                          ×
                        </button>
                      </div>
                      <input
                        type={col.column_type === 'number' ? 'number' : col.column_type === 'link' ? 'url' : 'text'}
                        value={val}
                        onChange={e => setLeadForm(prev => ({
                          ...prev,
                          custom_fields: {
                            ...(prev.custom_fields || {}),
                            [col.column_key]: e.target.value
                          }
                        }))}
                        className="form-input"
                        placeholder={`Enter ${col.column_label.toLowerCase()}...`}
                      />
                    </div>
                  );
                })}
              </div>

              {/* Add Custom Field Inline Form */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end', marginTop: '1rem', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '8px', border: '1px dashed var(--border)' }}>
                <div style={{ flex: 2 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>New Field Name</label>
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={e => setNewFieldName(e.target.value)}
                    placeholder="e.g. TikTok, Skype..."
                    className="form-input"
                  />
                </div>
                <div style={{ flex: 1.5 }}>
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Type</label>
                  <select
                    value={newFieldType}
                    onChange={e => setNewFieldType(e.target.value)}
                    className="form-select"
                  >
                    <option value="text">Text</option>
                    <option value="link">Link</option>
                    <option value="number">Number</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    handleAddNewCustomField(newFieldName, newFieldType);
                    setNewFieldName('');
                  }}
                  className="btn btn-secondary"
                  style={{ height: '38px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Plus size={14} /> Add Field
                </button>
              </div>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddLeadModal(false)}
                  className="btn"
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#0D1117', backgroundImage: 'none', border: 'none', fontWeight: 600 }}
                >
                  Add Lead
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
            const planName = plan.charAt(0).toUpperCase() + plan.slice(1);
            const limitFormatted = leadLimit.toLocaleString();
            let nextPlan = '';
            let nextLimit = '';
            if (plan === 'trial') { nextPlan = 'Starter'; nextLimit = '600'; }
            else if (plan === 'starter') { nextPlan = 'Pro'; nextLimit = '2,500'; }
            else if (plan === 'pro') { nextPlan = 'Teams'; nextLimit = '10,000'; }
            else if (plan === 'teams') { nextPlan = 'Enterprise'; nextLimit = 'unlimited'; }
            
            setLimitModalMessage(`You've reached your ${planName} plan limit of ${limitFormatted} leads. ${nextPlan ? `Upgrade to ${nextPlan} for ${nextLimit} leads.` : ''}`);
            setShowLimitModal(true);
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
          <div className="modal-content" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <h3>Quick Add Lead</h3>
              <button onClick={() => setShowQuickAddModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>
            <form onSubmit={handleQuickAddSubmit} className="flex-col gap-3">
              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">First Name *</label>
                <input 
                  type="text" 
                  required 
                  value={quickAddForm.first_name} 
                  onChange={e => setQuickAddForm({...quickAddForm, first_name: e.target.value})} 
                  className="form-input" 
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Channel Platform</label>
                <select 
                  value={quickAddForm.platform} 
                  onChange={e => setQuickAddForm({...quickAddForm, platform: e.target.value})} 
                  className="form-select"
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Cold Email">Cold Email</option>
                  <option value="Twitter">Twitter</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label className="form-label">Priority</label>
                <select 
                  value={quickAddForm.priority} 
                  onChange={e => setQuickAddForm({...quickAddForm, priority: e.target.value})} 
                  className="form-select"
                >
                  <option value="Cold">Cold</option>
                  <option value="Warm">Warm</option>
                  <option value="Hot">Hot</option>
                </select>
              </div>

              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setShowQuickAddModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Add Lead</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lead Modal */}
      {showEditLeadModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px', width: '95%' }}>
            <div className="modal-header">
              <h3>Edit Lead</h3>
              <button onClick={() => setShowEditLeadModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>
            <form onSubmit={handleEditLead} className="flex-col gap-3">
              {/* Row 1: Name */}
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sophie Laurent"
                  value={leadForm.name}
                  onChange={e => setLeadForm({...leadForm, name: e.target.value})}
                  className="form-input"
                />
              </div>

              {/* Row 2: Email | Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    value={leadForm.email}
                    onChange={e => setLeadForm({...leadForm, email: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="text"
                    value={leadForm.phone}
                    onChange={e => setLeadForm({...leadForm, phone: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Row 3: Company | Niche */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input
                    type="text"
                    value={leadForm.company}
                    onChange={e => setLeadForm({...leadForm, company: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Niche</label>
                  <input
                    type="text"
                    placeholder="e.g. SaaS Founders"
                    value={leadForm.niche}
                    onChange={e => setLeadForm({...leadForm, niche: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>

              {/* Row 4: Links section */}
              <div className="form-group" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
                <label className="form-label">Links — paste any URL</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  {(leadForm.links || []).map((link, idx) => {
                    const detected = detectDomainIcon(link.url);
                    const IconComp = detected.icon;
                    return (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          padding: '0.4rem 0.6rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border)'
                        }}
                      >
                        <IconComp size={15} color={detected.color} style={{ flexShrink: 0 }} />
                        <span 
                          style={{
                            fontSize: '0.82rem',
                            color: 'var(--text-secondary)',
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={link.url}
                        >
                          {link.url}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLeadForm(prev => ({
                              ...prev,
                              links: prev.links.filter((_, i) => i !== idx)
                            }));
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--status-hot, #ef4444)',
                            cursor: 'pointer',
                            fontSize: '0.9rem',
                            padding: '0 4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Remove link"
                        >
                          ×
                        </button>
                      </div>
                    );
                  })}
                </div>
                
                <input
                  type="text"
                  placeholder="+ Paste any link..."
                  value={pastedLink}
                  onChange={e => setPastedLink(e.target.value)}
                  onKeyDown={handleAddPastedLink}
                  className="form-input"
                  style={{
                    borderStyle: 'dashed',
                    borderColor: 'var(--border)'
                  }}
                />
              </div>

              {/* Row 5: Priority | Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select
                    value={leadForm.priority}
                    onChange={e => setLeadForm({...leadForm, priority: e.target.value})}
                    className="form-select"
                  >
                    <option value="Cold">Cold</option>
                    <option value="Warm">Warm</option>
                    <option value="Hot">Hot</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <GroupedStatusDropdown
                    value={leadForm.status}
                    onChange={val => setLeadForm({...leadForm, status: val})}
                    onUpdate={fetchData}
                  />
                </div>
              </div>

              {/* Row 6: Template Used / Assign to Folder */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Assign to Folder</label>
                  <select
                    value={getFolderSelectValue()}
                    onChange={e => handleFolderChange(e.target.value)}
                    className="form-select"
                  >
                    <option value="">(No Folder / All Leads)</option>
                    
                    <optgroup label="System Folders">
                      <option value="sys:hot">Hot</option>
                      <option value="sys:warm">Warm</option>
                      <option value="sys:cold">Cold</option>
                      <option value="sys:calendly">Calendly Sent</option>
                      <option value="sys:clients">Clients</option>
                    </optgroup>
                    
                    <optgroup label="Manual Folders">
                      {folders.map(f => <option key={f.id} value={`manual:${f.id}`}>{f.name}</option>)}
                    </optgroup>
                    
                    <optgroup label="Smart Folders">
                      {userFolders.map(uf => (
                        <option key={uf.id} value={`smart:${uf.id}`} disabled={true}>
                          {uf.name} (Smart - Rule Based)
                        </option>
                      ))}
                      {plan === 'starter' && (
                        <option value="" disabled={true}>🔒 Smart Folders (Pro Only)</option>
                      )}
                    </optgroup>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Template Used</label>
                  <select
                    value={leadForm.template_used}
                    onChange={e => setLeadForm({...leadForm, template_used: e.target.value})}
                    className="form-select"
                  >
                    <option value="">None</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              </div>

              {/* Row 7: Notes textarea (full width) */}
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea
                  value={leadForm.notes}
                  onChange={e => setLeadForm({...leadForm, notes: e.target.value})}
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                />
              </div>

              <div className="flex justify-between mt-4">
                <button
                  type="button"
                  onClick={() => setShowEditLeadModal(false)}
                  className="btn"
                  style={{ background: 'transparent', color: 'var(--text-primary)', border: '0.5px solid var(--border)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: 'var(--accent-blue)', color: '#0D1117', backgroundImage: 'none', border: 'none', fontWeight: 600 }}
                >
                  Save Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📁 Create Folder Modal */}
      {showFolderModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3>Create Custom Lead Folder</h3>
              <button onClick={() => setShowFolderModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>
            <form onSubmit={handleCreateFolder} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Folder Name *</label>
                <input type="text" required value={folderForm.name} onChange={e => setFolderForm({...folderForm, name: e.target.value})} className="form-input" placeholder="e.g. VIP Prospects" />
              </div>
              <div className="form-group">
                <label className="form-label">Folder Color Dot</label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFolderForm({...folderForm, color: c})}
                      style={{
                        width: '20px', height: '20px', borderRadius: '50%',
                        background: c, border: folderForm.color === c ? '2px solid white' : '1px solid rgba(255,255,255,0.15)',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setShowFolderModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Create Folder</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📥 Import CSV Modal */}
      {showImportModal && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3>Import Leads from CSV</h3>
              <button onClick={() => setShowImportModal(false)} className="theme-toggle"><X size={18} /></button>
            </div>
            <form onSubmit={handleImportCSVSubmit} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Paste Raw CSV Text</label>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
                  First row must be headers including <strong>Name</strong> (or First Name/Last Name) and <strong>Email</strong>.
                </div>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '0.8rem' }}
                  placeholder={"First Name,Last Name,Email,Company,Role\nAhmed,Khan,ahmed@test.com,Acme Corp,CTO"}
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-between mt-2">
                <button type="button" onClick={() => setShowImportModal(false)} className="btn btn-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Import Leads</button>
              </div>
            </form>
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
              
              <div className="form-group">
                <label className="form-label">Was this a positive reply?</label>
                <div className="flex gap-2 w-block" style={{ width: '100%' }}>
                  <button 
                    type="button" 
                    onClick={() => setReplyType('positive')}
                    className={`btn btn-sm ${replyType === 'positive' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center', gap: '0.25rem' }}
                  >
                    <ThumbsUp size={14} /> Positive
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setReplyType('negative')}
                    className={`btn btn-sm ${replyType === 'negative' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center', gap: '0.25rem', borderColor: replyType === 'negative' ? 'var(--danger-color)' : 'var(--border-color)', color: replyType === 'negative' ? '#ef4444' : 'var(--text-primary)' }}
                  >
                    <ThumbsDown size={14} /> Negative
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setReplyType('skip')}
                    className={`btn btn-sm ${replyType === 'skip' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, justifyContent: 'center', gap: '0.25rem' }}
                  >
                    <SkipForward size={14} /> Skip
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Which template did you use? (optional)</label>
                <select 
                  value={replyTemplateId} 
                  onChange={e => setReplyTemplateId(e.target.value)} 
                  className="form-select"
                >
                  <option value="">-- Select template (optional) --</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
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

      {/* 📁 Create Smart Folder Modal */}
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
                            Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
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

      {/* ⚠️ Lead Limits Modal */}
      {showLimitModal && (
        <div className="modal-backdrop" style={{ zIndex: 1200 }}>
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '2rem' }}>
            <div className="paywall-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', margin: '0 auto 1.5rem', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Lock size={30} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-primary)' }}>Limit Reached</h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
              {limitModalMessage}
            </p>
            <div className="flex-col gap-2">
              <button 
                onClick={() => { setShowLimitModal(false); navigate('/upgrade'); }}
                className="btn btn-primary w-full"
                style={{ justifyContent: 'center' }}
              >
                Upgrade Now
              </button>
              <button 
                onClick={() => setShowLimitModal(false)}
                className="btn btn-secondary w-full"
                style={{ justifyContent: 'center' }}
              >
                Cancel
              </button>
            </div>
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
    </div>
  );
}
