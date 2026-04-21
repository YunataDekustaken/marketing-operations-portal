import React, { useState, useEffect } from 'react';
import { useRequests } from '../hooks/useRequests';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { FileText, CheckCircle, Clock, AlertTriangle, Users, MessageSquare, TrendingUp, Download } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';
import { differenceInHours, format } from 'date-fns';
import { exportToCSV } from '../utils/exportUtils';
import { useToast } from '../components/ToastProvider';

export default function Analytics() {
  const { requests, loading } = useRequests();
  const { addToast } = useToast();
  const [teamMembers, setTeamMembers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchTeam = async () => {
      const q = query(collection(db, 'users'), where('role', '==', 'marketing'));
      const snapshot = await getDocs(q);
      const members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile));
      setTeamMembers(members);
    };
    fetchTeam();
  }, []);

  const handleExportCSV = () => {
    exportToCSV(requests, `marketing-analytics-all-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    addToast('success', 'Analytics data exported to CSV');
  };

  if (loading) return <div className="text-center py-12 text-black/40">Loading analytics...</div>;

  // Global Stats
  const totalRequests = requests.length;
  const completedRequests = requests.filter(r => r.status === 'Completed').length;
  const inProgress = requests.filter(r => r.status === 'In Progress' || r.status === 'Assigned').length;
  const overdue = requests.filter(r => {
    const deadline = new Date(r.dateNeeded);
    return deadline < new Date() && r.status !== 'Completed';
  }).length;

  // Team Performance Data
  const teamPerformance = teamMembers.map(member => {
    const memberTasks = requests.filter(r => r.assignedTo === member.uid);
    const memberCompleted = memberTasks.filter(r => r.status === 'Completed');
    const activeTasksCount = memberTasks.filter(r => r.status !== 'Completed').length;
    
    const totalTAT = memberCompleted.reduce((acc, r) => {
      if (r.completedAt && r.dateRequested) {
        return acc + differenceInHours(new Date(r.completedAt.toDate()), new Date(r.dateRequested.toDate()));
      }
      return acc;
    }, 0);

    const totalRevisions = memberTasks.reduce((acc, r) => acc + (r.revisionCount || 0), 0);

    return {
      name: member.displayName,
      avgTAT: memberCompleted.length > 0 ? Number((totalTAT / memberCompleted.length).toFixed(1)) : 0,
      avgRevisions: memberTasks.length > 0 ? Number((totalRevisions / memberTasks.length).toFixed(1)) : 0,
      completed: memberCompleted.length,
      activeTasks: activeTasksCount
    };
  });

  // Requests by Department
  const deptData = Object.entries(
    requests.reduce((acc, r) => {
      acc[r.department] = (acc[r.department] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  const COLORS = ['#141414', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-12 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Analytics Overview</h2>
          <p className="text-sm text-black/50 dark:text-white/40">Performance metrics and team workload</p>
        </div>
        <button 
          onClick={handleExportCSV}
          className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-xl text-sm font-bold hover:bg-black dark:hover:bg-white hover:text-white dark:hover:text-black transition-all dark:text-white"
        >
          <Download size={16} />
          <span>Export Full Report</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <StatCard title="Total Requests" value={totalRequests} icon={FileText} color="text-blue-500" />
        <StatCard title="Completed" value={completedRequests} icon={CheckCircle} color="text-green-500" />
        <StatCard title="In Progress" value={inProgress} icon={Clock} color="text-indigo-500" />
        <StatCard title="Overdue" value={overdue} icon={AlertTriangle} color="text-red-500" />
      </div>

      {/* Team Performance Section */}
      <section className="space-y-8">
        <div className="flex items-center space-x-3 text-black/40 dark:text-white/40">
          <Users size={20} />
          <h3 className="text-sm font-bold uppercase tracking-widest">Team Performance Analytics</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Avg Turnaround Time */}
          <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Avg. Turnaround Time (Hours)</h4>
              <TrendingUp className="text-emerald-500" size={16} />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-black/5 dark:text-white/5" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-bg-opacity)', color: 'inherit' }}
                    itemStyle={{ color: 'inherit' }}
                  />
                  <Bar dataKey="avgTAT" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Avg Revisions */}
          <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Avg. Revisions per Project</h4>
              <MessageSquare className="text-amber-500" size={16} />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-black/5 dark:text-white/5" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-bg-opacity)', color: 'inherit' }}
                    itemStyle={{ color: 'inherit' }}
                  />
                  <Bar dataKey="avgRevisions" fill="#F59E0B" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Active Tasks (Workload) */}
          <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between mb-8">
              <h4 className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40">Active Tasks per Member (Workload)</h4>
              <Users className="text-purple-500" size={16} />
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={teamPerformance}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-black/5 dark:text-white/5" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-bg-opacity)', color: 'inherit' }}
                    itemStyle={{ color: 'inherit' }}
                  />
                  <Bar dataKey="activeTasks" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-8">Requests by Department</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deptData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {deptData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-bg-opacity)', color: 'inherit' }}
                  itemStyle={{ color: 'inherit' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {deptData.map((d, i) => (
              <div key={d.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                <span className="text-xs font-medium text-black/60 dark:text-white/60">{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-white/5 p-8 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-black/40 dark:text-white/40 mb-8">Completed Projects by Member</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={teamPerformance} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-black/5 dark:text-white/5" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} fontSize={10} tickLine={false} axisLine={false} stroke="currentColor" className="text-black/40 dark:text-white/40" />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: 'var(--tw-bg-opacity)', color: 'inherit' }}
                  itemStyle={{ color: 'inherit' }}
                />
                <Bar dataKey="completed" fill="currentColor" className="text-[#141414] dark:text-white" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <div className="bg-white dark:bg-white/5 p-6 rounded-2xl border border-black/5 dark:border-white/5 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-black/30 dark:text-white/30">{title}</span>
        <Icon className={color} size={18} />
      </div>
      <p className="text-3xl font-bold dark:text-white">{value}</p>
    </div>
  );
}
