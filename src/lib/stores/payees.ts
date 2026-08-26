import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { db } from "$lib/db";
import { createPayee as createPayeeLocal, pullPayees } from "$lib/local/payees";
import { scheduleReconciliation } from "$lib/local/sync";
import { notifyError } from "./snackbar";
import { payeesReady } from "./init";
import type { PayeeRow } from "$lib/types/db";

export const payeesLoading = writable(false);

let currentUserId: string | undefined;

export async function createPayee(label: string, icon: string, tagIds: string[] = []) {
	if (!currentUserId) throw new Error("Not signed in");
	return createPayeeLocal(label, icon, tagIds, currentUserId);
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;
let stopReconciliation: (() => void) | undefined;

function subscribePayees() {
	if (sub) return;
	sub = supabase
		.channel("payees-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "payees" },
			(payload: RealtimePostgresChangesPayload<PayeeRow & { user_id: string; last_modified: string; is_deleted: boolean }>) => {
				if (payload.eventType === "DELETE") {
					db.payees.delete(payload.old.id as string);
					return;
				}
				const row = payload.new;
				db.payees.put({
					id: row.id,
					label: row.label,
					icon: row.icon ?? "",
					user_id: row.user_id,
					last_modified: row.last_modified,
					is_deleted: row.is_deleted,
					_synced: 1,
				});
			},
		)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "payees_tags" },
			(payload: RealtimePostgresChangesPayload<{ payee_id: string; tag_id: string; last_modified: string }>) => {
				if (payload.eventType === "DELETE") {
					db.payeesTags.delete([payload.old.payee_id as string, payload.old.tag_id as string]);
					return;
				}
				const row = payload.new;
				db.payeesTags.put({ payee_id: row.payee_id, tag_id: row.tag_id, last_modified: row.last_modified, _synced: 1 });
			},
		)
		.subscribe();
}

export function unsubscribePayees() {
	sub?.unsubscribe();
	sub = undefined;
	stopReconciliation?.();
	stopReconciliation = undefined;
}

export async function initPayees() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		payeesReady.set(true);
		return;
	}
	currentUserId = session.user.id;

	subscribePayees();
	payeesLoading.set(true);
	try {
		await pullPayees(currentUserId);
	} catch (e) {
		console.error("Failed to load payees", e);
		notifyError("Failed to load payees");
	} finally {
		payeesLoading.set(false);
	}
	stopReconciliation = scheduleReconciliation(() => {
		if (currentUserId) pullPayees(currentUserId).catch((e) => console.error("Payee reconciliation failed", e));
	});
	payeesReady.set(true);
}
