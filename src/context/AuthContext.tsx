import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError } from '../config/firebase';
import { UserProfile, UserRole, OperationType } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isDeveloper: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (newRole: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = ['admin@ucw.ca', 'admin@ucanwest.ca', 'faculty.admin@ucw.ca'];
const DEMO_STORAGE_KEY = 'ucw_active_session_profile';
const ROLE_OVERRIDES_KEY = 'ucw_user_role_overrides';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.displayName === 'string') {
          let name: string = parsed.displayName;
          const email: string = (parsed.email || '').toLowerCase();
          if (name.includes('Mohsen Ghodrat') || email.includes('mohsenghodrat')) {
            parsed.displayName = 'Mohsen Ghodrat';
          } else {
            parsed.displayName = parsed.displayName.replace(/Prof\./g, 'Dr.');
            parsed.displayName = parsed.displayName.replace(/\s*\(Admin\)/gi, '');
            parsed.displayName = parsed.displayName.replace(/\s*\(Developer\)/gi, '');
          }
          parsed.displayName = parsed.displayName.replace(/Dr\.\s*Mohsen Ghodrat/gi, 'Mohsen Ghodrat');

          // Check if role override exists
          try {
            const rawOverrides = localStorage.getItem(ROLE_OVERRIDES_KEY);
            if (rawOverrides) {
              const overrides = JSON.parse(rawOverrides);
              if (overrides[parsed.id] || overrides[email]) {
                parsed.role = overrides[parsed.id] || overrides[email];
              }
            }
          } catch {}

          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Sync or create user profile in Firestore
  const fetchOrCreateProfile = async (user: FirebaseUser, fallbackRole?: UserRole): Promise<UserProfile> => {
    const sanitizeName = (name: string, role: UserRole, email?: string): string => {
      let clean = name || '';
      const lowerEmail = (email || '').toLowerCase();
      if (clean.includes('Mohsen Ghodrat') || lowerEmail.includes('mohsenghodrat')) {
        return 'Mohsen Ghodrat';
      }
      if (role === 'administrator') {
        return 'Administrator';
      }
      if (!clean) {
        return 'UCW Faculty Member';
      }
      clean = clean.replace(/Prof\./g, 'Dr.');
      clean = clean.replace(/\s*\(Admin\)/gi, '');
      clean = clean.replace(/\s*\(Developer\)/gi, '');
      return clean;
    };

    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        const data = snap.data() as UserProfile;
        const sanitized = sanitizeName(data.displayName || '', data.role, user.email || '');
        if (data.displayName !== sanitized) {
          data.displayName = sanitized;
          try {
            await setDoc(userDocRef, { displayName: sanitized }, { merge: true });
          } catch (dbErr) {
            console.warn('Could not update cleaned displayName in Firestore:', dbErr);
          }
        }
        setUserProfile(data);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
        return data;
      } else {
        const isDefaultAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') || fallbackRole === 'administrator';
        const initialRole: UserRole = isDefaultAdmin ? 'administrator' : fallbackRole || 'developer';
        const rawName = user.displayName || user.email?.split('@')[0] || 'UCW Faculty Member';
        const newProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          displayName: sanitizeName(rawName, initialRole, user.email || ''),
          role: initialRole,
          department: initialRole === 'administrator' ? 'Administration & Governance' : 'School of Business & Technology',
          avatarUrl: user.photoURL || undefined,
          assignedWorkshopCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, newProfile);
        setUserProfile(newProfile);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(newProfile));
        return newProfile;
      }
    } catch (err) {
      console.warn('Error syncing profile with Firestore:', err);
      // Fallback profile if offline/permission issue occurs
      const isDefaultAdmin = ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') || fallbackRole === 'administrator';
      const fallbackRoleToUse: UserRole = isDefaultAdmin ? 'administrator' : fallbackRole || 'developer';
      const fallbackProfile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: sanitizeName(user.displayName || 'UCW Faculty Member', fallbackRoleToUse, user.email || ''),
        role: fallbackRoleToUse,
        department: fallbackRoleToUse === 'administrator' ? 'Administration & Governance' : 'School of Business & Technology',
      };
      setUserProfile(fallbackProfile);
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(fallbackProfile));
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchOrCreateProfile(user);
      } else {
        // Keep demo user if set in localStorage
        const saved = localStorage.getItem(DEMO_STORAGE_KEY);
        if (saved) {
          try {
            setUserProfile(JSON.parse(saved));
          } catch {
            setUserProfile(null);
          }
        } else {
          setUserProfile(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await fetchOrCreateProfile(result.user);
    } catch (error) {
      console.error('Google Sign In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();
      let mockId = '';
      let mockName = '';
      let mockRole: UserRole = 'developer';

      // Intercept specific requested mock accounts to bypass disabled Firebase Auth
      if ((normalizedEmail === 'admin@ucanwest.ca' || normalizedEmail === 'admin') && pass === 'admin123') {
        mockId = 'demo-admin-ucw-01';
        mockName = 'Administrator';
        mockRole = 'administrator';
      } else if (normalizedEmail === 'mohsen.ghodrat@ucanwest.ca' && pass === '123456') {
        mockId = 'dev_mohsen_ghodrat';
        mockName = 'Mohsen Ghodrat';
      } else if (normalizedEmail === 'amirhossein.zaji@ucanwest.ca' && pass === '123456') {
        mockId = 'dev_amirhossein_zaji';
        mockName = 'Amirhossein Zaji';
      } else if (normalizedEmail === 'cheryl.thomas@ucanwest.ca' && pass === '123456') {
        mockId = 'dev_cheryl_thomas';
        mockName = 'Cheryl Thomas';
      }

      if (mockId) {
        try {
          const rawOverrides = localStorage.getItem(ROLE_OVERRIDES_KEY);
          if (rawOverrides) {
            const overrides = JSON.parse(rawOverrides);
            if (overrides[mockId] || overrides[normalizedEmail]) {
              mockRole = overrides[mockId] || overrides[normalizedEmail];
            }
          }
        } catch {}

        // Bypass Firebase auth and set mock profile
        const mockProfile: UserProfile = {
          id: mockId,
          email: normalizedEmail === 'admin' ? 'admin@ucanwest.ca' : normalizedEmail,
          displayName: mockName,
          role: mockRole,
          department: mockRole === 'administrator' ? 'Administration & Governance' : 'School of Business & Technology',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        setUserProfile(mockProfile);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(mockProfile));
        setLoading(false);
        return;
      }

      const result = await signInWithEmailAndPassword(auth, email, pass);
      await fetchOrCreateProfile(result.user);
    } catch (error) {
      console.error('Email Sign In failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: UserRole = 'developer') => {
    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(result.user, { displayName: name });
      await fetchOrCreateProfile(result.user, role);
    } catch (error) {
      console.error('Email Sign Up failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
    } catch (error) {
      console.error('Sign Out failed:', error);
      localStorage.removeItem(DEMO_STORAGE_KEY);
      setCurrentUser(null);
      setUserProfile(null);
    }
  };

  const updateRole = async (newRole: UserRole) => {
    if (!userProfile) return;
    const updatedProfile = { ...userProfile, role: newRole, updatedAt: new Date().toISOString() };
    setUserProfile(updatedProfile);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updatedProfile));

    const path = `users/${userProfile.id}`;
    try {
      await updateDoc(doc(db, 'users', userProfile.id), {
        role: newRole,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.warn('Could not update role in Firestore:', error);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchOrCreateProfile(currentUser);
    }
  };

  const isAuthenticated = Boolean(currentUser || userProfile);
  const isAdmin = userProfile?.role === 'administrator';
  const isDeveloper = userProfile?.role === 'developer' || isAdmin;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAuthenticated,
        loading,
        isAdmin,
        isDeveloper,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        logout,
        updateRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
