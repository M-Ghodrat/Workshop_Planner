import React, { useState } from 'react';
import {
  Users,
  Shield,
  User,
  Plus,
  Search,
  CheckCircle2,
  Mail,
  Building,
  Edit,
  GraduationCap,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { userService, DEFAULT_FACULTY } from '../../services/userService';
import { UserProfile, UserRole, Workshop } from '../../types';

interface UserManagementProps {
  users: UserProfile[];
  workshops: Workshop[];
  onUsersUpdated?: (users: UserProfile[]) => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({
  users = [],
  workshops = [],
  onUsersUpdated,
}) => {
  const { userProfile, updateRole } = useAuth();
  const { success, error } = useToast();

  const [localUsers, setLocalUsers] = useState<UserProfile[]>(() => {
    return Array.isArray(users) && users.length > 0 ? users : DEFAULT_FACULTY;
  });

  React.useEffect(() => {
    if (Array.isArray(users) && users.length > 0) {
      setLocalUsers(users);
    }
  }, [users]);

  const safeWorkshops = Array.isArray(workshops) ? workshops : [];

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('School of Business & Technology');
  const [role, setRole] = useState<UserRole>('developer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredUsers = localUsers.filter((u) => {
    if (
      searchTerm &&
      !u.displayName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !u.email.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !u.department?.toLowerCase().includes(searchTerm.toLowerCase())
    ) {
      return false;
    }
    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false;
    }
    return true;
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    // 1. Immediately update local state in this tab so the change is instantly visible
    const updated = localUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setLocalUsers(updated);
    if (onUsersUpdated) {
      onUsersUpdated(updated);
    }

    try {
      await userService.updateUserRole(userId, newRole);

      // If updating the active user's own profile, also update AuthContext session
      if (userProfile && (userProfile.id === userId || userProfile.email === updated.find(u => u.id === userId)?.email)) {
        await updateRole(newRole);
      }

      success(
        'Role Updated',
        `User permissions changed to ${newRole === 'administrator' ? 'Administrator' : 'Developer'}.`
      );
    } catch (err: any) {
      // Revert if error
      setLocalUsers(users);
      error('Failed to change role', err.message);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName || !email) return;

    setIsSubmitting(true);
    try {
      await userService.createDeveloperProfile({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        department: department.trim(),
        role,
      });
      success('Faculty Member Added', `${displayName} can now collaborate on workshops.`);
      setShowAddModal(false);
      setDisplayName('');
      setEmail('');
    } catch (err: any) {
      error('Failed to add user', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Faculty & User Management
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage University Canada West instructors, developers, and platform administrators.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Add Faculty Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search faculty by name, institutional email, or department..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="w-full md:w-56">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl text-slate-800 bg-slate-50 focus:outline-hidden"
            >
              <option value="all">All Roles</option>
              <option value="administrator">Administrators</option>
              <option value="developer">Developers</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((u) => {
          const userWorkshops = safeWorkshops.filter(
            (w) =>
              w.createdBy === u.id ||
              (Array.isArray(w.assignedDeveloperIds) && w.assignedDeveloperIds.includes(u.id))
          );

          const isCurrent = u.id === userProfile?.id;

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-bold text-base shrink-0 shadow-2xs">
                      {u.displayName ? u.displayName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-bold text-slate-900 truncate">
                          {u.displayName}
                        </h4>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 shrink-0">
                            You
                          </span>
                        )}
                        <span
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 transition-colors ${
                            u.role === 'administrator'
                              ? 'bg-purple-100 text-purple-900 border border-purple-200'
                              : 'bg-teal-100 text-teal-900 border border-teal-200'
                          }`}
                        >
                          {u.role === 'administrator' ? 'Administrator' : 'Developer'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.department || 'School of Business'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{userWorkshops.length} assigned workshops</span>
                  </div>
                </div>
              </div>

              {/* Role Toggle Selector */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Role:
                  </span>
                </div>
                <select
                  id={`user-role-select-${u.id}`}
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border focus:outline-hidden cursor-pointer shadow-2xs transition-all ${
                    u.role === 'administrator'
                      ? 'bg-purple-50 text-purple-950 border-purple-300 hover:bg-purple-100'
                      : 'bg-teal-50 text-teal-950 border-teal-300 hover:bg-teal-100'
                  }`}
                >
                  <option value="developer">Developer</option>
                  <option value="administrator">Administrator</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Faculty Member Profile</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create a developer profile so instructors can be assigned to workshops.
            </p>

            <form onSubmit={handleAddUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name & Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Jane Watson"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm font-semibold border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Institutional Email <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="jane.watson@ucw.ca"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Department / School
                </label>
                <input
                  type="text"
                  placeholder="e.g. School of Business & Technology"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Platform Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white focus:outline-hidden"
                >
                  <option value="developer">Developer (Collaborate & Edit)</option>
                  <option value="administrator">Administrator (Full Visibility & Rules)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#002B49] hover:bg-[#003d66] rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Faculty Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
