import React, { useState, useMemo } from 'react';
import {
  Layers,
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Check,
  HelpCircle,
  Sparkles,
  Info,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { courseService } from '../../services/courseService';
import { Course, OutcomeMapping, Workshop, WorkshopSeries, LearningOutcome, BloomsTaxonomy } from '../../types';
import { isUserLeadOfSeries, isSeriesAssignedToDeveloper } from '../../utils/workshopPermissions';

interface OutcomeMappingProps {
  courses: Course[];
  series: WorkshopSeries[];
  workshops: Workshop[];
  mappings: OutcomeMapping[];
}

export const OutcomeMappingView: React.FC<OutcomeMappingProps> = ({
  courses = [],
  series = [],
  workshops = [],
  mappings = [],
}) => {
  const { userProfile, isWorkshopLead } = useAuth();
  const { success, error } = useToast();

  const canEdit = isWorkshopLead; // Workshop leads can map, others can only see

  // Helper to resolve all potential user UIDs (including mock aliases used in database seeds/creation)
  const userIds = useMemo(() => {
    if (!userProfile) return [];
    const ids = [userProfile.id];
    const email = (userProfile.email || '').toLowerCase();
    const name = (userProfile.displayName || '').toLowerCase();

    // Mapping for Mohsen Ghodrat
    if (name.includes('mohsen') || email.includes('mohsen')) {
      ids.push('lead_mohsen_ghodrat');
      ids.push('dev_mohsen_ghodrat');
    }
    // Mapping for Cheryl Thomas
    if (name.includes('cheryl') || email.includes('cheryl')) {
      ids.push('lead_cheryl_thomas');
      ids.push('dev_cheryl_thomas');
    }
    // Mapping for Amirhossein Zaji
    if (name.includes('amirhossein') || email.includes('amirhossein') || name.includes('zaji') || email.includes('zaji')) {
      ids.push('lead_amirhossein_zaji');
      ids.push('dev_amirhossein_zaji');
    }
    return ids;
  }, [userProfile]);

  // Filter series list first so we can reference its prefixes for courses
  const filteredSeriesList = useMemo(() => {
    if (isWorkshopLead && userProfile) {
      return series.filter((s) => {
        // 1. Is designated lead of this series (centralized permission utility including domain heuristics)
        if (isUserLeadOfSeries(s, userProfile)) return true;

        // 2. Created by this lead or their alias, or they are the lead
        if (userIds.includes(s.createdBy)) return true;
        if (s.leadId && userIds.includes(s.leadId)) return true;
        if (s.leadEmail && s.leadEmail.toLowerCase() === userProfile.email?.toLowerCase()) return true;

        // 3. Or they are assigned to any workshop belonging to this series
        if (isSeriesAssignedToDeveloper(s, workshops, userProfile)) return true;

        return false;
      });
    }
    return series;
  }, [series, isWorkshopLead, userProfile, userIds, workshops]);

  // Filter courses & series for workshop lead
  const filteredCoursesList = useMemo(() => {
    if (isWorkshopLead && userProfile) {
      return courses.filter((c) => {
        // 1. Created by this lead or their alias
        if (userIds.includes(c.createdBy)) return true;

        // 2. Official courses created by Administrators are universally accessible for mapping
        const isOfficialAdminCourse = 
          c.createdBy === 'demo-admin-ucw-01' || 
          c.createdBy?.startsWith('admin') || 
          c.createdBy === 'admin';
        if (isOfficialAdminCourse) return true;

        // 3. Course is tagged with one of the lead's accessible series (e.g. AI series, Entrepreneurship series)
        const isTaggedToMySeries = Array.isArray(c.seriesIds) && c.seriesIds.some((seriesId) =>
          filteredSeriesList.some((s) => s.id === seriesId)
        );
        if (isTaggedToMySeries) return true;

        // 4. Any course that is currently mapped to any of the lead's series or workshops
        const isMappedToMyTarget = mappings.some((m) => {
          if (m.courseId !== c.id) return false;
          if (m.targetType === 'series') {
            const targetSeries = series.find((s) => s.id === m.targetId);
            return targetSeries && (
              isUserLeadOfSeries(targetSeries, userProfile) ||
              userIds.includes(targetSeries.createdBy) ||
              (targetSeries.leadId && userIds.includes(targetSeries.leadId))
            );
          } else {
            const targetWorkshop = workshops.find((w) => w.id === m.targetId);
            return targetWorkshop && (
              userIds.includes(targetWorkshop.createdBy) ||
              (targetWorkshop.assignedDeveloperIds && targetWorkshop.assignedDeveloperIds.some((id) => userIds.includes(id)))
            );
          }
        });

        return isMappedToMyTarget;
      });
    }
    return courses;
  }, [courses, isWorkshopLead, userProfile, userIds, mappings, series, workshops, filteredSeriesList]);

  // Active Selections
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSeries, setSelectedSeries] = useState<WorkshopSeries | null>(null);
  const [mappingType, setMappingType] = useState<'series' | 'workshop'>('workshop');
  const [courseLoFilter, setCourseLoFilter] = useState<string>('all');

  // Modal / Form States
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseName, setCourseName] = useState('');
  const [coursePrefix, setCoursePrefix] = useState('');
  const [courseDesc, setCourseDesc] = useState('');
  const [courseOutline, setCourseOutline] = useState('');
  const [courseLos, setCourseLos] = useState<LearningOutcome[]>([]);
  const [associatedSeriesIds, setAssociatedSeriesIds] = useState<string[]>([]);
  const [newLoText, setNewLoText] = useState('');
  const [newLoBloom, setNewLoBloom] = useState<BloomsTaxonomy>('Understand');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Confirmation States
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Sync selected elements when data loads
  React.useEffect(() => {
    if (filteredCoursesList.length > 0 && (!selectedCourse || !filteredCoursesList.some(c => c.id === selectedCourse.id))) {
      setSelectedCourse(filteredCoursesList[0]);
    } else if (filteredCoursesList.length === 0) {
      setSelectedCourse(null);
    }

    if (filteredSeriesList.length > 0 && (!selectedSeries || !filteredSeriesList.some(s => s.id === selectedSeries.id))) {
      setSelectedSeries(filteredSeriesList[0]);
    } else if (filteredSeriesList.length === 0) {
      setSelectedSeries(null);
    }
  }, [filteredCoursesList, filteredSeriesList, selectedCourse, selectedSeries]);

  // Open Course Modal
  const handleOpenCourseModal = (course: Course | null = null) => {
    if (!canEdit) return;
    if (course) {
      setEditingCourse(course);
      setCourseName(course.name);
      setCoursePrefix(course.prefix);
      setCourseDesc(course.description || '');
      setCourseOutline(course.courseOutline || '');
      setCourseLos(course.learningOutcomes || []);
      setAssociatedSeriesIds(course.seriesIds || []);
    } else {
      setEditingCourse(null);
      setCourseName('');
      setCoursePrefix('');
      setCourseDesc('');
      setCourseOutline('');
      setCourseLos([]);
      setAssociatedSeriesIds(selectedSeries?.id ? [selectedSeries.id] : []);
    }
    setNewLoText('');
    setNewLoBloom('Understand');
    setIsCourseModalOpen(true);
  };

  // Add LO to Course Builder
  const handleAddCourseLo = () => {
    if (!newLoText.trim()) return;
    const newLo: LearningOutcome = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      code: `CO${courseLos.length + 1}`, // Course Outcome 1, 2, 3
      text: newLoText.trim(),
      bloomLevel: newLoBloom,
    };
    setCourseLos([...courseLos, newLo]);
    setNewLoText('');
  };

  // Remove LO from Course Builder
  const handleRemoveCourseLo = (id: string) => {
    const filtered = courseLos.filter((lo) => lo.id !== id);
    // Re-code
    const reCoded = filtered.map((lo, idx) => ({
      ...lo,
      code: `CO${idx + 1}`,
    }));
    setCourseLos(reCoded);
  };

  // Save Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim() || !coursePrefix.trim() || !userProfile) return;

    if (associatedSeriesIds.length === 0) {
      error('Validation Error', 'Please select at least one associated Workshop Track (Series).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Automatically add any typed-in learning outcome text that was not explicitly added using the "Add Course LO" button
      let finalLos = [...courseLos];
      if (newLoText.trim()) {
        const autoLo: LearningOutcome = {
          id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
          code: `CO${finalLos.length + 1}`,
          text: newLoText.trim(),
          bloomLevel: newLoBloom,
        };
        finalLos.push(autoLo);
      }

      const payload = {
        name: courseName.trim(),
        prefix: coursePrefix.trim().toUpperCase(),
        description: courseDesc.trim(),
        courseOutline: courseOutline.trim(),
        learningOutcomes: finalLos,
        seriesIds: associatedSeriesIds,
      };

      if (editingCourse && editingCourse.id) {
        await courseService.updateCourse(editingCourse.id, payload);
        success('Course Updated', `"${courseName}" outcomes updated.`);
        if (selectedCourse?.id === editingCourse.id) {
          setSelectedCourse({ ...editingCourse, ...payload });
        }
      } else {
        const newId = await courseService.createCourse(payload, userProfile);
        success('Course Created', `"${courseName}" outline defined.`);
        setSelectedCourse({ id: newId, ...payload, createdBy: userProfile.id });
      }
      setIsCourseModalOpen(false);
    } catch (err: any) {
      error('Course Save Failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Course Confirmation Request
  const requestDeleteCourse = (course: Course) => {
    setCourseToDelete(course);
  };

  // Perform actual deletion after custom confirmation modal
  const handleConfirmDeleteCourse = async () => {
    if (!courseToDelete?.id) return;
    setIsDeleting(true);
    try {
      await courseService.deleteCourse(courseToDelete.id);
      await courseService.deleteMappingsForCourse(courseToDelete.id);
      success('Course Removed', `"${courseToDelete.name}" has been deleted.`);
      if (selectedCourse?.id === courseToDelete.id) {
        setSelectedCourse(filteredCoursesList.find((c) => c.id !== courseToDelete.id) || null);
      }
      setCourseToDelete(null);
    } catch (err: any) {
      error('Delete Failed', err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Mappings
  const handleCellClick = async (courseLoId: string, targetLoId: string, targetType: 'series' | 'workshop', targetId: string) => {
    if (!canEdit || !selectedCourse?.id || !userProfile) return;

    try {
      await courseService.toggleMapping({
        courseId: selectedCourse.id,
        courseLoId,
        targetType,
        targetId,
        targetLoId,
        mappedBy: userProfile.id,
      }, userProfile);
    } catch (err: any) {
      error('Mapping Update Failed', err.message);
    }
  };

  // Filtered columns of Course Learning Outcomes
  const filteredCourseLos = useMemo(() => {
    if (!selectedCourse) return [];
    const outcomes = selectedCourse.learningOutcomes || [];
    if (courseLoFilter === 'all') return outcomes;
    return outcomes.filter((lo) => lo.id === courseLoFilter);
  }, [selectedCourse, courseLoFilter]);

  // Find workshops belonging to selected series
  const activeSeriesWorkshops = useMemo(() => {
    if (!selectedSeries) return [];
    return workshops.filter((w) => w.seriesId === selectedSeries.id);
  }, [selectedSeries, workshops]);

  // Flat list of individual workshop learning outcomes for rows
  const flatWorkshopLos = useMemo(() => {
    const items: { workshop: Workshop; lo: LearningOutcome }[] = [];
    activeSeriesWorkshops.forEach((w) => {
      const outcomes = w.learningOutcomes || [];
      outcomes.forEach((lo) => {
        items.push({ workshop: w, lo });
      });
    });
    return items;
  }, [activeSeriesWorkshops]);

  // Check if mapping exists using strict unique ID checking
  const isMapped = (courseLoId: string, targetLoId: string, targetId: string) => {
    return mappings.some(
      (m) =>
        m.courseId === selectedCourse?.id &&
        m.courseLoId === courseLoId &&
        m.targetLoId === targetLoId &&
        m.targetId === targetId
    );
  };

  // Helper for Bloom's Taxonomy Badge colors
  const getBloomBadgeClass = (bloom: BloomsTaxonomy) => {
    switch (bloom) {
      case 'Remember':
        return 'bg-slate-100 text-slate-800 border border-slate-200';
      case 'Understand':
        return 'bg-blue-50 text-blue-800 border border-blue-200';
      case 'Apply':
        return 'bg-emerald-50 text-emerald-800 border border-emerald-200';
      case 'Analyze':
        return 'bg-amber-50 text-amber-800 border border-amber-200';
      case 'Evaluate':
        return 'bg-orange-50 text-orange-800 border border-orange-200';
      case 'Create':
        return 'bg-purple-50 text-purple-800 border border-purple-200';
      default:
        return 'bg-slate-50 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Learning Outcome Mapping
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Map University Canada West course outcomes against workshop series and individual workshop outcomes.
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => handleOpenCourseModal()}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add University Course</span>
          </button>
        )}
      </div>

      {/* Role Notice Banner */}
      {!canEdit && (
        <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-[#002B49] shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-[#002B49]">View-Only Access:</span> As a program lead, administrator, or academic affairs representative, you have read-only privileges. You can view, filter, and analyze maps, but modifications are restricted to workshop leads.
          </div>
        </div>
      )}

      {/* Main Split Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Panel: Course Catalog Selector */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>University Courses ({filteredCoursesList.length})</span>
            </h3>

            {filteredCoursesList.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                No courses defined yet.
                {canEdit && (
                  <button
                    onClick={() => handleOpenCourseModal()}
                    className="mt-2 text-xs font-bold text-sky-600 hover:underline block mx-auto cursor-pointer"
                  >
                    Add Course Outlines
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredCoursesList.map((course) => {
                  const isSelected = selectedCourse?.id === course.id;
                  return (
                    <div
                      key={course.id}
                      onClick={() => {
                        setSelectedCourse(course);
                        setCourseLoFilter('all');
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer select-none text-left relative group ${
                        isSelected
                          ? 'bg-sky-50/50 border-sky-400 shadow-2xs'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-[#002B49] text-white text-[9px] font-extrabold">
                              {course.prefix}
                            </span>
                            <span className="text-xs font-bold text-slate-900 group-hover:text-[#002B49] transition-colors">
                              {course.name}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {course.learningOutcomes?.length || 0} course outcomes
                          </span>
                        </div>
                        
                        {canEdit && (
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenCourseModal(course);
                              }}
                              className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer"
                              title="Edit Course Outline"
                            >
                              <Edit className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                requestDeleteCourse(course);
                              }}
                              className="p-1 rounded bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                              title="Delete Course Outline"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected Course Quick View Card */}
          {selectedCourse && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 text-left">
              <div className="border-b border-slate-100 pb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#002B49]">Active Course Focus</span>
                <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedCourse.prefix} Outline</h4>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 block">Syllabus Overview:</span>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    {selectedCourse.description || 'No description provided.'}
                  </p>
                </div>
                {selectedCourse.courseOutline && (
                  <div>
                    <span className="font-semibold text-slate-500 block">Course Syllabus:</span>
                    <p className="text-slate-600 mt-0.5 leading-relaxed whitespace-pre-line font-medium bg-slate-50 p-2 rounded-lg border border-slate-100 max-h-[300px] overflow-y-auto">
                      {selectedCourse.courseOutline}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Interactive Mapping Visual / Matrix Workspace */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              {/* Filter by Series */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-500 shrink-0">Track:</span>
                <select
                  value={selectedSeries?.id || ''}
                  onChange={(e) => setSelectedSeries(filteredSeriesList.find((s) => s.id === e.target.value) || null)}
                  className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden"
                >
                  {filteredSeriesList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.prefix || 'UCW'} • {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter by Course Outcome */}
              {selectedCourse && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500 shrink-0">Course LO:</span>
                  <select
                    value={courseLoFilter}
                    onChange={(e) => setCourseLoFilter(e.target.value)}
                    className="px-2.5 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white text-slate-800 focus:outline-hidden"
                  >
                    <option value="all">All Outcomes (CO)</option>
                    {(selectedCourse.learningOutcomes || []).map((lo) => (
                      <option key={lo.id} value={lo.id}>
                        {lo.code} ({lo.bloomLevel})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Toggle Level mapping */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1 shrink-0 self-start md:self-auto">
              <button
                onClick={() => setMappingType('workshop')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mappingType === 'workshop'
                    ? 'bg-[#002B49] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Workshop LOs
              </button>
              <button
                onClick={() => setMappingType('series')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  mappingType === 'series'
                    ? 'bg-[#002B49] text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Series LOs
              </button>
            </div>
          </div>

          {/* Core Mapping Grid Workspace */}
          {!selectedCourse ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-2xs">
              <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Please select or add a course to begin outcome mapping</p>
            </div>
          ) : !selectedSeries ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-2xs">
              <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-semibold">Please define at least one Workshop Series to start mapping</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
              
              {/* Matrix visual banner info */}
              <div className="p-4 bg-[#002B49] text-white flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
                  <span className="text-xs font-bold">
                    Active Mapping Map: {selectedCourse.prefix} ⟷ {selectedSeries.name}
                  </span>
                </div>
                <div className="text-[10px] uppercase tracking-wider font-extrabold text-sky-200">
                  {canEdit ? 'Click intersection cell to toggle association' : 'Read-Only View'}
                </div>
              </div>

              {/* Responsive matrix container with switched rows & columns */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse select-none">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      {/* Column 1 header: Target LO Detail */}
                      <th className="p-4 text-left text-xs font-bold text-slate-500 border-r border-slate-200 min-w-[320px] max-w-[400px]">
                        {mappingType === 'series' ? 'Series Outcomes' : 'Workshop Outcomes'} <br />
                        <span className="font-medium text-[10px] text-slate-400">({selectedSeries.name})</span>
                      </th>

                      {/* Other headers: Course Learning Outcomes (CO columns) */}
                      {filteredCourseLos.map((co) => (
                        <th key={co.id} className="p-3 text-center border-r border-slate-200 min-w-[130px] align-top">
                          <div className="space-y-1">
                            <span className="px-2 py-0.5 text-[9px] font-black tracking-wider bg-[#002B49] text-amber-300 rounded-md">
                              {co.code}
                            </span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded border uppercase tracking-wide block w-fit mx-auto ${getBloomBadgeClass(co.bloomLevel)}`}>
                              {co.bloomLevel}
                            </span>
                            <p className="text-[10px] font-semibold text-slate-600 line-clamp-2 text-center px-1 leading-snug hover:line-clamp-none transition-all duration-150 cursor-help" title={co.text}>
                              {co.text}
                            </p>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {mappingType === 'series' ? (
                      // 1. Series Level Outcomes rows
                      (selectedSeries.learningOutcomes || []).length === 0 ? (
                        <tr>
                          <td colSpan={filteredCourseLos.length + 1} className="p-8 text-center text-xs text-slate-400 bg-slate-50/50">
                            No learning outcomes defined for this series. Please edit this series to define outcomes.
                          </td>
                        </tr>
                      ) : (
                        (selectedSeries.learningOutcomes || []).map((lo) => (
                          <tr key={lo.id} className="hover:bg-sky-50/10 transition-colors">
                            {/* Series Outcome Detail in First Column */}
                            <td className="p-4 border-r border-slate-200 text-left align-top max-w-[320px]">
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-[#002B49] text-sm shrink-0">
                                    {lo.code}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getBloomBadgeClass(lo.bloomLevel)}`}>
                                    {lo.bloomLevel}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                                  {lo.text}
                                </p>
                              </div>
                            </td>

                            {/* Switch position: toggle cells for each Course Outcome */}
                            {filteredCourseLos.map((co) => {
                              const active = isMapped(co.id, lo.id, selectedSeries.id || '');
                              return (
                                <td
                                  key={co.id}
                                  onClick={() => handleCellClick(co.id, lo.id, 'series', selectedSeries.id || '')}
                                  className={`p-4 border-r border-slate-200 text-center transition-all ${
                                    canEdit ? 'cursor-pointer hover:bg-sky-50' : 'cursor-default'
                                  } ${active ? 'bg-sky-500/10' : ''}`}
                                >
                                  <div className="flex items-center justify-center">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                        active
                                          ? 'bg-sky-600 text-white shadow-2xs border border-sky-500 scale-110'
                                          : canEdit
                                          ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:scale-105'
                                          : 'bg-transparent border border-dashed border-slate-200'
                                      }`}
                                    >
                                      {active ? (
                                        <Check className="w-4 h-4 stroke-[3px]" />
                                      ) : canEdit ? (
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )
                    ) : (
                      // 2. Individual Workshops outcomes rows
                      flatWorkshopLos.length === 0 ? (
                        <tr>
                          <td colSpan={filteredCourseLos.length + 1} className="p-8 text-center text-xs text-slate-400 bg-slate-50/50">
                            No learning outcomes defined in the workshops of this series. Please edit your workshops to define outcomes.
                          </td>
                        </tr>
                      ) : (
                        flatWorkshopLos.map(({ workshop, lo }) => (
                          <tr key={`${workshop.id}-${lo.id}`} className="hover:bg-sky-50/10 transition-colors">
                            {/* Workshop Outcome Detail in First Column */}
                            <td className="p-4 border-r border-slate-200 text-left align-top max-w-[320px]">
                              <div className="space-y-1.5 text-left">
                                {/* Workshop badge/identifier */}
                                <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[9px] font-extrabold border border-slate-200 uppercase tracking-wide">
                                    {workshop.prefix} {workshop.code}
                                  </span>
                                  <span className="text-[10px] font-bold text-slate-500 truncate max-w-[150px]" title={workshop.title}>
                                    {workshop.title}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="font-black text-[#002B49] text-xs shrink-0">
                                    {lo.code}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${getBloomBadgeClass(lo.bloomLevel)}`}>
                                    {lo.bloomLevel}
                                  </span>
                                </div>
                                <p className="text-xs font-semibold text-slate-700 leading-relaxed">
                                  {lo.text}
                                </p>
                              </div>
                            </td>

                            {/* Toggle cells for each Course Outcome */}
                            {filteredCourseLos.map((co) => {
                              const active = isMapped(co.id, lo.id, workshop.id || '');
                              return (
                                <td
                                  key={co.id}
                                  onClick={() => handleCellClick(co.id, lo.id, 'workshop', workshop.id || '')}
                                  className={`p-4 border-r border-slate-200 text-center transition-all ${
                                    canEdit ? 'cursor-pointer hover:bg-sky-50' : 'cursor-default'
                                  } ${active ? 'bg-sky-500/10' : ''}`}
                                >
                                  <div className="flex items-center justify-center">
                                    <div
                                      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                                        active
                                          ? 'bg-sky-600 text-white shadow-2xs border border-sky-500 scale-110'
                                          : canEdit
                                          ? 'bg-slate-100 hover:bg-slate-200 border border-slate-200 hover:scale-105'
                                          : 'bg-transparent border border-dashed border-slate-200'
                                      }`}
                                    >
                                      {active ? (
                                        <Check className="w-4 h-4 stroke-[3px]" />
                                      ) : canEdit ? (
                                        <div className="w-1.5 h-1.5 bg-slate-300 rounded-full" />
                                      ) : null}
                                    </div>
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {/* No outcomes defined fallbacks */}
              {filteredCourseLos.length === 0 && (
                <div className="p-12 text-center text-slate-400 bg-slate-50 border-t border-slate-200">
                  <HelpCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">No outcomes match the active filters or course specification.</p>
                </div>
              )}
            </div>
          )}

          {/* Pedagogy Legend */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3 text-left">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700">Bloom's Taxonomy Cognitive Domains Legend</h4>
            <div className="flex flex-wrap gap-2">
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-100 text-slate-800 border border-slate-200 uppercase tracking-wide">
                Remember • Knowledge Retrieval
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50 text-blue-800 border border-blue-200 uppercase tracking-wide">
                Understand • Comprehension
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase tracking-wide">
                Apply • Execution & Practice
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wide">
                Analyze • Differentiation & Organization
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-orange-50 text-orange-800 border border-orange-200 uppercase tracking-wide">
                Evaluate • Critique & Standards
              </span>
              <span className="text-[10px] font-bold px-2 py-1 rounded bg-purple-50 text-purple-800 border border-purple-200 uppercase tracking-wide">
                Create • Design & Innovation
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* University Course Builder Modal */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              {editingCourse ? 'Edit Course Outline & LOs' : 'Define University Course Outline'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter academic course specifications and outcomes to build curriculum mappings.
            </p>

            <form onSubmit={handleSaveCourse} className="space-y-4 text-left">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Course Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quantitative Business Methods"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prefix <span className="text-rose-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="BUSI 601"
                    value={coursePrefix}
                    onChange={(e) => setCoursePrefix(e.target.value)}
                    className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl uppercase focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Description & Objectives
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide brief course syllabus overview..."
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Course Outline (Syllabus Structure)
                </label>
                <textarea
                  rows={2}
                  placeholder="Paste or write course weekly schedule/syllabus outline..."
                  value={courseOutline}
                  onChange={(e) => setCourseOutline(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              {/* Course Learning Outcomes list builder */}
              <div className="border-t border-slate-100 pt-3 space-y-3">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Course Learning Outcomes (CO) ({courseLos.length})
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    Enter outcomes defined in official university syllabus specifications.
                  </p>
                </div>

                {courseLos.length > 0 && (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                    {courseLos.map((lo) => (
                      <div key={lo.id} className="flex items-start gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
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
                          onClick={() => handleRemoveCourseLo(lo.id)}
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
                        placeholder="e.g. Conduct hypothesis testing for complex business cohorts..."
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
                      onClick={handleAddCourseLo}
                      className="px-3 py-1 rounded-lg bg-[#002B49] text-white text-[10px] font-bold hover:bg-sky-900 flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-amber-400" />
                      <span>Add Course LO</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Series (Tracks) Association Tags */}
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Associated Workshop Tracks (Series) <span className="text-rose-500">*</span>
                </label>
                <p className="text-[10px] text-slate-400">
                  Select which tracks/series this course outline is available to.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {series.map((s) => {
                    const isChecked = associatedSeriesIds.includes(s.id || '');
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold cursor-pointer select-none transition-all ${
                          isChecked
                            ? 'bg-sky-50/50 border-sky-400 text-sky-950 font-bold'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAssociatedSeriesIds([...associatedSeriesIds, s.id || '']);
                            } else {
                              setAssociatedSeriesIds(associatedSeriesIds.filter((id) => id !== s.id));
                            }
                          }}
                          className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                        />
                        <span>{s.prefix || 'UCW'} • {s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCourseModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#003d66] rounded-xl shadow-xs cursor-pointer"
                >
                  {isSubmitting ? 'Saving...' : editingCourse ? 'Save Changes' : 'Define Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Course Warning/Confirmation Modal */}
      {courseToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150 text-left">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="p-2.5 rounded-full bg-rose-50 border border-rose-100">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                Delete University Course?
              </h3>
            </div>

            <div className="space-y-3.5">
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to delete the course <span className="font-extrabold text-slate-900">"{courseToDelete.prefix} • {courseToDelete.name}"</span>?
              </p>

              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-1 text-[11px]">
                <div className="flex items-center gap-1.5 font-bold text-amber-950">
                  <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                  <span>CRITICAL WARNING</span>
                </div>
                <p className="leading-normal font-semibold">
                  This action is permanent and cannot be undone. Deleting this university course outline will:
                </p>
                <ul className="list-disc pl-4 space-y-0.5 leading-normal font-medium mt-1">
                  <li>Permanently erase its syllabus and course description</li>
                  <li>Erase all of its associated Course Learning Outcomes (CO)</li>
                  <li>Permanently destroy <span className="font-bold">all mapped outcome alignments</span> with workshop series and individual workshops</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCourseToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCourse}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Course'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
