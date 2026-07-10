import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { env } from "$env/dynamic/public";
import { tagsReady } from "./init";

export interface Tag {
	id: string;
	value: string;
}

const initial: Tag[] = [];

export const tags = writable<Tag[]>(initial);
export const tagsLoading = writable(false);

function mapRow(r: any): Tag {
	return { id: r.id, value: r.value };
}

export async function loadTags() {
	tagsLoading.set(true);
	try {
		const { data, error } = await supabase
			.from("tags")
			.select("*")
			.order("value", { ascending: true });
		if (error) return;
		tags.set((data ?? []).map(mapRow));
	} finally {
		tagsLoading.set(false);
	}
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;

function subscribeTags() {
	if (sub) return;
	sub = supabase
		.channel("tags-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "tags" },
			(
				payload: RealtimePostgresChangesPayload<{
					id: string;
					value: string;
				}>,
			) => {
				if (payload.eventType === "INSERT") {
					tags.update((current) => [...current, mapRow(payload.new)]);
				} else if (payload.eventType === "UPDATE") {
					tags.update((current) =>
						current.map((t) =>
							t.id === payload.new.id ? mapRow(payload.new) : t,
						),
					);
				} else if (payload.eventType === "DELETE") {
					tags.update((current) =>
						current.filter((t) => t.id !== payload.old.id),
					);
				}
			},
		)
		.subscribe();
}

export function unsubscribeTags() {
	sub?.unsubscribe();
	sub = undefined;
}

export async function initTags() {
	subscribeTags();
	try {
		await loadTags();
	} catch (e) {
		console.error("Failed to load tags", e);
	}
	tagsReady.set(true);
}

function authHeaders() {
	const key = env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;
	return {
		"Content-Type": "application/json",
		apikey: key,
		Authorization: `Bearer ${key}`,
	};
}

export async function createTag(value: string, userId: string) {
	const res = await fetch(
		`${env.PUBLIC_SUPABASE_URL}/functions/v1/create-tag`,
		{
			method: "POST",
			headers: authHeaders(),
			body: JSON.stringify({ value, user_id: userId }),
		},
	);
	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error);
	}
	return mapRow(await res.json());
}
