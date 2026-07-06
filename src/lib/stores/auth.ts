import { writable } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { dev } from '$app/environment';
import type { Session } from '@supabase/supabase-js';

export const session = writable<Session | null>(null);
export const authReady = writable(false);

export async function initAuth() {
	const { data: { session: s } } = await supabase.auth.getSession();

	if (dev) {
		if (s) {
			const { error } = await supabase.auth.getUser();
			if (error) {
				await supabase.auth.signOut();
			}
		}
		try {
			const { data } = await supabase.auth.signInWithPassword({
				email: 'dev@example.com',
				password: 'password123',
			});
			if (data.session) {
				session.set(data.session);
				authReady.set(true);
				setupListener();
				return;
			}
		} catch {
			/* dev user may not exist — user will see login page */
		}
	}

	session.set(s);
	authReady.set(true);
	setupListener();
}

function setupListener() {
	supabase.auth.onAuthStateChange((_event, s) => {
		session.set(s);
	});
}

export async function signInWithGoogle() {
	const { error } = await supabase.auth.signInWithOAuth({
		provider: 'google',
		options: {
			redirectTo: `${location.origin}/auth/callback`,
		},
	});
	if (error) throw error;
}

export async function signOut() {
	await supabase.auth.signOut();
}
