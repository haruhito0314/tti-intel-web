import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    type User,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();
const DEFAULT_ADMIN = 'tti.intel@gmail.com';

function normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
}

function isDefaultAdmin(email: string): boolean {
    return normalizeEmail(email) === DEFAULT_ADMIN;
}

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
            if (unsubscribeAdmins) {
                unsubscribeAdmins();
                unsubscribeAdmins = null;
            }

            if (user?.email) {
                const adminEmail = normalizeEmail(user.email);
                unsubscribeAdmins = onSnapshot(
                    doc(db, 'admins', adminEmail),
                    (docSnap) => {
                        setAuthState({
                            user,
                            isAdmin: docSnap.exists() || isDefaultAdmin(user.email!),
                            loading: false,
                        });
                    },
                    () => {
                        void getDoc(doc(db, 'admins', adminEmail))
                            .then((docSnap) => {
                                setAuthState({
                                    user,
                                    isAdmin: docSnap.exists() || isDefaultAdmin(user.email!),
                                    loading: false,
                                });
                            })
                            .catch(() => {
                                setAuthState({
                                    user,
                                    isAdmin: isDefaultAdmin(user.email!),
                                    loading: false,
                                });
                            });
                    },
                );
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
