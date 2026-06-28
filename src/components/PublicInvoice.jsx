import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LoadingSpinner from './LoadingSpinner';
import { PublicInvoiceView } from './InvoiceGenerator';

export default function PublicInvoice() {
  const { token } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getInvoice() {
      try {
        const { data, error } = await supabase
          .from('invoices')
          .select('*')
          .eq('id', token)
          .maybeSingle();

        if (error) throw error;
        setInvoice(data);
      } catch (err) {
        console.error('Error fetching public invoice:', err);
      } finally {
        setLoading(false);
      }
    }
    getInvoice();
  }, [token]);

  if (loading) return <LoadingSpinner />;

  if (!invoice) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
        <h2>Invoice Not Found</h2>
        <p>The requested invoice does not exist or has been deleted.</p>
        <Link to="/" style={{ color: '#3b82f6', textDecoration: 'underline', marginTop: '1rem', display: 'inline-block' }}>
          Go back to app home
        </Link>
      </div>
    );
  }

  return <PublicInvoiceView invoiceId={token} invoices={[invoice]} />;
}
