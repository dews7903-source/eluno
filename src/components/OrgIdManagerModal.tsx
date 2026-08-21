import React, { useState, useMemo } from 'react';
import {
  X,
  Building2,
  Users,
  Copy,
  Check,
  Plus,
  Trash2,
  KeyRound,
  Sparkles,
  UserCheck,
  Briefcase,
  Layers,
  Mail,
  Shield,
  ArrowRight,
  RefreshCw,
  Search,
  UserPlus,
} from 'lucide-react';
import { OrgMember, UserOrgProfile } from '../types';
import {
  addOrgMember,
  getConnectedOrgMembers,
  removeOrgMember,
  saveConnectedOrgMembers,
  saveUserOrgProfile,
} from '../services/orgMessageService';
import {
  getAllKnownOrganizations,
  getEmployeesForOrg,
  createEmployeeSession,
} from '../services/employeeAuthService';

interface OrgIdManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userOrgProfile: UserOrgProfile;
  onUpdateProfile: (updated: UserOrgProfile) => void;
  onMembersChange?: () => void;
  onSwitchToEmployee?: (member: OrgMember) => void;
}

export const OrgIdManagerModal: React.FC<OrgIdManagerModalProps> = ({
  isOpen,
  onClose,
  userOrgProfile,
  onUpdateProfile,
  onMembersChange,
  onSwitchToEmployee,
}) => {
  const [activeTab, setActiveTab] = useState<'org-id' | 'members' | 'profile' | 'directory'>('members');
  const [inputOrgId, setInputOrgId] = useState(userOrgProfile.orgId);
  const [inputOrgName, setInputOrgName] = useState(userOrgProfile.orgName);
  
  // User profile inputs
  const [userName, setUserName] = useState(userOrgProfile.userName);
  const [userRole, setUserRole] = useState(userOrgProfile.userRole);
  const [userDept, setUserDept] = useState(userOrgProfile.userDept);
  const [userEmail, setUserEmail] = useState(userOrgProfile.userEmail);
  
  // Member search
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  
  // Members state
  const [members, setMembers] = useState<OrgMember[]>(() =>
    getConnectedOrgMembers(userOrgProfile.orgId)
  );

  // Switch toast
  const [switchToast, setSwitchToast] = useState<string | null>(null);

  // Filtered members in current Org
  const filteredMembers = useMemo(() => {
    if (!memberSearchQuery.trim()) return members;
    const q = memberSearchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.role.toLowerCase().includes(q) ||
        m.department.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q)
    );
  }, [members, memberSearchQuery]);

  const allOrganizations = useMemo(() => {
    return getAllKnownOrganizations();
  }, []);

  // New member form
  const [showAddMemberForm, setShowAddMemberForm] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('Campaign Specialist');
  const [newMemberDept, setNewMemberDept] = useState('Marketing & Operations');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberStatus, setNewMemberStatus] = useState<'online' | 'busy' | 'away'>('online');

  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleCopyOrgId = () => {
    navigator.clipboard.writeText(userOrgProfile.orgId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleGenerateOrgId = () => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newId = `ORG-TEAM-${randomSuffix}`;
    setInputOrgId(newId);
  };

  const handleSaveOrgSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputOrgId.trim().toUpperCase() || 'DEFAULT-ORG';
    const cleanName = inputOrgName.trim() || 'Team Organization';

    const updatedProfile: UserOrgProfile = {
      ...userOrgProfile,
      orgId: cleanId,
      orgName: cleanName,
    };

    onUpdateProfile(updatedProfile);
    saveUserOrgProfile(updatedProfile);

    // Refresh members for new org ID
    const newMembers = getConnectedOrgMembers(cleanId);
    setMembers(newMembers);
    if (onMembersChange) onMembersChange();

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
      userName.trim() || 'User'
    )}`;

    const updatedProfile: UserOrgProfile = {
      ...userOrgProfile,
      userName: userName.trim(),
      userRole: userRole.trim(),
      userDept: userDept.trim(),
      userEmail: userEmail.trim(),
      userAvatar: avatar,
    };

    onUpdateProfile(updatedProfile);
    saveUserOrgProfile(updatedProfile);

    // Update current user entry in connected members
    const updatedMembers = members.map((m) => {
      if (m.name === userOrgProfile.userName || m.email === userOrgProfile.userEmail) {
        return {
          ...m,
          name: userName.trim(),
          role: userRole.trim(),
          department: userDept.trim(),
          email: userEmail.trim(),
          avatar,
        };
      }
      return m;
    });

    setMembers(updatedMembers);
    saveConnectedOrgMembers(userOrgProfile.orgId, updatedMembers);
    if (onMembersChange) onMembersChange();

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const created = addOrgMember(userOrgProfile.orgId, {
      name: newMemberName.trim(),
      role: newMemberRole.trim() || 'Team Member',
      department: newMemberDept.trim() || 'General',
      email: newMemberEmail.trim() || `${newMemberName.toLowerCase().replace(/\s+/g, '.')}@org.internal`,
      status: newMemberStatus,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        newMemberName.trim()
      )}`,
    });

    const updatedMembers = [...members, created];
    setMembers(updatedMembers);
    if (onMembersChange) onMembersChange();

    // Reset form
    setNewMemberName('');
    setNewMemberEmail('');
    setShowAddMemberForm(false);
  };

  const handleRemoveMember = (memberId: string) => {
    removeOrgMember(userOrgProfile.orgId, memberId);
    const updated = members.filter((m) => m.id !== memberId);
    setMembers(updated);
    if (onMembersChange) onMembersChange();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
        id="org-id-manager-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">Organization Workspace &amp; ID</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  {userOrgProfile.orgId}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Connect your team, manage your Org ID code, and add connected members
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1.5 px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/50 shrink-0 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Find &amp; View Colleagues ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('org-id')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'org-id'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Organization ID</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'directory'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>All Orgs ({allOrganizations.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>My Org Profile</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Organization settings updated successfully!</span>
            </div>
          )}

          {switchToast && (
            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2 animate-in fade-in">
              <Check className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>{switchToast}</span>
            </div>
          )}

          {/* TAB 1: Connected Members & Colleague Search */}
          {activeTab === 'members' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>People in {userOrgProfile.orgId}</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                      {filteredMembers.length} found
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Find and interact with team members who have connected to this Organization ID.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAddMemberForm(!showAddMemberForm)}
                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member to Org</span>
                </button>
              </div>

              {/* Colleague Search Input */}
              <div className="relative">
                <input
                  type="text"
                  value={memberSearchQuery}
                  onChange={(e) => setMemberSearchQuery(e.target.value)}
                  placeholder="Find colleague by name, job role, or email..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              {/* Add Member Form Drawer */}
              {showAddMemberForm && (
                <form
                  onSubmit={handleAddMemberSubmit}
                  className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700 space-y-3 animate-in fade-in"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Add New Member to Org ID: {userOrgProfile.orgId}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowAddMemberForm(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={newMemberName}
                        onChange={(e) => setNewMemberName(e.target.value)}
                        placeholder="e.g. Jordan Miller"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Role / Title
                      </label>
                      <input
                        type="text"
                        value={newMemberRole}
                        onChange={(e) => setNewMemberRole(e.target.value)}
                        placeholder="e.g. Creative Strategist"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Department
                      </label>
                      <input
                        type="text"
                        value={newMemberDept}
                        onChange={(e) => setNewMemberDept(e.target.value)}
                        placeholder="e.g. Growth & Design"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={newMemberEmail}
                        onChange={(e) => setNewMemberEmail(e.target.value)}
                        placeholder="e.g. jordan@organization.internal"
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-500">Status:</span>
                      {(['online', 'busy', 'away'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setNewMemberStatus(st)}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                            newMemberStatus === st
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>

                    <button
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold cursor-pointer"
                    >
                      Save Member
                    </button>
                  </div>
                </form>
              )}

              {/* Members List */}
              <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-800">
                {filteredMembers.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-500 space-y-1">
                    <p>No colleagues match "{memberSearchQuery}".</p>
                    <p className="text-[11px] text-slate-400">Clear your search or click "Add Member to Org" above.</p>
                  </div>
                ) : (
                  filteredMembers.map((member) => {
                    const isCurrentUser = member.name === userOrgProfile.userName;
                    return (
                      <div
                        key={member.id}
                        className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-750/50 transition-colors gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={member.avatar}
                              alt={member.name}
                              className="w-10 h-10 rounded-full object-cover bg-slate-100 ring-2 ring-indigo-500/20"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-white dark:ring-slate-800 ${
                                member.status === 'online'
                                  ? 'bg-emerald-500'
                                  : member.status === 'busy'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                              title={`Status: ${member.status}`}
                            />
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {member.name}
                              </span>
                              {isCurrentUser ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  <span>Active Session</span>
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-mono">
                                  {member.id.startsWith('EMP-') ? member.id : 'MEMBER'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                              {member.role} • {member.department}
                            </p>
                            {member.email && (
                              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 truncate font-mono">
                                {member.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => {
                                const updated: UserOrgProfile = {
                                  orgId: userOrgProfile.orgId,
                                  orgName: userOrgProfile.orgName,
                                  userId: member.id,
                                  userName: member.name,
                                  userRole: member.role,
                                  userDept: member.department,
                                  userEmail: member.email,
                                  userAvatar: member.avatar,
                                };

                                createEmployeeSession({
                                  employeeId: member.id.startsWith('EMP-') ? member.id : `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
                                  employeeName: member.name,
                                  employeeEmail: member.email,
                                  orgId: userOrgProfile.orgId,
                                  orgName: userOrgProfile.orgName,
                                  department: member.department,
                                  role: member.role,
                                  avatar: member.avatar,
                                });

                                onUpdateProfile(updated);
                                saveUserOrgProfile(updated);
                                if (onSwitchToEmployee) onSwitchToEmployee(member);

                                setSwitchToast(`Switched active session to ${member.name}`);
                                setTimeout(() => setSwitchToast(null), 3000);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                              title={`Switch active session to ${member.name}`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Switch</span>
                            </button>
                          )}
                          {!isCurrentUser && (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                              title="Remove member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* TAB 2: Organization ID & Switch */}
          {activeTab === 'org-id' && (
            <div className="space-y-6">
              {/* Active Org Banner */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/50 dark:to-blue-950/40 border border-indigo-200/80 dark:border-indigo-800/60 flex items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                      Active Organization ID
                    </span>
                  </div>
                  <div className="text-xl font-black font-mono text-indigo-950 dark:text-indigo-100">
                    {userOrgProfile.orgId}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {userOrgProfile.orgName} • {members.length} team members connected
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyOrgId}
                  className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-50 dark:hover:bg-slate-700 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-2 shadow-xs transition-all cursor-pointer shrink-0"
                >
                  {copiedId ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Org ID</span>
                    </>
                  )}
                </button>
              </div>

              {/* Form to Switch or Create Org ID */}
              <form onSubmit={handleSaveOrgSwitch} className="space-y-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-indigo-600" />
                    <span>Join or Switch Organization ID</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Enter the Org ID shared by your team manager or create your own custom workspace ID.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Organization ID Code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={inputOrgId}
                        onChange={(e) => setInputOrgId(e.target.value.toUpperCase())}
                        placeholder="e.g. ORG-MARKETING-9021"
                        className="flex-1 px-3 py-2 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white uppercase outline-none focus:ring-2 focus:ring-indigo-500"
                        required
                      />
                      <button
                        type="button"
                        onClick={handleGenerateOrgId}
                        className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title="Generate Random Org ID"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Gen</span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Organization Name
                    </label>
                    <input
                      type="text"
                      value={inputOrgName}
                      onChange={(e) => setInputOrgName(e.target.value)}
                      placeholder="e.g. Global Marketing & Ops"
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    <span>Apply &amp; Switch Org ID</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: All Organizations Directory */}
          {activeTab === 'directory' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Explore known Organizations and their personnel. Switch your workspace to any organization to discover its members:
              </p>

              <div className="space-y-3">
                {allOrganizations.map((org) => {
                  const orgEmployees = getEmployeesForOrg(org.orgId);
                  const isCurrent = org.orgId === userOrgProfile.orgId;
                  return (
                    <div
                      key={org.orgId}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-300 dark:border-indigo-700'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                            {org.orgId}
                          </span>
                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-600 text-white">
                              Active
                            </span>
                          )}
                          <span className="text-[11px] text-slate-500">
                            • {orgEmployees.length} registered colleagues
                          </span>
                        </div>

                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => {
                              setInputOrgId(org.orgId);
                              setInputOrgName(org.orgName);
                              const updated: UserOrgProfile = {
                                ...userOrgProfile,
                                orgId: org.orgId,
                                orgName: org.orgName,
                              };
                              onUpdateProfile(updated);
                              saveUserOrgProfile(updated);
                              setMembers(getConnectedOrgMembers(org.orgId));
                              setActiveTab('members');
                              setSaveSuccess(true);
                              setTimeout(() => setSaveSuccess(false), 2000);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors cursor-pointer"
                          >
                            Switch to this Org
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
                        {org.orgName}
                      </p>

                      <div className="flex flex-wrap gap-1.5">
                        {orgEmployees.map((emp) => (
                          <div
                            key={emp.employeeId}
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px]"
                          >
                            <img
                              src={emp.avatar}
                              alt={emp.employeeName}
                              className="w-3.5 h-3.5 rounded-full object-cover"
                            />
                            <span className="font-medium">{emp.employeeName}</span>
                            <span className="text-[10px] text-slate-400">({emp.role})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: My Org Profile */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-700">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                    userName || 'User'
                  )}`}
                  alt="Profile Avatar"
                  className="w-14 h-14 rounded-full bg-white ring-2 ring-indigo-500"
                />
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    {userName || 'Your Name'}
                  </h4>
                  <p className="text-xs text-slate-500">{userRole} • {userDept}</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                    Org: {userOrgProfile.orgId}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Job Role / Title
                  </label>
                  <input
                    type="text"
                    value={userRole}
                    onChange={(e) => setUserRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Department
                  </label>
                  <input
                    type="text"
                    value={userDept}
                    onChange={(e) => setUserDept(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Profile</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
