<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import LogEntryDetails from './LogEntryDetails.svelte';
	import {
		formatTimelineTimestamp,
		formatTokenUsage,
		isCypherQuery,
		type LogEntry
	} from '$lib/utils/log-utils';

	// Event dispatcher for parent communication
	const dispatch = createEventDispatcher<{
		entrySelect: { entry: LogEntry; index: number };
		entryDeselect: void;
	}>();

	// Props
	export let logEntries: LogEntry[] = [];
	export let selectedEntry: number | null = null;

	// Event handlers
	function handleEntryClick(index: number, entry: LogEntry) {
		if (selectedEntry === index) {
			dispatch('entryDeselect');
		} else {
			dispatch('entrySelect', { entry, index });
		}
	}

	function handleKeydown(event: KeyboardEvent, index: number, entry: LogEntry) {
		if (event.key === 'Enter' || event.key === ' ') {
			event.preventDefault();
			handleEntryClick(index, entry);
		}
	}

	function handleEntryClose() {
		dispatch('entryDeselect');
	}
</script>

<div class="overflow-hidden">
	<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
		<thead class="bg-gray-50 dark:bg-gray-800">
			<tr>
				<th
					class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
				>
					Step
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
				>
					Time
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
				>
					Level
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
				>
					Message
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
				>
					Duration
				</th>
				<th
					class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
				>
					Tokens
				</th>
			</tr>
		</thead>
		<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
			{#each logEntries as entry, index}
				{@const timestamp = entry.timestamp || entry.time || entry.created_at || entry.ts}
				{@const level = entry.level || entry.severity || 'INFO'}
				{@const message = entry.message || entry.msg || entry.text || ''}
				{@const eventType = entry.event_type || ''}
				{@const duration = entry.duration_ms || entry.duration || entry.execution_time || ''}
				{@const tokenUsage = entry.token_usage || {}}
				{@const tokens = entry.tokens || tokenUsage.total_tokens || 0}

				<tr
					class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer {selectedEntry ===
					index
						? 'bg-blue-50 dark:bg-blue-900/20'
						: ''}"
					on:click={() => handleEntryClick(index, entry)}
					role="button"
					tabindex="0"
					on:keydown={(e) => handleKeydown(e, index, entry)}
				>
					<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
						<div class="flex items-center gap-2">
							<span>{index + 1}</span>
							<svg
								class="w-4 h-4 text-gray-400 transition-transform duration-200 {selectedEntry ===
								index
									? 'rotate-90'
									: ''}"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								/>
							</svg>
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
						{timestamp ? formatTimelineTimestamp(timestamp) : '-'}
					</td>
					<td class="px-6 py-4 whitespace-nowrap">
						<span
							class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {level ===
							'ERROR'
								? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
								: level === 'WARNING'
									? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
									: level === 'SUCCESS'
										? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
										: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'}"
						>
							{level}
						</span>
					</td>
					<td
						class="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate"
						title={message}
					>
						<div class="flex items-center gap-2">
							<span class="truncate">{message}</span>
							{#if isCypherQuery(entry)}
								<svg
									class="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									title="Contains Cypher Query"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
							{/if}
						</div>
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
						{duration ? `${duration}ms` : '-'}
					</td>
					<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
						{tokens > 0 ? formatTokenUsage(tokens) : '-'}
					</td>
				</tr>

				<!-- Expanded Entry Details -->
				{#if selectedEntry === index}
					<tr>
						<td
							colspan="6"
							class="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 border-l-4 border-blue-500"
						>
							<LogEntryDetails {entry} onClose={handleEntryClose} />
						</td>
					</tr>
				{/if}
			{/each}
		</tbody>
	</table>

	<!-- Empty State -->
	{#if logEntries.length === 0}
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
			<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No log entries</h3>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				This log file appears to be empty or contains no valid entries.
			</p>
		</div>
	{/if}
</div>
