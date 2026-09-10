import React, { useState, useEffect } from 'react';
import {
  Save,
  Eye,
  ArrowLeft,
  BookOpen,
  GraduationCap,
  Clock,
  Lightbulb,
  Bookmark,
  Award,
  FileText,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Layers,
  Check,
  ListOrdered,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { workshopService } from '../../services/workshopService';
import { materialService } from '../../services/materialService';
import { Workshop, WorkshopSeries, WorkshopStatus, Material, UserProfile } from '../../types';

import { OverviewTab } from './tabs/OverviewTab';
import { LearningOutcomesTab } from './tabs/LearningOutcomesTab';
import { TimelineTab } from './tabs/TimelineTab';
import { ActivitiesTab } from './tabs/ActivitiesTab';
import { ResourcesTab } from './tabs/ResourcesTab';
import { KnowledgeDimensionsTab } from './tabs/KnowledgeDimensionsTab';
import { MaterialsTab } from './tabs/MaterialsTab';
import { CollaboratorsTab } from './tabs/CollaboratorsTab';
import { FullOverviewTab } from './tabs/FullOverviewTab';

interface WorkshopEditorProps {
  initialWorkshop?: Workshop | null;
  allWorkshops: Workshop[];
  allSeries: WorkshopSeries[];
  allMaterials: Material[];
  allUsers: UserProfile[];
  onBack: () => void;
  onPreview: (workshop: Workshop) => void;
  onOpenMaterialPreview: (material: Material) => void;
  onDirtyChange?: (
    isDirty: boolean,
    summary: { prefix: string; code: string; title: string; isNew: boolean }
  ) => void;
  onWorkshopSaved?: (workshop: Workshop) => void;
  saveRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  resetDraftRef?: React.MutableRefObject<(() => void) | null>;
}

type TabType =
  | 'overview'
  | 'outcomes'
  | 'timeline'
  | 'activities'
  | 'resources'
  | 'dimensions'
  | 'materials'
  | 'collaborators'
  | 'full-overview';

const normalizeWorkshopForComparison = (w: Workshop) => {
  return JSON.stringify({
    prefix: w.prefix?.trim() || '',
    code: w.code?.trim() || '',
    title: w.title?.trim() || '',
    description: w.description?.trim() || '',
    seriesId: w.seriesId || '',
    level: w.level || 'Foundation',
    status: w.status || 'In Development',
    startDate: w.startDate || '',
    endDate: w.endDate || '',
    startTime: w.startTime || '',
    endTime: w.endTime || '',
    totalDurationMinutes: Number(w.totalDurationMinutes) || 0,
    prerequisites: w.prerequisites || '',
    hasNoPrerequisites: Boolean(w.hasNoPrerequisites),
    contentNotes: w.contentNotes?.trim() || '',
    instructorNotes: w.instructorNotes?.trim() || '',
    equipmentRequirements: w.equipmentRequirements?.trim() || '',
    learningOutcomes: (w.learningOutcomes || []).map((o) => ({
      code: o.code || '',
      text: o.text?.trim() || '',
      bloomLevel: o.bloomLevel || '',
    })),
    topics: (w.topics || []).map((t) => ({
      title: t.title?.trim() || '',
      durationMinutes: Number(t.durationMinutes) || 0,
      description: t.description?.trim() || '',
      subtopics: (t.subtopics || []).map((s) => ({
        title: s.title?.trim() || '',
        description: s.description?.trim() || '',
        durationMinutes: Number(s.durationMinutes) || 0,
      })),
    })),
    activities: (w.activities || []).map((a) => ({
      title: a.title?.trim() || '',
      type: a.type || '',
      estimatedMinutes: Number(a.estimatedMinutes) || 0,
      description: a.description?.trim() || '',
      instructions: a.instructions?.trim() || '',
    })),
    requiredResources: (w.requiredResources || []).map((r) => ({
      title: r.title?.trim() || '',
      description: r.description?.trim() || '',
      url: r.url || '',
      materialId: r.materialId || '',
      materialName: r.materialName || '',
    })),
    optionalResources: (w.optionalResources || []).map((r) => ({
      title: r.title?.trim() || '',
      description: r.description?.trim() || '',
      url: r.url || '',
      materialId: r.materialId || '',
      materialName: r.materialName || '',
    })),
    dimensionsOfKnowledge: w.dimensionsOfKnowledge || {},
    assignedDeveloperIds: (w.assignedDeveloperIds || []).slice().sort(),
  });
};

export const WorkshopEditor: React.FC<WorkshopEditorProps> = ({
  initialWorkshop,
  allWorkshops = [],
  allSeries = [],
  allMaterials = [],
  allUsers = [],
  onBack,
  onPreview,
  onOpenMaterialPreview,
  onDirtyChange,
  onWorkshopSaved,
  saveRef,
  resetDraftRef,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const safeMaterials = Array.isArray(allMaterials) ? allMaterials : [];
  const safeWorkshops = Array.isArray(allWorkshops) ? allWorkshops : [];
  const safeSeries = Array.isArray(allSeries) ? allSeries : [];
  const safeUsers = Array.isArray(allUsers) ? allUsers : [];

  const isEditing = Boolean(initialWorkshop?.id);

  const createInitialState = (): Workshop => {
    if (initialWorkshop) return { ...initialWorkshop };

    const creatorId = userProfile?.id || '';
    const creatorName = userProfile?.displayName || 'Faculty Member';

    return {
      prefix: '',
      code: '',
      title: '',
      description: '',
      seriesId: '',
      seriesName: '',
      prerequisites: 'No prerequisite',
      hasNoPrerequisites: true,
      status: 'In Development',
      assignedDeveloperIds: creatorId ? [creatorId] : [],
      assignedDevelopers: creatorId
        ? [
            {
              id: creatorId,
              name: creatorName,
              email: userProfile?.email || '',
              department: userProfile?.department || 'Faculty Member',
              role: 'Lead Developer',
            },
          ]
        : [],
      learningOutcomes: [],
      totalDurationMinutes: 120,
      topics: [],
      activities: [],
      requiredResources: [],
      optionalResources: [],
      dimensionsOfKnowledge: {},
      createdBy: creatorId,
      createdByName: creatorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  };

  // Initialize workshop state with comprehensive defaults
  const [workshop, setWorkshop] = useState<Workshop>(createInitialState);
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    normalizeWorkshopForComparison(createInitialState())
  );

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [focusedTopicId, setFocusedTopicId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  const [hasStagedMaterialFile, setHasStagedMaterialFile] = useState(false);

  // Synchronize when initialWorkshop changes
  useEffect(() => {
    if (initialWorkshop) {
      const fresh = { ...initialWorkshop };
      setWorkshop(fresh);
      setSavedSnapshot(normalizeWorkshopForComparison(fresh));
      setHasStagedMaterialFile(false);
    } else {
      const fresh = createInitialState();
      setWorkshop(fresh);
      setSavedSnapshot(normalizeWorkshopForComparison(fresh));
      setHasStagedMaterialFile(false);
    }
  }, [initialWorkshop]);

  // Compute dirty status
  const isDirty = React.useMemo(() => {
    const currentNormalized = normalizeWorkshopForComparison(workshop);
    return currentNormalized !== savedSnapshot || hasStagedMaterialFile;
  }, [workshop, savedSnapshot, hasStagedMaterialFile]);

  // Browser reload / tab close safety interceptor
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = 'You have unsaved workshop changes that will be lost.';
        return 'You have unsaved workshop changes that will be lost.';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Notify parent component about dirty status
  useEffect(() => {
    if (onDirtyChange) {
      onDirtyChange(isDirty, {
        prefix: workshop.prefix,
        code: workshop.code,
        title: workshop.title,
        isNew: !isEditing,
      });
    }
  }, [isDirty, workshop.prefix, workshop.code, workshop.title, isEditing, onDirtyChange]);

  // Expose resetDraftRef to parent
  useEffect(() => {
    if (resetDraftRef) {
      resetDraftRef.current = () => {
        const fresh = initialWorkshop ? { ...initialWorkshop } : createInitialState();
        setWorkshop(fresh);
        setSavedSnapshot(normalizeWorkshopForComparison(fresh));
      };
    }
    return () => {
      if (resetDraftRef) resetDraftRef.current = null;
    };
  }, [initialWorkshop, resetDraftRef]);

  // Filter available series for developers
  const userId = userProfile?.id || '';
  const availableSeries = React.useMemo(() => {
    if (isAdmin) return safeSeries;
    const devWorkshops = safeWorkshops.filter(
      (w) =>
        w.createdBy === userId ||
        (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId))
    );
    const devSeriesIds = new Set(devWorkshops.map((w) => w.seriesId).filter(Boolean));
    if (workshop.seriesId) {
      devSeriesIds.add(workshop.seriesId);
    }
    return safeSeries.filter((s) => devSeriesIds.has(s.id) || s.createdBy === userId);
  }, [safeSeries, safeWorkshops, isAdmin, userId, workshop.seriesId]);

  // Validation
  const validateForm = () => {
    if (!workshop.prefix?.trim()) {
      error('Validation Error', 'Please specify a workshop prefix (e.g. BUSI, MGMT, TECH).');
      setActiveTab('overview');
      return false;
    }
    if (!workshop.code?.trim()) {
      error('Validation Error', 'Please enter a workshop code (e.g. 654).');
      setActiveTab('overview');
      return false;
    }
    if (!workshop.title?.trim()) {
      error('Validation Error', 'Please enter a workshop title.');
      setActiveTab('overview');
      return false;
    }
    return true;
  };

  const handleSave = async (silent = false): Promise<boolean> => {
    if (!validateForm() || !userProfile) return false;

    setIsSaving(true);
    try {
      // Find matching existing workshop:
      // 1. By direct valid workshop.id
      // 2. Or by same prefix & code (case-insensitive)
      const existingWorkshop = safeWorkshops.find((w) => {
        if (workshop.id && !workshop.id.startsWith('ws_draft_') && w.id === workshop.id) {
          return true;
        }
        if (
          workshop.prefix?.trim() &&
          workshop.code?.trim() &&
          w.prefix?.trim().toLowerCase() === workshop.prefix?.trim().toLowerCase() &&
          w.code?.trim().toLowerCase() === workshop.code?.trim().toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      const targetId =
        workshop.id && !workshop.id.startsWith('ws_draft_')
          ? workshop.id
          : existingWorkshop?.id;

      if (targetId) {
        // Overwrite / update existing workshop
        const workshopToSave: Workshop = {
          ...workshop,
          id: targetId,
        };
        await workshopService.updateWorkshop(targetId, workshopToSave, userProfile);

        const oldTempId = workshop.id;
        if (oldTempId && oldTempId !== targetId) {
          await materialService.relinkMaterialsToWorkshop(
            oldTempId,
            targetId,
            `${workshop.prefix || ''} ${workshop.code || ''}: ${workshop.title || ''}`.trim()
          );
        }

        setWorkshop(workshopToSave);
        setSavedSnapshot(normalizeWorkshopForComparison(workshopToSave));
        setHasStagedMaterialFile(false);
        onWorkshopSaved?.(workshopToSave);
        if (!silent) success('Workshop Saved', `${workshop.prefix} ${workshop.code} updated successfully.`);
      } else {
        // First-time creation for this prefix and code
        const oldTempId = workshop.id;
        const newId = await workshopService.createWorkshop(workshop, userProfile);
        if (oldTempId && oldTempId !== newId) {
          await materialService.relinkMaterialsToWorkshop(
            oldTempId,
            newId,
            `${workshop.prefix || ''} ${workshop.code || ''}: ${workshop.title || ''}`.trim()
          );
        }
        const updated: Workshop = { ...workshop, id: newId };
        setWorkshop(updated);
        setSavedSnapshot(normalizeWorkshopForComparison(updated));
        setHasStagedMaterialFile(false);
        onWorkshopSaved?.(updated);
        if (!silent) success('Workshop Created', `${workshop.prefix} ${workshop.code} saved.`);
      }
      setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch (err: any) {
      error('Save Failed', err.message || 'Could not save workshop.');
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Expose saveRef to parent
  useEffect(() => {
    if (saveRef) {
      saveRef.current = async () => {
        return await handleSave(true);
      };
    }
    return () => {
      if (saveRef) saveRef.current = null;
    };
  }, [workshop, userProfile, isEditing, saveRef]);

  const totalMinutes = (workshop.topics || []).reduce(
    (acc, t) => acc + (Number(t.durationMinutes) || 0),
    0
  );

  // Count rated dimensions (out of 6)
  const ratedDimensionsCount = React.useMemo(() => {
    const dims = workshop.dimensionsOfKnowledge || {};
    return Object.values(dims).filter((v) => Boolean(v && v !== '')).length;
  }, [workshop.dimensionsOfKnowledge]);

  // Compute accurate materials matching this workshop
  const workshopMaterialsCount = React.useMemo(() => {
    return safeMaterials.filter((m) => {
      if (workshop.id && m.workshopId === workshop.id) return true;
      const isReferencedInResources =
        (workshop.requiredResources || []).some((r) => r.materialId === m.id) ||
        (workshop.optionalResources || []).some((r) => r.materialId === m.id);
      if (isReferencedInResources) return true;
      if (
        workshop.prefix?.trim() &&
        workshop.code?.trim() &&
        m.workshopTitle &&
        m.workshopTitle.toLowerCase().includes(`${workshop.prefix.trim().toLowerCase()} ${workshop.code.trim().toLowerCase()}`)
      ) {
        return true;
      }
      return false;
    }).length;
  }, [safeMaterials, workshop.id, workshop.prefix, workshop.code, workshop.requiredResources, workshop.optionalResources]);

  // Table of Contents sections definition
  const tocSections: {
    id: TabType;
    number: string;
    label: string;
    description: string;
    icon: React.FC<any>;
    badge?: string;
    isFilled?: boolean;
    isOverview?: boolean;
  }[] = [
    {
      id: 'overview',
      number: '01',
      label: 'General Overview',
      description: 'Workshop code, title, series & description',
      icon: BookOpen,
      badge: workshop.title ? 'Configured' : 'Needs info',
      isFilled: Boolean(workshop.prefix && workshop.code && workshop.title),
    },
    {
      id: 'outcomes',
      number: '02',
      label: 'Learning Outcomes',
      description: "Bloom's taxonomy statements",
      icon: GraduationCap,
      badge: `${workshop.learningOutcomes?.length || 0} outcomes`,
      isFilled: (workshop.learningOutcomes?.length || 0) > 0,
    },
    {
      id: 'timeline',
      number: '03',
      label: '2-Hour Timeline',
      description: 'Topics & time allocations',
      icon: Clock,
      badge: `${totalMinutes}/120m`,
      isFilled: totalMinutes === 120,
    },
    {
      id: 'activities',
      number: '04',
      label: 'Activities & Labs',
      description: 'Experiential learning exercises',
      icon: Lightbulb,
      badge: `${workshop.activities?.length || 0} activities`,
      isFilled: (workshop.activities?.length || 0) > 0,
    },
    {
      id: 'resources',
      number: '05',
      label: 'Resources & References',
      description: 'Required & optional reading/links',
      icon: Bookmark,
      badge: `${(workshop.requiredResources?.length || 0) + (workshop.optionalResources?.length || 0)} resources`,
      isFilled: ((workshop.requiredResources?.length || 0) + (workshop.optionalResources?.length || 0)) > 0,
    },
    {
      id: 'dimensions',
      number: '06',
      label: 'Dimensions Matrix',
      description: 'UCW 6 accreditation ratings',
      icon: Award,
      badge: ratedDimensionsCount > 0 ? `${ratedDimensionsCount}/6 rated` : '0/6 rated',
      isFilled: ratedDimensionsCount === 6,
    },
    {
      id: 'materials',
      number: '07',
      label: 'Materials & Content',
      description: 'Files, lecture notes, slides & checklist',
      icon: FileText,
      badge: `${workshopMaterialsCount} files${workshop.contentNotes ? ' + notes' : ''}`,
      isFilled: workshopMaterialsCount > 0 || Boolean(workshop.contentNotes?.trim()),
    },
    {
      id: 'collaborators',
      number: '08',
      label: 'Faculty Collaborators',
      description: 'Assigned authors & developers',
      icon: Users,
      badge: `${workshop.assignedDevelopers?.length || 0} authors`,
      isFilled: (workshop.assignedDevelopers?.length || 0) > 0,
    },
    {
      id: 'full-overview',
      number: '09',
      label: 'Complete Workshop Overview',
      description: 'Full document preview (Non-editable)',
      icon: Layers,
      badge: 'All-in-one View',
      isOverview: true,
      isFilled: true,
    },
  ];

  const currentSectionIndex = tocSections.findIndex((s) => s.id === activeTab);
  const currentSection = tocSections[currentSectionIndex] || tocSections[0];

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setActiveTab(tocSections[currentSectionIndex - 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < tocSections.length - 1) {
      setActiveTab(tocSections[currentSectionIndex + 1].id);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Workshop Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-3">
              <button
                onClick={onBack}
                className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Return to list"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-600 flex items-center gap-2">
                <span>Workshop Outline</span>
                <span>•</span>
                <span className="text-slate-400">UCW Curriculum Builder</span>
              </div>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-none text-slate-950 uppercase">
              {workshop.prefix || 'CODE'} {workshop.code || '###'}
            </h1>

            <div className="text-lg sm:text-xl font-light text-slate-600">
              {workshop.title || 'Application & Curriculum Workshop Specification'}
            </div>

            <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-wider text-slate-400 pt-1 flex-wrap">
              <span className="text-slate-700">{workshop.seriesName || 'General Academic Series'}</span>
              <span>•</span>
              <span className={totalMinutes === 120 ? 'text-emerald-700' : 'text-amber-700'}>
                {totalMinutes}/120 MINS ALLOCATED
              </span>
              {lastSavedTime && (
                <>
                  <span>•</span>
                  <span>Last saved: {lastSavedTime}</span>
                </>
              )}
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex flex-col items-start lg:items-end gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                Status:
              </span>
              <select
                value={workshop.status}
                onChange={(e) =>
                  setWorkshop((prev) => ({ ...prev, status: e.target.value as WorkshopStatus }))
                }
                className="px-3 py-1.5 bg-amber-50 text-amber-900 border border-amber-300 rounded-full text-[11px] font-black uppercase tracking-wider focus:outline-hidden cursor-pointer"
              >
                <option value="In Development">In Development</option>
                <option value="Review">Review</option>
                <option value="Approved">Approved</option>
              </select>
            </div>

            <div className="flex items-center gap-2 mt-1">
              <button
                type="button"
                onClick={() => onPreview(workshop)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-900 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
              >
                <Eye className="w-3.5 h-3.5 text-blue-600" />
                <span>Document View</span>
              </button>

              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-black uppercase tracking-[0.2em] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-amber-300" />
                <span>{isSaving ? 'Saving...' : 'Save Outline'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet Table of Contents Dropdown Selector */}
        <div className="lg:hidden pt-4 border-t border-slate-200">
          <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
            Table of Contents (Jump to section):
          </label>
          <div className="relative">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value as TabType)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-900 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider focus:outline-hidden cursor-pointer"
            >
              {tocSections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.number}. {s.label} ({s.badge})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Two-Column Table of Contents + Active Section Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Interactive Table of Contents */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-4 lg:sticky lg:top-4">
          <div className="bg-[#002B49] text-white rounded-2xl border border-[#00385F]/60 shadow-md p-4 sm:p-5 space-y-4">
            <div className="border-b border-[#00385F]/60 pb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-sky-400" />
                <h3 className="text-xs font-black uppercase tracking-[0.18em] text-white">
                  Table of Contents
                </h3>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-sky-200 border border-white/10">
                {tocSections.length} Sections
              </span>
            </div>

            {/* List of Chapters/Sections */}
            <nav className="space-y-1.5" aria-label="Table of Contents">
              {tocSections.map((section) => {
                const isActive = activeTab === section.id;
                const IconComponent = section.icon;

                if (section.isOverview) {
                  return (
                    <div key={section.id} className="pt-2 mt-2 border-t border-[#00385F]/60">
                      <button
                        type="button"
                        onClick={() => setActiveTab(section.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                          isActive
                            ? 'bg-[#004270] text-white shadow-md border border-sky-400/40 ring-1 ring-sky-300/30'
                            : 'bg-white/10 border border-white/10 text-white hover:bg-white/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                              isActive ? 'bg-amber-400 text-slate-950' : 'bg-amber-400/30 text-amber-200'
                            }`}
                          >
                            {section.number}
                          </span>
                          <div className="min-w-0">
                            <div className="text-xs font-black uppercase tracking-tight truncate flex items-center gap-1.5">
                              <IconComponent className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                              <span>{section.label}</span>
                            </div>
                            <div
                              className={`text-[10px] truncate ${
                                isActive ? 'text-sky-200' : 'text-slate-300'
                              }`}
                            >
                              {section.description}
                            </div>
                          </div>
                        </div>
                        <ChevronRight
                          className={`w-4 h-4 shrink-0 ${
                            isActive ? 'text-amber-400' : 'text-slate-400'
                          }`}
                        />
                      </button>
                    </div>
                  );
                }

                return (
                  <div key={section.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab(section.id);
                        if (section.id === 'timeline' && workshop.topics?.[0]) {
                          setFocusedTopicId(workshop.topics[0].id);
                        }
                      }}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between cursor-pointer ${
                        isActive
                          ? 'bg-[#004270] text-white shadow-xs border border-sky-400/40 ring-1 ring-sky-300/30 font-bold'
                          : 'text-slate-200 hover:text-white hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isActive
                              ? 'bg-sky-500 text-white'
                              : section.isFilled
                              ? 'bg-white/20 text-white font-bold'
                              : 'bg-white/10 text-slate-300'
                          }`}
                        >
                          {section.number}
                        </span>
                        <div className="min-w-0">
                          <div className="text-xs font-bold truncate flex items-center gap-1.5">
                            <IconComponent
                              className={`w-3.5 h-3.5 shrink-0 ${
                                isActive ? 'text-sky-300' : 'text-slate-400'
                              }`}
                            />
                            <span className={isActive ? 'font-black text-white' : 'text-slate-200'}>
                              {section.label}
                            </span>
                          </div>
                          <div
                            className={`text-[10px] truncate ${
                              isActive ? 'text-sky-200/80' : 'text-slate-400'
                            }`}
                          >
                            {section.badge}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0 ml-2">
                        {section.isFilled && !isActive && (
                          <Check className="w-3 h-3 text-emerald-400" />
                        )}
                        <ChevronRight
                          className={`w-3.5 h-3.5 ${
                            isActive ? 'text-sky-300' : 'text-slate-400'
                          }`}
                        />
                      </div>
                    </button>

                    {/* Interactive Sub-items for Timeline (Topics) */}
                    {section.id === 'timeline' && isActive && (
                      <div className="pl-4 pr-1 py-1 space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                        {(workshop.topics || []).map((topic, tIdx) => {
                          const isTopicActive =
                            activeTab === 'timeline' &&
                            (focusedTopicId === topic.id || (!focusedTopicId && tIdx === 0));

                          return (
                            <button
                              key={topic.id || tIdx}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveTab('timeline');
                                setFocusedTopicId(topic.id);
                              }}
                              className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] transition-all flex items-center justify-between gap-2 cursor-pointer border ${
                                isTopicActive
                                  ? 'bg-[#00385F] border-sky-400/50 text-white font-bold shadow-2xs'
                                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span
                                  className={`w-4 h-4 rounded text-[9px] flex items-center justify-center font-black shrink-0 ${
                                    isTopicActive
                                      ? 'bg-sky-500 text-white'
                                      : 'bg-white/10 text-slate-300'
                                  }`}
                                >
                                  {tIdx + 1}
                                </span>
                                <span className="truncate">
                                  {topic.title?.trim()
                                    ? topic.title.replace(/^Topic \d+:\s*/i, '')
                                    : `Topic ${tIdx + 1}`}
                                </span>
                              </div>

                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${
                                  isTopicActive
                                    ? 'bg-sky-400/30 text-sky-200 border border-sky-300/30'
                                    : 'bg-white/10 text-slate-300'
                                }`}
                              >
                                {topic.durationMinutes || 0}m
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Quick Completion Footer in TOC */}
            <div className="pt-3 border-t border-[#00385F]/60">
              <button
                type="button"
                onClick={() => setActiveTab('full-overview')}
                className="w-full py-2 px-3 text-center text-xs font-black text-sky-200 bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5 text-sky-300" />
                <span>View Full Overview</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Right Column: Active Section Workspace */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6">
          {/* Section Breadcrumb & Header Title */}
          <div className="bg-[#002B49] text-white p-4 sm:p-5 rounded-2xl border border-[#00385F]/60 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-sky-500 text-white font-mono text-xs font-bold shadow-xs">
                SECTION {currentSection.number}
              </span>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
                  <span>{currentSection.label}</span>
                </h2>
                <p className="text-xs text-sky-200/80">{currentSection.description}</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={currentSectionIndex === 0}
                className="p-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Previous section"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextSection}
                disabled={currentSectionIndex === tocSections.length - 1}
                className="p-2 rounded-xl border border-white/15 bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                title="Next section"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Active Tab Workspace Content */}
          <div className="animate-in fade-in duration-150">
            {activeTab === 'overview' && (
              <OverviewTab
                workshop={workshop}
                setWorkshop={setWorkshop}
                allWorkshops={safeWorkshops}
                allSeries={availableSeries}
              />
            )}
            {activeTab === 'outcomes' && (
              <LearningOutcomesTab workshop={workshop} setWorkshop={setWorkshop} />
            )}
            {activeTab === 'timeline' && (
              <TimelineTab
                workshop={workshop}
                setWorkshop={setWorkshop}
                focusedTopicId={focusedTopicId}
              />
            )}
            {activeTab === 'activities' && (
              <ActivitiesTab workshop={workshop} setWorkshop={setWorkshop} />
            )}
            {activeTab === 'resources' && (
              <ResourcesTab
                workshop={workshop}
                setWorkshop={setWorkshop}
                allMaterials={safeMaterials}
              />
            )}
            {activeTab === 'dimensions' && (
              <KnowledgeDimensionsTab workshop={workshop} setWorkshop={setWorkshop} />
            )}
            {activeTab === 'materials' && (
              <MaterialsTab
                workshop={workshop}
                setWorkshop={setWorkshop}
                materials={safeMaterials}
                onOpenPreview={onOpenMaterialPreview}
                onStagedStateChange={setHasStagedMaterialFile}
              />
            )}
            {activeTab === 'collaborators' && (
              <CollaboratorsTab
                workshop={workshop}
                setWorkshop={setWorkshop}
                allUsers={safeUsers}
              />
            )}
            {activeTab === 'full-overview' && (
              <FullOverviewTab
                workshop={workshop}
                materials={safeMaterials}
                onNavigateToSection={(secId) => {
                  setActiveTab(secId as TabType);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                onOpenMaterialPreview={onOpenMaterialPreview}
              />
            )}
          </div>

          {/* Bottom Navigation & Save Action Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-start">
              <button
                type="button"
                onClick={handlePrevSection}
                disabled={currentSectionIndex === 0}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous Section</span>
              </button>

              <button
                type="button"
                onClick={handleNextSection}
                disabled={currentSectionIndex === tocSections.length - 1}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <span>Next Section</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => onPreview(workshop)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-black uppercase tracking-wider text-slate-800 hover:bg-slate-50 cursor-pointer shadow-xs"
              >
                Document Preview
              </button>
              <button
                type="button"
                onClick={() => handleSave(false)}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-black uppercase tracking-[0.2em] shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-amber-300" />
                <span>{isSaving ? 'Saving...' : 'Save Workshop'}</span>
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

