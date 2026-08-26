import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { db } from "$lib/db";
import { createTag as createTagLocal, pullTags } from "$lib/local/tags";
import { scheduleReconciliation } from "$lib/local/sync";
import { notifyError } from "./snackbar";
import { tagsReady } from "./init";
import type { TagRow } from "$lib/types/db";

export const tagsLoading = writable(false);
export const createTag = createTagLocal;

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;
let stopReconciliation: (() => void) | undefined;

function subscribeTags() {
	if (sub) return;
	sub = supabase
		.channel("tags-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "tags" },
			(payload: RealtimePostgresChangesPayload<TagRow & { last_modified: string; is_deleted: boolean }>) => {
				if (payload.eventType === "DELETE") {
					// Tags are never hard-deleted server-side; a DELETE payload
					// would only happen via manual intervention. Drop it locally too.
					db.tags.delete(payload.old.id as string);
					return;
				}
				const row = payload.new;
				db.tags.put({
					id: row.id,
					value: row.value,
					last_modified: row.last_modified,
					is_deleted: row.is_deleted,
					_synced: 1,
				});
			},
		)
		.subscribe();
}

export function unsubscribeTags() {
	sub?.unsubscribe();
	sub = undefined;
	stopReconciliation?.();
	stopReconciliation = undefined;
}

export async function initTags() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		tagsReady.set(true);
		return;
	}

	subscribeTags();
	tagsLoading.set(true);
	try {
		await pullTags();
	} catch (e) {
		console.error("Failed to load tags", e);
		notifyError("Failed to load tags");
	} finally {
		tagsLoading.set(false);
	}
	stopReconciliation = scheduleReconciliation(() => {
		pullTags().catch((e) => console.error("Tag reconciliation failed", e));
	});
	tagsReady.set(true);
}
