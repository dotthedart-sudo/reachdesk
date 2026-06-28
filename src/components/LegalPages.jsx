import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function LegalContainer({ title, lastUpdated, children }) {
  return (
    <div className="landing-container" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      {/* Navigation Bar */}
      <nav className="landing-nav" style={{ justifyContent: 'space-between' }}>
        <Link to="/homepage" className="landing-nav-logo" style={{ cursor: 'pointer', textDecoration: 'none' }}>
          <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>RD</div>
          <span className="landing-logo-text">ReachDesk</span>
        </Link>
        <Link to="/homepage" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}>
          <ArrowLeft size={14} /> Back to Home
        </Link>
      </nav>

      {/* Main Content Area */}
      <div style={{ flex: 1, padding: '3rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <div style={{ maxWidth: '800px', width: '100%', textAlign: 'left', lineHeight: '1.7' }}>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--text-primary)', fontFamily: 'var(--font-headers)' }}>{title}</h1>
          <p className="color-muted" style={{ fontSize: '0.9rem', marginBottom: '2rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem' }}>Last updated: {lastUpdated}</p>
          <div style={{ color: 'var(--text-secondary)', fontSize: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {children}
          </div>
        </div>
      </div>

      {/* Simple Footer */}
      <footer className="landing-footer" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem', marginTop: 'auto' }}>
        <p>© 2026 ReachDesk. All rights reserved.</p>
      </footer>
    </div>
  );
}

export function TermsOfService() {
  return (
    <LegalContainer title="Terms of Service" lastUpdated="June 21, 2026">
      <p>
        These Terms of Service ("Terms") govern your access to and use of ReachDesk, a customer relationship management (CRM) tool for freelancers and agency owners, accessible at reachdesk.esemdot.com and related domains (the "Service"). The Service is operated under esemdot, Pakistan. By creating an account or using the Service, you agree to be bound by these Terms.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>1. The Service</h3>
      <p>
        ReachDesk provides tools to help freelancers and agency owners organize leads, contacts, notes, and follow-up information. ReachDesk is a record-keeping and organization tool only — it does not send messages, emails, or communications to your leads or contacts on your behalf.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>2. Accounts</h3>
      <p>
        You must provide accurate information when creating an account and are responsible for maintaining the confidentiality of your login credentials. You are responsible for all activity that occurs under your account. Notify us immediately of any unauthorized use of your account.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>3. Subscription Plans and Free Trial</h3>
      <p>
        ReachDesk is offered on a subscription basis with the following tiers: Starter, Pro, and Teams, billed monthly, with discounted rates available for 6-month and yearly commitments. New accounts receive a 3-day free trial. At the end of the trial period, continued access requires an active paid subscription.
      </p>
      <p>
        Pricing for each plan is displayed within the Service and may be updated from time to time. Continued use of the Service after a price change constitutes acceptance of the new pricing for your next billing cycle.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>4. Payment</h3>
      <p>
        Payments are currently accepted via bank transfer only, to the account details provided within the Service. Upon submitting a payment, you are required to provide proof of payment (a receipt or transaction reference) through the Service. Your subscription will be activated or renewed once payment is verified by our team, which may take up to 24 hours.
      </p>
      <p>
        You are responsible for ensuring payments are made in full and that any required reference information is submitted accurately to avoid delays in account activation.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>5. Account Suspension on Trial or Subscription Expiry</h3>
      <p>
        If your free trial ends or your subscription lapses without renewal, your access to the Service may be locked until payment is made and verified. We will make reasonable efforts to notify you in advance of any such lock, including in-app and email notifications.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>6. Acceptable Use</h3>
      <p>You agree not to:</p>
      <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
        <li>Attempt to gain unauthorized access to any part of the Service or its underlying systems</li>
        <li>Upload malicious code, attempt to disrupt the Service, or interfere with other users' access</li>
        <li>Use the Service to store or process data you do not have the legal right to hold</li>
        <li>Resell, sublicense, or provide access to the Service to third parties without our written consent</li>
      </ul>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>7. Your Data</h3>
      <p>
        You retain ownership of all data, leads, contacts, and notes you input into the Service ("Your Data"). You are solely responsible for the accuracy, legality, and appropriateness of Your Data, including ensuring you have the right to store any personal data of third parties (such as your clients' leads) within the Service.
      </p>
      <p>
        Our handling of Your Data is further described in our Privacy Policy.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>8. Intellectual Property</h3>
      <p>
        The Service, including its design, code, branding, and underlying technology, is owned by esemdot/ReachDesk and is protected by applicable intellectual property laws. These Terms do not grant you any rights to our trademarks, logos, or branding.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>9. Service Availability</h3>
      <p>
        We aim to keep the Service available and reliable but do not guarantee uninterrupted access. The Service may be temporarily unavailable due to maintenance, updates, or circumstances beyond our control. We are not liable for any loss arising from such downtime.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>10. Termination</h3>
      <p>
        You may stop using the Service and request account deletion at any time by contacting us. We reserve the right to suspend or terminate accounts that violate these Terms, engage in fraudulent payment activity, or pose a security risk to the Service or other users.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>11. Limitation of Liability</h3>
      <p>
        To the maximum extent permitted by law, ReachDesk and esemdot shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of, or inability to use, the Service, including loss of data, business, or profits. The Service is provided "as is" without warranties of any kind, express or implied.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>12. Changes to These Terms</h3>
      <p>
        We may update these Terms from time to time. Material changes will be communicated through the Service or via email. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>13. Governing Law</h3>
      <p>
        These Terms are governed by the laws of the Islamic Republic of Pakistan, without regard to conflict of law principles. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts of Pakistan.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>14. Contact</h3>
      <p>
        For questions about these Terms, contact us at <a href="mailto:support.reachdesk@esemdot.com" style={{ color: 'var(--primary-purple)', textDecoration: 'none' }}>support.reachdesk@esemdot.com</a>.
      </p>
    </LegalContainer>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalContainer title="Privacy Policy" lastUpdated="June 21, 2026">
      <p>
        This Privacy Policy explains how ReachDesk ("we", "us"), operated under esemdot, Pakistan, collects, uses, and protects information when you use the ReachDesk Service at reachdesk.esemdot.com and related domains.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>1. Information We Collect</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p><strong>Account information:</strong> When you sign up, we collect your name, email address, business name, and password (stored securely, never in plain text).</p>
        <p><strong>Payment information:</strong> Since payments are made via bank transfer, we collect the payment reference, receipt or proof of payment you submit, and the billing plan you select. We do not collect or store your bank account or card details — these remain with your bank.</p>
        <p><strong>Your CRM data:</strong> We store the leads, contacts, notes, and related information you choose to input into the Service. This data belongs to you and is used solely to provide the Service to you.</p>
        <p><strong>Usage data:</strong> We may collect technical information such as your IP address, browser type, device information, and how you interact with the Service, to help us maintain and improve it.</p>
      </div>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>2. How We Use Your Information</h3>
      <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>To create and manage your account</li>
        <li>To provide, maintain, and improve the Service</li>
        <li>To process and verify your subscription payments</li>
        <li>To send you important notifications, such as upgrade confirmations, password resets, and service updates</li>
        <li>To respond to your support requests</li>
        <li>To detect, prevent, and address technical issues, fraud, or abuse of the Service</li>
      </ul>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>3. How We Share Your Information</h3>
      <p>
        We do not sell your personal information. We may share information with the following third parties solely to operate the Service:
      </p>
      <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li><strong>Supabase</strong> — our database and authentication infrastructure provider, which stores your account and CRM data</li>
        <li><strong>Resend</strong> — our email delivery provider, used to send password resets, notifications, and account-related emails</li>
        <li><strong>Vercel</strong> — our hosting provider, which serves the Service to your browser</li>
      </ul>
      <p>
        These providers process data on our behalf and are bound by their own data protection obligations. We do not share Your Data (leads, contacts, notes) with any other third party, advertiser, or data broker.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>4. Data Retention</h3>
      <p>
        We retain your account and CRM data for as long as your account remains active. If you delete your account, we will delete or anonymize your data within a reasonable period, except where retention is required for legal, accounting, or fraud-prevention purposes.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>5. Data Security</h3>
      <p>
        We take reasonable technical and organizational measures to protect your data, including encrypted storage, access controls, and row-level security on our database. However, no method of transmission or storage is 100% secure, and we cannot guarantee absolute security.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>6. Your Rights</h3>
      <p>
        You may access, update, or request deletion of your personal information at any time by contacting us at <a href="mailto:support.reachdesk@esemdot.com" style={{ color: 'var(--primary-purple)', textDecoration: 'none' }}>support.reachdesk@esemdot.com</a>. You may also export or delete your CRM data directly within the Service where such functionality is available.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>7. Cookies and Tracking</h3>
      <p>
        We may use cookies or similar technologies to keep you logged in and to understand basic usage patterns of the Service. We do not use cookies for third-party advertising.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>8. Children's Privacy</h3>
      <p>
        The Service is not directed at individuals under the age of 18, and we do not knowingly collect personal information from minors.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>9. Changes to This Policy</h3>
      <p>
        We may update this Privacy Policy from time to time. Material changes will be communicated through the Service or via email. Continued use of the Service after changes take effect constitutes acceptance of the revised Policy.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>10. Governing Law</h3>
      <p>
        This Privacy Policy is governed by the laws of the Islamic Republic of Pakistan.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>11. Contact</h3>
      <p>
        For questions about this Privacy Policy or to exercise your data rights, contact us at <a href="mailto:support.reachdesk@esemdot.com" style={{ color: 'var(--primary-purple)', textDecoration: 'none' }}>support.reachdesk@esemdot.com</a>.
      </p>
    </LegalContainer>
  );
}

export function RefundPolicy() {
  return (
    <LegalContainer title="Refund Policy" lastUpdated="June 21, 2026">
      <p>
        This Refund Policy applies to all subscription purchases made through ReachDesk, operated under esemdot, Pakistan.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>1. Free Trial</h3>
      <p>
        Every new account receives a 3-day free trial with full access to the Service. We encourage you to use this period to evaluate whether ReachDesk meets your needs before making a payment. No payment is required to begin the trial.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>2. Payment and Activation</h3>
      <p>
        Subscriptions are paid via bank transfer. Once you submit your payment proof and request an activation tier, our team verifies the payment, typically within 24 hours, and activates or renews your plan accordingly.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>3. Refund Eligibility</h3>
      <p>
        Because a free trial is already provided to evaluate the Service before any payment is made, refunds are limited and depend on the billing cycle you select:
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <p><strong>6-Month and Yearly plans:</strong> If you cancel and request a refund within 3 days of your plan being activated, you are eligible for a full refund. After this 3-day window, the subscription is non-refundable for the remainder of the selected period, regardless of usage — you will retain access to the Service for the full period you paid for.</p>
        <p><strong>Monthly plans:</strong> Monthly subscriptions are non-refundable. Since the commitment period is short, you may simply choose not to renew at the end of your current monthly cycle to stop future charges.</p>
      </div>
      <p>
        In addition to the above, we will also consider a refund in the following circumstances regardless of plan type:
      </p>
      <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>A duplicate or accidental payment was made for the same billing period</li>
        <li>You were charged for a plan or billing cycle different from what you selected, due to an error on our part</li>
      </ul>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>4. Non-Refundable Situations</h3>
      <p>Refunds will not be issued in the following cases:</p>
      <ul style={{ paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <li>Requests made after the 3-day window for 6-Month and Yearly plans</li>
        <li>Any refund request on a Monthly plan</li>
        <li>Change of mind after activation, where the Service was accessible and functioning as described</li>
        <li>Failure to use the Service during an active subscription period</li>
        <li>Account suspension due to violation of our Terms of Service</li>
      </ul>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>5. How to Request a Refund</h3>
      <p>
        To request a refund on an eligible 6-Month or Yearly plan, email <a href="mailto:support.reachdesk@esemdot.com" style={{ color: 'var(--primary-purple)', textDecoration: 'none' }}>support.reachdesk@esemdot.com</a> within 3 days of your plan being activated, including your account email, the payment reference or receipt, and the reason for your request. We will review your request and respond within 5 business days.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>6. Refund Method</h3>
      <p>
        Approved refunds will be returned via bank transfer to the account the original payment was made from, within 7–10 business days of approval.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>7. Cancellations</h3>
      <p>
        You may cancel your subscription at any time by contacting us. Cancellation stops future renewals. For Monthly plans, this simply prevents the next charge. For 6-Month and Yearly plans, cancellation within the 3-day window (Section 3) entitles you to a full refund; cancellation after this window stops future renewals but does not refund the current period already paid for — you will retain access for the remainder of the period.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>8. Changes to This Policy</h3>
      <p>
        We may update this Refund Policy from time to time. Material changes will be communicated through the Service or via email.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>9. Governing Law</h3>
      <p>
        This Refund Policy is governed by the laws of the Islamic Republic of Pakistan.
      </p>

      <h3 style={{ color: 'var(--text-primary)', marginTop: '1rem', fontFamily: 'var(--font-headers)' }}>10. Contact</h3>
      <p>
        For refund requests or questions about this policy, contact us at <a href="mailto:support.reachdesk@esemdot.com" style={{ color: 'var(--primary-purple)', textDecoration: 'none' }}>support.reachdesk@esemdot.com</a>.
      </p>
    </LegalContainer>
  );
}
