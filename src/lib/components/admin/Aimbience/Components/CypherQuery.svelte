<script lang="ts">
	import {
		extractCypherQuery,
		extractCypherResults,
		formatCypherQuery,
		formatCypherResults,
		type LogEntry
	} from '$lib/utils/log-utils';

	// Props
	export let entry: LogEntry;

	// Computed values
	$: cypherQuery = extractCypherQuery(entry);
	$: cypherResults = extractCypherResults(entry);
</script>

<div class="space-y-3">
	<!-- Debug Section (temporary) -->
	<div
		class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700"
	>
		<div class="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">Debug Info:</div>
		<div class="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
			<div>Query found: {cypherQuery ? 'Yes' : 'No'}</div>
			<div>Results found: {cypherResults ? `Yes (${cypherResults.length})` : 'No'}</div>
			<div>Entry keys: {Object.keys(entry).join(', ')}</div>
			{#if entry.data}
				<div>Data keys: {Object.keys(entry.data).join(', ')}</div>
			{/if}
		</div>
	</div>

	<!-- Cypher Query Display -->
	{#if cypherQuery}
		<div
			class="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700"
		>
			<div class="flex items-center gap-2 mb-3">
				<svg
					class="w-5 h-5 text-purple-600 dark:text-purple-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
					/>
				</svg>
				<h4 class="text-sm font-semibold text-purple-700 dark:text-purple-300">Cypher Query</h4>
				{#if entry.query_type}
					<span
						class="px-2 py-1 bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 rounded text-xs font-medium"
					>
						{entry.query_type}
					</span>
				{/if}
			</div>
			<pre
				class="text-sm bg-white dark:bg-gray-800 p-3 rounded border overflow-auto max-h-32 text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
				{formatCypherQuery(cypherQuery)}
			</pre>
		</div>
	{:else}
		<div
			class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
		>
			<div class="text-sm text-gray-600 dark:text-gray-400">
				No Cypher query found in this entry
			</div>
		</div>
	{/if}

	<!-- Cypher Results Display -->
	{#if cypherResults}
		<div
			class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700"
		>
			<div class="flex items-center gap-2 mb-3">
				<svg
					class="w-5 h-5 text-green-600 dark:text-green-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
				<h4 class="text-sm font-semibold text-green-700 dark:text-green-300">Query Results</h4>
				<span
					class="px-2 py-1 bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 rounded text-xs font-medium"
				>
					{cypherResults.length} result{cypherResults.length !== 1 ? 's' : ''}
				</span>
			</div>
			<pre
				class="text-sm bg-white dark:bg-gray-800 p-3 rounded border overflow-auto max-h-48 text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
				{formatCypherResults(cypherResults)}
			</pre>
		</div>
	{:else}
		<div
			class="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
		>
			<div class="text-sm text-gray-600 dark:text-gray-400">
				No query results found in this entry
			</div>
		</div>
	{/if}
</div>
