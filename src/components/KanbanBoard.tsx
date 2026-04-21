import React from 'react';
import { MarketingRequest, RequestStatus } from '../types';
import { getDeadlineBadgeClass, getDeadlineStatus } from '../utils/dateUtils';
import { Clock, AlertCircle } from 'lucide-react';

interface KanbanBoardProps {
  requests: MarketingRequest[];
  onCardClick: (request: MarketingRequest) => void;
}

const COLUMNS: { id: RequestStatus; title: string; color: string }[] = [
  { id: 'Pending', title: 'Pending', color: 'bg-gray-100 text-gray-800 border-gray-200' },
  { id: 'Assigned', title: 'Assigned', color: 'bg-blue-50 text-blue-800 border-blue-200' },
  { id: 'In Progress', title: 'In Progress', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  { id: 'For Review', title: 'For Review', color: 'bg-purple-50 text-purple-800 border-purple-200' },
  { id: 'Revision Needed', title: 'Revision Needed', color: 'bg-rose-50 text-rose-800 border-rose-200' },
  { id: 'Completed', title: 'Completed', color: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
];

export default function KanbanBoard({ requests, onCardClick }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-250px)] min-h-[500px]">
      {COLUMNS.map(col => {
        const columnRequests = requests.filter(r => r.status === col.id);
        
        return (
          <div 
            key={col.id}
            className="flex-shrink-0 w-80 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 rounded-xl border border-gray-200 dark:border-gray-800"
          >
            <div className={`px-4 py-3 rounded-t-xl border-b font-semibold flex items-center justify-between ${col.color} dark:bg-opacity-10 dark:border-opacity-20`}>
              <span>{col.title}</span>
              <span className="bg-white/50 dark:bg-black/20 px-2 py-0.5 rounded-full text-xs">
                {columnRequests.length}
              </span>
            </div>
            
            <div className="flex-1 p-3 overflow-y-auto space-y-3">
              {columnRequests.map(request => {
                const deadlineStatus = getDeadlineStatus(request.dateNeeded, request.status);
                const deadlineClass = getDeadlineBadgeClass(deadlineStatus);
                
                return (
                  <div
                    key={request.id}
                    onClick={() => onCardClick(request)}
                    className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md hover:border-black/10 dark:hover:border-white/20 transition-all"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-gray-500">{request.requestId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        request.priority === 'Urgent' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                        request.priority === 'Low' ? 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' :
                        'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {request.priority}
                      </span>
                    </div>
                    
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {request.requestTitle}
                    </h4>
                    
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {request.brand}
                      </span>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-300">
                        {request.department}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-medium">
                          {request.assignedToName ? request.assignedToName.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="truncate max-w-[100px]">
                          {request.assignedToName || 'Unassigned'}
                        </span>
                      </div>
                      
                      {request.status !== 'Completed' && (
                        <div className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md ${deadlineClass}`}>
                          {deadlineStatus === 'overdue' ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {deadlineStatus === 'overdue' ? 'Overdue' : deadlineStatus === 'due-soon' ? 'Due Soon' : request.dateNeeded}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {columnRequests.length === 0 && (
                <div className="h-24 flex items-center justify-center border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg text-gray-400 text-sm">
                  No requests
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
