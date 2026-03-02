import { useState, useEffect } from 'react';
import {
    onAuthStateChanged,
    signInWithPopup,
    signOut,
    GoogleAuthProvider,
    type User,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';

// Admin email addresses - users with these emails get moderation privileges
const ADMIN_EMAILS = ['tti.intel@gmail.com'];

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
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setAuthState({
                    user,
                    isAdmin: ADMIN_EMAILS.includes(user.email || ''),
                    loading: false,
                });
            } else {
                setAuthState({
                    user: null,
                    isAdmin: false,
                    loading: false,
                });
            }
        });

        return () => unsubscribe();
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
