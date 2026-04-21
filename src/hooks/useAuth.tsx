import { useState, useEffect, createContext, useContext } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signupWithEmail: (email: string, pass: string) => Promise<void>;
  seedUsers: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const handleFirestoreError = (error: any, operation: string, path: string) => {
    const errInfo = {
      error: error.message,
      operationType: operation,
      path,
      authInfo: {
        userId: user?.uid,
        email: user?.email,
        role: profile?.role
      }
    };
    console.error('Firestore Error Detail:', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(docRef);
          
          if (docSnap.exists()) {
            const data = docSnap.data() as UserProfile;
            let updated = false;
            let updatedData = { ...data };
            
            // Force supervisor role for Chloie and KCS if needed
            if ((user.email === 'chloie@stlafglobal.com' || user.email === 'kcs@stlafglobal.com') && data.role !== 'marketing_supervisor') {
              updatedData.role = 'marketing_supervisor';
              updated = true;
            }

            // Force correct display name
            const KNOWN_USERS: Record<string, string> = {
              'chloie@stlafglobal.com': 'Chloie Alvarado',
              'pat@stlafglobal.com': 'Patricia Minimo',
              'khian@stlafglobal.com': 'Khian De Ocampo',
              'enzo@stlafglobal.com': 'Lorenzo Raña',
              'charleth@stlafglobal.com': 'Charleth Ramos',
              'kcs@stlafglobal.com': 'Atty. Kathrina Sadsad-Tamesis',
            };

            const knownName = user.email ? KNOWN_USERS[user.email.toLowerCase()] : null;
            if (knownName && data.displayName !== knownName) {
              updatedData.displayName = knownName;
              updated = true;
            }

            if (updated) {
              await setDoc(docRef, updatedData);
              setProfile(updatedData);
            } else {
              setProfile(data);
            }
          } else {
            // Auto-create profile for new users
            const isSupervisor = user.email === 'chloie@stlafglobal.com' || user.email === 'kcs@stlafglobal.com';
            const isMarketingMember = ['khian@stlafglobal.com', 'pat@stlafglobal.com', 'enzo@stlafglobal.com', 'charleth@stlafglobal.com'].includes(user.email || '');
            
            let role: UserRole = 'department';
            if (isSupervisor) role = 'marketing_supervisor';
            else if (isMarketingMember) role = 'marketing_member';

            const KNOWN_USERS: Record<string, string> = {
              'chloie@stlafglobal.com': 'Chloie Alvarado',
              'pat@stlafglobal.com': 'Patricia Minimo',
              'khian@stlafglobal.com': 'Khian De Ocampo',
              'enzo@stlafglobal.com': 'Lorenzo Raña',
              'charleth@stlafglobal.com': 'Charleth Ramos',
              'kcs@stlafglobal.com': 'Atty. Kathrina Sadsad-Tamesis',
            };

            const knownName = user.email ? KNOWN_USERS[user.email.toLowerCase()] : null;

            const newProfile: UserProfile = {
              uid: user.uid,
              email: user.email || '',
              displayName: knownName || user.displayName || user.email?.split('@')[0] || 'User',
              role: role,
              department: isSupervisor || isMarketingMember ? 'Marketing' : 'Operations'
            };

            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          console.error("Error fetching/creating profile:", error);
          if (error instanceof Error && error.message.includes('insufficient permissions')) {
            handleFirestoreError(error, 'get/set', `users/${user.uid}`);
          }
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signupWithEmail = async (email: string, pass: string) => {
    await createUserWithEmailAndPassword(auth, email, pass);
  };

  const seedUsers = async () => {
    console.log('Starting seedUsers...');
    const demoUsers = [
      { email: 'chloie@stlafglobal.com', name: 'Chloie Alvarado', role: 'marketing_supervisor', dept: 'Marketing' },
      { email: 'kcs@stlafglobal.com', name: 'Atty. Kathrina Sadsad-Tamesis', role: 'marketing_supervisor', dept: 'Marketing' },
      { email: 'khian@stlafglobal.com', name: 'Khian De Ocampo', role: 'marketing_member', dept: 'Marketing' },
      { email: 'pat@stlafglobal.com', name: 'Patricia Minimo', role: 'marketing_member', dept: 'Marketing' },
      { email: 'enzo@stlafglobal.com', name: 'Lorenzo Raña', role: 'marketing_member', dept: 'Marketing' },
      { email: 'charleth@stlafglobal.com', name: 'Charleth Ramos', role: 'marketing_member', dept: 'Marketing' },
      { email: 'hr@stlafglobal.com', name: 'HR Department', role: 'department', dept: 'HR' },
      { email: 'corporate@stlafglobal.com', name: 'Corporate Department', role: 'department', dept: 'Corporate' },
      { email: 'litigation@stlafglobal.com', name: 'Litigation Department', role: 'department', dept: 'Litigation' },
      { email: 'accounting@stlafglobal.com', name: 'Accounting Department', role: 'department', dept: 'Accounting' },
      { email: 'operations@stlafglobal.com', name: 'Operations Department', role: 'department', dept: 'Operations' },
    ];

    const password = 'Password123!';

    for (const u of demoUsers) {
      try {
        console.log(`Creating user: ${u.email}`);
        // Try to create the user
        const userCredential = await createUserWithEmailAndPassword(auth, u.email, password);
        const user = userCredential.user;
        
        console.log(`User created: ${user.uid}, creating profile...`);
        // Create the profile
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          email: u.email,
          displayName: u.name,
          role: u.role,
          department: u.dept
        });
        
        console.log(`Profile created for ${u.email}, signing out...`);
        // Sign out to continue seeding the next user
        await signOut(auth);
      } catch (err: any) {
        // If user already exists, we skip creation but we can't easily update the profile 
        // without being logged in as that user or an admin.
        // For this demo, we'll just log it.
        console.warn(`User ${u.email} already exists or failed:`, err.message);
      }
      // Small delay to let Firebase catch up
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    console.log('seedUsers completed.');
  };

  const logout = async () => {
    await signOut(auth);
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const docRef = doc(db, 'users', user.uid);
    
    // Special case for Chloie and KCS to ensure they keep their supervisor role
    let role = profile?.role || 'department';
    if (user.email === 'chloie@stlafglobal.com' || user.email === 'kcs@stlafglobal.com') {
      role = 'marketing_supervisor';
    }

    const newProfile = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      role: role,
      department: 'Operations', // Default
      ...profile,
      ...data,
    } as UserProfile;
    
    await setDoc(docRef, newProfile);
    setProfile(newProfile);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, login, loginWithEmail, signupWithEmail, seedUsers, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
