<script lang="ts">
	import { isValidJSON } from '$lib/utils/log-utils';

	// Props
	export let logContent: any;

	// State for collapsed nodes
	let collapsedNodes = new Set<string>();

	// Computed values
	$: isValid = isValidJSON(logContent);

	// Toggle node collapse state
	function toggleNode(path: string) {
		if (collapsedNodes.has(path)) {
			collapsedNodes.delete(path);
		} else {
			collapsedNodes.add(path);
		}
		collapsedNodes = collapsedNodes; // Trigger reactivity
	}

	// Check if node is collapsed
	function isCollapsed(path: string): boolean {
		return collapsedNodes.has(path);
	}

	// Helper to get collapsed state
	function getCollapsedState(path: string): boolean {
		return collapsedNodes.has(path);
	}

	// Get node type and icon
	function getNodeType(data: any): { type: string; icon: string; hasChildren: boolean } {
		if (data === null) return { type: 'null', icon: '○', hasChildren: false };
		if (data === undefined) return { type: 'undefined', icon: '○', hasChildren: false };
		if (typeof data === 'string') return { type: 'string', icon: '📝', hasChildren: false };
		if (typeof data === 'number') return { type: 'number', icon: '🔢', hasChildren: false };
		if (typeof data === 'boolean') return { type: 'boolean', icon: '✓', hasChildren: false };
		if (Array.isArray(data)) return { type: 'array', icon: '📋', hasChildren: data.length > 0 };
		if (typeof data === 'object') {
			const keys = Object.keys(data);
			return { type: 'object', icon: '📦', hasChildren: keys.length > 0 };
		}
		return { type: 'unknown', icon: '?', hasChildren: false };
	}

	// Format value for display
	function formatValue(data: any): string {
		if (data === null) return 'null';
		if (data === undefined) return 'undefined';
		if (typeof data === 'string') return `"${data}"`;
		if (typeof data === 'number' || typeof data === 'boolean') return String(data);
		if (Array.isArray(data)) return `Array(${data.length})`;
		if (typeof data === 'object') {
			const keys = Object.keys(data);
			return `Object(${keys.length})`;
		}
		return String(data);
	}
</script>

{#if isValid}
	<div
		class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
	>
		<div
			class="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700"
		>
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
				<span class="text-sm font-medium text-gray-700 dark:text-gray-300"
					>Interactive Tree View</span
				>
			</div>
		</div>
		<div class="p-4 max-h-96 overflow-auto">
			<div class="font-mono text-sm">
				{#if Array.isArray(logContent)}
					<!-- Handle array of log entries -->
					{#each logContent as entry, index}
						{@const message = entry.message || entry.msg || entry.text || `Entry ${index + 1}`}
						{@const nodeType = getNodeType(entry)}
						{@const path = `entry_${index}`}
						{@const isCollapsed = getCollapsedState(path)}
						<div
							class="mb-4 p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
						>
							<div class="flex items-start gap-2 py-1">
								<!-- Toggle button -->
								{#if nodeType.hasChildren}
									<button
										class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
										on:click={() => toggleNode(path)}
										aria-label={isCollapsed ? 'Expand' : 'Collapse'}
									>
										{#if isCollapsed}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 5l7 7-7 7"
												/>
											</svg>
										{:else}
											<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M19 9l-7 7-7-7"
												/>
											</svg>
										{/if}
									</button>
								{:else}
									<div class="w-4"></div>
								{/if}

								<!-- Message as main node name -->
								<div class="flex-1">
									<div class="text-lg font-semibold text-gray-900 dark:text-white mb-2">
										{message}
									</div>
									{#if !isCollapsed}
										<div class="ml-4 space-y-1">
											{#each Object.entries(entry) as [key, value]}
												{#if key !== 'message' && key !== 'msg' && key !== 'text'}
													{@const subType = getNodeType(value)}
													{@const subPath = `${path}.${key}`}
													{@const subCollapsed = getCollapsedState(subPath)}
													<div class="flex items-start gap-1 py-1">
														{#if subType.hasChildren}
															<button
																class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
																on:click={() => toggleNode(subPath)}
																aria-label={subCollapsed ? 'Expand' : 'Collapse'}
															>
																{#if subCollapsed}
																	<svg
																		class="w-3 h-3"
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
																{:else}
																	<svg
																		class="w-3 h-3"
																		fill="none"
																		stroke="currentColor"
																		viewBox="0 0 24 24"
																	>
																		<path
																			stroke-linecap="round"
																			stroke-linejoin="round"
																			stroke-width="2"
																			d="M19 9l-7 7-7-7"
																		/>
																	</svg>
																{/if}
															</button>
														{:else}
															<div class="w-4"></div>
														{/if}
														<span class="text-blue-600 dark:text-blue-400 font-medium">"{key}"</span
														>
														<span class="text-gray-500 dark:text-gray-400">:</span>
														{#if subType.hasChildren && !subCollapsed}
															<div class="ml-4">
																{#if Array.isArray(value)}
																	{#each value as item, itemIndex}
																		<div class="flex items-start gap-1 py-1">
																			<span class="text-gray-500 dark:text-gray-400"
																				>[{itemIndex}]</span
																			>
																			<span class="text-gray-500 dark:text-gray-400">:</span>
																			<span class="text-gray-600 dark:text-gray-300"
																				>{formatValue(item)}</span
																			>
																		</div>
																	{/each}
																{:else}
																	{#each Object.entries(value) as [subKey, subValue]}
																		<div class="flex items-start gap-1 py-1">
																			<span class="text-blue-600 dark:text-blue-400 font-medium"
																				>"{subKey}"</span
																			>
																			<span class="text-gray-500 dark:text-gray-400">:</span>
																			<span class="text-gray-600 dark:text-gray-300"
																				>{formatValue(subValue)}</span
																			>
																		</div>
																	{/each}
																{/if}
															</div>
														{:else if subType.hasChildren && subCollapsed}
															<span class="text-gray-500 dark:text-gray-400 italic">
																{formatValue(value)} <span class="text-xs">(click to expand)</span>
															</span>
														{:else}
															<span class="text-gray-600 dark:text-gray-300"
																>{formatValue(value)}</span
															>
														{/if}
													</div>
												{/if}
											{/each}
										</div>
									{:else}
										<div class="text-sm text-gray-500 dark:text-gray-400 italic">
											{formatValue(entry)} <span class="text-xs">(click to expand)</span>
										</div>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				{:else}
					<!-- Handle single object -->
					{#each Object.entries(logContent) as [key, value], i}
						{@const nodeType = getNodeType(value)}
						{@const path = key}
						{@const isCollapsed = getCollapsedState(path)}
						<div class="flex items-start gap-1 py-1">
							<!-- Toggle button for objects/arrays -->
							{#if nodeType.hasChildren}
								<button
									class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
									on:click={() => toggleNode(path)}
									aria-label={isCollapsed ? 'Expand' : 'Collapse'}
								>
									{#if isCollapsed}
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M9 5l7 7-7 7"
											/>
										</svg>
									{:else}
										<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M19 9l-7 7-7-7"
											/>
										</svg>
									{/if}
								</button>
							{:else}
								<div class="w-4"></div>
							{/if}

							<!-- Key -->
							<span class="text-blue-600 dark:text-blue-400 font-medium">"{key}"</span>
							<span class="text-gray-500 dark:text-gray-400">:</span>

							<!-- Value -->
							{#if nodeType.hasChildren && !isCollapsed}
								<!-- Show children -->
								<div class="ml-4">
									{#if Array.isArray(value)}
										{#each value as item, index}
											{@const itemType = getNodeType(item)}
											{@const itemPath = `${path}[${index}]`}
											{@const itemCollapsed = getCollapsedState(itemPath)}
											<div class="flex items-start gap-1 py-1">
												{#if itemType.hasChildren}
													<button
														class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
														on:click={() => toggleNode(itemPath)}
														aria-label={itemCollapsed ? 'Expand' : 'Collapse'}
													>
														{#if itemCollapsed}
															<svg
																class="w-3 h-3"
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
														{:else}
															<svg
																class="w-3 h-3"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M19 9l-7 7-7-7"
																/>
															</svg>
														{/if}
													</button>
												{:else}
													<div class="w-4"></div>
												{/if}
												<span class="text-gray-500 dark:text-gray-400">[{index}]</span>
												<span class="text-gray-500 dark:text-gray-400">:</span>
												<span class="text-gray-600 dark:text-gray-300">{formatValue(item)}</span>
												{#if !itemCollapsed && itemType.hasChildren}
													{@const itemKeys = Array.isArray(item)
														? item.length
														: Object.keys(item).length}
													<div class="ml-4 text-xs text-gray-400 dark:text-gray-500">
														{itemKeys}
														{Array.isArray(item) ? 'items' : 'properties'}
													</div>
												{/if}
											</div>
										{/each}
									{:else}
										{#each Object.entries(value) as [subKey, subValue]}
											{@const subType = getNodeType(subValue)}
											{@const subPath = `${path}.${subKey}`}
											{@const subCollapsed = getCollapsedState(subPath)}
											<div class="flex items-start gap-1 py-1">
												{#if subType.hasChildren}
													<button
														class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
														on:click={() => toggleNode(subPath)}
														aria-label={subCollapsed ? 'Expand' : 'Collapse'}
													>
														{#if subCollapsed}
															<svg
																class="w-3 h-3"
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
														{:else}
															<svg
																class="w-3 h-3"
																fill="none"
																stroke="currentColor"
																viewBox="0 0 24 24"
															>
																<path
																	stroke-linecap="round"
																	stroke-linejoin="round"
																	stroke-width="2"
																	d="M19 9l-7 7-7-7"
																/>
															</svg>
														{/if}
													</button>
												{:else}
													<div class="w-4"></div>
												{/if}
												<span class="text-blue-600 dark:text-blue-400 font-medium">"{subKey}"</span>
												<span class="text-gray-500 dark:text-gray-400">:</span>
												<span class="text-gray-600 dark:text-gray-300">{formatValue(subValue)}</span
												>
											</div>
										{/each}
									{/if}
								</div>
							{:else if nodeType.hasChildren && isCollapsed}
								<!-- Show collapsed summary -->
								<span class="text-gray-500 dark:text-gray-400 italic">
									{formatValue(value)} <span class="text-xs">(click to expand)</span>
								</span>
							{:else}
								<!-- Show simple value -->
								<span class="text-gray-600 dark:text-gray-300">{formatValue(value)}</span>
							{/if}
						</div>
					{/each}
				{/if}
			</div>
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
