<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getAimbienceConfig, syncWorkflows, getWorkflowsStatus } from '$lib/apis/auths';

	// Context for logging
	const logDebug = getContext('logDebug');

	// State
	let loading = false;
	let syncing = false;
	let lastSyncResult: any = null;
	let workflowsStatus: any = null;
	let showDetailedResults = false;

	// Debug reactive variables
	$: console.log('🔄 Reactive update - lastSyncResult:', lastSyncResult);
	$: console.log('🔄 Reactive update - workflowsStatus:', workflowsStatus);

	// Sync workflows from repository
	const handleSyncWorkflows = async () => {
		syncing = true;
		try {
			console.log('🔄 Starting workflow sync...');

			// Call the Open WebUI backend API which proxies to aimby-api
			const syncResponse = await syncWorkflows(localStorage.token);
			console.log('📦 Workflow sync response:', syncResponse);

			if (syncResponse) {
				lastSyncResult = syncResponse;
				toast.success('Workflow sync completed successfully');

				// Refresh workflow status after sync
				await fetchWorkflowsStatus();
			} else {
				toast.error('Failed to sync workflows');
			}
		} catch (error) {
			console.error('❌ Error syncing workflows:', error);
			toast.error('Failed to sync workflows');
		} finally {
			syncing = false;
		}
	};

	// Fetch workflows status
	const fetchWorkflowsStatus = async () => {
		loading = true;
		try {
			console.log('🔄 Fetching workflows status...');

			// Call the Open WebUI backend API which proxies to aimby-api
			const statusResponse = await getWorkflowsStatus(localStorage.token);
			console.log('📊 Workflows status response:', statusResponse);

			if (statusResponse) {
				workflowsStatus = statusResponse;
			}
		} catch (error) {
			console.error('❌ Error fetching workflows status:', error);
			toast.error('Failed to fetch workflows status');
		} finally {
			loading = false;
		}
	};

	// Get sync status badge
	const getSyncStatusBadge = () => {
		if (!lastSyncResult) {
			return {
				text: 'Not Synced',
				class: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
			};
		}

		const status = lastSyncResult.status;
		if (status === 'success') {
			return {
				text: 'Synced Successfully',
				class: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
			};
		} else if (status === 'partial_success') {
			return {
				text: 'Partially Synced',
				class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
			};
		} else {
			return {
				text: 'Sync Failed',
				class: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
			};
		}
	};

	// Format sync result message
	const formatSyncMessage = () => {
		if (!lastSyncResult) return 'No sync operation performed yet.';

		const { status, message, sync_summary } = lastSyncResult;

		let formattedMessage = message;

		if (sync_summary) {
			const { total_successful, total_failed, total_workflows_discovered } = sync_summary;
			formattedMessage += ` (${total_successful} successful, ${total_failed} failed out of ${total_workflows_discovered} total)`;
		}

		return formattedMessage;
	};

	onMount(() => {
		fetchWorkflowsStatus();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white">Workflow Sync</h2>
			<p class="text-sm text-gray-600 dark:text-gray-400">
				Sync workflows from the installed rag_workflows_pkg package and upload to pipeline service
			</p>
		</div>
	</div>

	<!-- Sync Status Card -->
	<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
		<div class="flex items-center justify-between mb-4">
			<h3 class="text-md font-medium text-gray-900 dark:text-white">Sync Status</h3>
			<span
				class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getSyncStatusBadge()
					.class}"
			>
				{getSyncStatusBadge().text}
			</span>
		</div>

		{#if lastSyncResult}
			<div class="space-y-4">
				<!-- Overall Status -->
				<div class="text-sm text-gray-600 dark:text-gray-400">
					<strong>Message:</strong>
					{formatSyncMessage()}
				</div>

				<!-- Discovery Summary -->
				{#if lastSyncResult.discovery_summary}
					<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
						<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
							🔍 Discovery Summary
						</h4>
						<div class="grid grid-cols-2 gap-4 text-xs">
							<div>
								<span class="text-gray-500 dark:text-gray-400">Total Found:</span>
								<span class="ml-2 font-medium"
									>{lastSyncResult.discovery_summary.total_discovered}</span
								>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Unique:</span>
								<span class="ml-2 font-medium"
									>{lastSyncResult.discovery_summary.unique_workflows}</span
								>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Duplicates:</span>
								<span class="ml-2 font-medium"
									>{lastSyncResult.discovery_summary.duplicate_count}</span
								>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Status:</span>
								<span class="ml-2 font-medium capitalize">{lastSyncResult.status}</span>
							</div>
						</div>

						{#if lastSyncResult.discovery_summary.duplicates && lastSyncResult.discovery_summary.duplicates.length > 0}
							<div class="mt-2 text-xs text-gray-500 dark:text-gray-400">
								<strong>Duplicate Workflows:</strong>
								{lastSyncResult.discovery_summary.duplicates.join(', ')}
							</div>
						{/if}
					</div>
				{/if}

				<!-- Sync Summary -->
				{#if lastSyncResult.sync_summary}
					<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
						<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">📊 Sync Summary</h4>
						<div class="grid grid-cols-2 gap-4 text-xs">
							<div>
								<span class="text-gray-500 dark:text-gray-400">Conversions:</span>
								<span class="ml-2 font-medium"
									>{lastSyncResult.sync_summary.successful_conversions} ✅ / {lastSyncResult
										.sync_summary.failed_conversions} ❌</span
								>
							</div>
							<div>
								<span class="text-gray-500 dark:text-gray-400">Uploads:</span>
								<span class="ml-2 font-medium"
									>{lastSyncResult.sync_summary.successful_uploads} ✅ / {lastSyncResult
										.sync_summary.failed_uploads} ❌</span
								>
							</div>
							<div class="col-span-2">
								<span class="text-gray-500 dark:text-gray-400">Total Result:</span>
								<span class="ml-2 font-medium text-lg"
									>{lastSyncResult.sync_summary.total_successful} ✅ / {lastSyncResult.sync_summary
										.total_failed} ❌</span
								>
							</div>
						</div>
					</div>
				{/if}

				<!-- Individual Workflow Details Toggle -->
				{#if lastSyncResult.workflow_details && Object.keys(lastSyncResult.workflow_details).length > 0}
					<div class="flex items-center justify-between">
						<button
							on:click={() => (showDetailedResults = !showDetailedResults)}
							class="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1"
						>
							{#if showDetailedResults}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 15l7-7 7 7"
									></path>
								</svg>
							{:else}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									></path>
								</svg>
							{/if}
							{showDetailedResults ? 'Hide' : 'Show'} Detailed Workflow Results
						</button>
					</div>

					{#if showDetailedResults}
						<div class="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
							<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">
								📋 Individual Workflow Details
							</h4>

							<!-- Successful Workflows -->
							{#if Object.values(lastSyncResult.workflow_details).filter((w) => w.final_status === 'success').length > 0}
								<div class="mb-3">
									<div class="text-xs font-medium text-green-700 dark:text-green-300 mb-1">
										✅ Successful Workflows ({Object.values(lastSyncResult.workflow_details).filter(
											(w) => w.final_status === 'success'
										).length})
									</div>
									<div class="space-y-1">
										{#each Object.entries(lastSyncResult.workflow_details) as [workflowId, details]}
											{#if details.final_status === 'success'}
												<div class="text-xs text-gray-600 dark:text-gray-400 ml-3">
													• {workflowId} - {details.pipeline_file} ({details.pipeline_size} bytes)
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{/if}

							<!-- Failed Workflows -->
							{#if Object.values(lastSyncResult.workflow_details).filter((w) => w.final_status === 'failed').length > 0}
								<div>
									<div class="text-xs font-medium text-red-700 dark:text-red-300 mb-1">
										❌ Failed Workflows ({Object.values(lastSyncResult.workflow_details).filter(
											(w) => w.final_status === 'failed'
										).length})
									</div>
									<div class="space-y-1">
										{#each Object.entries(lastSyncResult.workflow_details) as [workflowId, details]}
											{#if details.final_status === 'failed'}
												<div class="text-xs text-gray-600 dark:text-gray-400 ml-3">
													• {workflowId}
													{#if details.conversion_error}
														<div class="ml-3 text-red-600 dark:text-red-400">
															Conversion: {details.conversion_error}
														</div>
													{/if}
													{#if details.upload_error}
														<div class="ml-3 text-red-600 dark:text-red-400">
															Upload: {details.upload_error}
														</div>
													{/if}
												</div>
											{/if}
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/if}
				{/if}
			</div>
		{:else}
			<div class="text-sm text-gray-500 dark:text-gray-400">
				No sync operation performed yet. Click "Sync Workflows" to start.
			</div>
		{/if}
	</div>

	<!-- Workflows Status Card -->
	{#if workflowsStatus}
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
			<div class="flex items-center justify-between mb-4">
				<h3 class="text-md font-medium text-gray-900 dark:text-white">Workflows Status</h3>
			</div>

			<div class="space-y-3">
				{#if workflowsStatus.workflows && workflowsStatus.workflows.length > 0}
					<div class="text-sm text-gray-600 dark:text-gray-400">
						<strong>Available Workflows:</strong>
						{workflowsStatus.workflows.length}
					</div>
					<div class="text-sm text-gray-600 dark:text-gray-400">
						<ul class="list-disc list-inside ml-4">
							{#each workflowsStatus.workflows as workflow}
								<li>{workflow}</li>
							{/each}
						</ul>
					</div>
				{:else}
					<div class="text-sm text-gray-500 dark:text-gray-400">
						No workflows found or available.
					</div>
				{/if}

				{#if workflowsStatus.health}
					<div class="text-sm text-gray-600 dark:text-gray-400">
						<strong>System Health:</strong>
						{workflowsStatus.health.status || 'Unknown'}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Action Buttons -->
	<div class="flex space-x-3">
		<button
			on:click={handleSyncWorkflows}
			disabled={syncing}
			class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if syncing}
				<svg
					class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Syncing...
			{:else}
				<svg
					class="-ml-1 mr-3 h-5 w-5"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Sync Workflows
			{/if}
		</button>

		<button
			on:click={fetchWorkflowsStatus}
			disabled={loading}
			class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if loading}
				<svg
					class="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-500"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Loading...
			{:else}
				<svg
					class="-ml-1 mr-3 h-5 w-5"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					/>
				</svg>
				Refresh Status
			{/if}
		</button>
	</div>

	<!-- Debug Info (only show if logDebug is enabled) -->
	{#if $logDebug}
		<div class="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
			<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Debug Information</h4>
			<pre class="text-xs text-gray-600 dark:text-gray-400 overflow-auto">{JSON.stringify(
					{ lastSyncResult, workflowsStatus },
					null,
					2
				)}</pre>
		</div>
	{/if}
</div>
