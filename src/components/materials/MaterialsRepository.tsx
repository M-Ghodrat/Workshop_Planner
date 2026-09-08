import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  FileCode,
  Image as ImageIcon,
  Video as VideoIcon,
  Music,
  File,
  Search,
  Filter,
  Download,
  Eye,
  Trash2,
  UploadCloud,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { materialService } from '../../services/materialService';
import { Material, Workshop, MaterialCategory, UserProfile } from '../../types';

interface MaterialsRepositoryProps {
  materials: Material[];
  workshops: Workshop[];
  onOpenPreview: (material: Material) => void;
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

export const MaterialsRepository: React.FC<MaterialsRepositoryProps> = ({
  materials = [],
  workshops = [],
  onOpenPreview,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const { success, error } = useToast();

  const safeMaterials = Array.isArray(materials) ? materials : [];
  const safeWorkshops = Array.isArray(workshops) ? workshops : [];
  const userId = userProfile?.id || '';

  // Accessible workshops for developer vs admin
  const accessibleWorkshops = useMemo(() => {
    if (isAdmin) return safeWorkshops;
    return safeWorkshops.filter(
      (w) =>
        w.createdBy === userId ||
        (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId))
    );
  }, [safeWorkshops, isAdmin, userId]);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MaterialCategory | 'All'>('All');
  const [selectedWorkshop, setSelectedWorkshop] = useState<string>('all');

  // Quick upload modal state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<MaterialCategory>('Presentation');
  const [uploadWorkshopId, setUploadWorkshopId] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');

  const [localMaterials, setLocalMaterials] = useState<Material[]>([]);

  const displayMaterials = useMemo(() => {
    const combined = [...safeMaterials, ...localMaterials];
    const map = new Map<string, Material>();
    const devWorkshopIds = new Set(accessibleWorkshops.map((w) => w.id));

    combined.forEach((m) => {
      if (m && m.id) {
        if (isAdmin || (m.workshopId && devWorkshopIds.has(m.workshopId)) || m.uploadedBy === userId) {
          map.set(m.id, m);
        }
      }
    });
    return Array.from(map.values());
  }, [safeMaterials, localMaterials, accessibleWorkshops, isAdmin, userId]);

  const filteredMaterials = useMemo(() => {
    return displayMaterials.filter((m) => {
      if (
        searchTerm &&
        !m.title.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !m.fileName.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !m.workshopTitle?.toLowerCase().includes(searchTerm.toLowerCase())
      ) {
        return false;
      }
      if (selectedCategory !== 'All' && m.category !== selectedCategory) {
        return false;
      }
      if (selectedWorkshop !== 'all' && m.workshopId !== selectedWorkshop) {
        return false;
      }
      return true;
    });
  }, [displayMaterials, searchTerm, selectedCategory, selectedWorkshop]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setUploadFile(f);
      if (!uploadTitle) {
        setUploadTitle(f.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      error('File Required', 'Please select a file to upload.');
      return;
    }

    const titleToUse = (uploadTitle.trim() || uploadFile.name.replace(/\.[^/.]+$/, '').replace(/_/g, ' ') || uploadFile.name).trim();
    if (!titleToUse) {
      error('Title Required', 'Please enter a title for the material.');
      return;
    }

    const currentUser: UserProfile = userProfile || {
      id: 'usr_faculty',
      displayName: 'Faculty Member',
      email: 'faculty@ucanwest.ca',
      role: 'Faculty',
      department: 'Academic Faculty',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const matchedWorkshop = safeWorkshops.find((w) => w.id === uploadWorkshopId);

    setIsUploading(true);
    setUploadProgress(10);
    try {
      const newMaterial = await materialService.uploadMaterial(
        uploadFile,
        {
          title: titleToUse,
          description: uploadDesc.trim(),
          category: uploadCategory,
          workshopId: uploadWorkshopId || undefined,
          workshopTitle: matchedWorkshop
            ? `${matchedWorkshop.prefix} ${matchedWorkshop.code}: ${matchedWorkshop.title}`
            : undefined,
        },
        currentUser,
        (progress) => setUploadProgress(progress)
      );

      setLocalMaterials((prev) => {
        if (prev.some((m) => m.id === newMaterial.id)) return prev;
        return [newMaterial, ...prev];
      });

      success('File Uploaded', `"${titleToUse}" has been added to repository.`);
      setShowUploadModal(false);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
    } catch (err: any) {
      error('Upload Failed', err.message || 'Could not upload file.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (mat: Material) => {
    if (!mat.id || !window.confirm(`Delete material "${mat.title}"?`)) return;
    try {
      await materialService.deleteMaterial(mat.id, mat.storagePath);
      success('Material Deleted', `"${mat.title}" was removed.`);
    } catch (err: any) {
      error('Delete Failed', err.message);
    }
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
    if (
      ft.includes('spreadsheet') ||
      ft.includes('excel') ||
      ft.includes('csv') ||
      ft.includes('sheet')
    ) {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Workshop Materials & Content Repository
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Access slides, student case studies, exercises, templates, and datasets across all UCW
            workshops.
          </p>
        </div>

        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <UploadCloud className="w-4 h-4 text-amber-400" />
          <span>Upload Material</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search materials by title, file name, or workshop code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:outline-hidden"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  Category: {c}
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-60">
            <select
              value={selectedWorkshop}
              onChange={(e) => setSelectedWorkshop(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:outline-hidden"
            >
              <option value="all">All Associated Workshops</option>
              {accessibleWorkshops.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.prefix} {w.code} — {w.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {filteredMaterials.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-semibold">No materials found</p>
            <p className="text-xs text-slate-400 mt-1">
              Upload documents or clear filters to see all workshop assets.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Material / File</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Associated Workshop</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMaterials.map((mat) => (
                  <tr key={mat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-slate-100 shrink-0">
                          {getFileIcon(mat.fileType || '')}
                        </div>
                        <div>
                          <div
                            onClick={() => onOpenPreview(mat)}
                            className="font-bold text-slate-900 hover:text-sky-800 cursor-pointer line-clamp-1"
                          >
                            {mat.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono line-clamp-1">
                            {mat.fileName}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[10px]">
                        {mat.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="font-semibold text-slate-800 line-clamp-1">
                        {mat.workshopTitle || 'General Curriculum'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                      {formatFileSize(mat.fileSize)}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      {mat.uploadedByName || 'Faculty'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(mat.createdAt || Date.now()).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onOpenPreview(mat)}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Preview Document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <a
                          href={mat.downloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download={mat.fileName}
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        {(isAdmin || mat.uploadedBy === userProfile?.id) && (
                          <button
                            onClick={() => handleDelete(mat)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Delete"
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Upload Material to Repository
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Add slide decks, worksheets, datasets, or guides.
            </p>

            <form onSubmit={handleUploadSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Case Study: AI in Healthcare"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                  >
                    {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workshop Link
                  </label>
                  <select
                    value={uploadWorkshopId}
                    onChange={(e) => setUploadWorkshopId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                  >
                    <option value="">General (No specific workshop)</option>
                    {safeWorkshops.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.prefix} {w.code}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={handleFileSelect}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#002B49] file:text-white hover:file:bg-[#003d66] cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or instructions..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              {isUploading && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-600">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#002B49] transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading || !uploadFile}
                  className={`px-4 py-2 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all ${
                    uploadFile && !isUploading
                      ? 'bg-orange-500 hover:bg-orange-600 text-white ring-4 ring-orange-300 ring-offset-1 shadow-md shadow-orange-500/30 scale-[1.02] active:scale-95'
                      : 'bg-[#002B49] hover:bg-[#003d66] text-white disabled:opacity-50'
                  }`}
                >
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
