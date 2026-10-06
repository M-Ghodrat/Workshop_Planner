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
 * Helper to clean lead names by removing titles and role prefixes
 */
const cleanLeadName = (n?: string): string => {
  return normalizeStr(n)
    .replace(/^workshop\s+lead:\s*/i, '')
    .replace(/^dr\.?\s*/i, '')
    .replace(/^prof\.?\s*/i, '')
    .trim();
};

const isMohsenLeadIdentity = (id?: string, email?: string, name?: string): boolean => {
  const normId = (id || '').toLowerCase();
  const normEmail = (email || '').toLowerCase();
  const normName = (name || '').toLowerCase();
  return (
    normId.includes('mohsen_ghodrat') ||
    normEmail.includes('mohsen.ghodrat') ||
    normEmail.includes('mohsenghodrat') ||
    normName.includes('mohsen ghodrat')
  );
};

const isCherylLeadIdentity = (id?: string, email?: string, name?: string): boolean => {
  const normId = (id || '').toLowerCase();
  const normEmail = (email || '').toLowerCase();
  const normName = (name || '').toLowerCase();
  return (
    normId.includes('cheryl') ||
    normEmail.includes('cheryl') ||
    normName.includes('cheryl')
  );
};

const isZajiLeadIdentity = (id?: string, email?: string, name?: string): boolean => {
  const normId = (id || '').toLowerCase();
  const normEmail = (email || '').toLowerCase();
  const normName = (name || '').toLowerCase();
  return (
    normId.includes('zaji') ||
    normEmail.includes('zaji') ||
    normName.includes('zaji') ||
    normName.includes('amirhossein')
  );
};

/**
 * Checks whether a workshop belongs to a specific workshop series.
 * NOTE: Never match by prefix alone, because prefixes can be shared across series
 * or exist after a series is deleted.
 */
export const isWorkshopInSeries = (
  workshop: Partial<Workshop> | null | undefined,
  series: Partial<WorkshopSeries> | null | undefined
): boolean => {
  if (!workshop || !series) return false;

  // 1. Match by explicit ID link (primary source of truth)
  if (workshop.seriesId && series.id && workshop.seriesId === series.id) {
    return true;
  }

  // 2. Match by series.workshopIds
  if (Array.isArray(series.workshopIds) && workshop.id && series.workshopIds.includes(workshop.id)) {
    return true;
  }

  // 3. Match by series name ONLY if seriesId is not set
  if (
    !workshop.seriesId &&
    workshop.seriesName &&
    series.name &&
    normalizeStr(workshop.seriesName) === normalizeStr(series.name)
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

  // 1. Match identity for Mohsen Ghodrat
  if (isMohsenLeadIdentity(uid, userEmail, userName)) {
    if (Array.isArray(series.leadIds) && series.leadIds.some((id) => id.includes('mohsen'))) return true;
    if (Array.isArray(series.leads) && series.leads.some((l) => isMohsenLeadIdentity(l.id, l.email, l.name))) return true;
    if (isMohsenLeadIdentity(series.leadId, series.leadEmail, series.leadName)) return true;
    if (isMohsenLeadIdentity(series.createdBy, undefined, series.createdByName)) return true;
  }

  // 2. Match identity for Cheryl Thomas
  if (isCherylLeadIdentity(uid, userEmail, userName)) {
    if (Array.isArray(series.leadIds) && series.leadIds.some((id) => id.includes('cheryl'))) return true;
    if (Array.isArray(series.leads) && series.leads.some((l) => isCherylLeadIdentity(l.id, l.email, l.name))) return true;
    if (isCherylLeadIdentity(series.leadId, series.leadEmail, series.leadName)) return true;
  }

  // 3. Match identity for Amirhossein Zaji
  if (isZajiLeadIdentity(uid, userEmail, userName)) {
    if (Array.isArray(series.leadIds) && series.leadIds.some((id) => id.includes('zaji'))) return true;
    if (Array.isArray(series.leads) && series.leads.some((l) => isZajiLeadIdentity(l.id, l.email, l.name))) return true;
    if (isZajiLeadIdentity(series.leadId, series.leadEmail, series.leadName)) return true;
  }

  // 4. Explicit multi-lead assignments (set by Program Administrator)
  if (Array.isArray(series.leadIds) && uid && series.leadIds.includes(uid)) return true;
  if (Array.isArray(series.leads) && series.leads.some((l) =>
    (uid && l.id === uid) ||
    (userEmail && l.email && normalizeStr(l.email) === userEmail) ||
    (userName && l.name && cleanLeadName(l.name) === cleanLeadName(userProfile.displayName))
  )) return true;

  if (series.leadId && uid && series.leadId === uid) return true;
  if (series.leadEmail && userEmail && normalizeStr(series.leadEmail) === userEmail) return true;
  if (series.leadName && userName && cleanLeadName(series.leadName) === cleanLeadName(userProfile.displayName)) return true;
  if (series.createdBy && uid && series.createdBy === uid) return true;
  if (series.createdByName && userName && cleanLeadName(series.createdByName) === cleanLeadName(userProfile.displayName)) return true;

  // 5. Domain heuristics for designated leads if no explicit assignments exist
  const sText = `${series.name || ''} ${series.coreFocus || ''} ${series.prefix || ''}`.toLowerCase();

  // Dr. Mohsen Ghodrat -> AI, Technology, Cloud & DevOps tracks
  if (userEmail.includes('mohsen') || userName.includes('mohsen')) {
    if (sText.includes('entrepreneur') || sText.includes('management') || sText.includes('analytics') || sText.includes('data')) {
      return false;
    }
    if (sText.includes('ai') || sText.includes('artificial') || sText.includes('tech') || sText.includes('cloud') || sText.includes('devops')) {
      return true;
    }
  }

  // Cheryl Thomas -> Entrepreneurship & Management tracks
  if (userEmail.includes('cheryl') || userName.includes('cheryl')) {
    if (sText.includes('ai') || sText.includes('artificial') || sText.includes('analytics') || sText.includes('data') || sText.includes('cloud')) {
      return false;
    }
    if (sText.includes('entrepreneur') || sText.includes('management') || sText.includes('leadership') || sText.includes('busi')) {
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
 * Checks whether a workshop is an orphan (its series was deleted or never assigned).
 */
export const isWorkshopOrphan = (
  workshop: Partial<Workshop> | null | undefined,
  allSeries: WorkshopSeries[] = []
): boolean => {
  if (!workshop) return false;

  // 1. If explicit seriesId is present, check if that specific series exists
  if (workshop.seriesId) {
    const exists = allSeries.some((s) => s.id === workshop.seriesId);
    if (!exists) return true; // Series was deleted!
    return false; // Active parent series found
  }

  // 2. If no seriesId, check if any active series actually contains this workshop in workshopIds
  if (workshop.id) {
    const belongsToActiveSeries = allSeries.some(
      (s) => Array.isArray(s.workshopIds) && s.workshopIds.includes(workshop.id!)
    );
    if (belongsToActiveSeries) return false;
  }

  // 3. Check if seriesName matches an active series
  if (workshop.seriesName) {
    const nameExists = allSeries.some(
      (s) => s.name && normalizeStr(s.name) === normalizeStr(workshop.seriesName!)
    );
    if (nameExists) return false;
  }

  return true;
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
    const parentSeries = allSeries.find(
      (s) => (s.id && workshop.seriesId && s.id === workshop.seriesId) || isWorkshopInSeries(workshop, s)
    );
    if (parentSeries && isUserLeadOfSeries(parentSeries, userProfile)) {
      return true;
    }
    // 3. Orphan workshop: if its series was deleted or missing, workshop leads can manage / reassign / delete it!
    if (isWorkshopOrphan(workshop, allSeries)) {
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
 * 3. If the workshop is orphaned (series deleted), Workshop Leads can view full content to inspect or reassign.
 * 4. If the user is assigned as a developer (or created) this workshop, they can see full content.
 * 5. Otherwise:
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

  // Workshop Lead:
  if (userProfile.role === 'workshop_lead') {
    // 1. Orphan workshop: allow Workshop Lead to view full content to inspect, reassign or delete
    if (isWorkshopOrphan(workshop, allSeries)) {
      return true;
    }
    // 2. Workshop in an active series they lead
    const parentSeries = allSeries.find(
      (s) => (s.id && workshop.seriesId && s.id === workshop.seriesId) || isWorkshopInSeries(workshop, s)
    );
    if (parentSeries && isUserLeadOfSeries(parentSeries, userProfile)) {
      return true;
    }
    return false;
  }

  // Other developers or roles who are not assigned to this workshop
  return false;
};

