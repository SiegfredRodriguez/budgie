import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { env } from "$env/dynamic/public";
import { payeesReady } from "./init";

export interface Payee {
	id: string;
	label: string;
	icon: string;
}

const initial: Payee[] = [];

export const payees = writable<Payee[]>(initial);
export const payeesLoading = writable(false);

function mapRow(r: any): Payee {
	return { id: r.id, label: r.label, icon: r.icon ?? "" };
}

export async function loadPayees() {
	payeesLoading.set(true);
	try {
		const { data, error } = await supabase
			.from("payees")
			.select("*")
			.order("label", { ascending: true });
		if (error) return;
		payees.set((data ?? []).map(mapRow));
	} finally {
		payeesLoading.set(false);
	}
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;

function subscribePayees() {
	if (sub) return;
	sub = supabase
		.channel("payees-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "payees" },
			(
				payload: RealtimePostgresChangesPayload<{
					id: string;
					label: string;
					icon: string;
				}>,
			) => {
				if (payload.eventType === "INSERT") {
					payees.update((current) => [...current, mapRow(payload.new)]);
				} else if (payload.eventType === "UPDATE") {
					payees.update((current) =>
						current.map((p) =>
							p.id === payload.new.id ? mapRow(payload.new) : p,
						),
					);
				} else if (payload.eventType === "DELETE") {
					payees.update((current) =>
						current.filter((p) => p.id !== payload.old.id),
					);
				}
			},
		)
		.subscribe();
}

export function unsubscribePayees() {
	sub?.unsubscribe();
	sub = undefined;
}

export async function initPayees() {
	subscribePayees();
	try {
		await loadPayees();
	} catch (e) {
		console.error("Failed to load payees", e);
	}
	payeesReady.set(true);
}

function authHeaders() {
	const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	return {
		"Content-Type": "application/json",
		apikey: key,
		Authorization: `Bearer ${key}`,
	};
}

export async function createPayee(label: string, icon: string) {
	const res = await fetch(
		`${env.PUBLIC_SUPABASE_URL}/functions/v1/create-payee`,
		{
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ label, icon }),
		},
	);
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
	return mapRow(await res.json());
}
