import { Workshop, Material } from '../types';

export interface WorkshopDevelopmentStep {
  id: string;
  number: string;
  label: string;
  description: string;
  isDone: boolean;
  statusText: string;
  detail: string;
  weight: number;
}

export interface WorkshopProgressSummary {
  steps: WorkshopDevelopmentStep[];
  completedCount: number;
  totalCount: number;
  percentage: number;
  isFullyCompleted: boolean;
  readinessLabel: 'Ready for Approval' | 'In Progress' | 'Initial Draft' | 'Completed';
  readinessColor: {
    bg: string;
    text: string;
    border: string;
    barColor: string;
  };
}

export const calculateWorkshopProgress = (
  workshop: Partial<Workshop> | null | undefined,
  allMaterials: Material[] = []
): WorkshopProgressSummary => {
  if (!workshop) {
    return {
      steps: [],
      completedCount: 0,
      totalCount: 8,
      percentage: 0,
      isFullyCompleted: false,
      readinessLabel: 'Initial Draft',
      readinessColor: {
        bg: 'bg-slate-100',
        text: 'text-slate-700',
        border: 'border-slate-200',
        barColor: 'bg-slate-400',
      },
    };
  }

  // 1. General Overview
  const hasOverview = Boolean(
    workshop.prefix?.trim() &&
    workshop.code?.trim() &&
    workshop.title?.trim() &&
    workshop.description?.trim()
  );
  const overviewDetail = hasOverview
    ? `${workshop.prefix} ${workshop.code}: ${workshop.title}`
    : !workshop.title
    ? 'Missing workshop title & code'
    : 'Incomplete description or code prefix';

  // 2. Learning Outcomes
  const outcomesCount = workshop.learningOutcomes?.length || 0;
  const hasOutcomes = outcomesCount > 0;
  const outcomesDetail = hasOutcomes
    ? `${outcomesCount} Bloom's outcome(s) defined`
    : 'No learning outcomes added';

  // 3. 2-Hour Timeline
  const totalMinutes = (workshop.topics || []).reduce(
    (sum, t) => sum + (Number(t.durationMinutes) || 0),
    0
  );
  const hasTimeline = totalMinutes === 120;
  const timelineDetail =
    totalMinutes === 120
      ? '120/120 mins exact requirement fulfilled'
      : totalMinutes === 0
      ? '0/120 mins (timeline not planned)'
      : totalMinutes < 120
      ? `${totalMinutes}/120 mins (${120 - totalMinutes} mins remaining)`
      : `${totalMinutes}/120 mins (${totalMinutes - 120} mins over limit)`;

  // 4. Activities & Labs
  const activitiesCount = workshop.activities?.length || 0;
  const hasActivities = activitiesCount > 0;
  const activitiesDetail = hasActivities
    ? `${activitiesCount} interactive activity/activities designed`
    : 'No experiential activities planned';

  // 5. Resources & References
  const reqResourcesCount = workshop.requiredResources?.length || 0;
  const optResourcesCount = workshop.optionalResources?.length || 0;
  const totalResources = reqResourcesCount + optResourcesCount;
  const hasResources = totalResources > 0;
  const resourcesDetail = hasResources
    ? `${totalResources} resource(s) linked (${reqResourcesCount} required, ${optResourcesCount} optional)`
    : 'No reading references or resources listed';

  // 6. Dimensions Matrix
  const dimensions = (workshop.dimensionsOfKnowledge || {}) as Record<string, string | undefined>;
  const ratedDimensionsCount = Object.values(dimensions).filter(
    (v) => Boolean(v && v !== 'NA' && v !== '')
  ).length;
  const hasDimensions = ratedDimensionsCount >= 6 || Object.keys(dimensions).length >= 6;
  const dimensionsDetail =
    ratedDimensionsCount >= 6
      ? 'All 6 UCW accreditation dimensions evaluated'
      : ratedDimensionsCount > 0
      ? `${ratedDimensionsCount}/6 dimensions rated`
      : '0/6 dimensions rated';

  // 7. Materials & Content
  const workshopCodeStr = `${workshop.prefix || ''} ${workshop.code || ''}`.trim().toLowerCase();
  const directMaterialsCount = allMaterials.filter((m: any) => {
    if (workshop.id && m.workshopId === workshop.id) return true;
    if (workshop.id && m.workshopIds && m.workshopIds.includes(workshop.id)) return true;
    if (workshopCodeStr && m.workshopCode && m.workshopCode.trim().toLowerCase() === workshopCodeStr) return true;
    return false;
  }).length;
  const hasNotes = Boolean(workshop.contentNotes?.trim());
  const hasMaterials = directMaterialsCount > 0 || hasNotes;
  const materialsDetail =
    directMaterialsCount > 0 && hasNotes
      ? `${directMaterialsCount} file(s) attached + lecture notes`
      : directMaterialsCount > 0
      ? `${directMaterialsCount} file(s) uploaded/attached`
      : hasNotes
      ? 'Lecture notes / outline provided'
      : 'No files or lecture notes attached';

  // 8. Faculty Collaborators
  const devsCount = workshop.assignedDevelopers?.length || 0;
  const hasDevelopers = devsCount > 0;
  const developersDetail = hasDevelopers
    ? `${devsCount} faculty developer(s) assigned`
    : 'No faculty developer assigned';

  const steps: WorkshopDevelopmentStep[] = [
    {
      id: 'overview',
      number: '01',
      label: 'General Overview',
      description: 'Course prefix, code, title, level, and description',
      isDone: hasOverview,
      statusText: hasOverview ? 'Done' : 'Not Done',
      detail: overviewDetail,
      weight: 1,
    },
    {
      id: 'outcomes',
      number: '02',
      label: 'Learning Outcomes',
      description: "Bloom's taxonomy learning objective statements",
      isDone: hasOutcomes,
      statusText: hasOutcomes ? 'Done' : 'Not Done',
      detail: outcomesDetail,
      weight: 1,
    },
    {
      id: 'timeline',
      number: '03',
      label: '2-Hour Timeline',
      description: 'Topics & time allocations summing to 120 minutes',
      isDone: hasTimeline,
      statusText: hasTimeline ? 'Done' : totalMinutes > 0 ? 'In Progress' : 'Not Done',
      detail: timelineDetail,
      weight: 1,
    },
    {
      id: 'activities',
      number: '04',
      label: 'Activities & Labs',
      description: 'Experiential learning exercises & instructions',
      isDone: hasActivities,
      statusText: hasActivities ? 'Done' : 'Not Done',
      detail: activitiesDetail,
      weight: 1,
    },
    {
      id: 'resources',
      number: '05',
      label: 'Resources & References',
      description: 'Required & optional reading material or tool links',
      isDone: hasResources,
      statusText: hasResources ? 'Done' : 'Not Done',
      detail: resourcesDetail,
      weight: 1,
    },
    {
      id: 'dimensions',
      number: '06',
      label: 'Dimensions Matrix',
      description: 'Accreditation ratings across 6 UCW skill domains',
      isDone: hasDimensions,
      statusText: hasDimensions ? 'Done' : ratedDimensionsCount > 0 ? 'In Progress' : 'Not Done',
      detail: dimensionsDetail,
      weight: 1,
    },
    {
      id: 'materials',
      number: '07',
      label: 'Materials & Content',
      description: 'Slide decks, handouts, case studies, or lecture notes',
      isDone: hasMaterials,
      statusText: hasMaterials ? 'Done' : 'Not Done',
      detail: materialsDetail,
      weight: 1,
    },
    {
      id: 'collaborators',
      number: '08',
      label: 'Faculty Collaborators',
      description: 'Assigned lead author and contributing developers',
      isDone: hasDevelopers,
      statusText: hasDevelopers ? 'Done' : 'Not Done',
      detail: developersDetail,
      weight: 1,
    },
  ];

  const completedCount = steps.filter((s) => s.isDone).length;
  const totalCount = steps.length;
  const percentage = Math.round((completedCount / totalCount) * 100);
  const isFullyCompleted = completedCount === totalCount;

  let readinessLabel: 'Ready for Approval' | 'In Progress' | 'Initial Draft' | 'Completed' = 'Initial Draft';
  let readinessColor = {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    barColor: 'bg-slate-500',
  };

  if (isFullyCompleted || workshop.status === 'Approved') {
    readinessLabel = 'Completed';
    readinessColor = {
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-300',
      barColor: 'bg-emerald-500',
    };
  } else if (completedCount >= 6) {
    readinessLabel = 'Ready for Approval';
    readinessColor = {
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-300',
      barColor: 'bg-blue-500',
    };
  } else if (completedCount >= 3) {
    readinessLabel = 'In Progress';
    readinessColor = {
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-300',
      barColor: 'bg-amber-500',
    };
  }

  return {
    steps,
    completedCount,
    totalCount,
    percentage,
    isFullyCompleted,
    readinessLabel,
    readinessColor,
  };
};
