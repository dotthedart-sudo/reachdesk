import React from 'react';
import { AlertCircle, Check, Save, Plus, Trash2 } from 'lucide-react';
import { DIALER_OPTIONS } from '../../lib/callDialer';
import {
  DEFAULT_CALL_OUTCOME_RULES,
  DEFAULT_CALL_STATUS_RULES,
} from '../../lib/callOutcomeRules';
import {
  DEFAULT_MESSAGING_ACTION_RULES,
  MESSAGING_STATUS_OPTIONS,
} from '../../lib/automationRules';
import { CALL_OUTCOMES } from '../../lib/outreachQueue';

export default function AutomationsPanel({
  remindersEnabled,
  setRemindersEnabled,
  reminderNotificationMode,
  setReminderNotificationMode,
  reminderDigestHour,
  setReminderDigestHour,
  suggestionsEnabled,
  setSuggestionsEnabled,
  suggestionsAutoApply,
  setSuggestionsAutoApply,
  callSuggestionsAutoApply,
  setCallSuggestionsAutoApply,
  messagingActionRules,
  setMessagingActionRules,
  alwaysDraft,
  setAlwaysDraft,
  defaultCountryCode,
  setDefaultCountryCode,
  callOutcomeRules,
  setCallOutcomeRules,
  callStatusRules,
  setCallStatusRules,
  defaultDialer,
  setDefaultDialer,
  ghlDialerUrl,
  setGhlDialerUrl,
  customDialerUrl,
  setCustomDialerUrl,
  automationError,
  automationSuccess,
  automationSaving,
  onSubmit,
}) {
  return (
    <form onSubmit={onSubmit} className="flex-col gap-4">
      <div className="card rd-page-form">
        <div className="rd-page-form-header">
          <h3>Automations</h3>
          <p className="rd-modal-sub">Reminders, suggestions, call rules, and dialer defaults.</p>
        </div>

        {automationError && (
          <div className="auth-error-banner" role="alert">
            <AlertCircle size={16} />
            <span>{automationError}</span>
          </div>
        )}

        {automationSuccess && (
          <div className="auth-success-banner" role="status">
            <Check size={15} />
            <span>{automationSuccess}</span>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Follow-up Reminders</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Pause all follow-up reminders and push digests for this account.
              </span>
            </div>
            <input
              type="checkbox"
              checked={remindersEnabled}
              onChange={(e) => setRemindersEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              disabled={automationSaving}
            />
          </div>

          {remindersEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingLeft: '0.25rem', borderLeft: '2px solid var(--border)' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.35rem' }}>
                  Push notification mode
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                  Default is one daily digest. Instant mode pushes once per due lead.
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="reminder_notification_mode"
                      checked={reminderNotificationMode === 'digest'}
                      onChange={() => setReminderNotificationMode('digest')}
                      disabled={automationSaving}
                    />
                    Daily digest (recommended)
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="reminder_notification_mode"
                      checked={reminderNotificationMode === 'instant'}
                      onChange={() => setReminderNotificationMode('instant')}
                      disabled={automationSaving}
                    />
                    Instant per follow-up
                  </label>
                </div>
              </div>

              {reminderNotificationMode === 'digest' && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Digest time</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Local hour for the daily “follow-ups due” push.
                    </span>
                  </div>
                  <select
                    value={reminderDigestHour}
                    onChange={(e) => setReminderDigestHour(Number(e.target.value))}
                    disabled={automationSaving}
                    style={{
                      padding: '4px 8px',
                      background: 'var(--bg-page)',
                      border: '1px solid var(--border)',
                      borderRadius: '3px',
                      color: 'var(--text-primary)',
                      fontSize: '0.85rem',
                    }}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {h === 0 ? '12:00 AM' : h < 12 ? `${h}:00 AM` : h === 12 ? '12:00 PM' : `${h - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
              Messaging automations
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
              When messaging status changes, suggest or auto-fill the next step column.
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Action Suggestions</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Enable status-based action suggestions and warning bulbs.</span>
            </div>
            <input
              type="checkbox"
              checked={suggestionsEnabled}
              onChange={(e) => setSuggestionsEnabled(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              disabled={automationSaving}
            />
          </div>

          {suggestionsEnabled && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Auto-apply next step</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Automatically sync messaging next step when status changes.</span>
              </div>
              <input
                type="checkbox"
                checked={suggestionsAutoApply}
                onChange={(e) => setSuggestionsAutoApply(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                disabled={automationSaving}
              />
            </div>
          )}

          {suggestionsEnabled && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>
                Messaging: status → next step
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
                When a lead&apos;s messaging status changes, suggest or auto-fill the next step column.
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {messagingActionRules.map((rule, idx) => (
                  <div
                    key={`${rule.status}-${idx}`}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem' }}
                  >
                    <select
                      className="form-input"
                      value={rule.status || ''}
                      onChange={(e) => {
                        const next = [...messagingActionRules];
                        next[idx] = { ...next[idx], status: e.target.value };
                        setMessagingActionRules(next);
                      }}
                      disabled={automationSaving}
                    >
                      <option value="">Select status</option>
                      {MESSAGING_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Suggested next step"
                      value={rule.suggested_action || ''}
                      onChange={(e) => {
                        const next = [...messagingActionRules];
                        next[idx] = { ...next[idx], suggested_action: e.target.value };
                        setMessagingActionRules(next);
                      }}
                      disabled={automationSaving}
                    />
                    <button
                      type="button"
                      className="btn-icon"
                      title="Remove rule"
                      disabled={automationSaving}
                      onClick={() => setMessagingActionRules(messagingActionRules.filter((_, i) => i !== idx))}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
                disabled={automationSaving}
                onClick={() => setMessagingActionRules([...messagingActionRules, { status: '', suggested_action: '' }])}
              >
                <Plus size={14} /> Add messaging rule
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ marginTop: '0.5rem' }}
                disabled={automationSaving}
                onClick={() => setMessagingActionRules(DEFAULT_MESSAGING_ACTION_RULES.map((r) => ({ ...r })))}
              >
                Reset messaging rules
              </button>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.95rem', display: 'block', marginBottom: '0.35rem' }}>
              Call automations
            </span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
              Map call outcomes and call status to the suggested call next step.
            </span>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Auto-apply call next step</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  When call status or outcome changes, sync call next step from rules below.
                </span>
              </div>
              <input
                type="checkbox"
                checked={callSuggestionsAutoApply}
                onChange={(e) => setCallSuggestionsAutoApply(e.target.checked)}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                disabled={automationSaving}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Always draft before sending</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Customize template preview and destinations before initiating messages.</span>
            </div>
            <input
              type="checkbox"
              checked={alwaysDraft}
              onChange={(e) => setAlwaysDraft(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              disabled={automationSaving}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block' }}>Default Country Code</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Default prefix (e.g. +92) used to normalize local phone numbers for WhatsApp/SMS.</span>
            </div>
            <input
              type="text"
              value={defaultCountryCode}
              onChange={(e) => setDefaultCountryCode(e.target.value)}
              placeholder="+92"
              style={{ width: '80px', padding: '4px 8px', background: 'var(--bg-page)', border: '1px solid var(--border)', borderRadius: '3px', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'center' }}
              disabled={automationSaving}
            />
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Call outcome rules</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
              When you log a call, Reachdesk can auto-update call status and call next step. Customize mappings below.
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {callOutcomeRules.map((rule, idx) => (
                <div key={rule.outcome} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem' }}>
                  <select
                    className="form-input"
                    value={rule.outcome}
                    onChange={(e) => {
                      const next = [...callOutcomeRules];
                      next[idx] = { ...next[idx], outcome: e.target.value };
                      setCallOutcomeRules(next);
                    }}
                    disabled={automationSaving}
                  >
                    {CALL_OUTCOMES.map((o) => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Call status (optional)"
                    value={rule.suggested_call_status || rule.suggested_status || ''}
                    onChange={(e) => {
                      const next = [...callOutcomeRules];
                      next[idx] = {
                        ...next[idx],
                        suggested_call_status: e.target.value || null,
                        suggested_status: undefined,
                      };
                      setCallOutcomeRules(next);
                    }}
                    disabled={automationSaving}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Call next step"
                    value={rule.suggested_call_action || ''}
                    onChange={(e) => {
                      const next = [...callOutcomeRules];
                      next[idx] = { ...next[idx], suggested_call_action: e.target.value || null };
                      setCallOutcomeRules(next);
                    }}
                    disabled={automationSaving}
                  />
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.5rem' }}
              disabled={automationSaving}
              onClick={() => setCallOutcomeRules([...DEFAULT_CALL_OUTCOME_RULES])}
            >
              Reset outcome rules to defaults
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.25rem' }}>Call status → call next step</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.75rem' }}>
              Suggested call action shown as a lightbulb in Call Queue when call status changes.
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {callStatusRules.map((rule, idx) => (
                <div key={`${rule.status}-${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', alignItems: 'center', fontSize: '0.82rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Call status"
                    value={rule.status}
                    onChange={(e) => {
                      const next = [...callStatusRules];
                      next[idx] = { ...next[idx], status: e.target.value };
                      setCallStatusRules(next);
                    }}
                    disabled={automationSaving}
                  />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Suggested call next step"
                    value={rule.suggested_call_action || ''}
                    onChange={(e) => {
                      const next = [...callStatusRules];
                      next[idx] = { ...next[idx], suggested_call_action: e.target.value };
                      setCallStatusRules(next);
                    }}
                    disabled={automationSaving}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    title="Remove rule"
                    disabled={automationSaving}
                    onClick={() => setCallStatusRules(callStatusRules.filter((_, i) => i !== idx))}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.5rem', marginRight: '0.5rem' }}
              disabled={automationSaving}
              onClick={() => setCallStatusRules([...callStatusRules, { status: '', suggested_call_action: '' }])}
            >
              <Plus size={14} /> Add status rule
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ marginTop: '0.5rem' }}
              disabled={automationSaving}
              onClick={() => setCallStatusRules([...DEFAULT_CALL_STATUS_RULES])}
            >
              Reset to defaults
            </button>
          </div>

          <div style={{ borderTop: '1px solid var(--border)', margin: '0.75rem 0', paddingTop: '0.75rem' }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', display: 'block', marginBottom: '0.35rem' }}>Default dialer (Cold Calls)</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
              Used by the Call button in Cold Calls mode. Other options stay in the dropdown menu.
            </span>
            <select
              className="form-select"
              value={defaultDialer}
              onChange={(e) => setDefaultDialer(e.target.value)}
              disabled={automationSaving}
              style={{ maxWidth: 280, marginBottom: '0.5rem' }}
            >
              {DIALER_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
            {defaultDialer === 'ghl' && (
              <input
                type="url"
                className="form-input"
                value={ghlDialerUrl}
                onChange={(e) => setGhlDialerUrl(e.target.value)}
                placeholder="https://app.gohighlevel.com/...?phone={phone}"
                disabled={automationSaving}
                style={{ fontSize: '0.85rem' }}
              />
            )}
            {defaultDialer === 'custom' && (
              <input
                type="url"
                className="form-input"
                value={customDialerUrl}
                onChange={(e) => setCustomDialerUrl(e.target.value)}
                placeholder="https://your-dialer.com/call?n={phone}"
                disabled={automationSaving}
                style={{ fontSize: '0.85rem' }}
              />
            )}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          <button type="submit" className="btn btn-primary" disabled={automationSaving}>
            <Save size={16} /> {automationSaving ? 'Saving...' : 'Save automations'}
          </button>
        </div>
      </div>
    </form>
  );
}
