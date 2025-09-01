<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	// Utility imports for validation and error handling
	import {
		validateSearchQuery,
		validateNumericParameter,
		createSafeErrorMessage,
		validateFilename,
		validateFilePath
	} from '$lib/utils/validation';
	import {
		globalErrorHandler,
		createErrorContext,
		withGracefulDegradation
	} from '$lib/utils/errorHandling';

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

	// View button loading state
	let viewingLog: string | null = null; // Currently viewing log filename

	// Column spacing controls
	let showColumnControls = false; // Toggle column spacing controls
	let columnSpacing = 'default'; // Column spacing preset: 'compact', 'default', 'comfortable'
	let customColumnWidths = {
		filename: 60, // Percentage width for filename column
		size: 15, // Percentage width for size column
		modified: 20, // Percentage width for modified date column
		actions: 5 // Percentage width for actions column
	};

	// Modal state for future features
	let showFeatureModal = false;
	let modalMessage = '';

	// Pagination variables
	let totalPages = 1;
	let startIndex = 0;
	let endIndex = 0;
	let displayedLogs: LogFileInfo[] = [];

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
					(log.size?.toString() || '').includes(query) ||
					(log.directory?.toLowerCase() || '').includes(query)
				);
			});
		}
	}

	// Pagination calculations
	$: totalPages = Math.ceil(filteredLogs.length / count);
	$: startIndex = (page - 1) * count;
	$: endIndex = Math.min(startIndex + count, filteredLogs.length);
	$: displayedLogs = sortedLogs.slice(startIndex, endIndex);

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

	// Pagination functions
	function goToPage(pageNum: number) {
		if (pageNum >= 1 && pageNum <= totalPages) {
			page = pageNum;
		}
	}

	function goToFirstPage() {
		goToPage(1);
	}

	function goToLastPage() {
		goToPage(totalPages);
	}

	function goToPreviousPage() {
		goToPage(page - 1);
	}

	function goToNextPage() {
		goToPage(page + 1);
	}

	function onCountChange() {
		page = 1; // Reset to first page when changing count
		fetchLogs(); // Fetch new data with updated count
	}

	// Modal functions for future features
	function showFutureFeatureModal(message: string) {
		modalMessage = message;
		showFeatureModal = true;
	}

	function closeFeatureModal() {
		showFeatureModal = false;
		modalMessage = '';
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
				const displayMessage =
					totalLogCount > logs.length
						? `Retrieved ${logs.length} of ${totalLogCount} log files`
						: `Retrieved ${logs.length} log files`;

				if (!isRetry) {
					toast.success(displayMessage);
				} else {
					toast.success(`Successfully ${displayMessage.toLowerCase()} after retry`);
				}
			} else {
				throw new Error(
					'No response received from server - the logs endpoint may not be available on your AIMBY-API instance'
				);
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
				errorMessage =
					'Unable to connect to AIMBY-API logs endpoint. Please verify that your AIMBY-API instance supports the /api/v1/logs endpoint.';
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
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
	};

	const viewLog = async (filePath: string) => {
		try {
			// Extract filename from path for validation and display
			const filename = filePath.split('/').pop() || filePath;

			// Strip the 'llm_logs/' prefix if present, as the API expects relative paths
			let apiPath = filePath;
			if (apiPath.startsWith('llm_logs/')) {
				apiPath = apiPath.substring(9); // Remove 'llm_logs/' prefix
			}

			// Validate file path before navigation
			if (!validateFilePath(apiPath)) {
				throw new Error('Invalid file path selected');
			}

			// Set loading state using the original filename for UI consistency
			viewingLog = filename;

			// Small delay to show loading state
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Navigate to log viewer page with corrected path parameter
			goto(`/admin/aimbience/log-viewer?filename=${encodeURIComponent(apiPath)}`);
		} catch (error) {
			const context = createErrorContext('viewLog', 'LogManagement', { filePath });
			globalErrorHandler.handleError(error, context);

			// Show user-friendly error message
			toast.error(`Failed to open log file "${filePath}". Please try refreshing the log list.`);
		} finally {
			// Reset loading state
			viewingLog = null;
		}
	};

	onMount(async () => {
		// Check if we should force refresh (from log viewer error)
		const urlParams = new URLSearchParams(window.location.search);
		const shouldRefresh = urlParams.get('refresh') === 'true';

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
		await fetchLogs();

		// If we came from a log viewer error, show a helpful message
		if (shouldRefresh) {
			toast.success('Log list refreshed. Files that no longer exist have been removed.');
			// Clean up the URL
			window.history.replaceState({}, '', '/admin/aimbience/log-management');
		}
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
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white" id="log-management-title">
					Workflow Log Management
				</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">View workflow logs</p>
			</div>
			<div class="flex gap-2">
				<!-- Quick View Largest Session File -->
				{#if logs.filter((log) => log.filename.includes('session_')).length > 0}
					<button
						on:click={() => {
							const sessionFiles = logs.filter((log) => log.filename.includes('session_'));
							if (sessionFiles.length > 0) {
								// Find the largest session file (most content)
								const largestFile = sessionFiles.reduce((prev, current) =>
									(current.size || 0) > (prev.size || 0) ? current : prev
								);
								viewLog(largestFile.path || largestFile.filename);
							}
						}}
						class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-600 rounded-lg hover:bg-green-100 dark:hover:bg-green-800/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
						aria-label="View largest session file"
						title="View the largest session file (most workflow content)"
					>
						<svg
							class="size-4"
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 20 20"
							fill="currentColor"
						>
							<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
							<path
								fill-rule="evenodd"
								d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
								clip-rule="evenodd"
							/>
						</svg>
						View Latest Session
					</button>
				{/if}
				<button
					on:click={() =>
						showFutureFeatureModal(
							'Advanced log filtering, export capabilities, and bulk operations will be available in a future update.'
						)}
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200"
					aria-label="Advanced features"
					title="Advanced features coming soon"
				>
					<svg
						class="size-4"
						xmlns="http://www.w3.org/2000/svg"
						viewBox="0 0 20 20"
						fill="currentColor"
					>
						<path
							fill-rule="evenodd"
							d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
							clip-rule="evenodd"
						/>
					</svg>
					Advanced Features
				</button>
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

		<!-- Error Display Only -->
		{#if lastError && !loading}
			<div
				class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4"
			>
				<div class="flex items-start gap-3">
					<svg
						class="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<div class="flex-1">
						<h3 class="text-sm font-medium text-red-800 dark:text-red-200">
							Error Loading Log Files
						</h3>
						<p class="mt-1 text-sm text-red-700 dark:text-red-300">
							{lastError}
						</p>
						{#if lastError && lastError.includes('logs endpoint')}
							<div
								class="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded"
							>
								<p class="text-xs text-blue-800 dark:text-blue-200">
									<strong>Note:</strong> The log management feature requires AIMBY-API version with
									logs endpoints. Please ensure your AIMBY-API instance includes the
									<code class="bg-blue-100 dark:bg-blue-800 px-1 rounded">/api/v1/logs</code> endpoints.
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
								<span
									class="px-2 py-1 text-xs bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded"
								>
									Attempt {retryCount}
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Enhanced Stats Cards -->
		<div
			class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
			role="region"
			aria-labelledby="log-stats-heading"
		>
			<h3 id="log-stats-heading" class="sr-only">Log Statistics</h3>

			<!-- Total Files -->
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600"
				role="status"
				aria-label="Total log files count"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Files</div>
						<div class="text-2xl font-bold text-gray-900 dark:text-white" aria-live="polite">
							{totalLogCount}
						</div>
					</div>
					<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
						<svg
							class="w-5 h-5 text-blue-600 dark:text-blue-400"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1a1 1 0 01-1 1H4a1 1 0 110-2V4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Session Files -->
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:border-green-300 dark:hover:border-green-600"
				role="status"
				aria-label="Session files count"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Session Files</div>
						<div class="text-2xl font-bold text-green-700 dark:text-green-300" aria-live="polite">
							{logs.filter((log) => log.filename.includes('session_')).length}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">Consolidated logs</div>
					</div>
					<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
						<svg
							class="w-5 h-5 text-green-600 dark:text-green-400"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
					</div>
				</div>
			</div>

			<!-- Total Size -->
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600"
				role="status"
				aria-label="Total storage used"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Size</div>
						<div class="text-2xl font-bold text-purple-700 dark:text-purple-300" aria-live="polite">
							{formatFileSize(logs.reduce((sum, log) => sum + (log.size || 0), 0))}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">All log files</div>
					</div>
					<div class="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
						<svg
							class="w-5 h-5 text-purple-600 dark:text-purple-400"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
							/>
						</svg>
					</div>
				</div>
			</div>

			<!-- Current View -->
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700 transition-all duration-200 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600"
				role="status"
				aria-label="Current page view"
			>
				<div class="flex items-center justify-between">
					<div>
						<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Showing</div>
						<div class="text-2xl font-bold text-orange-700 dark:text-orange-300" aria-live="polite">
							{displayedLogs.length}
						</div>
						<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
							Page {page} of {totalPages}
						</div>
					</div>
					<div class="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
						<svg
							class="w-5 h-5 text-orange-600 dark:text-orange-400"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
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
								class="block w-full pl-10 pr-3 py-2 border {searchError
									? 'border-red-500 dark:border-red-400'
									: 'border-gray-300 dark:border-gray-600'} rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
								placeholder="Search log files by filename, path, size, or directory..."
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
							<div
								id="search-error"
								class="mt-1 text-sm text-red-600 dark:text-red-400"
								role="alert"
								aria-live="polite"
							>
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
								on:change={onCountChange}
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
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
		>
			<style>
				@keyframes fadeInUp {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}

				tbody tr {
					animation: fadeInUp 0.3s ease-out forwards;
					opacity: 0;
				}
			</style>
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

				{#if displayedLogs.length === 0 && !loading}
					<div class="text-center py-16" role="status" aria-live="polite">
						<div
							class="mx-auto w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4"
						>
							{#if searchQuery}
								<svg
									class="w-8 h-8 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							{:else}
								<svg
									class="w-8 h-8 text-gray-400"
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
							{/if}
						</div>
						<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
							{#if searchQuery}
								No Results Found
							{:else}
								No Log Files Available
							{/if}
						</h3>
						<div class="text-gray-500 dark:text-gray-400 text-sm mb-4">
							{#if searchQuery}
								No log files found matching "{searchQuery}"
							{:else}
								No workflow log files are currently available. Try running a workflow to generate
								logs.
							{/if}
						</div>
						{#if searchQuery}
							<button
								on:click={() => (searchQuery = '')}
								class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
								aria-label="Clear search query"
							>
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M6 18L18 6M6 6l12 12"
									/>
								</svg>
								Clear Search
							</button>
						{/if}
					</div>
				{:else}
					<table
						class="w-full text-sm text-left text-gray-500 dark:text-gray-400"
						role="table"
						aria-label="Log files table"
					>
						<thead
							class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
						>
							<tr>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 min-w-0"
									on:click={() => setSortKey('filename')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('filename');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by filename {orderBy === 'filename'
										? direction === 'asc'
											? 'descending'
											: 'ascending'
										: 'ascending'}"
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
									class="px-6 py-3 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 w-24"
									on:click={() => setSortKey('size')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('size');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by file size {orderBy === 'size'
										? direction === 'asc'
											? 'descending'
											: 'ascending'
										: 'descending'}"
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
									class="px-6 py-3 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200 w-40"
									on:click={() => setSortKey('modified')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('modified');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by modification date {orderBy === 'modified'
										? direction === 'asc'
											? 'descending'
											: 'ascending'
										: 'descending'}"
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
									class="px-6 py-3 text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 w-32 cursor-pointer select-none hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
									on:click={() => setSortKey('directory')}
									on:keydown={(e) => {
										if (e.key === 'Enter' || e.key === ' ') {
											e.preventDefault();
											setSortKey('directory');
										}
									}}
									tabindex="0"
									role="button"
									aria-label="Sort by directory {orderBy === 'directory'
										? direction === 'asc'
											? 'descending'
											: 'ascending'
										: 'descending'}"
								>
									<div class="flex gap-1.5 items-center">
										Directory
										{#if orderBy === 'directory'}
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
									class="px-6 py-3 text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400 w-24"
									aria-label="Available actions for log files"
								>
									Actions
								</th>
							</tr>
						</thead>
						<tbody>
							{#each displayedLogs as log, index (log.filename)}
								<tr
									class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 hover:shadow-sm"
									role="row"
									style="animation-delay: {index * 50}ms"
								>
									<td
										class="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white min-w-0"
										role="cell"
									>
										<div class="flex items-center gap-2">
											<!-- File type indicator -->
											{#if log.filename.includes('session_')}
												<span
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
													title="Consolidated session log file"
												>
													<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
														<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
													</svg>
													Session
												</span>
											{:else if log.filename.startsWith('trace_')}
												<span
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
													title="Individual trace log file"
												>
													<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
														<path
															d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
														/>
													</svg>
													Trace
												</span>
											{:else}
												<span
													class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-800"
													title="Legacy log file"
												>
													<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1a1 1 0 01-1 1H4a1 1 0 110-2V4z"
															clip-rule="evenodd"
														/>
													</svg>
													Legacy
												</span>
											{/if}
											<div
												class="break-all"
												title={log.filename}
												aria-label="Filename: {log.filename}"
											>
												{log.filename}
											</div>
										</div>
									</td>
									<td
										class="px-6 py-4 text-gray-900 dark:text-white text-center"
										role="cell"
										aria-label="File size: {formatFileSize(log.size)}"
									>
										<div class="flex items-center justify-center gap-1">
											<!-- Size indicator -->
											{#if (log.size || 0) > 100000}
												<span class="w-2 h-2 bg-green-500 rounded-full" title="Large file (>100KB)"
												></span>
											{:else if (log.size || 0) > 10000}
												<span class="w-2 h-2 bg-yellow-500 rounded-full" title="Medium file (>10KB)"
												></span>
											{:else}
												<span class="w-2 h-2 bg-gray-400 rounded-full" title="Small file (<10KB)"
												></span>
											{/if}
											<span class="font-mono text-sm">
												{formatFileSize(log.size)}
											</span>
										</div>
									</td>
									<td
										class="px-6 py-4 text-gray-900 dark:text-white text-center"
										role="cell"
										aria-label="Modified date: {formatDate(log.modified)}"
									>
										{formatDate(log.modified)}
									</td>
									<td
										class="px-6 py-4 text-gray-900 dark:text-white text-center"
										role="cell"
										aria-label="Directory: {log.directory || 'root'}"
									>
										{#if log.directory && log.directory !== 'root'}
											<span
												class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
											>
												{log.directory}
											</span>
										{:else}
											<span
												class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full"
											>
												root
											</span>
										{/if}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white text-center" role="cell">
										<div class="flex gap-2 justify-center">
											<button
												on:click={() => viewLog(log.path || log.filename)}
												disabled={viewingLog === log.filename}
												class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs {log.filename.includes(
													'session_'
												)
													? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/30 border border-green-200 dark:border-green-700'
													: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30 border border-blue-200 dark:border-blue-700'} 
												rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
												title="View {log.filename.includes('session_')
													? 'consolidated session'
													: 'individual trace'} log content for {log.filename}"
												aria-label="View log file {log.filename}"
											>
												{#if viewingLog === log.filename}
													<Spinner className="size-3" />
													<span>Loading...</span>
												{:else}
													{#if log.filename.includes('session_')}
														<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
															<path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
															<path
																fill-rule="evenodd"
																d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
																clip-rule="evenodd"
															/>
														</svg>
													{:else}
														<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
															<path
																fill-rule="evenodd"
																d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1a1 1 0 01-1 1H4a1 1 0 110-2V4z"
																clip-rule="evenodd"
															/>
														</svg>
													{/if}
													<span>View</span>
												{/if}
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
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
					<!-- Pagination Info -->
					<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
						<span>
							Showing {startIndex + 1} to {endIndex} of {filteredLogs.length} results
						</span>
						{#if searchQuery}
							<span
								class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
							>
								Filtered
							</span>
						{/if}
						{#if totalLogCount > filteredLogs.length}
							<span
								class="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-200 rounded-full text-xs"
								title="Only showing first {count} files. Increase the 'Show' limit to see more."
							>
								Limited
							</span>
						{/if}
					</div>

					<!-- Pagination Controls -->
					{#if totalPages > 1}
						<nav
							class="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
							aria-label="Pagination"
						>
							<button
								on:click={goToFirstPage}
								disabled={page === 1}
								class="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="sr-only">First</span>
								<svg
									class="h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
									<path
										fill-rule="evenodd"
										d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<button
								on:click={goToPreviousPage}
								disabled={page === 1}
								class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="sr-only">Previous</span>
								<svg
									class="h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>

							<!-- Page Numbers -->
							{#each Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
								let pageNum;
								if (totalPages <= 5) {
									pageNum = i + 1;
								} else if (page <= 3) {
									pageNum = i + 1;
								} else if (page >= totalPages - 2) {
									pageNum = totalPages - 4 + i;
								} else {
									pageNum = page - 2 + i;
								}
								return pageNum;
							}) as pageNum}
								<button
									on:click={() => goToPage(pageNum)}
									class="relative inline-flex items-center px-4 py-2 border text-sm font-medium {page ===
									pageNum
										? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-400'
										: 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'}"
								>
									{pageNum}
								</button>
							{/each}

							<button
								on:click={goToNextPage}
								disabled={page === totalPages}
								class="relative inline-flex items-center px-2 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="sr-only">Next</span>
								<svg
									class="h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
							<button
								on:click={goToLastPage}
								disabled={page === totalPages}
								class="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								<span class="sr-only">Last</span>
								<svg
									class="h-5 w-5"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fill-rule="evenodd"
										d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
										clip-rule="evenodd"
									/>
									<path
										fill-rule="evenodd"
										d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
										clip-rule="evenodd"
									/>
								</svg>
							</button>
						</nav>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Future Feature Modal -->
{#if showFeatureModal}
	<div
		class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
		on:click={closeFeatureModal}
	>
		<div
			class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800"
		>
			<div class="mt-3 text-center">
				<div
					class="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900"
				>
					<svg
						class="h-6 w-6 text-blue-600 dark:text-blue-400"
						xmlns="http://www.w3.org/2000/svg"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
				<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white mt-4">
					Coming Soon
				</h3>
				<div class="mt-2 px-7 py-3">
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{modalMessage}
					</p>
				</div>
				<div class="items-center px-4 py-3">
					<button
						on:click={closeFeatureModal}
						class="px-4 py-2 bg-blue-500 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
					>
						Got it!
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
