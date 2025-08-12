<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getAimbienceConfig, updateAimbienceConfig } from '$lib/apis/auths';

	const i18n = getContext('i18n');

	export let saveHandler: Function;

	let aimbienceConfig = {
		ENABLE_AIMBENCE: false,
		AIMBENCE_API_BASE_URL: 'http://localhost:8000',
		AIMBENCE_API_KEY: '',
		AIMBENCE_TIMEOUT: 30,
		AIMBENCE_BATCH_SIZE: 10
	};

	let loading = false;

	const updateHandler = async () => {
		loading = true;
		try {
			console.log('Starting to save Aimbience config...');

			// Save using dedicated Aimbience config endpoint with timeout
			const res = await Promise.race([
				updateAimbienceConfig(localStorage.token, aimbienceConfig),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Aimbience config save timeout')), 10000)
				)
			]);
			console.log('Save response:', res);

			if (res) {
				// Verify that our settings were actually saved by reloading
				const savedConfig = await Promise.race([
					getAimbienceConfig(localStorage.token),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('Aimbience config reload timeout')), 10000)
					)
				]);
				console.log('Reloaded Aimbience config after save:', savedConfig);

				if (savedConfig) {
					console.log('Aimbience config successfully saved to backend');
					toast.success($i18n.t('AImbience settings updated successfully'));
					saveHandler();
				} else {
					console.log('Failed to reload Aimbience config');
					toast.error($i18n.t('Settings saved but failed to verify. Please refresh the page.'));
				}
			} else {
				console.log('Save failed');
				toast.error($i18n.t('Failed to update Aimbience settings'));
			}
		} catch (error) {
			console.error('Error updating Aimbience config:', error);
			toast.error($i18n.t('Failed to update Aimbience settings: ') + error.message);
		} finally {
			loading = false;
		}
	};

	const testConnection = async () => {
		if (!aimbienceConfig.ENABLE_AIMBENCE) {
			toast.error($i18n.t('Please enable Aimbience integration first'));
			return;
		}

		loading = true;
		try {
			console.log('Testing Aimbience API connection through Open WebUI proxy...');

			// Test through Open WebUI proxy to avoid CORS issues
			const proxyUrl = `/api/v1/auths/admin/aimbience/proxy/health`;
			console.log('Using proxy URL:', proxyUrl);
			console.log('API Key provided:', aimbienceConfig.AIMBENCE_API_KEY ? 'Yes' : 'No');

			const controller = new AbortController();
			const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

			console.log('Making fetch request through proxy...');
			const response = await fetch(proxyUrl, {
				method: 'GET',
				headers: {
					Accept: 'application/json',
					'Content-Type': 'application/json',
					Authorization: `Bearer ${localStorage.token}`
				},
				signal: controller.signal
			});

			clearTimeout(timeoutId);
			console.log('Test connection response:', response.status, response.statusText);

			if (response.ok) {
				const data = await response.json();
				console.log('Test connection successful, data:', data);
				toast.success($i18n.t('Connection test successful!'));
			} else {
				let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
				try {
					const errorData = await response.json();
					if (errorData.detail) {
						errorMessage = errorData.detail;
					} else if (errorData.message) {
						errorMessage = errorData.message;
					}
				} catch (parseError) {
					// If we can't parse the error response, use the status text
				}

				console.error('Test connection failed:', errorMessage);
				toast.error(`Connection test failed: ${errorMessage}`);
			}
		} catch (error) {
			console.error('Connection test error:', error);
			console.error('Error name:', error.name);
			console.error('Error message:', error.message);
			console.error('Error stack:', error.stack);

			let errorMessage = 'Unknown error occurred';
			if (error.name === 'AbortError') {
				errorMessage = 'Connection timeout - the server took too long to respond';
			} else if (error.name === 'TypeError' && error.message.includes('fetch')) {
				errorMessage = 'Network error - check if the Open WebUI backend is accessible';
			} else if (error.message) {
				errorMessage = error.message;
			}

			toast.error(`Connection test failed: ${errorMessage}`);
		} finally {
			loading = false;
		}
	};

	onMount(async () => {
		try {
			console.log('Loading Aimbience config on mount...');

			// Load Aimbience config from dedicated endpoint with timeout
			const config = await Promise.race([
				getAimbienceConfig(localStorage.token),
				new Promise((_, reject) =>
					setTimeout(() => reject(new Error('Aimbience config load timeout')), 10000)
				)
			]);

			if (config) {
				aimbienceConfig = { ...aimbienceConfig, ...config };
				console.log('Loaded Aimbience config from backend:', aimbienceConfig);
			} else {
				console.log('No Aimbience config found in backend, using defaults');
			}
		} catch (error) {
			console.error('Error loading Aimbience config from backend:', error);
			toast.error($i18n.t('Failed to load Aimbience config: ') + error.message);
		}
	});
</script>

<form
	class="flex flex-col h-full justify-between space-y-3 text-sm"
	on:submit|preventDefault={async () => {
		updateHandler();
	}}
>
	<div class="space-y-3 overflow-y-scroll scrollbar-hidden h-full">
		<!-- Aimbience Feature Toggle -->
		<div>
			<div class="mb-2 text-sm font-medium">{$i18n.t('Aimbience Integration')}</div>
			<div class="flex w-full justify-between items-center">
				<div class="text-xs text-gray-600 dark:text-gray-400">
					{$i18n.t('Enable Aimbience features and API integration')}
				</div>
				<label class="relative inline-flex items-center cursor-pointer">
					<input
						type="checkbox"
						bind:checked={aimbienceConfig.ENABLE_AIMBENCE}
						class="sr-only peer"
					/>
					<div
						class="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"
					></div>
				</label>
			</div>
		</div>

		{#if aimbienceConfig.ENABLE_AIMBENCE}
			<hr class="border-gray-200 dark:border-gray-700" />

			<!-- API Configuration -->
			<div>
				<div class="mb-2 text-sm font-medium">{$i18n.t('API Configuration')}</div>

				<!-- API Base URL -->
				<div class="mb-3">
					<label
						for="api-url"
						class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
					>
						{$i18n.t('AIMBENCE API Base URL')}
					</label>
					<input
						id="api-url"
						type="url"
						bind:value={aimbienceConfig.AIMBENCE_API_BASE_URL}
						placeholder="http://localhost:8000"
						class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						required
					/>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{$i18n.t('The base URL for the AIMBENCE API (e.g., http://localhost:8000)')}
					</p>
				</div>

				<!-- API Key -->
				<div class="mb-3">
					<label
						for="api-key"
						class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
					>
						{$i18n.t('AIMBENCE API Key')}
					</label>
					<input
						id="api-key"
						type="password"
						bind:value={aimbienceConfig.AIMBENCE_API_KEY}
						placeholder="Enter your API key"
						class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					/>
					<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
						{$i18n.t('Optional: API key for authenticated requests to AIMBENCE')}
					</p>
				</div>

				<!-- Connection Test Button -->
				<div class="mb-3">
					<button
						type="button"
						class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900 border border-blue-300 dark:border-blue-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
						on:click={testConnection}
						disabled={loading || !aimbienceConfig.AIMBENCE_API_BASE_URL}
					>
						{#if loading}
							<svg
								class="animate-spin -ml-1 mr-2 h-4 w-4 text-blue-700 dark:text-blue-300"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
						{:else}
							<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 10V3L4 14h7v7l9-11h-7z"
								></path>
							</svg>
						{/if}
						{$i18n.t('Test Connection')}
					</button>
				</div>

				<hr class="border-gray-200 dark:border-gray-700" />

				<!-- Advanced Settings -->
				<div>
					<div class="mb-2 text-sm font-medium">{$i18n.t('Advanced Settings')}</div>

					<!-- Timeout -->
					<div class="mb-3">
						<label
							for="timeout"
							class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
						>
							{$i18n.t('API Timeout (seconds)')}
						</label>
						<input
							id="timeout"
							type="number"
							bind:value={aimbienceConfig.AIMBENCE_TIMEOUT}
							min="5"
							max="300"
							class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{$i18n.t('Maximum time to wait for API responses (5-300 seconds)')}
						</p>
					</div>

					<!-- Batch Size -->
					<div class="mb-3">
						<label
							for="batch-size"
							class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
						>
							{$i18n.t('Default Batch Size')}
						</label>
						<input
							id="batch-size"
							type="number"
							bind:value={aimbienceConfig.AIMBENCE_BATCH_SIZE}
							min="1"
							max="100"
							class="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
						/>
						<p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
							{$i18n.t('Default number of batches to retrieve from the API (1-100)')}
						</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- Save Button -->
	<div class="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
		<button
			type="submit"
			class="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
			disabled={loading}
		>
			{#if loading}
				<svg
					class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
			{:else}
				<svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"
					></path>
				</svg>
			{/if}
			{$i18n.t('Save Settings')}
		</button>
	</div>
</form>
