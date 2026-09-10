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
      className={`bg-[#002B49] text-slate-100 flex flex-col transition-all duration-300 z-40 select-none border-r border-[#00385F]/60 shrink-0 shadow-md ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className={`border-b border-[#00385F]/60 flex items-center justify-between ${collapsed ? 'p-4 justify-center' : 'p-6 sm:p-7'}`}>
        <div
          onClick={() => onNavigate('dashboard')}
          className="cursor-pointer overflow-hidden group"
        >
          {!collapsed ? (
            <div>
              <div className="text-[10px] font-black tracking-widest text-sky-300 uppercase mb-1">
                University Canada West
              </div>
              <div className="text-xl font-black leading-none tracking-tight text-white group-hover:text-sky-300 transition-colors">
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
      <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto custom-scrollbar">
        {!collapsed && (
          <div className="px-3 pb-2 text-[10px] font-black uppercase tracking-[0.2em] text-sky-200/60">
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
              className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all group relative cursor-pointer ${
                isActive
                  ? 'bg-[#004270] text-white shadow-xs border border-sky-400/30'
                  : 'text-slate-200 hover:text-white hover:bg-white/10'
              }`}
            >
              {/* Dot indicator */}
              <div
                className={`w-2 h-2 rounded-full shrink-0 transition-colors ${
                  isActive
                    ? 'bg-sky-400 ring-2 ring-sky-300/40'
                    : 'bg-transparent border border-slate-400/50 group-hover:border-slate-300'
                }`}
              />

              <Icon
                className={`w-4 h-4 shrink-0 transition-transform ${
                  isActive ? 'text-sky-300' : 'text-slate-300 group-hover:text-white'
                }`}
              />

              {!collapsed && (
                <div className="flex items-center justify-between flex-1 min-w-0 text-left">
                  <span className="truncate tracking-wide">{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-black tracking-wider px-1.5 py-0.5 rounded uppercase ${
                        isActive
                          ? 'bg-sky-500 text-white'
                          : 'bg-white/15 text-sky-200 border border-white/20'
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
      <div className="p-4 sm:p-5 mt-auto border-t border-[#00385F]/60 bg-[#001f35]">
        {!collapsed ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs ring-2 ring-sky-400/30">
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
                <span className="text-[10px] uppercase tracking-wider text-sky-300/80 font-bold truncate">
                  {isAdmin ? 'Administrator' : 'Developer'}
                </span>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="w-full flex justify-center p-2 rounded-lg text-slate-300 hover:text-rose-400 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
};
