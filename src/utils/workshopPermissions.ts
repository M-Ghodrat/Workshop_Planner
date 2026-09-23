import { Workshop, WorkshopSeries, UserProfile } from '../types';

/**
 * Normalizes email or name for resilient string comparison.
 */
const normalizeStr = (str?: string | null): string => {
  return (str || '').trim().toLowerCase();
};

/**
 * Checks whether a given user is an assigned developer or author of a workshop.
 */
export const isUserAssignedToWorkshop = (
  workshop: Partial<Workshop> | null | undefined,
  userProfile: UserProfile | null | undefined
): boolean => {
  if (!workshop || !userProfile) return false;

  const uid = userProfile.id || '';
  const userEmail = normalizeStr(userProfile.email);
  const userName = normalizeStr(userProfile.displayName);

  // 1. Author / Creator matching
  if (uid && workshop.createdBy === uid) return true;
  if (userName && normalizeStr(workshop.createdByName) === userName) return true;

  // 2. Assigned developer IDs array
  if (Array.isArray(workshop.assignedDeveloperIds) && uid) {
    if (workshop.assignedDeveloperIds.includes(uid)) return true;
  }

  // 3. Assigned developers array of collaborator objects
  if (Array.isArray(workshop.assignedDevelopers) && workshop.assignedDevelopers.length > 0) {
    const isMatched = workshop.assignedDevelopers.some((dev) => {
      if (!dev) return false;
      if (uid && dev.id && dev.id === uid) return true;
      if (userEmail && dev.email && normalizeStr(dev.email) === userEmail) return true;
      if (userName && dev.name && normalizeStr(dev.name) === userName) return true;

      // Resilient alias matching for UCW faculty members
      const devName = normalizeStr(dev.name);
      const devEmail = normalizeStr(dev.email);

      if (userEmail.includes('mohsen') || userName.includes('mohsen')) {
        if (devName.includes('mohsen') || devEmail.includes('mohsen')) return true;
      }
      if (userEmail.includes('cheryl') || userName.includes('cheryl')) {
        if (devName.includes('cheryl') || devEmail.includes('cheryl')) return true;
      }
      if (userEmail.includes('amirhossein') || userEmail.includes('zaji') || userName.includes('zaji')) {
        if (devName.includes('zaji') || devName.includes('amirhossein') || devEmail.includes('zaji') || devEmail.includes('amirhossein')) return true;
      }
      if (userEmail.includes('developer') || userName.includes('developer')) {
        if (devName.includes('developer') || devEmail.includes('developer')) return true;
      }
      return false;
    });

    if (isMatched) return true;
  }

  return false;
};

/**
 * Checks whether a workshop belongs to a specific workshop series.
 */
export const isWorkshopInSeries = (
  workshop: Partial<Workshop> | null | undefined,
  series: Partial<WorkshopSeries> | null | undefined
): boolean => {
  if (!workshop || !series) return false;

  // Match by ID
  if (workshop.seriesId && series.id && workshop.seriesId === series.id) return true;

  // Match by series.workshopIds
  if (Array.isArray(series.workshopIds) && workshop.id && series.workshopIds.includes(workshop.id)) {
    return true;
  }

  // Match by series name
  if (
    workshop.seriesName &&
    series.name &&
    normalizeStr(workshop.seriesName) === normalizeStr(series.name)
  ) {
    return true;
  }

  // Match by department prefix
  if (
    workshop.prefix &&
    series.prefix &&
    workshop.prefix.trim().toUpperCase() === series.prefix.trim().toUpperCase()
  ) {
    return true;
  }

  return false;
};

/**
 * Checks whether a series has any workshops assigned to the user.
 */
export const isSeriesAssignedToDeveloper = (
  series: Partial<WorkshopSeries> | null | undefined,
  allWorkshops: Workshop[],
  userProfile: UserProfile | null | undefined
): boolean => {
  if (!series || !userProfile || !Array.isArray(allWorkshops)) return false;

  return allWorkshops.some(
    (w) => isWorkshopInSeries(w, series) && isUserAssignedToWorkshop(w, userProfile)
  );
};

/**
 * Checks whether the current user is the Workshop Lead responsible for a series.
 */
export const isUserLeadOfSeries = (
  series: WorkshopSeries | null | undefined,
  userProfile: UserProfile | null | undefined
): boolean => {
  if (!series || !userProfile) return false;
  const uid = userProfile.id || '';
  const userEmail = normalizeStr(userProfile.email);
  const userName = normalizeStr(userProfile.displayName);

  if (series.leadId && uid && series.leadId === uid) return true;
  if (series.leadEmail && userEmail && normalizeStr(series.leadEmail) === userEmail) return true;
  if (series.leadName && userName && normalizeStr(series.leadName) === userName) return true;
  if (series.createdBy && uid && series.createdBy === uid) return true;
  if (series.createdByName && userName && normalizeStr(series.createdByName) === userName) return true;

  // Domain heuristics for designated leads
  const sText = `${series.name || ''} ${series.coreFocus || ''} ${series.prefix || ''}`.toLowerCase();

  // Dr. Mohsen Ghodrat -> AI & Technology tracks
  if (userEmail.includes('mohsen') || userName.includes('mohsen')) {
    if (sText.includes('entrepreneur') || sText.includes('management') || sText.includes('analytics') || sText.includes('data')) {
      return false;
    }
    if (sText.includes('ai') || sText.includes('artificial') || sText.includes('tech')) {
      return true;
    }
  }

  // Cheryl Thomas -> Entrepreneurship & Management tracks
  if (userEmail.includes('cheryl') || userName.includes('cheryl')) {
    if (sText.includes('ai') || sText.includes('artificial') || sText.includes('analytics') || sText.includes('data')) {
      return false;
    }
    if (sText.includes('entrepreneur') || sText.includes('management') || sText.includes('leadership')) {
      return true;
    }
  }

  // Amirhossein Zaji -> Analytics & Data tracks
  if (userEmail.includes('amirhossein') || userEmail.includes('zaji') || userName.includes('zaji')) {
    if (sText.includes('ai') || sText.includes('entrepreneur')) {
      return false;
    }
    if (sText.includes('analytics') || sText.includes('data')) {
      return true;
    }
  }

  return false;
};

/**
 * Checks whether the user can modify (edit details, delete, add workshops to) a series.
 * Developers ALWAYS have read-only access to series.
 */
export const canUserModifySeries = (
  series: WorkshopSeries | null | undefined,
  userProfile: UserProfile | null | undefined
): boolean => {
  if (!series || !userProfile) return false;

  // Program Administrator (Orkhon, admin@ucanwest.ca) can modify
  if (userProfile.role === 'administrator') return true;

  // Project Lead (Komil) does not edit series info or add series
  if (userProfile.role === 'project_lead') return false;

  // Workshop Lead can only modify their own assigned series
  if (userProfile.role === 'workshop_lead') {
    return isUserLeadOfSeries(series, userProfile);
  }

  // Developers have READ-ONLY access to series
  return false;
};

/**
 * Checks whether the user can edit a specific workshop.
 */
export const canUserModifyWorkshop = (
  workshop: Workshop | null | undefined,
  userProfile: UserProfile | null | undefined,
  allSeries: WorkshopSeries[] = []
): boolean => {
  if (!workshop || !userProfile) return false;

  // Program Administrator Orkhon
  if (userProfile.role === 'administrator') return true;

  // Project Lead Komil does not modify workshops
  if (userProfile.role === 'project_lead') return false;

  // Workshop Lead
  if (userProfile.role === 'workshop_lead') {
    // 1. Author or assigned developer
    if (isUserAssignedToWorkshop(workshop, userProfile)) {
      return true;
    }
    // 2. Lead of this workshop's parent series
    const parentSeries = allSeries.find((s) => isWorkshopInSeries(workshop, s));
    if (parentSeries && isUserLeadOfSeries(parentSeries, userProfile)) {
      return true;
    }
    return false;
  }

  // Developer: Can edit assigned workshops IF status is not "Approved"
  if (userProfile.role === 'developer' || !userProfile.role) {
    if (isUserAssignedToWorkshop(workshop, userProfile)) {
      return workshop.status !== 'Approved';
    }
    return false;
  }

  return false;
};

/**
 * Determines whether a user has permission to view the complete content (editor, outline modules,
 * teaching materials, timeline activities) of a workshop.
 *
 * Requirements:
 * 1. Administrator (Orkhon, admin) and Project Lead (Komil) have institutional management view.
 * 2. If the user is the Workshop Lead of the series this workshop belongs to, they can see full content.
 * 3. If the user is assigned as a developer (or created) this workshop, they can see full content.
 * 4. Otherwise:
 *    When a workshop lead or developer does not belong to the series, they cannot view the full content.
 *    They only have access to the short overview summary.
 */
export const canUserViewFullWorkshopContent = (
  workshop: Workshop | null | undefined,
  userProfile: UserProfile | null | undefined,
  allSeries: WorkshopSeries[] = []
): boolean => {
  if (!workshop || !userProfile) return false;

  // Program Administrator and Project Lead
  if (userProfile.role === 'administrator' || userProfile.role === 'project_lead') {
    return true;
  }

  // Author or assigned developer of this workshop
  if (isUserAssignedToWorkshop(workshop, userProfile)) {
    return true;
  }

  // Workshop Lead: only if they are the lead of the series this workshop belongs to
  if (userProfile.role === 'workshop_lead') {
    const parentSeries = allSeries.find((s) => isWorkshopInSeries(workshop, s));
    if (parentSeries && isUserLeadOfSeries(parentSeries, userProfile)) {
      return true;
    }
    return false;
  }

  // Other developers or roles who are not assigned to this workshop
  return false;
};

