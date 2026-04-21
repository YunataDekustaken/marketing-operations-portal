import React from 'react';
import { useRequests } from '../hooks/useRequests';
import { useAuth } from '../hooks/useAuth';
import { Clock, CheckCircle, BarChart3, PieChart } from 'lucide-react';
import { format, differenceInHours, isValid } from 'date-fns';

export default function MemberHome() {
  const { profile } = useAuth();
  const { requests, loading } = useRequests();

  const safeFormat = (dateInput: any, formatStr: string) => {
    if (!dateInput) return 'N/A';
    try {
      const date = dateInput?.toDate ? dateInput.toDate() : new Date(dateInput);
      if (!isValid(date)) return 'N/A';
      return format(date, formatStr);
    } catch (e) {
      return 'N/A';
    }
  };

  if (loading) return <div className="text-center py-12 text-black/40">Loading dashboard...</div>;

  const myRequests = requests.filter(r => r.assignedTo === profile?.uid);
  const completedRequests = myRequests.filter(r => r.status === 'Completed');
  const activeRequests = myRequests.filter(r => r.status !== 'Completed');

  // Calculate Average Turnaround Time
  const totalTAT = completedRequests.reduce((acc, r) => {
    if (r.completedAt && r.dateRequested) {
      try {
        const completedDate = r.completedAt.toDate ? r.completedAt.toDate() : new Date(r.completedAt);
        const requestedDate = r.dateRequested.toDate ? r.dateRequested.toDate() : new Date(r.dateRequested);
        
        if (isValid(completedDate) && isValid(requestedDate)) {
          const hours = differenceInHours(completedDate, requestedDate);
          return acc + hours;
        }
      } catch (e) {
        return acc;
      }
    }
    return acc;
  }, 0);
  const avgTAT = completedRequests.length > 0 ? (totalTAT / completedRequests.length).toFixed(1) : '0';

  // Task Types Distribution
  const taskTypes = myRequests.reduce((acc: Record<string, number>, r) => {
    acc[r.requestType] = (acc[r.requestType] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#141414] dark:text-white">Welcome back, {profile?.displayName}</h1>
          <p className="text-black/50 dark:text-white/50 text-sm">Here's an overview of your performance and tasks.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center space-x-3 text-blue-600 dark:text-blue-400 mb-2">
            <Clock size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Avg. Turnaround</span>
          </div>
          <p className="text-2xl font-bold dark:text-white">{avgTAT} <span className="text-xs font-medium text-black/40 dark:text-white/40">hours</span></p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center space-x-3 text-emerald-600 dark:text-emerald-400 mb-2">
            <CheckCircle size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Completed</span>
          </div>
          <p className="text-2xl font-bold dark:text-white">{completedRequests.length}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center space-x-3 text-amber-600 dark:text-amber-400 mb-2">
            <BarChart3 size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Active Tasks</span>
          </div>
          <p className="text-2xl font-bold dark:text-white">{activeRequests.length}</p>
        </div>
        <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
          <div className="flex items-center space-x-3 text-purple-600 dark:text-purple-400 mb-2">
            <PieChart size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Total Assigned</span>
          </div>
          <p className="text-2xl font-bold dark:text-white">{myRequests.length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Task Types */}
        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
          <h3 className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-6">Task Distribution</h3>
          <div className="space-y-4">
            {Object.entries(taskTypes).map(([type, count]) => (
              <div key={type}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-black/70 dark:text-white/70">{type}</span>
                  <span className="font-bold dark:text-white">{count}</span>
                </div>
                <div className="w-full bg-black/5 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-[#141414] dark:bg-white h-full" 
                    style={{ width: `${(count / myRequests.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
            {myRequests.length === 0 && <p className="text-sm text-black/30 dark:text-white/30 italic">No tasks assigned yet.</p>}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
          <h3 className="text-xs font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-6">Recent Completed</h3>
          <div className="space-y-4">
            {completedRequests.slice(0, 5).map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 hover:bg-black/5 dark:hover:bg-white/10 rounded-xl transition-colors">
                <div>
                  <p className="text-sm font-bold text-black/80 dark:text-white/80">{r.requestTitle}</p>
                  <p className="text-[10px] text-black/40 dark:text-white/40 uppercase tracking-widest">{r.brand}</p>
                </div>
                <p className="text-xs text-black/40 dark:text-white/40">{safeFormat(r.completedAt, 'MMM d')}</p>
              </div>
            ))}
            {completedRequests.length === 0 && <p className="text-sm text-black/30 dark:text-white/30 italic">No completed tasks yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
