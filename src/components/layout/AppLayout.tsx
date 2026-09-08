import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

interface AppLayoutProps {
  currentView: string;
  onNavigate: (view: string, id?: string) => void;
  globalSearch: string;
  setGlobalSearch: (s: string) => void;
  onOpenCreateWorkshop: () => void;
  onLogoutRequest?: () => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentView,
  onNavigate,
  globalSearch,
  setGlobalSearch,
  onOpenCreateWorkshop,
  onLogoutRequest,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden select-none">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={onNavigate}
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        onLogoutRequest={onLogoutRequest}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          onNavigate={onNavigate}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
          onOpenCreateWorkshop={onOpenCreateWorkshop}
          onLogoutRequest={onLogoutRequest}
        />

        {/* Scrollable workspace */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>

        {/* Institutional Theme Footer */}
        <footer className="h-11 bg-white border-t border-slate-200 flex items-center px-4 sm:px-8 justify-between text-[10px] font-black uppercase tracking-widest text-slate-400 shrink-0 select-none">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>Cloud Connected & Server Synchronized</span>
          </div>
          <div>UCW Workshop Planner v2.4 • Academic Curriculum</div>
        </footer>
      </div>
    </div>
  );
};
