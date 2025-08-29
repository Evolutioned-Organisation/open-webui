<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);
	
	// Utility imports for validation and error handling
	import { validateSearchQuery, validateNumericParameter, createSafeErrorMessage, validateFilename } from '$lib/utils/validation';
	import { globalErrorHandler, createErrorContext, withGracefulDegradation } from '$lib/utils/errorHandling';

	// API and component imports
	import { getLogsViaProxy, type LogFileInfo, type LogListResponse } from '$lib/apis/aimby';
	import { getAimbienceConfig } from '$lib/apis/auths';
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import ArrowDownTray from '$lib/components/icons/ArrowDownTray.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import CloudArrowUp from '$lib/components/icons/CloudArrowUp.svelte';
	import Pagination from '$lib/components/common/Pagination.svelte';
	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n = getContext('i18n');

	// Configuration and data state
	let aimbienceConfig: any | null = null; // Aimbience integration configuration
	let logs: LogFileInfo[] = []; // Raw log files data from API
	let totalLogCount = 0; // Total number of log files available
	let loading = false; // Loading state for API requests
	let page = 1; // Current pagination page
	let count = 10; // Number of items per page
	let orderBy: string = 'modified'; // Current sort column
	let direction: 'asc' | 'desc' = 'desc'; // Sort direction
	let lastError: string | null = null; // Last error message for display
	let retryCount = 0; // Number of retry attempts for failed requests

	// Search functionality state
	let searchQuery = ''; // User's search input
	let filteredLogs: LogFileInfo[] = []; // Logs filtered by search query
	let searchError = ''; // Search validation error message

	// Reset pagination when search changes
	$: if (searchQuery !== '') {
		page = 1;
	}

	// Validate and filter logs based on search query
	$: {
		searchError = '';
		if (searchQuery && !validateSearchQuery(searchQuery)) {
			searchError = 'Invalid search query. Please avoid special characters.';
			filteredLogs = logs; // Show all logs if search is invalid
		} else {
			filteredLogs = logs.filter((log) => {
				if (!searchQuery.trim()) return true;
				const query = searchQuery.toLowerCase();
				return (
					log.filename?.toLowerCase().includes(query) ||
					log.path?.toLowerCase().includes(query) ||
					(log.size?.toString() || '').includes(query)
				);
			});
		}
	}

	$: paginatedLogs = sortedLogs.slice((page - 1) * count, page * count);

	function setSortKey(key: string) {
		if (orderBy === key) {
			direction = direction === 'asc' ? 'desc' : 'asc';
		} else {
			orderBy = key;
			if (key === 'filename' || key === 'path') {
				direction = 'asc';
			} else {
				direction = 'desc';
			}
		}
		page = 1;
	}

	$: sortedLogs = [...filteredLogs].sort((a, b) => {
		let aVal: any = a[orderBy as keyof LogFileInfo];
		let bVal: any = b[orderBy as keyof LogFileInfo];

		// Handle date sorting (modified is a timestamp)
		if (orderBy === 'modified') {
			aVal = aVal || 0;
			bVal = bVal || 0;
		}

		// Handle numeric sorting
		if (orderBy === 'size') {
			aVal = aVal || 0;
			bVal = bVal || 0;
		}

		// Handle string sorting
		if (typeof aVal === 'string') {
			aVal = aVal.toLowerCase();
			bVal = bVal.toLowerCase();
		}

		if (direction === 'asc') {
			return aVal > bVal ? 1 : -1;
		} else {
			return aVal < bVal ? 1 : -1;
		}
	});

	/**
	 * Fetches log files from AIMBY-API via the Open-WebUI proxy
	 * Handles validation, error handling, and user feedback
	 * 
	 * @param isRetry - Whether this is a retry attempt (affects user feedback)
	 */
	const fetchLogs = async (isRetry: boolean = false) => {
		loading = true;
		lastError = null;

		try {
			// Check if aimbience is properly configured
			if (!aimbienceConfig?.ENABLE_AIMBENCE) {
				throw new Error('Aimbience integration is not enabled');
			}

			if (!aimbienceConfig?.AIMBENCE_API_BASE_URL) {
				throw new Error('AIMBY-API base URL is not configured');
			}

			// Validate count parameter to prevent invalid API requests
			const validatedCount = validateNumericParameter(count, 1, 1000);
			if (validatedCount === null) {
				throw new Error('Invalid count parameter');
			}

			console.log('Fetching logs with config:', {
				baseUrl: aimbienceConfig.AIMBENCE_API_BASE_URL,
				enabled: aimbienceConfig.ENABLE_AIMBENCE,
				count: validatedCount
			});

			// Use proxy function to avoid CORS issues with direct AIMBY-API calls
			const response = await getLogsViaProxy(localStorage.token || '', validatedCount);
			if (response) {
				logs = response.logs;
				totalLogCount = response.total_count;
				retryCount = 0; // Reset retry count on successful request
				
				// Provide appropriate user feedback based on context
				const displayMessage = totalLogCount > logs.length 
					? `Retrieved ${logs.length} of ${totalLogCount} log files`
					: `Retrieved ${logs.length} log files`;
					
				if (!isRetry) {
					toast.success(displayMessage);
				} else {
					toast.success(`Successfully ${displayMessage.toLowerCase()} after retry`);
				}
			} else {
				throw new Error('No response received from server - the logs endpoint may not be available on your AIMBY-API instance');
			}
		} catch (error) {
			// Use centralized error handling for consistent error management
			const context = createErrorContext('fetchLogs', 'LogManagement');
			const handled = globalErrorHandler.handleError(error, context);
			
			// Reset state and prepare error display
			logs = [];
			totalLogCount = 0;
			
			// Create more informative error messages
			let errorMessage = createSafeErrorMessage(error, 'Failed to fetch log files');
			if (errorMessage.includes('No response received')) {
				errorMessage = 'Unable to connect to AIMBY-API logs endpoint. Please verify that your AIMBY-API instance supports the /api/v1/logs endpoint.';
			}
			
			lastError = errorMessage;
			retryCount++;
			
			// Only show toast if error handler allowed it (prevents duplicate notifications)
			if (!handled && !isRetry) {
				toast.error(lastError);
			}
		} finally {
			loading = false;
		}
	};

	const refreshLogs = () => {
		fetchLogs(true);
	};

	const retryFetchLogs = () => {
		fetchLogs(true);
	};

	const formatDate = (timestamp?: number) => {
		if (!timestamp) return 'N/A';
		try {
			return dayjs(timestamp * 1000).format('LLL');
		} catch {
			return 'Invalid Date';
		}
	};

	const formatFileSize = (bytes?: number) => {
		if (!bytes) return '0 B';
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
	};

	const viewLog = (filename: string) => {
		try {
			// Validate filename before navigation
			if (!validateFilename(filename)) {
				throw new Error('Invalid filename selected');
			}

			// Navigate to log viewer page with filename parameter
			window.location.href = `/admin/aimbience/log-viewer?filename=${encodeURIComponent(filename)}`;
		} catch (error) {
			const context = createErrorContext('viewLog', 'LogManagement', { filename });
			globalErrorHandler.handleError(error, context);
		}
	};

	onMount(async () => {
		// Load Aimbience config from dedicated endpoint with graceful degradation
		await withGracefulDegradation(
			async () => {
				const config = await getAimbienceConfig(localStorage.token);
				if (config) {
					aimbienceConfig = config;
					console.log('LogManagement: Loaded config from backend:', aimbienceConfig);
				} else {
					console.log('LogManagement: No Aimbience config found in backend');
				}
			},
			null,
			createErrorContext('loadAimbienceConfig', 'LogManagement')
		);

		// Always attempt to fetch logs, even if config loading failed
		fetchLogs();
	});
</script>

<div class="space-y-6">
	{#if !aimbienceConfig?.ENABLE_AIMBENCE}
		<div class="text-center py-12">
			<div class="text-gray-500 dark:text-gray-400 text-sm">
				Aimbience integration is not enabled. Please enable it in the Aimbience Config tab.
			</div>
		</div>
	{:else}
		<!-- Header Section -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white" id="log-management-title">Log Management</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Monitor and analyze system logs from your AIMBY-API service with advanced search and filtering capabilities
				</p>
			</div>
			<div class="flex gap-2">
				<button
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					on:click={refreshLogs}
					disabled={loading}
					aria-label="Refresh log files list"
					title="Refresh log files list"
				>
					<CloudArrowUp className="size-4 {loading ? 'animate-spin' : ''}" />
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>
		</div>

		<!-- Error Display -->
		{#if lastError && !loading}
			<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
				<div class="flex items-start gap-3">
					<svg class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<div class="flex-1">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-200">
							Error Loading Log Files
						</h3>
						<p class="mt-1 text-sm text-red-700 dark:text-red-300">
							{lastError}
						</p>
						{#if lastError.includes('logs endpoint')}
							<div class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
								<p class="text-xs text-blue-800 dark:text-blue-200">
									<strong>Note:</strong> The log management feature requires AIMBY-API version with logs endpoints. 
									Please ensure your AIMBY-API instance includes the <code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">/api/v1/logs</code> endpoints.
								</p>
							</div>
						{/if}
						<div class="mt-3 flex gap-2">
							<button
								on:click={retryFetchLogs}
								class="px-3 py-1 text-sm bg-red-100 dark:bg-red-800/30 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700/30 rounded transition-colors"
								disabled={loading}
							>
								{loading ? 'Retrying...' : 'Retry'}
							</button>
							{#if retryCount > 0}
								<span class="px-2 py-1 text-xs bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded">
									Attempt {retryCount}
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4" role="region" aria-labelledby="log-stats-heading">
			<h3 id="log-stats-heading" class="sr-only">Log Statistics</h3>
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-md"
				role="status"
				aria-label="Total log files count"
			>
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Log Files</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white" aria-live="polite">{totalLogCount}</div>
			</div>
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-md"
				role="status"
				aria-label="Displayed log files count"
			>
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Displayed</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white" aria-live="polite">{filteredLogs.length}</div>
				{#if searchQuery && filteredLogs.length !== logs.length}
					<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Filtered from {logs.length} loaded
					</div>
				{/if}
			</div>
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-md"
				role="status"
				aria-label="API connection status"
			>
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">API URL</div>
				<div class="text-sm font-mono text-gray-600 dark:text-gray-400 truncate" title={aimbienceConfig?.AIMBENCE_API_BASE_URL || 'Not configured'}>
					{aimbienceConfig?.AIMBENCE_API_BASE_URL || 'N/A'}
				</div>
			</div>
		</div>

		<!-- Search Section -->
		<div
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
		>
			<div class="px-6 py-4">
				<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
					<div class="flex-1 max-w-md">
						<label for="log-search" class="sr-only">Search log files</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									></path>
								</svg>
							</div>
							<input
								id="log-search"
								type="text"
								bind:value={searchQuery}
								class="block w-full pl-10 pr-3 py-2 border {searchError ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
								placeholder="Search log files by filename, path, or size..."
								maxlength="100"
								aria-describedby={searchError ? 'search-error' : 'search-help'}
								aria-invalid={searchError ? 'true' : 'false'}
								on:keydown={(e) => {
									if (e.key === 'Escape') {
										searchQuery = '';
										e.target.blur();
									}
								}}
							/>
							<div id="search-help" class="sr-only">
								Search through log files by filename, path, or file size
							</div>
							{#if searchQuery}
								<button
									on:click={() => (searchQuery = '')}
									class="absolute inset-y-0 right-0 pr-3 flex items-center"
									aria-label="Clear search"
								>
									<svg
										class="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										></path>
									</svg>
								</button>
							{/if}
						</div>
						{#if searchError}
							<div id="search-error" class="mt-1 text-sm text-red-600 dark:text-red-400" role="alert" aria-live="polite">
								{searchError}
							</div>
						{/if}
					</div>
					<div class="flex items-center gap-4">
						<!-- Count Selector -->
						<div class="flex items-center gap-2">
							<label for="count-selector" class="text-sm text-gray-600 dark:text-gray-400"
								>Show:</label
							>
							<select
								id="count-selector"
								bind:value={count}
								class="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								on:change={() => (page = 1)}
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={25}>25</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>

						<!-- Results Info -->
						<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
							<span>Showing {filteredLogs.length} of {totalLogCount} log files</span>
							{#if searchQuery}
								<span
									class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
								>
									Filtered
								</span>
							{/if}
							{#if logs.length < totalLogCount}
								<span
									class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-xs"
									title="Only showing first {count} files. Increase the 'Show' limit to see more."
								>
									Limited
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Table Section -->
		<div
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
		>
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">Log Files</h3>
					<div class="text-sm text-gray-500 dark:text-gray-400"></div>
				</div>
			</div>

			<div class="relative overflow-x-auto">
				{#if loading}
					<div
						class="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10"
					>
						<Spinner className="size-8" />
					</div>
				{/if}

				{#if filteredLogs.length === 0 && !loading}
					<div class="text-center py-12" role="status" aria-live="polite">
						<div class="text-gray-500 dark:text-gray-400 text-sm">
							{#if searchQuery}
								No log files found matching "{searchQuery}"
								<button
									on:click={() => (searchQuery = '')}
									class="ml-2 text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded transition-colors duration-200"
									aria-label="Clear search query"
								>
									Clear search
								</button>
							{:else}
								No log files found
							{/if}
						</div>
					</div>
				{:else}
					<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400" role="table" aria-label="Log files table">
						<thead
							class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
						>
							<tr>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
									on:click={() => setSortKey('filename')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('filename');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by filename {orderBy === 'filename' ? (direction === 'asc' ? 'descending' : 'ascending') : 'ascending'}"
								>
									<div class="flex gap-1.5 items-center">
										Filename
										{#if orderBy === 'filename'}
											<span class="font-normal" aria-hidden="true">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible" aria-hidden="true">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
									on:click={() => setSortKey('size')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('size');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by file size {orderBy === 'size' ? (direction === 'asc' ? 'descending' : 'ascending') : 'descending'}"
								>
									<div class="flex gap-1.5 items-center">
										Size
										{#if orderBy === 'size'}
											<span class="font-normal" aria-hidden="true">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible" aria-hidden="true">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
									on:click={() => setSortKey('modified')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('modified');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by modification date {orderBy === 'modified' ? (direction === 'asc' ? 'descending' : 'ascending') : 'descending'}"
								>
									<div class="flex gap-1.5 items-center">
										Modified Date
										{#if orderBy === 'modified'}
											<span class="font-normal" aria-hidden="true">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible" aria-hidden="true">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
									aria-label="Available actions for log files"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{#each paginatedLogs as log (log.filename)}
								<tr
									class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
									role="row"
								>
									<td class="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white" role="cell">
										<div class="truncate max-w-64" title={log.filename} aria-label="Filename: {log.filename}">
											{log.filename}
										</div>
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white" role="cell" aria-label="File size: {formatFileSize(log.size)}">
										{formatFileSize(log.size)}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white" role="cell" aria-label="Modified date: {formatDate(log.modified)}">
										{formatDate(log.modified)}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white" role="cell">
										<div class="flex gap-2">
											<button
												on:click={() => viewLog(log.filename)}
												class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30 rounded transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
												title="View log file content for {log.filename}"
												aria-label="View log file {log.filename}"
											>
												View
											</button>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Pagination -->
			{#if filteredLogs.length > count}
				<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
					<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
						<!-- Pagination Info -->
						<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
							<span>
								Showing {Math.min((page - 1) * count + 1, filteredLogs.length)} to {Math.min(
									page * count,
									filteredLogs.length
								)} of {filteredLogs.length} results
							</span>
							{#if searchQuery}
								<span
									class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
								>
									Filtered
								</span>
							{/if}
						</div>

						<!-- Pagination Controls -->
						<Pagination bind:page count={filteredLogs.length} perPage={count} />
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>