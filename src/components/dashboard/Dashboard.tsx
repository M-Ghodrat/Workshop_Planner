import React, { useMemo } from 'react';
import {
  BookOpen,
  FolderKanban,
  Layers,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Award,
  ChevronRight,
  Eye,
  Edit,
  Tag,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Workshop, WorkshopSeries, Material, UserProfile } from '../../types';

interface DashboardProps {
  workshops: Workshop[];
  series: WorkshopSeries[];
  materials: Material[];
  users: UserProfile[];
  onNavigate: (view: string, id?: string) => void;
  onOpenCreateWorkshop: () => void;
  onSelectWorkshop: (workshop: Workshop, mode: 'edit' | 'preview') => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  workshops = [],
  series = [],
  materials = [],
  users = [],
  onNavigate = (_view?: string, _id?: string) => {},
  onOpenCreateWorkshop,
  onSelectWorkshop,
}) => {
  const { userProfile, isAdmin } = useAuth();
  const userId = userProfile?.id || '';

  const safeWorkshops = Array.isArray(workshops) ? workshops : [];
  const safeSeries = Array.isArray(series) ? series : [];
  const safeMaterials = Array.isArray(materials) ? materials : [];
  const safeUsers = Array.isArray(users) ? users : [];

  // Scoped workshops for developer vs admin
  const accessibleWorkshops = useMemo(() => {
    if (isAdmin) return safeWorkshops;
    return safeWorkshops.filter(
      (w) =>
        w.createdBy === userId ||
        (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(userId))
    );
  }, [safeWorkshops, isAdmin, userId]);

  // Scoped series for developer vs admin
  const accessibleSeries = useMemo(() => {
    if (isAdmin) return safeSeries;
    const devSeriesIds = new Set(accessibleWorkshops.map((w) => w.seriesId).filter(Boolean));
    return safeSeries.filter((s) => devSeriesIds.has(s.id) || s.createdBy === userId);
  }, [safeSeries, accessibleWorkshops, isAdmin, userId]);

  // Metrics calculation
  const myAssignedWorkshops = accessibleWorkshops;
  const myCreatedWorkshops = accessibleWorkshops.filter((w) => w.createdBy === userId);
  const inDevWorkshops = accessibleWorkshops.filter((w) => w.status === 'In Development');
  const reviewWorkshops = accessibleWorkshops.filter((w) => w.status === 'Review');
  const approvedWorkshops = accessibleWorkshops.filter((w) => w.status === 'Approved');

  const recentWorkshops = [...accessibleWorkshops]
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime())
    .slice(0, 5);

  const recentMaterials = [...safeMaterials]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
    .slice(0, 5);

  // Status breakdown
  const statusCounts: Record<string, number> = {
    'In Development': 0,
    Review: 0,
    Approved: 0,
  };
  accessibleWorkshops.forEach((w) => {
    if (statusCounts[w.status] !== undefined) {
      statusCounts[w.status]++;
    }
  });

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'In Development': { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300' },
    Review: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300' },
    Approved: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300' },
  };

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#002B49] via-[#004270] to-[#00609c] text-white p-6 sm:p-10 shadow-md relative overflow-hidden border border-blue-900/30">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 text-sky-200 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xs border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>UCW Curriculum Development Portal</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight uppercase">
              Welcome, {userProfile?.displayName || 'Faculty Member'}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!isAdmin && (
              <button
                onClick={onOpenCreateWorkshop}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white hover:bg-sky-50 text-[#002B49] font-black uppercase tracking-wider text-xs shadow-md transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-blue-600" />
                <span>New Workshop</span>
              </button>
            )}
            <button
              onClick={() => onNavigate('series')}
              className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white font-black uppercase tracking-wider text-xs backdrop-blur-xs transition-colors cursor-pointer border border-white/25"
            >
              <Layers className="w-4 h-4 text-sky-300" />
              <span>Explore Series</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Section */}
      {isAdmin ? (
        /* Administrator Metrics Grid */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Total Workshops
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-black">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-2 tracking-tight">
              {safeWorkshops.length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1 uppercase tracking-wider">
              <span className="text-emerald-700">{approvedWorkshops.length}</span> APPROVED / PUBLISHED
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Workshop Series
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-black">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-2 tracking-tight">
              {safeSeries.length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
              Curriculum tracks
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Faculty Developers
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-black">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-2 tracking-tight">
              {safeUsers.length || 3}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
              Active contributors
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Materials & Assets
              </span>
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-900 flex items-center justify-center font-black">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-slate-950 mt-2 tracking-tight">
              {safeMaterials.length}
            </div>
            <div className="text-[11px] font-bold text-slate-500 mt-1 uppercase tracking-wider">
              Slides & case files
            </div>
          </div>
        </div>
      ) : (
        /* Developer Metrics Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Assigned
            </span>
            <div className="text-3xl font-black text-slate-950 mt-1 tracking-tight">
              {myAssignedWorkshops.length}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Collaboration</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Authored
            </span>
            <div className="text-3xl font-black text-slate-950 mt-1 tracking-tight">
              {myCreatedWorkshops.length}
            </div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">My outlines</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              In Development
            </span>
            <div className="text-3xl font-black text-amber-600 mt-1 tracking-tight">
              {myAssignedWorkshops.filter((w) => w.status === 'In Development').length}
            </div>
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Active</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              In Review
            </span>
            <div className="text-3xl font-black text-blue-600 mt-1 tracking-tight">
              {myAssignedWorkshops.filter((w) => w.status === 'Review').length}
            </div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Review stage</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Approved
            </span>
            <div className="text-3xl font-black text-emerald-600 mt-1 tracking-tight">
              {myAssignedWorkshops.filter((w) => w.status === 'Approved').length}
            </div>
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Ready</span>
          </div>

          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
              Materials
            </span>
            <div className="text-3xl font-black text-blue-600 mt-1 tracking-tight">
              {materials.filter((m) => m.uploadedBy === userId).length}
            </div>
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Uploaded</span>
          </div>
        </div>
      )}

      {/* Main Content Split: Recent Workshops + Status Breakdown & Series */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Workshops Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight text-slate-950">
                  {isAdmin ? 'Recently Updated Workshops' : 'My Active Workshops'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  Select any workshop to edit its 2-hour outline or review the curriculum specification.
                </p>
              </div>
              <button
                onClick={() => onNavigate(isAdmin ? 'all-workshops' : 'my-workshops')}
                className="text-xs font-black uppercase tracking-wider text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <span>View all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentWorkshops.length === 0 ? (
              <div className="text-center py-10">
                <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-black uppercase text-slate-800">No workshops found yet</p>
                <p className="text-xs text-slate-400 mt-1 mb-4">
                  Create your first workshop or load the UCW sample curriculum.
                </p>
                <button
                  onClick={onOpenCreateWorkshop}
                  className="px-4 py-2 rounded-lg bg-[#002B49] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003d66] cursor-pointer shadow-xs"
                >
                  Create Workshop
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentWorkshops.map((w) => {
                  const style = statusColors[w.status] || statusColors['In Development'];
                  const devList =
                    w.assignedDevelopers && w.assignedDevelopers.length > 0
                      ? w.assignedDevelopers
                      : w.createdByName
                      ? [{ id: w.createdBy || 'creator', name: w.createdByName, email: '' }]
                      : [];

                  return (
                    <div
                      key={w.id}
                      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-xs transition-all gap-4"
                    >
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-[#002B49] text-white flex flex-col items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                          <span className="text-[9px] text-sky-300 leading-none font-bold">{w.prefix}</span>
                          <span className="text-xs leading-tight font-extrabold">{w.code}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-slate-950 hover:text-blue-600 transition-colors truncate">
                              {w.title}
                            </h4>
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${style.bg} ${style.text} ${style.border}`}
                            >
                              {w.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs font-bold text-slate-400 mt-1 flex-wrap uppercase tracking-wider">
                            {w.seriesName && (
                              <span className="flex items-center gap-1 text-slate-700">
                                <Layers className="w-3 h-3 text-slate-400" />
                                <span className="truncate max-w-[180px]">{w.seriesName}</span>
                              </span>
                            )}
                            <span className="flex items-center gap-1 text-slate-500">
                              <Clock className="w-3 h-3" />
                              <span>{w.totalDurationMinutes || 120} MINS</span>
                            </span>

                            {/* Developer small tag */}
                            {devList.length > 0 ? (
                              <div className="flex items-center gap-1 normal-case">
                                {devList.map((dev) => (
                                  <span
                                    key={dev.id}
                                    title={dev.email ? `${dev.name} (${dev.email})` : dev.name}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 text-[10px] font-semibold border border-slate-200 shrink-0"
                                  >
                                    <span className="w-3.5 h-3.5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[8px] font-bold">
                                      {dev.name?.charAt(0) || 'D'}
                                    </span>
                                    <span className="truncate max-w-[110px]">{dev.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-50 text-slate-400 text-[10px] font-medium border border-dashed border-slate-200 normal-case shrink-0">
                                <User className="w-2.5 h-2.5" />
                                <span>Unassigned</span>
                              </span>
                            )}

                            <span className="text-slate-400 text-[10px]">
                              {new Date(w.updatedAt || Date.now()).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                        <button
                          onClick={() => onSelectWorkshop(w, 'preview')}
                          title="Preview Workshop Document"
                          className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onSelectWorkshop(w, 'edit')}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer shadow-xs"
                        >
                          <Edit className="w-3.5 h-3.5 text-sky-400" />
                          <span>Open Workspace</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
            <span>
              Showing {recentWorkshops.length} of {accessibleWorkshops.length} workshops
            </span>
            {!isAdmin && (
              <button
                onClick={() => onNavigate('create-workshop')}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add New Outline</span>
              </button>
            )}
          </div>
        </div>

        {/* Right 1 Col: Status Breakdown & Series Overview */}
        <div className="space-y-6">
          {/* Status Breakdown Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-950 mb-4 flex items-center justify-between">
              <span>Workshops by Status</span>
              <Tag className="w-4 h-4 text-slate-400" />
            </h3>
            <div className="space-y-2.5">
              {Object.entries(statusCounts).map(([status, count]) => {
                const style = statusColors[status] || statusColors['In Development'];
                const percentage = accessibleWorkshops.length > 0 ? Math.round((count / accessibleWorkshops.length) * 100) : 0;
                return (
                  <div key={status} className="flex items-center justify-between text-xs py-1">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${style.bg} border ${style.border}`} />
                      <span className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-950">{count}</span>
                      <span className="text-[10px] font-bold text-slate-400 w-8 text-right">({percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workshop Series Quick Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-950">Curriculum Series</h3>
              <button
                onClick={() => onNavigate('series')}
                className="text-xs font-black uppercase tracking-wider text-blue-600 hover:underline cursor-pointer"
              >
                Manage
              </button>
            </div>
            {accessibleSeries.length === 0 ? (
              <p className="text-xs text-slate-400 font-medium">No series associated yet.</p>
            ) : (
              <div className="space-y-2.5">
                {accessibleSeries.slice(0, 3).map((s) => (
                  <div
                    key={s.id}
                    onClick={() => onNavigate('series')}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-400 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-950 uppercase tracking-tight truncate">{s.name}</h4>
                      <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-900 uppercase">
                        {accessibleWorkshops.filter((w) => w.seriesId === s.id).length} workshops
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 line-clamp-1">{s.coreFocus}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
