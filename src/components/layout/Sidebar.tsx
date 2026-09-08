import React from 'react';
import {
  LayoutDashboard,
  BookOpen,
  FolderKanban,
  Layers,
  PlusCircle,
  FileText,
  Users,
  LogOut,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string, id?: string) => void;
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
  onLogoutRequest?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onNavigate,
  collapsed,
  setCollapsed,
  onLogoutRequest,
}) => {
  const { userProfile, isAdmin, logout } = useAuth();

  const handleLogout = () => {
    if (onLogoutRequest) {
      onLogoutRequest();
    } else {
      logout();
    }
  };

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      roles: ['administrator', 'developer'],
      description: 'Overview & Statistics',
    },
    {
      id: 'my-workshops',
      label: isAdmin ? 'All Workshops' : 'My Workshops',
      icon: BookOpen,
      roles: ['administrator', 'developer'],
      description: isAdmin ? 'Manage curriculum catalog' : 'Assigned & authored workshops',
    },
    {
      id: 'series',
      label: 'Workshop Series',
      icon: Layers,
      roles: ['administrator', 'developer'],
      description: 'Curriculum tracks',
    },
    {
      id: 'create-workshop',
      label: 'Create Workshop',
      icon: PlusCircle,
      roles: ['developer'],
      description: 'New 2-hour outline',
    },
    {
      id: 'users',
      label: 'Users / Developers',
      icon: Users,
      roles: ['administrator'],
      badge: 'Admin',
      description: 'Manage faculty & roles',
    },
  ];

  const visibleItems = navItems.filter((item) => {
    if (item.id === 'create-workshop' && isAdmin) {
      return false;
    }
    return !item.roles || (userProfile && item.roles.includes(userProfile.role)) || isAdmin;
  });

  return (
    <aside
      className={`bg-slate-950 text-white flex flex-col transition-all duration-300 z-40 select-none border-r border-slate-900 shrink-0 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`border-b border-white/5 flex items-center justify-between ${collapsed ? 'p-4 justify-center' : 'p-6 sm:p-7'}`}>
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer overflow-hidden group"
        >
          {!collapsed ? (
            <div>
              <div className="text-[10px] font-black tracking-widest text-slate-500 uppercase mb-1">
                University Canada West
              </div>
              <div className="text-xl font-black leading-none tracking-tight text-white group-hover:text-blue-400 transition-colors">
                WORKSHOP<br />PLANNER
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-black text-white text-sm shadow-md">
              UCW
            </div>
          )}
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Navigation
          </div>
        )}

        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-lg text-xs font-bold transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-white/10 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {/* Dot indicator from Bold Typography theme */}
              <div
                className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                  isActive
                    ? 'bg-blue-500 ring-2 ring-blue-500/30'
                    : 'bg-transparent border border-slate-700 group-hover:border-slate-500'
                }`}
              />

              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              />

              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0 text-left">
                  <span className="truncate tracking-wide">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-purple-900/60 text-purple-300 border border-purple-700/50'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* User / Logout Footer */}
      <div className="p-4 sm:p-6 mt-auto border-t border-white/5 bg-slate-950">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                {userProfile?.displayName
                  ? userProfile.displayName
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  : (isAdmin ? 'AD' : 'FM')}
              </div>
              <div className="flex flex-col min-w-0 text-left">
                <span className="text-xs font-bold text-white truncate">
                  {userProfile?.displayName || 'Administrator'}
                </span>
                <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold truncate">
                  {isAdmin ? 'Administrator' : 'Developer'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="w-full flex justify-center p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-white/5 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
