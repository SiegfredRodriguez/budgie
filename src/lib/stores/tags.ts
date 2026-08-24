import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { callFunction } from "$lib/api";
import { notifyError } from "./snackbar";
import { tagsReady } from "./init";
import type { TagRow } from "$lib/types/db";

export interface Tag {
	id: string;
	value: string;
}

const initial: Tag[] = [];

export const tags = writable<Tag[]>(initial);
export const tagsLoading = writable(false);

function mapRow(r: TagRow): Tag {
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
			(payload: RealtimePostgresChangesPayload<TagRow>) => {
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
		notifyError("Failed to load tags");
	}
	tagsReady.set(true);
}

export async function createTag(value: string) {
	const raw = await callFunction<TagRow>("create-tag", { value });
	return mapRow(raw);
}
