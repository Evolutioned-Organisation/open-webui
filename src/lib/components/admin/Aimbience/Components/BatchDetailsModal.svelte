<script lang="ts">
	import { getContext } from 'svelte';
	import Modal from '$lib/components/common/Modal.svelte';
	import XMark from '$lib/components/icons/XMark.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import dayjs from 'dayjs';

	const i18n = getContext('i18n');

	export let show = false;
	export let batchDetails: any = null;

	function formatDate(dateString?: string) {
		if (!dateString) return 'N/A';
		try {
			return dayjs(dateString).format('LLL');
		} catch {
			return 'Invalid Date';
		}
	}

	function getStatusType(status?: string) {
		if (!status) return 'muted';
		switch (status.toLowerCase()) {
			case 'completed':
			case 'success':
				return 'success';
			case 'processing':
			case 'pending':
				return 'warning';
			case 'failed':
			case 'error':
				return 'error';
			default:
				return 'muted';
		}
	}
</script>

<Modal size="lg" bind:show>
	<div>
		<div class="flex justify-between dark:text-gray-300 px-5 pt-4 pb-2">
			<div class="text-lg font-medium self-center">
				Batch Details
			</div>
			<button
				class="self-center"
				on:click={() => {
					show = false;
				}}
			>
				<XMark className="size-5" />
			</button>
		</div>

		{#if batchDetails}
			<div class="px-6 pb-5">
				<!-- Basic Information -->
				<div class="mb-6">
					<h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Basic Information</h3>
					<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Batch ID</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">
								{batchDetails.batch_id}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Status</dt>
							<dd class="mt-1">
								<Badge 
									type={getStatusType(batchDetails.status)} 
									content={batchDetails.status || 'Unknown'} 
								/>
							</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">File Count</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{batchDetails.file_count || 0}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Source</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{batchDetails.source || 'N/A'}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Creation Date</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{formatDate(batchDetails.creation_date)}
							</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Processing Status</dt>
							<dd class="mt-1 text-sm text-gray-900 dark:text-white">
								{batchDetails.processing_status || 'N/A'}
							</dd>
						</div>
					</dl>
				</div>

				<!-- Additional Metadata -->
				{#if batchDetails.batch_metadata}
					<div class="mb-6">
						<h3 class="text-sm font-medium text-gray-900 dark:text-white mb-3">Additional Metadata</h3>
						<pre class="text-xs bg-gray-50 dark:bg-gray-700 p-3 rounded-lg overflow-auto max-h-48 text-gray-900 dark:text-white">
							{JSON.stringify(batchDetails.batch_metadata, null, 2)}
						</pre>
					</div>
				{/if}

				<!-- Actions -->
				<div class="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
					<a
						href={`/admin/aimbience/batch-details?id=${encodeURIComponent(batchDetails.batch_id)}`}
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
					>
						Open Full Details
					</a>
					<button
						on:click={() => show = false}
						class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
					>
						Close
					</button>
				</div>
			</div>
		{:else}
			<div class="px-6 pb-5 text-center py-8">
				<div class="text-gray-500 dark:text-gray-400 text-sm">
					No batch details available
				</div>
			</div>
		{/if}
	</div>
</Modal>
