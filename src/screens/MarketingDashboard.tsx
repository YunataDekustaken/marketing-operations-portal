import React, { useState, useEffect, useMemo } from 'react';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '../hooks/useAuth';
import { MarketingRequest, RequestStatus, UserProfile, Brand, RequestType, Priority, Department } from '../types';
import { format, differenceInHours, isValid, parseISO } from 'date-fns';
import { User, ChevronRight, MoreVertical, Download, ExternalLink, Plus, Trash2, Clock, MessageSquare, AlertCircle, Eye, BarChart3, AlertTriangle, Upload, X, Loader2, Calendar, LayoutGrid, List } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, storage } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { getDeadlineStatus, getDeadlineBadgeClass } from '../utils/dateUtils';
import FilterBar, { FilterState } from '../components/FilterBar';
import KanbanBoard from '../components/KanbanBoard';
import { exportToCSV } from '../utils/exportUtils';
import { useToast } from '../components/ToastProvider';

export default function MarketingDashboard() {
  const { profile } = useAuth();
  const isSupervisor = profile?.role === 'marketing_supervisor';
  const { requests, loading, updateRequest, deleteRequest, createRequest } = useRequests();
  const { addToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);
  const [selectedTask, setSelectedTask] = useState<MarketingRequest | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // View Mode
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>(() => {
    return (localStorage.getItem('marketingDashboardViewMode') as 'list' | 'kanban') || 'list';
  });

  useEffect(() => {
    localStorage.setItem('marketingDashboardViewMode', viewMode);
  }, [viewMode]);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: '',
    priority: '',
    brand: '',
    department: '',
    assignedTo: ''
  });

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch = !filters.search || 
        req.requestTitle.toLowerCase().includes(searchLower) ||
        req.requestId.toLowerCase().includes(searchLower) ||
        req.requestorName.toLowerCase().includes(searchLower) ||
        req.description.toLowerCase().includes(searchLower);
        
      const matchesStatus = !filters.status || req.status === filters.status;
      const matchesPriority = !filters.priority || req.priority === filters.priority;
      const matchesBrand = !filters.brand || req.brand === filters.brand;
      const matchesDepartment = !filters.department || req.department === filters.department;
      const matchesAssignedTo = !filters.assignedTo || req.assignedTo === filters.assignedTo;

      return matchesSearch && matchesStatus && matchesPriority && matchesBrand && matchesDepartment && matchesAssignedTo;
    });
  }, [requests, filters]);

  const handleExportCSV = () => {
    exportToCSV(filteredRequests, `marketing-requests-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    addToast('success', 'Exported to CSV successfully');
  };

  // Create Task Form State
  const [newTask, setNewTask] = useState({
    requestTitle: '',
    requestorName: '',
    description: '',
    brand: 'STLAF' as Brand,
    requestType: 'Graphic Design' as RequestType,
    priority: 'Normal' as Priority,
    dateNeeded: format(new Date(), 'yyyy-MM-dd'),
    assignedTo: 'Unassigned',
  });

  useEffect(() => {
    const handleOpenTask = (e: any) => {
      const requestId = e.detail.requestId;
      const task = requests.find(r => r.id === requestId);
      if (task) {
        setSelectedTask(task);
      }
    };

    // Check for taskId in URL on mount or when requests change
    const urlParams = new URLSearchParams(window.location.search);
    const taskId = urlParams.get('taskId');
    if (taskId && requests.length > 0) {
      const task = requests.find(r => r.id === taskId);
      if (task) {
        setSelectedTask(task);
        // Clear the param so it doesn't reopen on refresh if closed
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete('taskId');
        window.history.replaceState({}, '', newUrl);
      }
    }

    window.addEventListener('open-task', handleOpenTask);
    return () => window.removeEventListener('open-task', handleOpenTask);
  }, [requests]);

  useEffect(() => {
    const fetchTeam = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'marketing_member'));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => doc.data() as UserProfile);
      setTeamMembers(members);
    };
    fetchTeam();
  }, []);

  const handleDuplicate = (task: MarketingRequest) => {
    setSelectedTask(null);
    window.dispatchEvent(new CustomEvent('duplicate-request', { detail: task }));
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'submit' }));
  };

  if (loading) return <div className="text-center py-12 text-black/40">Loading dashboard...</div>;

  // Analytics Calculations
  const completedTasks = requests.filter(r => r.status === 'Completed');
  
  const teamStats = teamMembers.map(member => {
    const memberTasks = requests.filter(r => r.assignedTo === member.uid);
    const memberCompleted = memberTasks.filter(r => r.status === 'Completed');
    
    const totalTAT = memberCompleted.reduce((acc, r) => {
      if (r.completedAt && r.dateRequested) {
        try {
          const completedDate = r.completedAt.toDate ? r.completedAt.toDate() : new Date(r.completedAt);
          const requestedDate = r.dateRequested.toDate ? r.dateRequested.toDate() : new Date(r.dateRequested);
          
          if (isValid(completedDate) && isValid(requestedDate)) {
            return acc + differenceInHours(completedDate, requestedDate);
          }
        } catch (e) {
          console.error("Error calculating TAT:", e);
        }
      }
      return acc;
    }, 0);

    const totalRevisions = memberTasks.reduce((acc, r) => acc + (r.revisionCount || 0), 0);

    return {
      ...member,
      avgTAT: memberCompleted.length > 0 ? (totalTAT / memberCompleted.length).toFixed(1) : '0',
      avgRevisions: memberTasks.length > 0 ? (totalRevisions / memberTasks.length).toFixed(1) : '0',
      completedCount: memberCompleted.length,
      activeCount: memberTasks.length - memberCompleted.length
    };
  });

  const handleAssign = async (id: string, memberUid: string, memberName: string) => {
    await updateRequest(id, { assignedTo: memberUid, assignedToName: memberName, status: 'Assigned' });
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (deleteInput === 'DELETE') {
      await deleteRequest(id);
      setShowDeleteConfirm(null);
      setDeleteInput('');
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      let attachmentUrl = '';
      let attachmentName = '';

      if (mediaFile) {
        const storageRef = ref(storage, `requests/${Date.now()}_${mediaFile.name}`);
        await uploadBytes(storageRef, mediaFile);
        attachmentUrl = await getDownloadURL(storageRef);
        attachmentName = mediaFile.name;
      }

      const assignedMember = teamMembers.find(m => m.uid === newTask.assignedTo);
      
      const status: RequestStatus = newTask.assignedTo === 'Unassigned' ? 'Pending' : 'Assigned';

      const docRef = await createRequest({
        ...newTask,
        assignedToName: assignedMember?.displayName || 'Unassigned',
        status,
        requestAttachmentUrl: attachmentUrl,
        requestAttachmentName: attachmentName,
      });

      setShowCreateModal(false);
      setNewTask({
        requestTitle: '',
        requestorName: '',
        description: '',
        brand: 'STLAF',
        requestType: 'Graphic Design',
        priority: 'Normal',
        dateNeeded: format(new Date(), 'yyyy-MM-dd'),
        assignedTo: 'Unassigned',
      });
      setMediaFile(null);
      setMediaPreview(null);
    } catch (err) {
      console.error("Error creating task:", err);
      setError("Failed to create task. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const safeFormat = (dateStr: string | undefined, formatStr: string) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      if (!isValid(date)) return 'Invalid Date';
      return format(date, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  const sections: { title: string; status: RequestStatus }[] = [
    { title: 'Pending Requests', status: 'Pending' },
    { title: 'Assigned Tasks', status: 'Assigned' },
    { title: 'In Progress', status: 'In Progress' },
    { title: 'For Review', status: 'For Review' },
    { title: 'Completed', status: 'Completed' },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* Header & Create Button */}
      <div className="flex flex-col sm:items-center sm:flex-row justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] dark:text-white">Marketing Overview</h1>
          <p className="text-gray-600 dark:text-white/50 text-sm">Manage team workload and track performance.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={handleExportCSV}
            className="flex items-center justify-center space-x-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 px-4 py-3 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm w-full sm:w-auto"
          >
            <Download size={18} />
            <span>Export CSV</span>
          </button>
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center space-x-2 bg-[#141414] dark:bg-white dark:text-black text-white px-6 py-3 rounded-xl font-bold hover:bg-black dark:hover:bg-white/90 transition-all shadow-lg w-full sm:w-auto"
          >
            <Plus size={18} />
            <span>Create New Task</span>
          </button>
        </div>
      </div>

      {/* Team Analytics */}
      {isSupervisor && (
        <section>
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-white/40 mb-6 flex items-center space-x-2">
            <BarChart3 size={14} />
            <span>Team Performance</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {teamStats.map(stat => (
              <div key={stat.uid} className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center font-bold text-gray-500 dark:text-white/40">
                    {stat.displayName.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white/80">{stat.displayName}</p>
                    <p className="text-[10px] text-gray-500 dark:text-white/40 uppercase tracking-widest">{stat.activeCount} Active Tasks</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-1">Avg. TAT</p>
                    <p className="text-sm font-bold dark:text-white">{stat.avgTAT}h</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 dark:text-white/30 uppercase tracking-widest mb-1">Avg. Revisions</p>
                    <p className="text-sm font-bold dark:text-white">{stat.avgRevisions}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Filters and View Toggle */}
      <section>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-white/40 flex items-center space-x-2">
            <LayoutGrid size={14} />
            <span>Task Management</span>
          </h3>
          <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <List size={16} />
              <span>List</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'kanban' 
                  ? 'bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              <LayoutGrid size={16} />
              <span>Kanban</span>
            </button>
          </div>
        </div>

        <FilterBar 
          filters={filters} 
          setFilters={setFilters} 
          resultCount={filteredRequests.length} 
          totalCount={requests.length}
          members={teamMembers}
        />

        {viewMode === 'kanban' ? (
          <KanbanBoard 
            requests={filteredRequests} 
            onCardClick={setSelectedTask}
          />
        ) : (
          <div className="space-y-12 mt-8">
            {/* Task Sections */}
            {sections.map((section) => {
              let sectionRequests = filteredRequests.filter(r => r.status === section.status);
              
              // Problem 2: Include Revision Needed tasks in Pending Requests section
              if (section.status === 'Pending') {
                const revisionNeededRequests = filteredRequests.filter(r => r.status === 'Revision Needed' && (r.assignedTo === 'Unassigned' || !r.assignedTo));
                sectionRequests = [...sectionRequests, ...revisionNeededRequests];
              }

              // Include assigned Revision Needed tasks in Assigned Tasks section
              if (section.status === 'Assigned') {
                const assignedRevisionRequests = filteredRequests.filter(r => r.status === 'Revision Needed' && r.assignedTo !== 'Unassigned' && r.assignedTo);
                sectionRequests = [...sectionRequests, ...assignedRevisionRequests];
              }
              
              return (
                <section key={section.status}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-600 dark:text-white/40 flex items-center space-x-2">
                <span>{section.title}</span>
                <span className="bg-black/5 dark:bg-white/10 text-gray-500 dark:text-white/40 px-2 py-0.5 rounded-full text-[10px]">{sectionRequests.length}</span>
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {sectionRequests.length === 0 ? (
                <div className="col-span-full py-8 border-2 border-dashed border-black/5 dark:border-white/5 rounded-2xl flex items-center justify-center text-gray-400 dark:text-white/30 text-sm italic">
                  No tasks in this stage
                </div>
              ) : (
                sectionRequests.map((request) => (
                  <div key={request.id} className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all group relative overflow-hidden flex flex-col">
                    <div 
                      className="p-6 flex-1 cursor-pointer"
                      onClick={() => setSelectedTask(request)}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            request.priority === 'Urgent' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-black/5 dark:bg-white/10 text-gray-500 dark:text-white/40'
                          }`}>
                            {request.priority}
                          </span>
                          <h4 className="font-bold text-[#141414] dark:text-white mt-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{request.requestTitle}</h4>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center text-xs text-gray-600 dark:text-white/50 space-x-2">
                          <User size={14} />
                          <span className="truncate">{request.department} • {request.requestorName || 'N/A'}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-600 dark:text-white/50 space-x-2">
                          <User size={14} />
                          <span className="truncate">Assigned to: {request.assignedToName}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Calendar size={14} className="text-gray-400 dark:text-white/30" />
                          <div className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full space-x-1 ${getDeadlineBadgeClass(getDeadlineStatus(request.dateNeeded, request.status))}`}>
                            <span>Due {safeFormat(request.dateNeeded, 'MMM d')}</span>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center text-[10px] text-gray-500 dark:text-white/30 space-x-1">
                            <Clock size={12} />
                            <span>
                              {(() => {
                                try {
                                  const date = request.dateRequested?.toDate ? request.dateRequested.toDate() : new Date(request.dateRequested);
                                  return isValid(date) ? `${differenceInHours(new Date(), date)}h ago` : 'N/A';
                                } catch (e) {
                                  return 'N/A';
                                }
                              })()}
                            </span>
                          </div>
                          <div className="flex items-center text-[10px] text-gray-500 dark:text-white/30 space-x-1">
                            <MessageSquare size={12} />
                            <span>{request.revisionCount || 0} revs</span>
                          </div>
                          {request.tatAcknowledged && (
                            <div className="flex items-center text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider space-x-1">
                              <AlertTriangle size={12} />
                              <span>TAT Conflict</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-4 bg-[#F5F5F4] dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <p className="text-[10px] font-medium text-gray-500 dark:text-white/30">{request.requestId}</p>
                        {request.deliverableFileUrl && <Download size={12} className="text-blue-500 dark:text-blue-400" />}
                        {request.deliverableLink && <ExternalLink size={12} className="text-indigo-500 dark:text-indigo-400" />}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(editingId === request.id ? null : request.id);
                          }}
                          className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors"
                        >
                          <MoreVertical size={16} className="text-gray-600 dark:text-white/40" />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(request.id);
                          }}
                          className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 dark:text-white/20 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Assignment Dropdown */}
                      {editingId === request.id && (
                        <div className="absolute right-6 bottom-16 w-48 bg-white dark:bg-[#1A1A1A] border border-black/5 dark:border-white/10 rounded-xl shadow-2xl z-20 p-2 animate-in fade-in slide-in-from-bottom-2">
                          <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase px-3 py-1">Assign To</p>
                          {teamMembers.map(member => (
                            <button
                              key={member.uid}
                              onClick={() => handleAssign(request.id, member.uid, member.displayName)}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/10 rounded-lg transition-colors dark:text-white"
                            >
                              {member.displayName}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        );
      })}
          </div>
        )}
      </section>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
            <div className="p-5 sm:p-6 bg-[#141414] dark:bg-black text-white flex items-center justify-between shrink-0">
              <h2 className="text-lg sm:text-xl font-bold">Create New Task</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <Plus className="rotate-45" size={24} />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="p-5 sm:p-8 space-y-6 overflow-y-auto flex-1">
              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center space-x-3 text-red-600 dark:text-red-400">
                  <AlertCircle size={18} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Task Title</label>
                    <input
                      required
                      value={newTask.requestTitle}
                      onChange={e => setNewTask({...newTask, requestTitle: e.target.value})}
                      className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                      placeholder="e.g. Social Media Banner"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Requestor Name</label>
                    <input
                      required
                      value={newTask.requestorName}
                      onChange={e => setNewTask({...newTask, requestorName: e.target.value})}
                      className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                      placeholder="Name of requestor"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Description</label>
                  <textarea
                    required
                    value={newTask.description}
                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                    className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 h-24 text-black dark:text-white"
                    placeholder="Provide details about the task..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Brand</label>
                    <select
                      value={newTask.brand}
                      onChange={e => setNewTask({...newTask, brand: e.target.value as Brand})}
                      className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                    >
                      <option value="STLAF">STLAF</option>
                      <option value="MassagedailyPH">MassagedailyPH</option>
                      <option value="LuxeLounge">LuxeLounge</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Type</label>
                    <select
                      value={newTask.requestType}
                      onChange={e => setNewTask({...newTask, requestType: e.target.value as RequestType})}
                      className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                    >
                      <option value="Graphic Design">Graphic Design</option>
                      <option value="Photo/Video Editing">Photo/Video Editing</option>
                      <option value="Social Media Content">Social Media Content</option>
                      <option value="Marketing Collateral">Marketing Collateral</option>
                      <option value="Website / Digital">Website / Digital</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={e => setNewTask({...newTask, priority: e.target.value as Priority})}
                      className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                    >
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="Urgent">Urgent</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Deadline</label>
                    <input
                      type="date"
                      required
                      value={newTask.dateNeeded}
                      onChange={e => setNewTask({...newTask, dateNeeded: e.target.value})}
                      className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Assign To</label>
                  <select
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                    className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 text-black dark:text-white"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {teamMembers.map(m => (
                      <option key={m.uid} value={m.uid}>{m.displayName}</option>
                    ))}
                  </select>
                </div>

                {/* File Upload */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-900 dark:text-white/30 uppercase tracking-widest mb-1">Attachment (Optional)</label>
                  <div className="relative group">
                    {mediaPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-black/10 dark:border-white/10 aspect-video bg-black/5">
                        <img src={mediaPreview} className="w-full h-full object-contain" alt="Preview" />
                        <button 
                          type="button"
                          onClick={() => {
                            setMediaFile(null);
                            setMediaPreview(null);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 text-white rounded-full hover:bg-black transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full py-6 border-2 border-dashed border-black/10 dark:border-white/10 rounded-xl hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer bg-white dark:bg-white/5">
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-6 h-6 text-black/20 dark:text-white/20 mb-2" />
                          <p className="text-[10px] text-black/40 dark:text-white/40 font-bold uppercase tracking-widest">Click to upload</p>
                        </div>
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setMediaFile(file);
                              setMediaPreview(URL.createObjectURL(file));
                            }
                          }} 
                          accept="image/*,video/*" 
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>
              <div className="pt-4 shrink-0 p-5 sm:p-8 border-t border-black/5 dark:border-white/5 bg-gray-50 dark:bg-black/20">
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full py-4 bg-[#141414] dark:bg-white dark:text-black text-white rounded-xl font-bold hover:bg-black dark:hover:bg-white/90 transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
                >
                  {isSubmitting && <Loader2 className="animate-spin" size={18} />}
                  <span>{isSubmitting ? 'Creating...' : 'Create & Assign Task'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-[#1A1A1A] w-full max-w-md rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400 mb-4">
              <AlertCircle size={24} />
              <h2 className="text-xl font-bold">Delete Task?</h2>
            </div>
            <p className="text-black/60 dark:text-white/60 text-sm mb-6">
              This action is permanent and cannot be undone. All files and data associated with this task will be lost.
            </p>
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest">Type <span className="text-red-600 dark:text-red-400">DELETE</span> to confirm</p>
              <input
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                className="w-full bg-[#F5F5F4] dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500/20 dark:text-white"
                placeholder="DELETE"
              />
              <div className="flex space-x-3 pt-2">
                <button 
                  onClick={() => {
                    setShowDeleteConfirm(null);
                    setDeleteInput('');
                  }}
                  className="flex-1 py-3 bg-black/5 dark:bg-white/10 text-black/60 dark:text-white/60 rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/20 transition-all"
                >
                  Cancel
                </button>
                <button 
                  disabled={deleteInput !== 'DELETE'}
                  onClick={() => handleDelete(showDeleteConfirm)}
                  className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={updateRequest}
          onDuplicate={handleDuplicate}
        />
      )}
    </div>
  );
}
