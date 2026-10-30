import React, { useState, useRef } from 'react';
import {
  Database,
  Save,
  RotateCcw,
  Download,
  Upload,
  Trash2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Layers,
  FileText,
  Users,
  GraduationCap,
  ShieldCheck,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { backupService } from '../../services/backupService';
import {
  SystemBackup,
  BackupSnapshot,
  Workshop,
  WorkshopSeries,
  Material,
  UserProfile,
  Course,
  OutcomeMapping,
} from '../../types';

interface BackupManagementProps {
  backups: SystemBackup[];
  workshops: Workshop[];
  series: WorkshopSeries[];
  materials: Material[];
  users: UserProfile[];
  courses: Course[];
  mappings: OutcomeMapping[];
  onStateRestored: (restored: BackupSnapshot) => void;
}

export const BackupManagement: React.FC<BackupManagementProps> = ({
  backups = [],
  workshops = [],
  series = [],
  materials = [],
  users = [],
  courses = [],
  mappings = [],
  onStateRestored,
}) => {
  const { userProfile } = useAuth();
  const { success, error } = useToast();

  const [backupName, setBackupName] = useState('');
  const [backupDescription, setBackupDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const [backupToRestore, setBackupToRestore] = useState<SystemBackup | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const [backupToDelete, setBackupToDelete] = useState<SystemBackup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreateBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    const finalName =
      backupName.trim() ||
      `System Snapshot — ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

    setIsCreating(true);
    try {
      const snapshot: BackupSnapshot = {
        workshops,
        series,
        materials,
        users,
        courses,
        mappings,
      };
      const created = await backupService.createBackup(
        finalName,
        backupDescription,
        snapshot,
        userProfile
      );
      success(
        'Backup Saved to Database',
        `"${created.name}" (${created.id}) saved with ${workshops.length} workshops, ${series.length} series, and ${materials.length} files.`
      );
      setBackupName('');
      setBackupDescription('');
    } catch (err: any) {
      error('Backup Failed', err.message || 'Could not save system backup.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    setIsRestoring(true);
    try {
      const fullSnapshot = await backupService.getFullBackupSnapshot(backupToRestore);
      const restored = await backupService.restoreBackupSnapshot(fullSnapshot);
      onStateRestored(restored);
      success(
        'Backup Loaded Successfully',
        `Restored "${backupToRestore.name}" (${restored.workshops.length} workshops, ${restored.series.length} series, ${restored.materials.length} files, ${restored.users.length} users).`
      );
      setBackupToRestore(null);
    } catch (err: any) {
      error('Restore Failed', err.message || 'Failed to restore backup from database.');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;
    setIsDeleting(true);
    try {
      await backupService.deleteBackup(backupToDelete.id);
      success('Backup Deleted', `"${backupToDelete.name}" was removed.`);
      setBackupToDelete(null);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Could not delete backup.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadJson = async (backup: SystemBackup) => {
    try {
      const fullSnapshot = await backupService.getFullBackupSnapshot(backup);
      const exportPayload: SystemBackup = {
        ...backup,
        snapshot: fullSnapshot,
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      success('Backup Downloaded', `Downloaded ${backup.id}.json`);
    } catch (err: any) {
      error('Download Failed', err.message || 'Could not export backup.');
    }
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userProfile) return;

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const snapshot: BackupSnapshot | undefined = parsed.snapshot || parsed;
      if (!snapshot || !Array.isArray(snapshot.workshops)) {
        throw new Error('Invalid backup JSON file format.');
      }

      const importedBackup = await backupService.createBackup(
        parsed.name ? `${parsed.name} (Imported)` : `Imported Backup (${file.name})`,
        parsed.description || 'Imported from JSON backup file',
        snapshot,
        userProfile
      );
      setBackupToRestore(importedBackup);
      success('Backup Imported', 'Backup saved to database. Confirm below to load it.');
    } catch (err: any) {
      error('Import Failed', err.message || 'Could not parse backup file.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
              System Backups & Checkpoints
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-200">
              Project Lead Only
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Save complete snapshots of all workshop designs, series, uploaded files, faculty accounts, and outcome mappings to the database and restore any checkpoint on demand.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJsonFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-blue-600" />
            <span>Import Backup (.JSON)</span>
          </button>
        </div>
      </div>

      {/* Current Live Database Status & Create New Backup Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#002B49] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Database className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Save New Database Backup
              </h3>
              <p className="text-xs text-slate-500">
                Captures the exact current state of all collections, workshop designs, and uploaded files.
              </p>
            </div>
          </div>

          {/* Live Data Counters */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-black text-slate-900">{workshops.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-500">Workshops</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-black text-slate-900">{series.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-500">Series</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-black text-slate-900">{materials.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-500">Files</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-black text-slate-900">{users.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-500">Users</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-black text-slate-900">{courses.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-500">Courses</div>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="text-sm font-black text-slate-900">{mappings.length}</div>
              <div className="text-[9px] font-bold uppercase text-slate-500">Mappings</div>
            </div>
          </div>
        </div>

        <form onSubmit={handleCreateBackup} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Backup Label / Checkpoint Name
            </label>
            <input
              type="text"
              placeholder="e.g. Pre-Review Milestone or Fall 2026 Checkpoint"
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Status Summary (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. All AI and Entrepreneurship workshops named and assigned"
              value={backupDescription}
              onChange={(e) => setBackupDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="md:col-span-3">
            <button
              type="submit"
              disabled={isCreating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>{isCreating ? 'Saving Backup...' : 'Save New Backup'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Saved Backups List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Saved Database Backups ({backups.length})</span>
          </h3>
        </div>

        {backups.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center space-y-2">
            <Database className="w-9 h-9 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-800">No Backups Saved Yet</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Click "Save New Backup" above to store a complete snapshot of all workshops, series, files, designs, and faculty accounts in the database.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5">
            {backups.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h4 className="text-base font-extrabold text-slate-900">{b.name}</h4>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-mono text-[10px] font-semibold border border-slate-200">
                      {b.id}
                    </span>
                  </div>

                  {b.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{b.description}</p>
                  )}

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(b.createdAt).toLocaleString()}
                    </span>
                    <span>
                      Saved by <strong className="text-slate-700">{b.createdByName || 'Project Lead'}</strong>
                    </span>
                  </div>

                  {/* Snapshot Counts Pills */}
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-[11px] font-bold">
                      <BookOpen className="w-3 h-3 text-blue-600" />
                      {b.counts?.workshops ?? 0} Workshops
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-900 border border-indigo-200 text-[11px] font-bold">
                      <Layers className="w-3 h-3 text-indigo-600" />
                      {b.counts?.series ?? 0} Series
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 text-[11px] font-bold">
                      <FileText className="w-3 h-3 text-emerald-600" />
                      {b.counts?.materials ?? 0} Files & Assets
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-900 border border-teal-200 text-[11px] font-bold">
                      <Users className="w-3 h-3 text-teal-600" />
                      {b.counts?.users ?? 0} Users
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold">
                      <GraduationCap className="w-3 h-3 text-amber-600" />
                      {b.counts?.courses ?? 0} Courses / {b.counts?.mappings ?? 0} Mappings
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownloadJson(b)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
                    title="Download Backup JSON file"
                  >
                    <Download className="w-3.5 h-3.5 text-slate-500" />
                    <span>Download</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBackupToRestore(b)}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Load / Restore Backup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setBackupToDelete(b)}
                    className="p-2 rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Backup"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Confirm Restore Backup Modal */}
      {backupToRestore && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Load & Restore System Backup
                </h3>
                <p className="text-xs text-slate-500">
                  Restore database state from saved checkpoint
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="font-extrabold text-slate-900 text-sm">{backupToRestore.name}</div>
              <div className="text-slate-500 font-mono text-[11px]">{backupToRestore.id}</div>
              <div className="text-slate-600">
                Saved on {new Date(backupToRestore.createdAt).toLocaleString()}
              </div>
              <div className="pt-2 grid grid-cols-3 gap-2 text-center">
                <div className="p-1.5 rounded bg-white border border-slate-200">
                  <div className="font-black text-slate-900">{backupToRestore.counts?.workshops ?? 0}</div>
                  <div className="text-[10px] text-slate-500">Workshops</div>
                </div>
                <div className="p-1.5 rounded bg-white border border-slate-200">
                  <div className="font-black text-slate-900">{backupToRestore.counts?.series ?? 0}</div>
                  <div className="text-[10px] text-slate-500">Series</div>
                </div>
                <div className="p-1.5 rounded bg-white border border-slate-200">
                  <div className="font-black text-slate-900">{backupToRestore.counts?.materials ?? 0}</div>
                  <div className="text-[10px] text-slate-500">Files</div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Loading this backup will restore all workshops, series, uploaded files, names, designs, courses, mappings, and user profiles to match this exact checkpoint.
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBackupToRestore(null)}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                disabled={isRestoring}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{isRestoring ? 'Restoring Everything...' : 'Confirm & Load Backup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Backup Modal */}
      {backupToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Delete Saved Backup</h3>
                <span className="text-xs text-rose-600 font-semibold">
                  Removes this backup snapshot from the database
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to delete backup{' '}
              <strong className="text-slate-900">{backupToDelete.name}</strong> (
              <span className="font-mono">{backupToDelete.id}</span>)?
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBackupToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Backup'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
