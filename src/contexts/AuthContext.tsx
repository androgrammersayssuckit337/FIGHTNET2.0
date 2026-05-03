import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';

interface UserProfile {
  displayName: string;
  email: string;
  role: 'fighter' | 'fan' | 'sponsor';
  profileImageUrl: string;
  bio: string;
  record: string;
  gym: string;
  isPro: boolean;
  createdAt: number;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: (role?: 'fighter' | 'fan' | 'sponsor') => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string, role: 'fighter' | 'fan' | 'sponsor') => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeProfile: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      
      if (unsubscribeProfile) {
        unsubscribeProfile();
        unsubscribeProfile = null;
      }

      if (user) {
        // Real-time profile listener
        unsubscribeProfile = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUserProfile({
              ...data,
              email: user.email || '',
              createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
            } as UserProfile);
          } else {
            setUserProfile(null);
          }
          setLoading(false);
        }, (error) => {
          console.error("Profile sync error:", error);
          setLoading(false);
        });
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) unsubscribeProfile();
    };
  }, []);

  const ensureProfile = async (user: User, role: 'fighter' | 'fan' | 'sponsor' = 'fan') => {
    const docRef = doc(db, 'users', user.uid);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      const newPublicProfile: Record<string, unknown> = {
        displayName: user.displayName || 'Anonymous Fighter',
        role: role,
        profileImageUrl: user.photoURL || '',
        bio: '',
        record: '',
        gym: '',
        isPro: false,
        createdAt: serverTimestamp(),
      };
      
      const newPrivateInfo: Record<string, unknown> = {
        email: user.email || '',
        updatedAt: serverTimestamp()
      };

      // Batch or sequence doesn't matter much for creation here but private first
      await setDoc(doc(db, 'users', user.uid, 'private', 'info'), newPrivateInfo);
      await setDoc(docRef, newPublicProfile);
      
      setUserProfile({
        ...newPublicProfile,
        email: user.email || '',
        createdAt: Date.now()
      } as unknown as UserProfile);
    } else {
      const data = docSnap.data();
      setUserProfile({
        ...data,
        email: user.email || '',
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now())
      } as UserProfile);
    }
  };

  const loginWithGoogle = async (role: 'fighter' | 'fan' | 'sponsor' = 'fan') => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      await ensureProfile(result.user, role);
    } catch (error: unknown) {
      if (error instanceof Error && (error as unknown as { code: string }).code === 'auth/popup-closed-by-user') {
        throw new Error('LOGIN_CANCELLED');
      }
      console.error("Login failed:", error);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, password: string, displayName: string, role: 'fighter' | 'fan' | 'sponsor') => {
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(result.user, { displayName });
      await ensureProfile(result.user, role);
    } catch (error) {
      console.error("Registration failed:", error);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await ensureProfile(result.user);
    } catch (error) {
      console.error("Email login failed:", error);
      throw error;
    }
  };

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    userProfile,
    loading,
    loginWithGoogle,
    registerWithEmail,
    loginWithEmail,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
