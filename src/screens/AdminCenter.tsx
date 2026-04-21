import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useRequests } from '../hooks/useRequests';
import { ShieldAlert, Users, Info, AlertTriangle, CheckCircle, BarChart3, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

export default function AdminCenter() {
  const { profile, seedUsers } = useAuth();
  const { seedMarketingRequests } = useRequests();
  const [seeding, setSeeding] = useState(false);
  const [seedingTasks, setSeedingTasks] = useState(false);
  const [seedMessage, setSeedMessage] = useState('');
  
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetInput, setResetInput] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const [projectId, setProjectId] = useState('Loading...');

  useEffect(() => {
    // Fetch project ID from config
    fetch('/firebase-applet-config.json')
      .then(res => res.json())
      .then(data => setProjectId(data.projectId || 'Unknown'))
      .catch(() => setProjectId('Unknown'));
  }, []);

  if (profile?.role !== 'marketing_supervisor') {
    return (
      <div className="text-center py-12 text-red-500 font-bold">
        Access Denied. You do not have permission to view this page.
      </div>
    );
  }

  const handleSeed = async () => {
    setSeeding(true);
    setSeedMessage('Starting initialization...');
    try {
      await seedUsers();
      setSeedMessage('Demo accounts created successfully!');
    } catch (err: any) {
      console.error('Seeding error:', err);
      setSeedMessage('Seeding failed: ' + err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleSeedTasks = async () => {
    setSeedingTasks(true);
    setSeedMessage('Seeding sample tasks...');
    try {
      await seedMarketingRequests();
      setSeedMessage('Sample tasks created successfully!');
    } catch (err: any) {
      console.error('Task seeding error:', err);
      setSeedMessage('Task seeding failed: ' + err.message);
    } finally {
      setSeedingTasks(false);
    }
  };

  const handleReset = async () => {
    if (resetInput !== 'RESET') return;
    
    setResetting(true);
    setResetMessage('Fetching requests...');
    
    try {
      // 1. Fetch all marketing_requests
      const requestsSnapshot = await getDocs(collection(db, 'marketing_requests'));
      
      // 2. Delete activity logs for each request
      setResetMessage('Deleting activity logs...');
      await Promise.all(requestsSnapshot.docs.map(async (requestDoc) => {
        const activityLogSnapshot = await getDocs(collection(db, 'marketing_requests', requestDoc.id, 'activityLog'));
        const activityLogDeletes = activityLogSnapshot.docs.map(d => deleteDoc(doc(db, 'marketing_requests', requestDoc.id, 'activityLog', d.id)));
        await Promise.all(activityLogDeletes);
      }));

      // 3. Delete comments for each request
      setResetMessage('Deleting comments...');
      await Promise.all(requestsSnapshot.docs.map(async (requestDoc) => {
        const commentsSnapshot = await getDocs(collection(db, 'marketing_requests', requestDoc.id, 'comments'));
        const commentsDeletes = commentsSnapshot.docs.map(d => deleteDoc(doc(db, 'marketing_requests', requestDoc.id, 'comments', d.id)));
        await Promise.all(commentsDeletes);
      }));
      
      // 4. Delete the parent requests
      setResetMessage('Deleting requests...');
      const requestDeletes = requestsSnapshot.docs.map(d => deleteDoc(doc(db, 'marketing_requests', d.id)));
      await Promise.all(requestDeletes);
      
      // 5. Delete all notifications
      setResetMessage('Deleting notifications...');
      const notificationsSnapshot = await getDocs(collection(db, 'notifications'));
      const notificationDeletes = notificationsSnapshot.docs.map(d => deleteDoc(doc(db, 'notifications', d.id)));
      await Promise.all(notificationDeletes);
      
      setResetMessage('Data reset complete');
      setShowResetModal(false);
      setResetInput('');
    } catch (error: any) {
      console.error('Reset error:', error);
      setResetMessage('Reset failed: ' + error.message);
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[#141414] dark:text-white mb-2">Admin Center</h1>
        <p className="text-black/50 dark:text-white/50">Manage system-wide settings and data.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Section 1: Team Setup & Initialization */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
              <Users size={24} />
            </div>
            <h2 className="text-xl font-bold text-[#141414] dark:text-white">System Initialization</h2>
          </div>
          <p className="text-sm text-black/60 dark:text-white/60 mb-6">
            Initialize the application with team credentials and sample data. These actions are typically performed once during setup.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleSeed}
              disabled={seeding || seedingTasks}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                seeding 
                  ? 'bg-black/5 dark:bg-white/5 text-black/30 dark:text-white/30 cursor-not-allowed' 
                  : 'bg-[#141414] dark:bg-white text-white dark:text-black hover:bg-black dark:hover:bg-gray-200'
              }`}
            >
              {seeding && <Loader2 size={18} className="animate-spin" />}
              <span>{seeding ? 'Initializing...' : 'Initialize Team Credentials'}</span>
            </button>

            <button
              onClick={handleSeedTasks}
              disabled={seeding || seedingTasks}
              className={`flex-1 px-6 py-3 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 ${
                seedingTasks 
                  ? 'bg-black/5 dark:bg-white/5 text-black/30 dark:text-white/30 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {seedingTasks && <Loader2 size={18} className="animate-spin" />}
              <BarChart3 size={18} />
              <span>{seedingTasks ? 'Seeding...' : 'Seed Sample Tasks'}</span>
            </button>
          </div>
          
          {seedMessage && (
            <div className={`mt-4 flex items-center space-x-2 text-sm font-bold ${seedMessage.includes('failed') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <CheckCircle size={16} />
              <span>{seedMessage}</span>
            </div>
          )}
        </div>

        {/* Section 2: Danger Zone */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border-2 border-red-100 dark:border-red-900/30 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg">
              <ShieldAlert size={24} />
            </div>
            <h2 className="text-xl font-bold text-red-600 dark:text-red-400">Reset Task Data</h2>
          </div>
          <p className="text-sm text-black/60 dark:text-white/60 mb-6">
            Permanently deletes all marketing requests, comments, activity logs, and notifications. User accounts and login credentials are not affected.
          </p>
          
          <button
            onClick={() => setShowResetModal(true)}
            className="px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-xl font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
          >
            Reset Data
          </button>

          {resetMessage && (
            <div className={`mt-4 flex items-center space-x-2 text-sm font-bold ${resetMessage.includes('failed') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              <CheckCircle size={16} />
              <span>{resetMessage}</span>
            </div>
          )}
        </div>

        {/* Section 3: App Info */}
        <div className="bg-white dark:bg-white/5 rounded-2xl border border-black/5 dark:border-white/5 p-8 shadow-sm">
          <div className="flex items-center space-x-3 mb-6">
            <div className="p-2 bg-gray-50 dark:bg-white/10 text-gray-600 dark:text-white/60 rounded-lg">
              <Info size={24} />
            </div>
            <h2 className="text-xl font-bold text-[#141414] dark:text-white">App Info</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-1">Application Name</p>
              <p className="text-sm font-semibold text-[#141414] dark:text-white">Marketing Operations Portal</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-black/40 dark:text-white/40 uppercase tracking-widest mb-1">Firebase Project ID</p>
              <p className="text-sm font-mono text-black/70 dark:text-white/70">gen-lang-client-0241636029</p>
            </div>
            <div className="pt-4 border-t border-black/5 dark:border-white/5">
              <p className="text-xs text-black/50 dark:text-white/50 italic">
                Admin Center is only accessible to Marketing Supervisors.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#141414] rounded-2xl max-w-md w-full p-8 shadow-2xl border border-black/10 dark:border-white/10">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle size={32} />
              <h3 className="text-2xl font-bold">Reset All Tasks?</h3>
            </div>
            
            <p className="text-black/70 dark:text-white/70 mb-6 leading-relaxed">
              This will permanently delete all marketing requests, comments, activity logs, and notifications. This cannot be undone.
            </p>

            <div className="mb-8">
              <label className="block text-xs font-bold text-black/50 dark:text-white/50 uppercase tracking-widest mb-2">
                Type RESET to confirm
              </label>
              <input
                type="text"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="RESET"
                className="w-full bg-[#F5F5F4] dark:bg-white/5 border-none rounded-xl px-4 py-3 text-center font-mono font-bold tracking-widest focus:ring-2 focus:ring-red-500 dark:text-white"
              />
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetInput('');
                }}
                className="flex-1 py-3 bg-black/5 dark:bg-white/5 text-black/70 dark:text-white/70 rounded-xl font-bold hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReset}
                disabled={resetInput !== 'RESET' || resetting}
                className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resetting ? 'Resetting...' : 'Confirm Reset'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
