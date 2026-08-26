import { writable } from "svelte/store";
import { supabase } from "$lib/supabase";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { db } from "$lib/db";
import {
	createAccount as createAccountLocal,
	deleteAccount as deleteAccountLocal,
	topUpAccount as topUpAccountLocal,
	transferAccount as transferAccountLocal,
	pullAccounts,
} from "$lib/local/accounts";
import { processPendingLedgerOps } from "$lib/local/ledger";
import { scheduleReconciliation } from "$lib/local/sync";
import { notifyError } from "./snackbar";
import { accountsReady } from "./init";

export const accountsLoading = writable(false);

let currentUserId: string | undefined;

export async function addAccount(account: { label: string; icon: string; currency: string; balance: number }) {
	if (!currentUserId) throw new Error("Not signed in");
	return createAccountLocal(account.label, account.icon, account.currency, account.balance, currentUserId);
}

export async function deleteAccount(id: string) {
	await deleteAccountLocal(id);
}

export async function topUpAccount(id: string, amount: number, currency: string) {
	await topUpAccountLocal(id, amount, currency);
}

export async function transferAccount(fromId: string, toId: string, amount: number, currency: string) {
	await transferAccountLocal(fromId, toId, amount, currency);
}

let sub: Awaited<ReturnType<typeof supabase.channel>> | undefined;
let stopReconciliation: (() => void) | undefined;

interface AccountRealtimeRow {
	id: string;
	name: string;
	icon: string;
	currency: string;
	balance: number;
	user_id: string;
	created_at: string;
	last_modified: string;
	is_deleted: boolean;
}

interface TransactionRealtimeRow {
	id: string;
	account_id: string;
	type: string;
	amount: number;
	currency: string;
	description: string | null;
	created_at: string;
	last_modified: string;
}

function subscribeAccounts() {
	if (sub) return;
	sub = supabase
		.channel("accounts-changes")
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "accounts" },
			(payload: RealtimePostgresChangesPayload<AccountRealtimeRow>) => {
				if (payload.eventType === "DELETE") {
					db.accounts.delete(payload.old.id as string);
					return;
				}
				const row = payload.new;
				db.accounts.put({
					id: row.id,
					name: row.name,
					icon: row.icon ?? "",
					currency: row.currency,
					balance: row.balance,
					user_id: row.user_id,
					created_at: row.created_at,
					last_modified: row.last_modified,
					is_deleted: row.is_deleted,
					_synced: 1,
				});
			},
		)
		.on(
			"postgres_changes",
			{ event: "*", schema: "public", table: "transactions" },
			(payload: RealtimePostgresChangesPayload<TransactionRealtimeRow>) => {
				if (payload.eventType === "DELETE") {
					db.transactions.delete(payload.old.id as string);
					return;
				}
				const row = payload.new;
				db.transactions.put({
					id: row.id,
					operation_id: row.id,
					account_id: row.account_id,
					type: row.type,
					amount: row.amount,
					currency: row.currency,
					description: row.description,
					created_at: row.created_at,
					last_modified: row.last_modified,
					_synced: 1,
				});
			},
		)
		.subscribe();
}

export function unsubscribeAccounts() {
	sub?.unsubscribe();
	sub = undefined;
	stopReconciliation?.();
	stopReconciliation = undefined;
}

export async function initAccounts() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) {
		accountsReady.set(true);
		return;
	}
	currentUserId = session.user.id;

	subscribeAccounts();
	accountsLoading.set(true);
	try {
		await pullAccounts(currentUserId);
		await processPendingLedgerOps();
	} catch (e) {
		console.error("Failed to load accounts", e);
		notifyError("Failed to load accounts");
	} finally {
		accountsLoading.set(false);
	}
	stopReconciliation = scheduleReconciliation(async () => {
		if (!currentUserId) return;
		try {
			await pullAccounts(currentUserId);
			await processPendingLedgerOps();
		} catch (e) {
			console.error("Account reconciliation failed", e);
		}
	});
	accountsReady.set(true);
}
