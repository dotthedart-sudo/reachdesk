import React, { useState } from 'react';
import { X } from 'lucide-react';

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

  const leadLabel = [lead.first_name, lead.last_name].filter(Boolean).join(' ') || lead.company || 'this lead';

  return (
    <div className="modal-backdrop">
      <div className="modal-content rd-modal">
        <div className="rd-modal-header">
          <div>
            <h3>Convert to client</h3>
            <p className="rd-modal-sub">
              Move <strong>{leadLabel}</strong> from the pipeline into Clients.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rd-modal-close" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="rd-modal-form">
          <div className="rd-modal-body">
            <div className="rd-form">
              <section className="rd-form-section">
                <h4 className="rd-form-section-title">Client</h4>
                <div className="rd-form-group">
                  <label className="form-label" htmlFor="convert-name">Client / company name</label>
                  <input
                    id="convert-name"
                    required
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="rd-form-row">
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="convert-email">Email</label>
                    <input
                      id="convert-email"
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="convert-phone">Phone</label>
                    <input
                      id="convert-phone"
                      type="text"
                      className="form-input"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>
              </section>

              <section className="rd-form-section">
                <h4 className="rd-form-section-title">Project</h4>
                <div className="rd-form-row">
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="convert-status">Project status</label>
                    <select
                      id="convert-status"
                      className="form-select"
                      value={formData.project_status}
                      onChange={(e) => setFormData({ ...formData, project_status: e.target.value })}
                    >
                      <option value="Onboarding">Onboarding</option>
                      <option value="In Progress">In Progress</option>
                      <option value="On Hold">On Hold</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="convert-start">Start date</label>
                    <input
                      id="convert-start"
                      type="date"
                      className="form-input"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                </div>
                <div className="rd-form-row">
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="convert-value">Contract value</label>
                    <input
                      id="convert-value"
                      type="number"
                      className="form-input"
                      placeholder="e.g. 5000"
                      value={formData.contract_value}
                      onChange={(e) => setFormData({ ...formData, contract_value: e.target.value })}
                    />
                  </div>
                  <div className="rd-form-group">
                    <label className="form-label" htmlFor="convert-invoice">Invoice / billing link</label>
                    <input
                      id="convert-invoice"
                      type="url"
                      className="form-input"
                      placeholder="https://…"
                      value={formData.billing_invoice_link}
                      onChange={(e) => setFormData({ ...formData, billing_invoice_link: e.target.value })}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="rd-modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Converting…' : 'Convert to client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
