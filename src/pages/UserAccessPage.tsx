import React, { useState, useEffect } from 'react';
import {
  Users,
  UserCheck,
  UserX,
  UserPlus,
  ShieldCheck,
  Lock,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  Trash2,
  Edit2,
  X,
  Check,
  Database,
  ExternalLink,
  RefreshCw,
  Eye,
  KeyRound,
  AlertTriangle,
  Building2,
  Mail,
  ShieldAlert,
  Unlock,
  Copy,
  UploadCloud,
  DownloadCloud,
  Server,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userAccessService } from '../services/userAccessService';
import { supabaseService, SupabaseTableStats } from '../services/supabaseService';
import { repository as horusRepository } from '../database';
import { UserAccount, UserAccessRequest, UserRole, UserAccountStatus, SupabaseConfigStatus } from '../types';
import { humanApprovalGate } from '../security/approvalGate';
import { GoogleIcon } from '../components/GoogleIcon';

export const UserAccessPage: React.FC = () => {
  const { currentUser, switchUserAccount, hasPermission } = useAuth();

  // State
  const [users, setUsers] = useState<UserAccount[]>(() => userAccessService.getAllUsers());
  const [requests, setRequests] = useState<UserAccessRequest[]>(() => userAccessService.getAllRequests());
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseConfigStatus | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Notifications
  const [alert, setAlert] = useState<{ type: 'success' | 'error' | 'warning'; message: string } | null>(null);

  // Form states for Add User
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserOrg, setNewUserOrg] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('OPERATOR');
  const [newUserPassword, setNewUserPassword] = useState('');

  // Form states for Edit User
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('OPERATOR');
  const [editOrg, setEditOrg] = useState('');
  const [editStatus, setEditStatus] = useState<UserAccountStatus>('APPROVED');

  // Supabase modal form
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);
  const [copiedCoreSql, setCopiedCoreSql] = useState(false);

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableStats, setTableStats] = useState<SupabaseTableStats | null>(null);
  const [isPushing, setIsPushing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  // Check Supabase status and table statistics
  const refreshSupabaseStatus = async () => {
    const status = await supabaseService.getStatus();
    setSupabaseStatus(status);
    if (status.url) setSbUrl(status.url);
    if (status.connectionStatus === 'CONNECTED') {
      try {
        const stats = await supabaseService.getTableStats();
        setTableStats(stats);
      } catch {
        // ignore
      }
    }
  };

  const handlePushAllData = async () => {
    setIsPushing(true);
    try {
      const res = await horusRepository.syncAllDataToSupabase();
      const stats = await supabaseService.getTableStats();
      setTableStats(stats);
      showAlert(
        'success',
        `Successfully pushed to Supabase: ${res.businesses} businesses, ${res.leads} leads, ${res.contacts} contacts, ${res.audits} audits, and ${res.proposals} proposals!`
      );
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to push data to Supabase.');
    } finally {
      setIsPushing(false);
    }
  };

  const handlePullAllData = async () => {
    setIsPulling(true);
    try {
      const ok = await horusRepository.hydrateFromSupabase();
      if (ok) {
        await userAccessService.refreshFromSources();
        setUsers(userAccessService.getAllUsers());
        setRequests(userAccessService.getAllRequests());
        const stats = await supabaseService.getTableStats();
        setTableStats(stats);
        showAlert('success', 'Successfully hydrated all business intelligence and users from Supabase!');
      } else {
        showAlert('warning', 'Could not hydrate: Supabase not reachable or tables empty.');
      }
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to pull from Supabase.');
    } finally {
      setIsPulling(false);
    }
  };

  const handleCopyCoreMigrationSql = () => {
    const sql = supabaseService.getCoreCrmMigrationSql();
    navigator.clipboard.writeText(sql);
    setCopiedCoreSql(true);
    setTimeout(() => setCopiedCoreSql(false), 3000);
    showAlert('success', 'Core CRM migration script (businesses, leads, contacts, proposals with cascading deletes) copied to clipboard!');
  };

  const handleCopySchemaSql = () => {
    const sql = supabaseService.getRecommendedSchemaSql();
    navigator.clipboard.writeText(sql);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 3000);
    showAlert('success', 'Supabase PostgreSQL schema copied to clipboard! Paste into Supabase SQL Editor.');
  };

  const handleManualSync = async () => {
    setIsRefreshing(true);
    try {
      await userAccessService.refreshFromSources();
      await refreshSupabaseStatus();
      setUsers(userAccessService.getAllUsers());
      setRequests(userAccessService.getAllRequests());
      showAlert('success', 'Access requests and user directory synchronized.');
    } catch {
      showAlert('warning', 'Local vault active; server synchronization in progress.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    refreshSupabaseStatus();
    userAccessService.refreshFromSources().then(() => {
      setUsers(userAccessService.getAllUsers());
      setRequests(userAccessService.getAllRequests());
    });
    const unsubscribe = userAccessService.subscribe(() => {
      setUsers(userAccessService.getAllUsers());
      setRequests(userAccessService.getAllRequests());
    });
    return () => unsubscribe();
  }, []);

  const showAlert = (type: 'success' | 'error' | 'warning', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 6000);
  };

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.organization && u.organization.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');

  // Handle Approve Request
  const handleApproveRequest = async (request: UserAccessRequest, assignedRole?: UserRole) => {
    const roleToAssign = assignedRole || request.requestedRole;

    const confirmed = await humanApprovalGate.requestApproval({
      actionType: 'CHANGING_SYSTEM_CONFIG',
      targetSummary: `Grant ${roleToAssign} dashboard access to ${request.email}`,
      customDescription: `Authorize user to access CRM records, run discovery searches, and operate within the ${roleToAssign} permission boundary.`,
      payload: { requestId: request.id, roleToAssign, email: request.email },
    });

    if (!confirmed) return;

    try {
      const user = await userAccessService.approveRequest(
        request.id,
        roleToAssign,
        currentUser?.userId || 'admin'
      );
      showAlert('success', `Access granted to ${user.displayName} (${user.email}) as ${user.role}.`);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to approve request.');
    }
  };

  // Handle Reject Request
  const handleConfirmReject = async () => {
    if (!rejectingRequestId) return;
    try {
      const req = await userAccessService.rejectRequest(
        rejectingRequestId,
        rejectReason || 'Administrative decision',
        currentUser?.userId || 'admin'
      );
      showAlert('warning', `Access request for ${req.fullName} was rejected.`);
      setRejectingRequestId(null);
      setRejectReason('');
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to reject request.');
    }
  };

  // Handle Add User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserEmail || !newUserName) return;
    if (!newUserPassword || newUserPassword.length < 8) {
      showAlert('error', 'A password of at least 8 characters is required for the new user.');
      return;
    }

    try {
      const newUser = await userAccessService.addUser(
        {
          email: newUserEmail,
          displayName: newUserName,
          organization: newUserOrg,
          role: newUserRole,
          status: 'APPROVED',
          password: newUserPassword,
        },
        currentUser?.userId || 'admin'
      );

      showAlert('success', `New user account created: ${newUser.displayName} (${newUser.role}).`);
      setIsAddUserOpen(false);
      setNewUserEmail('');
      setNewUserName('');
      setNewUserOrg('');
      setNewUserRole('OPERATOR');
      setNewUserPassword('');
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to create user.');
    }
  };

  // Handle Edit User
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const updated = await userAccessService.updateUser(
        editingUser.id,
        {
          displayName: editName,
          role: editRole,
          organization: editOrg,
          status: editStatus,
        },
        currentUser?.userId || 'admin'
      );

      showAlert('success', `Updated user account for ${updated.displayName}.`);
      setEditingUser(null);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to update user.');
    }
  };

  // Handle Delete User
  const handleDeleteUser = async (user: UserAccount) => {
    if (user.id === currentUser?.userId) {
      showAlert('error', 'Safety protection: You cannot delete your own active user account.');
      return;
    }

    const confirmed = await humanApprovalGate.requestApproval({
      actionType: 'CHANGING_SYSTEM_CONFIG',
      targetSummary: `Permanently delete account and revoke all permissions for ${user.email}`,
      customDescription: `This will immediately revoke access and prevent the user from accessing the system.`,
      payload: { userId: user.id, email: user.email },
    });

    if (!confirmed) return;

    try {
      await userAccessService.deleteUser(user.id, currentUser?.userId || 'admin');
      showAlert('success', `User account for ${user.displayName} revoked and deleted.`);
    } catch (err: any) {
      showAlert('error', err.message || 'Failed to delete user.');
    }
  };

  // Handle Save Supabase Config
  const handleSaveSupabase = () => {
    if (!sbUrl || !sbKey) {
      showAlert('error', 'Please provide both Supabase URL and Public Anon Key.');
      return;
    }
    supabaseService.setCredentials(sbUrl, sbKey);
    refreshSupabaseStatus();
    setIsSupabaseModalOpen(false);
    showAlert('success', 'Supabase credentials saved and initialized.');
  };

  const handleClearSupabase = () => {
    supabaseService.clearCredentials();
    refreshSupabaseStatus();
    setIsSupabaseModalOpen(false);
    showAlert('warning', 'Supabase credentials cleared. Using Enterprise Vault storage.');
  };

  const handleUnlockUser = async (user: UserAccount) => {
    const res = await userAccessService.unlockAccount(user.id, currentUser?.displayName || 'admin');
    if (res.success) {
      setUsers(userAccessService.getAllUsers());
      showAlert('success', `Security lockout cleared for ${user.displayName}.`);
    } else {
      showAlert('error', res.error || 'Failed to unlock account.');
    }
  };

  const canManageUsers = hasPermission('MANAGE_USERS');

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 text-left">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2 text-cyan-600 font-mono text-xs font-semibold uppercase tracking-wider">
            <Lock className="w-4 h-4" />
            <span>Separated Administrative Control</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
            User Access & Permissions
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Review pending access requests from team members, grant or reject permissions, and manage user accounts with strict role-based separation.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Supabase Status Pill */}
          <button
            type="button"
            onClick={() => setIsSupabaseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold hover:border-cyan-500 transition-colors shadow-xs"
          >
            <Database className="w-3.5 h-3.5 text-cyan-500" />
            <span>
              {supabaseStatus?.connectionStatus === 'CONNECTED'
                ? 'Supabase: Connected'
                : 'Supabase: Configure'}
            </span>
          </button>

          {/* Add User Button */}
          {canManageUsers && (
            <button
              type="button"
              onClick={() => setIsAddUserOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold transition-all shadow-md shadow-cyan-500/20 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User Account</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Notifications */}
      {alert && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
            alert.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : alert.type === 'error'
              ? 'bg-red-50 border-red-300 text-red-800'
              : 'bg-amber-50 border-amber-300 text-amber-800'
          }`}
        >
          <div className="flex items-center gap-2 font-medium">
            {alert.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
            {alert.type === 'error' && <AlertCircle className="w-4 h-4 text-red-500" />}
            {alert.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-500" />}
            <span>{alert.message}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SECTION 1: PENDING ACCESS REQUESTS (Top Priority for Admins) */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Pending Access Requests Queue
              </h2>
              <p className="text-[11px] text-slate-500">
                Applicants who requested workspace access from the Landing Page.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualSync}
              disabled={isRefreshing}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              title="Synchronize requests with server and local storage vault"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-600 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{isRefreshing ? 'Syncing...' : 'Sync Queue'}</span>
            </button>

            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {pendingRequests.length} Waiting Review
            </span>
          </div>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 space-y-1">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto opacity-70" />
            <p className="font-semibold text-slate-700">No pending access requests.</p>
            <p className="text-[11px] text-slate-400">
              When new operators submit a request via the Landing Page, they will appear here for administrative authorization.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-amber-200 bg-amber-50/40 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-bold text-slate-900 text-xs">
                      {req.fullName}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      <span>{req.email}</span>
                    </div>
                    {req.organization && (
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3" />
                        <span>{req.organization}</span>
                      </div>
                    )}
                  </div>

                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-cyan-100 text-cyan-800 border border-cyan-300">
                    Wants {req.requestedRole}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-white/80 border border-slate-200 text-[11px] text-slate-700">
                  <span className="font-semibold text-slate-900">Justification: </span>
                  "{req.reason}"
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400 border-t border-amber-200/60 pt-2.5">
                  <span>Submitted {new Date(req.submittedAt).toLocaleDateString()}</span>

                  {canManageUsers ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingRequestId(req.id);
                          setRejectReason('');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-red-300 bg-red-50 text-red-700 font-semibold hover:bg-red-100 cursor-pointer"
                      >
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() => handleApproveRequest(req, req.requestedRole)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-xs cursor-pointer flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>Approve Access</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400 italic">Admin authorization required</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: ACTIVE USERS DIRECTORY */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-500" />
              <span>Active User Directory ({users.length})</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Manage accounts, update roles, toggle access statuses, or revoke privileges.
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or org..."
              className="w-full rounded-xl border border-slate-300 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-cyan-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Role:</span>
          {['ALL', 'OWNER', 'ADMIN', 'OPERATOR', 'VIEWER'].map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setRoleFilter(role)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                roleFilter === role
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {role}
            </button>
          ))}

          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider ml-3">Status:</span>
          {['ALL', 'APPROVED', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:text-slate-900'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        {/* User Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-semibold">
                <th className="py-2.5 px-3">User & Email</th>
                <th className="py-2.5 px-3">Role</th>
                <th className="py-2.5 px-3">Organization</th>
                <th className="py-2.5 px-3">Auth & Security</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Last Login</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isCurrent = u.id === currentUser?.userId;

                return (
                  <tr
                    key={u.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isCurrent ? 'bg-cyan-50/40' : ''
                    }`}
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
                          {u.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span>{u.displayName}</span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-100 text-cyan-800">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">{u.email}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          u.role === 'OWNER'
                            ? 'bg-purple-100 text-purple-800 border border-purple-300'
                            : u.role === 'ADMIN'
                            ? 'bg-blue-100 text-blue-800 border border-blue-300'
                            : u.role === 'OPERATOR'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-700 font-medium">
                      {u.organization || '—'}
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {u.isGoogleConnected ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <GoogleIcon className="w-3 h-3" />
                            <span>Google Linked</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <KeyRound className="w-3 h-3 text-slate-400" />
                            <span>Password</span>
                          </span>
                        )}

                        {u.lockoutUntil && new Date(u.lockoutUntil) > new Date() && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-300 animate-pulse">
                            <Lock className="w-3 h-3" />
                            <span>Locked</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-semibold ${
                          u.status === 'APPROVED'
                            ? 'text-emerald-600'
                            : u.status === 'SUSPENDED'
                            ? 'text-red-600'
                            : 'text-amber-600'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <span>{u.status}</span>
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 text-[11px]">
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end space-x-1.5">
                        {/* Unlock Account button if locked */}
                        {canManageUsers && u.lockoutUntil && new Date(u.lockoutUntil) > new Date() && (
                          <button
                            type="button"
                            onClick={() => handleUnlockUser(u)}
                            title="Clear Lockout & Unlock Account"
                            className="p-1 rounded-lg text-amber-500 hover:text-amber-600 hover:bg-amber-50 cursor-pointer"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Switch perspective button */}
                        <button
                          type="button"
                          onClick={() => {
                            switchUserAccount(u.id);
                            showAlert('success', `Active session perspective switched to ${u.displayName} (${u.role}).`);
                          }}
                          title="Simulate / Switch Session to this User"
                          className="p-1 rounded-lg text-slate-500 hover:text-cyan-600 hover:bg-slate-100"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit User Button */}
                        {canManageUsers && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingUser(u);
                              setEditName(u.displayName);
                              setEditRole(u.role);
                              setEditOrg(u.organization || '');
                              setEditStatus(u.status);
                            }}
                            title="Edit User Role & Details"
                            className="p-1 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete User Button */}
                        {canManageUsers && !isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            title="Revoke & Delete User Account"
                            className="p-1 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: REJECT REQUEST MODAL */}
      {rejectingRequestId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                <ShieldAlert className="w-4 h-4" />
                <span>Reject Access Request</span>
              </div>
              <button
                onClick={() => setRejectingRequestId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Please specify the administrative justification for denying access. The applicant will see this explanation if they check their status.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Rejection Reason
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete agency credential verification or unauthorized external domain."
                rows={3}
                className="w-full rounded-xl border border-slate-300 bg-white p-2.5 text-xs text-slate-900 focus:border-red-500 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingRequestId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-xs"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: ADD USER MODAL */}
      {isAddUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm">
                <UserPlus className="w-4 h-4" />
                <span>Create Authorized User Account</span>
              </div>
              <button
                onClick={() => setIsAddUserOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="e.g. Jordan Mitchell"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Work Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="e.g. jordan@horusscope.agency"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Initial Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  minLength={8}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role Assigned
                  </label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="OPERATOR">Operator (Prospecting)</option>
                    <option value="ADMIN">Admin (Operations)</option>
                    <option value="VIEWER">Viewer (Read-Only)</option>
                    <option value="OWNER">Owner (Principal)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={newUserOrg}
                    onChange={(e) => setNewUserOrg(e.target.value)}
                    placeholder="e.g. Growth Ops"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-xs"
                >
                  Create & Authorize
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 5: EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-5 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                <Edit2 className="w-4 h-4" />
                <span>Edit User: {editingUser.displayName}</span>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email (Immutable ID)
                </label>
                <input
                  type="email"
                  value={editingUser.email}
                  disabled
                  className="w-full rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-xs text-slate-500 cursor-not-allowed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Role
                  </label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="OPERATOR">Operator</option>
                    <option value="ADMIN">Admin</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Account Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as UserAccountStatus)}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                  >
                    <option value="APPROVED">Active (Approved)</option>
                    <option value="SUSPENDED">Suspended</option>
                    <option value="PENDING">Pending Review</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Organization / Agency
                </label>
                <input
                  type="text"
                  value={editOrg}
                  onChange={(e) => setEditOrg(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs"
                >
                  Save Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SECTION 6: SUPABASE CLOUD CONFIGURATION MODAL */}
      {isSupabaseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-cyan-600 font-bold text-sm">
                <Database className="w-4 h-4" />
                <span>Supabase Cloud Integration</span>
              </div>
              <button
                onClick={() => setIsSupabaseModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span>Connection Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    supabaseStatus?.connectionStatus === 'CONNECTED'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {supabaseStatus?.connectionStatus || 'STANDALONE_LOCAL_VAULT'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Connect your remote Supabase PostgreSQL project for persistent cloud storage, multi-user authentication, and centralized CRM synchronization across all domains.
              </p>
            </div>

            {/* Live Database Stats (When Connected) */}
            {supabaseStatus?.connectionStatus === 'CONNECTED' && (
              <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200/80 text-xs space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-800">
                  <span className="flex items-center gap-1.5 text-cyan-900">
                    <Server className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Remote Database Records (Supabase)</span>
                  </span>
                  <button
                    type="button"
                    onClick={refreshSupabaseStatus}
                    className="text-[11px] text-cyan-700 hover:text-cyan-900 font-medium flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Refresh Stats
                  </button>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-1">
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.businesses ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Businesses</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.leads ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Leads</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.contacts ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Contacts</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.proposals ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Proposals</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.websiteAudits ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Audits</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.accessRequests ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Requests</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.userAccounts ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Users</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white border border-cyan-100 text-center">
                    <div className="text-base font-black text-slate-800">{tableStats?.auditLogs ?? 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase font-semibold">Audit Logs</div>
                  </div>
                </div>

                {/* Database Synchronization Action Buttons */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cyan-200/50">
                  <button
                    type="button"
                    onClick={handlePushAllData}
                    disabled={isPushing}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
                  >
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>{isPushing ? 'Pushing to Supabase...' : 'Push All Data to Supabase'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePullAllData}
                    disabled={isPulling}
                    className="flex-1 py-1.5 px-2.5 rounded-lg bg-white border border-cyan-300 text-cyan-800 hover:bg-cyan-50 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
                  >
                    <DownloadCloud className="w-3.5 h-3.5" />
                    <span>{isPulling ? 'Hydrating...' : 'Pull / Hydrate From Supabase'}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="text"
                  value={sbUrl}
                  onChange={(e) => setSbUrl(e.target.value)}
                  placeholder="https://xyzproject.supabase.co"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supabase Public Anon Key
                </label>
                <input
                  type="password"
                  value={sbKey}
                  onChange={(e) => setSbKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-cyan-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-cyan-50/50 border border-cyan-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-cyan-950 font-medium">Core CRM Migration Script (Leads, Contacts, Businesses, Proposals):</span>
                <button
                  type="button"
                  onClick={handleCopyCoreMigrationSql}
                  className="px-2.5 py-1 rounded bg-white border border-cyan-300 hover:border-cyan-500 text-cyan-800 hover:text-cyan-900 flex items-center gap-1 text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedCoreSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Migration Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-cyan-600" />
                      <span>Copy Core Migration SQL</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-cyan-900/80 leading-relaxed">
                Includes relational foreign keys (<code className="bg-cyan-100/70 px-1 rounded text-cyan-900">ON DELETE CASCADE</code>) across <code className="bg-cyan-100/70 px-1 rounded text-cyan-900">businesses</code>, <code className="bg-cyan-100/70 px-1 rounded text-cyan-900">leads</code>, <code className="bg-cyan-100/70 px-1 rounded text-cyan-900">contacts</code>, and <code className="bg-cyan-100/70 px-1 rounded text-cyan-900">proposals</code> with timestamp triggers and RLS policies.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-slate-700">Complete Production SQL Schema (All 14 Tables):</span>
                <button
                  type="button"
                  onClick={handleCopySchemaSql}
                  className="px-2.5 py-1 rounded bg-white border border-slate-300 hover:border-cyan-500 text-slate-700 hover:text-cyan-700 flex items-center gap-1 text-[11px] font-medium shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">SQL Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-500" />
                      <span>Copy Full Schema SQL</span>
                    </>
                  )}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Run this complete SQL script in your Supabase SQL Editor. It creates all 15 core tables (<code className="bg-slate-200 px-1 rounded text-slate-800">businesses</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">leads</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">contacts</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">website_audits</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">proposals</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">access_requests</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">user_accounts</code>, <code className="bg-slate-200 px-1 rounded text-slate-800">audit_logs</code>, etc.) with high-performance indexes and RLS security policies.
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClearSupabase}
                className="text-xs text-red-500 hover:underline"
              >
                Clear & Use Enterprise Vault
              </button>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsSupabaseModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handleSaveSupabase}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs shadow-xs"
                >
                  Save & Connect
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
