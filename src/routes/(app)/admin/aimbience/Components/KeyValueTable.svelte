<script lang="ts">
	import type { LogEntry } from '$lib/types/logs';

	// Define the interface for key-value pairs
	export interface KeyValuePair {
		key: string;
		value: string | number | boolean;
		formatted?: boolean; // Whether to apply special formatting
		badge?: boolean; // Whether to display as a badge
		monospace?: boolean; // Whether to use monospace font
		badgeColor?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'gray';
	}

	// Props
	export let data: KeyValuePair[] = [];
	export let title: string = '';
	export let showHeader: boolean = true;
	export let className: string = '';

	// Helper function to format token usage
	function formatTokenUsage(tokens: number): string {
		if (tokens >= 1000000) {
			return `${(tokens / 1000000).toFixed(1)}M`;
		} else if (tokens >= 1000) {
			return `${(tokens / 1000).toFixed(1)}K`;
		}
		return tokens.toString();
	}

	// Helper function to format timestamp
	function formatTimestamp(timestamp: string | number): string {
		try {
			const date = new Date(timestamp);
			return date.toLocaleString();
		} catch {
			return timestamp.toString();
		}
	}

	// Helper function to get badge color classes
	function getBadgeClasses(color: string): string {
		const colorMap = {
			red: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300',
			yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300',
			green: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300',
			blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
			purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300',
			gray: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
		};
		return colorMap[color] || colorMap.gray;
	}

	// Helper function to format value based on type and formatting options
	function formatValue(pair: KeyValuePair): string {
		let value = pair.value;

		// Handle special formatting
		if (pair.formatted) {
			if (typeof value === 'number' && pair.key.toLowerCase().includes('token')) {
				return `${formatTokenUsage(value)} tokens`;
			}
			if (pair.key.toLowerCase().includes('duration') && typeof value === 'number') {
				return `${value}ms`;
			}
			if (pair.key.toLowerCase().includes('timestamp')) {
				return formatTimestamp(value.toString());
			}
		}

		return value.toString();
	}
</script>

<div
	class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden {className}"
>
	{#if title}
		<div
			class="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
		>
			<h3 class="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
		</div>
	{/if}

	<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
		{#if showHeader}
			<thead class="bg-gray-50 dark:bg-gray-900">
				<tr>
					<th
						class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
						>Key</th
					>
					<th
						class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
						>Value</th
					>
				</tr>
			</thead>
		{/if}
		<tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
			{#each data as pair}
				<tr>
					<td class="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white">
						{pair.key}
					</td>
					<td
						class="px-4 py-3 text-sm text-gray-900 dark:text-white {pair.monospace
							? 'font-mono'
							: ''}"
					>
						{#if pair.badge}
							<span
								class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getBadgeClasses(
									pair.badgeColor || 'gray'
								)}"
							>
								{formatValue(pair)}
							</span>
						{:else}
							{formatValue(pair)}
						{/if}
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
