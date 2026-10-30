import React, { useState, useMemo } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  File,
  Trash2,
  Download,
  Eye,
  Search,
  BookOpen,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Layers,
  Wrench,
  Laptop,
  CheckSquare,
  MessageSquare,
  FileCheck,
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { materialService } from '../../../services/materialService';
import {
  Workshop,
  Material,
  MaterialCategory,
  UserProfile,
  TeachingNoteItem,
} from '../../../types';
import { Plus } from 'lucide-react';

interface MaterialsTabProps {
  workshop: Workshop;
  setWorkshop?: React.Dispatch<React.SetStateAction<Workshop>>;
  materials: Material[];
  onOpenPreview: (material: Material) => void;
  onStagedStateChange?: (isStaged: boolean) => void;
}

const CATEGORIES: (MaterialCategory | 'All')[] = [
  'All',
  'Workshop Material',
  'Presentation',
  'Video / Recording',
  'Activity',
  'Exercise',
  'Case Study',
  'Reading',
  'Reference',
  'Template',
  'Dataset',
  'Assignment',
  'Instructor Guide',
  'Student Resource',
  'Other',
];

const TEMPLATE_SCRIPTS: Record<'lecture_teaching_note' | 'teaching_plan', { label: string; script: string }> = {
  lecture_teaching_note: {
    label: 'Lecture Teaching Note',
    script: `## Lecture Teaching Note

### 1. Core Concept & Pedagogical Objective
- Key Concept / Theory: [Enter core topic or framework]
- Target Learning Outcome(s): [e.g., LO1, LO2]

### 2. Lecture Narrative & Key Talking Points
- Opening Hook & Real-World Context:
- Core Conceptual Explanation & Definitions:
- Applied Business / Technical Examples:

### 3. Discussion Prompts & Check for Understanding
- Question 1:
- Question 2:
- Key Takeaway Summary:`,
  },
  teaching_plan: {
    label: 'Teaching Plan',
    script: `## Workshop Teaching Plan

### 1. Session Pacing & Instructional Flow
- Segment Duration: [e.g., 30 mins]
- Delivery Mode: [Lecture / Interactive Demo / Guided Walkthrough]

### 2. Step-by-Step Facilitator Plan
- Step 1 (Introduction & Framing):
- Step 2 (Core Demonstration / Content Delivery):
- Step 3 (Student Engagement & Debrief):

### 3. Required Slides, Visuals & Transition Cues
- Slide / Asset Reference:
- Transition to Next Topic / Activity:`,
  },
};

export const MaterialsTab: React.FC<MaterialsTabProps> = ({
  workshop,
  setWorkshop,
  materials,
  onOpenPreview,
  onStagedStateChange,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { success, error } = useToast();

  // Internal Sub-tabs: 'files' | 'content' | 'checklist'
  const [subTab, setSubTab] = useState<'files' | 'content' | 'checklist'>('files');

  // File Upload State
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MaterialCategory>('Presentation');
  const [description, setDescription] = useState('');
  const [localMaterials, setLocalMaterials] = useState<Material[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<MaterialCategory | 'All'>('All');
  const [isDragging, setIsDragging] = useState(false);

  // Notify parent of staged file or pending upload inputs
  React.useEffect(() => {
    const isStaged = Boolean(selectedFile || title.trim() || description.trim());
    if (onStagedStateChange) {
      onStagedStateChange(isStaged);
    }
  }, [selectedFile, title, description, onStagedStateChange]);

  // Clear local session materials when workshop ID changes or resets
  React.useEffect(() => {
    setLocalMaterials([]);
    setSelectedFile(null);
    setTitle('');
    setDescription('');
    if (onStagedStateChange) {
      onStagedStateChange(false);
    }
  }, [workshop.id]);

  // Filter materials for this workshop reliably without pulling in old unrelated drafts
  const workshopMaterials = useMemo(() => {
    const combined = [...materials, ...localMaterials];
    const uniqueMap = new Map<string, Material>();
    combined.forEach((m) => {
      if (m && m.id) uniqueMap.set(m.id, m);
    });
    const all = Array.from(uniqueMap.values());

    return all.filter((m) => {
      // Exclude files uploaded specifically under an Activity & Lab card
      if (m.activityId) return false;

      // 1. Direct ID match
      if (workshop.id && m.workshopId === workshop.id) return true;

      // 2. Explicitly uploaded in this current session
      if (localMaterials.some((lm) => lm.id === m.id)) return true;

      // 3. Exact Prefix & Code matching if workshop has a specific identifiable code (e.g., BUSI 654)
      if (
        workshop.prefix?.trim() &&
        workshop.code?.trim() &&
        m.workshopTitle &&
        m.workshopTitle.toLowerCase().includes(`${workshop.prefix.trim().toLowerCase()} ${workshop.code.trim().toLowerCase()}`)
      ) {
        return true;
      }

      return false;
    });
  }, [materials, localMaterials, workshop.id, workshop.prefix, workshop.code]);

  const filteredMaterials = useMemo(() => {
    return workshopMaterials.filter((m) => {
      if (
        searchTerm &&
        !m.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !m.fileName.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategoryFilter !== 'All' && m.category !== selectedCategoryFilter) {
        return false;
      }
      return true;
    });
  }, [workshopMaterials, searchTerm, selectedCategoryFilter]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!title) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
        setTitle(cleanName);
      }
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      error('File Required', 'Please select or drag & drop a file to upload.');
      return;
    }

    const uploadTitle = (title.trim() || selectedFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || selectedFile.name).trim();
    if (!uploadTitle) {
      error('Title Required', 'Please enter a title for the material.');
      return;
    }

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

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const newMaterial = await materialService.uploadMaterial(
        selectedFile,
        {
          title: uploadTitle,
          description: description.trim(),
          category,
          workshopId: targetWorkshopId,
          workshopTitle: workshop.title
            ? `${workshop.prefix || ''} ${workshop.code || ''}: ${workshop.title}`.trim()
            : 'Workshop Material',
        },
        currentUser,
        (progress) => setUploadProgress(progress)
      );

      setLocalMaterials((prev) => {
        if (prev.some((m) => m.id === newMaterial.id)) return prev;
        return [newMaterial, ...prev];
      });

      // Keep uploaded files only under Materials & Content -> Files & Assets (do not add to requiredResources)
      if (setWorkshop && !workshop.id) {
        setWorkshop((prev) => ({
          ...prev,
          id: prev.id || targetWorkshopId,
        }));
      }

      success('File Uploaded', `"${uploadTitle}" was added to Files & Assets.`);
      setSelectedFile(null);
      setTitle('');
      setDescription('');
      setCategory('Presentation');
      setUploadProgress(0);
      if (onStagedStateChange) {
        onStagedStateChange(false);
      }
    } catch (err: any) {
      console.error('Upload Error:', err);
      error('Upload Failed', err.message || 'Could not upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (mat: Material) => {
    if (!mat.id) return;
    try {
      await materialService.deleteMaterial(mat.id, mat.storagePath);
      setLocalMaterials((prev) => prev.filter((m) => m.id !== mat.id));

      if (setWorkshop) {
        setWorkshop((prev) => ({
          ...prev,
          requiredResources: (prev.requiredResources || []).filter((r) => r.materialId !== mat.id),
          optionalResources: (prev.optionalResources || []).filter((r) => r.materialId !== mat.id),
        }));
      }

      success('Material Removed', `"${mat.title}" was deleted.`);
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
  };

  const updateContentField = (field: 'contentNotes' | 'instructorNotes' | 'equipmentRequirements', value: string) => {
    if (setWorkshop) {
      setWorkshop((prev) => ({
        ...prev,
        [field]: value,
      }));
    }
  };

  // Teaching Notes list (allows multiple Lecture Teaching Notes / Teaching Plans, and selecting a template replaces content of that item)
  const teachingNoteItems: TeachingNoteItem[] = useMemo(() => {
    if (Array.isArray(workshop.teachingNotes) && workshop.teachingNotes.length > 0) {
      return workshop.teachingNotes;
    }
    return [
      {
        id: 'tn_default_1',
        title: 'Teaching Note 1',
        templateType: 'lecture_teaching_note',
        content: workshop.contentNotes || '',
      },
    ];
  }, [workshop.teachingNotes, workshop.contentNotes]);

  const syncTeachingNotes = (items: TeachingNoteItem[]) => {
    if (!setWorkshop) return;
    const compiledContent = items
      .map((item) => item.content.trim())
      .filter(Boolean)
      .join('\n\n---\n\n');
    setWorkshop((prev) => ({
      ...prev,
      teachingNotes: items,
      contentNotes: compiledContent,
    }));
  };

  const handleApplyTemplateToItem = (
    index: number,
    templateKey: 'lecture_teaching_note' | 'teaching_plan'
  ) => {
    const templateObj = TEMPLATE_SCRIPTS[templateKey];
    const updated = [...teachingNoteItems];
    // Replace content in this item so templates never accumulate
    updated[index] = {
      ...updated[index],
      templateType: templateKey,
      title: `${templateObj.label} #${index + 1}`,
      content: templateObj.script,
    };
    syncTeachingNotes(updated);
    success('Template Applied', `Replaced note content with ${templateObj.label} template.`);
  };

  const handleAddTeachingNoteItem = (templateKey: 'lecture_teaching_note' | 'teaching_plan') => {
    const templateObj = TEMPLATE_SCRIPTS[templateKey];
    const nextIndex = teachingNoteItems.length + 1;
    const newItem: TeachingNoteItem = {
      id: `tn_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: `${templateObj.label} #${nextIndex}`,
      templateType: templateKey,
      content: templateObj.script,
    };
    syncTeachingNotes([...teachingNoteItems, newItem]);
    success('Added Teaching Note', `Added a new ${templateObj.label} section.`);
  };

  const handleUpdateTeachingNoteContent = (index: number, newContent: string) => {
    const updated = [...teachingNoteItems];
    updated[index] = {
      ...updated[index],
      content: newContent,
    };
    syncTeachingNotes(updated);
  };

  const handleDeleteTeachingNoteItem = (index: number) => {
    if (teachingNoteItems.length <= 1) {
      // Clear the single remaining note rather than leaving 0 boxes
      syncTeachingNotes([
        {
          id: 'tn_default_1',
          title: 'Lecture Teaching Note #1',
          templateType: 'lecture_teaching_note',
          content: '',
        },
      ]);
      return;
    }
    const updated = teachingNoteItems.filter((_, i) => i !== index);
    syncTeachingNotes(updated);
  };

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

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Navigation for Materials & Content */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-black text-slate-950 uppercase tracking-tight flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Workshop Materials & Pedagogical Content</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage uploaded files, slide decks, lesson scripts, teaching notes, and classroom equipment.
            </p>
          </div>

          {/* Sub-tab Pill Switcher */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200 shrink-0">
            <button
              type="button"
              onClick={() => setSubTab('files')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                subTab === 'files'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-blue-600" />
              <span>Files & Assets ({workshopMaterials.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('content')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                subTab === 'content'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
              <span>Teaching Notes</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('checklist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                subTab === 'checklist'
                  ? 'bg-white text-slate-950 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-amber-600" />
              <span>Tools & Checklist</span>
            </button>
          </div>
        </div>

        {/* ===================== SUBTAB 1: FILES & ASSETS ===================== */}
        {subTab === 'files' && (
          <div className="pt-5 space-y-6 animate-in fade-in duration-150">
            {/* Upload Area */}
            <div className="bg-slate-50/70 rounded-2xl border border-slate-200 p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <UploadCloud className="w-4 h-4 text-blue-600" />
                  <span>Upload Workshop Files & Digital Assets</span>
                </h4>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  PowerPoint • Word • PDF • Excel • Video • Audio • Images • Code
                </span>
              </div>

              {/* Drag and Drop Zone */}
              <div
                onClick={() => {
                  if (!selectedFile) {
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-xl p-5 text-center transition-all ${
                  selectedFile
                    ? 'border-emerald-400 bg-emerald-50/30'
                    : isDragging
                    ? 'border-blue-500 bg-blue-50/50 cursor-copy'
                    : 'border-slate-300 bg-white hover:border-slate-400 cursor-pointer'
                }`}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <CheckSquare className="w-5 h-5 text-emerald-600 shrink-0" />
                    <div className="text-left min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{selectedFile.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {formatFileSize(selectedFile.size)} • Selected file ready for upload
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="ml-3 text-[10px] font-bold text-sky-700 hover:text-sky-900 hover:underline uppercase cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="ml-1 text-[10px] font-bold text-rose-600 hover:text-rose-800 hover:underline uppercase cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <UploadCloud className="w-7 h-7 text-slate-400 mx-auto" />
                    <p className="text-xs font-bold text-slate-700">
                      Drag & drop workshop documents here, or click to browse files
                    </p>
                    <p className="text-[10px] text-slate-400 max-w-md mx-auto">
                      Attach lecture presentations, case study prompts, HTML exercises, sample datasets, or instructor rubrics.
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="workshop-file-input"
                      onChange={(e) => {
                        handleFileSelect(e);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-[11px] font-bold cursor-pointer transition-colors shadow-xs"
                    >
                      <UploadCloud className="w-3.5 h-3.5 text-amber-400" />
                      <span>Select File</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Upload Meta Form */}
              <form onSubmit={handleUpload} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Material Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Master Lecture Slide Deck"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as MaterialCategory)}
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-hidden cursor-pointer"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
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
                      placeholder="e.g. Week 1 slides covering algorithms and business cases."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* Progress bar */}
                {isUploading && (
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-xs text-slate-600 font-mono">
                      <span>Uploading document to workshop storage...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-3 pt-1">
                  {selectedFile && !isUploading && (
                    <span className="text-[11px] font-bold text-orange-600 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
                      File ready: click Attach to finalize
                    </span>
                  )}
                  <button
                    id="workshop-attach-file-btn"
                    type="submit"
                    disabled={isUploading || !selectedFile}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
                      selectedFile && !isUploading
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-lg shadow-orange-500/35 ring-4 ring-orange-300 ring-offset-2 ring-offset-white scale-[1.02] active:scale-95'
                        : 'bg-[#002B49] hover:bg-[#003d66] text-white shadow-xs disabled:opacity-40 disabled:cursor-not-allowed'
                    }`}
                  >
                    <UploadCloud className={`w-4 h-4 ${selectedFile && !isUploading ? 'text-white' : 'text-amber-300'}`} />
                    <span>{isUploading ? 'Uploading Document...' : 'Attach File to Workshop'}</span>
                  </button>
                </div>
              </form>
            </div>

            {/* Filter and Search Bar for Attached Files */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter attached files by title or filename..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 custom-scrollbar">
                {['All', 'Presentation', 'Video / Recording', 'Workshop Material', 'Case Study', 'Dataset', 'Instructor Guide'].map(
                  (cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCategoryFilter(cat as any)}
                      className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider whitespace-nowrap cursor-pointer transition-colors ${
                        selectedCategoryFilter === cat
                          ? 'bg-[#002B49] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Files List Table */}
            {workshopMaterials.length === 0 ? (
              <div className="p-10 text-center border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 space-y-2">
                <FileText className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="font-bold text-slate-700">No documents attached to this workshop yet.</div>
                <p className="text-slate-400 max-w-sm mx-auto text-[11px]">
                  Use the upload section above to store slide decks, datasets, and worksheets directly with this workshop.
                </p>
              </div>
            ) : filteredMaterials.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                No attached files match your filter.
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-black uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-3 px-3.5">Document Title</th>
                      <th className="py-3 px-3">Category</th>
                      <th className="py-3 px-3">Size</th>
                      <th className="py-3 px-3">Uploaded By</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredMaterials.map((mat) => (
                      <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-lg bg-slate-100 shrink-0">
                              {getFileIcon(mat.fileType || '')}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 line-clamp-1">{mat.title}</div>
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
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-black text-[10px] uppercase">
                            {mat.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                          {formatFileSize(mat.fileSize)}
                        </td>
                        <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                          {mat.uploadedByName || 'Faculty'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                          {new Date(mat.createdAt || Date.now()).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => onOpenPreview(mat)}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                              title="Interactive Document Preview"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
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
                                onClick={() => handleDelete(mat)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Delete Document"
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
        )}

        {/* ===================== SUBTAB 2: TEACHING NOTES ===================== */}
        {subTab === 'content' && (
          <div className="pt-5 space-y-6 animate-in fade-in duration-150">
            {/* Header & Add New Teaching Note / Teaching Plan Buttons */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  <span>Teaching Notes & Teaching Plans</span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Selecting a template inside any note replaces its content (does not accumulate). Use the buttons on the right to add additional Teaching Notes or Teaching Plans.
                </p>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleAddTeachingNoteItem('lecture_teaching_note')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>Add Lecture Teaching Note</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTeachingNoteItem('teaching_plan')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold transition-colors cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add Teaching Plan</span>
                </button>
              </div>
            </div>

            {/* Teaching Note / Plan Entries */}
            <div className="space-y-4">
              {teachingNoteItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white space-y-3 shadow-2xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#002B49] text-white flex items-center justify-center text-[11px] font-black">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                        {item.title || `Teaching Note #${idx + 1}`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Apply Template (Replaces Content):
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplateToItem(idx, 'lecture_teaching_note')}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                          item.templateType === 'lecture_teaching_note'
                            ? 'bg-blue-50 border-blue-300 text-blue-900'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        Lecture Teaching Note
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApplyTemplateToItem(idx, 'teaching_plan')}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
                          item.templateType === 'teaching_plan'
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                            : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                        }`}
                      >
                        Teaching Plan
                      </button>
                      {teachingNoteItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTeachingNoteItem(idx)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                          title="Remove this Teaching Note"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <textarea
                    rows={8}
                    placeholder="Select 'Lecture Teaching Note' or 'Teaching Plan' above to load a clean template, or write your teaching notes here..."
                    value={item.content}
                    onChange={(e) => handleUpdateTeachingNoteContent(idx, e.target.value)}
                    className="w-full p-4 text-xs font-mono border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-900 leading-relaxed shadow-2xs"
                  />
                </div>
              ))}
            </div>

            {/* Instructor Notes & Facilitator Guide */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <span>Instructor Teaching Guide & Cohort Management Notes</span>
              </label>
              <textarea
                rows={5}
                placeholder="Enter facilitator-only guidance, common student misconceptions, grading rubrics, cohort breakout grouping tips, and time-management warnings..."
                value={workshop.instructorNotes || ''}
                onChange={(e) => updateContentField('instructorNotes', e.target.value)}
                className="w-full p-4 text-xs border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-900 leading-relaxed shadow-2xs"
              />
            </div>
          </div>
        )}

        {/* ===================== SUBTAB 3: TOOLS & CHECKLIST ===================== */}
        {subTab === 'checklist' && (
          <div className="pt-5 space-y-6 animate-in fade-in duration-150">
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-950 uppercase tracking-wider flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-amber-600" />
                <span>Required Software, Hardware & Platform Tools</span>
              </label>
              <p className="text-[11px] text-slate-500">
                Specify all technical prerequisites (e.g., Python 3.10, PowerBI Desktop, SPSS, Tableau, Figma, Miro board access).
              </p>
              <textarea
                rows={4}
                placeholder="e.g. 1. Microsoft Excel 2021+ with Analysis ToolPak enabled&#10;2. Python 3.10 environment with pandas and matplotlib installed&#10;3. Canvas LMS access for cohort quiz submission"
                value={workshop.equipmentRequirements || ''}
                onChange={(e) => updateContentField('equipmentRequirements', e.target.value)}
                className="w-full p-4 text-xs border border-slate-300 rounded-xl focus:outline-hidden bg-white text-slate-900 leading-relaxed shadow-2xs"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
