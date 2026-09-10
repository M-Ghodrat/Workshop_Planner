import React, { useState } from 'react';
import {
  Bell,
  Search,
  User,
  LogOut,
  Shield,
  BookOpen,
  ChevronDown,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

interface HeaderProps {
  onNavigate: (view: string, id?: string) => void;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  onOpenCreateWorkshop: () => void;
  onLogoutRequest?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onNavigate,
  globalSearch,
  setGlobalSearch,
  onOpenCreateWorkshop,
  onLogoutRequest,
}) => {
  const { userProfile, logout, updateRole, isAdmin } = useAuth();
  const { success, error } = useToast();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = () => {
    setDropdownOpen(false);
    if (onLogoutRequest) {
      onLogoutRequest();
    } else {
      logout();
    }
  };

  const toggleRole = async () => {
    try {
      const newRole = isAdmin ? 'developer' : 'administrator';
      await updateRole(newRole);
      success(`Switched role to ${newRole === 'administrator' ? 'Administrator' : 'Developer'}`);
    } catch (err: any) {
      error('Could not switch role', err.message);
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 shadow-xs">
      {/* Search and institutional breadcrumb */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search workshops, workshop codes, series, developers..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs font-semibold bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10 focus:border-slate-950 transition-all"
          />
          {globalSearch && (
            <button
              onClick={() => setGlobalSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-slate-900 px-1"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-3">
        {/* Create Workshop quick action */}
        {!isAdmin && (
          <button
            onClick={onOpenCreateWorkshop}
            className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-lg bg-[#002B49] text-white text-xs font-black uppercase tracking-wider hover:bg-[#003d66] shadow-xs transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>New Workshop</span>
          </button>
        )}

        {/* User profile & Role switcher */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer text-left"
          >
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
              {userProfile?.displayName ? (
                userProfile.displayName.charAt(0).toUpperCase()
              ) : (
                <User className="w-4 h-4" />
              )}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {userProfile?.displayName || 'Administrator'}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-widest ${
                    isAdmin
                      ? 'bg-purple-100 text-purple-900 border border-purple-200'
                      : 'bg-teal-100 text-teal-900 border border-teal-200'
                  }`}
                >
                  {isAdmin ? 'Admin' : 'Developer'}
                </span>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {/* User Dropdown */}
          {dropdownOpen && (
            <div
              className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150"
              onMouseLeave={() => setDropdownOpen(false)}
            >
              <div className="px-4 py-3 border-b border-slate-100">
                <p className="text-xs font-black text-slate-900">{userProfile?.displayName || 'Administrator'}</p>
                <p className="text-[11px] text-slate-500 font-medium truncate">{userProfile?.email}</p>
                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider mt-0.5">
                  {userProfile?.department || 'UCW Faculty'}
                </p>
              </div>

              <div className="py-1">
                <button
                  onClick={toggleRole}
                  className="w-full text-left px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>Role: <strong>{isAdmin ? 'Administrator' : 'Developer'}</strong></span>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 hover:underline">Switch</span>
                </button>
              </div>

              <div className="border-t border-slate-100 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-xs font-black uppercase tracking-wider text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-rose-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
