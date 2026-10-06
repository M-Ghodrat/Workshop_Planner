import React, { useState, useMemo, useEffect } from 'react';
import {
  Layers,
  Plus,
  Edit,
  Trash2,
  BookOpen,
  Eye,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Search,
  User,
  Users,
  Lock,
  Shield,
  FileText,
  AlertTriangle,
  UserCheck,
  UserPlus,
  Check,
  X,
  Mail,
  Building,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { seriesService } from '../../services/seriesService';
import { workshopService } from '../../services/workshopService';
import { DEFAULT_FACULTY } from '../../services/userService';
import {
  WorkshopSeries,
  Workshop,
  LearningOutcome,
  BloomsTaxonomy,
  UserProfile,
  SeriesLead,
} from '../../types';
import {
  isUserAssignedToWorkshop,
  isWorkshopInSeries,
  isSeriesAssignedToDeveloper,
  canUserModifySeries,
  canUserModifyWorkshop,
  canUserViewFullWorkshopContent,
  isUserLeadOfSeries,
} from '../../utils/workshopPermissions';
import { WorkshopQuickOverviewModal } from '../workshops/WorkshopQuickOverviewModal';

interface SeriesListProps {
  series: WorkshopSeries[];
  workshops: Workshop[];
  users?: UserProfile[];
  onSelectWorkshop: (workshop: Workshop, mode: 'edit' | 'preview') => void;
  onOpenCreateWorkshop: () => void;
  onSeriesUpdated?: (updated: WorkshopSeries[]) => void;
  onWorkshopsUpdated?: (updated: Workshop[]) => void;
}

export const SeriesList: React.FC<SeriesListProps> = ({
  series = [],
  workshops = [],
  users = [],
  onSelectWorkshop,
  onOpenCreateWorkshop,
  onSeriesUpdated,
  onWorkshopsUpdated,
}) => {
  const {
    userProfile,
    isAdmin,
    isProgramAdmin,
    isProjectLead,
    isWorkshopLead,
    canCreateSeries,
    canDeleteSeries,
    canEditSeries,
    canInitiateWorkshop,
  } = useAuth();
  const { success, error, info } = useToast();

  const safeWorkshops = Array.isArray(workshops) ? workshops : [];
  const safeUsers = Array.isArray(users) ? users : [];

  // Local optimistic state for immediate zero-latency UI updates
  const [localSeries, setLocalSeries] = useState<WorkshopSeries[]>(
    Array.isArray(series) ? series : []
  );
  const [localWorkshops, setLocalWorkshops] = useState<Workshop[]>(safeWorkshops);

  // Synchronize local series when parent prop updates
  useEffect(() => {
    if (Array.isArray(series)) {
      setLocalSeries(series);
    }
  }, [series]);

  useEffect(() => {
    setLocalWorkshops(safeWorkshops);
  }, [workshops]);

  const userId = userProfile?.id || '';

  // Consolidate all available faculty leads (combining users and defaults)
  const availableFacultyLeads = useMemo(() => {
    const map = new Map<string, UserProfile>();
    DEFAULT_FACULTY.forEach((f) => map.set(f.id, f));
    safeUsers.forEach((u) => {
      if (u.id) map.set(u.id, u);
    });
    return Array.from(map.values()).sort((a, b) => {
      // Prioritize workshop_lead role
      const aIsLead = a.role === 'workshop_lead' ? 0 : 1;
      const bIsLead = b.role === 'workshop_lead' ? 0 : 1;
      if (aIsLead !== bIsLead) return aIsLead - bIsLead;
      return (a.displayName || '').localeCompare(b.displayName || '');
    });
  }, [safeUsers]);

  // For developers, consider workshops they created or are assigned to
  const accessibleWorkshops = useMemo(() => {
    if (isAdmin || isWorkshopLead || canEditSeries) return safeWorkshops;
    return safeWorkshops.filter((w) => isUserAssignedToWorkshop(w, userProfile));
  }, [safeWorkshops, isAdmin, isWorkshopLead, canEditSeries, userProfile]);

  // Workshop leads and admins see all series.
  // Developers see series containing workshops assigned to them.
  const scopedSeries = useMemo(() => {
    if (isAdmin || isWorkshopLead || canEditSeries) return localSeries;
    return localSeries.filter(
      (s) => s.createdBy === userId || isSeriesAssignedToDeveloper(s, safeWorkshops, userProfile)
    );
  }, [localSeries, safeWorkshops, isAdmin, isWorkshopLead, canEditSeries, userId, userProfile]);

  const canModifyThisSeries = (s: WorkshopSeries | null): boolean => {
    return canUserModifySeries(s, userProfile);
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [editingSeries, setEditingSeries] = useState<WorkshopSeries | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [overviewWorkshop, setOverviewWorkshop] = useState<Workshop | null>(null);
  const [selectedSeriesForView, setSelectedSeriesForView] = useState<WorkshopSeries | null>(
    scopedSeries[0] || null
  );

  // Deletion modal state
  const [seriesToDelete, setSeriesToDelete] = useState<WorkshopSeries | null>(null);
  const [isDeletingSeries, setIsDeletingSeries] = useState(false);

  // Direct Lead Assignment modal state (Quick action for Program Administrator)
  const [leadAssignModalSeries, setLeadAssignModalSeries] = useState<WorkshopSeries | null>(null);
  const [modalSelectedLeadIds, setModalSelectedLeadIds] = useState<string[]>([]);
  const [isSavingLeads, setIsSavingLeads] = useState(false);

  // Workshop deletion modal state (inside Series detail view)
  const [deletingWorkshop, setDeletingWorkshop] = useState<Workshop | null>(null);
  const [isDeletingWorkshop, setIsDeletingWorkshop] = useState(false);

  const canDeleteWorkshopInSeries = (w: Workshop, s: WorkshopSeries | null): boolean => {
    if (!userProfile || !s) return false;
    if (userProfile.role === 'administrator') return true;
    if (w.createdBy && w.createdBy === userProfile.id) return true;
    if (userProfile.role === 'workshop_lead' && isUserLeadOfSeries(s, userProfile)) return true;
    return false;
  };

  const handleConfirmDeleteWorkshop = async () => {
    if (!deletingWorkshop?.id || !userProfile) return;
    const targetId = deletingWorkshop.id;
    const targetTitle = `${deletingWorkshop.prefix} ${deletingWorkshop.code}`;

    setIsDeletingWorkshop(true);
    try {
      const remainingWorkshops = localWorkshops.filter((w) => w.id !== targetId);
      setLocalWorkshops(remainingWorkshops);
      if (onWorkshopsUpdated) {
        onWorkshopsUpdated(remainingWorkshops);
      }

      if (selectedSeriesForView) {
        const updatedWIds = (selectedSeriesForView.workshopIds || []).filter((id) => id !== targetId);
        const updatedSeriesObj: WorkshopSeries = {
          ...selectedSeriesForView,
          workshopIds: updatedWIds,
          workshopCount: updatedWIds.length,
          updatedAt: new Date().toISOString(),
        };
        setSelectedSeriesForView(updatedSeriesObj);
        const updatedSeriesList = localSeries.map((s) => (s.id === updatedSeriesObj.id ? updatedSeriesObj : s));
        setLocalSeries(updatedSeriesList);
        if (onSeriesUpdated) onSeriesUpdated(updatedSeriesList);

        await seriesService.updateSeries(
          selectedSeriesForView.id,
          {
            workshopIds: updatedWIds,
            workshopCount: updatedWIds.length,
          },
          userProfile
        );
      }

      setDeletingWorkshop(null);
      await workshopService.deleteWorkshop(targetId);
      success('Workshop Deleted', `${targetTitle} was permanently removed from this series track.`);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Unable to delete workshop.');
    } finally {
      setIsDeletingWorkshop(false);
    }
  };

  // Keep selected series updated if series change and none is selected
  useEffect(() => {
    if (
      (!selectedSeriesForView || !scopedSeries.some((s) => s.id === selectedSeriesForView.id)) &&
      scopedSeries.length > 0
    ) {
      setSelectedSeriesForView(scopedSeries[0]);
    } else if (scopedSeries.length === 0) {
      setSelectedSeriesForView(null);
    }
  }, [scopedSeries, selectedSeriesForView]);

  // Form State for Create/Edit Modal
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [coreFocus, setCoreFocus] = useState('');
  const [prefix, setPrefix] = useState('');
  const [status, setStatus] = useState<'Active' | 'Draft' | 'Archived'>('Active');
  const [formSelectedLeadIds, setFormSelectedLeadIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Series Learning Outcomes State
  const [seriesLos, setSeriesLos] = useState<LearningOutcome[]>([]);
  const [newLoText, setNewLoText] = useState('');
  const [newLoBloom, setNewLoBloom] = useState<BloomsTaxonomy>('Understand');

  // Open Create Form (Program Administrator only)
  const handleOpenCreate = () => {
    if (!isProgramAdmin) {
      error('Access Restricted', 'Creation of workshop series is strictly reserved for the Program Administrator.');
      return;
    }
    setName('');
    setDescription('');
    setCoreFocus('');
    setPrefix('');
    setStatus('Active');
    setFormSelectedLeadIds([]);
    setSeriesLos([]);
    setNewLoText('');
    setNewLoBloom('Understand');
    setEditingSeries(null);
    setIsCreating(true);
  };

  // Open Edit Form
  const handleOpenEdit = (s: WorkshopSeries) => {
    setName(s.name);
    setDescription(s.description || '');
    setCoreFocus(s.coreFocus || '');
    setPrefix(s.prefix || '');
    setStatus(s.status);

    // Populate assigned leads
    const initialLeadIds: string[] = [];
    if (Array.isArray(s.leadIds)) {
      initialLeadIds.push(...s.leadIds);
    } else if (s.leadId) {
      initialLeadIds.push(s.leadId);
    }
    setFormSelectedLeadIds(initialLeadIds);

    setSeriesLos(s.learningOutcomes || []);
    setNewLoText('');
    setNewLoBloom('Understand');
    setEditingSeries(s);
    setIsCreating(true);
  };

  const handleToggleFormLead = (leadId: string) => {
    if (!isProgramAdmin) {
      error('Access Restricted', 'Workshop leads cannot assign series to another lead. This permission is reserved for the Program Administrator.');
      return;
    }
    setFormSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleAddSeriesLo = () => {
    if (!newLoText.trim()) return;
    const newCode = `LO${seriesLos.length + 1}`;
    const newLo: LearningOutcome = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      code: newCode,
      text: newLoText.trim(),
      bloomLevel: newLoBloom,
    };
    setSeriesLos([...seriesLos, newLo]);
    setNewLoText('');
  };

  const handleRemoveSeriesLo = (id: string) => {
    const filtered = seriesLos.filter((lo) => lo.id !== id);
    const reCoded = filtered.map((lo, idx) => ({
      ...lo,
      code: `LO${idx + 1}`,
    }));
    setSeriesLos(reCoded);
  };

  // Build SeriesLead objects from selected IDs
  const buildLeadsFromIds = (ids: string[]): SeriesLead[] => {
    return ids
      .map((id) => {
        const u = availableFacultyLeads.find((f) => f.id === id);
        if (!u) return null;
        const cleanName = u.displayName.replace(/^Workshop Lead:\s*/i, '');
        return {
          id: u.id,
          name: cleanName,
          email: u.email,
          department: u.department,
        };
      })
      .filter(Boolean) as SeriesLead[];
  };

  const handleSaveSeries = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !userProfile) return;

    if (!editingSeries && !isProgramAdmin) {
      error('Access Restricted', 'Creation of workshop series is strictly reserved for the Program Administrator.');
      return;
    }

    setIsSubmitting(true);
    const leadsObjects = buildLeadsFromIds(formSelectedLeadIds);
    const primaryLead = leadsObjects[0] || null;

    try {
      if (editingSeries && editingSeries.id) {
        // Permission check: Only Program Administrator can reassign series leads
        const leadUpdates = isProgramAdmin
          ? {
              leadIds: formSelectedLeadIds,
              leads: leadsObjects,
              leadId: primaryLead?.id || '',
              leadName: primaryLead?.name || '',
              leadEmail: primaryLead?.email || '',
            }
          : {
              leadIds: editingSeries.leadIds || [],
              leads: editingSeries.leads || [],
              leadId: editingSeries.leadId || '',
              leadName: editingSeries.leadName || '',
              leadEmail: editingSeries.leadEmail || '',
            };

        const updates: Partial<WorkshopSeries> = {
          name: name.trim(),
          description: description.trim(),
          coreFocus: coreFocus.trim(),
          prefix: prefix.trim().toUpperCase(),
          status,
          learningOutcomes: seriesLos,
          ...leadUpdates,
          updatedAt: new Date().toISOString(),
        };

        const updatedSeries: WorkshopSeries = {
          ...editingSeries,
          ...updates,
        };

        // Optimistic update
        const updatedList = localSeries.map((s) => (s.id === editingSeries.id ? updatedSeries : s));
        setLocalSeries(updatedList);
        if (onSeriesUpdated) onSeriesUpdated(updatedList);
        if (selectedSeriesForView?.id === editingSeries.id) {
          setSelectedSeriesForView(updatedSeries);
        }

        await seriesService.updateSeries(editingSeries.id, updates, userProfile);
        success('Series Updated', `"${name}" updated successfully.`);
      } else {
        const newSeriesData: Omit<WorkshopSeries, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'> = {
          name: name.trim(),
          description: description.trim(),
          coreFocus: coreFocus.trim(),
          prefix: prefix.trim().toUpperCase(),
          status,
          workshopIds: [],
          workshopCount: 0,
          learningOutcomes: seriesLos,
          leadIds: formSelectedLeadIds,
          leads: leadsObjects,
          leadId: primaryLead?.id || '',
          leadName: primaryLead?.name || '',
          leadEmail: primaryLead?.email || '',
        };

        const createdId = await seriesService.createSeries(newSeriesData, userProfile);
        const newCreatedSeries: WorkshopSeries = {
          ...newSeriesData,
          id: createdId,
          createdBy: userProfile.id,
          createdByName: userProfile.displayName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const updatedList = [newCreatedSeries, ...localSeries];
        setLocalSeries(updatedList);
        if (onSeriesUpdated) onSeriesUpdated(updatedList);
        setSelectedSeriesForView(newCreatedSeries);

        success('Series Created', `"${name}" initialized with ${formSelectedLeadIds.length} workshop lead(s).`);
      }

      setIsCreating(false);
      setEditingSeries(null);
    } catch (err: any) {
      error('Series Save Failed', err.message || 'Could not save workshop series.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Series Deletion flow: STRICTLY Program Administrator only
  const requestDeleteSeries = (s: WorkshopSeries) => {
    if (!isProgramAdmin) {
      error(
        'Access Restricted',
        'Creation and deletion of workshop series are strictly reserved for the Program Administrator.'
      );
      return;
    }
    setSeriesToDelete(s);
  };

  const handleConfirmDeleteSeries = async () => {
    if (!seriesToDelete || !seriesToDelete.id) return;
    if (!isProgramAdmin) {
      error('Access Restricted', 'Only the Program Administrator can delete workshop series.');
      return;
    }

    const targetId = seriesToDelete.id;
    const targetName = seriesToDelete.name;
    setIsDeletingSeries(true);

    try {
      // 1. Instant optimistic removal from local state and parent state (Zero latency!)
      const remaining = localSeries.filter((s) => s.id !== targetId);
      setLocalSeries(remaining);
      if (onSeriesUpdated) {
        onSeriesUpdated(remaining);
      }

      // 2. Select next remaining series if current was deleted
      if (selectedSeriesForView?.id === targetId) {
        setSelectedSeriesForView(remaining.length > 0 ? remaining[0] : null);
      }

      // 3. Close modal immediately
      setSeriesToDelete(null);

      // 4. Persist to storage and Firestore
      await seriesService.deleteSeries(targetId, userProfile);
      success('Series Deleted', `"${targetName}" was removed successfully.`);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete workshop series.');
    } finally {
      setIsDeletingSeries(false);
    }
  };

  // Direct Lead Assignment Modal handlers
  const handleOpenLeadAssignModal = (s: WorkshopSeries) => {
    if (!isProgramAdmin) {
      error('Access Restricted', 'Only the Program Administrator can assign workshop series to workshop leads.');
      return;
    }
    setLeadAssignModalSeries(s);
    const existing = s.leadIds || (s.leadId ? [s.leadId] : []);
    setModalSelectedLeadIds(existing);
  };

  const handleToggleModalLead = (leadId: string) => {
    setModalSelectedLeadIds((prev) =>
      prev.includes(leadId) ? prev.filter((id) => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSaveAssignedLeads = async () => {
    if (!leadAssignModalSeries || !leadAssignModalSeries.id) return;
    if (!isProgramAdmin) {
      error('Access Restricted', 'Only the Program Administrator can assign series to workshop leads.');
      return;
    }

    setIsSavingLeads(true);
    const leadsObjects = buildLeadsFromIds(modalSelectedLeadIds);
    const primaryLead = leadsObjects[0] || null;

    try {
      const updates: Partial<WorkshopSeries> = {
        leadIds: modalSelectedLeadIds,
        leads: leadsObjects,
        leadId: primaryLead?.id || '',
        leadName: primaryLead?.name || '',
        leadEmail: primaryLead?.email || '',
        updatedAt: new Date().toISOString(),
      };

      const updatedSeries: WorkshopSeries = {
        ...leadAssignModalSeries,
        ...updates,
      };

      // Synchronous optimistic update
      const updatedList = localSeries.map((s) =>
        s.id === leadAssignModalSeries.id ? updatedSeries : s
      );
      setLocalSeries(updatedList);
      if (onSeriesUpdated) onSeriesUpdated(updatedList);
      if (selectedSeriesForView?.id === leadAssignModalSeries.id) {
        setSelectedSeriesForView(updatedSeries);
      }

      await seriesService.updateSeries(leadAssignModalSeries.id, updates, userProfile);
      success(
        'Leadership Assigned',
        `Assigned ${modalSelectedLeadIds.length} workshop lead(s) to "${leadAssignModalSeries.name}".`
      );
      setLeadAssignModalSeries(null);
    } catch (err: any) {
      error('Assignment Failed', err.message || 'Could not update series leadership.');
    } finally {
      setIsSavingLeads(false);
    }
  };

  const filteredSeries = scopedSeries.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.coreFocus?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.prefix?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Workshop Series Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {isProgramAdmin
              ? 'Organize UCW workshops into cohesive thematic tracks and assign workshop leads.'
              : isWorkshopLead
              ? 'Review curriculum tracks, learning outcomes, and workshops assigned to your leadership.'
              : 'Curriculum series tracks associated with your assigned and authored workshops.'}
          </p>
        </div>

        {/* ONLY Program Administrator can create a series */}
        {isProgramAdmin && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>New Workshop Series</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search series by title, core focus, or department prefix..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
          />
        </div>
      </div>

      {/* Series Grid & Detail Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Series Cards */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Series Tracks ({filteredSeries.length})
            </h3>
            {isProgramAdmin && (
              <span className="text-[10px] font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Program Administrator Access
              </span>
            )}
          </div>

          {filteredSeries.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-dashed border-slate-300 text-xs text-slate-400">
              {scopedSeries.length === 0
                ? 'No workshop series associated with your workshops yet.'
                : 'No series matching search criteria.'}
            </div>
          ) : (
            filteredSeries.map((s) => {
              const isSelected = selectedSeriesForView?.id === s.id;
              const seriesWorkshops = safeWorkshops.filter((w) => isWorkshopInSeries(w, s));
              const myWorkshopsCount = seriesWorkshops.filter((w) =>
                isUserAssignedToWorkshop(w, userProfile)
              ).length;
              const canEditThis = canModifyThisSeries(s);

              // Extract assigned leads for display
              const assignedLeadNames =
                Array.isArray(s.leads) && s.leads.length > 0
                  ? s.leads
                      .map((l) => (l.name || '').replace(/^Workshop Lead:\s*/i, ''))
                      .filter(Boolean)
                  : s.leadName
                  ? [s.leadName.replace(/^Workshop Lead:\s*/i, '')]
                  : [];

              const isLeadOfThis = isUserLeadOfSeries(s, userProfile);

              return (
                <div
                  key={s.id}
                  onClick={() => setSelectedSeriesForView(s)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                    isSelected
                      ? 'bg-white border-[#002B49] shadow-md ring-2 ring-[#002B49]/10'
                      : 'bg-white border-slate-200 hover:border-sky-300 shadow-2xs hover:bg-sky-50/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-[#002B49] text-amber-300 text-[10px] font-extrabold">
                        {s.prefix || 'UCW'}
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 leading-snug">{s.name}</h4>
                    </div>

                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                        s.status === 'Active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {s.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                    {s.coreFocus || s.description}
                  </p>

                  {/* Leadership Badge on Card */}
                  <div className="mt-2.5 flex items-center gap-1.5 flex-wrap">
                    {assignedLeadNames.length > 0 ? (
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 border ${
                          isLeadOfThis
                            ? 'bg-amber-50 text-amber-900 border-amber-300 font-bold'
                            : 'bg-sky-50 text-sky-900 border-sky-200'
                        }`}
                        title={`Assigned Workshop Leads: ${assignedLeadNames.join(', ')}`}
                      >
                        <UserCheck className="w-3 h-3 text-sky-600 shrink-0" />
                        <span className="truncate max-w-[190px]">
                          Lead: {assignedLeadNames.join(', ')}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                        <Users className="w-3 h-3 text-slate-400" />
                        <span>Unassigned Leads</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-100 text-xs">
                    <div className="flex items-center gap-2 text-slate-500">
                      <span className="font-semibold flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-sky-600" />
                        <span>{seriesWorkshops.length} workshops</span>
                      </span>
                      {myWorkshopsCount > 0 && (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                          {myWorkshopsCount} assigned
                        </span>
                      )}
                    </div>

                    <div
                      className="flex items-center gap-1"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {!canEditThis && !isProgramAdmin && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-900 border border-sky-200 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-sky-700" />
                          <span>Read-Only</span>
                        </span>
                      )}

                      {/* Edit Button: Program Admin or assigned lead */}
                      {(isProgramAdmin || (canEditSeries && canEditThis)) && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(s)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded-md cursor-pointer transition-colors"
                          title="Edit Series"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Delete Series Button: STRICTLY Program Administrator only */}
                      {isProgramAdmin && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteSeries(s);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md cursor-pointer transition-colors"
                          title="Delete Series (Program Administrator)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right 2 Columns: Selected Series Detail View */}
        <div className="lg:col-span-2">
          {selectedSeriesForView ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-[#002B49] text-white text-xs font-extrabold">
                      {selectedSeriesForView.prefix || 'UCW'}
                    </span>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {selectedSeriesForView.status}
                    </span>
                    {!canModifyThisSeries(selectedSeriesForView) && !isProgramAdmin && (
                      <span className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-0.5 rounded-lg bg-sky-100/90 text-[#002B49] border border-sky-200">
                        <Shield className="w-3.5 h-3.5 text-[#002B49]" />
                        Read-Only Series
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    {selectedSeriesForView.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Edit Series button */}
                  {(isProgramAdmin || (canEditSeries && canModifyThisSeries(selectedSeriesForView))) && (
                    <button
                      onClick={() => handleOpenEdit(selectedSeriesForView)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>Edit Series Info</span>
                    </button>
                  )}

                  {/* Assign Leads Quick Action: Program Administrator only */}
                  {isProgramAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenLeadAssignModal(selectedSeriesForView)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-300 bg-sky-50 text-sky-900 text-xs font-bold hover:bg-sky-100 cursor-pointer transition-colors"
                      title="Assign Series to Workshop Leads"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-sky-700" />
                      <span>Assign Leads</span>
                    </button>
                  )}

                  {/* Delete Series Button: STRICTLY Program Administrator only */}
                  {isProgramAdmin && (
                    <button
                      type="button"
                      onClick={() => requestDeleteSeries(selectedSeriesForView)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold cursor-pointer transition-colors"
                      title="Delete Series (Program Administrator)"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )}

                  {/* Add Workshop Button */}
                  {canInitiateWorkshop && (isProgramAdmin || canModifyThisSeries(selectedSeriesForView)) && (
                    <button
                      onClick={onOpenCreateWorkshop}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#002B49] text-white text-xs font-semibold hover:bg-sky-900 cursor-pointer shadow-xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      <span>Add Workshop</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Dedicated Leadership & Assigned Workshop Leads Panel */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-sky-50/50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-[#002B49]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Series Leadership & Workshop Leads
                    </h4>
                  </div>
                  {isProgramAdmin && (
                    <button
                      type="button"
                      onClick={() => handleOpenLeadAssignModal(selectedSeriesForView)}
                      className="text-[11px] font-bold text-sky-700 hover:text-sky-900 flex items-center gap-1 cursor-pointer"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Manage Leads</span>
                    </button>
                  )}
                </div>

                {(() => {
                  const leadObjects: SeriesLead[] =
                    Array.isArray(selectedSeriesForView.leads) && selectedSeriesForView.leads.length > 0
                      ? selectedSeriesForView.leads
                      : selectedSeriesForView.leadName
                      ? [
                          {
                            id: selectedSeriesForView.leadId || 'lead_legacy',
                            name: selectedSeriesForView.leadName,
                            email: selectedSeriesForView.leadEmail,
                            department: 'Academic Faculty',
                          },
                        ]
                      : [];

                  if (leadObjects.length === 0) {
                    return (
                      <div className="p-3 rounded-xl bg-white border border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                        <span>No Workshop Leads assigned to this series yet.</span>
                        {isProgramAdmin && (
                          <button
                            type="button"
                            onClick={() => handleOpenLeadAssignModal(selectedSeriesForView)}
                            className="px-2.5 py-1 rounded-lg bg-[#002B49] text-white text-[11px] font-bold cursor-pointer hover:bg-sky-900"
                          >
                            Assign Lead Now
                          </button>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {leadObjects.map((lead, idx) => {
                        const cleanName = (lead.name || '').replace(/^Workshop Lead:\s*/i, '');
                        const displayName = cleanName || lead.name;

                        return (
                          <div
                            key={lead.id || `lead-${idx}`}
                            className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs"
                          >
                            <div className="w-9 h-9 rounded-full bg-[#002B49] text-amber-300 font-extrabold text-xs flex items-center justify-center shrink-0 ring-2 ring-sky-100">
                              {cleanName
                                ? cleanName
                                    .split(' ')
                                    .map((n) => n[0])
                                    .slice(0, 2)
                                    .join('')
                                : 'WL'}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-bold text-slate-900 truncate">
                                  {displayName}
                                </span>
                                <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200">
                                  Workshop Lead
                                </span>
                              </div>
                            {lead.department && (
                              <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5">
                                <Building className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{lead.department}</span>
                              </p>
                            )}
                            {lead.email && (
                              <p className="text-[10px] text-slate-400 truncate flex items-center gap-1">
                                <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>{lead.email}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  );
                })()}
              </div>

              {/* Core Focus & Description */}
              <div className="space-y-3 text-xs sm:text-sm">
                <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-950">
                  <span className="font-extrabold text-xs uppercase tracking-wider text-amber-800 block mb-0.5">
                    Core Curriculum Focus
                  </span>
                  <p className="leading-relaxed">{selectedSeriesForView.coreFocus}</p>
                </div>

                <div>
                  <span className="font-bold text-slate-700 text-xs block mb-1">
                    Pedagogical Description
                  </span>
                  <p className="text-slate-600 leading-relaxed">
                    {selectedSeriesForView.description ||
                      'No detailed pedagogical rationale provided.'}
                  </p>
                </div>
              </div>

              {/* Series Learning Outcomes */}
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Series Learning Outcomes (
                    {selectedSeriesForView.learningOutcomes?.length || 0})
                  </h4>
                </div>

                {selectedSeriesForView.learningOutcomes &&
                selectedSeriesForView.learningOutcomes.length > 0 ? (
                  <div className="space-y-2">
                    {selectedSeriesForView.learningOutcomes.map((lo) => (
                      <div
                        key={lo.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[#002B49] text-xs">
                            {lo.code}
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-800 border border-sky-100">
                            {lo.bloomLevel}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed font-semibold">{lo.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No series learning outcomes defined yet.</p>
                )}
              </div>

              {/* Workshops Belonging to This Series */}
              {(() => {
                const seriesWorkshops = safeWorkshops.filter((w) =>
                  isWorkshopInSeries(w, selectedSeriesForView)
                );
                const assignedToMeCount = seriesWorkshops.filter((w) =>
                  isUserAssignedToWorkshop(w, userProfile)
                ).length;

                return (
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Workshops in this Series ({seriesWorkshops.length})
                      </h4>
                      {assignedToMeCount > 0 && (
                        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {assignedToMeCount} assigned to you
                        </span>
                      )}
                    </div>

                    {seriesWorkshops.length === 0 ? (
                      <div className="p-8 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                        No workshops assigned to this series yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {seriesWorkshops.map((w, idx) => {
                          const devList =
                            w.assignedDevelopers && w.assignedDevelopers.length > 0
                              ? w.assignedDevelopers
                              : w.createdByName
                              ? [{ id: w.createdBy || 'creator', name: w.createdByName, email: '' }]
                              : [];

                          const isAssignedToMe = isUserAssignedToWorkshop(w, userProfile);
                          const canEditThis = canUserModifyWorkshop(w, userProfile, localSeries);
                          const canViewFullContent = canUserViewFullWorkshopContent(
                            w,
                            userProfile,
                            localSeries
                          );

                          return (
                            <div
                              key={w.id}
                              onClick={() => {
                                if (!canViewFullContent) {
                                  setOverviewWorkshop(w);
                                }
                              }}
                              className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border transition-all gap-3 ${
                                !canViewFullContent
                                  ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 cursor-pointer'
                                  : isAssignedToMe
                                  ? 'border-sky-300 bg-sky-50/40 shadow-2xs'
                                  : 'border-slate-200 bg-slate-50/60'
                              }`}
                            >
                              <div className="flex items-start sm:items-center gap-3 min-w-0">
                                <span className="w-7 h-7 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs mt-0.5 sm:mt-0">
                                  {idx + 1}
                                </span>
                                <div className="min-w-0 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-900 text-xs truncate">
                                      {w.prefix} {w.code}: {w.title}
                                    </span>
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                                      {w.status}
                                    </span>
                                    {isAssignedToMe && (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                        Assigned to You
                                      </span>
                                    )}
                                    {!canViewFullContent && (
                                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span>Overview Only</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2.5 flex-wrap text-[11px] text-slate-500">
                                    <span className="text-slate-400">
                                      {w.totalDurationMinutes || 120} mins •{' '}
                                      {canViewFullContent
                                        ? `${w.learningOutcomes?.length || 0} Learning Outcomes`
                                        : 'Institutional Summary'}
                                    </span>

                                    {/* Developer Small Tag(s) */}
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {devList.length > 0 ? (
                                        devList.map((dev) => (
                                          <span
                                            key={dev.id}
                                            title={dev.email ? `${dev.name} (${dev.email})` : dev.name}
                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 hover:bg-slate-200/70 text-slate-800 text-[10px] font-medium border border-slate-200 transition-colors shrink-0"
                                          >
                                            <span className="w-3.5 h-3.5 rounded-full bg-[#002B49] text-white flex items-center justify-center text-[8px] font-bold">
                                              {dev.name?.charAt(0) || 'D'}
                                            </span>
                                            <span className="truncate max-w-[120px]">{dev.name}</span>
                                          </span>
                                        ))
                                      ) : (
                                        <span className="text-[10px] text-slate-400 italic">
                                          Unassigned
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                {canViewFullContent ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onSelectWorkshop(w, 'preview')}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold cursor-pointer"
                                      title="Preview Outline"
                                    >
                                      <Eye className="w-3.5 h-3.5" />
                                    </button>
                                    {canEditThis && (
                                      <button
                                        type="button"
                                        onClick={() => onSelectWorkshop(w, 'edit')}
                                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
                                      >
                                        <Edit className="w-3 h-3 text-amber-400" />
                                        <span>Edit Outline</span>
                                      </button>
                                    )}
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setOverviewWorkshop(w)}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer transition-colors"
                                  >
                                    <Lock className="w-3 h-3 text-amber-700" />
                                    <span>Quick Overview</span>
                                  </button>
                                )}

                                {/* Delete Workshop button for workshop leads of this series & program administrators */}
                                {canDeleteWorkshopInSeries(w, selectedSeriesForView) && (
                                  <button
                                    type="button"
                                    onClick={() => setDeletingWorkshop(w)}
                                    className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                                    title="Delete Workshop from Series (with confirmation warning)"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Select a series to view details</p>
            </div>
          )}
        </div>
      </div>

      {/* Create / Edit Series Modal */}
      {isCreating && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingSeries ? 'Edit Workshop Series' : 'Create New Workshop Series'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Group related 2-hour workshops into an accredited executive sequence and assign leadership.
            </p>

            <form onSubmit={handleSaveSeries} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Series Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI and Machine Learning Leadership"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="BUSI"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl uppercase focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Core Focus Summary <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Developing strategic leadership capabilities for AI in executive management."
                  value={coreFocus}
                  onChange={(e) => setCoreFocus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Series Description & Rationale
                </label>
                <textarea
                  rows={3}
                  placeholder="Provide pedagogical background, intended cohort, certificate outcomes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              {/* Assign Workshop Lead(s) Section */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      {isProgramAdmin ? (
                        <UserCheck className="w-3.5 h-3.5 text-[#002B49]" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                      )}
                      <span>
                        {isProgramAdmin ? 'Assign Workshop Lead(s)' : 'Assigned Workshop Lead(s)'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      {isProgramAdmin
                        ? 'Select one or more workshop leads responsible for overseeing this series.'
                        : 'Workshop Lead assignments are managed exclusively by the Program Administrator.'}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isProgramAdmin
                        ? 'text-sky-800 bg-sky-50 border-sky-200'
                        : 'text-amber-800 bg-amber-50 border-amber-200'
                    }`}
                  >
                    {formSelectedLeadIds.length} Assigned
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {availableFacultyLeads.map((f) => {
                    const isSelected = formSelectedLeadIds.includes(f.id);
                    const cleanName = f.displayName.replace(/^Workshop Lead:\s*/i, '');
                    const displayName = cleanName || f.displayName;

                    // If user is a workshop lead (not program admin), only display already assigned leads in read-only format
                    if (!isProgramAdmin && !isSelected) {
                      return null;
                    }

                    return (
                      <div
                        key={f.id}
                        onClick={() => {
                          if (isProgramAdmin) {
                            handleToggleFormLead(f.id);
                          }
                        }}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 select-none ${
                          !isProgramAdmin
                            ? 'bg-slate-50 border-slate-200 cursor-default'
                            : isSelected
                            ? 'bg-sky-50 border-[#002B49] shadow-2xs ring-1 ring-[#002B49]/20 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isProgramAdmin ? (
                            <div
                              className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                                isSelected
                                  ? 'bg-[#002B49] border-[#002B49] text-white'
                                  : 'border-slate-300 bg-white'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>
                          ) : (
                            <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {displayName}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              {f.role === 'workshop_lead'
                                ? 'Workshop Lead'
                                : f.role === 'administrator'
                                ? 'Administrator'
                                : f.role} • {f.department || 'Faculty'}
                            </p>
                          </div>
                        </div>
                        {f.role === 'workshop_lead' && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 shrink-0">
                            Lead
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Series Learning Outcomes Section */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Series Learning Outcomes ({seriesLos.length})
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Define outcomes for the entire series sequence.
                  </p>
                </div>

                {seriesLos.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {seriesLos.map((lo) => (
                      <div
                        key={lo.id}
                        className="flex items-start gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-extrabold text-[#002B49]">{lo.code}</span>
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-sky-100 text-sky-800">
                              {lo.bloomLevel}
                            </span>
                          </div>
                          <p className="text-slate-600 leading-snug">{lo.text}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSeriesLo(lo.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded-md shrink-0 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Define learning outcome..."
                        value={newLoText}
                        onChange={(e) => setNewLoText(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden bg-white"
                      />
                    </div>
                    <div>
                      <select
                        value={newLoBloom}
                        onChange={(e) => setNewLoBloom(e.target.value as BloomsTaxonomy)}
                        className="w-full px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                      >
                        <option value="Remember">Remember</option>
                        <option value="Understand">Understand</option>
                        <option value="Apply">Apply</option>
                        <option value="Analyze">Analyze</option>
                        <option value="Evaluate">Evaluate</option>
                        <option value="Create">Create</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddSeriesLo}
                      className="px-3 py-1 rounded-lg bg-[#002B49] text-white text-[10px] font-bold hover:bg-sky-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>Add Outcome</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#003d66] rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingSeries ? 'Save Changes' : 'Create Series'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Workshop Quick Overview Modal for restricted outlines */}
      {overviewWorkshop && (
        <WorkshopQuickOverviewModal
          workshop={overviewWorkshop}
          seriesList={localSeries}
          onClose={() => setOverviewWorkshop(null)}
        />
      )}

      {/* Custom Series Deletion Confirmation Modal (Program Administrator only) */}
      {seriesToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-start gap-3.5 bg-rose-50/50">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Workshop Series
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Confirm permanent removal of this curriculum series.
                </p>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Selected Series:
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-[#002B49] text-white text-[10px] font-extrabold">
                    {seriesToDelete.prefix || 'UCW'}
                  </span>
                  <span className="text-sm font-bold text-slate-900 truncate">
                    {seriesToDelete.name}
                  </span>
                </div>
                {seriesToDelete.coreFocus && (
                  <p className="text-xs text-slate-600 mt-2 line-clamp-2">
                    {seriesToDelete.coreFocus}
                  </p>
                )}
              </div>

              {/* Notice */}
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1.5 text-xs">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Program Administrator Action</span>
                </div>
                <p className="leading-relaxed text-amber-950/80 text-[11px]">
                  Deleting this series will remove its curriculum metadata, series learning outcomes, and workshop grouping from the track catalog.
                </p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setSeriesToDelete(null)}
                disabled={isDeletingSeries}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSeries}
                disabled={isDeletingSeries}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isDeletingSeries ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Series</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Program Administrator Direct Lead Assignment Modal */}
      {leadAssignModalSeries && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-start gap-3 bg-sky-50/50">
              <div className="w-10 h-10 rounded-xl bg-sky-100 text-[#002B49] flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5 text-sky-700" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-slate-900">
                  Assign Series to Workshop Leads
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Select one or more Workshop Leads for &quot;{leadAssignModalSeries.name}&quot;
                </p>
              </div>
              <button
                onClick={() => setLeadAssignModalSeries(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Available Faculty & Leads:</span>
                <span className="font-bold text-[#002B49] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                  {modalSelectedLeadIds.length} Selected
                </span>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {availableFacultyLeads.map((f) => {
                  const isSelected = modalSelectedLeadIds.includes(f.id);
                  const cleanName = f.displayName.replace(/^Workshop Lead:\s*/i, '');
                  const displayName = cleanName || f.displayName;
                  return (
                    <div
                      key={f.id}
                      onClick={() => handleToggleModalLead(f.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none ${
                        isSelected
                          ? 'bg-sky-50/70 border-[#002B49] shadow-2xs ring-1 ring-[#002B49]/20'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${
                            isSelected
                              ? 'bg-[#002B49] border-[#002B49] text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {displayName}
                            </span>
                            {f.role === 'workshop_lead' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                Workshop Lead
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 truncate">
                            {f.department || 'Academic Faculty'} • {f.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <strong>Leadership Privileges:</strong> Assigned workshop leads will have supervisory authority over this curriculum track, including monitoring progress and adding workshops.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setLeadAssignModalSeries(null)}
                disabled={isSavingLeads}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAssignedLeads}
                disabled={isSavingLeads}
                className="px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#003d66] disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isSavingLeads ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Save Lead Assignments</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workshop Deletion Modal (inside Series Detail View) */}
      {deletingWorkshop && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  Delete Workshop Specification?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-bold text-slate-900">
                    &quot;{deletingWorkshop.prefix} {deletingWorkshop.code}: {deletingWorkshop.title}&quot;
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 text-xs space-y-1 mt-3">
              <div className="font-bold flex items-center gap-1.5 text-slate-800">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                <span>Curriculum Removal Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-600">
                As a Workshop Lead, deleting this workshop will permanently remove it from this series track and university catalog.
              </p>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isDeletingWorkshop}
                onClick={() => setDeletingWorkshop(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingWorkshop}
                onClick={handleConfirmDeleteWorkshop}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeletingWorkshop ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
