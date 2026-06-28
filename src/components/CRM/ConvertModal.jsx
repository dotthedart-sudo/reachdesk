import React, { useState } from 'react';
import { X, CheckCircle, ExternalLink } from 'lucide-react';

export default function ConvertModal({ lead, onClose, onConvert }) {
  const [formData, setFormData] = useState({
    name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || lead.company || 'Unknown Client',
    email: lead.email || '',
    phone: lead.phone || '',
    project_status: 'Onboarding',
    contract_value: '',
    start_date: new Date().toISOString().split('T')[0],
    billing_invoice_link: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onConvert(lead, formData);
    setLoading(false);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content" style={{ maxWidth: '500px', width: '90%' }}>
        <div className="modal-header">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CheckCircle size={20} style={{ color: 'var(--primary-purple)' }} />
            Convert to Client
          </h2>
          <button onClick={onClose} className="theme-toggle">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            You are converting <strong>{lead.first_name} {lead.last_name}</strong> into an active client. This will move them from the leads pipeline to your Clients folder.
          </p>

          <div className="form-group">
            <label className="form-label">Client / Company Name</label>
            <input 
              required
              className="form-input"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input 
                type="email"
                className="form-input"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input 
                type="text"
                className="form-input"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Project Status</label>
              <select 
                className="form-select"
                value={formData.project_status}
                onChange={(e) => setFormData({...formData, project_status: e.target.value})}
              >
                <option value="Onboarding">Onboarding</option>
                <option value="In Progress">In Progress</option>
                <option value="On Hold">On Hold</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input 
                type="date"
                className="form-input"
                value={formData.start_date}
                onChange={(e) => setFormData({...formData, start_date: e.target.value})}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Contract Value ($)</label>
              <input 
                type="number"
                className="form-input"
                placeholder="e.g. 5000"
                value={formData.contract_value}
                onChange={(e) => setFormData({...formData, contract_value: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Invoice / Billing Link</label>
              <input 
                type="url"
                className="form-input"
                placeholder="https://..."
                value={formData.billing_invoice_link}
                onChange={(e) => setFormData({...formData, billing_invoice_link: e.target.value})}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-4" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Converting...' : 'Complete Conversion'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
