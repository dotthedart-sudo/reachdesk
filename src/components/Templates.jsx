import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Copy, 
  Edit3, 
  Trash2, 
  X, 
  Sparkles, 
  Check, 
  Eye,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Lock
} from 'lucide-react';
import { PLAN_LIMITS } from '../lib/utils';

const SECTIONS = [
  'INITIAL TEMPLATES',
  'FOLLOW UPS',
  'BOOKING MESSAGES',
  'AFTER BOOKED',
  'AFTER CLIENT BOOKED'
];

export default function Templates({ 
  currentUser, 
  templates, 
  onAddTemplate, 
  onDeleteTemplate, 
  onUpdateTemplate,
  teamProfilesMap = {},
  isTeamView = false
}) {
  const navigate = useNavigate();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [expandedSections, setExpandedSections] = useState({});
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Form state
  const [formState, setFormState] = useState({
    title: '',
    subject: '',
    body: '',
    platform: 'INITIAL TEMPLATES'
  });

  const [copiedTemplateId, setCopiedTemplateId] = useState(null);
  const [copiedBody, setCopiedBody] = useState(false);

  // Null guard - profile not yet loaded
  if (!currentUser) {
    return <div className="loading-container" style={{ fontFamily: 'Mattone, sans-serif' }}>Loading profile...</div>;
  }

  // Allowed templates (starters + user's own)
  const allowedTemplates = templates.filter(t => t.is_starter || t.user_id === currentUser.id);

  const planKey = (currentUser.plan || 'trial').toLowerCase();
  const templateLimit = (PLAN_LIMITS[planKey] || PLAN_LIMITS.trial).templates;
  const userTemplates = allowedTemplates.filter(t => t.user_id && !t.is_starter);
  const isTemplateLimitReached = templateLimit !== Infinity && userTemplates.length >= templateLimit;

  // Collapsible toggle handler
  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName]
    }));
  };

  const handleOpenAdd = (sectionName) => {
    if (isTemplateLimitReached) {
      const planName = currentUser.plan ? currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1) : 'Trial';
      let nextPlan = '';
      let nextLimit = '';
      if (planKey === 'trial') { nextPlan = 'Starter'; nextLimit = '10 templates'; }
      else if (planKey === 'starter') { nextPlan = 'Pro'; nextLimit = 'unlimited templates'; }
      
      setToastMessage(`You've reached your ${planName} plan limit of ${templateLimit} templates.${nextPlan ? ` Upgrade to ${nextPlan} for ${nextLimit}.` : ''}`);
      setShowToast(true);
      return;
    }
    const defaultPlatform = SECTIONS.includes(sectionName) ? sectionName : 'INITIAL TEMPLATES';
    setFormState({ title: '', subject: '', body: '', platform: defaultPlatform });
    setEditingTemplate(null);
    setShowEditor(true);
  };

  const handleOpenEdit = (template) => {
    setEditingTemplate(template);
    setFormState({
      title: template.title || '',
      subject: template.subject || '',
      body: template.body || '',
      platform: template.platform || 'INITIAL TEMPLATES'
    });
    setShowEditor(true);
  };

  const handleFieldBlur = (field, value) => {
    if (!editingTemplate || editingTemplate.is_starter) return;
    
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));

    onUpdateTemplate(editingTemplate.id, {
      ...formState,
      [field]: value
    });
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formState.title || !formState.body) {
      alert("Title and Body are required.");
      return;
    }

    if (editingTemplate) {
      if (!editingTemplate.is_starter) {
        onUpdateTemplate(editingTemplate.id, formState);
      }
    } else {
      if (isTemplateLimitReached) {
        const planName = currentUser.plan ? currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1) : 'Trial';
        let nextPlan = '';
        let nextLimit = '';
        if (planKey === 'trial') { nextPlan = 'Starter'; nextLimit = '10 templates'; }
        else if (planKey === 'starter') { nextPlan = 'Pro'; nextLimit = 'unlimited templates'; }
        
        setToastMessage(`You've reached your ${planName} plan limit of ${templateLimit} templates.${nextPlan ? ` Upgrade to ${nextPlan} for ${nextLimit}.` : ''}`);
        setShowToast(true);
        return;
      }
      onAddTemplate({
        ...formState,
        is_starter: false
      });
    }
    setShowEditor(false);
  };

  const handleDuplicate = async (template) => {
    if (isTemplateLimitReached) {
      const planName = currentUser.plan ? currentUser.plan.charAt(0).toUpperCase() + currentUser.plan.slice(1) : 'Trial';
      let nextPlan = '';
      let nextLimit = '';
      if (planKey === 'trial') { nextPlan = 'Starter'; nextLimit = '10 templates'; }
      else if (planKey === 'starter') { nextPlan = 'Pro'; nextLimit = 'unlimited templates'; }
      
      setToastMessage(`You've reached your ${planName} plan limit of ${templateLimit} templates.${nextPlan ? ` Upgrade to ${nextPlan} for ${nextLimit}.` : ''}`);
      setShowToast(true);
      return;
    }
    const newTemplate = await onAddTemplate({
      title: `${template.title} (Copy)`,
      subject: template.subject || '',
      body: template.body || '',
      platform: template.platform || 'INITIAL TEMPLATES',
      is_starter: false
    });
    
    alert(`Template duplicated! You can now find it in My Templates.`);
    if (newTemplate) {
      handleOpenEdit(newTemplate);
    }
  };

  const handleCopyBodyOnly = (bodyText, templateId) => {
    navigator.clipboard.writeText(bodyText || '');
    setCopiedTemplateId(templateId);
    setTimeout(() => setCopiedTemplateId(null), 2000);
  };

  const handleCopyBodyModal = () => {
    navigator.clipboard.writeText(formState.body || '');
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  const insertTag = (tag) => {
    if (editingTemplate?.is_starter) return;
    const newBody = formState.body + ` ${tag} `;
    setFormState(prev => ({
      ...prev,
      body: newBody
    }));
    if (editingTemplate) {
      onUpdateTemplate(editingTemplate.id, {
        ...formState,
        body: newBody
      });
    }
  };

  const renderHighlightedContent = (text) => {
    if (!text) return <span style={{ color: '#8B949E' }}>Start typing template body...</span>;
    // Capture any bracketed content like [Name], [niche], etc.
    const parts = text.split(/(\[[^\]]+\])/g);
    return parts.map((part, index) => {
      if (part.startsWith('[') && part.endsWith(']')) {
        return (
          <span 
            key={index} 
            className="smart-tag" 
            style={{ 
              backgroundColor: 'rgba(91, 143, 185, 0.15)', 
              border: '1px solid rgba(91, 143, 185, 0.4)', 
              color: '#5B8FB9',
              padding: '0.1rem 0.3rem',
              borderRadius: '2px',
              fontWeight: 600,
              fontSize: '0.85em'
            }}
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  // Group templates by section
  const groupedTemplates = {};
  SECTIONS.forEach(sec => {
    groupedTemplates[sec] = [];
  });
  const otherTemplates = [];

  allowedTemplates.forEach(t => {
    if (SECTIONS.includes(t.platform)) {
      groupedTemplates[t.platform].push(t);
    } else {
      otherTemplates.push(t);
    }
  });

  const renderSection = (sectionName, list) => {
    const isExpanded = !!expandedSections[sectionName];
    return (
      <div 
        key={sectionName} 
        style={{ 
          marginBottom: '1rem', 
          backgroundColor: 'var(--bg-page)', 
          border: '1px solid var(--border)', 
          borderRadius: '3px' 
        }}
      >
        {/* Collapsible Header */}
        <div 
          onClick={() => toggleSection(sectionName)}
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '1rem', 
            cursor: 'pointer',
            userSelect: 'none',
            borderBottom: isExpanded ? '1px solid var(--border)' : 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
            {isExpanded ? <ChevronDown size={18} style={{ color: 'var(--accent-blue)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
            <span 
              style={{ 
                fontFamily: 'Mattone, sans-serif', 
                textTransform: 'uppercase', 
                letterSpacing: '0.05em', 
                fontSize: '0.95rem',
                fontWeight: 600,
                color: 'var(--text-primary)' 
              }}
            >
              {sectionName}
            </span>
            <span 
              style={{ 
                backgroundColor: 'rgba(91, 143, 185, 0.1)', 
                color: 'var(--accent-blue)', 
                fontSize: '0.75rem', 
                padding: '2px 8px', 
                borderRadius: '10px', 
                marginLeft: '0.5rem',
                fontWeight: 600
              }}
            >
              {list.length}
            </span>
          </div>

          <button 
            onClick={(e) => { 
              e.stopPropagation(); 
              handleOpenAdd(sectionName); 
            }}
            className="btn btn-secondary btn-sm"
            style={{ 
              borderColor: 'var(--border)', 
              borderRadius: '3px',
              padding: '4px 10px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem'
            }}
          >
            <Plus size={12} /> Add Template
          </button>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div style={{ padding: '1rem', backgroundColor: 'var(--bg-page)' }}>
            {list.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                No templates in this section. Click "Add Template" to create one.
              </div>
            ) : (
              <div 
                style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
                  gap: '1rem' 
                }}
              >
                {list.map(template => {
                  const addedByEmail = teamProfilesMap[template.user_id];
                  return (
                    <div 
                      key={template.id}
                      className="card flex-col gap-3"
                      style={{ 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '3px',
                        padding: '1.25rem',
                        textAlign: 'left'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                        <h4 
                          style={{ 
                            fontSize: '1rem', 
                            fontWeight: 600, 
                            color: 'var(--text-primary)',
                            margin: 0,
                            fontFamily: 'Plus Jakarta Sans, sans-serif'
                          }}
                        >
                          {template.title}
                        </h4>
                        <span 
                          style={{ 
                            fontSize: '0.7rem', 
                            padding: '2px 6px', 
                            borderRadius: '3px',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            backgroundColor: template.is_starter ? 'rgba(91, 143, 185, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                            color: template.is_starter ? '#5B8FB9' : '#10b981',
                            border: `1px solid ${template.is_starter ? 'rgba(91,143,185,0.3)' : 'rgba(16,185,129,0.3)'}`,
                            flexShrink: 0
                          }}
                        >
                          {template.is_starter ? 'Starter' : 'Custom'}
                        </span>
                      </div>

                      {template.subject && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <strong>Subject:</strong> {template.subject}
                        </div>
                      )}

                      <div 
                        style={{ 
                          fontSize: '0.85rem', 
                          maxHeight: '120px', 
                          overflowY: 'auto', 
                          backgroundColor: 'var(--bg-page)',
                          padding: '0.75rem',
                          borderRadius: '3px',
                          border: '1px solid var(--border)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.5,
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {renderHighlightedContent(template.body)}
                      </div>

                      {isTeamView && addedByEmail && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          Added by: {addedByEmail}
                        </div>
                      )}

                      <div className="flex gap-2" style={{ marginTop: 'auto', paddingTop: '0.75rem' }}>
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleCopyBodyOnly(template.body, template.id)}
                          style={{ 
                            borderRadius: '3px', 
                            flex: 1, 
                            justifyContent: 'center', 
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Copy size={12} />
                          {copiedTemplateId === template.id ? 'Copied!' : 'Copy'}
                        </button>
                        
                        {template.is_starter ? (
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleDuplicate(template)}
                            style={{ borderRadius: '3px', fontSize: '0.8rem', padding: '0 8px' }}
                            title="Duplicate to custom templates"
                          >
                            Duplicate
                          </button>
                        ) : (
                          <>
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleOpenEdit(template)}
                              style={{ 
                                borderRadius: '3px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '4px',
                                fontSize: '0.8rem' 
                              }}
                            >
                              <Edit3 size={12} /> Edit
                            </button>
                            <button 
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this template?')) {
                                  onDeleteTemplate(template.id);
                                }
                              }}
                              style={{ borderRadius: '3px', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-col gap-4 w-full" style={{ minHeight: 'calc(100vh - 120px)', textAlign: 'left' }}>
      {/* Header section */}
      <div className="flex justify-between align-center mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem' }}>
        <div>
          <h2 style={{ fontFamily: 'Mattone, sans-serif', fontSize: '1.5rem', fontWeight: 400, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Template Library
          </h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Build highly personal outreach messages using automated smart tags
          </p>
        </div>
        <div>
          <button 
            className="btn btn-primary" 
            onClick={() => handleOpenAdd('INITIAL TEMPLATES')}
            disabled={isTemplateLimitReached}
            style={{ borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} />
            Create Template
          </button>
        </div>
      </div>

      {/* Accordion list of sections */}
      <div className="flex-col">
        {SECTIONS.map(sec => renderSection(sec, groupedTemplates[sec]))}
        
        {/* Render fallback uncategorized templates if they exist */}
        {otherTemplates.length > 0 && renderSection('OTHER TEMPLATES', otherTemplates)}
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '3px' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontFamily: 'Mattone, sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {editingTemplate ? (editingTemplate.is_starter ? 'View Starter Template' : 'Edit Template') : 'Create New Template'}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyBodyModal}
                  style={{ borderRadius: '3px' }}
                >
                  <Copy size={12} />
                  {copiedBody ? 'Copied!' : 'Copy Body'}
                </button>
                <button onClick={() => setShowEditor(false)} className="theme-toggle" style={{ color: 'var(--text-muted)' }}>
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {editingTemplate?.is_starter && (
              <div style={{ background: 'rgba(91, 143, 185, 0.1)', border: '1px solid rgba(91, 143, 185, 0.3)', color: '#5B8FB9', padding: '0.75rem 1rem', borderRadius: '3px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 500 }}>
                This is a starter template — duplicate it to make your own editable copy.
              </div>
            )}

            <form onSubmit={handleSave} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Template Title *</label>
                <input 
                  type="text" 
                  required 
                  disabled={editingTemplate?.is_starter}
                  className="form-input"
                  placeholder="e.g. Cold Pitch: Straight Up"
                  value={formState.title}
                  onChange={(e) => setFormState({...formState, title: e.target.value})}
                  onBlur={(e) => handleFieldBlur('title', e.target.value)}
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Section *</label>
                <select
                  required
                  disabled={editingTemplate?.is_starter}
                  className="form-select"
                  value={formState.platform}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormState({ ...formState, platform: val });
                    handleFieldBlur('platform', val);
                  }}
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)', padding: '0.5rem' }}
                >
                  {SECTIONS.map(sec => (
                    <option key={sec} value={sec}>{sec}</option>
                  ))}
                  {!SECTIONS.includes(formState.platform) && (
                    <option value={formState.platform}>{formState.platform}</option>
                  )}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Email Subject (Optional)</label>
                <input 
                  type="text" 
                  disabled={editingTemplate?.is_starter}
                  className="form-input"
                  placeholder="e.g. Quick question re: outreach"
                  value={formState.subject}
                  onChange={(e) => setFormState({...formState, subject: e.target.value})}
                  onBlur={(e) => handleFieldBlur('subject', e.target.value)}
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)' }}
                />
              </div>

              {/* Tag Injector Helpers */}
              {!editingTemplate?.is_starter && (
                <div className="flex gap-2 align-center">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Click to insert tag:</span>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => insertTag('[Name]')}
                    style={{ borderColor: 'var(--border)', borderRadius: '3px' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--accent-blue)' }} />
                    [Name]
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => insertTag('[niche]')}
                    style={{ borderColor: 'var(--border)', borderRadius: '3px' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--accent-blue)' }} />
                    [niche]
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => insertTag('[result]')}
                    style={{ borderColor: 'var(--border)', borderRadius: '3px' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--accent-blue)' }} />
                    [result]
                  </button>
                </div>
              )}

              {/* Grid: Editor Left, Live Preview Right */}
              <div className="template-editor-container" style={{ marginTop: '0.5rem' }}>
                <div className="form-group">
                  <label className="form-label" style={{ color: 'var(--text-secondary)' }}>Body Template *</label>
                  <textarea 
                    className="form-textarea"
                    required
                    disabled={editingTemplate?.is_starter}
                    style={{ minHeight: '220px', lineHeight: 1.5, backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)' }}
                    placeholder="Hi [Name], came across your work..."
                    value={formState.body}
                    onChange={(e) => setFormState({...formState, body: e.target.value})}
                    onBlur={(e) => handleFieldBlur('body', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label flex align-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Eye size={14} /> Live Highlight Preview
                  </label>
                  <div className="editor-preview-pane" style={{ minHeight: '220px', backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-secondary)' }}>
                    {formState.subject && (
                      <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                        Subject: {formState.subject}
                      </div>
                    )}
                    {renderHighlightedContent(formState.body)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                <button type="button" onClick={() => setShowEditor(false)} className="btn btn-secondary" style={{ borderRadius: '3px' }}>
                  {editingTemplate?.is_starter ? 'Close' : 'Cancel'}
                </button>
                {editingTemplate?.is_starter ? (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => { handleDuplicate(editingTemplate); setShowEditor(false); }}
                    style={{ borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Copy size={16} />
                    Duplicate Template
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary" style={{ borderRadius: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Check size={16} />
                    Save Template
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-strong)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
          borderRadius: '8px',
          padding: '1rem',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem',
          maxWidth: '350px',
          animation: 'slideIn 0.2s ease',
          fontFamily: 'sans-serif'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4', textAlign: 'left' }}>
              {toastMessage}
            </span>
            <button onClick={() => setShowToast(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
          <button
            onClick={() => { setShowToast(false); navigate('/upgrade'); }}
            className="btn btn-primary btn-sm"
            style={{ alignSelf: 'flex-start', justifyContent: 'center', borderRadius: '3px' }}
          >
            Upgrade Now
          </button>
        </div>
      )}
    </div>
  );
}
