'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '@/app/components/Header';
import { Modal, ModalContent, ModalDescription, ModalFooter, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Audit, AuditChecklistItem, createAudit, fetchAudits, isAuthenticationError } from '@/lib/api';

type AuditStatusUnion = 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED';

const buildCreateFormState = () => {
    const today = new Date().toISOString().split('T')[0];
    return {
        name: '',
        standard: 'ISO 27001',
        type: 'Internal',
        scope: '',
        owner: '',
        startDate: today,
        endDate: today,
    };
};

export default function AuditsPage() {
    const [audits, setAudits] = useState<Audit[]>([]);
    const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');
    const [selection, setSelection] = useState<{ auditId: string | null; checklistId: string | null }>({ auditId: null, checklistId: null });
    const [detailsTab, setDetailsTab] = useState<'overview' | 'checklist' | 'findings' | 'actions'>('checklist');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createForm, setCreateForm] = useState(() => buildCreateFormState());

    const loadAudits = useCallback(async () => {
        setLoading(true);
        try {
            const data = await fetchAudits();
            setAudits(data);
            setError(null);
        } catch (err) {
            if (!isAuthenticationError(err)) {
                console.error(err);
                setError('Kunne ikke hente audits. Prøv igjen senere.');
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadAudits();
    }, [loadAudits]);

    useEffect(() => {
        if (!audits.length) {
            setSelection({ auditId: null, checklistId: null });
            return;
        }

        setSelection((prev) => {
            const fallbackAudit = audits[0];
            const nextAudit = prev.auditId
                ? audits.find((audit) => audit.id === prev.auditId) ?? fallbackAudit
                : fallbackAudit;
            const fallbackChecklist = nextAudit.checklist[0]?.id ?? null;
            const nextChecklist = prev.checklistId
                ? nextAudit.checklist.find((item) => item.id === prev.checklistId)?.id ?? fallbackChecklist
                : fallbackChecklist;

            if (nextAudit.id === prev.auditId && nextChecklist === prev.checklistId) {
                return prev;
            }

            return {
                auditId: nextAudit.id,
                checklistId: nextChecklist,
            };
        });
    }, [audits]);

    const selectedAudit = useMemo(
        () => (selection.auditId ? audits.find((audit) => audit.id === selection.auditId) ?? null : audits[0] ?? null),
        [audits, selection.auditId],
    );

    const selectedChecklistItem = useMemo<AuditChecklistItem | null>(() => {
        if (!selectedAudit) return null;
        if (!selection.checklistId) return selectedAudit.checklist[0] ?? null;
        return selectedAudit.checklist.find((item) => item.id === selection.checklistId) ?? selectedAudit.checklist[0] ?? null;
    }, [selectedAudit, selection.checklistId]);

    const stats = useMemo(() => summarizeAudits(audits), [audits]);
    const calendarBuckets = useMemo(() => groupAuditsByMonth(audits), [audits]);

    function handleSelectAudit(auditId: string) {
        const audit = audits.find((entry) => entry.id === auditId);
        setSelection({
            auditId,
            checklistId: audit?.checklist[0]?.id ?? null,
        });
    }

    function handleSelectChecklistItem(itemId: string) {
        setSelection((prev) => ({ ...prev, checklistId: itemId }));
    }

    async function handleCreateAudit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setCreating(true);
        try {
            const payload = {
                name: createForm.name,
                standard: createForm.standard,
                type: createForm.type,
                scope: createForm.scope || undefined,
                owner: createForm.owner || undefined,
                startDate: new Date(`${createForm.startDate}T00:00:00Z`).toISOString(),
                endDate: new Date(`${createForm.endDate}T00:00:00Z`).toISOString(),
            };
            const created = await createAudit(payload);
            setAudits((prev) => [created, ...prev]);
            setSelection({
                auditId: created.id,
                checklistId: created.checklist[0]?.id ?? null,
            });
            setShowCreateModal(false);
            setCreateForm(buildCreateFormState());
            setError(null);
        } catch (err) {
            if (!isAuthenticationError(err)) {
                console.error(err);
                setError('Kunne ikke opprette audit. Prøv igjen.');
            }
        } finally {
            setCreating(false);
        }
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
            <div className="flex-1 flex flex-col min-w-0">
                <Header
                    title="Audits & fieldwork"
                    subtitle="Plan, execute, and close ISO audits with findings, actions, and checklists."
                    actions={(
                        <button
                            type="button"
                            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create audit
                        </button>
                    )}
                />
                <main className="flex-1 overflow-y-auto p-8">
                    <div className="max-w-7xl mx-auto space-y-8">
                        {error && (
                            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                                {error}
                            </div>
                        )}

                        {loading ? (
                            <div className="rounded-xl border border-gray-200 bg-white px-6 py-10 text-center text-sm text-gray-500">
                                Loading audits...
                            </div>
                        ) : (
                            <>
                                <AuditStats stats={stats} />
                                <AuditPlanner
                                    viewMode={viewMode}
                                    setViewMode={setViewMode}
                                    calendarBuckets={calendarBuckets}
                                    audits={audits}
                                    selectedAuditId={selectedAudit?.id}
                                    onSelectAudit={handleSelectAudit}
                                />
                                <AuditDetails
                                    audit={selectedAudit}
                                    tab={detailsTab}
                                    onChangeTab={setDetailsTab}
                                    checklistItem={selectedChecklistItem}
                                    onSelectChecklistItem={handleSelectChecklistItem}
                                />
                            </>
                        )}
                    </div>
                </main>
            </div>
            <Modal open={showCreateModal} onOpenChange={setShowCreateModal}>
                <ModalContent className="sm:max-w-xl">
                    <ModalHeader>
                        <ModalTitle>Create audit</ModalTitle>
                        <ModalDescription>Outline scope, dates, and audit owner.</ModalDescription>
                    </ModalHeader>
                    <form className="space-y-4" onSubmit={handleCreateAudit}>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                            <input
                                value={createForm.name}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))}
                                type="text"
                                required
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="ISO 27001 Internal Q2"
                            />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Standard</label>
                                <select
                                    value={createForm.standard}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, standard: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="ISO 27001">ISO 27001</option>
                                    <option value="ISO 9001">ISO 9001</option>
                                    <option value="ISO 14001">ISO 14001</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                <select
                                    value={createForm.type}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))}
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                >
                                    <option value="Internal">Internal</option>
                                    <option value="External">External</option>
                                    <option value="Supplier">Supplier</option>
                                </select>
                            </div>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                                <input
                                    type="date"
                                    value={createForm.startDate}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, startDate: event.target.value }))}
                                    required
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                                <input
                                    type="date"
                                    value={createForm.endDate}
                                    onChange={(event) => setCreateForm((prev) => ({ ...prev, endDate: event.target.value }))}
                                    required
                                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                            <input
                                type="text"
                                value={createForm.owner}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, owner: event.target.value }))}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Audit lead"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                            <textarea
                                value={createForm.scope}
                                onChange={(event) => setCreateForm((prev) => ({ ...prev, scope: event.target.value }))}
                                rows={3}
                                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-blue-500 focus:ring-blue-500"
                                placeholder="Sites, clauses or processes in focus"
                            />
                        </div>
                        <ModalFooter>
                            <button
                                type="button"
                                onClick={() => setShowCreateModal(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={creating || !createForm.name}
                                className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium disabled:opacity-40"
                            >
                                {creating ? 'Saving…' : 'Save draft'}
                            </button>
                        </ModalFooter>
                    </form>
                </ModalContent>
            </Modal>
        </div>
    );
}

function AuditStats({ stats }: { stats: ReturnType<typeof summarizeAudits> }) {
    const cards = [
        { id: 'upcoming', label: 'Upcoming audits', value: stats.upcoming.toString(), helper: `${stats.thisQuarter} this quarter` },
        { id: 'inProgress', label: 'Audits in progress', value: stats.inProgress.toString(), helper: `${stats.activeFindings} open findings` },
        { id: 'findings', label: 'Open findings', value: stats.openFindings.toString(), helper: `${stats.overdueFindings} overdue` },
        { id: 'actions', label: 'Actions', value: stats.actions.toString(), helper: `${stats.awaitingVerification} awaiting verification` },
    ];

    return (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
                <div key={card.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                    <div className="mt-2 text-2xl font-semibold text-gray-900">{card.value}</div>
                    <p className="text-xs text-gray-500 mt-1">{card.helper}</p>
                </div>
            ))}
        </div>
    );
}

function AuditPlanner({
    viewMode,
    setViewMode,
    calendarBuckets,
    audits,
    selectedAuditId,
    onSelectAudit,
}: {
    viewMode: 'calendar' | 'list';
    setViewMode: (mode: 'calendar' | 'list') => void;
    calendarBuckets: { month: string; audits: Audit[] }[];
    audits: Audit[];
    selectedAuditId?: string | null;
    onSelectAudit: (id: string) => void;
}) {
    return (
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-semibold text-gray-900">Audit schedule</h2>
                    <p className="text-sm text-gray-500">Switch between calendar and list to plan resources.</p>
                </div>
                <div className="inline-flex rounded-full border border-gray-200 p-1 text-xs font-medium">
                    <button
                        type="button"
                        onClick={() => setViewMode('calendar')}
                        className={`px-3 py-1.5 rounded-full ${viewMode === 'calendar' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                    >
                        Calendar
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1.5 rounded-full ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                    >
                        List
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="grid gap-4 lg:grid-cols-3">
                    {calendarBuckets.map((bucket) => (
                        <div key={bucket.month} className="border border-gray-100 rounded-2xl p-4">
                            <p className="text-xs uppercase text-gray-500 font-semibold">{bucket.month}</p>
                            <div className="mt-3 space-y-3">
                                {bucket.audits.length === 0 ? (
                                    <p className="text-xs text-gray-400">No audits scheduled</p>
                                ) : (
                                    bucket.audits.map((audit) => (
                                        <button
                                            key={audit.id}
                                            onClick={() => onSelectAudit(audit.id)}
                                            className={`w-full text-left rounded-xl border px-3 py-2 text-sm ${audit.id === selectedAuditId ? 'border-blue-300 bg-blue-50 text-blue-800' : 'border-gray-200 hover:border-gray-300'}`}
                                        >
                                            <p className="font-semibold">{audit.name}</p>
                                            <p className="text-xs text-gray-500">{formatRange(audit.startDate, audit.endDate)}</p>
                                            <p className="text-xs text-gray-500">{audit.type} • {audit.owner ?? 'Unassigned'}</p>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="overflow-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="text-left px-4 py-3">Audit</th>
                                <th className="text-left px-4 py-3">Standard</th>
                                <th className="text-left px-4 py-3">Owner</th>
                                <th className="text-left px-4 py-3">Dates</th>
                                <th className="text-left px-4 py-3">Status</th>
                                <th className="px-4 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {audits.map((audit) => (
                                <tr key={audit.id} className={`border-t border-gray-100 ${audit.id === selectedAuditId ? 'bg-blue-50/40' : 'bg-white hover:bg-gray-50'}`}>
                                    <td className="px-4 py-3">
                                        <p className="font-medium text-gray-900">{audit.name}</p>
                                        <p className="text-xs text-gray-500">{audit.type}</p>
                                    </td>
                                    <td className="px-4 py-3 text-gray-700">{audit.standard}</td>
                                    <td className="px-4 py-3 text-gray-700">{audit.owner ?? 'Unassigned'}</td>
                                    <td className="px-4 py-3 text-gray-600">{formatRange(audit.startDate, audit.endDate)}</td>
                                    <td className="px-4 py-3">
                                        <StatusPill status={audit.status as AuditStatusUnion} />
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => onSelectAudit(audit.id)}
                                            className="text-blue-600 text-sm font-medium hover:text-blue-700"
                                        >
                                            Open
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {audits.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-sm text-gray-500">
                                        No audits planned yet.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

function AuditDetails({
    audit,
    tab,
    onChangeTab,
    checklistItem,
    onSelectChecklistItem,
}: {
    audit: Audit | null;
    tab: 'overview' | 'checklist' | 'findings' | 'actions';
    onChangeTab: (tab: 'overview' | 'checklist' | 'findings' | 'actions') => void;
    checklistItem: AuditChecklistItem | null;
    onSelectChecklistItem: (id: string) => void;
}) {
    if (!audit) {
        return (
            <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 text-center text-sm text-gray-500">
                Select an audit to see its checklist, findings, and actions.
            </section>
        );
    }

    const tabs: { key: typeof tab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'checklist', label: 'Checklist' },
        { key: 'findings', label: 'Findings' },
        { key: 'actions', label: 'Actions' },
    ];

    return (
        <section className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                    <p className="text-xs uppercase text-gray-500 font-semibold">Selected audit</p>
                    <h2 className="text-xl font-semibold text-gray-900">{audit.name}</h2>
                    <p className="text-sm text-gray-500">
                        {audit.standard} • {audit.type} • {formatRange(audit.startDate, audit.endDate)}
                    </p>
                    <p className="text-sm text-gray-500">Owner {audit.owner ?? 'Unassigned'}</p>
                </div>
                <StatusPill status={audit.status as AuditStatusUnion} />
            </div>

            <div className="flex flex-wrap gap-2">
                {tabs.map((entry) => (
                    <button
                        key={entry.key}
                        onClick={() => onChangeTab(entry.key)}
                        className={`px-4 py-2 rounded-full text-xs font-semibold border ${tab === entry.key ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}
                    >
                        {entry.label}
                    </button>
                ))}
            </div>

            {tab === 'overview' && (
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl border border-gray-100 p-4">
                        <p className="text-xs uppercase text-gray-500 font-semibold">Scope</p>
                        <p className="text-sm text-gray-700 mt-2">{audit.scope || 'Not documented yet.'}</p>
                    </div>
                    <div className="rounded-xl border border-gray-100 p-4">
                        <p className="text-xs uppercase text-gray-500 font-semibold">Team</p>
                        <p className="text-sm text-gray-700 mt-2">Audit lead {audit.owner ?? 'Unassigned'}.</p>
                    </div>
                </div>
            )}

            {tab === 'checklist' && (
                <div className="grid gap-4 lg:grid-cols-[280px,minmax(0,1fr)]">
                    <div className="border border-gray-100 rounded-2xl p-3 space-y-2">
                        {audit.checklist.length === 0 ? (
                            <p className="text-xs text-gray-400 px-2 py-4 text-center">No checklist items yet.</p>
                        ) : (
                            audit.checklist.map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => onSelectChecklistItem(item.id)}
                                    className={`w-full text-left rounded-xl px-3 py-2 text-sm ${item.id === checklistItem?.id ? 'bg-blue-50 text-blue-900 border border-blue-200' : 'hover:bg-gray-50 border border-transparent'}`}
                                >
                                    <p className="font-semibold">{item.title}</p>
                                    <p className="text-xs text-gray-500">Clause {item.clause ?? '—'}</p>
                                    <p className="text-xs text-gray-500">Owner {item.owner ?? 'Unassigned'}</p>
                                </button>
                            ))
                        )}
                    </div>
                    <div className="border border-gray-100 rounded-2xl p-5 space-y-4">
                        {checklistItem ? (
                            <>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs uppercase text-gray-500 font-semibold">Clause {checklistItem.clause ?? '—'}</p>
                                        <h3 className="text-lg font-semibold text-gray-900">{checklistItem.title}</h3>
                                        <p className="text-sm text-gray-500">Owner {checklistItem.owner ?? 'Unassigned'}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${checklistItem.status === 'NC' ? 'bg-red-100 text-red-700' : checklistItem.status === 'OBS' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {checklistItem.status === 'NC' ? 'Non-conformity' : checklistItem.status}
                                    </span>
                                </div>
                                <div className="rounded-xl bg-gray-50 border border-gray-100 p-4 text-sm text-gray-700">
                                    {checklistItem.notes || 'No notes yet.'}
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50">
                                        Attach evidence
                                    </button>
                                    <button className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700">
                                        Record observation
                                    </button>
                                </div>
                            </>
                        ) : (
                            <p className="text-sm text-gray-500">Select a checklist item to review details.</p>
                        )}
                    </div>
                </div>
            )}

            {tab === 'findings' && (
                <div className="overflow-auto border border-gray-100 rounded-2xl">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                            <tr>
                                <th className="text-left px-4 py-3">Finding</th>
                                <th className="text-left px-4 py-3">Severity</th>
                                <th className="text-left px-4 py-3">Owner</th>
                                <th className="text-left px-4 py-3">Due date</th>
                                <th className="text-left px-4 py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {audit.findings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-500">
                                        No findings registered yet.
                                    </td>
                                </tr>
                            ) : (
                                audit.findings.map((finding) => (
                                    <tr key={finding.id} className="border-t border-gray-100">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{finding.title}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${finding.severity === 'HIGH' ? 'bg-red-100 text-red-700' : finding.severity === 'LOW' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                {finding.severity}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-700">{finding.owner ?? 'Unassigned'}</td>
                                        <td className="px-4 py-3 text-gray-600">{finding.dueDate ? formatDate(finding.dueDate) : '—'}</td>
                                        <td className="px-4 py-3">
                                            <StatusPill status={(finding.status as AuditStatusUnion) || 'PLANNED'} />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {tab === 'actions' && (
                <div className="grid gap-4 lg:grid-cols-4">
                    {['OPEN', 'IN_PROGRESS', 'VERIFY', 'CLOSED'].map((column) => (
                        <div key={column} className="border border-gray-100 rounded-2xl p-3 bg-gray-50/50">
                            <p className="text-xs font-semibold uppercase text-gray-500 mb-2">{column.replace('_', ' ')}</p>
                            <div className="space-y-3">
                                {audit.actions.filter((action) => action.status === column).length === 0 ? (
                                    <p className="text-xs text-gray-400">No items</p>
                                ) : (
                                    audit.actions
                                        .filter((action) => action.status === column)
                                        .map((action) => (
                                            <div key={action.id} className="rounded-xl bg-white px-3 py-2 border border-gray-200">
                                                <p className="text-sm font-semibold text-gray-900">{action.title}</p>
                                                <p className="text-xs text-gray-500">Owner {action.owner ?? 'Unassigned'}</p>
                                                <p className="text-xs text-gray-400">Due {action.dueDate ? formatDate(action.dueDate) : '—'}</p>
                                            </div>
                                        ))
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </section>
    );
}

function StatusPill({ status }: { status: AuditStatusUnion }) {
    let classes = 'bg-gray-100 text-gray-700';
    if (status === 'PLANNED') classes = 'bg-yellow-100 text-yellow-800';
    if (status === 'IN_PROGRESS') classes = 'bg-blue-100 text-blue-700';
    if (status === 'COMPLETED') classes = 'bg-green-100 text-green-700';

    return (
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${classes}`}>
            {status.replace('_', ' ')}
        </span>
    );
}

function summarizeAudits(audits: Audit[]) {
    const now = Date.now();
    const upcoming = audits.filter((audit) => new Date(audit.startDate).getTime() > now).length;
    const inProgress = audits.filter((audit) => audit.status === 'IN_PROGRESS').length;
    const thisQuarter = audits.filter((audit) => {
        const start = new Date(audit.startDate);
        const currentQuarter = Math.floor(new Date().getMonth() / 3);
        const auditQuarter = Math.floor(start.getMonth() / 3);
        return start.getFullYear() === new Date().getFullYear() && auditQuarter === currentQuarter;
    }).length;
    const openFindings = audits.reduce((sum, audit) => sum + audit.findings.length, 0);
    const actions = audits.reduce((sum, audit) => sum + audit.actions.length, 0);
    const overdueFindings = audits.reduce((sum, audit) => sum + audit.findings.filter((finding) => finding.dueDate && new Date(finding.dueDate) < new Date()).length, 0);
    const awaitingVerification = audits.reduce((sum, audit) => sum + audit.actions.filter((action) => action.status === 'VERIFY').length, 0);
    const activeFindings = audits.reduce((sum, audit) => sum + audit.findings.filter((finding) => finding.status !== 'COMPLETED').length, 0);

    return {
        upcoming,
        inProgress,
        thisQuarter,
        openFindings,
        overdueFindings,
        actions,
        awaitingVerification,
        activeFindings,
    };
}

function groupAuditsByMonth(audits: Audit[]) {
    const buckets: Record<string, Audit[]> = {};
    audits.forEach((audit) => {
        const date = new Date(audit.startDate);
        if (Number.isNaN(date.getTime())) {
            return;
        }
        const label = date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
        buckets[label] = buckets[label] || [];
        buckets[label].push(audit);
    });
    return Object.entries(buckets).map(([month, list]) => ({
        month,
        audits: list.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()),
    }));
}

function formatRange(start: string, end: string) {
    const startDate = new Date(start);
    const endDate = new Date(end);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return '—';
    }
    return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function formatDate(date: string) {
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }
    return parsed.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
