<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { getBatchDetailsViaProxy } from '$lib/apis/aimby';
	import type { BatchDetailsResponse } from '$lib/apis/aimby';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import dayjs from 'dayjs';

	const i18n = getContext('i18n');

	let batchId: string | null = null;
	let batchDetails: BatchDetailsResponse | null = null;
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
		goto('/admin/aimbience/aimbience-tools');
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
					<h1 class="text-2xl font-bold text-gray-900 dark:text-white">Batch Details</h1>
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
				<div class="text-center">
					<Spinner className="w-8 h-8 mx-auto" />
					<div class="mt-4 text-gray-600 dark:text-gray-400">Loading batch details...</div>
					<div class="mt-2 text-sm text-gray-500 dark:text-gray-500">
						Fetching comprehensive metadata from Neo4j
					</div>
				</div>
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
			<!-- Success Message -->
			{#if batchDetails.status === 'batch_found'}
				<div class="max-w-6xl mx-auto mb-6">
					<div
						class="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4"
					>
						<div class="flex">
							<div class="flex-shrink-0">
								<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
							</div>
							<div class="ml-3">
								<p class="text-sm font-medium text-green-800 dark:text-green-200">
									Batch found successfully! Retrieved {Object.keys(
										batchDetails.batch_metadata || {}
									).length} metadata properties from Neo4j.
								</p>
							</div>
						</div>
					</div>
				</div>
			{/if}

			<div class="max-w-6xl mx-auto space-y-6">
				<!-- Basic Information Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h2>
					</div>
					<div class="px-6 py-4">
						<dl class="grid grid-cols-1 md:grid-cols-3 gap-6">
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
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
									Processing Status
								</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{batchDetails.processing_status || 'N/A'}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Creation Date</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{formatDate(batchDetails.creation_date)}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Source</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{batchDetails.source || 'N/A'}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Status Details</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{batchDetails.status_details || 'N/A'}
								</dd>
							</div>
						</dl>
					</div>
				</div>

				<!-- File Processing Statistics Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">
							File Processing Statistics
						</h2>
					</div>
					<div class="px-6 py-4">
						<dl class="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Total Files</dt>
								<dd class="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
									{batchDetails.total_files || batchDetails.file_count || 0}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
									Processed Files
								</dt>
								<dd class="mt-1 text-2xl font-semibold text-green-600 dark:text-green-400">
									{batchDetails.processed_files || 0}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
									Successful Files
								</dt>
								<dd class="mt-1 text-2xl font-semibold text-blue-600 dark:text-blue-400">
									{batchDetails.successful_files || 0}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Failed Files</dt>
								<dd class="mt-1 text-2xl font-semibold text-red-600 dark:text-red-400">
									{batchDetails.failed_files || 0}
								</dd>
							</div>
						</dl>
					</div>
				</div>

				<!-- Processing Timeline Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Processing Timeline</h2>
					</div>
					<div class="px-6 py-4">
						<dl class="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">
									Processing Start
								</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{formatDate(batchDetails.processing_start_time)}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Processing End</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white">
									{formatDate(batchDetails.processing_end_time)}
								</dd>
							</div>
						</dl>
					</div>
				</div>

				<!-- Error Information Card -->
				{#if batchDetails.error_message}
					<div
						class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-red-200 dark:border-red-700"
					>
						<div class="px-6 py-4 border-b border-red-200 dark:border-red-700">
							<h2 class="text-lg font-medium text-red-900 dark:text-red-100">Error Information</h2>
						</div>
						<div class="px-6 py-4">
							<div
								class="text-sm text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg"
							>
								{batchDetails.error_message}
							</div>
						</div>
					</div>
				{/if}

				<!-- Raw Metadata Card -->
				{#if batchDetails.batch_metadata}
					<div
						class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
					>
						<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<h2 class="text-lg font-medium text-gray-900 dark:text-white">Raw Batch Metadata</h2>
						</div>
						<div class="px-6 py-4">
							<pre
								class="text-sm bg-gray-50 dark:bg-gray-700 p-4 rounded-lg overflow-auto max-h-96 text-gray-900 dark:text-white">
								{JSON.stringify(batchDetails.batch_metadata, null, 2)}
							</pre>
						</div>
					</div>
				{/if}

				<!-- Additional Properties Card -->
				{#if batchDetails.additional_properties && Object.keys(batchDetails.additional_properties).length > 0}
					<div
						class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
					>
						<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
							<h2 class="text-lg font-medium text-gray-900 dark:text-white">
								Additional Properties
							</h2>
						</div>
						<div class="px-6 py-4">
							<dl class="grid grid-cols-1 md:grid-cols-2 gap-4">
								{#each Object.entries(batchDetails.additional_properties) as [key, value]}
									<div>
										<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">{key}</dt>
										<dd class="mt-1 text-sm text-gray-900 dark:text-white">
											{typeof value === 'object' ? JSON.stringify(value) : String(value)}
										</dd>
									</div>
								{/each}
							</dl>
						</div>
					</div>
				{/if}

				<!-- Actions Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Actions</h2>
					</div>
					<div class="px-6 py-4">
						<div class="flex gap-3 items-center">
							<button
								on:click={fetchBatchDetails}
								class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
									/>
								</svg>
								Refresh Details
							</button>
							<button
								on:click={goBack}
								class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
							>
								Back to Aimbience Tools
							</button>
							{#if batchDetails?.timestamp}
								<div class="ml-auto text-sm text-gray-500 dark:text-gray-400">
									Last updated: {formatDate(batchDetails.timestamp)}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="text-gray-500 dark:text-gray-400 text-lg mb-4">No batch details found</div>
				<button
					on:click={goBack}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Back to Aimbience Tools
				</button>
			</div>
		{/if}
	</div>
</div>
