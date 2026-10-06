import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User as FirebaseUser,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../config/firebase';
import { UserProfile, UserRole } from '../types';
import { INITIAL_USERS } from '../data/initialData';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  isAdmin: boolean;
  isProgramAdmin: boolean;
  isProjectLead: boolean;
  isWorkshopLead: boolean;
  isAcademicAffairs: boolean;
  isDeveloper: boolean;
  canCreateSeries: boolean;
  canDeleteSeries: boolean;
  canEditSeries: boolean;
  canInitiateWorkshop: boolean;
  canApproveWorkshop: boolean;
  canAssignDevelopers: boolean;
  canChangeStatus: boolean;
  canSwitchRoles: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  signInWithPresetAccount: (profileId: string) => Promise<void>;
  logout: () => Promise<void>;
  updateRole: (newRole: UserRole) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAILS = [
  'admin@ucw.ca',
  'admin@ucanwest.ca',
  'orkhon.erdenebaatar@ucanwest.ca',
  'komil.mamajanov@ucanwest.ca',
  'komil.mamajanov@ucw.ca',
];
const DEMO_STORAGE_KEY = 'ucw_active_session_profile';
const ROLE_OVERRIDES_KEY = 'ucw_user_role_overrides';

const isMohsenGhodratProfile = (profile?: Partial<UserProfile> | null): boolean => {
  if (!profile) return false;
  const email = (profile.email || '').toLowerCase();
  const name = (profile.displayName || '').toLowerCase();
  const id = (profile.id || '').toLowerCase();
  return (
    name.includes('mohsen ghodrat') ||
    email.includes('mohsen.ghodrat') ||
    email.includes('mohsenghodrat') ||
    id.includes('mohsen_ghodrat')
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return null;
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

    const isMohsen =
      (user.email || '').toLowerCase().includes('mohsenghodrat') ||
      (user.displayName || '').toLowerCase().includes('mohsen ghodrat');

    const defaultInitialRole: UserRole = isMohsen
      ? 'workshop_lead'
      : ADMIN_EMAILS.includes(user.email?.toLowerCase() || '') || fallbackRole === 'administrator'
      ? 'administrator'
      : fallbackRole || 'developer';

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
          } catch {}
        }
        setUserProfile(data);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(data));
        return data;
      } else {
        const rawName = user.displayName || user.email?.split('@')[0] || 'UCW Faculty Member';
        const newProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          displayName: sanitizeName(rawName, defaultInitialRole, user.email || ''),
          role: defaultInitialRole,
          department:
            defaultInitialRole === 'administrator'
              ? 'Administration & Governance'
              : 'School of Business & Technology',
          avatarUrl: user.photoURL || undefined,
          assignedWorkshopCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        try {
          await setDoc(userDocRef, newProfile);
        } catch {}
        setUserProfile(newProfile);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(newProfile));
        return newProfile;
      }
    } catch (err) {
      const fallbackProfile: UserProfile = {
        id: user.uid,
        email: user.email || '',
        displayName: sanitizeName(user.displayName || 'UCW Faculty Member', defaultInitialRole, user.email || ''),
        role: defaultInitialRole,
        department:
          defaultInitialRole === 'administrator'
            ? 'Administration & Governance'
            : 'School of Business & Technology',
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
        // If not signed into Firebase auth, check if there was a saved session
        const saved = localStorage.getItem(DEMO_STORAGE_KEY);
        if (saved) {
          try {
            setUserProfile(JSON.parse(saved));
          } catch {
            setUserProfile(null);
          }
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

  const signInWithPresetAccount = async (profileId: string) => {
    setLoading(true);
    const target = INITIAL_USERS.find((u) => u.id === profileId) || INITIAL_USERS[2]; // Dr. Mohsen Ghodrat by default
    setUserProfile(target);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(target));
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch {}
    setLoading(false);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Check if matches known faculty presets
      const matchedUser = INITIAL_USERS.find(
        (u) =>
          u.email.toLowerCase() === normalizedEmail ||
          (normalizedEmail.includes('admin') && u.role === 'administrator') ||
          (normalizedEmail.includes('developer') && u.role === 'developer') ||
          (normalizedEmail.includes('mohsen') && u.id === 'lead_mohsen_ghodrat')
      );

      if (matchedUser) {
        let finalRole = matchedUser.role;
        // Check role overrides
        if (isMohsenGhodratProfile(matchedUser)) {
          try {
            const rawOverrides = localStorage.getItem(ROLE_OVERRIDES_KEY);
            if (rawOverrides) {
              const overrides = JSON.parse(rawOverrides);
              if (overrides[matchedUser.id] || overrides[normalizedEmail]) {
                finalRole = overrides[matchedUser.id] || overrides[normalizedEmail];
              }
            }
          } catch {}
        }

        const activeProfile: UserProfile = {
          ...matchedUser,
          role: finalRole,
        };

        setUserProfile(activeProfile);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(activeProfile));

        try {
          if (!auth.currentUser) {
            await signInAnonymously(auth);
          }
        } catch {}
        return;
      }

      // If user typed real email and password, attempt Firebase auth
      try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        await fetchOrCreateProfile(result.user);
      } catch (authErr: any) {
        // If account doesn't exist in Firebase Auth yet, automatically register or create profile
        if (
          authErr.code === 'auth/user-not-found' ||
          authErr.code === 'auth/invalid-credential' ||
          authErr.code === 'auth/wrong-password' ||
          authErr.code === 'auth/invalid-email'
        ) {
          const isMohsen =
            normalizedEmail.includes('mohsen') ||
            normalizedEmail.includes('ghodrat');
          const isDefaultAdmin = ADMIN_EMAILS.includes(normalizedEmail);
          const assignedRole: UserRole = isMohsen
            ? 'workshop_lead'
            : isDefaultAdmin
            ? 'administrator'
            : 'developer';

          const autoProfile: UserProfile = {
            id: `usr_${normalizedEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
            email: normalizedEmail,
            displayName: isMohsen ? 'Mohsen Ghodrat' : email.split('@')[0],
            role: assignedRole,
            department:
              assignedRole === 'administrator'
                ? 'Administration & Governance'
                : 'School of Business & Technology',
            createdAt: new Date().toISOString(),
          };

          setUserProfile(autoProfile);
          localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(autoProfile));
          try {
            if (!auth.currentUser) await signInAnonymously(auth);
          } catch {}
          return;
        }
        throw authErr;
      }
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
      try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        await updateProfile(result.user, { displayName: name });
        await fetchOrCreateProfile(result.user, role);
      } catch (authErr: any) {
        // Fallback local registration if Firebase Auth signup is blocked
        const customProfile: UserProfile = {
          id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
          email,
          displayName: name,
          role,
          department:
            role === 'administrator'
              ? 'Administration & Governance'
              : 'School of Business & Technology',
          createdAt: new Date().toISOString(),
        };
        setUserProfile(customProfile);
        localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(customProfile));
        try {
          if (!auth.currentUser) await signInAnonymously(auth);
        } catch {}
      }
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

    // STRICT RULE: Only Mohsen Ghodrat can switch roles
    if (!isMohsenGhodratProfile(userProfile)) {
      console.warn('Role switching is strictly reserved for Mohsen Ghodrat.');
      return;
    }

    const updatedProfile = { ...userProfile, role: newRole, updatedAt: new Date().toISOString() };
    setUserProfile(updatedProfile);
    localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(updatedProfile));

    try {
      const raw = localStorage.getItem(ROLE_OVERRIDES_KEY);
      const overrides = raw ? JSON.parse(raw) : {};
      overrides[userProfile.id] = newRole;
      if (userProfile.email) overrides[userProfile.email.toLowerCase()] = newRole;
      localStorage.setItem(ROLE_OVERRIDES_KEY, JSON.stringify(overrides));
    } catch {}

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
  const isProgramAdmin = userProfile?.role === 'administrator';
  const isProjectLead = userProfile?.role === 'project_lead';
  const isWorkshopLead = userProfile?.role === 'workshop_lead';
  const isAcademicAffairs = userProfile?.role === 'academic_affairs';
  const isDeveloper = userProfile?.role === 'developer';

  const isAdmin = isProgramAdmin || isProjectLead;
  const canCreateSeries = isProgramAdmin;
  const canDeleteSeries = isProgramAdmin;
  const canEditSeries = isProgramAdmin || isWorkshopLead;
  const canInitiateWorkshop = isProgramAdmin || isProjectLead || isWorkshopLead;
  const canApproveWorkshop = isProgramAdmin || isProjectLead || isAcademicAffairs;
  const canAssignDevelopers = isProgramAdmin || isProjectLead || isWorkshopLead;
  const canChangeStatus = isProgramAdmin || isProjectLead || isAcademicAffairs;
  const canSwitchRoles = isMohsenGhodratProfile(userProfile);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isAuthenticated,
        loading,
        isAdmin,
        isProgramAdmin,
        isProjectLead,
        isWorkshopLead,
        isAcademicAffairs,
        isDeveloper,
        canCreateSeries,
        canDeleteSeries,
        canEditSeries,
        canInitiateWorkshop,
        canApproveWorkshop,
        canAssignDevelopers,
        canChangeStatus,
        canSwitchRoles,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signInWithPresetAccount,
        logout,
        updateRole,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
