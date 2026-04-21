import React, { useState } from 'react';
import { X, Calendar, User, Tag, Flag, Clock, FileText, ExternalLink, MessageSquare, CheckCircle, AlertTriangle, History, Send, Loader2, RotateCcw, ThumbsUp, Lock, Unlock, Activity, Layers, Edit2, Copy, Trash2, Check, Download } from 'lucide-react';
import { MarketingRequest, Revision, RequestStatus, UserProfile } from '../types';
import { format, isValid, parseISO, isBefore, startOfDay } from 'date-fns';
import { useAuth } from '../hooks/useAuth';
import { doc, updateDoc, collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { useComments } from '../hooks/useComments';
import { useActivityLog } from '../hooks/useActivityLog';
import { getDeadlineStatus, getDeadlineColorClass, getDeadlineBadgeClass } from '../utils/dateUtils';

interface TaskDetailsModalProps {
  task: MarketingRequest;
  onClose: () => void;
  onUpdate?: (id: string, data: Partial<MarketingRequest>) => Promise<void>;
  onDuplicate?: (task: MarketingRequest) => void;
}

export default function TaskDetailsModal({ task, onClose, onUpdate, onDuplicate }: TaskDetailsModalProps) {
  const { profile } = useAuth();
  const isSupervisor = profile?.role === 'marketing_supervisor';
  const isMember = profile?.role === 'marketing_member';
  const isMarketing = isSupervisor || isMember;
  const isRequestor = profile?.role === 'department';
  const canEdit = isSupervisor || (!task.locked && (isMember || isRequestor));
  
  const [requestingRevision, setRequestingRevision] = useState(false);
  const [approvingTask, setApprovingTask] = useState(false);
  const [requestorRevisionNotes, setRequestorRevisionNotes] = useState('');
  const [showRevisionInput, setShowRevisionInput] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockInput, setUnlockInput] = useState('');
  const [unlockingTask, setUnlockingTask] = useState(false);
  const [lockingTask, setLockingTask] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  
  // Edit Mode States
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.requestTitle);
  const [editDescription, setEditDescription] = useState(task.description);
  const [editBrand, setEditBrand] = useState(task.brand);
  const [editType, setEditType] = useState(task.requestType);
  const [editPriority, setEditPriority] = useState(task.priority);
  const [editDateNeeded, setEditDateNeeded] = useState(task.dateNeeded);
  const [editAttachmentLink, setEditAttachmentLink] = useState(task.requestAttachmentLink || '');
  const [savingEdit, setSavingEdit] = useState(false);

  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'versions' | 'activity'>('details');
  const { comments, loading: commentsLoading, addComment } = useComments(task.id);
  const { logs, loading: logsLoading } = useActivityLog(task.id);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);

  const [withdrawingTask, setWithdrawingTask] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);

  const [estimatedDate, setEstimatedDate] = useState(task.estimatedCompletionDate || '');
  const [updatingEstimatedDate, setUpdatingEstimatedDate] = useState(false);

  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [assigning, setAssigning] = useState(false);

  React.useEffect(() => {
    if (isSupervisor) {
      const fetchTeam = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'marketing_member'));
          const snapshot = await getDocs(q);
          const members = snapshot.docs.map(doc => doc.data() as UserProfile);
          setTeamMembers(members);
        } catch (error) {
          console.error('Error fetching team members:', error);
        }
      };
      fetchTeam();
    }
  }, [isSupervisor]);

  const handleAssign = async (memberUid: string) => {
    if (!onUpdate) return;
    setAssigning(true);
    try {
      const member = teamMembers.find(m => m.uid === memberUid);
      const memberName = member ? member.displayName : 'Unassigned';
      await onUpdate(task.id, {
        assignedTo: memberUid === 'Unassigned' ? '' : memberUid,
        assignedToName: memberName,
        status: memberUid === 'Unassigned' ? 'Pending' : (task.status === 'Pending' ? 'Assigned' : task.status)
      });
    } catch (error) {
      console.error('Error assigning task:', error);
    } finally {
      setAssigning(false);
    }
  };

  const handleUpdateEstimatedDate = async (val: string) => {
    setEstimatedDate(val);
    if (!onUpdate) return;
    setUpdatingEstimatedDate(true);
    try {
      await onUpdate(task.id, { estimatedCompletionDate: val });
    } catch (error) {
      console.error('Error updating estimated date:', error);
    } finally {
      setUpdatingEstimatedDate(false);
    }
  };

  const handleWithdraw = async () => {
    if (!onUpdate) return;
    setWithdrawingTask(true);
    try {
      await onUpdate(task.id, { status: 'Cancelled' });
      onClose();
    } catch (error) {
      console.error('Error withdrawing task:', error);
    } finally {
      setWithdrawingTask(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!onUpdate) return;
    setSavingEdit(true);
    try {
      await onUpdate(task.id, {
        requestTitle: editTitle,
        description: editDescription,
        brand: editBrand,
        requestType: editType,
        priority: editPriority,
        dateNeeded: editDateNeeded,
        requestAttachmentLink: editAttachmentLink
      });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving edit:', error);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await addComment(newComment);
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleRequestorRevision = async () => {
    if (!requestorRevisionNotes.trim() || !onUpdate) return;
    setRequestingRevision(true);
    try {
      await onUpdate(task.id, {
        status: 'Revision Needed',
        revisionNotes: requestorRevisionNotes
      });
      setShowRevisionInput(false);
      setRequestorRevisionNotes('');
    } catch (error) {
      console.error('Error requesting revision:', error);
    } finally {
      setRequestingRevision(false);
    }
  };

  const handleApproveTask = async () => {
    if (!onUpdate) return;
    setApprovingTask(true);
    try {
      await onUpdate(task.id, {
        status: 'Completed',
        locked: true,
        previouslyLocked: true
      });
    } catch (error) {
      console.error('Error approving task:', error);
    } finally {
      setApprovingTask(false);
    }
  };

  const handleUnlockTask = async () => {
    if (unlockInput.toLowerCase() !== 'locked' || !onUpdate) return;
    setUnlockingTask(true);
    try {
      await onUpdate(task.id, {
        locked: false,
        previouslyLocked: true
      });
      setShowUnlockModal(false);
      setUnlockInput('');
    } catch (error) {
      console.error('Error unlocking task:', error);
    } finally {
      setUnlockingTask(false);
    }
  };

  const handleLockTask = async () => {
    if (!onUpdate) return;
    setLockingTask(true);
    try {
      await onUpdate(task.id, {
        locked: true
      });
    } catch (error) {
      console.error('Error locking task:', error);
    } finally {
      setLockingTask(false);
    }
  };

  const safeFormat = (date: any, formatStr: string) => {
    if (!date) return 'N/A';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      if (!isValid(d)) return 'Invalid Date';
      return format(d, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white dark:bg-[#1c1c1c] w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] border border-black/5 dark:border-white/10">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#141414] dark:bg-black text-white shrink-0">
          <div className="flex items-center space-x-3">
            <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider">
              {task.requestId}
            </span>
            <h2 className="text-lg font-bold truncate">{task.requestTitle}</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Status Progress Bar */}
        <div className="px-5 sm:px-6 pt-6 pb-2 border-b border-black/5 dark:border-white/5">
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              {['Pending', 'Assigned', 'In Progress', 'For Review', 'Completed'].map((stage, idx) => {
                const stages = ['Pending', 'Assigned', 'In Progress', 'For Review', 'Completed'];
                const currentIdx = stages.indexOf(task.status === 'Revision Needed' ? 'For Review' : task.status);
                const isCompleted = idx < currentIdx || task.status === 'Completed';
                const isCurrent = idx === currentIdx && task.status !== 'Completed';
                const isRevision = stage === 'For Review' && task.status === 'Revision Needed';

                return (
                  <div key={stage} className="flex flex-col items-center relative z-10 flex-1">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                      isCompleted ? 'bg-green-500 border-green-500 text-white' :
                      isRevision ? 'bg-amber-500 border-amber-500 text-white animate-pulse' :
                      isCurrent ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-600/20' :
                      'bg-white dark:bg-zinc-800 border-gray-200 dark:border-white/10 text-gray-400'
                    }`}>
                      {isCompleted ? <Check size={14} /> : <span className="text-[10px] font-bold">{idx + 1}</span>}
                    </div>
                    <span className={`text-[9px] font-bold mt-1.5 uppercase tracking-wider ${
                      isCurrent || isRevision ? 'text-blue-600 dark:text-blue-400' : 
                      isCompleted ? 'text-green-600 dark:text-green-400' : 
                      'text-gray-400'
                    }`}>
                      {isRevision ? 'Revision' : stage}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="absolute top-[14px] left-[10%] right-[10%] h-0.5 bg-gray-100 dark:bg-white/5 -z-0">
              <div 
                className="h-full bg-green-500 transition-all duration-1000" 
                style={{ width: `${Math.min((['Pending', 'Assigned', 'In Progress', 'For Review', 'Completed'].indexOf(task.status === 'Revision Needed' ? 'For Review' : task.status) / 4) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-black/5 dark:border-white/5 px-5 sm:px-6 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'details' ? 'border-[#141414] dark:border-white text-[#141414] dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <FileText size={16} />
              <span>Details</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('comments')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'comments' ? 'border-[#141414] dark:border-white text-[#141414] dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <MessageSquare size={16} />
              <span>Comments</span>
              {comments.length > 0 && (
                <span className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full text-xs">{comments.length}</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'versions' ? 'border-[#141414] dark:border-white text-[#141414] dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Layers size={16} />
              <span>Versions</span>
              {(task.resubmissions?.length || 0) > 0 && (
                <span className="bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded-full text-xs">{task.resubmissions?.length}</span>
              )}
            </div>
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-4 py-4 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'activity' ? 'border-[#141414] dark:border-white text-[#141414] dark:text-white' : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-white/50 dark:hover:text-white/80'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Activity size={16} />
              <span>Activity</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-8">
          {/* Deliverable Section (Only if Completed) */}
          {task.status === 'Completed' && task.revisions && task.revisions.length > 0 && (
            <div className="bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/20 rounded-2xl p-6 animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500 flex items-center justify-center text-white">
                    <CheckCircle size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-green-900 dark:text-green-400">Deliverable Ready</h3>
                    <p className="text-sm text-green-700 dark:text-green-500/80">Completed on {safeFormat(task.updatedAt, 'MMM d, yyyy')}</p>
                  </div>
                </div>
                {(task.revisions[task.revisions.length - 1].fileUrl || task.revisions[task.revisions.length - 1].link) && (
                  <a 
                    href={task.revisions[task.revisions.length - 1].fileUrl || task.revisions[task.revisions.length - 1].link} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
                  >
                    {task.revisions[task.revisions.length - 1].fileUrl ? <Download size={18} /> : <ExternalLink size={18} />}
                    <span>{task.revisions[task.revisions.length - 1].fileUrl ? 'Download' : 'Open Link'}</span>
                  </a>
                )}
              </div>
              
              {task.revisions[task.revisions.length - 1].fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <div className="relative group cursor-pointer" onClick={() => setLightboxUrl(task.revisions[task.revisions.length - 1].fileUrl)}>
                  <img 
                    src={task.revisions[task.revisions.length - 1].fileUrl} 
                    alt="Deliverable Preview" 
                    className="w-full h-48 object-cover rounded-xl border border-green-200 dark:border-green-900/30 group-hover:opacity-90 transition-opacity"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded-xl">
                    <ExternalLink className="text-white" size={32} />
                  </div>
                </div>
              )}
            </div>
          )}
          {activeTab === 'details' && (
            <>
              {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                task.status === 'Completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                task.status === 'Revision Needed' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                task.status === 'For Review' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              }`}>
                {task.status}
              </span>
              <span className="text-xs text-gray-500 dark:text-white/40 font-medium">
                Requested on {safeFormat(task.dateRequested, 'MMM d, yyyy h:mm a')}
              </span>
            </div>
            {task.tatAcknowledged && isMarketing && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/50">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">TAT Conflict Acknowledged</span>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-3">Project Description</h3>
            <p className="text-black/70 dark:text-white/70 leading-relaxed whitespace-pre-wrap">{task.description}</p>
          </div>

          {/* Grid Details */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <Tag size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Department</span>
              </div>
              <p className="text-sm font-semibold dark:text-white">{task.department}</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <Flag size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Brand</span>
              </div>
              <p className="text-sm font-semibold dark:text-white">{task.brand}</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Priority</span>
              </div>
              <p className={`text-sm font-semibold ${task.priority === 'Urgent' ? 'text-red-500 dark:text-red-400' : 'dark:text-white'}`}>{task.priority}</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <Calendar size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Deadline</span>
              </div>
              <div className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full space-x-1 mt-1 ${getDeadlineBadgeClass(getDeadlineStatus(task.dateNeeded, task.status))}`}>
                <span>{safeFormat(task.dateNeeded, 'MMM d, yyyy')}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <Clock size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Est. Completion</span>
              </div>
              <div className="mt-1">
                {isMarketing ? (
                  <div className="relative group">
                    <input
                      type="date"
                      value={estimatedDate}
                      onChange={(e) => handleUpdateEstimatedDate(e.target.value)}
                      className="bg-black/5 dark:bg-white/5 border-none rounded-lg px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500 w-full"
                    />
                    {updatingEstimatedDate && <Loader2 size={10} className="absolute right-2 top-2 animate-spin text-blue-500" />}
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold dark:text-white">
                      {task.estimatedCompletionDate ? format(new Date(task.estimatedCompletionDate), 'MMM d, yyyy') : 'TBD'}
                    </span>
                    {task.estimatedCompletionDate && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        isBefore(parseISO(task.estimatedCompletionDate), parseISO(task.dateNeeded)) || task.estimatedCompletionDate === task.dateNeeded
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-600'
                      }`}>
                        {isBefore(parseISO(task.estimatedCompletionDate), parseISO(task.dateNeeded)) || task.estimatedCompletionDate === task.dateNeeded
                          ? 'On Track'
                          : 'Delayed'}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <User size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Requestor</span>
              </div>
              <p className="text-sm font-semibold dark:text-white">{task.requestorName || 'N/A'}</p>
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <User size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Assigned To</span>
              </div>
              {isSupervisor ? (
                <div className="relative group mt-1">
                  <select
                    value={task.assignedTo || 'Unassigned'}
                    onChange={(e) => handleAssign(e.target.value)}
                    disabled={assigning || task.status === 'Completed'}
                    className="bg-black/5 dark:bg-white/5 border-none rounded-lg px-2 py-1 text-xs font-semibold focus:ring-1 focus:ring-blue-500 w-full appearance-none cursor-pointer disabled:opacity-50"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </select>
                  {assigning && <Loader2 size={10} className="absolute right-6 top-2 animate-spin text-blue-500" />}
                </div>
              ) : (
                <p className="text-sm font-semibold dark:text-white">{task.assignedToName}</p>
              )}
            </div>
            <div>
              <div className="flex items-center space-x-2 text-gray-500 dark:text-white/30 mb-1">
                <MessageSquare size={12} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Revisions</span>
              </div>
              <p className="text-sm font-semibold dark:text-white">{task.revisionCount || 0}</p>
            </div>
          </div>

          {/* Action Buttons */}
          {isRequestor && task.status === 'Pending' && (
            <div className="flex flex-wrap gap-3 pt-4 border-t border-black/5 dark:border-white/5">
              <button 
                onClick={() => setIsEditing(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              >
                <Edit2 size={16} />
                <span>Edit Request</span>
              </button>
              <button 
                onClick={() => setShowWithdrawConfirm(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/20 transition-all"
              >
                <Trash2 size={16} />
                <span>Withdraw</span>
              </button>
              <button 
                onClick={() => onDuplicate && onDuplicate(task)}
                className="flex items-center space-x-2 px-4 py-2 bg-black/5 dark:bg-white/5 text-black dark:text-white rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              >
                <Copy size={16} />
                <span>Duplicate</span>
              </button>
            </div>
          )}

          {/* Revision History */}
          {task.revisions && task.revisions.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest flex items-center space-x-2">
                <History size={12} />
                <span>Revision History</span>
              </h3>
              <div className="space-y-6">
                {task.revisions
                  ?.map((rev, originalIdx) => ({ ...rev, originalIdx }))
                  .filter(rev => !isRequestor || rev.type === 'requestor')
                  .map((rev, displayIdx) => {
                    const resubmission = task.resubmissions?.find(r => r.revisionNumber === rev.originalIdx);
                    
                    return (
                      <div key={rev.id} className="space-y-4 relative">
                        {/* Timeline connecting line */}
                        {displayIdx !== task.revisions!.filter(r => !isRequestor || r.type === 'requestor').length - 1 && (
                          <div className="absolute left-6 top-16 bottom-[-24px] w-px bg-black/10 dark:bg-white/10" />
                        )}
                        
                        <div className="flex items-center space-x-3">
                          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400 font-bold text-sm border-2 border-white dark:border-[#1c1c1c] z-10">
                            #{displayIdx + 1}
                          </div>
                          <h4 className="text-sm font-bold text-[#141414] dark:text-white">
                            {rev.type === 'requestor' ? 'Requestor Revision' : `Round ${rev.originalIdx + 1}`}
                          </h4>
                        </div>

                        {/* Revision Request */}
                        <div className="ml-6 pl-10">
                          <div className="p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                            <div className="flex justify-between items-start mb-3">
                              <span className="text-xs font-bold text-red-800 dark:text-red-300">
                                {rev.requestedByName || (rev.type === 'requestor' ? 'Requestor' : 'Supervisor')} requested changes
                              </span>
                              <span className="text-[10px] text-red-600/60 dark:text-red-400/60 font-medium">{safeFormat(rev.createdAt, 'MMM d, h:mm a')}</span>
                            </div>
                            <p className="text-sm text-red-900 dark:text-red-200 leading-relaxed mb-4">{rev.notes}</p>
                            
                            {(rev.fileUrl || rev.link) && (
                              <div className="flex flex-wrap gap-2 pt-3 border-t border-red-200/50 dark:border-red-900/50">
                                {rev.fileUrl && (
                                  <a href={rev.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <FileText size={14} />
                                    <span className="truncate max-w-[200px]">{rev.fileName || 'View File'}</span>
                                  </a>
                                )}
                                {rev.link && (
                                  <a href={rev.link} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg text-xs font-bold text-red-600 dark:text-red-400 border border-red-100 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                                    <ExternalLink size={14} />
                                    <span>View Link</span>
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Member Resubmission */}
                        <div className="ml-6 pl-10">
                          {resubmission ? (
                            <div className="p-5 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                              <div className="flex justify-between items-start mb-3">
                                <span className="text-xs font-bold text-green-800 dark:text-green-300">{resubmission.submittedByName} resubmitted</span>
                                <span className="text-[10px] text-green-600/60 dark:text-green-400/60 font-medium">{safeFormat(resubmission.createdAt, 'MMM d, h:mm a')}</span>
                              </div>
                              {resubmission.notes && (
                                <p className="text-sm text-green-900 dark:text-green-200 leading-relaxed mb-4">{resubmission.notes}</p>
                              )}
                              
                              {(resubmission.fileUrl || resubmission.link) && (
                                <div className="flex flex-wrap gap-2 pt-3 border-t border-green-200/50 dark:border-green-900/50">
                                  {resubmission.fileUrl && (
                                    <a href={resubmission.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg text-xs font-bold text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                      <FileText size={14} />
                                      <span className="truncate max-w-[200px]">{resubmission.fileName || 'View File'}</span>
                                    </a>
                                  )}
                                  {resubmission.link && (
                                    <a href={resubmission.link} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 px-3 py-1.5 bg-white dark:bg-white/5 rounded-lg text-xs font-bold text-green-600 dark:text-green-400 border border-green-100 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                      <ExternalLink size={14} />
                                      <span>View Link</span>
                                    </a>
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="p-4 rounded-2xl border border-dashed border-black/10 dark:border-white/10 flex items-center space-x-3 text-black/40 dark:text-white/40">
                              <Clock size={16} />
                              <span className="text-xs font-bold uppercase tracking-widest">Awaiting resubmission...</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                {task.revisions.filter(rev => !isRequestor || rev.type === 'requestor').length === 0 && isRequestor && (
                  <p className="text-sm text-black/30 dark:text-white/30 italic">No revision history available for you.</p>
                )}
              </div>
            </div>
          )}

          {/* Internal Notes */}
          {task.internalNotes && (
            <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-900/30">
              <h4 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Internal Notes</h4>
              <p className="text-sm text-blue-800 dark:text-blue-200">{task.internalNotes}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest">Files & Links</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Request Attachments */}
              {(task.requestAttachmentUrl || task.requestAttachmentLink) && (
                <div className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl">
                  <p className="text-[10px] font-bold text-gray-500 dark:text-white/40 uppercase tracking-widest mb-3">Request Files</p>
                  <div className="space-y-2">
                    {task.requestAttachmentUrl && (
                      <div className="space-y-2">
                        <a href={task.requestAttachmentUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                          <FileText size={14} />
                          <span className="truncate">{task.requestAttachmentName || 'Attachment'}</span>
                        </a>
                        {task.requestAttachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                          <div 
                            className="mt-2 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 max-h-40 bg-black/5 cursor-zoom-in group"
                            onClick={() => setLightboxUrl(task.requestAttachmentUrl!)}
                          >
                            <img 
                              src={task.requestAttachmentUrl} 
                              alt="Attachment Preview" 
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {task.requestAttachmentUrl.match(/\.(mp4|webm|ogg)$/i) && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 max-h-40 bg-black/5">
                            <video 
                              src={task.requestAttachmentUrl} 
                              className="w-full h-full object-contain"
                              controls
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {task.requestAttachmentLink && (
                      <a href={task.requestAttachmentLink} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                        <ExternalLink size={14} />
                        <span className="truncate">External Link</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Deliverables */}
              {(task.deliverableFileUrl || task.deliverableLink) && (
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-2xl">
                  <p className="text-[10px] font-bold text-green-600/60 dark:text-green-400/60 uppercase tracking-widest mb-3">Finished Work</p>
                  <div className="space-y-2">
                    {task.deliverableFileUrl && (
                      <div className="space-y-2">
                        <a href={task.deliverableFileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-xs font-bold text-green-700 dark:text-green-400 hover:underline">
                          <CheckCircle size={14} />
                          <span className="truncate">{task.deliverableFileName || 'Deliverable'}</span>
                        </a>
                        {task.deliverableFileUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) && (
                          <div 
                            className="mt-2 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 max-h-40 bg-black/5 cursor-zoom-in group"
                            onClick={() => setLightboxUrl(task.deliverableFileUrl!)}
                          >
                            <img 
                              src={task.deliverableFileUrl} 
                              alt="Deliverable Preview" 
                              className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {task.deliverableFileUrl.match(/\.(mp4|webm|ogg)$/i) && (
                          <div className="mt-2 rounded-xl overflow-hidden border border-black/5 dark:border-white/10 max-h-40 bg-black/5">
                            <video 
                              src={task.deliverableFileUrl} 
                              className="w-full h-full object-contain"
                              controls
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {task.deliverableLink && (
                      <a href={task.deliverableLink} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-xs font-bold text-green-700 dark:text-green-400 hover:underline">
                        <ExternalLink size={14} />
                        <span className="truncate">Work Link</span>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
            </>
          )}

          {activeTab === 'comments' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {task.status === 'Revision Needed' && isRequestor && (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex items-start space-x-3">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                  <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-400">Revision Requested</p>
                    <p className="text-xs text-amber-800 dark:text-amber-500/80">The marketing team has requested more information or changes. Please check the comments below and provide your response.</p>
                  </div>
                </div>
              )}

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {commentsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="animate-spin text-blue-500" size={32} />
                    <p className="text-sm text-gray-500">Loading comments...</p>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-12 bg-black/5 dark:bg-white/5 rounded-2xl">
                    <MessageSquare className="mx-auto text-gray-400 mb-2" size={32} />
                    <p className="text-sm text-gray-500 italic">No comments yet. Start the conversation!</p>
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="bg-black/5 dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-sm dark:text-white">{comment.userName}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${
                            comment.userRole === 'marketing_supervisor' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600' :
                            comment.userRole === 'marketing_member' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' :
                            'bg-zinc-100 dark:bg-zinc-800 text-zinc-600'
                          }`}>
                            {comment.userRole.replace('marketing_', '').replace('_', ' ')}
                          </span>
                        </div>
                        <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">{safeFormat(comment.createdAt, 'MMM d, h:mm a')}</span>
                      </div>
                      <p className="text-sm text-black/70 dark:text-white/70 whitespace-pre-wrap leading-relaxed">{comment.text}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="flex items-end space-x-3 pt-4 border-t border-black/5 dark:border-white/5">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/10 dark:text-white resize-none h-20"
                />
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="px-6 py-4 bg-[#141414] dark:bg-white dark:text-black text-white rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-white/90 transition-all disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-black/10"
                >
                  {submittingComment ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                  <span>Send</span>
                </button>
              </div>
            </div>
          )}

          {activeTab === 'versions' && (
            <div className="space-y-6">
              {(!task.resubmissions || task.resubmissions.length === 0) ? (
                <div className="text-center py-8 text-black/40 dark:text-white/40 italic">No versions available.</div>
              ) : (
                <div className="space-y-4">
                  {task.resubmissions.map((sub, index) => (
                    <div key={sub.id} className="p-4 bg-black/5 dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/10">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <span className="px-3 py-1 bg-[#141414] dark:bg-white text-white dark:text-black rounded-full text-xs font-bold">
                            V{index + 1}
                          </span>
                          <span className="text-sm font-medium dark:text-white">Submitted by {sub.submittedByName}</span>
                        </div>
                        <span className="text-xs text-black/40 dark:text-white/40">{safeFormat(sub.createdAt, 'MMM d, yyyy h:mm a')}</span>
                      </div>
                      <div className="space-y-2 pl-12">
                        {sub.fileUrl && (
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            <FileText size={14} />
                            <span className="truncate">{sub.fileName || 'Deliverable File'}</span>
                          </a>
                        )}
                        {sub.link && (
                          <a href={sub.link} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline">
                            <ExternalLink size={14} />
                            <span className="truncate">External Link</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'activity' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center space-x-2">
                  <Activity size={18} className="text-blue-500" />
                  <span>Activity Timeline</span>
                </h3>
              </div>

              {logsLoading ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                  <Loader2 className="animate-spin text-blue-500" size={32} />
                  <p className="text-sm text-gray-500">Loading activity logs...</p>
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-12 bg-black/5 dark:bg-white/5 rounded-2xl">
                  <History className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm text-gray-500">No activity recorded yet.</p>
                </div>
              ) : (
                <div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-z-10 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-blue-500/20 before:to-transparent">
                  {logs.map((log) => (
                    <div key={log.id} className="relative flex items-start space-x-4">
                      <div className={`mt-1 w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                        log.action.includes('Status') ? 'bg-blue-500 text-white' :
                        log.action.includes('Comment') ? 'bg-purple-500 text-white' :
                        log.action.includes('Revision') ? 'bg-amber-500 text-white' :
                        'bg-gray-500 text-white'
                      }`}>
                        {log.action.includes('Status') ? <Activity size={18} /> :
                         log.action.includes('Comment') ? <MessageSquare size={18} /> :
                         log.action.includes('Revision') ? <RotateCcw size={18} /> :
                         <FileText size={18} />}
                      </div>
                      <div className="flex-1 bg-white dark:bg-white/5 p-4 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-bold text-gray-900 dark:text-white">{log.userName}</span>
                          <span className="text-[10px] text-gray-400 font-medium">{safeFormat(log.createdAt, 'MMM d, h:mm a')}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-white/60 leading-relaxed">{log.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 sm:p-6 bg-[#F5F5F4] dark:bg-black/40 border-t border-black/5 dark:border-white/5 flex flex-col space-y-4 shrink-0">
          {isRequestor && task.status === 'Completed' && !task.locked && (
            <div className="w-full">
              {!showRevisionInput ? (
                <div className="flex items-center justify-end space-x-3 w-full">
                  <button
                    onClick={handleApproveTask}
                    disabled={approvingTask}
                    className="flex items-center space-x-2 px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all disabled:opacity-50 shadow-lg shadow-green-500/20"
                  >
                    {approvingTask ? <Loader2 className="animate-spin" size={16} /> : <ThumbsUp size={16} />}
                    <span>I'm Okay with this</span>
                  </button>
                  <button
                    onClick={() => setShowRevisionInput(true)}
                    className="flex items-center space-x-2 px-6 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 transition-all"
                  >
                    <RotateCcw size={16} />
                    <span>Request a Revision</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-4 p-6 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-widest">Revision Notes</h4>
                    <button onClick={() => setShowRevisionInput(false)} className="text-gray-400 hover:text-gray-600">
                      <X size={16} />
                    </button>
                  </div>
                  <textarea
                    value={requestorRevisionNotes}
                    onChange={(e) => setRequestorRevisionNotes(e.target.value)}
                    placeholder="Describe what needs to be changed..."
                    className="w-full bg-white dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 dark:text-white h-32 resize-none"
                  />
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowRevisionInput(false)}
                      className="px-4 py-2 text-xs font-bold text-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      disabled={!requestorRevisionNotes.trim() || requestingRevision}
                      onClick={handleRequestorRevision}
                      className="flex items-center space-x-2 px-6 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                    >
                      {requestingRevision ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      <span>Send to Supervisor</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center w-full">
            <div className="flex items-center space-x-3">
              {task.locked && (
                <div className="flex items-center space-x-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-100 dark:border-amber-900/30">
                  <Lock size={14} />
                  <span>Task Locked</span>
                </div>
              )}
              {isSupervisor && task.locked && (
                <button
                  onClick={() => setShowUnlockModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-white/5 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all"
                >
                  <Unlock size={14} />
                  <span>Unlock Task</span>
                </button>
              )}
              {isSupervisor && !task.locked && task.previouslyLocked && (
                <button
                  onClick={handleLockTask}
                  disabled={lockingTask}
                  className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-white/5 text-amber-600 dark:text-amber-400 rounded-xl text-xs font-bold border border-amber-200 dark:border-amber-900/50 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all disabled:opacity-50"
                >
                  {lockingTask ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                  <span>Lock Task Again</span>
                </button>
              )}
            </div>
            <button onClick={onClose} className="px-6 py-2 bg-[#141414] dark:bg-white dark:text-black text-white rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-white/90 transition-all">
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Unlock Modal */}
      {showUnlockModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1c] w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#141414] dark:text-white flex items-center space-x-2">
                <Unlock className="text-amber-500" size={20} />
                <span>Unlock Task</span>
              </h3>
              <button onClick={() => {
                setShowUnlockModal(false);
                setUnlockInput('');
              }} className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors">
                <X size={16} />
              </button>
            </div>
            <p className="text-sm text-black/60 dark:text-white/60 mb-6">
              This task was locked by the requestor. To unlock it, please type <strong className="text-black dark:text-white">locked</strong> below.
            </p>
            <input
              type="text"
              value={unlockInput}
              onChange={(e) => setUnlockInput(e.target.value)}
              placeholder="Type 'locked' to confirm"
              className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-amber-500/20 dark:text-white mb-6"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowUnlockModal(false);
                  setUnlockInput('');
                }}
                className="px-4 py-2 text-sm font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={handleUnlockTask}
                disabled={unlockInput.toLowerCase() !== 'locked' || unlockingTask}
                className="flex items-center space-x-2 px-6 py-2 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 transition-all disabled:opacity-50"
              >
                {unlockingTask ? <Loader2 className="animate-spin" size={16} /> : <Unlock size={16} />}
                <span>Unlock</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Confirmation */}
      {showWithdrawConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1c] w-full max-w-sm rounded-3xl shadow-2xl p-6 border border-black/5 dark:border-white/10 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center text-red-600 mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Withdraw Request?</h3>
            <p className="text-sm text-gray-500 dark:text-white/60 mb-6">Are you sure you want to withdraw this request? This action cannot be undone.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowWithdrawConfirm(false)}
                className="flex-1 px-4 py-2 bg-black/5 dark:bg-white/5 text-gray-600 dark:text-white/60 rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleWithdraw}
                disabled={withdrawingTask}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {withdrawingTask ? <Loader2 className="animate-spin" size={18} /> : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Form Overlay */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1c1c1c] w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-black/5 dark:border-white/10 flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-4 duration-300">
            <div className="p-6 border-b border-black/5 dark:border-white/5 flex items-center justify-between bg-[#141414] dark:bg-black text-white">
              <h3 className="text-lg font-bold">Edit Request</h3>
              <button onClick={() => setIsEditing(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-2">Request Title</label>
                <input 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-2">Description</label>
                <textarea 
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white h-32 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-2">Brand</label>
                  <select 
                    value={editBrand}
                    onChange={(e) => setEditBrand(e.target.value as any)}
                    className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="STLAF">STLAF</option>
                    <option value="STLAF-G">STLAF-G</option>
                    <option value="STLAF-S">STLAF-S</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-2">Priority</label>
                  <select 
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-2">Date Needed</label>
                <input 
                  type="date"
                  value={editDateNeeded}
                  onChange={(e) => setEditDateNeeded(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-2">External Link</label>
                <input 
                  value={editAttachmentLink}
                  onChange={(e) => setEditAttachmentLink(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
                />
              </div>
            </div>
            <div className="p-6 border-t border-black/5 dark:border-white/5 flex space-x-3">
              <button 
                onClick={() => setIsEditing(false)}
                className="flex-1 px-4 py-3 bg-black/5 dark:bg-white/5 text-gray-600 dark:text-white/60 rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                {savingEdit ? <Loader2 className="animate-spin" size={18} /> : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div 
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4 sm:p-12 animate-in fade-in duration-200"
          onClick={() => setLightboxUrl(null)}
        >
          <button 
            className="absolute top-6 right-6 p-3 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            onClick={() => setLightboxUrl(null)}
          >
            <X size={24} />
          </button>
          <img 
            src={lightboxUrl} 
            alt="Lightbox" 
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
            referrerPolicy="no-referrer"
          />
        </div>
      )}
    </div>
  );
}
