import { useState, useEffect } from 'react';
import { useRequests } from '../hooks/useRequests';
import { CheckCircle, RotateCcw, FileText, ExternalLink, MessageSquare, AlertTriangle } from 'lucide-react';
import { format, parseISO, isValid } from 'date-fns';
import { MarketingRequest } from '../types';
import axios from 'axios';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

export default function ReviewPanel() {
  const { requests, loading, updateRequest } = useRequests();
  const [revisionNotes, setRevisionNotes] = useState<{ [key: string]: string }>({});
  const [processingId, setProcessingId] = useState<string | null>(null);

  const safeFormat = (dateInput: any, formatStr: string) => {
    if (!dateInput) return 'N/A';
    try {
      const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;
      if (!isValid(date)) return 'N/A';
      return format(date, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  if (loading) return <div className="text-center py-12 text-black/40">Loading review panel...</div>;

  const reviewTasks = requests.filter(r => r.status === 'For Review');

  const handleApprove = async (task: MarketingRequest) => {
    setProcessingId(task.id);
    try {
      await updateRequest(task.id, { 
        status: 'Completed'
      });
    } catch (error: any) {
      console.error("Approval Error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRequestRevision = async (id: string) => {
    const notes = revisionNotes[id];
    if (!notes) return;
    
    setProcessingId(id);
    try {
      await updateRequest(id, { 
        status: 'Revision Needed',
        revisionNotes: notes
      });
      setRevisionNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (error: any) {
      console.error("Revision Error:", error);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {reviewTasks.length === 0 ? (
        <div className="bg-white dark:bg-white/5 rounded-2xl p-12 text-center border border-black/5 dark:border-white/5">
          <CheckCircle className="mx-auto text-green-500 dark:text-green-400 mb-4" size={48} />
          <h3 className="text-xl font-bold text-[#141414] dark:text-white">No tasks for review</h3>
          <p className="text-black/50 dark:text-white/50">Everything is up to date.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8">
          {reviewTasks.map((task) => (
            <div key={task.id} className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm overflow-hidden">
              <div className="p-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-[10px] font-bold uppercase tracking-wider">
                        For Review
                      </span>
                      <span className="text-xs text-black/30 dark:text-white/30 font-medium">{task.requestId}</span>
                    </div>
                    <div className="flex items-center space-x-4 mb-2">
                      <h3 className="text-2xl font-bold text-[#141414] dark:text-white">{task.requestTitle}</h3>
                      {task.tatAcknowledged && (
                        <div className="flex items-center space-x-2 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-900/50">
                          <AlertTriangle size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">TAT Conflict</span>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-black/50 dark:text-white/50 mt-1">Assigned to: <span className="font-semibold text-black dark:text-white">{task.assignedToName}</span></p>
                  </div>
                  
                  <div className="mt-4 md:mt-0 flex items-center space-x-4">
                    {task.deliverableFileUrl && (
                      <a 
                        href={task.deliverableFileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
                      >
                        <FileText size={16} />
                        <span>View File</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                    {task.deliverableLink && (
                      <a 
                        href={task.deliverableLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center space-x-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-lg text-sm font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors"
                      >
                        <ExternalLink size={16} />
                        <span>View Link</span>
                      </a>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Request Details</h4>
                      <div className="bg-[#F5F5F4] dark:bg-white/5 p-4 rounded-xl text-sm text-black/70 dark:text-white/70 leading-relaxed">
                        {task.description}
                      </div>
                    </div>
                    <div className="flex space-x-8">
                      <div>
                        <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Department</p>
                        <p className="text-sm font-semibold dark:text-white">{task.department}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-black/30 dark:text-white/30 uppercase tracking-widest mb-1">Brand</p>
                        <p className="text-sm font-semibold dark:text-white">{task.brand}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-2">Review Action</h4>
                      <div className="space-y-4">
                        {/* Scheduling Info for Reviewer */}
                        <div className="relative">
                          <textarea
                            placeholder="Add revision notes here if needed..."
                            value={revisionNotes[task.id] || ''}
                            onChange={(e) => setRevisionNotes({ ...revisionNotes, [task.id]: e.target.value })}
                            className="w-full bg-[#F5F5F4] dark:bg-white/5 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-black/5 dark:focus:ring-white/5 resize-none h-24 dark:text-white"
                          />
                          <MessageSquare className="absolute right-4 top-4 text-black/10 dark:text-white/10" size={18} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            disabled={!revisionNotes[task.id] || processingId === task.id}
                            onClick={() => handleRequestRevision(task.id)}
                            className="flex items-center justify-center space-x-2 py-3 border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-50 dark:hover:bg-red-900/20 transition-all disabled:opacity-50"
                          >
                            <RotateCcw size={16} />
                            <span>Request Revision</span>
                          </button>
                          <button
                            disabled={processingId === task.id}
                            onClick={() => handleApprove(task)}
                            className="flex items-center justify-center space-x-2 py-3 bg-green-600 dark:bg-green-700 text-white rounded-xl text-sm font-bold hover:bg-green-700 dark:hover:bg-green-800 transition-all disabled:opacity-50"
                          >
                            <CheckCircle size={16} />
                            <span>Approve Task</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
