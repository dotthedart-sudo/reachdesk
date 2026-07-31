import React from 'react';
import { Sparkles, Plus, Edit3, Trash2 } from 'lucide-react';

export default function SnippetsPanel({
  userSnippets,
  newKey,
  setNewKey,
  newValue,
  setNewValue,
  snippetError,
  snippetSuccess,
  editingSnippetId,
  editingKey,
  setEditingKey,
  editingValue,
  setEditingValue,
  editError,
  onCreateSnippet,
  onStartEdit,
  onSaveEdit,
  onDeleteSnippetClick,
  setEditingSnippetId,
}) {
  return (
    <div className="card flex-col gap-3">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', marginBottom: '0.5rem' }}>
        <Sparkles size={18} style={{ color: 'var(--accent-blue)' }} />
        <h3 style={{ fontSize: '1.1rem', margin: 0 }}>My Snippets</h3>
      </div>

      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.5, margin: 0 }}>
        Create user-defined snippets with static values (e.g. <code>[calendly_link]</code> or <code>[signature]</code>) to quickly personalize your templates.
      </p>

      <form onSubmit={onCreateSnippet} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flexWrap: 'wrap', marginTop: '0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '150px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Snippet Key</label>
          <input
            type="text"
            className="form-input"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="e.g. calendly_link"
            required
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '250px' }}>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Snippet Value</label>
          <input
            type="text"
            className="form-input"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            placeholder="e.g. https://calendly.com/username"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary" style={{ marginTop: '1.3rem', height: '38px', padding: '0 1rem' }}>
          <Plus size={16} /> Add Snippet
        </button>
      </form>

      {snippetError && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', background: 'rgba(224, 82, 82, 0.1)', border: '1px solid rgba(224, 82, 82, 0.2)', color: 'var(--status-hot)', fontSize: '0.8rem' }}>
          {snippetError}
        </div>
      )}

      {snippetSuccess && (
        <div style={{ padding: '0.5rem 0.75rem', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', fontSize: '0.8rem' }}>
          {snippetSuccess}
        </div>
      )}

      <div style={{ marginTop: '0.5rem', border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Key</th>
              <th style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-muted)', fontWeight: 600 }}>Value</th>
              <th style={{ padding: '8px 12px', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 600, width: '120px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {userSnippets.length === 0 ? (
              <tr>
                <td colSpan={3} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  No snippets created yet.
                </td>
              </tr>
            ) : (
              userSnippets.map((snip) => {
                const isEditing = editingSnippetId === snip.id;
                return (
                  <tr key={snip.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      {isEditing ? (
                        <input
                          type="text"
                          className="form-input"
                          value={editingKey}
                          onChange={(e) => setEditingKey(e.target.value)}
                          style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px' }}
                        />
                      ) : (
                        <code style={{ fontSize: '0.85rem', color: 'var(--accent-blue)' }}>[{snip.snippet_key}]</code>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', verticalAlign: 'middle' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          <input
                            type="text"
                            className="form-input"
                            value={editingValue}
                            onChange={(e) => setEditingValue(e.target.value)}
                            style={{ padding: '4px 8px', fontSize: '0.8rem', height: '28px' }}
                          />
                          {editError && (
                            <span style={{ color: 'var(--danger-color)', fontSize: '0.7rem' }}>{editError}</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-secondary)' }}>{snip.snippet_value}</span>
                      )}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingSnippetId(null)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '2px 8px', minHeight: 'auto', fontSize: '0.75rem', height: '26px' }}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => onSaveEdit(snip.id)}
                              className="btn btn-primary btn-sm"
                              style={{ padding: '2px 8px', minHeight: 'auto', fontSize: '0.75rem', height: '26px' }}
                            >
                              Save
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onStartEdit(snip)}
                              className="btn btn-secondary btn-sm"
                              style={{ padding: '4px', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Edit snippet"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSnippetClick(snip.id)}
                              className="btn btn-danger btn-sm"
                              style={{ padding: '4px', minHeight: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              title="Delete snippet"
                            >
                              <Trash2 size={13} />
                            </button>
                          </>
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
    </div>
  );
}
