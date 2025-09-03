<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	// API and type imports
	import { getLogContentViaProxy } from '$lib/apis/aimby';
	import type { LogContentResponse } from '$lib/apis/aimby';

	// Utility imports
	import {
		createSafeErrorMessage,
		isValidJSON,
		generateWorkflowSummary,
		type LogEntry
	} from '$lib/utils/log-utils';
	import { validateFilename, sanitizeUrlParameter } from '$lib/utils/validation';

	// Component imports
	import LogViewerHeader from '$lib/components/admin/Aimbience/Components/LogViewerHeader.svelte';
	import LogViewerTabs from '$lib/components/admin/Aimbience/Components/LogViewerTabs.svelte';
	import LogViewerError from '$lib/components/admin/Aimbience/Components/LogViewerError.svelte';
	import LogTimeline from '$lib/components/admin/Aimbience/Components/LogTimeline.svelte';
	import LogTree from '$lib/components/admin/Aimbience/Components/LogTree.svelte';
	import LogRaw from '$lib/components/admin/Aimbience/Components/LogRaw.svelte';

	// State management
	let loading = false;
	let error: string | null = null;
	let filename = '';
	let logContent: LogContentResponse | null = null;
	let viewMode: 'timeline' | 'tree' | 'raw' = 'timeline';
	let selectedEntry: number | null = null;
	let isRetrying = false;

	// Computed values
	$: fileSize = logContent?.size || 0;
	$: modifiedDate = logContent?.modified || '';
	$: chatId = logContent?.filename || '';
	$: logEntries = Array.isArray(logContent?.content) ? (logContent.content as LogEntry[]) : [];
	$: workflowSummary = logContent?.content ? generateWorkflowSummary(logContent.content) : null;

	// Initialize component
	onMount(async () => {
		await initializeLogViewer();
	});

	async function initializeLogViewer() {
		try {
			// Get filename from URL parameters
			const urlParams = new URLSearchParams($page.url.search);
			const urlFilename = urlParams.get('filename');

			if (!urlFilename || !validateFilename(urlFilename)) {
				error = 'Invalid or missing filename parameter';
				return;
			}

			filename = sanitizeUrlParameter(urlFilename);

			// Fetch log content
			await fetchLogContent();
		} catch (err) {
			error = createSafeErrorMessage(err);
			console.error('Error initializing log viewer:', err);
		}
	}

	async function fetchLogContent() {
		if (!filename) return;

		loading = true;
		error = null;

		try {
			const token = localStorage.getItem('token') || '';
			const response = await getLogContentViaProxy(token, filename);

			if (!response) {
				error = 'Failed to fetch log content';
				return;
			}

			logContent = response;

			// Show success message
			toast.success('Log content loaded successfully');
		} catch (err) {
			error = createSafeErrorMessage(err);
			console.error('Error fetching log content:', err);
		} finally {
			loading = false;
		}
	}

	async function handleRetry() {
		isRetrying = true;
		try {
			await fetchLogContent();
		} finally {
			isRetrying = false;
		}
	}

	function handleRefresh() {
		fetchLogContent();
	}

	function handleGoBack() {
		goto('/admin/aimbience/log-management');
	}

	function handleTabChange(event: CustomEvent<{ viewMode: 'timeline' | 'tree' | 'raw' }>) {
		viewMode = event.detail.viewMode;
		selectedEntry = null; // Reset selection when changing views
	}

	function handleEntrySelect(event: CustomEvent<{ entry: LogEntry; index: number }>) {
		selectedEntry = event.detail.index;
	}

	function handleEntryDeselect() {
		selectedEntry = null;
	}
</script>

<svelte:head>
	<title>Log Viewer - {filename || 'Unknown File'}</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	{#if error}
		<!-- Error State -->
		<LogViewerError
			errorMessage={error}
			{filename}
			{isRetrying}
			on:retry={handleRetry}
			on:goBack={handleGoBack}
		/>
	{:else}
		<!-- Main Content -->
		<div class="flex flex-col h-screen">
			<!-- Header -->
			<LogViewerHeader
				{filename}
				{fileSize}
				{modifiedDate}
				{chatId}
				isLoading={loading}
				{error}
				on:refresh={handleRefresh}
				on:goBack={handleGoBack}
			/>

			<!-- Tabs -->
			<LogViewerTabs currentViewMode={viewMode} on:tabChange={handleTabChange} />

			<!-- Content Area -->
			<main class="flex-1 overflow-auto">
				{#if loading}
					<!-- Loading State -->
					<div class="flex items-center justify-center h-full">
						<div class="text-center">
							<div
								class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
							></div>
							<p class="text-gray-600 dark:text-gray-400">Loading log content...</p>
						</div>
					</div>
				{:else if logContent?.content}
					<!-- Content Views -->
					<div class="p-6">
						{#if isValidJSON(logContent.content) && viewMode === 'timeline'}
							<!-- Timeline View -->
							<LogTimeline
								{logEntries}
								{selectedEntry}
								on:entrySelect={handleEntrySelect}
								on:entryDeselect={handleEntryDeselect}
							/>
						{:else if isValidJSON(logContent.content) && viewMode === 'tree'}
							<!-- Tree View -->
							<LogTree logContent={logContent.content} />
						{:else if viewMode === 'raw'}
							<!-- Raw View -->
							<LogRaw logContent={logContent.content} />
						{:else}
							<!-- Fallback for invalid JSON -->
							<div class="text-center py-12">
								<svg
									class="mx-auto h-12 w-12 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
									/>
								</svg>
								<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">
									Invalid Log Format
								</h3>
								<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
									This log file cannot be displayed in the selected view mode.
								</p>
							</div>
						{/if}
					</div>
				{:else}
					<!-- Empty State -->
					<div class="flex items-center justify-center h-full">
						<div class="text-center">
							<svg
								class="mx-auto h-12 w-12 text-gray-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
								/>
							</svg>
							<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Content</h3>
							<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
								This log file appears to be empty.
							</p>
						</div>
					</div>
				{/if}
			</main>
		</div>
	{/if}
</div>
