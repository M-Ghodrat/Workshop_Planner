import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Users,
  FileText,
  Lightbulb,
  UploadCloud,
  CheckSquare,
  Eye,
  Download,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  File,
} from 'lucide-react';
import {
  Workshop,
  WorkshopActivity,
  ActivityType,
  Material,
  MaterialCategory,
  UserProfile,
} from '../../../types';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { materialService } from '../../../services/materialService';

interface ActivitiesTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
  materials?: Material[];
  onOpenPreview?: (material: Material) => void;
}

const ACTIVITY_TYPES: { type: ActivityType; badge: string; color: string }[] = [
  { type: 'Individual Exercise', badge: 'Solo', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { type: 'Group Exercise', badge: 'Cohort', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { type: 'Case Study', badge: 'Analysis', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { type: 'Discussion', badge: 'Dialogue', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { type: 'Demonstration', badge: 'Demo', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { type: 'Hands-on Lab', badge: 'Lab', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { type: 'Simulation', badge: 'Scenario', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { type: 'Reflection', badge: 'Synthesis', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { type: 'Quiz', badge: 'Assessment', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { type: 'Presentation', badge: 'Deliverable', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { type: 'Other', badge: 'General', color: 'bg-slate-100 text-slate-700 border-slate-200' },
];

const CATEGORIES: MaterialCategory[] = [
  'Activity',
  'Exercise',
  'Case Study',
  'Dataset',
  'Template',
  'Assignment',
  'Workshop Material',
  'Presentation',
  'Video / Recording',
  'Reading',
  'Reference',
  'Instructor Guide',
  'Student Resource',
  'Other',
];

const getFileIcon = (fileType: string) => {
  const ft = fileType?.toLowerCase() || '';
  if (ft.includes('video') || ft.includes('mp4') || ft.includes('mov') || ft.includes('webm') || ft.includes('mkv')) {
    return <VideoIcon className="w-5 h-5 text-rose-500" />;
  }
  if (ft.includes('audio') || ft.includes('mp3') || ft.includes('wav')) {
    return <Music className="w-5 h-5 text-indigo-500" />;
  }
  if (ft.includes('presentation') || ft.includes('powerpoint') || ft.includes('ppt')) {
    return <Presentation className="w-5 h-5 text-amber-600" />;
  }
  if (ft.includes('pdf')) {
    return <FileText className="w-5 h-5 text-rose-600" />;
  }
  if (ft.includes('spreadsheet') || ft.includes('excel') || ft.includes('csv') || ft.includes('sheet')) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
  }
  if (ft.includes('image')) {
    return <ImageIcon className="w-5 h-5 text-purple-600" />;
  }
  if (ft.includes('html') || ft.includes('code') || ft.includes('javascript') || ft.includes('python')) {
    return <FileCode className="w-5 h-5 text-sky-600" />;
  }
  return <File className="w-5 h-5 text-slate-600" />;
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

interface ActivityUploadState {
  selectedFile: File | null;
  title: string;
  category: MaterialCategory;
  description: string;
  isUploading: boolean;
  uploadProgress: number;
  isDragging: boolean;
}

const defaultUploadState = (): ActivityUploadState => ({
  selectedFile: null,
  title: '',
  category: 'Activity',
  description: '',
  isUploading: false,
  uploadProgress: 0,
  isDragging: false,
});

export const ActivitiesTab: React.FC<ActivitiesTabProps> = ({
  workshop,
  setWorkshop,
  materials = [],
  onOpenPreview,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { success, error } = useToast();
  const activities = workshop.activities || [];

  const [uploadStates, setUploadStates] = useState<Record<string, ActivityUploadState>>({});
  const [localActivityMaterials, setLocalActivityMaterials] = useState<Material[]>([]);

  const getActivityUploadState = (activityId: string): ActivityUploadState => {
    return uploadStates[activityId] || defaultUploadState();
  };

  const updateActivityUploadState = (
    activityId: string,
    patch: Partial<ActivityUploadState>
  ) => {
    setUploadStates((prev) => ({
      ...prev,
      [activityId]: {
        ...(prev[activityId] || defaultUploadState()),
        ...patch,
      },
    }));
  };

  const getMaterialsForActivity = (activity: WorkshopActivity): Material[] => {
    const combined = [
      ...(activity.attachments || []),
      ...materials.filter((m) => m.activityId === activity.id),
      ...localActivityMaterials.filter((m) => m.activityId === activity.id),
    ];
    const unique = new Map<string, Material>();
    combined.forEach((m) => {
      if (m && m.id) unique.set(m.id, m);
    });
    return Array.from(unique.values());
  };

  const handleAddActivity = () => {
    const newAct: WorkshopActivity = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      order: activities.length + 1,
      title: '',
      type: 'Group Exercise',
      description: '',
      instructions: '',
      estimatedMinutes: 20,
      attachments: [],
    };
    setWorkshop((prev) => ({
      ...prev,
      activities: [...(prev.activities || []), newAct],
    }));
  };

  const handleUpdateActivity = (index: number, updates: Partial<WorkshopActivity>) => {
    const updated = [...activities];
    updated[index] = { ...updated[index], ...updates };
    setWorkshop((prev) => ({
      ...prev,
      activities: updated,
    }));
  };

  const handleDeleteActivity = (index: number) => {
    const filtered = activities.filter((_, i) => i !== index);
    const reordered = filtered.map((act, i) => ({ ...act, order: i + 1 }));
    setWorkshop((prev) => ({
      ...prev,
      activities: reordered,
    }));
  };

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= activities.length) return;
    const reordered = [...activities];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, moved);
    const updated = reordered.map((act, i) => ({ ...act, order: i + 1 }));
    setWorkshop((prev) => ({
      ...prev,
      activities: updated,
    }));
  };

  const handleActivityFileSelect = (activityId: string, file: File) => {
    const current = getActivityUploadState(activityId);
    const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
    updateActivityUploadState(activityId, {
      selectedFile: file,
      title: current.title || cleanName,
    });
  };

  const handleActivityUpload = async (
    e: React.FormEvent,
    activity: WorkshopActivity,
    index: number
  ) => {
    e.preventDefault();
    const state = getActivityUploadState(activity.id);
    if (!state.selectedFile) {
      error('File Required', 'Please select or drag & drop a file to upload for this activity.');
      return;
    }

    const uploadTitle = (
      state.title.trim() ||
      state.selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') ||
      state.selectedFile.name
    ).trim();

    let targetWorkshopId = workshop.id;
    if (!targetWorkshopId) {
      targetWorkshopId = `ws_draft_${Date.now()}`;
    }

    const currentUser: UserProfile = userProfile || {
      id: 'usr_faculty',
      displayName: 'Faculty Member',
      email: 'faculty@ucanwest.ca',
      role: 'developer',
      department: 'Academic Faculty',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    updateActivityUploadState(activity.id, { isUploading: true, uploadProgress: 10 });
    try {
      const newMaterial = await materialService.uploadMaterial(
        state.selectedFile,
        {
          title: uploadTitle,
          description: state.description.trim(),
          category: state.category || 'Activity',
          workshopId: targetWorkshopId,
          workshopTitle: workshop.title
            ? `${workshop.prefix || ''} ${workshop.code || ''}: ${workshop.title}`.trim()
            : 'Workshop Activity',
          activityId: activity.id,
        },
        currentUser,
        (progress) => updateActivityUploadState(activity.id, { uploadProgress: progress })
      );

      setLocalActivityMaterials((prev) => [newMaterial, ...prev]);

      const currentAttachments = getMaterialsForActivity(activity);
      const nextAttachments = currentAttachments.some((m) => m.id === newMaterial.id)
        ? currentAttachments
        : [newMaterial, ...currentAttachments];

      setWorkshop((prev) => {
        const updatedActs = [...(prev.activities || [])];
        if (updatedActs[index]) {
          updatedActs[index] = {
            ...updatedActs[index],
            attachments: nextAttachments,
          };
        }
        return {
          ...prev,
          id: prev.id || targetWorkshopId,
          activities: updatedActs,
        };
      });

      success('Activity File Uploaded', `"${uploadTitle}" was attached to Activity ${index + 1}.`);
      updateActivityUploadState(activity.id, defaultUploadState());
    } catch (err: any) {
      error('Upload Failed', err.message || 'Could not upload activity file.');
      updateActivityUploadState(activity.id, { isUploading: false, uploadProgress: 0 });
    }
  };

  const handleDeleteActivityMaterial = async (
    activity: WorkshopActivity,
    index: number,
    mat: Material
  ) => {
    if (!mat.id) return;
    try {
      await materialService.deleteMaterial(mat.id, mat.storagePath);
      setLocalActivityMaterials((prev) => prev.filter((m) => m.id !== mat.id));
      const remaining = getMaterialsForActivity(activity).filter((m) => m.id !== mat.id);
      handleUpdateActivity(index, { attachments: remaining });
      success('Activity File Removed', `"${mat.title}" was deleted.`);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete activity file.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-amber-500" />
              <h3 className="text-base font-bold text-slate-900">Hands-On Activities & Labs</h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Design engaging interactive activities, case studies, breakout debates, or hands-on
              exercises to reinforce workshop learning outcomes.
            </p>
          </div>

          <button
            type="button"
            onClick={handleAddActivity}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-[#003d66] shadow-xs transition-all cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-800">No hands-on activities configured</h4>
          <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
            Add experiential exercises, case study evaluations, or practical software demos for your
            students.
          </p>
          <button
            type="button"
            onClick={handleAddActivity}
            className="px-4 py-2 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-sky-900 shadow-xs cursor-pointer inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Create First Activity</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {activities.map((activity, index) => {
            const upState = getActivityUploadState(activity.id);
            const activityMaterials = getMaterialsForActivity(activity);
            const fileInputId = `activity-file-input-${activity.id || index}`;

            return (
              <div
                key={activity.id || index}
                className="bg-white rounded-2xl border border-slate-200 hover:border-slate-300 p-5 shadow-2xs transition-all space-y-4"
              >
                {/* Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-[#002B49] text-white flex items-center justify-center font-extrabold text-xs shadow-2xs">
                      A{index + 1}
                    </span>
                    <div>
                      <span className="text-xs font-bold text-slate-800">
                        Activity {index + 1}: {activity.title || 'Untitled Activity'}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'up')}
                      disabled={index === 0}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(index, 'down')}
                      disabled={index === activities.length - 1}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteActivity(index)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer ml-1"
                      title="Delete Activity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Activity Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Enterprise AI Disruption Case Analysis"
                      value={activity.title}
                      onChange={(e) => handleUpdateActivity(index, { title: e.target.value })}
                      className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Activity Format
                    </label>
                    <select
                      value={activity.type}
                      onChange={(e) =>
                        handleUpdateActivity(index, { type: e.target.value as ActivityType })
                      }
                      className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800"
                    >
                      {ACTIVITY_TYPES.map((t) => (
                        <option key={t.type} value={t.type}>
                          {t.type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Activity Overview / Scenario Brief
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Explain the background scenario, problem statement, or target goal..."
                      value={activity.description}
                      onChange={(e) => handleUpdateActivity(index, { description: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Duration (Mins)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="5"
                        max="120"
                        step="5"
                        value={activity.estimatedMinutes || ''}
                        onChange={(e) =>
                          handleUpdateActivity(index, {
                            estimatedMinutes: Number(e.target.value) || 0,
                          })
                        }
                        className="w-full pl-3 pr-10 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
                        mins
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Student Instructions & Facilitator Prompts
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Step 1: Form teams of 3... Step 2: Open Worksheet B... Step 3: Present key findings..."
                    value={activity.instructions || ''}
                    onChange={(e) => handleUpdateActivity(index, { instructions: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-[#002B49]/20 focus:border-[#002B49] text-slate-800 font-mono text-[11px]"
                  />
                </div>

                {/* Activity File Upload & Attached Files Section (Same format as Materials section) */}
                <div className="pt-3 border-t border-slate-200 space-y-4">
                  <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <UploadCloud className="w-4 h-4 text-blue-600" />
                        <span>Upload Activity / Lab Files & Assets ({activityMaterials.length})</span>
                      </h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        PowerPoint • Word • PDF • Excel • Video • Audio • Images • Code
                      </span>
                    </div>

                    {/* Drag and Drop Zone */}
                    <div
                      onClick={() => {
                        if (!upState.selectedFile) {
                          document.getElementById(fileInputId)?.click();
                        }
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        updateActivityUploadState(activity.id, { isDragging: true });
                      }}
                      onDragLeave={() => updateActivityUploadState(activity.id, { isDragging: false })}
                      onDrop={(e) => {
                        e.preventDefault();
                        updateActivityUploadState(activity.id, { isDragging: false });
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          handleActivityFileSelect(activity.id, e.dataTransfer.files[0]);
                        }
                      }}
                      className={`border-2 border-dashed rounded-xl p-4 text-center transition-all ${
                        upState.selectedFile
                          ? 'border-emerald-400 bg-emerald-50/30'
                          : upState.isDragging
                          ? 'border-blue-500 bg-blue-50/50 cursor-copy'
                          : 'border-slate-300 bg-white hover:border-slate-400 cursor-pointer'
                      }`}
                    >
                      {upState.selectedFile ? (
                        <div className="flex items-center justify-center gap-3">
                          <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                          <div className="text-left min-w-0">
                            <div className="text-xs font-bold text-slate-900 truncate">
                              {upState.selectedFile.name}
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {formatFileSize(upState.selectedFile.size)} • Selected file ready for upload
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(fileInputId)?.click();
                            }}
                            className="ml-3 text-[10px] font-bold text-sky-700 hover:text-sky-900 hover:underline uppercase cursor-pointer"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              updateActivityUploadState(activity.id, { selectedFile: null });
                            }}
                            className="ml-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline uppercase cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <UploadCloud className="w-6 h-6 text-slate-400 mx-auto" />
                          <p className="text-xs font-bold text-slate-700">
                            Drag & drop activity documents here, or click to browse files
                          </p>
                          <p className="text-[10px] text-slate-400 max-w-md mx-auto">
                            Attach lab worksheets, case study packets, starter code, datasets, or instructions for this activity.
                          </p>
                          <input
                            id={fileInputId}
                            type="file"
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                handleActivityFileSelect(activity.id, e.target.files[0]);
                              }
                              e.target.value = '';
                            }}
                            className="hidden"
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById(fileInputId)?.click();
                            }}
                            className="inline-flex items-center gap-1.5 mt-1.5 px-3.5 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                          >
                            <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                            <span>Select File</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Upload Meta Form */}
                    <form
                      onSubmit={(e) => handleActivityUpload(e, activity, index)}
                      className="space-y-3"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            File Title <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required={Boolean(upState.selectedFile)}
                            placeholder="e.g. Activity Worksheet / Lab Dataset"
                            value={upState.title}
                            onChange={(e) =>
                              updateActivityUploadState(activity.id, { title: e.target.value })
                            }
                            className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Category
                          </label>
                          <select
                            value={upState.category}
                            onChange={(e) =>
                              updateActivityUploadState(activity.id, {
                                category: e.target.value as MaterialCategory,
                              })
                            }
                            className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden cursor-pointer"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            Description / Instructions
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Handout or dataset for breakout teams."
                            value={upState.description}
                            onChange={(e) =>
                              updateActivityUploadState(activity.id, {
                                description: e.target.value,
                              })
                            }
                            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-800"
                          />
                        </div>
                      </div>

                      {upState.isUploading && (
                        <div className="space-y-1 pt-1">
                          <div className="flex justify-between text-xs text-slate-600 font-mono">
                            <span>Uploading file to activity storage...</span>
                            <span>{upState.uploadProgress}%</span>
                          </div>
                          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-600 transition-all duration-200"
                              style={{ width: `${upState.uploadProgress}%` }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center justify-end gap-3 pt-1">
                        {upState.selectedFile && !upState.isUploading && (
                          <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                            File ready: click Attach to finalize
                          </span>
                        )}
                        <button
                          type="submit"
                          disabled={upState.isUploading || !upState.selectedFile}
                          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                            upState.selectedFile && !upState.isUploading
                              ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/35 ring-4 ring-orange-300 ring-offset-2 ring-offset-white scale-[1.02] active:scale-95'
                              : 'bg-[#002B49] hover:bg-[#003d66] text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed'
                          }`}
                        >
                          <UploadCloud
                            className={`w-4 h-4 ${
                              upState.selectedFile && !upState.isUploading
                                ? 'text-white'
                                : 'text-amber-300'
                            }`}
                          />
                          <span>
                            {upState.isUploading ? 'Uploading File...' : 'Attach File to Activity'}
                          </span>
                        </button>
                      </div>
                    </form>

                    {/* Attached Activity Files Table */}
                    {activityMaterials.length > 0 && (
                      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px]">
                            <tr>
                              <th className="py-2.5 px-3">Document Title</th>
                              <th className="py-2.5 px-3">Category</th>
                              <th className="py-2.5 px-3">Size</th>
                              <th className="py-2.5 px-3">Uploaded By</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {activityMaterials.map((mat) => (
                              <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-slate-100 shrink-0">
                                      {getFileIcon(mat.fileType || '')}
                                    </div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-slate-900 line-clamp-1">
                                        {mat.title}
                                      </div>
                                      <div className="text-[11px] text-slate-400 font-mono line-clamp-1">
                                        {mat.fileName}
                                      </div>
                                      {mat.description && (
                                        <div className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                          {mat.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">
                                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-black text-[10px] uppercase">
                                    {mat.category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                                  {formatFileSize(mat.fileSize)}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                                  {mat.uploadedByName || 'Faculty'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                                  {new Date(mat.createdAt || Date.now()).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {onOpenPreview && (
                                      <button
                                        type="button"
                                        onClick={() => onOpenPreview(mat)}
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                        title="Interactive Document Preview"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                    <a
                                      href={mat.downloadUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      download={mat.fileName}
                                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                                      title="Download File"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </a>
                                    {(isAdmin || mat.uploadedBy === userProfile?.id) && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleDeleteActivityMaterial(activity, index, mat)
                                        }
                                        className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                        title="Delete Activity File"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

