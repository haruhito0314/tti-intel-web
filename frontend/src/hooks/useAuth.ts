import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    signInAnonymously as firebaseSignInAnonymously,
    GoogleAuthProvider,
    type User,
} from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();
const DEFAULT_ADMIN = 'tti.intel@gmail.com';

interface AuthState {
    user: User | null;
    isAdmin: boolean;
    loading: boolean;
}

export function useAuth() {
    const [authState, setAuthState] = useState<AuthState>({
        user: null,
        isAdmin: false,
        loading: true,
    });

    useEffect(() => {
        let unsubscribeAdmins: (() => void) | null = null;

        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            // Clean up previous admins listener
            if (unsubscribeAdmins) {
                unsubscribeAdmins();
                unsubscribeAdmins = null;
            }

            if (user && user.email) {
                // Check if user email exists in admins collection using email as document ID
                unsubscribeAdmins = onSnapshot(doc(db, 'admins', user.email), (docSnap) => {
                    setAuthState({
                        user,
                        isAdmin: docSnap.exists() || user.email === DEFAULT_ADMIN,
                        loading: false,
                    });
                }, () => {
                    // On error (e.g., no admins collection yet, permission denied), fall back to default admin check
                    setAuthState({ user, isAdmin: user.email === DEFAULT_ADMIN, loading: false });
                });
            } else {
                setAuthState({
                    user: null,
                    isAdmin: false,
                    loading: false,
                });
            }
        });

        return () => {
            unsubscribeAuth();
            if (unsubscribeAdmins) unsubscribeAdmins();
        };
    }, []);

    const login = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error('Login failed:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    };

    const signInAnonymously = async () => {
        try {
            await firebaseSignInAnonymously(auth);
        } catch (error) {
            console.error('Anonymous login failed:', error);
            throw error;
        }
    };

    return {
        user: authState.user,
        isAdmin: authState.isAdmin,
        loading: authState.loading,
        login,
        logout,
        signInAnonymously,
    };
}
