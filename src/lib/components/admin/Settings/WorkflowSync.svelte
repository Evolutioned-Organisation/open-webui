<script lang="ts">
	import { onMount, getContext, createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { syncWorkflows } from '$lib/apis/auths';
	import { getAimbienceConfig } from '$lib/apis/auths';

	const dispatch = createEventDispatcher();
	const i18n = getContext('i18n');

	export let saveHandler: Function;

	let syncStatus = 'idle'; // 'idle', 'syncing', 'success', 'error'
	let syncMessage = '';
	let lastSyncTime = null;
	let syncHistory = [];
	let aimbienceConfig = null;
	let loading = false;
	let showErrorDetails = false;
	let currentError = null;

	// Load settings and history on mount
	onMount(async () => {
		await loadAimbienceConfig();
		loadSyncHistory();
	});

	const loadAimbienceConfig = async () => {
		try {
			aimbienceConfig = await getAimbienceConfig(localStorage.token);
			console.log('Loaded Aimbience config:', aimbienceConfig);
		} catch (error) {
			console.error('Error loading Aimbience config:', error);
			toast.error('Failed to load Aimbience configuration');
		}
	};

	const loadSyncHistory = () => {
		const savedHistory = localStorage.getItem('workflowSyncHistory');
		if (savedHistory) {
			try {
				syncHistory = JSON.parse(savedHistory);
			} catch (error) {
				console.error('Error parsing sync history:', error);
				syncHistory = [];
			}
		}
	};

	const saveSyncHistory = () => {
		try {
			localStorage.setItem('workflowSyncHistory', JSON.stringify(syncHistory));
		} catch (error) {
			console.error('Error saving sync history:', error);
		}
	};

	const syncWorkflowsHandler = async () => {
		if (!aimbienceConfig?.ENABLE_AIMBENCE) {
			toast.error(
				'AIMbience integration is not enabled. Please enable it in the AIMbience Configuration tab first.'
			);
			return;
		}

		if (!aimbienceConfig?.AIMBENCE_API_BASE_URL) {
			toast.error(
				'AIMbience API base URL is not configured. Please configure it in the AIMbience Configuration tab first.'
			);
			return;
		}

		syncStatus = 'syncing';
		syncMessage = 'Starting workflow synchronization...';
		loading = true;

		try {
			console.log('Starting workflow synchronization...');
			console.log('Using AIMbience config:', aimbienceConfig);

			// Call the new direct workflow sync endpoint
			const result = await syncWorkflows(localStorage.token, {
				timeout: aimbienceConfig.AIMBENCE_TIMEOUT || 30,
				source: 'open-webui-admin',
				timestamp: new Date().toISOString()
			});

			if (result) {
				lastSyncTime = new Date().toISOString();
				syncStatus = 'success';
				syncMessage = 'Workflow synchronization completed successfully!';

				// Add to history
				const historyEntry = {
					timestamp: lastSyncTime,
					status: 'success',
					message: syncMessage,
					result: result,
					config: {
						api_url: aimbienceConfig.AIMBENCE_API_BASE_URL,
						timeout: aimbienceConfig.AIMBENCE_TIMEOUT
					}
				};

				syncHistory.unshift(historyEntry);
				if (syncHistory.length > 10) {
					syncHistory = syncHistory.slice(0, 10);
				}
				saveSyncHistory();

				toast.success('Workflow sync completed successfully!');
				console.log('Workflow sync result:', result);
			} else {
				throw new Error('No response received from workflow sync');
			}
		} catch (error) {
			console.error('Workflow sync error:', error);

			lastSyncTime = new Date().toISOString();
			syncStatus = 'error';

			// Capture detailed error information
			currentError = {
				message: error.message || 'Unknown error occurred',
				details: null,
				suggestions: [],
				technical_info: {}
			};

			// Try to extract detailed error information from the response
			if (error.detail) {
				if (typeof error.detail === 'object') {
					currentError.details = error.detail;
					currentError.message = error.detail.message || error.detail.error || error.message;
					currentError.suggestions = error.detail.suggestions || [];
					currentError.technical_info = {
						error_type: error.detail.error,
						http_status: error.detail.http_status,
						http_status_text: error.detail.http_status_text,
						target_url: error.detail.target_url,
						request_data: error.detail.request_data,
						response_headers: error.detail.response_headers,
						response_content: error.detail.response_content
					};
				} else {
					currentError.message = error.detail;
				}
			}

			// Provide more specific error messages based on error type
			let errorMessage = currentError.message;

			if (error.message) {
				if (error.message.includes('401')) {
					errorMessage = 'Authentication failed. Please check your AIMbience API key.';
				} else if (error.message.includes('404')) {
					errorMessage =
						'Workflow sync endpoint not found. Please check your AIMbience API configuration.';
				} else if (error.message.includes('500')) {
					errorMessage = 'Server error during workflow sync. Please try again later.';
				} else if (error.message.includes('timeout')) {
					errorMessage = 'Workflow sync timed out. Please check your AIMbience API connection.';
				} else if (error.message.includes('Configuration Error')) {
					errorMessage = 'AIMbience configuration error. Please check your settings.';
				} else if (error.message.includes('Connection Error')) {
					errorMessage = 'Connection failed. Please check if the AIMby API server is accessible.';
				} else if (error.message.includes('Timeout Error')) {
					errorMessage = 'Request timed out. The AIMby API server may be slow or overloaded.';
				}
			}

			syncMessage = errorMessage;

			// Add to history
			const historyEntry = {
				timestamp: lastSyncTime,
				status: 'error',
				message: errorMessage,
				error: error.message,
				error_details: currentError,
				config: {
					api_url: aimbienceConfig?.AIMBENCE_API_BASE_URL,
					timeout: aimbienceConfig?.AIMBENCE_TIMEOUT
				}
			};

			syncHistory.unshift(historyEntry);
			if (syncHistory.length > 10) {
				syncHistory.slice(0, 10);
			}
			saveSyncHistory();

			toast.error(errorMessage);
		} finally {
			loading = false;
		}
	};

	const clearHistory = () => {
		syncHistory = [];
		localStorage.removeItem('workflowSyncHistory');
		toast.success('Sync history cleared');
	};

	const getStatusType = (status: string) => {
		switch (status) {
			case 'success':
				return 'success';
			case 'error':
				return 'error';
			case 'syncing':
				return 'warning';
			default:
				return 'muted';
		}
	};

	const formatTimestamp = (timestamp: string) => {
		try {
			return new Date(timestamp).toLocaleString();
		} catch {
			return timestamp;
		}
	};
</script>

<div class="space-y-6">
	<!-- Header Section -->
	<div class="border-b border-gray-200 dark:border-gray-700 pb-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Workflow Synchronization</h3>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Synchronize workflow pipelines from the local AIMbience workflows submodule to the AIMby API.
			This process builds and deploys the latest workflow definitions.
		</p>
	</div>

	<!-- Configuration Status -->
	{#if aimbienceConfig}
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
			<div class="px-4 py-5 sm:px-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
					AIMbience Configuration Status
				</h3>
			</div>
			<div class="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
				<dl class="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Integration Status</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">
							{#if aimbienceConfig.ENABLE_AIMBENCE}
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
								>
									Enabled
								</span>
							{:else}
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
								>
									Disabled
								</span>
							{/if}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">API Base URL</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">
							{aimbienceConfig.AIMBENCE_API_BASE_URL || 'Not configured'}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">API Key</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">
							{aimbienceConfig.AIMBENCE_API_KEY ? 'Configured' : 'Not configured'}
						</dd>
					</div>
					<div>
						<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Timeout</dt>
						<dd class="mt-1 text-sm text-gray-900 dark:text-white">
							{aimbienceConfig.AIMBENCE_TIMEOUT || 30} seconds
						</dd>
					</div>
				</dl>
			</div>
		</div>
	{/if}

	<!-- Sync Control Section -->
	<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
		<div class="px-4 py-5 sm:px-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
				Synchronize Workflows
			</h3>
			<p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
				Click the button below to synchronize workflows from the local submodule to the AIMby API.
				This will build and deploy the latest workflow pipeline definitions.
			</p>
		</div>
		<div class="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
			<div class="flex items-center space-x-4">
				<button
					type="button"
					class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={syncWorkflowsHandler}
					disabled={loading || !aimbienceConfig?.ENABLE_AIMBENCE}
				>
					{#if loading}
						<span
							class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
						></span>
						Synchronizing...
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="h-4 w-4 mr-2"
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

				{#if lastSyncTime}
					<div class="text-sm text-gray-500 dark:text-gray-400">
						Last sync: {formatTimestamp(lastSyncTime)}
					</div>
				{/if}
			</div>

			{#if syncStatus !== 'idle'}
				<div class="mt-4" data-error-section>
					<div
						class="rounded-md p-4 {syncStatus === 'success'
							? 'bg-green-50 dark:bg-green-900'
							: syncStatus === 'error'
								? 'bg-red-50 dark:bg-red-900'
								: 'bg-blue-50 dark:bg-blue-900'}"
					>
						<div class="flex">
							<div class="flex-shrink-0">
								{#if syncStatus === 'success'}
									<svg
										class="h-5 w-5 text-green-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
											clip-rule="evenodd"
										/>
									</svg>
								{:else if syncStatus === 'error'}
									<svg
										class="h-5 w-5 text-red-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clip-rule="evenodd"
										/>
									</svg>
								{:else}
									<svg
										class="h-5 w-5 text-blue-400"
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 20 20"
										fill="currentColor"
									>
										<path
											fill-rule="evenodd"
											d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
											clip-rule="evenodd"
										/>
									</svg>
								{/if}
							</div>
							<div class="ml-3 flex-1">
								<p
									class="text-sm font-medium {syncStatus === 'success'
										? 'text-green-800 dark:text-green-200'
										: syncStatus === 'error'
											? 'text-red-800 dark:text-red-200'
											: 'text-blue-800 dark:text-blue-200'}"
								>
									{syncMessage}
								</p>

								{#if syncStatus === 'error' && currentError && (currentError.suggestions?.length > 0 || currentError.technical_info)}
									<div class="mt-3">
										<button
											type="button"
											class="text-sm text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
											on:click={() => (showErrorDetails = !showErrorDetails)}
										>
											{showErrorDetails ? 'Hide' : 'Show'} Technical Details
										</button>

										{#if showErrorDetails}
											<div class="mt-3 space-y-3">
												<!-- Suggestions -->
												{#if currentError.suggestions?.length > 0}
													<div>
														<h4 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
															Troubleshooting Suggestions:
														</h4>
														<ul class="list-disc list-inside space-y-1">
															{#each currentError.suggestions as suggestion}
																<li class="text-sm text-red-700 dark:text-red-300">{suggestion}</li>
															{/each}
														</ul>
													</div>
												{/if}

												<!-- Technical Information -->
												{#if currentError.technical_info && Object.keys(currentError.technical_info).length > 0}
													<div>
														<h4 class="text-sm font-medium text-red-800 dark:text-red-200 mb-2">
															Technical Information:
														</h4>
														<div class="bg-red-100 dark:bg-red-900/30 rounded p-3 space-y-2">
															{#if currentError.technical_info.error_type}
																<div class="text-xs">
																	<span class="font-medium">Error Type:</span>
																	<span class="font-mono"
																		>{currentError.technical_info.error_type}</span
																	>
																</div>
															{/if}

															{#if currentError.technical_info.http_status}
																<div class="text-xs">
																	<span class="font-medium">HTTP Status:</span>
																	<span class="font-mono"
																		>{currentError.technical_info.http_status}
																		{currentError.technical_info.http_status_text || ''}</span
																	>
																</div>
															{/if}

															{#if currentError.technical_info.target_url}
																<div class="text-xs">
																	<span class="font-medium">Target URL:</span>
																	<span class="font-mono break-all"
																		>{currentError.technical_info.target_url}</span
																	>
																</div>
															{/if}

															{#if currentError.technical_info.request_data && Object.keys(currentError.technical_info.request_data).length > 0}
																<div class="text-xs">
																	<span class="font-medium">Request Data:</span>
																	<pre
																		class="font-mono text-xs mt-1 bg-red-200 dark:bg-red-800 p-2 rounded overflow-x-auto">{JSON.stringify(
																			currentError.technical_info.request_data,
																			null,
																			2
																		)}</pre>
																</div>
															{/if}

															{#if currentError.technical_info.response_content}
																<div class="text-xs">
																	<span class="font-medium">Response Content:</span>
																	<pre
																		class="font-mono text-xs mt-1 bg-red-200 dark:bg-red-800 p-2 rounded overflow-x-auto">{typeof currentError
																			.technical_info.response_content === 'string'
																			? currentError.technical_info.response_content
																			: JSON.stringify(
																					currentError.technical_info.response_content,
																					null,
																					2
																				)}</pre>
																</div>
															{/if}
														</div>
													</div>
												{/if}
											</div>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>
	</div>

	<!-- Sync History Section -->
	{#if syncHistory.length > 0}
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
			<div class="px-4 py-5 sm:px-6 flex justify-between items-center">
				<div>
					<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">Sync History</h3>
					<p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
						Recent workflow synchronization attempts and their results.
					</p>
				</div>
				<button
					type="button"
					class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					on:click={clearHistory}
				>
					Clear History
				</button>
			</div>
			<div class="border-t border-gray-200 dark:border-gray-700">
				<ul class="divide-y divide-gray-200 dark:divide-gray-700">
					{#each syncHistory as entry, index}
						<li class="px-4 py-4">
							<div class="flex items-center justify-between">
								<div class="flex items-center flex-1">
									<div class="flex-shrink-0">
										<span
											class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-{getStatusType(
												entry.status
											)}-100 text-{getStatusType(entry.status)}-800 dark:bg-{getStatusType(
												entry.status
											)}-900 dark:text-{getStatusType(entry.status)}-200"
										>
											{entry.status}
										</span>
									</div>
									<div class="ml-4 flex-1">
										<div class="text-sm font-medium text-gray-900 dark:text-white">
											{entry.message}
										</div>
										<div class="text-sm text-gray-500 dark:text-gray-400">
											{formatTimestamp(entry.timestamp)}
										</div>
										{#if entry.config}
											<div class="text-xs text-gray-400 dark:text-gray-500 mt-1">
												API: {entry.config.api_url} | Timeout: {entry.config.timeout}s
											</div>
										{/if}

										<!-- Error Details for Failed Syncs -->
										{#if entry.status === 'error' && entry.error_details}
											<div class="mt-2">
												<button
													type="button"
													class="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-200 underline"
													on:click={() => {
														currentError = entry.error_details;
														showErrorDetails = true;
														// Scroll to the error details section
														setTimeout(() => {
															const errorSection = document.querySelector('[data-error-section]');
															if (errorSection) {
																errorSection.scrollIntoView({
																	behavior: 'smooth',
																	block: 'center'
																});
															}
														}, 100);
													}}
												>
													View Error Details
												</button>
											</div>
										{/if}
									</div>
								</div>
							</div>
						</li>
					{/each}
				</ul>
			</div>
		</div>
	{/if}
</div>
