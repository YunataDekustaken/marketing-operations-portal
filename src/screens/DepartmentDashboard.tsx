import React, { useState, useMemo, useEffect } from 'react';
import { useRequests } from '../hooks/useRequests';
import { Clock, CheckCircle2, AlertCircle, Download, ExternalLink, Eye, Calendar, Tag, User, LayoutGrid } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { MarketingRequest, UserProfile } from '../types';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { getDeadlineStatus, getDeadlineColorClass, getDeadlineBadgeClass } from '../utils/dateUtils';
import FilterBar, { FilterState } from '../components/FilterBar';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function DepartmentDashboard() {
  const { requests, loading, updateRequest } = useRequests();
  const [selectedTask, setSelectedTask] = useState<MarketingRequest | null>(null);
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchTeamMembers = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'marketing'));
        const querySnapshot = await getDocs(q);
        const members = querySnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
        setTeamMembers(members);
      } catch (err) {
        console.error("Error fetching team members:", err);
      }
    };
    fetchTeamMembers();
  }, []);

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

  React.useEffect(() => {
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

  const safeFormat = (dateInput: any, formatStr: string) => {
    if (!dateInput) return 'N/A';
    try {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      if (!isValid(date)) return 'N/A';
      return format(date, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  const handleDuplicate = (task: MarketingRequest) => {
    setSelectedTask(null);
    window.dispatchEvent(new CustomEvent('duplicate-request', { detail: task }));
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'submit' }));
  };

  if (loading) return <div className="text-center py-12 text-black/40">Loading requests...</div>;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'Assigned': return 'bg-blue-100 text-blue-700';
      case 'In Progress': return 'bg-indigo-100 text-indigo-700';
      case 'For Review': return 'bg-purple-100 text-purple-700';
      case 'Revision Needed': return 'bg-red-100 text-red-700';
      case 'Completed': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-white/30">Active Requests</span>
            <Clock className="text-blue-500 dark:text-blue-400" size={20} />
          </div>
          <p className="text-3xl font-bold dark:text-white">{requests.filter(r => r.status !== 'Completed').length}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-white/30">Completed</span>
            <CheckCircle2 className="text-green-500 dark:text-green-400" size={20} />
          </div>
          <p className="text-3xl font-bold dark:text-white">{requests.filter(r => r.status === 'Completed').length}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 dark:text-white/30">Urgent</span>
            <AlertCircle className="text-red-500 dark:text-red-400" size={20} />
          </div>
          <p className="text-3xl font-bold dark:text-white">{requests.filter(r => r.priority === 'Urgent' && r.status !== 'Completed').length}</p>
        </div>
      </div>

      {/* Requests Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-white/40 flex items-center space-x-2">
            <LayoutGrid size={14} />
            <span>Your Requests</span>
          </h3>
        </div>

        <FilterBar 
          filters={filters} 
          setFilters={setFilters} 
          resultCount={filteredRequests.length} 
          totalCount={requests.length}
          members={teamMembers}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRequests.length === 0 ? (
            <div className="col-span-full py-12 border-2 border-dashed border-black/5 dark:border-white/5 rounded-3xl flex flex-col items-center justify-center text-gray-400 dark:text-white/30">
              <p className="text-sm font-medium">No requests found</p>
              <p className="text-xs">Try adjusting your filters or submit a new request.</p>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div 
                key={request.id} 
                className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm hover:shadow-md transition-all group cursor-pointer overflow-hidden flex flex-col"
                onClick={() => setSelectedTask(request)}
              >
                <div className="p-6 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <Eye size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>

                  <h4 className="font-bold text-[#141414] dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">{request.requestTitle}</h4>
                  <p className="text-[10px] text-gray-500 dark:text-white/40 uppercase tracking-widest mb-4">{request.requestId} • {request.brand}</p>

                  {/* Mini Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-[8px] font-bold text-gray-400 dark:text-white/20 uppercase tracking-widest mb-1">
                      <span>Progress</span>
                      <span>
                        {request.status === 'Completed' ? '100%' : 
                         request.status === 'For Review' ? '80%' :
                         request.status === 'In Progress' ? '60%' :
                         request.status === 'Assigned' ? '40%' : '20%'}
                      </span>
                    </div>
                    <div className="h-1 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-500 ${
                          request.status === 'Completed' ? 'bg-green-500' :
                          request.status === 'Revision Needed' ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ 
                          width: request.status === 'Completed' ? '100%' : 
                                 request.status === 'For Review' ? '80%' :
                                 request.status === 'In Progress' ? '60%' :
                                 request.status === 'Assigned' ? '40%' : '20%'
                        }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-2">
                      <div className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full space-x-1 ${getDeadlineBadgeClass(getDeadlineStatus(request.dateNeeded, request.status))}`}>
                        <Calendar size={10} />
                        <span>Due {safeFormat(request.dateNeeded, 'MMM d, yyyy')}</span>
                      </div>
                      
                      {request.estimatedCompletionDate && request.status !== 'Completed' && (
                        <div className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full space-x-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">
                          <Clock size={10} />
                          <span>Est. {safeFormat(request.estimatedCompletionDate, 'MMM d')}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex items-center text-xs text-gray-600 dark:text-white/50 space-x-2">
                      <Tag size={14} />
                      <span>{request.requestType}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600 dark:text-white/50 space-x-2">
                      <User size={14} />
                      <span>Requestor: {request.requestorName || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {request.status === 'Completed' ? (
                  <div className="px-6 py-4 bg-green-50 dark:bg-green-900/10 border-t border-green-100 dark:border-green-900/20">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center text-green-600 dark:text-green-400 text-[10px] font-bold uppercase tracking-widest">
                        <CheckCircle2 size={14} className="mr-1.5" />
                        <span>Completed {request.completedAt ? safeFormat(request.completedAt, 'MMM d') : ''}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {request.deliverableFileUrl && (
                        <a 
                          href={request.deliverableFileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <Download size={12} />
                          <span>Download</span>
                        </a>
                      )}
                      {request.deliverableLink && (
                        <a 
                          href={request.deliverableLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-bold py-2 rounded-lg flex items-center justify-center space-x-1.5 transition-colors"
                        >
                          <ExternalLink size={12} />
                          <span>View Link</span>
                        </a>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="px-6 py-4 bg-[#F5F5F4] dark:bg-white/5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {request.deliverableFileUrl && <Download size={14} className="text-blue-500 dark:text-blue-400" />}
                      {request.deliverableLink && <ExternalLink size={14} className="text-indigo-500 dark:text-indigo-400" />}
                      {!request.deliverableFileUrl && !request.deliverableLink && <span className="text-[10px] text-gray-400 dark:text-white/30 italic">In Progress</span>}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${request.priority === 'Urgent' ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-white/30'}`}>
                      {request.priority}
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

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
