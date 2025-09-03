<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	// Utility imports for validation and error handling
	import { validateFilePath, createSafeErrorMessage } from '$lib/utils/validation';
	import {
		globalErrorHandler,
		createErrorContext,
		withGracefulDegradation
	} from '$lib/utils/errorHandling';

	// API and component imports
	import {
		getLogDirectoryStructureViaProxy,
		type LogDirectoryStructure,
		type LogDirectoryInfo
	} from '$lib/apis/aimby';
	import { getAimbienceConfig } from '$lib/apis/auths';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import ChevronRight from '$lib/components/icons/ChevronRight.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Folder from '$lib/components/icons/Folder.svelte';
	import File from '$lib/components/icons/File.svelte';

	const i18n = getContext('i18n');

	// Configuration and data state
	let aimbienceConfig: any | null = null;
	let directoryStructure: LogDirectoryStructure | null = null;
	let loading = false;
	let lastError: string | null = null;
	let retryCount = 0;

	// View state
	let expandedFolders: Set<string> = new Set();
	let selectedFolder: string | null = null;
	let selectedFile: string | null = null;

	// File viewing state
	let viewingLog: string | null = null;

	// Search functionality
	let searchQuery = '';
	let filteredDirectories: LogDirectoryInfo[] = [];

	// Reset search when structure changes
	$: if (directoryStructure) {
		filteredDirectories = directoryStructure.directories.filter((dir) => {
			if (!searchQuery.trim()) return true;
			const query = searchQuery.toLowerCase();
			return (
				dir.chat_id.toLowerCase().includes(query) ||
				dir.files.some(
					(file) =>
						file.filename.toLowerCase().includes(query) || file.path.toLowerCase().includes(query)
				)
			);
		});
	}

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

	const formatRelativeTime = (timestamp?: number) => {
		if (!timestamp) return 'N/A';
		try {
			return dayjs(timestamp * 1000).fromNow();
		} catch {
			return 'Invalid Date';
		}
	};

	const toggleFolder = (chatId: string) => {
		if (expandedFolders.has(chatId)) {
			expandedFolders.delete(chatId);
		} else {
			expandedFolders.add(chatId);
		}
		expandedFolders = expandedFolders; // Trigger reactivity
	};

	const selectFolder = (chatId: string) => {
		selectedFolder = selectedFolder === chatId ? null : chatId;
		selectedFile = null;
	};

	const selectFile = (filePath: string) => {
		selectedFile = selectedFile === filePath ? null : filePath;
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
			const context = createErrorContext('viewLog', 'LogFolderView', { filePath });
			globalErrorHandler.handleError(error, context);

			// Show user-friendly error message
			toast.error(`Failed to open log file "${filePath}". Please try refreshing the log list.`);
		} finally {
			// Reset loading state
			viewingLog = null;
		}
	};

	const fetchDirectoryStructure = async (isRetry: boolean = false) => {
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

			console.log('Fetching directory structure with config:', {
				baseUrl: aimbienceConfig.AIMBENCE_API_BASE_URL,
				enabled: aimbienceConfig.ENABLE_AIMBENCE
			});

			// Use proxy function to avoid CORS issues with direct AIMBY-API calls
			const response = await getLogDirectoryStructureViaProxy(localStorage.token || '');
			if (response) {
				directoryStructure = response;
				retryCount = 0; // Reset retry count on successful request

				// Provide appropriate user feedback based on context
				const displayMessage = `Retrieved ${response.total_directories} chat directories with ${response.total_files} total files`;

				if (!isRetry) {
					toast.success(displayMessage);
				} else {
					toast.success(`Successfully ${displayMessage.toLowerCase()} after retry`);
				}
			} else {
				throw new Error(
					'No response received from server - the logs structure endpoint may not be available on your AIMBY-API instance'
				);
			}
		} catch (error) {
			// Use centralized error handling for consistent error management
			const context = createErrorContext('fetchDirectoryStructure', 'LogFolderView');
			const handled = globalErrorHandler.handleError(error, context);

			// Reset state and prepare error display
			directoryStructure = null;

			// Create more informative error messages
			let errorMessage = createSafeErrorMessage(error, 'Failed to fetch log directory structure');
			if (errorMessage.includes('No response received')) {
				errorMessage =
					'Unable to connect to AIMBY-API logs structure endpoint. Please verify that your AIMBY-API instance supports the /api/v1/logs/structure endpoint.';
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

	const refreshStructure = () => {
		fetchDirectoryStructure(true);
	};

	const retryFetchStructure = () => {
		fetchDirectoryStructure(true);
	};

	onMount(async () => {
		// Load Aimbience config from dedicated endpoint with graceful degradation
		await withGracefulDegradation(
			async () => {
				const config = await getAimbienceConfig(localStorage.token);
				if (config) {
					aimbienceConfig = config;
					console.log('LogFolderView: Loaded config from backend:', aimbienceConfig);
				} else {
					console.log('LogFolderView: No Aimbience config found in backend');
				}
			},
			null,
			createErrorContext('loadAimbienceConfig', 'LogFolderView')
		);

		// Always attempt to fetch directory structure, even if config loading failed
		await fetchDirectoryStructure();
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
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white" id="log-folder-view-title">
					Chat Session Folders
				</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Browse logs organized by chat sessions
				</p>
			</div>
			<div class="flex gap-2">
				<button
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
					on:click={refreshStructure}
					disabled={loading}
					aria-label="Refresh directory structure"
					title="Refresh directory structure"
				>
					<svg
						class="size-4 {loading ? 'animate-spin' : ''}"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
						/>
					</svg>
					{loading ? 'Refreshing...' : 'Refresh'}
				</button>
			</div>
		</div>

		<!-- Error Display -->
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
							Error Loading Directory Structure
						</h3>
						<p class="mt-1 text-sm text-red-700 dark:text-red-300">
							{lastError}
						</p>
						<div class="mt-3 flex gap-2">
							<button
								on:click={retryFetchStructure}
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

		<!-- Stats Cards -->
		{#if directoryStructure}
			<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Total Directories -->
				<div
					class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Chat Sessions</div>
							<div class="text-2xl font-bold text-blue-700 dark:text-blue-300">
								{directoryStructure.total_directories}
							</div>
						</div>
						<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
							<Folder className="w-5 h-5 text-blue-600 dark:text-blue-400" />
						</div>
					</div>
				</div>

				<!-- Total Files -->
				<div
					class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Files</div>
							<div class="text-2xl font-bold text-green-700 dark:text-green-300">
								{directoryStructure.total_files}
							</div>
						</div>
						<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
							<File className="w-5 h-5 text-green-600 dark:text-green-400" />
						</div>
					</div>
				</div>

				<!-- Total Size -->
				<div
					class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="flex items-center justify-between">
						<div>
							<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Size</div>
							<div class="text-2xl font-bold text-purple-700 dark:text-purple-300">
								{formatFileSize(directoryStructure.total_size)}
							</div>
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
			</div>
		{/if}

		<!-- Search Section -->
		{#if directoryStructure}
			<div
				class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
			>
				<div class="px-6 py-4">
					<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
						<div class="flex-1 max-w-md">
							<label for="folder-search" class="sr-only">Search chat sessions</label>
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
										/>
									</svg>
								</div>
								<input
									id="folder-search"
									type="text"
									bind:value={searchQuery}
									class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors duration-200"
									placeholder="Search chat sessions or files..."
									maxlength="100"
								/>
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
											/>
										</svg>
									</button>
								{/if}
							</div>
						</div>
						<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
							<span
								>Showing {filteredDirectories.length} of {directoryStructure?.total_directories ||
									0} chat sessions</span
							>
							{#if searchQuery}
								<span
									class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
								>
									Filtered
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{/if}

		<!-- Folder Tree -->
		<div
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
		>
			{#if loading}
				<div class="flex items-center justify-center py-16">
					<Spinner className="size-8" />
				</div>
			{:else if !directoryStructure || filteredDirectories.length === 0}
				<div class="text-center py-16">
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
							<Folder className="w-8 h-8 text-gray-400" />
						{/if}
					</div>
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-2">
						{#if searchQuery}
							No Chat Sessions Found
						{:else}
							No Chat Sessions Available
						{/if}
					</h3>
					<div class="text-gray-500 dark:text-gray-400 text-sm mb-4">
						{#if searchQuery}
							No chat sessions found matching "{searchQuery}"
						{:else}
							No chat session folders are currently available. Try running a workflow to generate
							logs.
						{/if}
					</div>
					{#if searchQuery}
						<button
							on:click={() => (searchQuery = '')}
							class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
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
				<div class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each filteredDirectories as directory (directory.chat_id)}
						<div class="p-4">
							<!-- Folder Header -->
							<div
								class="flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg p-2 -m-2 transition-colors duration-200"
								on:click={() => {
									toggleFolder(directory.chat_id);
									selectFolder(directory.chat_id);
								}}
								on:keydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault();
										toggleFolder(directory.chat_id);
										selectFolder(directory.chat_id);
									}
								}}
								tabindex="0"
								role="button"
								aria-expanded={expandedFolders.has(directory.chat_id)}
								aria-label="Toggle folder {directory.chat_id}"
							>
								<div class="flex items-center gap-3">
									<div class="flex items-center">
										{#if expandedFolders.has(directory.chat_id)}
											<ChevronDown className="size-4 text-gray-500 dark:text-gray-400" />
										{:else}
											<ChevronRight className="size-4 text-gray-500 dark:text-gray-400" />
										{/if}
									</div>
									<Folder className="size-5 text-blue-600 dark:text-blue-400" />
									<div>
										<div class="font-medium text-gray-900 dark:text-white">
											{directory.chat_id}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">
											{directory.file_count} files • {formatFileSize(directory.total_size)}
										</div>
									</div>
								</div>
								<div class="text-sm text-gray-500 dark:text-gray-400">
									{formatRelativeTime(directory.latest_file.modified)}
								</div>
							</div>

							<!-- Folder Contents -->
							{#if expandedFolders.has(directory.chat_id)}
								<div class="mt-3 ml-8 space-y-2">
									{#each directory.files as file (file.path)}
										<div
											class="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-200 {selectedFile ===
											file.path
												? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700'
												: ''}"
											on:click={() => {
												selectFile(file.path);
											}}
											on:keydown={(e) => {
												if (e.key === 'Enter' || e.key === ' ') {
													e.preventDefault();
													selectFile(file.path);
												}
											}}
											tabindex="0"
											role="button"
											aria-label="Select file {file.filename}"
										>
											<div class="flex items-center gap-3">
												<File className="size-4 text-gray-500 dark:text-gray-400" />
												<div>
													<div class="font-mono text-sm text-gray-900 dark:text-white">
														{file.filename}
													</div>
													<div class="text-xs text-gray-500 dark:text-gray-400">
														{formatFileSize(file.size)} • {formatRelativeTime(file.modified)}
													</div>
												</div>
											</div>
											<button
												on:click|stopPropagation={() => viewLog(file.path)}
												disabled={viewingLog === file.filename}
												class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
												title="View log content for {file.filename}"
												aria-label="View log file {file.filename}"
											>
												{#if viewingLog === file.filename}
													<Spinner className="size-3" />
													<span>Loading...</span>
												{:else}
													<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
														<path
															fill-rule="evenodd"
															d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 110 2h-3a1 1 0 01-1-1v-1a1 1 0 00-1-1H9a1 1 0 00-1 1v1a1 1 0 01-1 1H4a1 1 0 110-2V4z"
															clip-rule="evenodd"
														/>
													</svg>
													<span>View</span>
												{/if}
											</button>
										</div>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
