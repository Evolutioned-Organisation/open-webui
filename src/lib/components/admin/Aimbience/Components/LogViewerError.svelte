<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { createSafeErrorMessage } from '$lib/utils/log-utils';

	// Event dispatcher for parent communication
	const dispatch = createEventDispatcher<{
		retry: void;
		goBack: void;
	}>();

	// Props
	export let errorMessage: string = '';
	export let isRetrying: boolean = false;
	export let filename: string = '';

	// Computed values
	$: safeErrorMessage = createSafeErrorMessage(errorMessage);
	$: isNotFoundError = errorMessage.toLowerCase().includes('not found');
	$: isNetworkError = errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch');

	// Event handlers
	function handleRetry() {
		dispatch('retry');
	}

	function handleGoBack() {
		dispatch('goBack');
	}
</script>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4">
	<div class="max-w-md w-full">
		<div class="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
			<!-- Error Icon -->
			<div class="flex items-center justify-center w-12 h-12 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full">
				<svg class="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>

			<!-- Error Title -->
			<h2 class="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
				{#if isNotFoundError}
					File Not Found
				{:else if isNetworkError}
					Network Error
				{:else}
					Error Loading Log
				{/if}
			</h2>

			<!-- Error Message -->
			<div class="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
				{#if isNotFoundError}
					<p class="mb-2">The log file <code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">{filename}</code> could not be found.</p>
					<p>It may have been deleted or moved.</p>
				{:else if isNetworkError}
					<p class="mb-2">Unable to connect to the server.</p>
					<p>Please check your internet connection and try again.</p>
				{:else}
					<p class="mb-2">An error occurred while loading the log file:</p>
					<code class="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono block text-left mt-2">
						{safeErrorMessage}
					</code>
				{/if}
			</div>

			<!-- Action Buttons -->
			<div class="flex flex-col space-y-3">
				<!-- Retry Button -->
				<button
					on:click={handleRetry}
					disabled={isRetrying}
					class="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
				>
					{#if isRetrying}
						<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Retrying...
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Try Again
					{/if}
				</button>

				<!-- Back Button -->
				<button
					on:click={handleGoBack}
					class="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
				>
					Back to Log Management
				</button>

				<!-- Additional Help for Not Found Errors -->
				{#if isNotFoundError}
					<div class="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
						<div class="flex items-start gap-2">
							<svg class="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<div class="text-xs text-yellow-700 dark:text-yellow-300">
								<p class="font-medium mb-1">Troubleshooting:</p>
								<ul class="list-disc list-inside space-y-1">
									<li>Check if the file exists in the log directory</li>
									<li>Verify the filename is correct</li>
									<li>Try refreshing the log management page</li>
								</ul>
							</div>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</div>
</div>
