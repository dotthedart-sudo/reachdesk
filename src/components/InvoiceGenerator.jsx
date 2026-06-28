import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  Share2, 
  Eye, 
  Check, 
  Copy, 
  Printer, 
  Receipt,
  FileText,
  Lock,
  ArrowLeft
} from 'lucide-react';

// Main Dashboard view for managing and creating invoices
export default function InvoiceGenerator({ 
  currentUser, 
  invoices, 
  onAddInvoice, 
  onDeleteInvoice,
  onUpdateInvoiceStatus
}) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Invoice Form State
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [paymentDetails, setPaymentDetails] = useState('');
  const [notes, setNotes] = useState('Payment due on receipt.');
  
  const [items, setItems] = useState([
    { description: 'Freelance Services', quantity: 1, rate: 500 }
  ]);

  const handleAddItem = () => {
    setItems([...items, { description: '', quantity: 1, rate: 0 }]);
  };

  const handleRemoveItem = (index) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    if (field === 'quantity') {
      newItems[index].quantity = parseInt(value) || 0;
    } else if (field === 'rate') {
      newItems[index].rate = parseFloat(value) || 0;
    } else {
      newItems[index][field] = value;
    }
    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!clientName) {
      alert("Client name is required");
      return;
    }
    if (items.some(item => !item.description)) {
      alert("All items must have a description");
      return;
    }

    const subtotal = calculateSubtotal();

    const newInvoice = {
      clientName,
      clientEmail,
      invoiceNumber,
      issueDate,
      dueDate: dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      currency,
      items,
      paymentDetails,
      notes,
      total: subtotal,
      status: 'Sent',
      userEmail: currentUser.email,
      dateAdded: new Date().toLocaleDateString()
    };

    onAddInvoice(newInvoice);
    
    // Reset Form
    setClientName('');
    setClientEmail('');
    setInvoiceNumber(`INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    setItems([{ description: 'Freelance Services', quantity: 1, rate: 500 }]);
    setPaymentDetails('');
    setNotes('Payment due on receipt.');
    setShowCreateForm(false);
    
    alert("Invoice generated and saved successfully!");
  };

  const handleCopyLink = (invoiceId) => {
    const shareUrl = `${window.location.origin}/i/${invoiceId}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedId(invoiceId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const userInvoices = invoices.filter(inv => inv.userEmail === currentUser.email);

  return (
    <div className="flex-col gap-4">
      <div className="flex justify-between align-center mb-4">
        <div>
          <h2>Client Invoices</h2>
          <p className="color-muted" style={{ fontSize: '0.9rem' }}>
            Generate professional business invoices and get paid directly by your clients
          </p>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
        >
          <Receipt size={16} />
          {showCreateForm ? 'View All Invoices' : 'Create Invoice'}
        </button>
      </div>

      {showCreateForm ? (
        /* Invoice Creator Form */
        <div className="card flex-col gap-4" style={{ textAlign: 'left', maxWidth: '800px', margin: '0 auto' }}>
          <h3 style={{ fontSize: '1.25rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', color: 'var(--primary-purple)' }}>
            New Client Invoice
          </h3>
          
          <form onSubmit={handleSubmit} className="flex-col gap-4">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Client Name *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  placeholder="e.g. Acme Corporation" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Client Email</label>
                <input 
                  type="email" 
                  className="form-input" 
                  placeholder="e.g. billing@acme.com" 
                  value={clientEmail} 
                  onChange={(e) => setClientEmail(e.target.value)} 
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Invoice Number *</label>
                <input 
                  type="text" 
                  required 
                  className="form-input" 
                  value={invoiceNumber} 
                  onChange={(e) => setInvoiceNumber(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Issue Date *</label>
                <input 
                  type="date" 
                  required 
                  className="form-input" 
                  value={issueDate} 
                  onChange={(e) => setIssueDate(e.target.value)} 
                />
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Currency</label>
              <select 
                className="form-select" 
                style={{ width: '150px' }}
                value={currency} 
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="PKR">PKR (Rs.)</option>
                <option value="GBP">GBP (£)</option>
                <option value="EUR">EUR (€)</option>
                <option value="AED">AED (Dhs)</option>
              </select>
            </div>

            {/* Line Items Table */}
            <div>
              <div className="flex justify-between align-center mb-2" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                <span className="form-label">Service Items</span>
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={handleAddItem}
                >
                  <Plus size={14} /> Add Item
                </button>
              </div>

              {items.map((item, index) => (
                <div key={index} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', marginBottom: '0.75rem' }}>
                  <div className="form-group" style={{ flexGrow: 1, marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Description</label>
                    <input 
                      type="text" 
                      required
                      placeholder="e.g. Website UI Design Development" 
                      className="form-input"
                      value={item.description}
                      onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ width: '80px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Qty</label>
                    <input 
                      type="number" 
                      min="1" 
                      required
                      className="form-input"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                    />
                  </div>
                  <div className="form-group" style={{ width: '120px', marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Rate</label>
                    <input 
                      type="number" 
                      min="0" 
                      step="any"
                      required
                      className="form-input"
                      value={item.rate}
                      onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                    />
                  </div>
                  <div style={{ paddingBottom: '0.5rem', fontWeight: 600, width: '100px', textAlign: 'right', fontSize: '0.9rem' }}>
                    {(item.quantity * item.rate).toLocaleString()} {currency}
                  </div>
                  <button 
                    type="button" 
                    className="btn btn-danger btn-sm"
                    style={{ marginBottom: '0.2rem' }}
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Total display */}
            <div className="flex justify-between align-center" style={{ padding: '1rem', backgroundColor: 'var(--bg-tertiary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontWeight: 600 }}>Total Due</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--primary-magenta)' }}>
                {calculateSubtotal().toLocaleString()} {currency}
              </span>
            </div>

            {/* Payment Details (Manual Bank Transfer Details) */}
            <div className="form-group">
              <label className="form-label">Payment Instructions / Bank Transfer Details</label>
              <textarea 
                className="form-textarea"
                placeholder="e.g. Standard Chartered Bank&#10;Account Name: Freelance Pro&#10;IBAN: PK12SCBL0000000000000000"
                value={paymentDetails}
                onChange={(e) => setPaymentDetails(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Invoice Notes / Terms</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="Payment due on receipt."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-between mt-4">
              <button 
                type="button" 
                onClick={() => setShowCreateForm(false)} 
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Save & Generate Shareable Link
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Saved Invoices List */
        <div className="table-container">
          <div className="table-header-bar">
            <h3>Saved Invoices</h3>
            <span className="badge badge-starter">{userInvoices.length} Invoices</span>
          </div>

          <div className="table-wrapper">
            {userInvoices.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No invoices found. Click "Create Invoice" to bill your first client!
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice No.</th>
                    <th>Client</th>
                    <th>Date</th>
                    <th>Due Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {userInvoices.map(invoice => (
                    <tr key={invoice.id}>
                      <td style={{ fontWeight: 600 }}>{invoice.invoiceNumber}</td>
                      <td>
                        <div className="flex-col">
                          <span>{invoice.clientName}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{invoice.clientEmail}</span>
                        </div>
                      </td>
                      <td>{invoice.issueDate}</td>
                      <td>{invoice.dueDate}</td>
                      <td style={{ fontWeight: 600 }}>
                        {invoice.total.toLocaleString()} {invoice.currency}
                      </td>
                      <td>
                        <select 
                          className="form-select"
                          style={{ padding: '0.15rem 0.5rem', fontSize: '0.8rem', width: '90px' }}
                          value={invoice.status}
                          onChange={(e) => onUpdateInvoiceStatus(invoice.id, e.target.value)}
                        >
                          <option value="Sent">Sent</option>
                          <option value="Paid">Paid</option>
                          <option value="Overdue">Overdue</option>
                        </select>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button 
                            className="btn btn-secondary btn-sm"
                            onClick={() => handleCopyLink(invoice.id)}
                            title="Copy Client Share Link"
                          >
                            {copiedId === invoice.id ? <Check size={14} style={{ color: 'var(--success-color)' }} /> : <Share2 size={14} />}
                            {copiedId === invoice.id ? 'Copied' : 'Share Link'}
                          </button>
                          <a 
                            href={`/i/${invoice.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            title="Preview Invoice"
                          >
                            <Eye size={14} />
                          </a>
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => onDeleteInvoice(invoice.id)}
                            title="Delete Invoice"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Clean, standalone invoice view for the freelancer's clients
export function PublicInvoiceView({ invoiceId, invoices }) {
  const invoice = invoices.find(inv => inv.id === invoiceId);

  if (!invoice) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Invoice Not Found</h2>
        <p>The requested invoice does not exist or has been deleted.</p>
        <a href="/" style={{ color: '#3b82f6', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
          Go back to app home
        </a>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', padding: '1rem 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Printable Control header */}
      <div className="no-print" style={{ width: '100%', maxWidth: '800px', padding: '0.5rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#ffffff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <FileText size={18} style={{ color: '#3b82f6' }} />
          <span style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b' }}>ReachDesk Client Invoice System</span>
        </div>
        <button 
          onClick={handlePrint}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.8rem', background: '#3b82f6', color: '#ffffff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
        >
          <Printer size={14} /> Print / Save PDF
        </button>
      </div>

      {/* Invoice Card */}
      <div className="invoice-print-container">
        {/* Header Block */}
        <div className="invoice-header">
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a' }}>
              Invoice From:
            </h2>
            <p style={{ marginTop: '0.25rem', fontSize: '1rem', fontWeight: 500, color: '#334155' }}>
              {invoice.userEmail}
            </p>
          </div>
          <div className="invoice-title-block">
            <h1>Invoice</h1>
            <p style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>
              Invoice #: {invoice.invoiceNumber}
            </p>
          </div>
        </div>

        {/* Invoice Grid Details */}
        <div className="invoice-details-grid">
          <div className="invoice-bill-to">
            <h3 style={{ fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.5rem' }}>
              Bill To
            </h3>
            <h4 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              {invoice.clientName}
            </h4>
            {invoice.clientEmail && (
              <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.25rem' }}>
                {invoice.clientEmail}
              </p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.9rem', color: '#475569' }}>
              <strong>Date Issued:</strong> {invoice.issueDate}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.25rem' }}>
              <strong>Due Date:</strong> {invoice.dueDate}
            </p>
            <p style={{ fontSize: '0.9rem', color: '#475569', marginTop: '0.25rem' }}>
              <strong>Payment Status:</strong> 
              <span style={{ 
                marginLeft: '0.5rem',
                padding: '0.15rem 0.4rem', 
                fontSize: '0.75rem',
                borderRadius: '4px',
                fontWeight: 700,
                backgroundColor: invoice.status === 'Paid' ? '#d1fae5' : '#fee2e2',
                color: invoice.status === 'Paid' ? '#065f46' : '#991b1b',
                border: `1px solid ${invoice.status === 'Paid' ? '#a7f3d0' : '#fecaca'}`
              }}>
                {invoice.status.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {/* Services Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th style={{ textAlign: 'left' }}>Description</th>
              <th style={{ width: '80px', textAlign: 'center' }}>Qty</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Rate</th>
              <th style={{ width: '120px', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index}>
                <td style={{ textAlign: 'left', fontWeight: 500 }}>{item.description}</td>
                <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                <td style={{ textAlign: 'right' }}>{item.rate.toLocaleString()} {invoice.currency}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{(item.quantity * item.rate).toLocaleString()} {invoice.currency}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals Block */}
        <div className="invoice-totals">
          <div className="invoice-totals-row">
            <span>Subtotal</span>
            <span>{invoice.total.toLocaleString()} {invoice.currency}</span>
          </div>
          <div className="invoice-totals-row" style={{ color: '#64748b' }}>
            <span>Tax (0.0%)</span>
            <span>0.00 {invoice.currency}</span>
          </div>
          <div className="invoice-totals-row grand-total">
            <span>Amount Due</span>
            <span>{invoice.total.toLocaleString()} {invoice.currency}</span>
          </div>
        </div>

        {/* Payment Terms & Instructions */}
        {(invoice.paymentDetails || invoice.notes) && (
          <div className="invoice-terms">
            {invoice.paymentDetails && (
              <div style={{ marginBottom: '1.25rem' }}>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.5rem' }}>
                  Payment Instructions
                </h4>
                <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5, color: '#334155' }}>
                  {invoice.paymentDetails}
                </p>
              </div>
            )}
            
            {invoice.notes && (
              <div>
                <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#475569', marginBottom: '0.25rem' }}>
                  Notes & Terms
                </h4>
                <p style={{ color: '#475569' }}>{invoice.notes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Style overrides for Printing */}
      <style>{`
        @media print {
          body {
            background: #ffffff !important;
            padding: 0 !important;
            color: #000000 !important;
          }
          .no-print {
            display: none !important;
          }
          .invoice-print-container {
            margin: 0 !important;
            box-shadow: none !important;
            padding: 0 !important;
            max-width: 100% !important;
          }
          .invoice-table th {
            background-color: #f1f5f9 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
}
