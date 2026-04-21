import React, { useState, useEffect } from 'react';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '../hooks/useAuth';
import { format, differenceInHours, isValid } from 'date-fns';
import { Plus, CheckCircle2, AlertCircle, Clock, FileText, ChevronRight } from 'lucide-react';
import TaskDetailsModal from '../components/TaskDetailsModal';
import { MarketingRequest } from '../types';

export default function DepartmentHome() {
  const { requests, loading, updateRequest } = useRequests();
  const { user } = useAuth();
  const [selectedTask, setSelectedTask] = useState<MarketingRequest | null>(null);

  useEffect(() => {
    const handleOpenTask = (e: any) => {
      const requestId = e.detail.requestId;
      const task = requests.find(r => r.id === requestId);
      if (task) {
        setSelectedTask(task);
      }
    };

    window.addEventListener('open-task', handleOpenTask);
    return () => window.removeEventListener('open-task', handleOpenTask);
  }, [requests]);

  const handleDuplicate = (task: MarketingRequest) => {
    setSelectedTask(null);
    window.dispatchEvent(new CustomEvent('duplicate-request', { detail: task }));
    window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'submit' }));
  };

  if (loading) return <div className="text-center py-12 text-black/40">Loading dashboard...</div>;

  const myRequests = requests.filter(r => r.requestedBy === user?.uid);
  const activeRequests = myRequests.filter(r => ['Pending', 'Assigned', 'In Progress'].includes(r.status));
  const completedRequests = myRequests.filter(r => r.status === 'Completed');
  const needsRevisionRequests = myRequests.filter(r => r.status === 'Revision Needed');
  const forReviewRequests = myRequests.filter(r => r.status === 'For Review');

  const recentRequests = [...myRequests]
    .sort((a, b) => {
      const dateA = a.dateRequested?.toDate ? a.dateRequested.toDate() : new Date(a.dateRequested);
      const dateB = b.dateRequested?.toDate ? b.dateRequested.toDate() : new Date(b.dateRequested);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 4);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-emerald-500';
      case 'Revision Needed': return 'bg-rose-500';
      case 'For Review': return 'bg-purple-500';
      case 'In Progress': return 'bg-amber-500';
      case 'Assigned': return 'bg-blue-500';
      default: return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Hero Banner */}
      <div className="bg-[#141414] dark:bg-black rounded-3xl p-8 sm:p-10 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              {getGreeting()}, {user?.displayName?.split(' ')[0] || 'User'}
            </h1>
            <p className="text-white/60 text-lg">
              {forReviewRequests.length > 0 
                ? `You have ${forReviewRequests.length} request${forReviewRequests.length === 1 ? '' : 's'} awaiting your approval.`
                : activeRequests.length > 0
                  ? `You have ${activeRequests.length} active request${activeRequests.length === 1 ? '' : 's'} in progress.`
                  : "Ready to start a new marketing project?"}
            </p>
          </div>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'submit' }))}
            className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-white/90 transition-all shadow-lg flex items-center space-x-2 shrink-0"
          >
            <Plus size={20} />
            <span>New Request</span>
          </button>
        </div>
      </div>

      {/* Smart Alert Banners */}
      <div className="space-y-3">
        {forReviewRequests.length > 0 && (
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'my-requests' }))}
            className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            <div className="flex items-center space-x-3 text-emerald-800 dark:text-emerald-400">
              <CheckCircle2 size={20} className="shrink-0" />
              <span className="font-medium">You have {forReviewRequests.length} completed task{forReviewRequests.length === 1 ? '' : 's'} awaiting your review.</span>
            </div>
            <ChevronRight size={20} className="text-emerald-600 dark:text-emerald-500" />
          </div>
        )}

        {needsRevisionRequests.length > 0 && (
          <div 
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'my-requests' }))}
            className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
          >
            <div className="flex items-center space-x-3 text-amber-800 dark:text-amber-400">
              <AlertCircle size={20} className="shrink-0" />
              <span className="font-medium">You have {needsRevisionRequests.length} task{needsRevisionRequests.length === 1 ? '' : 's'} that need revision.</span>
            </div>
            <ChevronRight size={20} className="text-amber-600 dark:text-amber-500" />
          </div>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Clock size={16} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Active</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{activeRequests.length}</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 size={16} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{completedRequests.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <AlertCircle size={16} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Needs Revision</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{needsRevisionRequests.length}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
              <FileText size={16} />
            </div>
            <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Total</span>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{myRequests.length}</p>
        </div>
      </div>

      {/* Recent Requests */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">Recent Requests</h2>
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'my-requests' }))}
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            View All
          </button>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {recentRequests.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              You haven't submitted any requests yet.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentRequests.map(request => (
                <div 
                  key={request.id}
                  onClick={() => setSelectedTask(request)}
                  className="p-4 sm:p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer flex items-center justify-between group"
                >
                  <div className="flex items-center space-x-4">
                    <div className="relative flex items-center justify-center w-3 h-3">
                      {request.status === 'In Progress' && (
                        <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75 animate-ping"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${getStatusColor(request.status)}`}></span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                        {request.requestTitle}
                      </h3>
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 mt-1 space-x-2">
                        <span>{request.requestId}</span>
                        <span>•</span>
                        <span>{request.requestType}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline-block">
                      {(() => {
                        try {
                          const date = request.dateRequested?.toDate ? request.dateRequested.toDate() : new Date(request.dateRequested);
                          return isValid(date) ? `${differenceInHours(new Date(), date)}h ago` : 'N/A';
                        } catch (e) {
                          return 'N/A';
                        }
                      })()}
                    </span>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'submit' }))}
          className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center space-x-3 hover:border-blue-500 dark:hover:border-blue-500 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
            <Plus size={20} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">New Request</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Submit a new task</p>
          </div>
        </button>

        <button 
          onClick={() => window.dispatchEvent(new CustomEvent('switch-tab', { detail: 'my-requests' }))}
          className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center space-x-3 hover:border-emerald-500 dark:hover:border-emerald-500 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
            <FileText size={20} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">My Requests</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">View all your tasks</p>
          </div>
        </button>

        <button 
          className="p-4 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center space-x-3 hover:border-purple-500 dark:hover:border-purple-500 transition-colors text-left group"
        >
          <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 group-hover:scale-110 transition-transform">
            <Clock size={20} />
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">TAT Guidelines</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">View turnaround times</p>
          </div>
        </button>
      </div>

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
