import React from 'react';
import {
  LayoutDashboard,
  Map as MapIcon,
  Compass,
  Building2,
  FileSearch,
  Users,
  Send,
  FileText,
  BarChart3,
  Power,
  ShieldCheck,
  Settings,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'map', label: 'Map', icon: MapIcon },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'leads', label: 'Leads', icon: Building2 },
  { id: 'intelligence', label: 'Intelligence', icon: FileSearch },
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'outreach', label: 'Outreach', icon: Send },
  { id: 'proposals', label: 'Proposals', icon: FileText },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'automations', label: 'Automations', icon: Power },
  { id: 'users', label: 'User Access', icon: UserCheck, adminOnly: true },
  { id: 'security', label: 'Security', icon: ShieldCheck, badge: 'SAFE' },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface NavigationProps {
  activePage: string;
  onSelectPage: (pageId: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activePage, onSelectPage }) => {
  const { currentUser, logout, pendingRequestsCount } = useAuth();
  const isAdmin = currentUser?.role === 'OWNER' || currentUser?.role === 'ADMIN';
  const visibleNavItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <nav className="w-full lg:fixed lg:top-[61px] lg:bottom-0 lg:left-0 lg:w-60 bg-white border-r border-slate-200 p-4 flex flex-col justify-between select-none overflow-y-auto shrink-0 shadow-xs z-30">
      <div className="space-y-1">
        <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
          Platform Navigation
        </div>

        <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-x-visible pb-2 lg:pb-0">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            const badgeText =
              item.id === 'users' && pendingRequestsCount > 0
                ? `${pendingRequestsCount} REQ`
                : item.badge;

            return (
              <button
                key={item.id}
                id={`nav-item-${item.id}`}
                onClick={() => onSelectPage(item.id)}
                className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon
                  className={`w-4 h-4 flex-shrink-0 ${
                    isActive ? 'text-white' : 'text-slate-500'
                  }`}
                />
                <span className="flex-1 text-left">{item.label}</span>
                {badgeText && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                      item.id === 'users' && pendingRequestsCount > 0
                        ? 'bg-amber-500 text-slate-950 font-bold animate-pulse'
                        : isActive
                        ? 'bg-slate-800 text-slate-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {badgeText}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden lg:block pt-4 border-t border-slate-200 space-y-3">
        {/* Current User Session Bar */}
        {currentUser && (
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 uppercase">
                  {currentUser.displayName.charAt(0)}
                </div>
                <div className="min-w-0 truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {currentUser.displayName}
                  </div>
                  <div className="text-[10px] font-mono text-blue-700 font-semibold">
                    {currentUser.role}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Sign out to Landing Page"
                className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
          <div className="font-semibold text-slate-700">HORUSCOPE Acquisition</div>
          <div>Enterprise Client OS</div>
          <div className="text-[10px] font-mono text-slate-400">v3.4.0 • Secured</div>
        </div>
      </div>
    </nav>
  );
};
