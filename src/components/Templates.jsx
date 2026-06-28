import React, { useState } from 'react';
import { 
  Plus, 
  Copy, 
  Edit3, 
  Trash2, 
  X, 
  Sparkles, 
  Check, 
  Eye, 
  BookOpen,
  UserCheck,
  Briefcase,
  Mail,
  Camera,
  MessageCircle,
  ClipboardList
} from 'lucide-react';
import { PLAN_LIMITS } from '../lib/utils';

export default function Templates({ 
  currentUser, 
  templates, 
  onAddTemplate, 
  onDeleteTemplate, 
  onUpdateTemplate,
  teamProfilesMap = {},
  isTeamView = false
}) {
  const [selectedFolder, setSelectedFolder] = useState('all'); // 'all', 'LinkedIn', 'Email', 'Instagram', 'Facebook', 'WhatsApp', 'my-templates'
  const [showEditor, setShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Form state
  const [formState, setFormState] = useState({
    title: '',
    subject: '',
    body: '',
    platform: 'LinkedIn'
  });

  const [copied, setCopied] = useState(false);

  // Null guard - profile not yet loaded
  if (!currentUser) {
    return <div className="loading-container">Loading profile...</div>;
  }

  // Allowed templates (starters + user's own)
  const allowedTemplates = templates.filter(t => t.is_starter || t.user_id === currentUser.id);

  // Counts for each sidebar folder
  const countAll = allowedTemplates.length;
  const countLinkedIn = allowedTemplates.filter(t => t.platform === 'LinkedIn').length;
  const countEmail = allowedTemplates.filter(t => t.platform === 'Email').length;
  const countInstagram = allowedTemplates.filter(t => t.platform === 'Instagram').length;
  const countFacebook = allowedTemplates.filter(t => t.platform === 'Facebook').length;
  const countWhatsApp = allowedTemplates.filter(t => t.platform === 'WhatsApp').length;
  const countMyTemplates = allowedTemplates.filter(t => !t.is_starter && t.user_id === currentUser.id).length;

  const planKey = (currentUser.plan || 'trial').toLowerCase();
  const templateLimit = (PLAN_LIMITS[planKey] || PLAN_LIMITS.trial).templates;
  const userTemplates = allowedTemplates.filter(t => t.user_id && !t.is_starter);
  const isTemplateLimitReached = templateLimit !== Infinity && userTemplates.length >= templateLimit;

  // Filter templates list for display
  const displayedTemplates = allowedTemplates.filter(t => {
    if (selectedFolder === 'all') return true;
    if (selectedFolder === 'my-templates') {
      return !t.is_starter && t.user_id === currentUser.id;
    }
    return t.platform === selectedFolder;
  });

  const handleOpenAdd = () => {
    if (isTemplateLimitReached) {
      alert(`Template limit reached! Your ${currentUser.plan} plan allows up to ${templateLimit} templates. Please upgrade your plan or delete some templates.`);
      return;
    }
    const defaultPlatform = ['LinkedIn', 'Email', 'Instagram', 'Facebook', 'WhatsApp'].includes(selectedFolder)
      ? selectedFolder
      : 'LinkedIn';
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
      platform: template.platform || 'LinkedIn'
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
        alert(`Template limit reached! Your ${currentUser.plan} plan allows up to ${templateLimit} templates. Please upgrade your plan.`);
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
      alert(`Template limit reached! Your ${currentUser.plan} plan allows up to ${templateLimit} templates. Please upgrade your plan.`);
      return;
    }
    const newTemplate = await onAddTemplate({
      title: `${template.title} (Copy)`,
      subject: template.subject || '',
      body: template.body || '',
      platform: template.platform || 'LinkedIn',
      is_starter: false
    });
    setSelectedFolder('my-templates');
    alert(`Template duplicated! You can now edit it.`);
    if (newTemplate) {
      handleOpenEdit(newTemplate);
    }
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(formState.body || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    if (!text) return <span className="color-muted">Start typing template body...</span>;
    const parts = text.split(/(\[First Name\]|\[Company\])/g);
    return parts.map((part, index) => {
      if (part === '[First Name]' || part === '[Company]') {
        return (
          <span key={index} className="smart-tag">
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex gap-4 w-full" style={{ minHeight: 'calc(100vh - 120px)' }}>
      {/* Platform folders sidebar */}
      <div 
        className="sidebar-folders" 
        style={{
          width: '220px', borderRight: '1px solid var(--border-color)',
          paddingRight: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem',
          textAlign: 'left', flexShrink: 0
        }}
      >
        <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>Templates</h4>
        
        <button 
          onClick={() => setSelectedFolder('all')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'all' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'all' ? 600 : 400
          }}
        >
          <ClipboardList size={16} /> All Templates ({countAll})
        </button>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }}></div>

        <button 
          onClick={() => setSelectedFolder('LinkedIn')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'LinkedIn' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'LinkedIn' ? 600 : 400
          }}
        >
          <Briefcase size={16} /> LinkedIn ({countLinkedIn})
        </button>

        <button 
          onClick={() => setSelectedFolder('Email')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'Email' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'Email' ? 600 : 400
          }}
        >
          <Mail size={16} /> Email ({countEmail})
        </button>

        <button 
          onClick={() => setSelectedFolder('Instagram')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'Instagram' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'Instagram' ? 600 : 400
          }}
        >
          <Camera size={16} /> Instagram ({countInstagram})
        </button>

        <button 
          onClick={() => setSelectedFolder('Facebook')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'Facebook' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'Facebook' ? 600 : 400
          }}
        >
          <BookOpen size={16} /> Facebook ({countFacebook})
        </button>

        <button 
          onClick={() => setSelectedFolder('WhatsApp')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'WhatsApp' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'WhatsApp' ? 600 : 400
          }}
        >
          <MessageCircle size={16} /> WhatsApp ({countWhatsApp})
        </button>

        <div style={{ borderTop: '1px solid var(--border-color)', margin: '0.25rem 0' }}></div>

        <button 
          onClick={() => setSelectedFolder('my-templates')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
            padding: '0.5rem 0.75rem', borderRadius: '6px', background: selectedFolder === 'my-templates' ? 'var(--bg-tertiary)' : 'transparent',
            border: 'none', color: 'var(--text-primary)', cursor: 'pointer', textAlign: 'left',
            fontWeight: selectedFolder === 'my-templates' ? 600 : 400
          }}
        >
          <UserCheck size={16} /> My Templates ({countMyTemplates})
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex-col gap-4">
        <div className="flex justify-between align-center mb-4">
          <div>
            <h2>Outreach Templates</h2>
            <p className="color-muted" style={{ fontSize: '0.9rem' }}>
              Build highly personal outreach messages using automated smart tags
            </p>
          </div>
          <div>
            <button 
              className="btn btn-primary" 
              onClick={handleOpenAdd}
              disabled={isTemplateLimitReached}
            >
              <Plus size={16} />
              Create Template
            </button>
          </div>
        </div>

        {/* Grid of Templates */}
        <div className="grid-3">
          {displayedTemplates.length === 0 ? (
            <div style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              No templates found in this folder.
            </div>
          ) : (
            displayedTemplates.map(template => {
              const addedByEmail = teamProfilesMap[template.user_id];
              return (
                <div 
                  className="card flex-col gap-3" 
                  key={template.id} 
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => handleOpenEdit(template)}
                >
                  <div className="flex justify-between align-center">
                    <h3 style={{ fontSize: '1.1rem' }}>{template.title}</h3>
                    <span className={`badge ${template.is_starter ? 'badge-starter' : 'badge-pro'}`}>
                      {template.is_starter ? 'Starter' : 'Custom'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>Platform:</strong> <span className="color-muted">{template.platform}</span>
                  </div>
                  <div style={{ fontSize: '0.85rem' }}>
                    <strong>Subject:</strong> <span className="color-muted">{template.subject || 'No Subject'}</span>
                  </div>
                  <div 
                    style={{ 
                      fontSize: '0.85rem', 
                      maxHeight: '100px', 
                      overflowY: 'auto', 
                      backgroundColor: 'var(--bg-tertiary)',
                      padding: '0.5rem',
                      borderRadius: '6px',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {renderHighlightedContent(template.body)}
                  </div>

                  {isTeamView && addedByEmail && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                      Added by: {addedByEmail}
                    </div>
                  )}

                  <div className="flex gap-2 mt-4" style={{ marginTop: 'auto' }}>
                    {template.is_starter ? (
                      <button 
                        className="btn btn-secondary btn-sm w-full"
                        onClick={(e) => { e.stopPropagation(); handleDuplicate(template); }}
                      >
                        <Copy size={12} />
                        Duplicate to My Templates
                      </button>
                    ) : (
                      <>
                        <button 
                          className="btn btn-secondary btn-sm w-full"
                          onClick={(e) => { e.stopPropagation(); handleOpenEdit(template); }}
                        >
                          <Edit3 size={12} />
                          Edit Template
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={(e) => { e.stopPropagation(); onDeleteTemplate(template.id); }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && (
        <div className="modal-backdrop">
          <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
            <div className="modal-header">
              <h3>{editingTemplate ? (editingTemplate.is_starter ? 'View Starter Template' : 'Edit Template') : 'Create New Template'}</h3>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyBody}
                >
                  <Copy size={12} />
                  {copied ? 'Copied!' : 'Copy Body'}
                </button>
                <button onClick={() => setShowEditor(false)} className="theme-toggle">
                  <X size={18} />
                </button>
              </div>
            </div>
            
            {editingTemplate?.is_starter && (
              <div style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid var(--primary-purple)', color: 'var(--primary-purple)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem', fontWeight: 500 }}>
                This is a starter template — duplicate it to make your own editable copy
              </div>
            )}

            <form onSubmit={handleSave} className="flex-col gap-3">
              <div className="form-group">
                <label className="form-label">Template Title *</label>
                <input 
                  type="text" 
                  required 
                  disabled={editingTemplate?.is_starter}
                  className="form-input"
                  placeholder="e.g. Cold Pitch: Marketing Services"
                  value={formState.title}
                  onChange={(e) => setFormState({...formState, title: e.target.value})}
                  onBlur={(e) => handleFieldBlur('title', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Platform *</label>
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
                >
                  <option value="LinkedIn">LinkedIn</option>
                  <option value="Email">Email</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="WhatsApp">WhatsApp</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Email Subject</label>
                <input 
                  type="text" 
                  disabled={editingTemplate?.is_starter}
                  className="form-input"
                  placeholder="e.g. Quick question for [First Name] re [Company]"
                  value={formState.subject}
                  onChange={(e) => setFormState({...formState, subject: e.target.value})}
                  onBlur={(e) => handleFieldBlur('subject', e.target.value)}
                />
              </div>

              {/* Tag Injector Helpers */}
              {!editingTemplate?.is_starter && (
                <div className="flex gap-2 align-center">
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Click to insert tag:</span>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => insertTag('[First Name]')}
                    style={{ borderColor: 'var(--primary-purple)' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--primary-purple)' }} />
                    [First Name]
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => insertTag('[Company]')}
                    style={{ borderColor: 'var(--primary-magenta)' }}
                  >
                    <Sparkles size={12} style={{ color: 'var(--primary-magenta)' }} />
                    [Company]
                  </button>
                </div>
              )}

              {/* Grid: Editor Left, Live Preview Right */}
              <div className="template-editor-container">
                <div className="form-group">
                  <label className="form-label">Body Template *</label>
                  <textarea 
                    className="form-textarea"
                    required
                    disabled={editingTemplate?.is_starter}
                    style={{ minHeight: '220px', lineHeight: 1.5 }}
                    placeholder="Hi [First Name], I noticed that your team at [Company]..."
                    value={formState.body}
                    onChange={(e) => setFormState({...formState, body: e.target.value})}
                    onBlur={(e) => handleFieldBlur('body', e.target.value)}
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label flex align-center gap-1">
                    <Eye size={14} /> Live Highlight Preview
                  </label>
                  <div className="editor-preview-pane" style={{ minHeight: '220px' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.25rem', marginBottom: '0.5rem' }}>
                      Subject: {formState.subject || <span className="color-muted">(No subject)</span>}
                    </div>
                    {renderHighlightedContent(formState.body)}
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-4">
                <button type="button" onClick={() => setShowEditor(false)} className="btn btn-secondary">
                  {editingTemplate?.is_starter ? 'Close' : 'Cancel'}
                </button>
                {editingTemplate?.is_starter ? (
                  <button 
                    type="button" 
                    className="btn btn-primary"
                    onClick={() => { handleDuplicate(editingTemplate); setShowEditor(false); }}
                  >
                    <Copy size={16} />
                    Duplicate to My Templates
                  </button>
                ) : (
                  <button type="submit" className="btn btn-primary">
                    <Check size={16} />
                    Save Template
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
