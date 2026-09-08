import React from 'react';
import { Plus, Trash2, Link, ExternalLink, Bookmark, FileText } from 'lucide-react';
import { Workshop, WorkshopResource, Material } from '../../../types';

interface ResourcesTabProps {
  workshop: Workshop;
  setWorkshop: React.Dispatch<React.SetStateAction<Workshop>>;
  allMaterials: Material[];
}

export const ResourcesTab: React.FC<ResourcesTabProps> = ({
  workshop,
  setWorkshop,
  allMaterials,
}) => {
  const required = workshop.requiredResources || [];
  const optional = workshop.optionalResources || [];

  const handleAddResource = (type: 'required' | 'optional') => {
    const newRes: WorkshopResource = {
      id: `res_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
      title: '',
      description: '',
      url: '',
    };
    if (type === 'required') {
      setWorkshop((prev) => ({
        ...prev,
        requiredResources: [...(prev.requiredResources || []), newRes],
      }));
    } else {
      setWorkshop((prev) => ({
        ...prev,
        optionalResources: [...(prev.optionalResources || []), newRes],
      }));
    }
  };

  const handleUpdateResource = (
    type: 'required' | 'optional',
    index: number,
    updates: Partial<WorkshopResource>
  ) => {
    if (type === 'required') {
      const updated = [...required];
      updated[index] = { ...updated[index], ...updates };
      setWorkshop((prev) => ({ ...prev, requiredResources: updated }));
    } else {
      const updated = [...optional];
      updated[index] = { ...updated[index], ...updates };
      setWorkshop((prev) => ({ ...prev, optionalResources: updated }));
    }
  };

  const handleDeleteResource = (type: 'required' | 'optional', index: number) => {
    if (type === 'required') {
      setWorkshop((prev) => ({
        ...prev,
        requiredResources: (prev.requiredResources || []).filter((_, i) => i !== index),
      }));
    } else {
      setWorkshop((prev) => ({
        ...prev,
        optionalResources: (prev.optionalResources || []).filter((_, i) => i !== index),
      }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Required Resources Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
              <h3 className="text-base font-bold text-slate-900">Required Resources</h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Mandatory workshop texts, institutional policy briefs, or proprietary software platforms
              required for participation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddResource('required')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#002B49] text-white text-xs font-bold hover:bg-[#003d66] shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Add Required Resource</span>
          </button>
        </div>

        {required.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3">No required resources specified yet.</p>
        ) : (
          <div className="space-y-3">
            {required.map((res, index) => (
              <div
                key={res.id || index}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Required Item #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteResource('required', index)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resource Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. UCW Enterprise AI Strategy Playbook"
                      value={res.title}
                      onChange={(e) =>
                        handleUpdateResource('required', index, { title: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      External URL / Link (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={res.url || ''}
                        onChange={(e) =>
                          handleUpdateResource('required', index, { url: e.target.value })
                        }
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                      />
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description & Citation Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Provide textbook edition, specific chapters, or access instructions..."
                    value={res.description || ''}
                    onChange={(e) =>
                      handleUpdateResource('required', index, { description: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Optional Resources Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              <h3 className="text-base font-bold text-slate-900">
                Optional / Supplementary Resources
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Recommended supplementary reading, advanced research papers, video tutorials, or open
              datasets.
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleAddResource('optional')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 text-sky-600" />
            <span>Add Optional Resource</span>
          </button>
        </div>

        {optional.length === 0 ? (
          <p className="text-xs text-slate-400 italic py-3">
            No optional resources added yet.
          </p>
        ) : (
          <div className="space-y-3">
            {optional.map((res, index) => (
              <div
                key={res.id || index}
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800">
                    Optional Item #{index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleDeleteResource('optional', index)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Resource Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. NIST AI Risk Management Framework"
                      value={res.title}
                      onChange={(e) =>
                        handleUpdateResource('optional', index, { title: e.target.value })
                      }
                      className="w-full px-3 py-2 text-xs font-semibold border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      External URL / Link (Optional)
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://..."
                        value={res.url || ''}
                        onChange={(e) =>
                          handleUpdateResource('optional', index, { url: e.target.value })
                        }
                        className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                      />
                      <ExternalLink className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Description / Context
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Supplementary context or advanced reference details..."
                    value={res.description || ''}
                    onChange={(e) =>
                      handleUpdateResource('optional', index, { description: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
