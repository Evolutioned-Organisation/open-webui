<script lang="ts">
	import {
		extractCypherQuery,
		extractCypherResults,
		formatCypherQuery,
		formatCypherResults,
		type LogEntry
	} from '$lib/utils/log-utils';
	import { copyToClipboard } from '$lib/utils/index';

	// Props
	export let entry: LogEntry;

	// Computed values
	$: cypherQuery = extractCypherQuery(entry);
	$: cypherResults = extractCypherResults(entry);
	$: chunkIds = extractChunkIds(entry);
	$: executableQuery = createExecutableQuery(cypherQuery, chunkIds);

	// Extract chunk IDs from query_parameters or other fields
	function extractChunkIds(entry: LogEntry): string[] {
		if (!entry) return [];

		// Look for chunk_ids in various possible locations
		const possibleSources = [
			entry.query_parameters?.chunk_ids,
			entry.data?.query_parameters?.chunk_ids,
			entry.parameters?.chunk_ids,
			entry.data?.parameters?.chunk_ids,
			entry.chunk_ids,
			entry.data?.chunk_ids
		];

		for (const source of possibleSources) {
			if (Array.isArray(source) && source.length > 0) {
				return source;
			}
		}

		// Also check if chunk_ids are mentioned in the query itself
		if (cypherQuery) {
			const chunkIdMatch = cypherQuery.match(/\$chunk_ids\s*=\s*\[([^\]]+)\]/);
			if (chunkIdMatch) {
				const ids = chunkIdMatch[1].split(',').map((id) => id.trim().replace(/['"]/g, ''));
				return ids.filter((id) => id.length > 0);
			}
		}

		return [];
	}

	// Create an executable cypher query by replacing parameters
	function createExecutableQuery(query: string | null, chunkIds: string[]): string | null {
		if (!query) return null;

		let executableQuery = query;

		// Replace $chunk_ids parameter with actual values
		if (chunkIds.length > 0) {
			const chunkIdsString = chunkIds.map((id) => `'${id}'`).join(', ');
			executableQuery = executableQuery.replace(/\$chunk_ids/g, `[${chunkIdsString}]`);
		}

		// Replace other common parameters
		executableQuery = executableQuery.replace(/\$limit/g, '10');
		executableQuery = executableQuery.replace(/\$skip/g, '0');

		return executableQuery;
	}

	// Copy query to clipboard
	async function copyQuery() {
		if (executableQuery) {
			try {
				await copyToClipboard(executableQuery);
				// You could add a toast notification here
			} catch (error) {
				console.error('Failed to copy query:', error);
			}
		}
	}

	// Copy results to clipboard
	async function copyResults() {
		if (cypherResults) {
			try {
				const resultsText = formatCypherResults(cypherResults);
				await copyToClipboard(resultsText);
				// You could add a toast notification here
			} catch (error) {
				console.error('Failed to copy results:', error);
			}
		}
	}
</script>

<div class="space-y-4">
	<!-- Cypher Query Display -->
	{#if cypherQuery}
		<div
			class="bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-purple-200 dark:border-purple-700"
		>
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
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
				{#if executableQuery}
					<button
						on:click={copyQuery}
						class="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-800/50 text-purple-700 dark:text-purple-300 rounded text-xs font-medium hover:bg-purple-200 dark:hover:bg-purple-700/70 transition-colors"
						title="Copy executable query"
					>
						<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
							/>
						</svg>
						Copy
					</button>
				{/if}
			</div>

			<!-- Original Query -->
			<div class="mb-3">
				<div class="text-xs text-purple-600 dark:text-purple-400 mb-2">Original Query:</div>
				<pre
					class="text-sm bg-white dark:bg-gray-800 p-3 rounded border overflow-auto max-h-32 text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
					{formatCypherQuery(cypherQuery)}
				</pre>
			</div>

			<!-- Executable Query -->
			{#if executableQuery && executableQuery !== cypherQuery}
				<div>
					<div class="text-xs text-purple-600 dark:text-purple-400 mb-2">
						Executable Query (with parameters):
					</div>
					<pre
						class="text-sm bg-white dark:bg-gray-800 p-3 rounded border overflow-auto max-h-32 text-gray-800 dark:text-gray-200 font-mono leading-relaxed">
						{formatCypherQuery(executableQuery)}
					</pre>
				</div>
			{/if}

			<!-- Chunk IDs Info -->
			{#if chunkIds.length > 0}
				<div class="mt-3 p-2 bg-purple-100 dark:bg-purple-800/30 rounded text-xs">
					<div class="text-purple-700 dark:text-purple-300 font-medium mb-1">Chunk IDs found:</div>
					<div class="text-purple-600 dark:text-purple-400">
						{chunkIds.join(', ')}
					</div>
				</div>
			{/if}
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
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-2">
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
				<button
					on:click={copyResults}
					class="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-800/50 text-green-700 dark:text-green-300 rounded text-xs font-medium hover:bg-green-200 dark:hover:bg-green-700/70 transition-colors"
					title="Copy results"
				>
					<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
						/>
					</svg>
					Copy
				</button>
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
