import { db } from "$lib/db";
import { supabase } from "$lib/supabase";
import { callFunction } from "$lib/api";
import { liveQueryStore } from "$lib/local/liveQueryStore";
import type { Tag } from "$lib/local/tags";

export interface Payee {
	id: string;
	label: string;
	icon: string;
	tags: Tag[];
}

/** Reactive read: joins the local `payees`/`payeesTags`/`tags` tables — all
 * three funnel local writes, Realtime pushes, and pull-sync through Dexie,
 * so this is the single source of truth for the UI.
 *
 * Deliberately takes no `userId` param and re-resolves it via
 * `supabase.auth.getSession()` on every run instead of trusting a value
 * the caller captured once at mount: a route component's top-level script
 * can run before `+layout.svelte`'s own async session fetch has resolved
 * (the layout renders its child route immediately, session or not — the
 * splash screen is what actually gates visible interactivity), so a
 * userId frozen at that moment can still be `undefined`. `getSession()`
 * itself doesn't depend on that layout's fetch completing — it reads the
 * client's own session state directly — so re-checking it here is safe on
 * the very first run, not just on later ones. */
export function observePayees() {
	return liveQueryStore(async () => {
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const userId = session?.user.id;
		// Read the whole table (not an indexed userId query) so Dexie always
		// tracks a dependency on it, even on a run where userId came back
		// undefined — otherwise a later write (e.g. the initial pull-sync
		// landing) wouldn't be guaranteed to retrigger this liveQuery.
		const [payees, links, tags] = await Promise.all([
			db.payees.toArray(),
			db.payeesTags.toArray(),
			db.tags.toArray(),
		]);
		const tagById = new Map(tags.map((t) => [t.id, t]));
		const linksByPayee = new Map<string, string[]>();
		for (const link of links) {
			const list = linksByPayee.get(link.payee_id) ?? [];
			list.push(link.tag_id);
			linksByPayee.set(link.payee_id, list);
		}
		return payees
			.filter((p) => !p.is_deleted && p.user_id === userId)
			.sort((a, b) => a.label.localeCompare(b.label))
			.map((p) => ({
				id: p.id,
				label: p.label,
				icon: p.icon,
				tags: (linksByPayee.get(p.id) ?? [])
					.map((tagId) => tagById.get(tagId))
					.filter((t): t is (typeof tags)[number] => t !== undefined && !t.is_deleted)
					.map((t) => ({ id: t.id, value: t.value })),
			}));
	}, [] as Payee[]);
}

export async function createPayee(
	label: string,
	icon: string,
	tagIds: string[],
	userId: string,
): Promise<Payee> {
	const trimmed = label.trim();
	if (!trimmed) throw new Error("label is required");

	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	await db.transaction("rw", [db.payees, db.payeesTags], async () => {
		await db.payees.put({ id, label: trimmed, icon: icon ?? "", user_id: userId, last_modified: now, is_deleted: false, _synced: 0 });
		for (const tagId of tagIds) {
			await db.payeesTags.put({ payee_id: id, tag_id: tagId, last_modified: now, _synced: 0 });
		}
	});

	pushPayee(id).catch((e) => console.error("Payee sync failed, will retry:", e));

	const tags = await db.tags.where("id").anyOf(tagIds.length > 0 ? tagIds : [""]).toArray();
	return { id, label: trimmed, icon: icon ?? "", tags: tags.map((t) => ({ id: t.id, value: t.value })) };
}

/** Pushes one locally-written payee (and its tag links) to the server.
 * Safe to call again for a row that already synced. */
async function pushPayee(id: string): Promise<void> {
	const row = await db.payees.get(id);
	if (!row) return;
	const links = await db.payeesTags.where("payee_id").equals(id).toArray();

	const saved = await callFunction<{ id: string; label: string; icon: string; last_modified: string }>(
		"create-payee",
		{ id: row.id, label: row.label, icon: row.icon, tagIds: links.map((l) => l.tag_id) },
	);

	await db.transaction("rw", [db.payees, db.payeesTags], async () => {
		await db.payees.update(id, { last_modified: saved.last_modified, _synced: 1 });
		for (const link of links) {
			await db.payeesTags.update([link.payee_id, link.tag_id], { _synced: 1 });
		}
	});
}

/** Waits for a specific payee to be confirmed on the server and returns
 * its id — needed before handing it to a still-server-authoritative write
 * with a foreign key on it (e.g. `create-expense`'s `payee_id`, until
 * expenses go local-first too). Mirrors `ensureTagSynced` in local/tags.ts. */
export async function ensurePayeeSynced(id: string): Promise<string> {
	const row = await db.payees.get(id);
	if (row?._synced) return id;
	await pushPayee(id);
	return id;
}

/** Retries any unsynced local writes, then pulls anything changed on the
 * server since the newest server-confirmed `last_modified` we have. Called
 * on init and by the reconnect/interval reconciliation loop. */
export async function pullPayees(userId: string): Promise<void> {
	const unsyncedPayees = await db.payees.where("_synced").equals(0).toArray();
	for (const row of unsyncedPayees) {
		await pushPayee(row.id).catch((e) => console.error("Payee retry-sync failed:", e));
	}

	const syncedPayees = await db.payees.where("_synced").equals(1).sortBy("last_modified");
	const since = syncedPayees.length > 0 ? syncedPayees[syncedPayees.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data: payeeRows, error: payeeError } = await supabase
		.from("payees")
		.select("id, label, icon, user_id, last_modified, is_deleted")
		.eq("user_id", userId)
		.gt("last_modified", since)
		.order("last_modified", { ascending: true });
	if (payeeError) throw payeeError;

	if (payeeRows && payeeRows.length > 0) {
		await db.payees.bulkPut(
			payeeRows.map((r) => ({
				id: r.id,
				label: r.label,
				icon: r.icon ?? "",
				user_id: r.user_id,
				last_modified: r.last_modified,
				is_deleted: r.is_deleted,
				_synced: 1 as const,
			})),
		);
	}

	// payees_tags has no user_id of its own — pull by joining through
	// payees, same ownership rule RLS already enforces server-side.
	const syncedLinks = await db.payeesTags.where("_synced").equals(1).sortBy("last_modified");
	const linksSince = syncedLinks.length > 0 ? syncedLinks[syncedLinks.length - 1].last_modified : "1970-01-01T00:00:00Z";

	const { data: linkRows, error: linkError } = await supabase
		.from("payees_tags")
		.select("payee_id, tag_id, last_modified, payees!inner(user_id)")
		.eq("payees.user_id", userId)
		.gt("last_modified", linksSince)
		.order("last_modified", { ascending: true });
	if (linkError) throw linkError;

	if (linkRows && linkRows.length > 0) {
		await db.payeesTags.bulkPut(
			linkRows.map((r) => ({
				payee_id: r.payee_id,
				tag_id: r.tag_id,
				last_modified: r.last_modified,
				_synced: 1 as const,
			})),
		);
	}
}
