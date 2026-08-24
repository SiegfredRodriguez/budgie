import { writable } from "svelte/store";

export interface SnackbarState {
	show: boolean;
	message: string;
	type: "error" | "success";
}

export const snackbar = writable<SnackbarState>({ show: false, message: "", type: "error" });

export function notifyError(message: string) {
	snackbar.set({ show: true, message, type: "error" });
}

export function notifySuccess(message: string) {
	snackbar.set({ show: true, message, type: "success" });
}

export function dismissSnackbar() {
	snackbar.update((s) => ({ ...s, show: false }));
}
