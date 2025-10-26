<!-- Type definitions -->
<script lang="ts" context="module">
	export interface TreeNode {
		key: string;
		label: string;
		value: any;
		type: string;
		children: TreeNode[];
	}
</script>

<script lang="ts">
	import { isValidJSON } from '$lib/utils/log-utils';

	// Props
	export let logContent: any;

	// State for collapsed nodes
	let collapsedNodes = new Set<string>();

	// Computed values
	$: isValid = isValidJSON(logContent);
	$: treeData = buildTreeStructure(logContent);

	// Build a proper tree structure from the log content
	function buildTreeStructure(data: any): TreeNode {
		if (Array.isArray(data)) {
			// For arrays, create a root node with each item as a child
			return {
				key: 'root',
				label: 'Log Entries',
				value: null,
				type: 'array',
				children: data.map((item, index) => {
					const message = item.message || item.msg || item.text || `Entry ${index + 1}`;
					return {
						key: `entry_${index}`,
						label: message,
						value: item,
						type: 'object',
						children: buildObjectChildren(item, `entry_${index}`)
					};
				})
			};
		} else if (typeof data === 'object' && data !== null) {
			// For single objects, create a root node with the object as a child
			return {
				key: 'root',
				label: 'Log Data',
				value: null,
				type: 'object',
				children: buildObjectChildren(data, 'root')
			};
		} else {
			// For primitive values
			return {
				key: 'root',
				label: 'Value',
				value: data,
				type: typeof data,
				children: []
			};
		}
	}

	// Build children for an object
	function buildObjectChildren(obj: any, parentPath: string): TreeNode[] {
		return Object.entries(obj).map(([key, value]) => {
			const path = `${parentPath}.${key}`;
			const nodeType = getNodeType(value);

			return {
				key: path,
				label: key,
				value: value,
				type: nodeType.type,
				children: nodeType.hasChildren ? buildValueChildren(value, path) : []
			};
		});
	}

	// Build children for arrays and nested objects
	function buildValueChildren(value: any, parentPath: string): TreeNode[] {
		if (Array.isArray(value)) {
			return value.map((item, index) => {
				const path = `${parentPath}[${index}]`;
				const nodeType = getNodeType(item);

				return {
					key: path,
					label: `[${index}]`,
					value: item,
					type: nodeType.type,
					children: nodeType.hasChildren ? buildValueChildren(item, path) : []
				};
			});
		} else if (typeof value === 'object' && value !== null) {
			return Object.entries(value).map(([key, val]) => {
				const path = `${parentPath}.${key}`;
				const nodeType = getNodeType(val);

				return {
					key: path,
					label: key,
					value: val,
					type: nodeType.type,
					children: nodeType.hasChildren ? buildValueChildren(val, path) : []
				};
			});
		}
		return [];
	}

	// Get node type and properties
	function getNodeType(data: any): { type: string; hasChildren: boolean } {
		if (data === null || data === undefined) return { type: 'null', hasChildren: false };
		if (typeof data === 'string') return { type: 'string', hasChildren: false };
		if (typeof data === 'number') return { type: 'number', hasChildren: false };
		if (typeof data === 'boolean') return { type: 'boolean', hasChildren: false };
		if (Array.isArray(data)) return { type: 'array', hasChildren: data.length > 0 };
		if (typeof data === 'object') {
			const keys = Object.keys(data);
			return { type: 'object', hasChildren: keys.length > 0 };
		}
		return { type: 'unknown', hasChildren: false };
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

	// Get icon for node type
	function getNodeIcon(type: string): string {
		const icons = {
			string: '📝',
			number: '🔢',
			boolean: '✓',
			array: '📋',
			object: '📦',
			null: '○',
			undefined: '○',
			unknown: '?'
		};
		return icons[type] || '?';
	}

	// Render a tree node
	function renderTreeNode(node: TreeNode, depth: number = 0) {
		const nodeIsCollapsed = isCollapsed(node.key);
		const hasChildren = node.children && node.children.length > 0;
		const indent = depth * 20; // 20px per level

		return {
			node,
			depth,
			isCollapsed: nodeIsCollapsed,
			hasChildren,
			indent
		};
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
				<!-- Root node -->
				<div class="flex items-start gap-2 py-1">
					{#if treeData.children && treeData.children.length > 0}
						<button
							class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
							on:click={() => toggleNode(treeData.key)}
							aria-label={isCollapsed(treeData.key) ? 'Expand' : 'Collapse'}
						>
							{#if isCollapsed(treeData.key)}
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

					<span class="text-lg font-semibold text-gray-900 dark:text-white">
						{getNodeIcon(treeData.type)}
						{treeData.label}
					</span>
					{#if treeData.children && treeData.children.length > 0}
						<span class="text-sm text-gray-500 dark:text-gray-400">
							({treeData.children.length}
							{treeData.children.length === 1 ? 'item' : 'items'})
						</span>
					{/if}
				</div>

				<!-- Children nodes -->
				{#if treeData.children && treeData.children.length > 0 && !isCollapsed(treeData.key)}
					<div class="ml-4">
						{#each treeData.children as child}
							{@const nodeInfo = renderTreeNode(child, 1)}
							<div class="flex items-start gap-2 py-1" style="margin-left: {nodeInfo.indent}px;">
								{#if nodeInfo.hasChildren}
									<button
										class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
										on:click={() => toggleNode(child.key)}
										aria-label={nodeInfo.isCollapsed ? 'Expand' : 'Collapse'}
									>
										{#if nodeInfo.isCollapsed}
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

								<span class="text-blue-600 dark:text-blue-400 font-medium">"{child.label}"</span>
								<span class="text-gray-500 dark:text-gray-400">:</span>

								{#if nodeInfo.hasChildren && !nodeInfo.isCollapsed}
									<div class="ml-4">
										{#each child.children as grandChild}
											{@const grandNodeInfo = renderTreeNode(grandChild, nodeInfo.depth + 1)}
											<div
												class="flex items-start gap-2 py-1"
												style="margin-left: {grandNodeInfo.indent}px;"
											>
												{#if grandNodeInfo.hasChildren}
													<button
														class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
														on:click={() => toggleNode(grandChild.key)}
														aria-label={grandNodeInfo.isCollapsed ? 'Expand' : 'Collapse'}
													>
														{#if grandNodeInfo.isCollapsed}
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

												<span class="text-blue-600 dark:text-blue-400 font-medium"
													>"{grandChild.label}"</span
												>
												<span class="text-gray-500 dark:text-gray-400">:</span>

												{#if grandNodeInfo.hasChildren && !grandNodeInfo.isCollapsed}
													<div class="ml-4">
														{#each grandChild.children as greatGrandChild}
															{@const greatGrandNodeInfo = renderTreeNode(
																greatGrandChild,
																grandNodeInfo.depth + 1
															)}
															<div
																class="flex items-start gap-2 py-1"
																style="margin-left: {greatGrandNodeInfo.indent}px;"
															>
																{#if greatGrandNodeInfo.hasChildren}
																	<button
																		class="flex-shrink-0 w-4 h-4 flex items-center justify-center text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
																		on:click={() => toggleNode(greatGrandChild.key)}
																		aria-label={greatGrandNodeInfo.isCollapsed
																			? 'Expand'
																			: 'Collapse'}
																	>
																		{#if greatGrandNodeInfo.isCollapsed}
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

																<span class="text-blue-600 dark:text-blue-400 font-medium"
																	>"{greatGrandChild.label}"</span
																>
																<span class="text-gray-500 dark:text-gray-400">:</span>

																{#if greatGrandNodeInfo.hasChildren && !greatGrandNodeInfo.isCollapsed}
																	<div class="ml-4 text-xs text-gray-400 dark:text-gray-500">
																		{getNodeIcon(greatGrandChild.type)}
																		{formatValue(greatGrandChild.value)}
																		<span class="text-xs">(click to expand)</span>
																	</div>
																{:else}
																	<span class="text-gray-600 dark:text-gray-300">
																		{getNodeIcon(greatGrandChild.type)}
																		{formatValue(greatGrandChild.value)}
																	</span>
																{/if}
															</div>
														{/each}
													</div>
												{:else if grandNodeInfo.hasChildren && grandNodeInfo.isCollapsed}
													<span class="text-gray-500 dark:text-gray-400 italic">
														{getNodeIcon(grandChild.type)}
														{formatValue(grandChild.value)}
														<span class="text-xs">(click to expand)</span>
													</span>
												{:else}
													<span class="text-gray-600 dark:text-gray-300">
														{getNodeIcon(grandChild.type)}
														{formatValue(grandChild.value)}
													</span>
												{/if}
											</div>
										{/each}
									</div>
								{:else if nodeInfo.hasChildren && nodeInfo.isCollapsed}
									<span class="text-gray-500 dark:text-gray-400 italic">
										{getNodeIcon(child.type)}
										{formatValue(child.value)} <span class="text-xs">(click to expand)</span>
									</span>
								{:else}
									<span class="text-gray-600 dark:text-gray-300">
										{getNodeIcon(child.type)}
										{formatValue(child.value)}
									</span>
								{/if}
							</div>
						{/each}
					</div>
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
