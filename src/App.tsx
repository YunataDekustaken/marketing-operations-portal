/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import { LogIn, ShieldCheck, AlertCircle } from 'lucide-react';
import { UserRole, Department } from './types';
import { db } from './firebase';
import { doc, getDocFromServer } from 'firebase/firestore';

// Screens
import { ToastProvider } from './components/ToastProvider';
import DepartmentDashboard from './screens/DepartmentDashboard';
import DepartmentHome from './screens/DepartmentHome';
import SubmitRequest from './screens/SubmitRequest';
import MarketingDashboard from './screens/MarketingDashboard';
import MyTasks from './screens/MyTasks';
import ReviewPanel from './screens/ReviewPanel';
import Analytics from './screens/Analytics';
import MemberHome from './screens/MemberHome';
import TATInfo from './screens/TATInfo';
import AdminCenter from './screens/AdminCenter';

function AuthScreen() {
  const { login, loginWithEmail, signupWithEmail } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      if (isSignup) {
        await signupWithEmail(email, password);
      } else {
        await loginWithEmail(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-black/5 p-8">
        <div className="flex justify-center mb-8">
          <div className="w-20 h-20 bg-[#141414] rounded-2xl flex items-center justify-center overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/1bckK9Z9QwspyR4R9ePf0pNUPUuZVdLwO" 
              alt="STLAF Logo" 
              className="w-full h-full object-contain p-2"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-amber-500 font-bold text-3xl">LAF</span>';
              }}
            />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-[#141414] text-center mb-2">Marketing Operations</h1>
        <p className="text-black/50 text-center mb-8">STLAF internal request management portal</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-black/70 mb-1">Username / Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full bg-[#F5F5F4] border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-black/70 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full bg-[#F5F5F4] border-none rounded-lg px-4 py-3 focus:ring-2 focus:ring-black/5"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500 font-medium">{error}</p>}

          <button
            type="submit"
            className="w-full flex items-center justify-center space-x-3 bg-[#141414] text-white py-4 rounded-xl font-semibold hover:bg-black transition-all"
          >
            <LogIn size={20} />
            <span>{isSignup ? 'Create Account' : 'Sign In'}</span>
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-black/5 text-center">
          <button
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm font-medium text-black/50 hover:text-black transition-colors"
          >
            {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="mt-4 text-center">
          <p className="text-xs text-black/30 mb-4">Or continue with</p>
          <button
            onClick={login}
            className="w-full flex items-center justify-center space-x-3 bg-white border border-black/10 text-black py-3 rounded-xl font-semibold hover:bg-black/5 transition-all"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
            <span>Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('');
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    async function testConnection() {
      try {
        await getDocFromServer(doc(db, 'test', 'connection'));
      } catch (error: any) {
        if (error.message?.includes('the client is offline') || error.message?.includes('Could not reach Cloud Firestore backend')) {
          console.error("Firestore connection test failed:", error);
          setConnectionError(true);
        }
      }
    }
    testConnection();
  }, []);

  // Set default tab based on role
  useEffect(() => {
    if (profile && !activeTab) {
      if (profile.role === 'marketing_supervisor') setActiveTab('dashboard');
      else if (profile.role === 'marketing_member') setActiveTab('my-tasks');
      else setActiveTab('home');
    }
  }, [profile, activeTab]);

  // Handle notification click routing
  useEffect(() => {
    const handleOpenTask = (e: any) => {
      if (!profile) return;
      
      // Switch to the appropriate tab based on role
      if (profile.role === 'marketing_supervisor') {
        setActiveTab('dashboard');
      } else if (profile.role === 'marketing_member') {
        setActiveTab('my-tasks');
      } else {
        setActiveTab('my-requests');
      }
    };

    window.addEventListener('open-task', handleOpenTask);
    
    const handleSwitchTab = (e: any) => {
      setActiveTab(e.detail);
    };
    window.addEventListener('switch-tab', handleSwitchTab);

    return () => {
      window.removeEventListener('open-task', handleOpenTask);
      window.removeEventListener('switch-tab', handleSwitchTab);
    };
  }, [profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F4] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 bg-[#141414] rounded-xl mb-4 flex items-center justify-center overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/1bckK9Z9QwspyR4R9ePf0pNUPUuZVdLwO" 
              alt="STLAF" 
              className="w-full h-full object-contain p-1"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
                (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-amber-500 font-bold text-2xl">LAF</span>';
              }}
            />
          </div>
          <div className="h-4 w-32 bg-black/10 rounded"></div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  const renderContent = () => {
    if (!profile) return null;
    const isSupervisor = profile.role === 'marketing_supervisor';
    const isMember = profile.role === 'marketing_member';

    switch (activeTab) {
      case 'home': return <DepartmentHome />;
      case 'dashboard': 
        return isSupervisor ? <MarketingDashboard /> : (isMember ? <MemberHome /> : <DepartmentHome />);
      case 'member-home': return <MemberHome />;
      case 'admin': return isSupervisor ? <AdminCenter /> : <MarketingDashboard />;
      case 'my-tasks': return <MyTasks />;
      case 'review': 
        return isSupervisor ? <ReviewPanel /> : <MyTasks />;
      case 'analytics': 
        return isSupervisor ? <Analytics /> : <MyTasks />;
      case 'submit': return <SubmitRequest onComplete={() => setActiveTab('my-requests')} />;
      case 'my-requests': return <DepartmentDashboard />;
      case 'tat-info': return <TATInfo />;
      default: 
        if (isSupervisor) return <MarketingDashboard />;
        if (isMember) return <MyTasks />;
        return <DepartmentHome />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {connectionError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-3 text-red-700">
          <AlertCircle className="shrink-0 mt-0.5" size={18} />
          <div className="text-sm">
            <p className="font-bold mb-1">Firestore Connection Error</p>
            <p>The application is unable to reach the database. This usually means the Firebase configuration is incorrect or the database instance is not provisioned.</p>
            <p className="mt-2 font-medium">Please check your firebase-applet-config.json and ensure the database exists in the Firebase Console.</p>
          </div>
        </div>
      )}
      {renderContent()}
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}

