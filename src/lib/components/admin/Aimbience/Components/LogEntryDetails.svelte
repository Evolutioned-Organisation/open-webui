<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import KeyValueTable from './KeyValueTable.svelte';
	import CypherQuerySection from './CypherQuerySection.svelte';
	import GenericLogEntry from './GenericLogEntry.svelte';
	import { isCypherQuery, extractKeyValuePairs, type LogEntry } from '$lib/utils/log-utils';

	// Event dispatcher for parent communication
	const dispatch = createEventDispatcher<{
		close: void;
	}>();

	// Props
	export let entry: LogEntry;
	export let onClose: () => void = () => {};

	// Computed values
	$: isCypher = isCypherQuery(entry);
	$: hasAdditionalData = entry.data || entry.metadata || entry.errors;
	$: keyValuePairs = extractKeyValuePairs(entry);

	// Event handlers
	function handleClose() {
		onClose();
		dispatch('close');
	}
</script>

<div class="space-y-4">
	<!-- Header with expand/collapse indicator -->
	<div class="flex items-center justify-between">
		<div class="flex items-center gap-2">
			<svg
				class="w-5 h-5 text-blue-600 dark:text-blue-400"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h4 class="text-sm font-semibold text-gray-900 dark:text-white">Log Entry Details</h4>
		</div>
		<button
			on:click={handleClose}
			class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
			aria-label="Close details"
		>
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<!-- Key-Value Table for Basic Information -->
	{#if keyValuePairs.length > 0}
		<KeyValueTable data={keyValuePairs} />
	{/if}

	<!-- Component Loader: Route to appropriate component based on entry type -->
	{#if isCypher}
		<!-- Cypher Query Entry -->
		<CypherQuerySection {entry} />
	{:else if hasAdditionalData}
		<!-- Generic Log Entry with Additional Data -->
		<GenericLogEntry {entry} />
	{/if}

	<!-- Raw data toggle -->
	<div class="border-t border-gray-200 dark:border-gray-700 pt-3">
		<details class="text-sm" open>
			<summary
				class="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium flex items-center gap-2"
			>
				<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				Show Complete Raw Data
			</summary>
			<pre
				class="mt-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-auto max-h-64 text-gray-700 dark:text-gray-300 border">{JSON.stringify(
					entry,
					null,
					2
				)}</pre>
		</details>
	</div>
</div>
