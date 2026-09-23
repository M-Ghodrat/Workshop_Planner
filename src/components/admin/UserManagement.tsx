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
  Trash2,
  AlertTriangle,
  Lock,
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
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Form State
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('School of Business & Technology');
  const [role, setRole] = useState<UserRole>('developer');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Current session user identity: Only Komil and Orkhon can manage roles/deletions
  const isKomil = Boolean(
    userProfile?.email?.toLowerCase().includes('komil') ||
      userProfile?.displayName?.toLowerCase().includes('komil') ||
      userProfile?.role === 'project_lead'
  );
  const isOrkhon = Boolean(
    userProfile?.email?.toLowerCase().includes('orkhon') ||
      userProfile?.displayName?.toLowerCase().includes('orkhon')
  );
  const canManageUsersAndRoles = isKomil || isOrkhon;

  const isTargetKomil = (u: UserProfile) =>
    Boolean(
      u.email?.toLowerCase().includes('komil') ||
        u.displayName?.toLowerCase().includes('komil') ||
        u.role === 'project_lead'
    );

  const isTargetOrkhon = (u: UserProfile) =>
    Boolean(
      u.email?.toLowerCase().includes('orkhon') ||
        u.displayName?.toLowerCase().includes('orkhon')
    );

  // Komil has full control: can set role for everyone (including Orkhon).
  // Orkhon can change roles for developers and leads, but CANNOT set role for Komil.
  const canEditUserRole = (u: UserProfile): boolean => {
    if (!canManageUsersAndRoles) return false;
    if (isKomil) return true;
    if (isOrkhon) {
      if (isTargetKomil(u)) return false; // Orkhon cannot set role for Komil
      return true;
    }
    return false;
  };

  // Only Komil and Orkhon can delete users (with warning confirmation modal).
  // Komil can delete anyone except himself.
  // Orkhon can delete developers/leads, but cannot delete Komil or himself.
  const canDeleteUser = (u: UserProfile): boolean => {
    if (!canManageUsersAndRoles) return false;
    if (isTargetKomil(u)) return false;
    if (u.id === userProfile?.id) return false;
    if (isKomil) return true;
    if (isOrkhon) {
      if (isTargetOrkhon(u)) return false;
      return true;
    }
    return false;
  };

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
    const targetUser = localUsers.find((u) => u.id === userId);
    if (!targetUser) return;

    if (!canEditUserRole(targetUser)) {
      error('Unauthorized', 'You do not have permission to change this role.');
      return;
    }

    // 1. Immediately update local state in this tab so the change is instantly visible
    const updated = localUsers.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
    setLocalUsers(updated);
    if (onUsersUpdated) {
      onUsersUpdated(updated);
    }

    try {
      await userService.updateUserRole(userId, newRole);

      // If updating the active user's own profile, also update AuthContext session
      if (
        userProfile &&
        (userProfile.id === userId ||
          userProfile.email?.toLowerCase() === targetUser.email?.toLowerCase())
      ) {
        await updateRole(newRole);
      }

      success(
        'Role Updated',
        `${targetUser.displayName}'s role updated to "${getRoleLabel(newRole)}".`
      );
    } catch (err: any) {
      setLocalUsers(users);
      error('Failed to change role', err.message);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await userService.deleteUser(userToDelete.id, userToDelete.email);
      const updated = localUsers.filter((u) => u.id !== userToDelete.id);
      setLocalUsers(updated);
      if (onUsersUpdated) {
        onUsersUpdated(updated);
      }
      success('User Deleted', `${userToDelete.displayName} was removed successfully.`);
      setUserToDelete(null);
    } catch (err: any) {
      error('Delete Failed', err.message || 'Unable to delete user.');
    } finally {
      setIsDeleting(false);
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

  const getRoleLabel = (r: UserRole): string => {
    switch (r) {
      case 'administrator':
        return 'Program Administrator';
      case 'project_lead':
        return 'Project Lead';
      case 'workshop_lead':
        return 'Workshop Lead';
      case 'academic_affairs':
        return 'Academic Affairs';
      default:
        return 'Developer';
    }
  };

  const getRoleBadgeStyle = (r: UserRole) => {
    switch (r) {
      case 'administrator':
      case 'project_lead':
        return 'bg-purple-100 text-purple-900 border-purple-200';
      case 'workshop_lead':
        return 'bg-sky-100 text-sky-900 border-sky-200';
      case 'academic_affairs':
        return 'bg-indigo-100 text-indigo-900 border-indigo-200';
      default:
        return 'bg-teal-100 text-teal-900 border-teal-200';
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

        {canManageUsersAndRoles && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-md transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Faculty Member</span>
          </button>
        )}
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
              <option value="project_lead">Project Lead</option>
              <option value="administrator">Program Administrators</option>
              <option value="workshop_lead">Workshop Leads</option>
              <option value="academic_affairs">Academic Affairs</option>
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
          const userCanEditRole = canEditUserRole(u);
          const userCanDelete = canDeleteUser(u);

          return (
            <div
              key={u.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
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
                          className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 transition-colors border ${getRoleBadgeStyle(
                            u.role
                          )}`}
                        >
                          {getRoleLabel(u.role)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 truncate">{u.email}</p>
                    </div>
                  </div>

                  {userCanDelete && (
                    <button
                      onClick={() => setUserToDelete(u)}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                      title={`Delete ${u.displayName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{u.department || 'School of Business & Technology'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <GraduationCap className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                    <span>{userWorkshops.length} assigned workshops</span>
                  </div>
                </div>
              </div>

              {/* Role Selector & Access Controls */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Shield className="w-3.5 h-3.5 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Role:
                  </span>
                </div>

                {userCanEditRole ? (
                  <select
                    id={`user-role-select-${u.id}`}
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-900 focus:outline-hidden cursor-pointer shadow-2xs transition-all max-w-[190px]"
                  >
                    <option value="developer">Developer</option>
                    <option value="workshop_lead">Workshop Lead</option>
                    <option value="administrator">Program Administrator</option>
                    <option value="academic_affairs">Academic Affairs</option>
                    {isKomil && <option value="project_lead">Project Lead</option>}
                  </select>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>{getRoleLabel(u.role)}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Delete User Warning Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-rose-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Confirm User Deletion</h3>
                <span className="text-xs text-rose-600 font-semibold">Irreversible Action</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete{' '}
              <strong className="text-slate-900 font-bold">{userToDelete.displayName}</strong> (
              <span className="font-mono text-slate-700">{userToDelete.email}</span>)?
            </p>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs mb-5">
              <strong>Warning:</strong> Any workshop outlines currently assigned to this faculty
              member will lose this developer assignment.
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
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
                <span>{isDeleting ? 'Deleting...' : 'Confirm Permanent Deletion'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-slate-900 mb-1">Add Faculty Member Profile</h3>
            <p className="text-xs text-slate-500 mb-4">
              Create a faculty profile so instructors can be assigned to workshops.
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
                  placeholder="jane.watson@ucanwest.ca"
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
                  <option value="developer">Developer</option>
                  <option value="workshop_lead">Workshop Lead</option>
                  <option value="administrator">Program Administrator</option>
                  <option value="academic_affairs">Academic Affairs</option>
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
