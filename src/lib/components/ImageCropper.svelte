<script lang="ts">
	import { supabase } from "$lib/supabase";

	let {
		file,
		oncrop,
		oncancel,
	}: {
		file: File;
		oncrop: (url: string) => void;
		oncancel: () => void;
	} = $props();

	let img: HTMLImageElement | null = $state(null);
	let stageEl: HTMLDivElement;
	let uploading = $state(false);

	let imgNatural = $state({ w: 0, h: 0 });
	let viewSize = $state({ w: 0, h: 0 });

	let offsetX = $state(0);
	let offsetY = $state(0);
	let dragging = $state(false);
	let dragStart = $state({ x: 0, y: 0, ox: 0, oy: 0 });

	const objectUrl = URL.createObjectURL(file);

	$effect(() => {
		return () => URL.revokeObjectURL(objectUrl);
	});

	$effect(() => {
		const el = new Image();
		el.onload = () => {
			img = el;
			imgNatural = { w: el.naturalWidth, h: el.naturalHeight };
		};
		el.src = objectUrl;
	});

	$effect(() => {
		if (!stageEl) return;
		const ro = new ResizeObserver((entries) => {
			const r = entries[0].contentRect;
			viewSize = { w: r.width, h: r.height };
		});
		ro.observe(stageEl);
		return () => ro.disconnect();
	});

	let cropSize = $derived(viewSize.w > 0 && viewSize.h > 0 ? Math.min(viewSize.w - 32, viewSize.h - 32, 512) : 0);

	let displayScale = $derived(
		img ? Math.max(cropSize / imgNatural.w, cropSize / imgNatural.h) : 1,
	);
	let dispW = $derived(imgNatural.w * displayScale);
	let dispH = $derived(imgNatural.h * displayScale);

	$effect(() => {
		if (dispW && dispH && cropSize) {
			offsetX = -dispW / 2;
			offsetY = -dispH / 2;
		}
	});

	function handlePointerDown(e: PointerEvent) {
		dragging = true;
		dragStart = { x: e.clientX, y: e.clientY, ox: offsetX, oy: offsetY };
		stageEl.setPointerCapture(e.pointerId);
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragging) return;
		offsetX = dragStart.ox + (e.clientX - dragStart.x);
		offsetY = dragStart.oy + (e.clientY - dragStart.y);
	}

	function handlePointerUp() {
		dragging = false;
	}

	async function handleCrop() {
		if (!img) return;
		uploading = true;
		const scale = imgNatural.w / dispW;
		const sourceX = (-offsetX - cropSize / 2) * scale;
		const sourceY = (-offsetY - cropSize / 2) * scale;
		const sourceSize = cropSize * scale;

		const canvas = document.createElement("canvas");
		canvas.width = 512;
		canvas.height = 512;
		const ctx = canvas.getContext("2d")!;
		ctx.drawImage(img, sourceX, sourceY, sourceSize, sourceSize, 0, 0, 512, 512);

		canvas.toBlob(async (blob) => {
			if (!blob) return;
			const ext = file.name.split(".").pop() || "png";
			const path = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
			const { error } = await supabase.storage.from("account-icons").upload(path, blob, {
				contentType: `image/${ext === "png" ? "png" : "jpeg"}`,
			});
			uploading = false;
			if (error) {
				console.error(error);
				return;
			}
			const { data } = supabase.storage.from("account-icons").getPublicUrl(path);
			oncrop(data.publicUrl);
		}, "image/png");
	}
</script>

<div class="cropper" role="dialog" aria-modal="true">
	<div
		class="stage"
		class:dragging
		bind:this={stageEl}
		onpointerdown={handlePointerDown}
		onpointermove={handlePointerMove}
		onpointerup={handlePointerUp}
		onpointercancel={handlePointerUp}
		style="touch-action: none;"
	>
		{#if img && cropSize > 0}
			<img
				src={objectUrl}
				alt=""
				draggable="false"
				style="width: {dispW}px; height: {dispH}px; transform: translate({offsetX}px, {offsetY}px);"
			/>
			<div class="crop-mask" style="width: {cropSize}px; height: {cropSize}px;" />
		{/if}
	</div>

	<div class="actions">
		<button class="btn btn-secondary" onclick={oncancel} disabled={uploading}>Cancel</button>
		<button class="btn btn-primary" onclick={handleCrop} disabled={uploading || !img || cropSize <= 0}>
			{uploading ? "..." : "Crop"}
		</button>
	</div>
</div>

<style>
	.cropper {
		position: fixed;
		inset: 0;
		z-index: 500;
		background: #000;
		display: flex;
		flex-direction: column;
	}

	.stage {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		-webkit-user-select: none;
		user-select: none;
	}

	.stage img {
		position: absolute;
		max-width: none;
		top: 50%;
		left: 50%;
		will-change: transform;
		cursor: grab;
	}

	.stage.dragging img {
		cursor: grabbing;
	}

	.crop-mask {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.55);
		border: 0.125rem solid rgba(255, 255, 255, 0.7);
		border-radius: 0.75rem;
		pointer-events: none;
		z-index: 2;
	}

	.actions {
		display: flex;
		gap: 0.75rem;
		padding: 1rem 1.5rem;
		padding-bottom: calc(1rem + env(safe-area-inset-bottom));
		background: #000;
	}

	.btn {
		flex: 1;
		height: 3rem;
		border-radius: 0.75rem;
		border: none;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		-webkit-tap-highlight-color: transparent;
		transition: opacity 0.15s;
	}

	.btn:active { opacity: 0.7; }
	.btn:disabled { opacity: 0.4; cursor: default; }

	.btn-primary {
		color: #000;
		background: var(--meta-accent);
	}

	.btn-secondary {
		color: #fff;
		background: rgba(255, 255, 255, 0.1);
	}
</style>
