import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    type User,
} from 'firebase/auth';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

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
                // Check if user email exists in admins collection
                const q = query(
                    collection(db, 'admins'),
                    where('email', '==', user.email)
                );
                unsubscribeAdmins = onSnapshot(q, (snapshot) => {
                    setAuthState({
                        user,
                        isAdmin: !snapshot.empty,
                        loading: false,
                    });
                }, () => {
                    // On error (e.g., no admins collection yet), fall back to not admin
                    setAuthState({ user, isAdmin: false, loading: false });
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

    return {
        user: authState.user,
        isAdmin: authState.isAdmin,
        loading: authState.loading,
        login,
        logout,
    };
}
