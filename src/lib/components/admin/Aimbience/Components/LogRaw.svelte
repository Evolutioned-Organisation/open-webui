<script lang="ts">
	// Props
	export let logContent: any;

	// Computed values
	$: rawContent = typeof logContent === 'string' ? logContent : JSON.stringify(logContent, null, 2);
</script>

<div
	class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
>
	<div class="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
		<div class="flex items-center gap-2">
			<svg
				class="w-4 h-4 text-gray-600 dark:text-gray-400"
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
			<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Raw JSON</span>
		</div>
	</div>
	<div class="p-4">
		<pre
			class="text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed overflow-auto max-h-96 whitespace-pre-wrap">{rawContent}</pre>
	</div>
</div>
