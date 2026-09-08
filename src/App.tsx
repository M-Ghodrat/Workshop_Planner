import React, { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { LoginPage } from './components/auth/LoginPage';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './components/dashboard/Dashboard';
import { WorkshopList } from './components/workshops/WorkshopList';
import { WorkshopEditor } from './components/workshops/WorkshopEditor';
import { WorkshopPreview } from './components/workshops/WorkshopPreview';
import { UnsavedChangesModal } from './components/workshops/UnsavedChangesModal';
import { SeriesList } from './components/series/SeriesList';
import { MaterialsRepository } from './components/materials/MaterialsRepository';
import { MaterialPreviewModal } from './components/materials/MaterialPreviewModal';
import { UserManagement } from './components/admin/UserManagement';

import { workshopService } from './services/workshopService';
import { seriesService } from './services/seriesService';
import { materialService } from './services/materialService';
import { userService } from './services/userService';
import { seedService } from './services/seedService';

import { Workshop, WorkshopSeries, Material, UserProfile } from './types';

type ActiveView =
  | 'dashboard'
  | 'workshops'
  | 'workshop-editor'
  | 'workshop-preview'
  | 'series'
  | 'materials'
  | 'admin-users';

type PendingAction =
  | { type: 'navigate'; view: string; id?: string }
  | { type: 'create' }
  | { type: 'edit'; workshop: Workshop }
  | { type: 'preview'; workshop: Workshop }
  | { type: 'back' }
  | { type: 'logout' }
  | null;

const MainApp: React.FC = () => {
  const { userProfile, loading, isAuthenticated, logout } = useAuth();
  const { info } = useToast();

  const [activeView, setActiveView] = useState<ActiveView>('dashboard');
  const [workshopViewMode, setWorkshopViewMode] = useState<'my' | 'all'>('all');
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');

  // Unsaved changes protection states
  const [editorSessionKey, setEditorSessionKey] = useState<number>(0);
  const [isWorkshopDirty, setIsWorkshopDirty] = useState<boolean>(false);
  const [workshopDraftSummary, setWorkshopDraftSummary] = useState<{
    prefix: string;
    code: string;
    title: string;
    isNew: boolean;
  } | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [isModalSaving, setIsModalSaving] = useState<boolean>(false);

  const saveWorkshopRef = useRef<(() => Promise<boolean>) | null>(null);
  const resetDraftRef = useRef<(() => void) | null>(null);

  // Data states
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [series, setSeries] = useState<WorkshopSeries[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Load Firestore data with real-time listeners and initial sample data seeding if needed
  useEffect(() => {
    if (!isAuthenticated || !userProfile) return;

    let isMounted = true;

    // 1. Subscribe to workshops
    const unsubscribeWorkshops = workshopService.subscribeWorkshops((data) => {
      if (!isMounted) return;
      const safeData = Array.isArray(data) ? data : [];
      setWorkshops(safeData);
      setDataLoading(false);
    });

    // 2. Subscribe to series
    const unsubscribeSeries = seriesService.subscribeSeries((data) => {
      if (isMounted) setSeries(Array.isArray(data) ? data : []);
    });

    // 3. Subscribe to materials
    const unsubscribeMaterials = materialService.subscribeMaterials((data) => {
      if (isMounted) setMaterials(Array.isArray(data) ? data : []);
    });

    // 4. Subscribe to users with live updates
    const unsubscribeUsers = userService.subscribeUsers((uList) => {
      if (isMounted) setUsers(Array.isArray(uList) ? uList : []);
    });

    return () => {
      isMounted = false;
      if (typeof unsubscribeWorkshops === 'function') unsubscribeWorkshops();
      if (typeof unsubscribeSeries === 'function') unsubscribeSeries();
      if (typeof unsubscribeMaterials === 'function') unsubscribeMaterials();
      if (typeof unsubscribeUsers === 'function') unsubscribeUsers();
    };
  }, [isAuthenticated, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-[#002B49] border border-sky-400/30 flex items-center justify-center animate-spin">
          <div className="w-4 h-4 bg-amber-400 rounded-full" />
        </div>
        <div className="text-center">
          <h3 className="text-sm font-bold tracking-wide">University Canada West</h3>
          <p className="text-xs text-slate-400 mt-0.5">Loading Workshop Planner workspace...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Raw navigation executor
  const executeDirectNavigation = (view: string) => {
    if (view === 'create-workshop') {
      setSelectedWorkshop(null);
      setActiveView('workshop-editor');
    } else if (view === 'my-workshops') {
      setWorkshopViewMode('my');
      setActiveView('workshops');
    } else if (view === 'all-workshops' || view === 'workshops') {
      setWorkshopViewMode('all');
      setActiveView('workshops');
    } else if (view === 'users' || view === 'admin-users') {
      setActiveView('admin-users');
    } else if (view === 'series') {
      setActiveView('series');
    } else if (view === 'materials') {
      setActiveView('materials');
    } else if (view === 'dashboard') {
      setActiveView('dashboard');
    }
  };

  // Workshop navigation handlers with dirty checks
  const handleOpenCreateWorkshop = () => {
    if (activeView === 'workshop-editor' && isWorkshopDirty) {
      setPendingAction({ type: 'create' });
      return;
    }
    setEditorSessionKey((k) => k + 1);
    setIsWorkshopDirty(false);
    setSelectedWorkshop(null);
    setActiveView('workshop-editor');
  };

  const handleOpenEditWorkshop = (workshop: Workshop) => {
    if (activeView === 'workshop-editor' && isWorkshopDirty && selectedWorkshop?.id !== workshop.id) {
      setPendingAction({ type: 'edit', workshop });
      return;
    }
    setEditorSessionKey((k) => k + 1);
    setIsWorkshopDirty(false);
    setSelectedWorkshop(workshop);
    setActiveView('workshop-editor');
  };

  const handleOpenPreviewWorkshop = (workshop: Workshop) => {
    if (activeView === 'workshop-editor' && isWorkshopDirty) {
      setPendingAction({ type: 'preview', workshop });
      return;
    }
    setSelectedWorkshop(workshop);
    setActiveView('workshop-preview');
  };

  const handleSelectWorkshopFromCatalog = (workshop: Workshop, mode: 'edit' | 'preview') => {
    if (mode === 'preview') {
      handleOpenPreviewWorkshop(workshop);
    } else {
      handleOpenEditWorkshop(workshop);
    }
  };

  const handleBackFromEditor = () => {
    if (isWorkshopDirty) {
      setPendingAction({ type: 'back' });
      return;
    }
    setSelectedWorkshop(null);
    setActiveView('workshops');
  };

  const handleLogoutRequest = () => {
    if (activeView === 'workshop-editor' && isWorkshopDirty) {
      setPendingAction({ type: 'logout' });
      return;
    }
    logout();
  };

  // Universal navigation handler for all sidebar and inner links
  const handleNavigate = (view: string) => {
    if (activeView === 'workshop-editor' && isWorkshopDirty) {
      // If clicking create-workshop while already in editor with unsaved changes, trigger warning
      if (view === 'create-workshop') {
        setPendingAction({ type: 'create' });
        return;
      }
      setPendingAction({ type: 'navigate', view });
      return;
    }
    executeDirectNavigation(view);
  };

  // Execute Pending Action when Discarding
  const handleDiscardAndLeave = () => {
    if (resetDraftRef.current) {
      resetDraftRef.current();
    }
    setEditorSessionKey((k) => k + 1);
    setIsWorkshopDirty(false);
    setWorkshopDraftSummary(null);

    const action = pendingAction;
    setPendingAction(null);

    if (!action) return;

    info('Unsaved Changes Cleared', 'Non-saved workshop draft has been discarded.');

    if (action.type === 'navigate') {
      executeDirectNavigation(action.view);
    } else if (action.type === 'create') {
      setSelectedWorkshop(null);
      setActiveView('workshop-editor');
    } else if (action.type === 'edit') {
      setSelectedWorkshop(action.workshop);
      setActiveView('workshop-editor');
    } else if (action.type === 'preview') {
      setSelectedWorkshop(action.workshop);
      setActiveView('workshop-preview');
    } else if (action.type === 'back') {
      setSelectedWorkshop(null);
      setActiveView('workshops');
    } else if (action.type === 'logout') {
      logout();
    }
  };

  // Save & Continue Action
  const handleSaveAndContinue = async () => {
    if (!saveWorkshopRef.current) return;
    setIsModalSaving(true);
    const success = await saveWorkshopRef.current();
    setIsModalSaving(false);

    if (success) {
      setIsWorkshopDirty(false);
      setWorkshopDraftSummary(null);

      const action = pendingAction;
      setPendingAction(null);

      if (!action) return;

      if (action.type === 'navigate') {
        executeDirectNavigation(action.view);
      } else if (action.type === 'create') {
        setSelectedWorkshop(null);
        setActiveView('workshop-editor');
      } else if (action.type === 'edit') {
        setSelectedWorkshop(action.workshop);
        setActiveView('workshop-editor');
      } else if (action.type === 'preview') {
        setSelectedWorkshop(action.workshop);
        setActiveView('workshop-preview');
      } else if (action.type === 'back') {
        setSelectedWorkshop(null);
        setActiveView('workshops');
      } else if (action.type === 'logout') {
        logout();
      }
    }
  };

  // Format Target View Name for Warning Dialog
  const getTargetViewLabel = (action: PendingAction): string => {
    if (!action) return 'another page';
    if (action.type === 'logout') return 'sign out';
    if (action.type === 'create') return 'a new workshop draft';
    if (action.type === 'back') return 'the Workshops catalog';
    if (action.type === 'preview') return 'Document preview';
    if (action.type === 'edit') return 'another workshop outline';
    if (action.type === 'navigate') {
      switch (action.view) {
        case 'dashboard':
          return 'the Dashboard';
        case 'my-workshops':
          return 'My Workshops';
        case 'all-workshops':
        case 'workshops':
          return 'All Workshops';
        case 'series':
          return 'Workshop Series';
        case 'materials':
          return 'the Materials Repository';
        case 'users':
        case 'admin-users':
          return 'User & Faculty Management';
        case 'create-workshop':
          return 'create a new workshop';
        default:
          return action.view;
      }
    }
    return 'another page';
  };

  // Compute the active item ID for Sidebar highlighting
  const currentNavId =
    activeView === 'workshops' || activeView === 'workshop-preview'
      ? workshopViewMode === 'my'
        ? 'my-workshops'
        : 'all-workshops'
      : activeView === 'admin-users'
      ? 'users'
      : activeView === 'workshop-editor'
      ? selectedWorkshop
        ? workshopViewMode === 'my'
          ? 'my-workshops'
          : 'all-workshops'
        : 'create-workshop'
      : activeView;

  return (
    <AppLayout
      currentView={currentNavId}
      onNavigate={handleNavigate}
      onOpenCreateWorkshop={handleOpenCreateWorkshop}
      onLogoutRequest={handleLogoutRequest}
      globalSearch={globalSearch}
      setGlobalSearch={setGlobalSearch}
    >
      {/* 1. Dashboard View */}
      {activeView === 'dashboard' && (
        <Dashboard
          workshops={workshops || []}
          series={series || []}
          materials={materials || []}
          users={users || []}
          onNavigate={handleNavigate}
          onSelectWorkshop={handleSelectWorkshopFromCatalog}
          onOpenCreateWorkshop={handleOpenCreateWorkshop}
        />
      )}

      {/* 2. Workshop Catalog List View */}
      {activeView === 'workshops' && (
        <WorkshopList
          workshops={workshops || []}
          series={series || []}
          users={users || []}
          viewMode={workshopViewMode}
          onSelectWorkshop={handleSelectWorkshopFromCatalog}
          onOpenCreateWorkshop={handleOpenCreateWorkshop}
        />
      )}

      {/* 3. Workshop Editor View */}
      {activeView === 'workshop-editor' && (
        <WorkshopEditor
          key={`workshop-editor-${editorSessionKey}`}
          initialWorkshop={selectedWorkshop}
          allWorkshops={workshops}
          allSeries={series}
          allMaterials={materials}
          allUsers={users}
          onBack={handleBackFromEditor}
          onPreview={(w) => {
            setSelectedWorkshop(w);
            setActiveView('workshop-preview');
          }}
          onOpenMaterialPreview={(mat) => setPreviewMaterial(mat)}
          onDirtyChange={(dirty, summary) => {
            setIsWorkshopDirty(dirty);
            setWorkshopDraftSummary(summary);
          }}
          onWorkshopSaved={(savedWorkshop) => {
            setSelectedWorkshop(savedWorkshop);
          }}
          saveRef={saveWorkshopRef}
          resetDraftRef={resetDraftRef}
        />
      )}

      {/* 4. Workshop Document Specification Preview */}
      {activeView === 'workshop-preview' && selectedWorkshop && (
        <WorkshopPreview
          workshop={selectedWorkshop}
          onBack={() => setActiveView('workshop-editor')}
          onEdit={(w) => {
            setSelectedWorkshop(w);
            setActiveView('workshop-editor');
          }}
        />
      )}

      {/* 5. Series Management View */}
      {activeView === 'series' && (
        <SeriesList
          series={series}
          workshops={workshops}
          onSelectWorkshop={handleSelectWorkshopFromCatalog}
          onOpenCreateWorkshop={handleOpenCreateWorkshop}
        />
      )}

      {/* 6. Materials Repository View */}
      {activeView === 'materials' && (
        <MaterialsRepository
          materials={materials}
          workshops={workshops}
          onOpenPreview={(mat) => setPreviewMaterial(mat)}
        />
      )}

      {/* 7. Faculty & User Management View */}
      {activeView === 'admin-users' && (
        <UserManagement
          users={users}
          workshops={workshops}
          onUsersUpdated={(updated) => setUsers(updated)}
        />
      )}

      {/* Global Document / Material Preview Modal */}
      {previewMaterial && (
        <MaterialPreviewModal
          material={previewMaterial}
          onClose={() => setPreviewMaterial(null)}
        />
      )}

      {/* Unsaved Changes Warning Modal */}
      <UnsavedChangesModal
        isOpen={Boolean(pendingAction)}
        workshopTitle={workshopDraftSummary?.title}
        workshopCode={
          workshopDraftSummary?.prefix && workshopDraftSummary?.code
            ? `${workshopDraftSummary.prefix} ${workshopDraftSummary.code}`
            : undefined
        }
        isNewWorkshop={workshopDraftSummary?.isNew}
        targetActionType={
          pendingAction?.type === 'logout'
            ? 'logout'
            : pendingAction?.type === 'create'
            ? 'create-fresh'
            : 'view'
        }
        targetViewName={getTargetViewLabel(pendingAction)}
        onDiscardAndLeave={handleDiscardAndLeave}
        onStayAndEdit={() => setPendingAction(null)}
        onSaveAndContinue={handleSaveAndContinue}
        isSaving={isModalSaving}
      />
    </AppLayout>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}
