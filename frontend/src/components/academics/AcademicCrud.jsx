// Shared reusable CRUD page factory for simple list/create/edit pages
// Used by Departments, Programs, Semesters
import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';

export function CrudTable({ title, subtitle, columns, rows, onCreate, onEdit, onDelete, loading, filters, disableAddReason, banner, userRole, emptyMessage = 'No records yet.', bulkSelection = null }) {
  const isFaculty = userRole === 'faculty';
  const bulkEnabled = Boolean(!isFaculty && bulkSelection);
  const showActions = Boolean(!isFaculty && (onEdit || onDelete));
  const selectedIds = bulkSelection?.selectedIds || [];
  const allVisibleSelected = rows.length > 0 && rows.every((row) => selectedIds.includes(row.id));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        {/* Top Header: Title & Add New Button */}
        <div className="flex justify-between items-start w-full">
          <div>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">{title}</h2>
            {subtitle && <p className="text-muted mt-1">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {bulkEnabled && (
              <button
                onClick={bulkSelection.onBulkDelete}
                disabled={selectedIds.length === 0}
                className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${selectedIds.length === 0 ? 'bg-[#EF4444]/10 text-[#EF4444]/50 cursor-not-allowed border border-[#EF4444]/10' : 'bg-[#EF4444] hover:bg-[#DC2626] text-white'}`}
              >
                <Trash2 className="w-4 h-4" /> Delete Selected
              </button>
            )}
            {onCreate && !isFaculty && (
              <button 
                onClick={() => { if (!disableAddReason) { onCreate(); } }} 
                disabled={!!disableAddReason}
                title={disableAddReason || 'Add New'}
                style={{ 
                  backgroundColor: disableAddReason ? 'transparent' : 'var(--primary)',
                  color: disableAddReason ? 'var(--text-muted)' : '#0F172A'
                }}
                className={`px-5 py-2.5 rounded-xl font-semibold flex items-center gap-2 whitespace-nowrap transition-all ${disableAddReason ? 'border border-border cursor-not-allowed opacity-60' : 'hover:brightness-90 shadow-sm'}`}
              >
                <Plus className="w-5 h-5" /> Add New
              </button>
            )}
          </div>
        </div>
        
        {banner}

        {/* Filters Section */}
        {filters && (
          <div className="flex flex-wrap items-center gap-3">
            {filters}
          </div>
        )}
      </div>
      <div className="bg-surface/60 backdrop-blur-xl border border-border rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-surface-hover/30 text-foreground text-xs uppercase tracking-wider font-bold">
              {bulkEnabled && (
                <th className="px-5 py-4 w-12">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={() => bulkSelection.onToggleAll(rows)}
                    className="w-4 h-4 rounded border border-border bg-transparent"
                  />
                </th>
              )}
              <th className="px-5 py-4 w-16">Sl. No.</th>
              {columns.map(c => <th key={c.key} className="px-5 py-4">{c.label}</th>)}
              {showActions && <th className="px-5 py-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading
              ? <tr><td colSpan={columns.length + 1 + (showActions ? 1 : 0) + (bulkEnabled ? 1 : 0)} className="text-center py-10 text-muted">Loading...</td></tr>
              : rows.length === 0
                ? <tr><td colSpan={columns.length + 1 + (showActions ? 1 : 0) + (bulkEnabled ? 1 : 0)} className="text-center py-10 text-muted">{emptyMessage}</td></tr>
                : rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-surface-hover transition-colors">
                    {bulkEnabled && (
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(row.id)}
                          onChange={() => bulkSelection.onToggleRow(row.id)}
                          className="w-4 h-4 rounded border border-border bg-transparent"
                        />
                      </td>
                    )}
                    <td className="px-5 py-3.5 text-muted text-sm font-semibold">{idx + 1}</td>
                    {columns.map(c => (
                      <td key={c.key} className="px-5 py-3.5 text-sm text-foreground">
                        {c.render ? c.render(row) : (row[c.key] ?? '—')}
                      </td>
                    ))}
                    {showActions && (
                      <td className="px-5 py-3.5 text-right flex justify-end gap-2">
                        {onEdit ? <button onClick={() => onEdit(row)} className="text-muted hover:text-[var(--primary)] p-1.5 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button> : null}
                        {onDelete ? <button onClick={() => onDelete(row.id)} className="text-muted hover:text-[#EF4444] p-1.5 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button> : null}
                      </td>
                    )}
                  </tr>
                ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function FormModal({ isOpen, onClose, title, children, onSubmit, saving }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background border border-border rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-border bg-surface flex justify-between items-center flex-shrink-0 rounded-t-3xl">
          <h3 className="text-xl font-bold text-foreground">{title}</h3>
          <button onClick={onClose} className="text-muted hover:text-foreground text-xl transition-colors">✕</button>
        </div>
        <form id="modalForm" onSubmit={onSubmit} className="p-6 overflow-y-auto space-y-4">{children}</form>
        <div className="p-4 border-t border-border bg-surface flex justify-end gap-3 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-5 py-2.5 text-muted hover:text-foreground transition-colors font-medium">Cancel</button>
          <button 
            type="submit" 
            form="modalForm" 
            disabled={saving} 
            style={{ backgroundColor: 'var(--primary)', color: '#0F172A' }}
            className="px-6 py-2.5 rounded-xl font-bold hover:brightness-90 transition-all shadow-sm"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-muted uppercase tracking-wider">{label}</label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

export const inputCls = "w-full bg-background border border-border px-4 py-2.5 rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all";
export const selectCls = inputCls;

export function StatusBadge({ active }) {
  return active
    ? <span className="flex items-center gap-1 text-[#10B981] text-xs font-bold"><CheckCircle className="w-3.5 h-3.5" /> Active</span>
    : <span className="flex items-center gap-1 text-muted text-xs font-bold"><XCircle className="w-3.5 h-3.5" /> Inactive</span>;
}
