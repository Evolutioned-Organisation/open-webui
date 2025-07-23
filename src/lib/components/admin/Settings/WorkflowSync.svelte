<script lang="ts">
	import { onMount, getContext, createEventDispatcher } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { goto } from '$app/navigation';
	import { WEBUI_BASE_URL } from '$lib/constants';

	const dispatch = createEventDispatcher();
	const i18n = getContext('i18n');

	export let saveHandler: Function;

	let syncStatus = 'idle'; // 'idle', 'syncing', 'success', 'error'
	let syncMessage = '';
	let lastSyncTime = null;
	let syncHistory = [];
	let aimbyApiUrl = '';
	let timeoutSeconds = 30;
	let showAdvancedSettings = false;
	let environment = 'unknown';
	let availableUrls = [];
	let toolInstallLoading = false;
	let toolInstallStatus = 'idle'; // 'idle', 'installing', 'success', 'error'
	let toolInstallMessage = '';
	let toolVerifyLoading = false;
	let toolVerifyStatus = 'idle'; // 'idle', 'verifying', 'success', 'error'
	let toolVerifyMessage = '';

	// Load settings from localStorage or use defaults
	onMount(async () => {
		// Detect environment and set up available URLs
		await detectEnvironment();

		const savedSettings = localStorage.getItem('workflowSyncSettings');
		if (savedSettings) {
			const settings = JSON.parse(savedSettings);
			aimbyApiUrl = settings.aimbyApiUrl || getDefaultUrl();
			timeoutSeconds = settings.timeoutSeconds || timeoutSeconds;
		} else {
			aimbyApiUrl = getDefaultUrl();
		}

		// Load sync history
		const savedHistory = localStorage.getItem('workflowSyncHistory');
		if (savedHistory) {
			syncHistory = JSON.parse(savedHistory);
		}
	});

	const detectEnvironment = async () => {
		try {
			// Try to detect if we're in a container environment
			const response = await fetch(`${WEBUI_BASE_URL}/api/config`);
			if (response.ok) {
				const config = await response.json();
				// Check for container-specific indicators
				if (
					window.location.hostname.includes('localhost') ||
					window.location.hostname.includes('127.0.0.1')
				) {
					environment = 'development';
				} else {
					environment = 'production';
				}
			}
		} catch (error) {
			console.warn('Could not detect environment:', error);
			// Default to development if we can't detect
			environment = 'development';
		}

		// Set up available URLs based on environment
		availableUrls = getAvailableUrls();
	};

	const getAvailableUrls = () => {
		const urls = [];

		// Docker container network (internal)
		urls.push({
			url: 'http://aimby-api:8000',
			label: 'Docker Internal (aimby-api:8000)',
			description: 'For container-to-container communication'
		});

		// Local development
		urls.push({
			url: 'http://localhost:8000',
			label: 'Local Development (localhost:8000)',
			description: 'For local development setup'
		});

		// Production external
		urls.push({
			url: 'https://api.aimbient.com',
			label: 'Production External (api.aimbient.com)',
			description: 'For production deployment'
		});

		// Custom URL option
		urls.push({
			url: '',
			label: 'Custom URL',
			description: 'Enter a custom URL'
		});

		return urls;
	};

	const getDefaultUrl = () => {
		if (environment === 'development') {
			return 'http://localhost:8000';
		} else if (environment === 'production') {
			return 'http://aimby-api:8000';
		} else {
			return 'http://aimby-api:8000'; // Default fallback
		}
	};

	const saveSettings = () => {
		const settings = {
			aimbyApiUrl,
			timeoutSeconds
		};
		localStorage.setItem('workflowSyncSettings', JSON.stringify(settings));
		toast.success($i18n.t('Settings saved successfully!'));
	};

	const syncWorkflows = async () => {
		syncStatus = 'syncing';
		syncMessage = 'Starting workflow synchronization...';

		try {
			// Call the AIMBY sync tool through the tools API
			const response = await fetch(`${WEBUI_BASE_URL}/api/v1/tools/execute`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.token}`
				},
				body: JSON.stringify({
					tool_id: 'aimby_sync_workflows',
					function_name: 'sync_workflows',
					parameters: {
						// Pass custom settings as parameters
						custom_api_url: aimbyApiUrl,
						custom_timeout: timeoutSeconds
					}
				})
			});

			if (response.ok) {
				const result = await response.json();
				lastSyncTime = new Date().toISOString();

				// Check if the tool execution was successful
				if (result.success && result.result) {
					// Check if the result contains error information from the tool
					if (typeof result.result === 'string' && result.result.includes('❌')) {
						syncStatus = 'error';
						syncMessage = result.result;
						toast.error($i18n.t('Workflow sync failed'));
					} else {
						syncStatus = 'success';
						syncMessage = result.result;
						toast.success($i18n.t('Workflow sync completed successfully!'));
					}
				} else {
					syncStatus = 'error';
					syncMessage = result.error || result.detail || 'Workflow sync failed';
					toast.error($i18n.t('Workflow sync failed'));
				}

				// Add to history
				const historyEntry = {
					timestamp: lastSyncTime,
					status: syncStatus,
					message: syncMessage,
					result: result.result || result
				};
				syncHistory.unshift(historyEntry);
				if (syncHistory.length > 10) {
					syncHistory = syncHistory.slice(0, 10);
				}
				localStorage.setItem('workflowSyncHistory', JSON.stringify(syncHistory));
			} else {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
		} catch (error) {
			syncStatus = 'error';
			syncMessage = `Sync failed: ${error.message}`;
			lastSyncTime = new Date().toISOString();

			// Add to history
			const historyEntry = {
				timestamp: lastSyncTime,
				status: 'error',
				message: syncMessage,
				error: error.message
			};
			syncHistory.unshift(historyEntry);
			if (syncHistory.length > 10) {
				syncHistory = syncHistory.slice(0, 10);
			}
			localStorage.setItem('workflowSyncHistory', JSON.stringify(syncHistory));

			toast.error($i18n.t('Workflow sync failed!'));
		}
	};

	const getWorkflowStatus = async () => {
		try {
			const response = await fetch(`${WEBUI_BASE_URL}/api/v1/tools/execute`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.token}`
				},
				body: JSON.stringify({
					tool_id: 'aimby_sync_workflows',
					function_name: 'get_workflows_status',
					parameters: {
						// Pass custom settings as parameters
						custom_api_url: aimbyApiUrl,
						custom_timeout: timeoutSeconds
					}
				})
			});

			if (response.ok) {
				const result = await response.json();

				// Check if the tool execution was successful
				if (result.success && result.result) {
					// Check if the result contains error information from the tool
					if (typeof result.result === 'string' && result.result.includes('❌')) {
						toast.error($i18n.t('Failed to get workflow status'));
						throw new Error(result.result);
					} else {
						toast.success($i18n.t('Workflow status retrieved successfully!'));
						return result.result;
					}
				} else {
					toast.error($i18n.t('Failed to get workflow status'));
					throw new Error(result.error || result.detail || 'Failed to get workflow status');
				}
			} else {
				throw new Error(`HTTP ${response.status}: ${response.statusText}`);
			}
		} catch (error) {
			toast.error($i18n.t('Failed to get workflow status!'));
			throw error;
		}
	};

	const installTool = async () => {
		toolInstallLoading = true;
		toolInstallStatus = 'installing';
		toolInstallMessage = 'Installing AIMBY sync tool...';

		try {
			// Call the tool installation API endpoint
			const response = await fetch(`${WEBUI_BASE_URL}/api/v1/utils/admin/install-aimby-tool`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.token}`
				}
			});

			if (response.ok) {
				const result = await response.json();

				if (result.success) {
					toolInstallStatus = 'success';
					toolInstallMessage = result.message || 'Tool installed successfully!';
					toast.success($i18n.t('AIMBY tool installed successfully!'));
				} else {
					toolInstallStatus = 'error';
					toolInstallMessage = result.message || result.error || 'Tool installation failed';
					toast.error($i18n.t('Tool installation failed'));
				}
			} else {
				const errorText = await response.text();
				toolInstallStatus = 'error';
				toolInstallMessage = `Installation failed: ${response.status} ${errorText}`;
				toast.error($i18n.t('Tool installation failed'));
			}
		} catch (error) {
			toolInstallStatus = 'error';
			toolInstallMessage = `Installation error: ${error.message}`;
			toast.error($i18n.t('Tool installation failed'));
		} finally {
			toolInstallLoading = false;
		}
	};

	const verifyTool = async () => {
		toolVerifyLoading = true;
		toolVerifyStatus = 'verifying';
		toolVerifyMessage = 'Verifying AIMBY sync tool...';

		try {
			// Call the tool verification API endpoint
			const response = await fetch(`${WEBUI_BASE_URL}/api/v1/utils/admin/verify-aimby-tool`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.token}`
				}
			});

			if (response.ok) {
				const result = await response.json();

				if (result.success) {
					toolVerifyStatus = 'success';
					toolVerifyMessage = result.message || 'Tool verified successfully!';
					toast.success($i18n.t('AIMBY tool verified successfully!'));
				} else {
					toolVerifyStatus = 'error';
					toolVerifyMessage = result.message || result.error || 'Tool verification failed';
					toast.error($i18n.t('Tool verification failed'));
				}
			} else {
				const errorText = await response.text();
				toolVerifyStatus = 'error';
				toolVerifyMessage = `Verification failed: ${response.status} ${errorText}`;
				toast.error($i18n.t('Tool verification failed'));
			}
		} catch (error) {
			toolVerifyStatus = 'error';
			toolVerifyMessage = `Verification error: ${error.message}`;
			toast.error($i18n.t('Tool verification failed'));
		} finally {
			toolVerifyLoading = false;
		}
	};

	const clearHistory = () => {
		syncHistory = [];
		localStorage.removeItem('workflowSyncHistory');
		toast.success($i18n.t('Sync history cleared!'));
	};

	const testConnection = async () => {
		if (!aimbyApiUrl) {
			toast.error($i18n.t('Please enter a valid API URL'));
			return;
		}

		try {
			const response = await fetch(`${aimbyApiUrl}/health`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json'
				},
				signal: AbortSignal.timeout(timeoutSeconds * 1000)
			});

			if (response.ok) {
				toast.success($i18n.t('Connection successful! API is reachable.'));
			} else {
				toast.warning($i18n.t('API responded but with status: ') + response.status);
			}
		} catch (error) {
			if (error.name === 'AbortError') {
				toast.error($i18n.t('Connection timeout. Please check the URL and try again.'));
			} else {
				toast.error($i18n.t('Connection failed: ') + error.message);
			}
		}
	};
</script>

<div class="flex flex-col h-full justify-between space-y-6 text-sm">
	<div class="space-y-6">
		<!-- Workflow Sync Section -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white">
					{$i18n.t('Workflow Synchronization')}
				</h3>
				<button
					type="button"
					class="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
					on:click={() => (showAdvancedSettings = !showAdvancedSettings)}
				>
					{$i18n.t(showAdvancedSettings ? 'Hide Advanced' : 'Show Advanced')}
				</button>
			</div>

			<p class="text-gray-600 dark:text-gray-400">
				{$i18n.t(
					'Sync workflows from the AIMBY repository and upload them to the pipeline service.'
				)}
			</p>

			<!-- Sync Status -->
			<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium text-gray-900 dark:text-white">
						{$i18n.t('Sync Status')}
					</span>
					{#if lastSyncTime}
						<span class="text-sm text-gray-500 dark:text-gray-400">
							{$i18n.t('Last sync')}: {new Date(lastSyncTime).toLocaleString()}
						</span>
					{/if}
				</div>

				<div class="flex items-center space-x-3">
					{#if syncStatus === 'idle'}
						<div class="w-3 h-3 bg-gray-400 rounded-full"></div>
						<span class="text-gray-600 dark:text-gray-400">{$i18n.t('Ready to sync')}</span>
					{:else if syncStatus === 'syncing'}
						<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
						<span class="text-blue-600 dark:text-blue-400">{$i18n.t('Syncing...')}</span>
					{:else if syncStatus === 'success'}
						<div class="w-3 h-3 bg-green-500 rounded-full"></div>
						<span class="text-green-600 dark:text-green-400">{$i18n.t('Sync completed')}</span>
					{:else if syncStatus === 'error'}
						<div class="w-3 h-3 bg-red-500 rounded-full"></div>
						<span class="text-red-600 dark:text-red-400">{$i18n.t('Sync failed')}</span>
					{/if}
				</div>

				{#if syncMessage}
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{syncMessage}</p>
				{/if}
			</div>

			<!-- Tool Installation Status -->
			<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium text-gray-900 dark:text-white">
						{$i18n.t('Tool Installation Status')}
					</span>
				</div>

				<div class="flex items-center space-x-3">
					{#if toolInstallStatus === 'idle'}
						<div class="w-3 h-3 bg-gray-400 rounded-full"></div>
						<span class="text-gray-600 dark:text-gray-400">{$i18n.t('Tool not installed')}</span>
					{:else if toolInstallStatus === 'installing'}
						<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
						<span class="text-blue-600 dark:text-blue-400">{$i18n.t('Installing...')}</span>
					{:else if toolInstallStatus === 'success'}
						<div class="w-3 h-3 bg-green-500 rounded-full"></div>
						<span class="text-green-600 dark:text-green-400">{$i18n.t('Tool installed')}</span>
					{:else if toolInstallStatus === 'error'}
						<div class="w-3 h-3 bg-red-500 rounded-full"></div>
						<span class="text-red-600 dark:text-red-400">{$i18n.t('Installation failed')}</span>
					{/if}
				</div>

				{#if toolInstallMessage}
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{toolInstallMessage}</p>
				{/if}
			</div>

			<!-- Tool Verification Status -->
			<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
				<div class="flex items-center justify-between mb-2">
					<span class="font-medium text-gray-900 dark:text-white">
						{$i18n.t('Tool Verification Status')}
					</span>
				</div>

				<div class="flex items-center space-x-3">
					{#if toolVerifyStatus === 'idle'}
						<div class="w-3 h-3 bg-gray-400 rounded-full"></div>
						<span class="text-gray-600 dark:text-gray-400">{$i18n.t('Tool not verified')}</span>
					{:else if toolVerifyStatus === 'verifying'}
						<div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
						<span class="text-blue-600 dark:text-blue-400">{$i18n.t('Verifying...')}</span>
					{:else if toolVerifyStatus === 'success'}
						<div class="w-3 h-3 bg-green-500 rounded-full"></div>
						<span class="text-green-600 dark:text-green-400">{$i18n.t('Tool verified')}</span>
					{:else if toolVerifyStatus === 'error'}
						<div class="w-3 h-3 bg-red-500 rounded-full"></div>
						<span class="text-red-600 dark:text-red-400">{$i18n.t('Verification failed')}</span>
					{/if}
				</div>

				{#if toolVerifyMessage}
					<p class="mt-2 text-sm text-gray-600 dark:text-gray-400">{toolVerifyMessage}</p>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex space-x-3">
				<button
					type="button"
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={syncWorkflows}
					disabled={syncStatus === 'syncing'}
				>
					{#if syncStatus === 'syncing'}
						<span
							class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
						></span>
					{/if}
					{$i18n.t('Sync Workflows')}
				</button>

				<button
					type="button"
					class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={installTool}
					disabled={toolInstallLoading}
				>
					{#if toolInstallLoading}
						<span
							class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
						></span>
					{/if}
					{$i18n.t('Install Tool')}
				</button>

				<button
					type="button"
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					on:click={verifyTool}
					disabled={toolVerifyLoading}
				>
					{#if toolVerifyLoading}
						<span
							class="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"
						></span>
					{/if}
					{$i18n.t('Verify Tool')}
				</button>

				<button
					type="button"
					class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
					on:click={clearHistory}
				>
					{$i18n.t('Clear History')}
				</button>
			</div>
		</div>

		<!-- Advanced Settings -->
		{#if showAdvancedSettings}
			<div class="space-y-4 border-t pt-6">
				<h4 class="text-md font-medium text-gray-900 dark:text-white">
					{$i18n.t('Advanced Settings')}
				</h4>

				<!-- Environment Info -->
				<div
					class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
				>
					<div class="flex items-center space-x-2 mb-2">
						<span class="text-sm font-medium text-blue-800 dark:text-blue-200">
							{$i18n.t('Environment')}:
						</span>
						<span class="text-sm text-blue-600 dark:text-blue-300 capitalize">
							{environment}
						</span>
					</div>
					<p class="text-xs text-blue-600 dark:text-blue-300">
						{$i18n.t('Detected environment for optimal URL selection')}
					</p>
				</div>

				<!-- URL Configuration -->
				<div class="space-y-3">
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						{$i18n.t('AIMBY API URL')}
					</label>

					<!-- URL Presets -->
					<div class="space-y-2">
						{#each availableUrls as urlOption}
							<label
								class="flex items-start space-x-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
							>
								<input
									type="radio"
									name="apiUrl"
									value={urlOption.url}
									checked={aimbyApiUrl === urlOption.url}
									on:change={() => {
										if (urlOption.url) {
											aimbyApiUrl = urlOption.url;
										}
									}}
									class="mt-1"
								/>
								<div class="flex-1">
									<div class="text-sm font-medium text-gray-900 dark:text-white">
										{urlOption.label}
									</div>
									<div class="text-xs text-gray-500 dark:text-gray-400">
										{urlOption.description}
									</div>
									{#if urlOption.url}
										<div class="text-xs text-gray-400 dark:text-gray-500 font-mono">
											{urlOption.url}
										</div>
									{/if}
								</div>
							</label>
						{/each}
					</div>

					<!-- Custom URL Input -->
					<div class="mt-4">
						<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
							{$i18n.t('Custom URL (if needed)')}
						</label>
						<input
							type="url"
							bind:value={aimbyApiUrl}
							class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
							placeholder="https://your-custom-api-url.com"
						/>
					</div>
				</div>

				<!-- Timeout Configuration -->
				<div>
					<label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
						{$i18n.t('Timeout (seconds)')}
					</label>
					<input
						type="number"
						bind:value={timeoutSeconds}
						min="5"
						max="300"
						class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
					/>
					<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						{$i18n.t('Maximum time to wait for API response')}
					</div>
				</div>

				<!-- Test Connection Button -->
				<div class="flex space-x-3">
					<button
						type="button"
						class="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
						on:click={saveSettings}
					>
						{$i18n.t('Save Settings')}
					</button>

					<button
						type="button"
						class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
						on:click={testConnection}
					>
						{$i18n.t('Test Connection')}
					</button>
				</div>
			</div>
		{/if}

		<!-- Sync History -->
		{#if syncHistory.length > 0}
			<div class="space-y-4 border-t pt-6">
				<h4 class="text-md font-medium text-gray-900 dark:text-white">
					{$i18n.t('Sync History')}
				</h4>

				<div class="space-y-2 max-h-64 overflow-y-auto">
					{#each syncHistory as entry}
						<div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
							<div class="flex items-center justify-between mb-1">
								<span class="text-sm font-medium text-gray-900 dark:text-white">
									{new Date(entry.timestamp).toLocaleString()}
								</span>
								<span
									class="text-xs px-2 py-1 rounded-full {entry.status === 'success'
										? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
										: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}"
								>
									{entry.status}
								</span>
							</div>
							<p class="text-sm text-gray-600 dark:text-gray-400">{entry.message}</p>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Save Button -->
	<div class="flex justify-end pt-4 border-t">
		<button
			type="button"
			class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
			on:click={() => {
				saveSettings();
				if (saveHandler) saveHandler();
			}}
		>
			{$i18n.t('Save All Settings')}
		</button>
	</div>
</div>
