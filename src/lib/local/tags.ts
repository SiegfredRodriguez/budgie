import { db } from "$lib/db";
import { supabase } from "$lib/supabase";
import { callFunction } from "$lib/api";
import { liveQueryStore } from "$lib/local/liveQueryStore";

export interface Tag {
	id: string;
	value: string;
}

/** Reactive read: re-emits whenever the local `tags` table changes, from a
 * local write, a Realtime push, or a pull-sync — all three funnel through
 * Dexie, so this is the single source of truth for the UI. */
export function observeTags() {
	return liveQueryStore(async () => {
		const rows = await db.tags.orderBy("value").toArray();
		return rows.filter((t) => !t.is_deleted).map((t) => ({ id: t.id, value: t.value }));
	}, [] as Tag[]);
}

export async function createTag(value: string): Promise<Tag> {
	const sanitized = value.toLowerCase().replace(/[^a-z0-9]/g, "");
	if (!sanitized) {
		throw new Error("Tag value must contain at least one alphanumeric character");
	}

	// The local table is a full mirror once pull-sync has run, so a
	// same-value tag is very likely already there — reuse it instead of
	// creating a visible duplicate that the server will just reject anyway.
	const existing = await db.tags.where("value").equals(sanitized).first();
	if (existing && !existing.is_deleted) {
		return { id: existing.id, value: existing.value };
	}

	const id = crypto.randomUUID();
	const now = new Date().toISOString();
	await db.tags.put({ id, value: sanitized, last_modified: now, is_deleted: false, _synced: 0 });

	pushTag(id).catch((e) => console.error("Tag sync failed, will retry:", e));

	return { id, value: sanitized };
}

/** Pushes one locally-written tag to the server. Safe to call again for a
 * row that already synced (idempotent upsert-by-id on the server side).
 * Returns the tag's canonical id, which can differ from `id` if another
 * client already created the same value first (see below). */
async function pushTag(id: string): Promise<string> {
	const row = await db.tags.get(id);
	if (!row) return id;

	const saved = await callFunction<{ id: string; value: string; last_modified: string }>(
		"create-tag",
		{ id: row.id, value: row.value },
	);

	if (saved.id !== row.id) {
		// Someone else created the same value first (e.g. another device,
		// while we were both offline) — adopt the canonical row's id.
		await db.transaction("rw", db.tags, async () => {
			await db.tags.delete(row.id);
			await db.tags.put({
				id: saved.id,
				value: saved.value,
				last_modified: saved.last_modified,
				is_deleted: false,
				_synced: 1,
			});
		});
		return saved.id;
	}

	await db.tags.update(id, { last_modified: saved.last_modified, _synced: 1 });
	return id;
}

/** Waits for a specific tag to be confirmed on the server, pushing it now
 * if it isn't already, and returns its canonical (possibly remapped) id.
 *
 * `createTag` itself is fire-and-forget by design — the tags page just
 * needs the local write to be instant, and treating a sync failure as a
 * user-facing error would be wrong when the tag *is* sitting right there
 * in the list. But a caller that's about to hand the id to a still-
 * server-authoritative write with a foreign key on it (e.g. attaching a
 * tag to a payee via the `create-payee` edge function) needs to know the
 * tag really exists server-side first, or that write fails outright. */
export async function ensureTagSynced(id: string): Promise<string> {
	const row = await db.tags.get(id);
	if (row?._synced) return id;
	return pushTag(id);
}

/** Retries any unsynced local writes, then pulls anything changed on the
 * server since the newest server-confirmed `last_modified` we have. Called
 * on init and by the reconnect/interval reconciliation loop. */
export async function pullTags(): Promise<void> {
	const unsynced = await db.tags.where("_synced").equals(0).toArray();
	for (const row of unsynced) {
		await pushTag(row.id).catch((e) => console.error("Tag retry-sync failed:", e));
	}

	// Only trust server-confirmed timestamps as the watermark — an
	// unsynced row's timestamp is a local guess, not authoritative.
	const synced = await db.tags.where("_synced").equals(1).sortBy("last_modified");
	const since = synced.length > 0 ? synced[synced.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data, error } = await supabase
		.from("tags")
		.select("id, value, last_modified, is_deleted")
		.gt("last_modified", since)
		.order("last_modified", { ascending: true });

	if (error) throw error;

	if (data && data.length > 0) {
		await db.tags.bulkPut(
			data.map((r) => ({
				id: r.id,
				value: r.value,
				last_modified: r.last_modified,
				is_deleted: r.is_deleted,
				_synced: 1 as const,
			})),
		);
	}
}
