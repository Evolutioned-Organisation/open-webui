<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { getBatchDetailsViaProxy } from '$lib/apis/aimby';
	import type { BatchListItem } from '$lib/apis/aimby';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import dayjs from 'dayjs';

	const i18n = getContext('i18n');

	let batchId: string | null = null;
	let batchDetails: any = null;
	let loading = true;
	let error: string | null = null;

	onMount(async () => {
		// Get batch ID from URL parameters
		batchId = $page.url.searchParams.get('id');
		
		if (!batchId) {
			toast.error('No batch ID provided');
			goto('/admin/aimbience');
			return;
		}

		await fetchBatchDetails();
	});

	async function fetchBatchDetails() {
		loading = true;
		error = null;
		
		try {
			const details = await getBatchDetailsViaProxy(localStorage.token || '', batchId);
			if (details) {
				batchDetails = details;
				toast.success('Batch details loaded successfully');
			} else {
				error = 'Failed to load batch details';
				toast.error('Failed to load batch details');
			}
		} catch (err) {
			console.error('Error fetching batch details:', err);
			error = 'Error loading batch details';
			toast.error('Error loading batch details');
		} finally {
			loading = false;
		}
	}

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

	function goBack() {
		goto('/admin/aimbience');
	}
</script>

<svelte:head>
	<title>Batch Details - {batchId || 'Loading...'} • Open WebUI</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
		<div class="px-6 py-4">
			<div class="flex items-center gap-4">
				<button
					on:click={goBack}
					class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
					aria-label="Go back"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>
				
				<div>
					<h1 class="text-2xl font-bold text-gray-900 dark:text-white">
						Batch Details
					</h1>
					<p class="text-sm text-gray-600 dark:text-gray-400">
						{batchId ? `ID: ${batchId}` : 'Loading...'}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="px-6 py-8">
		{#if loading}
			<div class="flex items-center justify-center py-12">
				<Spinner className="w-8 h-8" />
				<span class="ml-3 text-gray-600 dark:text-gray-400">Loading batch details...</span>
			</div>
		{:else if error}
			<div class="text-center py-12">
				<div class="text-red-600 dark:text-red-400 text-lg mb-4">{error}</div>
				<button
					on:click={fetchBatchDetails}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Try Again
				</button>
			</div>
		{:else if batchDetails}
			<div class="max-w-4xl mx-auto space-y-6">
				<!-- Basic Information Card -->
				<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h2>
					</div>
					<div class="px-6 py-4">
						<dl class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Batch ID</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all">
									{batchDetails.batch_id}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Status</dt>
								<dd class="mt-1">
									<Badge 
										type={getStatusType(batchDetails.status)} 
										content={batchDetails.status || 'Unknown'} 
									/>
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">File Count</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{batchDetails.file_count || 0}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Source</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{batchDetails.source || 'N/A'}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Creation Date</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{formatDate(batchDetails.creation_date)}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Processing Status</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{batchDetails.processing_status || 'N/A'}
								</dd>
							</div>
						</dl>
					</div>
				</div>

				<!-- Metadata Card -->
				{#if batchDetails.batch_metadata}
					<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
						<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<h2 class="text-lg font-medium text-gray-900 dark:text-white">Additional Metadata</h2>
						</div>
						<div class="px-6 py-4">
							<pre class="text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg overflow-auto max-h-96 text-gray-900 dark:text-white">
								{JSON.stringify(batchDetails.batch_metadata, null, 2)}
							</pre>
						</div>
					</div>
				{/if}

				<!-- Actions Card -->
				<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Actions</h2>
					</div>
					<div class="px-6 py-4">
						<div class="flex gap-3">
							<button
								on:click={fetchBatchDetails}
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
							>
								Refresh Details
							</button>
							<button
								on:click={goBack}
								class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
							>
								Back to Aimbience
							</button>
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="text-gray-500 dark:text-gray-400 text-lg mb-4">
					No batch details found
				</div>
				<button
					on:click={goBack}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Back to Aimbience
				</button>
			</div>
		{/if}
	</div>
</div>
