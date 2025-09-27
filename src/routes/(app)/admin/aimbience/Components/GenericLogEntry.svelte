<script lang="ts">
	import type { LogEntry } from '$lib/utils/log-utils';

	// Props
	export let entry: LogEntry;
</script>

<div class="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
	<div class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
		Additional Data
	</div>
	<div class="space-y-2">
		{#if entry.data}
			<div>
				<div class="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">Data:</div>
				<pre
					class="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border overflow-auto max-h-24 text-gray-700 dark:text-gray-300">{JSON.stringify(
						entry.data,
						null,
						2
					)}</pre>
			</div>
		{/if}
		{#if entry.metadata}
			<div>
				<div class="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Metadata:</div>
				<pre
					class="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border overflow-auto max-h-24 text-gray-700 dark:text-gray-300">{JSON.stringify(
						entry.metadata,
						null,
						2
					)}</pre>
			</div>
		{/if}
		{#if entry.errors}
			<div>
				<div class="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Errors:</div>
				<pre
					class="text-xs bg-gray-50 dark:bg-gray-900 p-2 rounded border overflow-auto max-h-24 text-gray-700 dark:text-gray-300">{JSON.stringify(
						entry.errors,
						null,
						2
					)}</pre>
			</div>
		{/if}
	</div>
</div>
