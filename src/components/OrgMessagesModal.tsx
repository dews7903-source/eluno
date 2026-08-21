import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Hash,
  MessageSquare,
  Megaphone,
  Users,
  Search,
  Pin,
  Smile,
  Paperclip,
  Calendar,
  Clock,
  Sparkles,
  Check,
  CheckCircle2,
  Plus,
  Flame,
  Radio,
  ArrowRight,
  UserCheck,
  Shield,
  Layers,
  Flag,
  Coffee,
  Palette,
  TrendingUp,
  Building2,
  Copy,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { Board, CardItem, OrgChannel, OrgMember, OrgMessage, PriorityLevel, UserOrgProfile } from '../types';
import {
  addOrgMember,
  getConnectedOrgMembers,
  getStoredOrgChannels,
  getStoredOrgMessages,
  getUserOrgProfile,
  saveConnectedOrgMembers,
  saveOrgChannels,
  saveOrgMessages,
} from '../services/orgMessageService';

interface OrgMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  board: Board;
  selectedCampaign?: CardItem | null;
  onSelectCampaign?: (card: CardItem) => void;
  userOrgProfile?: UserOrgProfile;
  onOpenOrgIdManager?: () => void;
}

const COMMON_EMOJIS = ['👍', '🚀', '🔥', '🎯', '🙌', '👀', '💡', '❤️'];

export const OrgMessagesModal: React.FC<OrgMessagesModalProps> = ({
  isOpen,
  onClose,
  board,
  selectedCampaign,
  onSelectCampaign,
  userOrgProfile: propUserOrgProfile,
  onOpenOrgIdManager,
}) => {
  const currentProfile = propUserOrgProfile || getUserOrgProfile();
  const currentOrgId = currentProfile.orgId || 'ORG-MARKETING-9021';

  const [channels, setChannels] = useState<OrgChannel[]>(() =>
    getStoredOrgChannels(currentOrgId)
  );
  const [connectedMembers, setConnectedMembers] = useState<OrgMember[]>(() =>
    getConnectedOrgMembers(currentOrgId)
  );
  const [messages, setMessages] = useState<OrgMessage[]>(() =>
    getStoredOrgMessages(currentOrgId)
  );
  const [activeChannelId, setActiveChannelId] = useState<string>('channel-announcements');
  const [inputText, setInputText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [attachedCampaignId, setAttachedCampaignId] = useState<string>(
    selectedCampaign?.id || ''
  );
  const [showCampaignPicker, setShowCampaignPicker] = useState(false);
  const [filterPinnedOnly, setFilterPinnedOnly] = useState(false);
  const [copiedOrgId, setCopiedOrgId] = useState(false);

  // Quick add member inside modal
  const [showQuickAddMember, setShowQuickAddMember] = useState(false);
  const [quickMemberName, setQuickMemberName] = useState('');
  const [quickMemberRole, setQuickMemberRole] = useState('Campaign Specialist');
  const [quickMemberDept, setQuickMemberDept] = useState('Marketing');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Reload data when active Org ID changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setMessages(getStoredOrgMessages(currentOrgId));
      setConnectedMembers(getConnectedOrgMembers(currentOrgId));
      setChannels(getStoredOrgChannels(currentOrgId));
    }
  }, [currentOrgId, isOpen]);

  // Sync selected campaign when modal opens with a target card
  useEffect(() => {
    if (selectedCampaign) {
      setAttachedCampaignId(selectedCampaign.id);
      setActiveChannelId('channel-milestones');
    }
  }, [selectedCampaign, isOpen]);

  // Scroll to bottom of message thread on active channel or new message
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeChannelId, messages, isOpen]);

  if (!isOpen) return null;

  // Build combined channels: predefined org channels + real connected member DMs
  const memberDMs: OrgChannel[] = connectedMembers.map((m) => ({
    id: `dm-${m.id}`,
    name: m.name,
    topic: `${m.role} • ${m.department}`,
    type: 'direct',
    avatar: m.avatar,
    status: m.status,
    department: m.department,
  }));

  const activeChannel =
    channels.find((c) => c.id === activeChannelId) ||
    memberDMs.find((d) => d.id === activeChannelId) ||
    channels[0];

  // Filter messages for active channel
  const channelMessages = messages.filter((m) => {
    if (m.channelId !== activeChannelId) return false;
    if (filterPinnedOnly && !m.pinned) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.content.toLowerCase().includes(q) ||
        m.senderName.toLowerCase().includes(q) ||
        m.campaignRef?.title.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleCopyOrgId = () => {
    navigator.clipboard.writeText(currentOrgId);
    setCopiedOrgId(true);
    setTimeout(() => setCopiedOrgId(false), 2000);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && !attachedCampaignId) return;

    let campaignRefData = undefined;
    if (attachedCampaignId) {
      const card = board.cards.find((c) => c.id === attachedCampaignId);
      if (card) {
        const listTitle = board.lists.find((l) => l.id === card.listId)?.title;
        campaignRefData = {
          id: card.id,
          title: card.title,
          priority: card.priority,
          startDate: card.startDate,
          etaDate: card.etaDate || card.dueDate,
          listTitle,
        };
      }
    }

    const newMessage: OrgMessage = {
      id: `msg-${Date.now()}`,
      orgId: currentOrgId,
      channelId: activeChannelId,
      senderId: currentProfile.userId || 'user-current',
      senderName: currentProfile.userName || 'You',
      senderAvatar:
        currentProfile.userAvatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
          currentProfile.userName || 'User'
        )}`,
      senderRole: currentProfile.userRole || 'Team Member',
      senderDept: currentProfile.userDept || 'Operations',
      content: inputText.trim(),
      createdAt: new Date().toISOString(),
      campaignRef: campaignRefData,
      isAnnouncement: activeChannel.type === 'announcement',
      reactions: [],
    };

    const updated = [...messages, newMessage];
    setMessages(updated);
    saveOrgMessages(currentOrgId, updated);

    setInputText('');
    setAttachedCampaignId('');
    setShowCampaignPicker(false);
  };

  const handleToggleReaction = (messageId: string, emoji: string) => {
    const userName = currentProfile.userName || 'You';
    const updated = messages.map((msg) => {
      if (msg.id !== messageId) return msg;
      const reactions = msg.reactions || [];
      const existingReactionIndex = reactions.findIndex((r) => r.emoji === emoji);

      if (existingReactionIndex > -1) {
        const existing = reactions[existingReactionIndex];
        const hasReacted = existing.users.includes(userName);
        if (hasReacted) {
          const newUsers = existing.users.filter((u) => u !== userName);
          if (newUsers.length === 0) {
            return {
              ...msg,
              reactions: reactions.filter((_, idx) => idx !== existingReactionIndex),
            };
          } else {
            const newReactions = [...reactions];
            newReactions[existingReactionIndex] = {
              emoji,
              count: existing.count - 1,
              users: newUsers,
            };
            return { ...msg, reactions: newReactions };
          }
        } else {
          const newReactions = [...reactions];
          newReactions[existingReactionIndex] = {
            emoji,
            count: existing.count + 1,
            users: [...existing.users, userName],
          };
          return { ...msg, reactions: newReactions };
        }
      } else {
        return {
          ...msg,
          reactions: [...reactions, { emoji, count: 1, users: [userName] }],
        };
      }
    });

    setMessages(updated);
    saveOrgMessages(currentOrgId, updated);
  };

  const handleTogglePin = (messageId: string) => {
    const updated = messages.map((m) =>
      m.id === messageId ? { ...m, pinned: !m.pinned } : m
    );
    setMessages(updated);
    saveOrgMessages(currentOrgId, updated);
  };

  const handleQuickAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMemberName.trim()) return;

    const newMember = addOrgMember(currentOrgId, {
      name: quickMemberName.trim(),
      role: quickMemberRole.trim() || 'Team Member',
      department: quickMemberDept.trim() || 'Operations',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
        quickMemberName.trim()
      )}`,
      status: 'online',
      email: `${quickMemberName.toLowerCase().replace(/\s+/g, '.')}@${currentOrgId.toLowerCase()}.org`,
    });

    setConnectedMembers((prev) => [...prev, newMember]);
    setQuickMemberName('');
    setShowQuickAddMember(false);
  };

  const getChannelIcon = (channel: OrgChannel) => {
    if (channel.type === 'announcement') {
      return <Megaphone className="w-4 h-4 text-amber-500" />;
    }
    if (channel.id === 'channel-milestones') {
      return <Flag className="w-4 h-4 text-indigo-500" />;
    }
    if (channel.id === 'channel-growth') {
      return <TrendingUp className="w-4 h-4 text-emerald-500" />;
    }
    if (channel.id === 'channel-creative') {
      return <Palette className="w-4 h-4 text-pink-500" />;
    }
    if (channel.id === 'channel-watercooler') {
      return <Coffee className="w-4 h-4 text-orange-500" />;
    }
    return <Hash className="w-4 h-4 text-slate-400" />;
  };

  const getPriorityBadgeClass = (priority: PriorityLevel) => {
    switch (priority) {
      case 'urgent':
        return 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800';
      case 'high':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800';
      case 'medium':
        return 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800';
      case 'low':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl h-[88vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        id="org-messages-modal-container"
      >
        {/* Top Header with Organization ID and Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight">
                  Organization Messages &amp; Announcements
                </h2>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                  <span className="font-mono">{currentOrgId}</span>
                </div>
              </div>
              <p className="text-xs text-slate-300">
                Connected Workspace: <span className="font-semibold text-white">{currentProfile.orgName}</span> • {connectedMembers.length} active members
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyOrgId}
              className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Organization ID to share with teammates"
            >
              {copiedOrgId ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied Org ID</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-indigo-300" />
                  <span>Copy Org ID</span>
                </>
              )}
            </button>

            {onOpenOrgIdManager && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenOrgIdManager();
                }}
                className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                title="Manage Organization ID, profile, and invite teammates"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Org Settings</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Body with Sidebar + Chat Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* LEFT SIDEBAR: Channels & Direct Messages connected to this Org ID */}
          <div className="w-64 sm:w-72 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/70 flex flex-col shrink-0">
            {/* Search filter */}
            <div className="p-3 border-b border-slate-200 dark:border-slate-800">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search channels & messages..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Channels & Connected Member DMs */}
            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {/* Organization Channels Section */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Org Channels
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {channels.length}
                  </span>
                </div>

                <div className="space-y-0.5">
                  {channels.map((channel) => {
                    const isActive = activeChannelId === channel.id;
                    return (
                      <button
                        key={channel.id}
                        type="button"
                        onClick={() => {
                          setActiveChannelId(channel.id);
                          setFilterPinnedOnly(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className={isActive ? 'text-white' : ''}>
                            {getChannelIcon(channel)}
                          </span>
                          <span className="truncate">{channel.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Connected Members Direct Messages */}
              <div>
                <div className="flex items-center justify-between px-2 mb-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Connected Members ({connectedMembers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddMember(!showQuickAddMember)}
                    className="p-1 rounded text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                    title="Add Member to Org"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Quick Add Member Drawer */}
                {showQuickAddMember && (
                  <form
                    onSubmit={handleQuickAddMember}
                    className="p-2.5 mb-2 rounded-lg bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 space-y-2 animate-in fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-indigo-900 dark:text-indigo-200">
                        Add to {currentOrgId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowQuickAddMember(false)}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={quickMemberName}
                      onChange={(e) => setQuickMemberName(e.target.value)}
                      placeholder="Teammate Name..."
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                      required
                    />

                    <input
                      type="text"
                      value={quickMemberRole}
                      onChange={(e) => setQuickMemberRole(e.target.value)}
                      placeholder="Role (e.g. Media Lead)"
                      className="w-full px-2 py-1 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none"
                    />

                    <button
                      type="submit"
                      className="w-full py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-xs"
                    >
                      Connect Member
                    </button>
                  </form>
                )}

                {/* Dynamic DMs for members connected through this Org ID */}
                <div className="space-y-0.5">
                  {memberDMs.map((dm) => {
                    const isActive = activeChannelId === dm.id;
                    const isSelf = dm.name === currentProfile.userName;
                    return (
                      <button
                        key={dm.id}
                        type="button"
                        onClick={() => {
                          setActiveChannelId(dm.id);
                          setFilterPinnedOnly(false);
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                          isActive
                            ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <div className="relative shrink-0">
                            <img
                              src={
                                dm.avatar ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${dm.name}`
                              }
                              alt={dm.name}
                              className="w-5 h-5 rounded-full object-cover bg-white"
                            />
                            <span
                              className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full ring-1 ring-white dark:ring-slate-900 ${
                                dm.status === 'online'
                                  ? 'bg-emerald-500'
                                  : dm.status === 'busy'
                                  ? 'bg-rose-500'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </div>
                          <span className="truncate">
                            {dm.name} {isSelf && '(You)'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Organization Presence Card */}
              <div className="p-3 rounded-xl bg-slate-200/50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-750 text-[11px] text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200 mb-1">
                  <Shield className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Org ID: {currentOrgId}</span>
                </div>
                <p className="leading-snug">
                  Connected to {connectedMembers.length} teammate accounts.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL: Active Chat Thread */}
          <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 overflow-hidden">
            {/* Active Channel Header */}
            <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {getChannelIcon(activeChannel)}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <span>{activeChannel.name}</span>
                      {activeChannel.type === 'announcement' && (
                        <span className="text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          Announcements
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 truncate max-w-md">
                      {activeChannel.topic || `Org workspace discussion for ${currentOrgId}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setFilterPinnedOnly(!filterPinnedOnly)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                    filterPinnedOnly
                      ? 'bg-amber-500 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                  title="Filter Pinned Messages"
                >
                  <Pin className="w-3.5 h-3.5" />
                  <span>{filterPinnedOnly ? 'Pinned Only' : 'Pins'}</span>
                </button>
              </div>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {channelMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mb-3">
                    <MessageSquare className="w-7 h-7 text-indigo-500" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    No messages yet in #{activeChannel.name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    This channel is clean and ready for <strong className="text-indigo-600 dark:text-indigo-400">{currentOrgId}</strong>. Send a message or tag a Campaign card below.
                  </p>
                </div>
              ) : (
                channelMessages.map((msg) => {
                  const isAnnouncement = msg.isAnnouncement;
                  return (
                    <div
                      key={msg.id}
                      className={`group relative flex items-start gap-3 p-3.5 rounded-xl transition-all ${
                        isAnnouncement
                          ? 'bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40'
                          : msg.pinned
                          ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-850/50'
                      }`}
                    >
                      {/* Sender Avatar */}
                      <img
                        src={msg.senderAvatar}
                        alt={msg.senderName}
                        className="w-9 h-9 rounded-full object-cover bg-white ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                      />

                      {/* Message Content Area */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 dark:text-white">
                              {msg.senderName}
                            </span>
                            {msg.senderRole && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                {msg.senderRole}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400">
                              {new Date(msg.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                            {msg.pinned && (
                              <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                                <Pin className="w-2.5 h-2.5 fill-current" />
                                Pinned
                              </span>
                            )}
                          </div>

                          {/* Action icons on hover */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleTogglePin(msg.id)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 hover:text-amber-500 cursor-pointer"
                              title={msg.pinned ? 'Unpin message' : 'Pin message'}
                            >
                              <Pin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleReaction(msg.id, '👍')}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-750 text-slate-400 hover:text-indigo-500 cursor-pointer"
                              title="Like"
                            >
                              <Smile className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Main Text Content */}
                        <div className="text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {msg.content}
                        </div>

                        {/* Campaign Reference Card (If attached) */}
                        {msg.campaignRef && (
                          <div className="mt-2 p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs flex items-center justify-between gap-3">
                            <div className="space-y-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  Linked Campaign
                                </span>
                                <span
                                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${getPriorityBadgeClass(
                                    msg.campaignRef.priority
                                  )}`}
                                >
                                  {msg.campaignRef.priority}
                                </span>
                                {msg.campaignRef.listTitle && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-medium">
                                    {msg.campaignRef.listTitle}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {msg.campaignRef.title}
                              </h4>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500">
                                {msg.campaignRef.startDate && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-400" />
                                    Start: {msg.campaignRef.startDate}
                                  </span>
                                )}
                                {msg.campaignRef.etaDate && (
                                  <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                                    <Clock className="w-3 h-3" />
                                    ETA: {msg.campaignRef.etaDate}
                                  </span>
                                )}
                              </div>
                            </div>

                            {onSelectCampaign && (
                              <button
                                type="button"
                                onClick={() => {
                                  const card = board.cards.find(
                                    (c) => c.id === msg.campaignRef?.id
                                  );
                                  if (card) {
                                    onSelectCampaign(card);
                                    onClose();
                                  }
                                }}
                                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                              >
                                <span>Open Card</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        )}

                        {/* Message Reactions */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          {msg.reactions?.map((reaction, rIdx) => {
                            const isMyReaction = reaction.users.includes(
                              currentProfile.userName || 'You'
                            );
                            return (
                              <button
                                key={rIdx}
                                type="button"
                                onClick={() =>
                                  handleToggleReaction(msg.id, reaction.emoji)
                                }
                                className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                                  isMyReaction
                                    ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 dark:border-indigo-700 text-indigo-800 dark:text-indigo-200'
                                    : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                <span>{reaction.emoji}</span>
                                <span>{reaction.count}</span>
                              </button>
                            );
                          })}

                          {/* Add Reaction Quick Buttons */}
                          <div className="flex items-center gap-1">
                            {['👍', '🚀', '🔥'].map((emoji) => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => handleToggleReaction(msg.id, emoji)}
                                className="w-6 h-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 text-[11px] flex items-center justify-center transition-colors cursor-pointer"
                                title={`React with ${emoji}`}
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer & Campaign Tagging */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-850/60 shrink-0 space-y-3">
              {/* Attached Campaign Preview Badge */}
              {attachedCampaignId && (
                <div className="flex items-center justify-between px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs">
                  <div className="flex items-center gap-2 truncate">
                    <Flag className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="font-semibold text-indigo-900 dark:text-indigo-200 truncate">
                      Referencing Campaign:{' '}
                      {board.cards.find((c) => c.id === attachedCampaignId)?.title}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAttachedCampaignId('')}
                    className="text-slate-400 hover:text-rose-500 p-0.5 cursor-pointer"
                    title="Remove Campaign Reference"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Campaign Picker Dropdown */}
              {showCampaignPicker && (
                <div className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg space-y-2 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Attach a Campaign Card
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowCampaignPicker(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {board.cards.map((card) => (
                      <button
                        key={card.id}
                        type="button"
                        onClick={() => {
                          setAttachedCampaignId(card.id);
                          setShowCampaignPicker(false);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-slate-700 flex items-center justify-between"
                      >
                        <span className="truncate">{card.title}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          {card.priority}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      rows={2}
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Message #${activeChannel.name} in ${currentOrgId}... (Press Enter to send)`}
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!inputText.trim() && !attachedCampaignId}
                    className="h-12 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer shrink-0"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>

                {/* Toolbar */}
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCampaignPicker(!showCampaignPicker)}
                      className={`px-2.5 py-1 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                        attachedCampaignId
                          ? 'bg-indigo-100 dark:bg-indigo-950 border-indigo-300 text-indigo-700 dark:text-indigo-300'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      <Flag className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Tag Campaign</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {COMMON_EMOJIS.slice(0, 4).map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setInputText((prev) => prev + emoji)}
                          className="w-6 h-6 rounded hover:bg-slate-200 dark:hover:bg-slate-750 flex items-center justify-center text-xs cursor-pointer"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    Shift + Enter for new line
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
