import { apiFetch } from '../../services/apiClient';
import { nativeService } from '../../services/nativeService';
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { 
  Users, 
  MessageSquare, 
  Pin, 
  Send, 
  Upload, 
  Download, 
  Search, 
  Bell, 
  BellOff, 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  MoreVertical, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  FileText, 
  Video, 
  ImageIcon,
  Lock, 
  Globe, 
  LogOut, 
  X, 
  ChevronLeft, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  Info,
  Play,
  Filter,
  Check,
  Building
} from 'lucide-react';
import { 
  AcademicCommunity, 
  CommunityMessageRecord, 
  CommunityMembershipRecord, 
  CommunityAttachment,
  CommunityReportRecord,
  SemesterNumber,
  Shift,
  Section
} from '../../types';
import { POLYTECHNIC_COLLEGES, DEPARTMENTS } from '../../data/mockData';

export const CommunityScreen: React.FC = () => {
  const { 
    userProfile, 
    accountType, 
    authToken, 
    setActiveScreen, 
    isServerVerifiedAdmin 
  } = useApp();

  // Community creation: server-verified admins, verified teachers, and
  // verified Class Captains can all create academic communities. Plain
  // students cannot. (The server enforces the same rule.)
  const canCreateCommunity =
    (accountType === 'system_admin' && isServerVerifiedAdmin) ||
    accountType === 'teacher' ||
    accountType === 'class_captain';

  // Active view state
  const [activeTab, setActiveTab] = useState<'my_groups' | 'discover' | 'admin'>('my_groups');
  const [selectedCommunity, setSelectedCommunity] = useState<AcademicCommunity | null>(null);
  
  // Data lists
  const [communities, setCommunities] = useState<AcademicCommunity[]>([]);
  const [userMemberships, setUserMemberships] = useState<Record<string, CommunityMembershipRecord>>({});
  const [messages, setMessages] = useState<CommunityMessageRecord[]>([]);
  const [members, setMembers] = useState<CommunityMembershipRecord[]>([]);
  const [adminReports, setAdminReports] = useState<CommunityReportRecord[]>([]);
  
  // Loading & status states
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Message compose state
  const [newMsgContent, setNewMsgContent] = useState('');
  const [attachment, setAttachment] = useState<{
    file: File | null;
    fileName: string;
    fileType: 'document' | 'pdf' | 'image' | 'video';
    fileSize: number;
    durationSeconds?: number;
    base64Data?: string;
  } | null>(null);
  const [isSubmittingMessage, setIsSubmittingMessage] = useState(false);

  // Search & filter inside room
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'pinned' | 'files'>('all');
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportingTarget, setReportingTarget] = useState<{ messageId?: string; userId?: string } | null>(null);
  const [reportReason, setReportReason] = useState('Inappropriate content');
  const [reportDetails, setReportDetails] = useState('');

  // Create Group Form State
  const [createName, setCreateName] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createDept, setCreateDept] = useState(userProfile.department || DEPARTMENTS[0]);
  const [createSemester, setCreateSemester] = useState<number>(userProfile.semester || 1);
  const [createShift, setCreateShift] = useState<Shift | 'Both'>(userProfile.shift || 'Both');
  const [createSection, setCreateSection] = useState<Section | 'All'>(userProfile.section || 'All');
  const [createVisibility, setCreateVisibility] = useState<'public' | 'private'>('public');
  const [isCreating, setIsCreating] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Object URLs for image attachments. The file endpoint requires an auth
  // token, so a plain <img src> or <a href> gets a 401 — image bytes are
  // fetched with the session token and turned into blob URLs here.
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const imageUrlsRef = useRef<Record<string, string>>({});

  useEffect(() => {
    const pending = messages.flatMap(m => m.attachments || []).filter(
      att => att.file_type === 'image' && !imageUrlsRef.current[att.id]
    );
    if (pending.length === 0) return;
    let cancelled = false;
    (async () => {
      for (const att of pending) {
        try {
          const res = await apiFetch(att.file_url, { headers: getHeaders() });
          if (!res.ok) continue;
          const blob = await res.blob();
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          imageUrlsRef.current[att.id] = url;
          setImageUrls(prev => ({ ...prev, [att.id]: url }));
        } catch {
          // Image stays as a downloadable file row below.
        }
      }
    })();
    return () => { cancelled = true; };
  }, [messages]);

  // Revoke blob URLs when leaving the screen.
  useEffect(() => {
    const cache = imageUrlsRef.current;
    return () => {
      Object.values(cache).forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  const getHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const token = authToken || localStorage.getItem('diplomamate_auth_token') || localStorage.getItem('diploma_mate_auth_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // 1. Fetch Communities list
  const loadCommunities = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await apiFetch('/api/communities', { credentials: 'omit', headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setCommunities(data.communities || []);
        // The server returns the field as `memberships` (GET /api/communities).
        // Accept `userMemberships` too so either shape works — reading the
        // wrong field left the map empty, so joined groups never showed
        // under "My Groups" and kept reappearing in Discover.
        const membershipList = (data.memberships || data.userMemberships) as
          | CommunityMembershipRecord[]
          | undefined;
        if (Array.isArray(membershipList)) {
          const map: Record<string, CommunityMembershipRecord> = {};
          membershipList.forEach((m: CommunityMembershipRecord) => {
            map[m.community_id] = m;
          });
          setUserMemberships(map);
        }
      } else {
        setErrorMsg(data.error || 'Failed to load communities.');
      }
    } catch {
      setErrorMsg('Network error while connecting to academic community service.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCommunities();
  }, [authToken]);

  // 2. Fetch Messages for Selected Community
  const loadMessages = async (communityId: string) => {
    setLoadingMessages(true);
    try {
      const queryParams = new URLSearchParams();
      if (searchQuery.trim()) {
        queryParams.set('q', searchQuery.trim());
      }
      if (showPinnedOnly || filterType === 'pinned') {
        queryParams.set('pinnedOnly', 'true');
      }

      const url = `/api/communities/${communityId}/messages?${queryParams.toString()}`;
      const res = await apiFetch(url, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages || []);
      } else {
        setErrorMsg(data.error || 'Failed to load messages.');
      }
    } catch {
      setErrorMsg('Failed to load community chat feed.');
    } finally {
      setLoadingMessages(false);
    }
  };

  // 3. Fetch Members for Selected Community
  const loadMembers = async (communityId: string) => {
    try {
      const res = await apiFetch(`/api/communities/${communityId}/members`, { headers: getHeaders() });
      const data = await res.json();
      if (data.success) {
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Error fetching members:', err);
    }
  };

  useEffect(() => {
    if (selectedCommunity) {
      loadMessages(selectedCommunity.id);
      loadMembers(selectedCommunity.id);
    }
  }, [selectedCommunity, searchQuery, showPinnedOnly, filterType]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Handle Join Community
  const handleJoin = async (community: AcademicCommunity) => {
    setErrorMsg(null);
    try {
      const res = await apiFetch(`/api/communities/${community.id}/join`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Joined academic group successfully!');
        // Update the membership right away so "My Groups" reflects the
        // join immediately, even before the reload below returns.
        if (data.membership) {
          setUserMemberships(prev => ({ ...prev, [community.id]: data.membership }));
        }
        await loadCommunities();
        if (data.membership && data.membership.status === 'active') {
          setSelectedCommunity(community);
        }
      } else {
        setErrorMsg(data.error || 'Failed to join group.');
      }
    } catch {
      setErrorMsg('Network error attempting to join group.');
    }
  };

  // Handle Leave Community
  const handleLeave = async (communityId: string) => {
    try {
      const res = await apiFetch(`/api/communities/${communityId}/leave`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        showToast('You have left the community.');
        setSelectedCommunity(null);
        await loadCommunities();
      } else {
        setErrorMsg(data.error || 'Failed to leave community.');
      }
    } catch {
      setErrorMsg('Network error leaving community.');
    }
  };

  // Handle Mute Toggle
  const handleToggleMute = async (communityId: string) => {
    const currentMuted = userMemberships[communityId]?.is_muted || false;
    try {
      const res = await apiFetch(`/api/communities/${communityId}/mute`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify({ is_muted: !currentMuted })
      });
      const data = await res.json();
      if (data.success) {
        setUserMemberships(prev => ({
          ...prev,
          [communityId]: {
            ...prev[communityId],
            is_muted: !currentMuted
          }
        }));
        showToast(data.message);
      }
    } catch {
      setErrorMsg('Failed to update notification settings.');
    }
  };

  // Handle File Input Selection with Validation
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 15MB for video, 10MB for documents
    const isVideo = file.type.startsWith('video/');
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isPdfOrDoc = file.type === 'application/pdf' || 
                       file.type.includes('word') || 
                       file.type.includes('document') || 
                       file.name.endsWith('.pdf') || 
                       file.name.endsWith('.docx') || 
                       file.name.endsWith('.doc');

    if (isVideo && file.size > 15 * 1024 * 1024) {
      setErrorMsg('Video files cannot exceed 15 MB in size.');
      e.target.value = '';
      return;
    }

    if (!isVideo && file.size > 10 * 1024 * 1024) {
      setErrorMsg('Document and study notes files cannot exceed 10 MB in size.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const fileType: 'video' | 'pdf' | 'document' | 'image' = isVideo
        ? 'video'
        : isImage
          ? 'image'
          : (file.type === 'application/pdf' || file.name.endsWith('.pdf')) ? 'pdf' : 'document';
      
      setAttachment({
        file,
        fileName: file.name,
        fileType,
        fileSize: file.size,
        base64Data
      });
    };
    reader.readAsDataURL(file);
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCommunity) return;
    if (!newMsgContent.trim() && !attachment) return;

    setIsSubmittingMessage(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        content: newMsgContent.trim()
      };

      if (attachment && attachment.base64Data) {
        payload.attachments = [
          {
            file_name: attachment.fileName,
            file_type: attachment.fileType,
            mime_type: attachment.file?.type || 'application/octet-stream',
            file_size_bytes: attachment.fileSize,
            // The server reads the bytes from `base64_data` (and also
            // accepts a data: URL in `file_url`); sending both keeps the
            // upload working with old and new server builds.
            file_url: attachment.base64Data,
            base64_data: attachment.base64Data,
            duration_seconds: attachment.durationSeconds || (attachment.fileType === 'video' ? 30 : undefined)
          }
        ];
      }

      const res = await apiFetch(`/api/communities/${selectedCommunity.id}/messages`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.message) {
        setMessages(prev => [...prev, data.message]);
        setNewMsgContent('');
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        setErrorMsg(data.error || 'Failed to post message.');
      }
    } catch {
      setErrorMsg('Network error posting message.');
    } finally {
      setIsSubmittingMessage(false);
    }
  };

  // Download / open an attachment. The file endpoint needs the session
  // token, so a plain <a href> gets a 401 and an anchor download does
  // nothing inside the Android WebView — the bytes are fetched with auth
  // and handed to the native share sheet (or the browser download on web).
  const handleAttachmentDownload = async (att: CommunityAttachment) => {
    try {
      const res = await apiFetch(att.file_url, { headers: getHeaders() });
      if (!res.ok) {
        setErrorMsg('Could not download this file.');
        return;
      }
      const blob = await res.blob();
      const ok = await nativeService.downloadBlob(blob, att.file_name);
      if (!ok) setErrorMsg('Could not download this file.');
    } catch {
      setErrorMsg('Network error downloading file.');
    }
  };

  // Handle Pin / Unpin message
  const handleTogglePin = async (msgId: string) => {
    if (!selectedCommunity) return;
    try {
      const res = await apiFetch(`/api/communities/${selectedCommunity.id}/messages/${msgId}/pin`, {
        method: 'POST',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: data.is_pinned } : m));
        showToast(data.message);
      } else {
        setErrorMsg(data.error || 'Failed to toggle pin.');
      }
    } catch {
      setErrorMsg('Failed to update pinned status.');
    }
  };

  // Handle Delete message
  const handleDeleteMessage = async (msgId: string) => {
    if (!selectedCommunity) return;
    try {
      const res = await apiFetch(`/api/communities/${selectedCommunity.id}/messages/${msgId}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      const data = await res.json();
      if (data.success) {
        setMessages(prev => prev.filter(m => m.id !== msgId));
        showToast('Message removed.');
      } else {
        setErrorMsg(data.error || 'Failed to delete message.');
      }
    } catch {
      setErrorMsg('Failed to delete message.');
    }
  };

  // Handle Report Submission
  const handleSubmitReport = async () => {
    if (!selectedCommunity || !reportingTarget) return;
    try {
      const res = await apiFetch(`/api/communities/${selectedCommunity.id}/report`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          reported_message_id: reportingTarget.messageId,
          reported_user_id: reportingTarget.userId,
          reason: `${reportReason}: ${reportDetails.trim()}`
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Thank you. Your report has been submitted to moderators and administrators.');
        setShowReportModal(false);
        setReportingTarget(null);
        setReportDetails('');
      } else {
        setErrorMsg(data.error || 'Failed to submit report.');
      }
    } catch {
      setErrorMsg('Network error submitting report.');
    }
  };

  // Handle Community Creation (Captains & Teachers)
  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      setErrorMsg('Please provide a community name.');
      return;
    }

    setIsCreating(true);
    setErrorMsg(null);
    try {
      const payload: any = {
        name: createName.trim(),
        description: createDescription.trim(),
        department: createDept,
        semester: Number(createSemester),
        shift: createShift,
        section: createSection,
        visibility: createVisibility
      };

      const res = await apiFetch('/api/communities', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success && data.community) {
        showToast(`Created "${data.community.name}" successfully!`);
        setShowCreateModal(false);
        setCreateName('');
        setCreateDescription('');
        await loadCommunities();
        setSelectedCommunity(data.community);
      } else {
        setErrorMsg(data.error || 'Failed to create academic community.');
      }
    } catch {
      setErrorMsg('Network error creating community.');
    } finally {
      setIsCreating(false);
    }
  };

  // Filtered lists for directory
  const myJoinedCommunities = communities.filter(c => {
    const mem = userMemberships[c.id];
    return mem && (mem.status === 'active' || mem.status === 'pending_approval');
  });

  const discoverableCommunities = communities.filter(c => {
    const mem = userMemberships[c.id];
    return !mem || mem.status !== 'active';
  });

  const pinnedAnnouncements = messages.filter(m => m.is_pinned);

  // Helper formatting for file size
  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Helper to suggest standard naming format
  const suggestGroupName = () => {
    const deptPrefix = createDept.includes('Computer') ? 'CST' :
                       createDept.includes('Civil') ? 'Civil' :
                       createDept.includes('Electrical') ? 'Electrical' :
                       createDept.includes('Mechanical') ? 'Mechanical' : 'Academic';
    return `${deptPrefix} ${createSemester}th Semester Study Group`;
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-teal-800 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-xl flex items-center gap-2 border border-teal-600 animate-in fade-in duration-150">
          <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Global Error Banner */}
      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 px-4 py-3 rounded-xl text-xs flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 font-bold p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* VIEW A: CHAT ROOM VIEW (When a Community is Selected) */}
      {/* ==================================================================== */}
      {selectedCommunity ? (
        <div className="bg-surface rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col min-h-[640px]">
          {/* Room Header */}
          <div className="bg-brand-navy text-white p-3.5 sm:p-4 flex items-center justify-between gap-3 border-b border-blue-950">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                onClick={() => {
                  setSelectedCommunity(null);
                  setSearchQuery('');
                  setFilterType('all');
                }}
                className="p-1.5 -ml-1 rounded-lg bg-surface/10 hover:bg-surface/20 text-white transition-colors cursor-pointer shrink-0"
                title="Back to Communities Hub"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="font-bold text-sm sm:text-base text-white truncate">
                    {selectedCommunity.name}
                  </h2>
                  {selectedCommunity.visibility === 'private' ? (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-500/20 text-amber-200 border border-amber-400/30">
                      <Lock className="w-2.5 h-2.5" /> Private
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-teal-500/20 text-teal-200 border border-teal-400/30">
                      <Globe className="w-2.5 h-2.5" /> Public
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-[11px] text-blue-200 mt-0.5 truncate">
                  <span>{selectedCommunity.college}</span>
                  <span>·</span>
                  <span className="font-medium text-white">{selectedCommunity.department}</span>
                  <span>·</span>
                  <span>Sem {selectedCommunity.semester}</span>
                  <span>·</span>
                  <span>{selectedCommunity.member_count} Members</span>
                </div>
              </div>
            </div>

            {/* Room Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Mute Button */}
              <button
                onClick={() => handleToggleMute(selectedCommunity.id)}
                className={`p-2 rounded-lg transition-colors cursor-pointer ${
                  userMemberships[selectedCommunity.id]?.is_muted
                    ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                    : 'bg-surface/10 text-white hover:bg-surface/20'
                }`}
                title={userMemberships[selectedCommunity.id]?.is_muted ? 'Unmute Group Notifications' : 'Mute Group Notifications'}
              >
                {userMemberships[selectedCommunity.id]?.is_muted ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
              </button>

              {/* Members List Button */}
              <button
                onClick={() => setShowMembersModal(true)}
                className="p-2 rounded-lg bg-surface/10 hover:bg-surface/20 text-white transition-colors cursor-pointer"
                title="View Group Members"
              >
                <Users className="w-4 h-4" />
              </button>

              {/* Leave Community Button */}
              <button
                onClick={() => handleLeave(selectedCommunity.id)}
                className="p-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 transition-colors cursor-pointer"
                title="Leave Community"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Sticky Pinned Announcement Banner */}
          {pinnedAnnouncements.length > 0 && (
            <div className="bg-amber-50 border-b border-amber-200/80 px-3.5 py-2.5 flex items-start justify-between gap-3 text-xs text-amber-950">
              <div className="flex items-start gap-2 min-w-0">
                <Pin className="w-4 h-4 text-amber-700 shrink-0 mt-0.5 rotate-45" />
                <div className="min-w-0">
                  <div className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <span>Pinned Announcement</span>
                    <span className="text-[10px] text-amber-700 font-normal">
                      by {pinnedAnnouncements[0].sender_name} ({pinnedAnnouncements[0].sender_role})
                    </span>
                  </div>
                  <p className="text-amber-900 mt-0.5 line-clamp-2">
                    {pinnedAnnouncements[0].content}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPinnedOnly(prev => !prev)}
                className="shrink-0 text-[11px] font-bold text-amber-800 hover:text-amber-950 underline cursor-pointer"
              >
                {showPinnedOnly ? 'Show All' : 'Filter Pinned'}
              </button>
            </div>
          )}

          {/* Search & Filter Toolbar */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-3 py-2 flex items-center justify-between gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search messages, notes, PDFs..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-surface border border-slate-200 rounded-lg focus:outline-none focus:border-brand-blue"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFilterType('all')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-brand-blue text-white' : 'bg-surface text-slate-600 border border-slate-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterType('files')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  filterType === 'files' ? 'bg-brand-blue text-white' : 'bg-surface text-slate-600 border border-slate-200'
                }`}
              >
                <FileText className="w-3 h-3" /> Files & Videos
              </button>
            </div>
          </div>

          {/* Messages Feed Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/50 min-h-[380px] max-h-[520px]">
            {loadingMessages ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 text-xs gap-2">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <span>Loading academic messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12 px-4 text-slate-500">
                <div className="w-12 h-12 rounded-full bg-blue-100/70 text-brand-blue mx-auto flex items-center justify-center mb-2.5">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-sm text-text-primary">No messages yet</h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto mt-1">
                  Start the discussion! Share academic questions, study notes, PDFs, or small lab videos.
                </p>
              </div>
            ) : (
              messages
                .filter(m => {
                  if (filterType === 'files') {
                    return m.attachments && m.attachments.length > 0;
                  }
                  return true;
                })
                .map((msg) => {
                  const isAuthor = msg.sender_id === userProfile.id;
                  const isModeratorOrTeacher = accountType === 'teacher' || accountType === 'system_admin' || userMemberships[selectedCommunity.id]?.membership_role === 'moderator' || userMemberships[selectedCommunity.id]?.membership_role === 'owner';

                  return (
                    <div 
                      key={msg.id} 
                      className={`flex flex-col ${isAuthor ? 'items-end' : 'items-start'} group`}
                    >
                      <div className="flex items-center gap-2 mb-1 px-1">
                        <span className="text-[11px] font-bold text-slate-800">
                          {msg.sender_name}
                        </span>

                        {/* Role Badges */}
                        {msg.sender_role === 'teacher' ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <GraduationCap className="w-3 h-3" /> Teacher
                          </span>
                        ) : msg.sender_role === 'class_captain' ? (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                            <ShieldCheck className="w-3 h-3" /> Class Captain
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Student</span>
                        )}

                        {msg.is_moderator && (
                          <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1 rounded border border-amber-200">
                            Mod
                          </span>
                        )}

                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div 
                        className={`relative max-w-sm sm:max-w-md md:max-w-lg rounded-2xl p-3 text-xs leading-relaxed shadow-xs ${
                          isAuthor
                            ? 'bg-brand-blue text-white rounded-tr-none'
                            : 'bg-surface border border-slate-200 text-slate-800 rounded-tl-none'
                        } ${msg.is_pinned ? 'ring-2 ring-amber-400' : ''}`}
                      >
                        {/* Pinned Indicator on Message */}
                        {msg.is_pinned && (
                          <div className={`flex items-center gap-1 text-[10px] font-bold mb-1.5 ${isAuthor ? 'text-amber-200' : 'text-amber-700'}`}>
                            <Pin className="w-3 h-3 rotate-45" /> Pinned Study Note
                          </div>
                        )}

                        {/* Text Content */}
                        <div className="whitespace-pre-wrap break-words">
                          {msg.content}
                        </div>

                        {/* Attachments Display */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2.5 space-y-2 pt-2 border-t border-slate-100/30">
                            {msg.attachments.map((att) => (
                              <div key={att.id} className="rounded-xl overflow-hidden">
                                {att.file_type === 'image' && imageUrls[att.id] ? (
                                  <div className="bg-slate-900 rounded-xl overflow-hidden p-1">
                                    <img
                                      src={imageUrls[att.id]}
                                      alt={att.file_name}
                                      className="w-full max-h-56 rounded-lg object-contain bg-black"
                                    />
                                    <div className="flex items-center justify-between text-[10px] text-slate-400 px-2 py-1">
                                      <span className="flex items-center gap-1">
                                        <ImageIcon className="w-3 h-3 text-teal-400" />
                                        {att.file_name}
                                      </span>
                                      <span>{formatBytes(att.file_size_bytes)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 ${
                                    isAuthor 
                                      ? 'bg-blue-700/60 border-blue-500 text-white' 
                                      : 'bg-slate-50 border-slate-200 text-slate-800'
                                  }`}>
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="w-5 h-5 text-teal-400 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-semibold text-xs truncate">{att.file_name}</p>
                                        <p className="text-[10px] opacity-80">{formatBytes(att.file_size_bytes)} · {att.file_type.toUpperCase()}</p>
                                      </div>
                                    </div>

                                    {/* Authenticated download: a plain link gets a 401 and
                                        an anchor download does nothing in the Android WebView */}
                                    <button
                                      type="button"
                                      onClick={() => void handleAttachmentDownload(att)}
                                      className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer ${
                                        isAuthor 
                                          ? 'bg-surface text-blue-700 hover:bg-blue-50'
                                          : 'bg-blue-50 text-brand-blue hover:bg-blue-100'
                                      }`}
                                      title="Download File"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Download</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Message Toolbar Actions */}
                        <div className={`mt-2 pt-1 border-t flex items-center justify-end gap-3 text-[10px] ${
                          isAuthor ? 'border-blue-500/50 text-blue-200' : 'border-slate-100 text-slate-400'
                        }`}>
                          {/* Pin Toggle (Moderators, Teachers, Admins) */}
                          {isModeratorOrTeacher && (
                            <button
                              onClick={() => handleTogglePin(msg.id)}
                              className="hover:underline flex items-center gap-0.5 cursor-pointer"
                            >
                              <Pin className="w-2.5 h-2.5" />
                              <span>{msg.is_pinned ? 'Unpin' : 'Pin'}</span>
                            </button>
                          )}

                          {/* Delete (Author or Moderator) */}
                          {(isAuthor || isModeratorOrTeacher) && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="hover:text-rose-400 flex items-center gap-0.5 cursor-pointer"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                              <span>Delete</span>
                            </button>
                          )}

                          {/* Report Message */}
                          {!isAuthor && (
                            <button
                              onClick={() => {
                                setReportingTarget({ messageId: msg.id, userId: msg.sender_id });
                                setShowReportModal(true);
                              }}
                              className="hover:text-rose-500 flex items-center gap-0.5 cursor-pointer"
                            >
                              <AlertTriangle className="w-2.5 h-2.5" />
                              <span>Report</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Attachment Preview (if any selected) */}
          {attachment && (
            <div className="bg-blue-50 border-t border-blue-200 px-4 py-2 flex items-center justify-between gap-3 text-xs text-blue-900">
              <div className="flex items-center gap-2 min-w-0">
                {attachment.fileType === 'video' ? (
                  <Video className="w-4 h-4 text-blue-600 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-brand-blue shrink-0" />
                )}
                <span className="font-semibold truncate">{attachment.fileName}</span>
                <span className="text-[11px] text-blue-700 shrink-0">({formatBytes(attachment.fileSize)})</span>
              </div>
              <button
                onClick={() => {
                  setAttachment(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="text-blue-700 hover:text-blue-900 font-bold p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Chat Input Bar */}
          <form 
            onSubmit={handleSendMessage}
            className="p-3 bg-surface border-t border-slate-200 flex items-center gap-2"
          >
            {/* Attachment Button */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*,video/*,.pdf,.doc,.docx,.pptx,.xlsx,.zip,.txt" 
              className="hidden" 
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-brand-blue transition-colors cursor-pointer shrink-0"
              title="Share PDF, Study Note, or Lab Video (Max 15MB video, 10MB PDF)"
            >
              <Upload className="w-4 h-4" />
            </button>

            {/* Text Input */}
            <input
              type="text"
              placeholder={`Message ${selectedCommunity.name}...`}
              value={newMsgContent}
              onChange={e => setNewMsgContent(e.target.value)}
              className="flex-1 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-brand-blue focus:bg-surface transition-colors"
            />

            {/* Send Button */}
            <button
              type="submit"
              disabled={isSubmittingMessage || (!newMsgContent.trim() && !attachment)}
              className="p-2.5 rounded-xl bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white transition-colors cursor-pointer shrink-0"
              title="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        /* ==================================================================== */
        /* VIEW B: DIRECTORY & HUB VIEW (My Groups & Discover Eligible Groups) */
        /* ==================================================================== */
        <div className="space-y-4">
          {/* Header Zone */}
          <div className="bg-gradient-to-br from-blue-700 via-blue-800 to-text-primary rounded-2xl p-4 sm:p-5 text-white shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1 text-blue-200 text-xs">
                  <Users className="w-4 h-4 text-teal-300" />
                  <span>Academic Community & Peer Collaboration</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  Academic Community Hub
                </h1>
                <p className="text-xs text-blue-100/90 mt-1 max-w-xl leading-relaxed">
                  Connect strictly with your polytechnic institute peers, Class Captains, and verified faculty. Share lecture PDFs, practical lab videos, and class announcements.
                </p>

                <div className="flex flex-wrap items-center gap-2 text-[11px] text-blue-200 mt-2 font-mono">
                  <span className="bg-surface/10 px-2 py-0.5 rounded border border-white/10">
                    {userProfile.college}
                  </span>
                  <span>·</span>
                  <span className="bg-surface/10 px-2 py-0.5 rounded border border-white/10">
                    {userProfile.department}
                  </span>
                  <span>·</span>
                  <span className="bg-surface/10 px-2 py-0.5 rounded border border-white/10">
                    Semester {userProfile.semester}
                  </span>
                </div>
              </div>

              {/* Community creation is open to server-verified administrators, verified teachers, and verified Class Captains. */}
              {canCreateCommunity && (
                <button
                  onClick={() => {
                    setCreateName(suggestGroupName());
                    setShowCreateModal(true);
                  }}
                  className="bg-teal-500 hover:bg-teal-600 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all cursor-pointer shrink-0 self-start sm:self-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Academic Group</span>
                </button>
              )}
            </div>
          </div>

          {/* Directory Tabs */}
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('my_groups')}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'my_groups'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>My Groups ({myJoinedCommunities.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('discover')}
                className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'discover'
                    ? 'bg-brand-blue text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Discover Cohort Groups ({discoverableCommunities.length})</span>
              </button>

              {accountType === 'system_admin' && isServerVerifiedAdmin && (
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'admin'
                      ? 'bg-text-primary text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                  <span>Admin Moderation</span>
                </button>
              )}
            </div>

            <button
              onClick={loadCommunities}
              disabled={loading}
              className="text-[11px] text-slate-500 hover:text-brand-blue cursor-pointer"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {/* TAB 1: MY JOINED COMMUNITIES */}
          {activeTab === 'my_groups' && (
            <div className="space-y-3">
              {myJoinedCommunities.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-brand-blue mx-auto flex items-center justify-center mb-3">
                    <Users className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-text-primary">
                    {communities.length === 0 ? 'No communities created yet' : 'No joined communities yet'}
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    {communities.length === 0
                      ? canCreateCommunity
                        ? 'Create an academic community for students to collaborate.'
                        : 'No academic communities have been created yet. Check back later.'
                      : 'You have not joined any academic groups. Check the "Discover Cohort Groups" tab to find and join study groups for your polytechnic department.'}
                  </p>
                  <button
                    onClick={() => setActiveTab('discover')}
                    className="mt-4 px-4 py-2 bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Discover Eligible Groups
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {myJoinedCommunities.map((comm) => {
                    const membership = userMemberships[comm.id];
                    const isMuted = membership?.is_muted || false;

                    return (
                      <div
                        key={comm.id}
                        className="bg-surface rounded-2xl border border-slate-200/90 p-4 shadow-xs hover:border-brand-blue transition-all flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-blue-50 text-brand-blue flex items-center justify-center font-bold text-sm">
                                {comm.avatar_emoji || '👥'}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-text-primary leading-tight">
                                  {comm.name}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  {comm.department} · Sem {comm.semester}
                                </p>
                              </div>
                            </div>

                            {comm.visibility === 'private' ? (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            ) : (
                              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" /> Public
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {comm.description || 'Academic group for course discussions and lecture materials.'}
                          </p>

                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100">
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Users className="w-3.5 h-3.5 text-slate-400" />
                              {comm.member_count} Members
                            </span>
                            <span>·</span>
                            <span>{comm.shift} Shift</span>
                            {isMuted && (
                              <>
                                <span>·</span>
                                <span className="text-amber-600 flex items-center gap-0.5 font-medium">
                                  <BellOff className="w-3 h-3" /> Muted
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-2 flex items-center justify-between gap-2">
                          <button
                            onClick={() => setSelectedCommunity(comm)}
                            className="flex-1 py-2 px-3 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>Enter Room</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DISCOVER COHORT GROUPS */}
          {activeTab === 'discover' && (
            <div className="space-y-3">
              {discoverableCommunities.length === 0 ? (
                <div className="bg-surface rounded-2xl border border-slate-200/90 p-8 text-center shadow-xs">
                  <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                    <Globe className="w-6 h-6" />
                  </div>
                  <h3 className="font-bold text-base text-text-primary">No additional cohort groups found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 leading-relaxed">
                    You have joined all current groups matching your academic profile ({userProfile.department}, Semester {userProfile.semester}).                     New groups are created by system administrators and will appear here.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {discoverableCommunities.map((comm) => {
                    const membership = userMemberships[comm.id];
                    const isPending = membership?.status === 'pending_approval';

                    return (
                      <div
                        key={comm.id}
                        className="bg-surface rounded-2xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-sm">
                                {comm.avatar_emoji || '👥'}
                              </div>
                              <div>
                                <h3 className="font-bold text-sm text-text-primary leading-tight">
                                  {comm.name}
                                </h3>
                                <p className="text-[11px] text-slate-500">
                                  {comm.department} · Sem {comm.semester}
                                </p>
                              </div>
                            </div>

                            {comm.visibility === 'private' ? (
                              <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Lock className="w-2.5 h-2.5" /> Private
                              </span>
                            ) : (
                              <span className="text-[10px] bg-teal-50 text-teal-700 border border-teal-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                <Globe className="w-2.5 h-2.5" /> Public
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                            {comm.description || 'Verified academic group for student discussions and notes.'}
                          </p>

                          <div className="text-[11px] text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center gap-2">
                            <span>Created by:</span>
                            <span className="font-semibold text-slate-700">
                              {comm.created_by_name} ({comm.created_by_role === 'teacher' ? 'Faculty' : 'CR'})
                            </span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2">
                          {isPending ? (
                            <div className="py-2 px-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold text-center flex items-center justify-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>Request Pending Approval</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleJoin(comm)}
                              className="w-full py-2 px-3 rounded-xl bg-brand-blue hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{comm.visibility === 'private' ? 'Request to Join' : 'Join Academic Group'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: ADMIN MODERATION (System Admin Only) */}
          {activeTab === 'admin' && accountType === 'system_admin' && isServerVerifiedAdmin && (
            <div className="bg-surface rounded-2xl border border-slate-200/90 p-4 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-sm text-text-primary">Community Abuse & Reports Queue</h3>
                  <p className="text-xs text-slate-500">Review reported messages and toggle community active states.</p>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-3">Community Name</th>
                      <th className="p-3">Cohort</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Members</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {communities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-6 text-center text-slate-500">
                          No communities created yet.
                        </td>
                      </tr>
                    ) : communities.map((comm) => (
                      <tr key={comm.id} className="hover:bg-slate-50/80">
                        <td className="p-3 font-semibold text-slate-800">{comm.name}</td>
                        <td className="p-3 text-slate-600">{comm.department} · Sem {comm.semester}</td>
                        <td className="p-3">
                          {comm.is_active ? (
                            <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-2 py-0.5 rounded border border-teal-200">
                              Active
                            </span>
                          ) : (
                            <span className="text-[10px] bg-rose-50 text-rose-700 font-bold px-2 py-0.5 rounded border border-rose-200">
                              Suspended
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">{comm.member_count}</td>
                        <td className="p-3 text-right">
                          <button
                            onClick={async () => {
                              try {
                                const res = await apiFetch(`/api/admin/communities/${comm.id}/toggle-active`, {
                                  method: 'POST',
                                  headers: getHeaders()
                                });
                                const d = await res.json();
                                if (d.success) {
                                  showToast(d.message);
                                  await loadCommunities();
                                }
                              } catch {
                                setErrorMsg('Failed to toggle status.');
                              }
                            }}
                            className="px-2.5 py-1 text-[11px] rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium"
                          >
                            {comm.is_active ? 'Deactivate' : 'Reactivate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: CREATE COMMUNITY MODAL */}
      {/* ==================================================================== */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-surface rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-blue" />
                <h3 className="font-bold text-base text-text-primary">Create Academic Community</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCommunity} className="space-y-3.5 mt-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Community Name *
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={e => setCreateName(e.target.value)}
                  placeholder="e.g. CST 6th Semester Study Group"
                  required
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Purpose
                </label>
                <textarea
                  value={createDescription}
                  onChange={e => setCreateDescription(e.target.value)}
                  placeholder="Announcements, notes sharing, lab practicals & midterms prep..."
                  rows={2}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-brand-blue"
                />
              </div>

              {/* Department & Semester controls (For Teachers, selectable; For Captains, locked to verified cohort) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Department / Tech
                  </label>
                  {accountType === 'teacher' ? (
                    <select
                      value={createDept}
                      onChange={e => setCreateDept(e.target.value)}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={userProfile.department}
                      className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-500 font-medium"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Semester
                  </label>
                  {accountType === 'teacher' ? (
                    <select
                      value={createSemester}
                      onChange={e => setCreateSemester(Number(e.target.value))}
                      className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                        <option key={s} value={s}>Semester {s}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      disabled
                      value={`Semester ${userProfile.semester}`}
                      className="w-full text-xs bg-slate-100 border border-slate-200 rounded-xl px-2.5 py-2 text-slate-500 font-medium"
                    />
                  )}
                </div>
              </div>

              {/* Visibility Setting */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Community Visibility
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className={`border rounded-xl p-2.5 flex items-start gap-2 cursor-pointer transition-colors ${
                    createVisibility === 'public' ? 'border-brand-blue bg-blue-50/50' : 'border-slate-200 bg-surface'
                  }`}>
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={createVisibility === 'public'}
                      onChange={() => setCreateVisibility('public')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Globe className="w-3 h-3 text-teal-600" /> Public
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Discoverable by any student in this department & semester.
                      </p>
                    </div>
                  </label>

                  <label className={`border rounded-xl p-2.5 flex items-start gap-2 cursor-pointer transition-colors ${
                    createVisibility === 'private' ? 'border-brand-blue bg-blue-50/50' : 'border-slate-200 bg-surface'
                  }`}>
                    <input
                      type="radio"
                      name="visibility"
                      value="private"
                      checked={createVisibility === 'private'}
                      onChange={() => setCreateVisibility('private')}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <Lock className="w-3 h-3 text-amber-600" /> Private
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Requires moderator approval to join.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-brand-blue hover:bg-blue-700 disabled:opacity-50 text-white shadow-xs"
                >
                  {isCreating ? 'Creating...' : 'Create Group'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: MEMBERS LIST MODAL */}
      {/* ==================================================================== */}
      {showMembersModal && selectedCommunity && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-surface rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-brand-blue" />
                <h3 className="font-bold text-sm text-text-primary">
                  Group Members ({members.length})
                </h3>
              </div>
              <button
                onClick={() => setShowMembersModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-3 divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {members.map((mem) => (
                <div key={mem.id} className="py-2.5 flex items-center justify-between gap-2 text-xs">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <span>{mem.user_name}</span>
                      {mem.membership_role === 'owner' && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 font-semibold px-1 rounded border border-blue-200">
                          Creator
                        </span>
                      )}
                      {mem.membership_role === 'moderator' && (
                        <span className="text-[10px] bg-amber-50 text-amber-700 font-semibold px-1 rounded border border-amber-200">
                          Moderator
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Joined {new Date(mem.joined_at).toLocaleDateString()}
                    </p>
                  </div>

                  <span className="text-[10px] text-slate-500 font-medium capitalize">
                    {mem.user_role === 'class_captain' ? 'Class Captain' : mem.user_role}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: REPORT ABUSE MODAL */}
      {/* ==================================================================== */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3.5 sm:p-4">
          <div className="bg-surface rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
                <h3 className="font-bold text-sm text-text-primary">Report Content or User</h3>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 mt-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Reason for Report</label>
                <select
                  value={reportReason}
                  onChange={e => setReportReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs"
                >
                  <option value="Inappropriate content">Inappropriate / Offensive content</option>
                  <option value="Harassment or Bullying">Harassment or Bullying</option>
                  <option value="Academic Dishonesty">Academic Dishonesty / Exam Leak</option>
                  <option value="Spam or Advertising">Spam or Unsolicited Promotion</option>
                  <option value="Other">Other Violation</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Details (Optional)</label>
                <textarea
                  value={reportDetails}
                  onChange={e => setReportDetails(e.target.value)}
                  placeholder="Provide context for moderators..."
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReport}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
