import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { callFunction } from "$lib/api";
import { notifyError } from "./snackbar";
import { payeesReady } from "./init";
import type { Tag } from "./tags";
import type { PayeeRow } from "$lib/types/db";

export interface Payee {
	id: string;
	label: string;
	icon: string;
	tags?: Tag[];
}

const initial: Payee[] = [];

export const payees = writable<Payee[]>(initial);
export const payeesLoading = writable(false);

function mapRow(r: PayeeRow): Payee {
	const tags: Tag[] = (r.payees_tags ?? [])
		.map((pt) => pt.tags)
		.filter((t): t is Tag => t !== null);
	return { id: r.id, label: r.label, icon: r.icon ?? "", tags };
}

export async function loadPayees() {
	payeesLoading.set(true);
	try {
		const { data, error } = await supabase
			.from("payees")
			.select("*, payees_tags(tags(*))")
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
			(payload: RealtimePostgresChangesPayload<PayeeRow>) => {
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
		notifyError("Failed to load payees");
	}
	payeesReady.set(true);
}

export async function createPayee(label: string, icon: string, tagIds: string[] = []) {
	const raw = await callFunction<PayeeRow>("create-payee", { label, icon, tagIds });
	return mapRow(raw);
}
