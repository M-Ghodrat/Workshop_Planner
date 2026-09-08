import React, { useState } from 'react';
import { Users, Plus, Trash2, Shield, User, Sparkles, Check, Mail } from 'lucide-react';
import { Workshop, UserProfile, AssignedDeveloper } from '../../../types';

interface CollaboratorsTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
  allUsers: UserProfile[];
}

export const CollaboratorsTab: React.FC<CollaboratorsTabProps> = ({
  workshop,
  setWorkshop,
  allUsers,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('Co-Developer');

  const currentDevs = workshop.assignedDevelopers || [];
  const assignedIds = new Set(workshop.assignedDeveloperIds || []);

  const availableUsers = allUsers.filter((u) => !assignedIds.has(u.id));

  const handleAddDeveloper = () => {
    if (!selectedUserId) return;
    const user = allUsers.find((u) => u.id === selectedUserId);
    if (!user) return;

    const newDev: AssignedDeveloper = {
      id: user.id,
      name: user.displayName,
      email: user.email,
      department: user.department || 'Faculty Member',
      role: selectedRole,
    };

    const nextDevs = [...currentDevs, newDev];
    const nextIds = [...(workshop.assignedDeveloperIds || []), user.id];

    setWorkshop((prev) => ({
      ...prev,
      assignedDevelopers: nextDevs,
      assignedDeveloperIds: nextIds,
    }));

    setSelectedUserId('');
  };

  const handleRemoveDeveloper = (userIdToRemove: string) => {
    const nextDevs = currentDevs.filter((d) => d.id !== userIdToRemove);
    const nextIds = (workshop.assignedDeveloperIds || []).filter((id) => id !== userIdToRemove);

    setWorkshop((prev) => ({
      ...prev,
      assignedDevelopers: nextDevs,
      assignedDeveloperIds: nextIds,
    }));
  };

  const handleUpdateRole = (userId: string, newRole: string) => {
    const nextDevs = currentDevs.map((d) => (d.id === userId ? { ...d, role: newRole } : d));
    setWorkshop((prev) => ({
      ...prev,
      assignedDevelopers: nextDevs,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-[#002B49]" />
          <h3 className="text-base font-bold text-slate-900">
            Assigned Developers & Faculty Collaborators
          </h3>
        </div>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Manage the multi-author team for this workshop. All assigned developers have permissions to
          edit the curriculum outline, add activities, and upload workshop materials.
        </p>
      </div>

      {/* Add Developer Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Add Faculty Collaborator
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden"
            >
              <option value="">-- Choose faculty member from UCW directory --</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.displayName} ({u.email}) — {u.department || 'Faculty'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-slate-300 rounded-xl bg-white focus:outline-hidden"
            >
              <option value="Lead Developer">Lead Developer</option>
              <option value="Co-Developer">Co-Developer</option>
              <option value="Instructional Designer">Instructional Designer</option>
              <option value="Technical Reviewer">Technical Reviewer</option>
              <option value="Workshop Facilitator">Workshop Facilitator</option>
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={handleAddDeveloper}
            disabled={!selectedUserId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#002B49] hover:bg-[#003d66] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add to Workshop Team</span>
          </button>
        </div>
      </div>

      {/* Current Team List */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Current Team ({currentDevs.length})
        </h4>

        {currentDevs.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3">No developers assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {currentDevs.map((dev) => (
              <div
                key={dev.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-[#002B49] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                    {dev.name ? dev.name.charAt(0) : 'U'}
                  </div>
                  <div className="min-w-0">
                    <h5 className="text-xs font-bold text-slate-900 truncate">{dev.name}</h5>
                    <p className="text-[11px] text-slate-500 truncate">{dev.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <select
                        value={dev.role || 'Co-Developer'}
                        onChange={(e) => handleUpdateRole(dev.id, e.target.value)}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md border border-slate-300 bg-white text-slate-800 focus:outline-hidden"
                      >
                        <option value="Lead Developer">Lead Developer</option>
                        <option value="Co-Developer">Co-Developer</option>
                        <option value="Instructional Designer">Instructional Designer</option>
                        <option value="Technical Reviewer">Technical Reviewer</option>
                        <option value="Workshop Facilitator">Workshop Facilitator</option>
                      </select>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveDeveloper(dev.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                  title="Remove from workshop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
