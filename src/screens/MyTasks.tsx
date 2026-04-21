import { useState, useEffect, useMemo } from 'react';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '../hooks/useAuth';
import { format, isValid } from 'date-fns';
import { Upload, CheckCircle, AlertTriangle, FileText, ExternalLink, Eye, LayoutGrid } from 'lucide-react';
import { RequestStatus, MarketingRequest, UserProfile } from '../types';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { getDeadlineStatus, getDeadlineColorClass, getDeadlineBadgeClass } from '../utils/dateUtils';
import FilterBar, { FilterState } from '../components/FilterBar';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function MyTasks() {
  const { profile } = useAuth();
  const { requests, loading, updateRequest } = useRequests();
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [deliverableLink, setDeliverableLink] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  const myTasks = useMemo(() => {
    return requests.filter(r => r.assignedTo === profile?.uid && r.status !== 'Completed');
  }, [requests, profile]);

  const filteredTasks = useMemo(() => {
    return myTasks.filter(req => {
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
  }, [myTasks, filters]);

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

  if (loading) return <div className="text-center py-12 text-black/40">Loading your tasks...</div>;

  const handleStatusChange = async (id: string, status: RequestStatus) => {
    await updateRequest(id, { status });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0] || null;
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (!allowedTypes.includes(selectedFile.type)) {
        setError('Only PDF, JPG, and PNG files are allowed for direct upload.');
        setFile(null);
        return;
      }

      if (selectedFile.size > maxSize) {
        setError('File size exceeds 10MB. Please provide a link to the finished file instead.');
        setFile(null);
        return;
      }

      setError(null);
      setFile(selectedFile);
    }
  };

  const handleUploadDeliverable = async (id: string) => {
    if (!file && !deliverableLink) {
      setError('Please upload a file or provide a link to your work.');
      return;
    }

    setUploadingId(id);
    try {
      await updateRequest(id, { 
        status: 'For Review',
        deliverableLink: deliverableLink 
      }, file || undefined);
      setFile(null);
      setDeliverableLink('');
      setUploadingId(null);
      setError(null);
    } catch (error) {
      console.error(error);
      setUploadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-600 dark:text-white/40 flex items-center space-x-2">
          <LayoutGrid size={14} />
          <span>Assigned to You</span>
        </h3>
      </div>

      <FilterBar 
        filters={filters} 
        setFilters={setFilters} 
        resultCount={filteredTasks.length} 
        totalCount={myTasks.length}
        members={teamMembers}
      />

      {filteredTasks.length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-2xl p-12 text-center border border-black/5 dark:border-white/5">
          <CheckCircle className="mx-auto text-green-500 dark:text-green-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-[#141414] dark:text-white">
            {myTasks.length === 0 ? "You're all caught up!" : "No tasks match your filters"}
          </h3>
          <p className="text-black/50 dark:text-white/50">
            {myTasks.length === 0 ? "No active tasks assigned to you at the moment." : "Try adjusting your filters to find what you're looking for."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTasks.map((task) => (
            <div 
              key={task.id} 
              className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden flex flex-col md:flex-row hover:shadow-md transition-all group"
            >
              <div 
                className="p-8 flex-1 cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      task.status === 'Revision Needed' ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                      {task.status}
                    </span>
                    <span className="text-xs text-black/30 dark:text-white/30 font-medium">{task.requestId}</span>
                  </div>
                  {task.tatAcknowledged && (
                    <div className="flex items-center space-x-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/50">
                      <AlertTriangle size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">TAT Conflict</span>
                    </div>
                  )}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-2 text-blue-600 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">
                    <Eye size={14} />
                    <span>View Details</span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-[#141414] dark:text-white mb-2">{task.requestTitle}</h3>
                <p className="text-sm text-black/60 dark:text-white/60 mb-6 line-clamp-2">{task.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Department</p>
                    <p className="text-sm font-semibold dark:text-white">{task.department}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Brand</p>
                    <p className="text-sm font-semibold dark:text-white">{task.brand}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Priority</p>
                    <p className={`text-sm font-semibold ${task.priority === 'Urgent' ? 'text-red-500 dark:text-red-400' : 'dark:text-white'}`}>{task.priority}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Deadline</p>
                    <div className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full space-x-1 mt-1 ${getDeadlineBadgeClass(getDeadlineStatus(task.dateNeeded, task.status))}`}>
                      <span>{safeFormat(task.dateNeeded, 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>

                {task.revisionNotes && (
                  <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-100 dark:border-red-900/30">
                    <div className="flex items-center space-x-2 text-red-600 dark:text-red-400 mb-1">
                      <AlertTriangle size={14} />
                      <span className="text-xs font-bold uppercase tracking-wider">Revision Notes</span>
                    </div>
                    <p className="text-sm text-red-800 dark:text-red-200">{task.revisionNotes}</p>
                  </div>
                )}

                {task.requestAttachmentUrl && (
                  <div className="mt-6">
                    <a 
                      href={task.requestAttachmentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <FileText size={14} />
                      <span>View Request Attachment</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              <div className="bg-[#F5F5F4] dark:bg-white/5 w-full md:w-80 p-8 border-t md:border-t-0 md:border-l border-black/5 dark:border-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-4">Update Progress</h4>
                  <div className="space-y-3">
                    {task.status === 'Assigned' && (
                      <button
                        onClick={() => handleStatusChange(task.id, 'In Progress')}
                        className="w-full py-3 bg-white dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all dark:text-white"
                      >
                        Start Working
                      </button>
                    )}
                    
                    {(task.status === 'In Progress' || task.status === 'Revision Needed') && (
                      <div className="space-y-4">
                        <div className="relative">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-black/10 dark:border-white/10 rounded-2xl cursor-pointer hover:bg-white dark:hover:bg-white/10 transition-all">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="text-black/30 dark:text-white/30 mb-2" size={24} />
                              <p className="text-xs text-black/40 dark:text-white/40 font-medium">
                                {file ? file.name : 'Upload Deliverable'}
                              </p>
                              <p className="text-[10px] text-black/30 dark:text-white/30 mt-1">PDF, JPG, PNG (Max 10MB)</p>
                            </div>
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={handleFileChange} />
                          </label>
                        </div>

                        <div className="space-y-1">
                          <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest">Or provide a Link to finished file</p>
                          <input
                            type="url"
                            placeholder="https://..."
                            value={deliverableLink}
                            onChange={(e) => setDeliverableLink(e.target.value)}
                            className="w-full bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 dark:text-white"
                          />
                        </div>

                        {error && (
                          <p className="text-xs text-red-500 font-medium">{error}</p>
                        )}

                        <button
                          disabled={(!file && !deliverableLink) || uploadingId === task.id}
                          onClick={() => handleUploadDeliverable(task.id)}
                          className="w-full py-4 bg-[#141414] dark:bg-white dark:text-black text-white rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-white/90 transition-all disabled:opacity-50"
                        >
                          {uploadingId === task.id ? 'Uploading...' : 'Submit for Review'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {selectedTask && (
        <TaskDetailsModal 
          task={selectedTask} 
          onClose={() => setSelectedTask(null)} 
          onUpdate={updateRequest}
        />
      )}
    </div>
  );
}
