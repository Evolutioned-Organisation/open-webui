<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import { formatFileSize, formatDate } from '$lib/utils/log-utils';

	// Event dispatcher for parent communication
	const dispatch = createEventDispatcher<{
		refresh: void;
		goBack: void;
	}>();

	// Props
	export let filename: string = '';
	export let fileSize: number = 0;
	export let modifiedDate: string | number = '';
	export let chatId: string = '';
	export let isLoading: boolean = false;
	export let error: string | null = null;

	// Computed values
	$: displayFileSize = fileSize > 0 ? formatFileSize(fileSize) : 'Unknown';
	$: displayModifiedDate = modifiedDate ? formatDate(modifiedDate) : 'Unknown';
	$: displayChatId = chatId || 'Unknown';

	// Event handlers
	function handleRefresh() {
		dispatch('refresh');
	}

	function handleGoBack() {
		dispatch('goBack');
	}
</script>

<header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
	<div class="px-6 py-4">
		<div class="flex items-center justify-between">
			<!-- Left side: File info and navigation -->
			<div class="flex items-center space-x-4">
				<!-- Back button -->
				<button
					on:click={handleGoBack}
					class="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					aria-label="Return to log management"
				>
					<ArrowLeft class="w-4 h-4" />
					Back
				</button>

				<!-- File information -->
				<div class="flex items-center space-x-6">
					<div>
						<h1 class="text-lg font-semibold text-gray-900 dark:text-white truncate max-w-md" title={filename}>
							{filename || 'Unknown File'}
						</h1>
						<div class="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
							<span>Size: {displayFileSize}</span>
							<span>Modified: {displayModifiedDate}</span>
							<span>Chat ID: {displayChatId}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Right side: Actions -->
			<div class="flex items-center space-x-3">
				<!-- Refresh button -->
				<button
					on:click={handleRefresh}
					disabled={isLoading}
					class="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					aria-label="Refresh log content"
				>
					{#if isLoading}
						<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Refreshing...
					{:else}
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
							/>
						</svg>
						Refresh
					{/if}
				</button>

				<!-- Error indicator -->
				{#if error}
					<div class="flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Error
					</div>
				{/if}
			</div>
		</div>
	</div>
</header>
