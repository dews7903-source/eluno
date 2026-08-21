import React, { useState, useEffect } from 'react';
import {
  Globe,
  Users,
  Search,
  Copy,
  Check,
  ArrowRight,
  Plus,
  Radio,
  ExternalLink,
  Shield,
  Briefcase,
  Layers,
  Sparkles,
  Building2,
  Mail,
  User,
  X,
  Share2,
  RefreshCw,
} from 'lucide-react';
import { Board, UserOrgProfile, UserProfile } from '../types';
import {
  listOnlineWorkspaces,
  loginOnlineWorkspace,
  generateShareableWorkspaceUrl,
  OnlineWorkspaceInfo,
} from '../services/onlineWorkspaceService';
import { QRCodeSVG } from 'qrcode.react';

interface OnlineWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentOrgProfile: UserOrgProfile;
  currentUser: UserProfile | null;
  board: Board;
  onWorkspaceSwitched: (newProfile: UserOrgProfile, newUser: UserProfile, onlineBoard?: Board | null) => void;
  onShowToast: (type: 'success' | 'error' | 'info' | 'warning', title: string, message: string) => void;
}

export const OnlineWorkspaceModal: React.FC<OnlineWorkspaceModalProps> = ({
  isOpen,
  onClose,
  currentOrgProfile,
  currentUser,
  board,
  onWorkspaceSwitched,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'find' | 'create' | 'share'>('login');
  
  // Login Form State
  const [name, setName] = useState(currentUser?.displayName || currentOrgProfile.userName || '');
  const [email, setEmail] = useState(currentUser?.email || currentOrgProfile.userEmail || '');
  const [orgId, setOrgId] = useState(currentOrgProfile.orgId || 'ORG-GLOBAL');
  const [orgName, setOrgName] = useState(currentOrgProfile.orgName || 'Marketing Team Workspace');
  const [role, setRole] = useState(currentOrgProfile.userRole || 'Campaign Operations Lead');
  const [department, setDepartment] = useState(currentOrgProfile.userDept || 'Marketing & Strategy');

  // Find Workspaces State
  const [searchQuery, setSearchQuery] = useState('');
  const [onlineWorkspaces, setOnlineWorkspaces] = useState<OnlineWorkspaceInfo[]>([]);
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
    }
  }, [isOpen]);

  const loadWorkspaces = async () => {
    setIsLoadingList(true);
    try {
      const list = await listOnlineWorkspaces();
      setOnlineWorkspaces(list);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingList(false);
    }
  };

  if (!isOpen) return null;

  const shareUrl = generateShareableWorkspaceUrl(currentOrgProfile.orgId);

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    onShowToast('success', 'Link Copied!', 'Anyone with this link will open this exact workspace board.');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyOrgCode = () => {
    navigator.clipboard.writeText(currentOrgProfile.orgId);
    setCopiedCode(true);
    onShowToast('success', 'Workspace Code Copied!', `Share code "${currentOrgProfile.orgId}" with your team.`);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onShowToast('warning', 'Name Required', 'Please enter your name to sign in.');
      return;
    }
    if (!orgId.trim()) {
      onShowToast('warning', 'Workspace ID Required', 'Please enter or pick a Workspace / Org Code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanOrgId = orgId.trim().toUpperCase();
      const res = await loginOnlineWorkspace(cleanOrgId, {
        displayName: name.trim(),
        email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@workspace.local`,
        role,
        department,
        orgName: orgName.trim() || `${cleanOrgId} Team Workspace`,
      });

      const updatedProfile: UserOrgProfile = {
        orgId: cleanOrgId,
        orgName: res.workspace.orgName || `${cleanOrgId} Workspace`,
        userId: res.user.uid,
        userName: res.user.displayName || name,
        userRole: role,
        userDept: department,
        userEmail: res.user.email || email,
        userAvatar: res.user.photoURL,
      };

      onWorkspaceSwitched(updatedProfile, res.user, res.workspace.board);
      onShowToast(
        'success',
        `Logged into ${cleanOrgId}`,
        `Welcome, ${updatedProfile.userName}! You are connected online.`
      );
      onClose();
    } catch (err: any) {
      onShowToast('error', 'Login Failed', err.message || 'Could not connect to workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectWorkspaceFromList = async (targetOrgId: string, targetOrgName: string) => {
    setIsSubmitting(true);
    try {
      const res = await loginOnlineWorkspace(targetOrgId, {
        displayName: name.trim() || 'Team Member',
        email: email.trim() || `${(name || 'member').toLowerCase().replace(/\s+/g, '.')}@workspace.local`,
        role,
        department,
        orgName: targetOrgName,
      });

      const updatedProfile: UserOrgProfile = {
        orgId: targetOrgId,
        orgName: targetOrgName,
        userId: res.user.uid,
        userName: res.user.displayName || name || 'Team Member',
        userRole: role,
        userDept: department,
        userEmail: res.user.email || email,
        userAvatar: res.user.photoURL,
      };

      onWorkspaceSwitched(updatedProfile, res.user, res.workspace.board);
      onShowToast(
        'success',
        `Entered ${targetOrgId}`,
        `Now displaying board for "${targetOrgName}".`
      );
      onClose();
    } catch (err: any) {
      onShowToast('error', 'Join Failed', err.message || 'Could not load workspace.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredWorkspaces = onlineWorkspaces.filter(
    (w) =>
      w.orgId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.orgName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900 dark:text-slate-100"
        id="online-workspace-modal"
      >
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-white">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base">Online Workspace &amp; Local Login</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Online Sync
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                Log in and share Workspace Codes with teammates to access the exact same board.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('login')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'login'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In / Switch</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('find')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'find'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Find Workspaces</span>
            {onlineWorkspaces.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                {onlineWorkspaces.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'create'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Workspace</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('share')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'share'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 rounded-t-lg'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Share &amp; Invite</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: QUICK LOGIN */}
          {activeTab === 'login' && (
            <form onSubmit={handleQuickLogin} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3">
                <Radio className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5 animate-pulse" />
                <div className="text-xs text-indigo-900 dark:text-indigo-200">
                  <p className="font-bold">Online Local Workspace Mode</p>
                  <p className="text-[11px] opacity-80 mt-0.5">
                    Your profile and board will be broadcasted to this Workspace ID. Any team member who opens the same Workspace Code will see and edit this page in real time.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Your Full Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Rivera"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. alex@company.com"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Workspace / Org Code *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value.toUpperCase())}
                    placeholder="e.g. ORG-GLOBAL or TEAM-2026"
                    className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Tip: Share this code with others so they can join this exact board.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Workspace Title</span>
                  </label>
                  <input
                    type="text"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="e.g. Global Marketing & Ops"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Your Role in Team
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="Campaign Operations Lead">Campaign Operations Lead</option>
                    <option value="Creative & Brand Director">Creative &amp; Brand Director</option>
                    <option value="Growth & Media Strategist">Growth &amp; Media Strategist</option>
                    <option value="Principal Data Analyst">Principal Data Analyst</option>
                    <option value="Project Manager">Project Manager</option>
                    <option value="Marketing Specialist">Marketing Specialist</option>
                    <option value="Stakeholder / Viewer">Stakeholder / Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Growth & Performance"
                    className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  <span>Sign In &amp; Load Workspace Board</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: FIND WORKSPACES */}
          {activeTab === 'find' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Org Code (e.g. ORG-GLOBAL) or Workspace name..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={loadWorkspaces}
                  className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                  title="Refresh list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingList ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoadingList ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                  <span>Loading online workspaces...</span>
                </div>
              ) : filteredWorkspaces.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    No workspace found matching "{searchQuery}"
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    You can create this workspace immediately or enter the code in the Sign In tab.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      if (searchQuery.trim()) {
                        setOrgId(searchQuery.trim().toUpperCase());
                      }
                      setActiveTab('login');
                    }}
                    className="mt-3 px-3.5 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create / Enter Workspace "{searchQuery.toUpperCase() || 'NEW'}"</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Available Online Workspaces ({filteredWorkspaces.length})
                  </p>
                  {filteredWorkspaces.map((ws) => {
                    const isCurrent = ws.orgId.toUpperCase() === currentOrgProfile.orgId.toUpperCase();
                    return (
                      <div
                        key={ws.orgId}
                        className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          isCurrent
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-700 shadow-xs'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700/80 hover:border-indigo-400'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/60 px-2 py-0.5 rounded-md">
                              {ws.orgId}
                            </span>
                            <span className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                              {ws.orgName}
                            </span>
                            {isCurrent && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-emerald-500 text-white">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3 text-indigo-500" />
                              <span>{ws.memberCount || 1} team members</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              <span>{ws.onlineCount || 1} online</span>
                            </span>
                            {ws.hasBoard && (
                              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                • Live Board Ready
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSelectWorkspaceFromList(ws.orgId, ws.orgName)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-100 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white text-slate-700 dark:text-slate-200'
                          }`}
                        >
                          <span>{isCurrent ? 'Current Board' : 'Enter Workspace'}</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CREATE WORKSPACE */}
          {activeTab === 'create' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/60 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-200">
                  <p className="font-bold">Instant Online Workspace Provisioning</p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    Pick a unique Org Code for your team (e.g. <code>GROWTH-2026</code>). Anyone who types this code will instantly access this workspace board.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  New Workspace Code / Org ID *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value.toUpperCase())}
                    placeholder="e.g. MARKETING-HQ"
                    className="flex-1 px-3 py-2 rounded-xl text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const randomCode = `ORG-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;
                      setOrgId(randomCode);
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold"
                  >
                    Randomize
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Workspace Title
                </label>
                <input
                  type="text"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="e.g. Growth & Acquisition Squad"
                  className="w-full px-3 py-2 rounded-xl text-xs border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleQuickLogin}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  <span>Create Workspace &amp; Host Board</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: SHARE & INVITE */}
          {activeTab === 'share' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Direct Workspace Link
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Share this URL with colleagues. It auto-loads your active Org board.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyShareLink}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>

                <div className="p-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px] text-slate-600 dark:text-slate-300 break-all select-all">
                  {shareUrl}
                </div>
              </div>

              {/* Workspace Code Box */}
              <div className="p-4 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold text-indigo-950 dark:text-indigo-200">
                    Workspace / Org Code:
                  </p>
                  <p className="font-mono text-base font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">
                    {currentOrgProfile.orgId}
                  </p>
                  <p className="text-[11px] text-indigo-900/70 dark:text-indigo-300/70 mt-1">
                    Teammates can enter this code in the "Sign In" tab on any device to find this page.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyOrgCode}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied Code' : 'Copy Code'}</span>
                </button>
              </div>

              {/* QR Code Section for quick mobile / team testing */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-center gap-4">
                <div className="p-2 bg-white rounded-xl shadow-xs border border-slate-100 shrink-0">
                  <QRCodeSVG value={shareUrl} size={90} />
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 text-center sm:text-left">
                  <p className="font-bold text-slate-900 dark:text-slate-100">
                    Scan with Mobile or Share QR Code
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Anyone scanning this QR code will instantly open your live workspace on their phone or tablet.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-850 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Active Org: {currentOrgProfile.orgId}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
