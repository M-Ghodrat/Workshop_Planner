export type UserRole = 'administrator' | 'developer';

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  department?: string;
  avatarUrl?: string;
  assignedWorkshopCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export type WorkshopStatus =
  | 'In Development'
  | 'Review'
  | 'Approved';

export type WorkshopLevel = 'Foundation' | 'Practitioner' | 'Professional';

export type BloomsTaxonomy =
  | 'Remember'
  | 'Understand'
  | 'Apply'
  | 'Analyze'
  | 'Evaluate'
  | 'Create';

export interface LearningOutcome {
  id: string;
  code: string; // e.g. LO1, LO2
  text: string;
  bloomLevel: BloomsTaxonomy;
}

export interface Subtopic {
  id: string;
  title: string;
  description?: string;
  durationMinutes?: number;
}

export interface Topic {
  id: string;
  order: number;
  title: string;
  description: string;
  durationMinutes: number;
  subtopics: Subtopic[];
}

export type ActivityType =
  | 'Individual Exercise'
  | 'Group Exercise'
  | 'Case Study'
  | 'Discussion'
  | 'Demonstration'
  | 'Hands-on Lab'
  | 'Simulation'
  | 'Reflection'
  | 'Quiz'
  | 'Presentation'
  | 'Other';

export interface WorkshopActivity {
  id: string;
  order: number;
  title: string;
  type: ActivityType;
  description: string;
  estimatedMinutes?: number;
  instructions?: string;
}

export interface WorkshopResource {
  id: string;
  title: string;
  description: string;
  url?: string;
  materialId?: string;
  materialName?: string;
}

export type DimensionRating = 'i' | 'r' | 'm' | 'i**' | 'r**' | 'm**' | 'NA' | '';

export interface DimensionsOfKnowledge {
  depthAndBreadth?: DimensionRating;
  methodologiesAndResearch?: DimensionRating;
  applicationOfKnowledge?: DimensionRating;
  communicationSkills?: DimensionRating;
  awarenessOfLimits?: DimensionRating;
  professionalCapacity?: DimensionRating;
}

export interface AssignedDeveloper {
  id: string;
  name: string;
  email: string;
  department?: string;
  role?: string;
  avatarUrl?: string;
}

export interface Workshop {
  id?: string;
  prefix: string; // e.g. BUSI
  code: string; // e.g. 654
  title: string;
  description: string;
  level?: WorkshopLevel; // Foundation, Practitioner, Professional
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
  seriesId?: string;
  seriesName?: string;
  prerequisites?: string;
  hasNoPrerequisites?: boolean;
  status: WorkshopStatus;
  assignedDeveloperIds: string[];
  assignedDevelopers: AssignedDeveloper[];
  learningOutcomes: LearningOutcome[];
  topics: Topic[];
  totalDurationMinutes: number;
  activities: WorkshopActivity[];
  requiredResources: WorkshopResource[];
  optionalResources: WorkshopResource[];
  dimensionsOfKnowledge: DimensionsOfKnowledge;
  contentNotes?: string;
  instructorNotes?: string;
  equipmentRequirements?: string;
  createdBy: string;
  createdByName?: string;
  updatedBy?: string;
  updatedByName?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export interface WorkshopSeries {
  id?: string;
  name: string;
  description: string;
  coreFocus: string;
  prefix?: string;
  workshopCount?: number;
  workshopIds: string[];
  status: 'Active' | 'Archived' | 'Draft';
  createdBy: string;
  createdByName?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export type MaterialCategory =
  | 'Workshop Material'
  | 'Presentation'
  | 'Video / Recording'
  | 'Activity'
  | 'Exercise'
  | 'Case Study'
  | 'Reading'
  | 'Reference'
  | 'Template'
  | 'Dataset'
  | 'Assignment'
  | 'Instructor Guide'
  | 'Student Resource'
  | 'Other';

export interface Material {
  id?: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  description?: string;
  category: MaterialCategory;
  downloadUrl: string;
  storagePath: string;
  workshopId?: string;
  workshopTitle?: string;
  activityId?: string;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt?: string | any;
  updatedAt?: string | any;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}
