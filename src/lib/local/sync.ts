/**
 * Runs `fn` again whenever the browser regains connectivity, and on a
 * coarse interval as a safety net (in case an `online` event is missed —
 * e.g. a connection that degrades without ever firing `offline`). Does
 * NOT run `fn` immediately — call it once yourself for the initial load,
 * this only wires up the ongoing triggers. Used by each entity's init to
 * retry unsynced local writes and pull anything changed elsewhere since
 * the last watermark.
 */
export function scheduleReconciliation(fn: () => void, intervalMs = 3 * 60 * 1000): () => void {
	const onOnline = () => fn();
	window.addEventListener("online", onOnline);
	const interval = setInterval(fn, intervalMs);
	return () => {
		window.removeEventListener("online", onOnline);
		clearInterval(interval);
	};
}
