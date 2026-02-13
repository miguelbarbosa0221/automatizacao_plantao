
'use client';

import React, { DependencyList, createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { FirebaseApp } from 'firebase/app';
import { Firestore, doc, onSnapshot } from 'firebase/firestore';
import { Auth, User, onAuthStateChanged } from 'firebase/auth';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener'

interface FirebaseProviderProps {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

interface UserAuthState {
  user: User | null;
  profile: any | null;
  isAdmin: boolean;
  isUserLoading: boolean;
  userError: Error | null;
  activeCompanyId: string | null;
}

export interface FirebaseContextState extends UserAuthState {
  areServicesAvailable: boolean;
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

export interface FirebaseServicesAndUser extends UserAuthState {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

export interface UserHookResult extends UserAuthState {}

export const FirebaseContext = createContext<FirebaseContextState | undefined>(undefined);

export const FirebaseProvider: React.FC<FirebaseProviderProps> = ({
  children,
  firebaseApp,
  firestore,
  auth,
}) => {
  const [authState, setAuthState] = useState<UserAuthState>({
    user: null,
    profile: null,
    isAdmin: false,
    isUserLoading: true,
    userError: null,
    activeCompanyId: null,
  });

  useEffect(() => {
    if (!auth || !firestore) return;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        if (firebaseUser) {
          const profileRef = doc(firestore, 'users', firebaseUser.uid, 'profile', 'profileDoc');
          
          const unsubscribeProfile = onSnapshot(profileRef, (snap) => {
            if (snap.exists()) {
              const profileData = snap.data();
              const companies = profileData?.companies || [];
              const activeCoId = profileData?.activeCompanyId || (companies[0]?.id) || null;
              
              const currentCompany = companies.find((c: any) => c.id === activeCoId);
              const userIsAdmin = currentCompany?.role === 'admin';

              setAuthState({
                user: firebaseUser,
                profile: profileData,
                isAdmin: userIsAdmin,
                activeCompanyId: activeCoId,
                isUserLoading: false,
                userError: null,
              });
            } else {
              setAuthState(prev => ({
                ...prev,
                user: firebaseUser,
                profile: null,
                isAdmin: false,
                activeCompanyId: null,
                isUserLoading: false,
                userError: null
              }));
            }
          }, (err) => {
             setAuthState(prev => ({
               ...prev,
               user: firebaseUser,
               isUserLoading: false,
               userError: err as any
             }));
          });
          return () => unsubscribeProfile();
        } else {
          setAuthState({ user: null, profile: null, isAdmin: false, isUserLoading: false, userError: null, activeCompanyId: null });
        }
      },
      (error) => {
        setAuthState({ user: null, profile: null, isAdmin: false, isUserLoading: false, userError: error, activeCompanyId: null });
      }
    );
    return () => unsubscribeAuth();
  }, [auth, firestore]);

  const contextValue = useMemo((): FirebaseContextState => {
    const servicesAvailable = !!(firebaseApp && firestore && auth);
    return {
      areServicesAvailable: servicesAvailable,
      firebaseApp: servicesAvailable ? firebaseApp : null,
      firestore: servicesAvailable ? firestore : null,
      auth: servicesAvailable ? auth : null,
      ...authState,
    };
  }, [firebaseApp, firestore, auth, authState]);

  return (
    <FirebaseContext.Provider value={contextValue}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = (): FirebaseServicesAndUser => {
  const context = useContext(FirebaseContext);
  if (context === undefined) throw new Error('useFirebase must be used within a FirebaseProvider.');
  if (!context.areServicesAvailable || !context.firebaseApp || !context.firestore || !context.auth) {
    throw new Error('Firebase core services not available.');
  }
  return {
    firebaseApp: context.firebaseApp,
    firestore: context.firestore,
    auth: context.auth,
    user: context.user,
    profile: context.profile,
    isAdmin: context.isAdmin,
    activeCompanyId: context.activeCompanyId,
    isUserLoading: context.isUserLoading,
    userError: context.userError,
  };
};

export const useFirebaseApp = () => useFirebase().firebaseApp;
export const useFirestore = () => useFirebase().firestore;
export const useAuth = () => useFirebase().auth;

export function useMemoFirebase<T>(factory: () => T, deps: DependencyList): T & {__memo?: boolean} {
  const memoized = useMemo(factory, deps);
  if (memoized && typeof memoized === 'object') {
    (memoized as any).__memo = true;
  }
  return memoized as any;
}

export const useUser = (): UserHookResult => {
  const { user, profile, isAdmin, activeCompanyId, isUserLoading, userError } = useFirebase();
  return { user, profile, isAdmin, activeCompanyId, isUserLoading, userError };
};
