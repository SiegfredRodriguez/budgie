import { readable, type Readable } from "svelte/store";
import { liveQuery } from "dexie";

/**
 * Wraps a Dexie `liveQuery` in a proper Svelte store with a synchronous
 * initial value. `liveQuery` itself only emits after its querier's promise
 * resolves, so `$` auto-subscription on it directly would leave consumers
 * reading `undefined` for at least one tick — every existing call site
 * (`$tags.filter(...)`, `$tags.length`, etc.) assumes an array is always
 * there, matching the `writable([])` stores this replaces.
 */
export function liveQueryStore<T>(querier: () => Promise<T>, initial: T): Readable<T> {
	return readable<T>(initial, (set) => {
		const sub = liveQuery(querier).subscribe({
			next: set,
			error: (e) => console.error("liveQueryStore error:", e),
		});
		return () => sub.unsubscribe();
	});
}
