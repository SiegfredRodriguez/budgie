/**
 * Hand-written raw Supabase row shapes — this project has no generated
 * `supabase gen types` output to import instead. Each interface covers only
 * the columns its store's `mapRow()` actually reads, including realtime
 * payloads, which carry a flat row with no relational joins.
 */

export interface TagRow {
	id: string;
	value: string;
}

export interface PayeeRow {
	id: string;
	label: string;
	icon: string | null;
	// Present on a `loadPayees()` query result (joined); absent on a
	// realtime payload, which only ever carries the changed table's own row.
	payees_tags?: { tags: TagRow | null }[];
}
