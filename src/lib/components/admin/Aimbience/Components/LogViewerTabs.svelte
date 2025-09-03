<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	// Event dispatcher for parent communication
	const dispatch = createEventDispatcher<{
		tabChange: { viewMode: 'timeline' | 'raw' };
	}>();

	// Props
	export let currentViewMode: 'timeline' | 'raw' = 'timeline';

	// Tab definitions
	const tabs = [
		{
			id: 'timeline' as const,
			label: 'Timeline',
			icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
			description: 'Interactive timeline view of log entries'
		},
		{
			id: 'raw' as const,
			label: 'Raw JSON',
			icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
			description: 'Raw JSON data view'
		}
	];

	// Event handlers
	function handleTabClick(viewMode: 'timeline' | 'raw') {
		if (viewMode !== currentViewMode) {
			dispatch('tabChange', { viewMode });
		}
	}
</script>

<nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
	<div class="px-6">
		<div class="flex space-x-8">
			{#each tabs as tab}
				<button
					on:click={() => handleTabClick(tab.id)}
					class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {currentViewMode ===
					tab.id
						? 'border-blue-500 text-blue-600 dark:text-blue-400'
						: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
					aria-label={tab.description}
					title={tab.description}
				>
					<div class="flex items-center gap-2">
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={tab.icon} />
						</svg>
						{tab.label}
					</div>
				</button>
			{/each}
		</div>
	</div>
</nav>
