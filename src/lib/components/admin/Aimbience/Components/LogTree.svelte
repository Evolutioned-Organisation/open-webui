<script lang="ts">
	import { isValidJSON } from '$lib/utils/log-utils';

	// Props
	export let logContent: any;

	// Computed values
	$: isValid = isValidJSON(logContent);

	// Recursive function to render JSON tree
	function renderJsonTree(data: any, depth: number = 0): string {
		if (data === null) return 'null';
		if (data === undefined) return 'undefined';
		if (typeof data === 'string') return `"${data}"`;
		if (typeof data === 'number' || typeof data === 'boolean') return String(data);
		
		if (Array.isArray(data)) {
			if (data.length === 0) return '[]';
			const items = data.map((item, index) => 
				`${'  '.repeat(depth + 1)}[${index}]: ${renderJsonTree(item, depth + 1)}`
			).join('\n');
			return `[\n${items}\n${'  '.repeat(depth)}]`;
		}
		
		if (typeof data === 'object') {
			const keys = Object.keys(data);
			if (keys.length === 0) return '{}';
			const items = keys.map(key => 
				`${'  '.repeat(depth + 1)}"${key}": ${renderJsonTree(data[key], depth + 1)}`
			).join(',\n');
			return `{\n${items}\n${'  '.repeat(depth)}}`;
		}
		
		return String(data);
	}
</script>

{#if isValid}
	<div class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
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
						d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
					/>
				</svg>
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300">Tree View</span>
			</div>
		</div>
		<div class="p-4">
			<pre class="text-sm text-gray-800 dark:text-gray-200 font-mono leading-relaxed overflow-auto max-h-96">{renderJsonTree(logContent)}</pre>
		</div>
	</div>
{:else}
	<div class="text-center py-12">
		<svg
			class="mx-auto h-12 w-12 text-gray-400"
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
		<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">Invalid JSON Structure</h3>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			The log content cannot be displayed as a tree structure.
		</p>
	</div>
{/if}
