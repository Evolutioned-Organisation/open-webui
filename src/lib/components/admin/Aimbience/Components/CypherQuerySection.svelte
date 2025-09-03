<script lang="ts">
	// Props
	export let entry: any;

	// Helper function to detect if entry contains a Cypher query
	function isCypherQuery(entry: any): boolean {
		if (!entry) return false;

		// Check for explicit query type
		if (entry.query_type === 'entity_discovery') return true;

		// Check message content for Cypher keywords
		const message = entry.message || entry.msg || entry.text || '';
		const cypherKeywords = ['MATCH', 'CREATE', 'MERGE', 'DELETE', 'SET', 'RETURN', 'WHERE', 'WITH'];
		const hasKeywords = cypherKeywords.some((keyword) => message.toUpperCase().includes(keyword));

		// Check for query patterns
		const queryPatterns = [
			/\([a-zA-Z_][a-zA-Z0-9_]*\)/g, // Node patterns like (n)
			/-\[[a-zA-Z_][a-zA-Z0-9_]*\]->/g, // Relationship patterns like -[r]->
			/\([a-zA-Z_][a-zA-Z0-9_]*:\w+\)/g // Labeled nodes like (n:Person)
		];
		const hasPatterns = queryPatterns.some((pattern) => pattern.test(message));

		return hasKeywords && hasPatterns;
	}

	// Helper function to extract Cypher query from entry
	function extractCypherQuery(entry: any): string | null {
		if (!entry) return null;

		// Try to find query in various fields
		const possibleFields = [
			entry.query,
			entry.cypher_query,
			entry.cypher,
			entry.data?.query,
			entry.data?.cypher_query,
			entry.data?.cypher,
			entry.message,
			entry.msg,
			entry.text
		];

		for (const field of possibleFields) {
			if (typeof field === 'string' && field.trim()) {
				// Check if it looks like a Cypher query
				const cypherKeywords = [
					'MATCH',
					'CREATE',
					'MERGE',
					'DELETE',
					'SET',
					'RETURN',
					'WHERE',
					'WITH'
				];
				if (cypherKeywords.some((keyword) => field.toUpperCase().includes(keyword))) {
					return field.trim();
				}
			}
		}

		return null;
	}

	// Helper function to extract Cypher results from entry
	function extractCypherResults(entry: any): any[] | null {
		if (!entry) return null;

		// Try to find results in various fields
		const possibleFields = [
			entry.results,
			entry.cypher_results,
			entry.data?.results,
			entry.data?.cypher_results,
			entry.data?.records,
			entry.records
		];

		for (const field of possibleFields) {
			if (Array.isArray(field) && field.length > 0) {
				return field;
			}
		}

		return null;
	}

	// Helper function to format Cypher query for display
	function formatCypherQuery(query: string): string {
		if (!query) return '';

		// Add line breaks after common Cypher keywords
		return query
			.replace(/\b(MATCH|CREATE|MERGE|DELETE|SET|RETURN|WHERE|WITH|UNWIND|FOREACH)\b/g, '\n$1')
			.replace(/\b(AND|OR)\b/g, '\n  $1')
			.trim();
	}

	// Helper function to format Cypher results for display
	function formatCypherResults(results: any[]): string {
		if (!results || results.length === 0) return 'No results';

		if (results.length === 1) {
			return JSON.stringify(results[0], null, 2);
		}

		// For multiple results, show a summary
		return `Found ${results.length} results:\n\n${results
			.slice(0, 3)
			.map((result, index) => `Result ${index + 1}:\n${JSON.stringify(result, null, 2)}`)
			.join('\n\n')}${results.length > 3 ? `\n\n... and ${results.length - 3} more results` : ''}`;
	}

	// Extract data for this component
	$: cypherQuery = extractCypherQuery(entry);
	$: cypherResults = extractCypherResults(entry);
	$: isCypher = isCypherQuery(entry);
</script>

{#if isCypher}
	<div class="space-y-3">
		<!-- Debug Section (temporary) -->
		<div
			class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-700"
		>
			<div class="text-xs font-medium text-yellow-700 dark:text-yellow-300 mb-2">Debug Info:</div>
			<div class="text-xs text-yellow-600 dark:text-yellow-400 space-y-1">
				<div>Query found: {cypherQuery ? 'Yes' : 'No'}</div>
				<div>
					Results found: {cypherResults ? `Yes (${cypherResults.length})` : 'No'}
				</div>
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
{/if}
