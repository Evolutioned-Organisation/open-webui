<script lang="ts">
	import { onMount } from 'svelte';
	import type { LogEntry, WorkflowAnalysis } from '$lib/utils/log-utils';
	import {
		generateWorkflowAnalysis,
		formatDurationDisplay,
		formatTokenDisplay,
		formatDate,
		getPerformanceGrade,
		getQualityGrade
	} from '$lib/utils/log-utils';

	// Props
	export let logEntries: LogEntry[] = [];

	// State
	let analysis: WorkflowAnalysis | null = null;
	let loading = true;

	// Computed values
	$: performanceGrade = analysis ? getPerformanceGrade(analysis.totalDuration) : null;
	$: qualityGrade = analysis ? getQualityGrade(analysis.contextQuality.overallQuality) : null;

	// Initialize analysis
	onMount(() => {
		analyzeWorkflow();
	});

	function analyzeWorkflow() {
		loading = true;
		try {
			analysis = generateWorkflowAnalysis(logEntries);
		} catch (error) {
			console.error('Error analyzing workflow:', error);
		} finally {
			loading = false;
		}
	}

	// Format percentage for display
	function formatPercentage(value: number): string {
		return `${(value * 100).toFixed(1)}%`;
	}

	// Format confidence for display
	function formatConfidence(confidence: number): string {
		return `${(confidence * 100).toFixed(1)}%`;
	}
</script>

<div class="p-6 space-y-6">
	<!-- Work in Progress Notice -->
	<div
		class="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
	>
		<div class="flex items-center">
			<svg
				class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3"
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path
					fill-rule="evenodd"
					d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
					clip-rule="evenodd"
				/>
			</svg>
			<div>
				<h3 class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Work in Progress</h3>
				<p class="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
					This analysis feature is currently under development. Some metrics and visualizations may
					be incomplete or experimental.
				</p>
			</div>
		</div>
	</div>

	{#if loading}
		<!-- Loading State -->
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"
				></div>
				<p class="text-gray-600 dark:text-gray-400">Analyzing workflow data...</p>
			</div>
		</div>
	{:else if analysis}
		<!-- Analysis Content -->
		<div class="space-y-6">
			<!-- Header -->
			<div
				class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
			>
				<div class="flex items-center justify-between mb-4">
					<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Workflow Analysis</h2>

					<div class="flex items-center gap-2">
						{#if analysis.success}
							<span
								class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300"
							>
								<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/>
								</svg>
								Success
							</span>
						{:else}
							<span
								class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300"
							>
								<svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
									<path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clip-rule="evenodd"
									/>
								</svg>
								Failed
							</span>
						{/if}
					</div>
				</div>

				<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Question Asked</h3>
						<p class="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
							{analysis.question || 'No question found'}
						</p>
					</div>
					<div>
						<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-2">Workflow ID</h3>
						<p
							class="text-gray-700 dark:text-gray-300 font-mono text-sm bg-gray-50 dark:bg-gray-700 p-3 rounded-lg"
						>
							{analysis.workflowId || 'Unknown'}
						</p>
					</div>
				</div>
			</div>

			<!-- Performance Metrics -->
			<div
				class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
					Performance Metrics
				</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Total Duration -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Duration</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatDurationDisplay(analysis.totalDuration)}
								</p>
								{#if performanceGrade}
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-{performanceGrade.color}-100 dark:bg-{performanceGrade.color}-900/20 text-{performanceGrade.color}-800 dark:text-{performanceGrade.color}-300"
									>
										Grade {performanceGrade.grade} - {performanceGrade.description}
									</span>
								{/if}
							</div>
							<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-blue-600 dark:text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Response Generation Time -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">
									Response Generation
								</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatDurationDisplay(analysis.responseGenerationTime)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">LLM processing time</p>
							</div>
							<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-green-600 dark:text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Search & Traversal Time -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">
									Search & Traversal
								</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatDurationDisplay(analysis.searchAndTraversalTime)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Graph database queries</p>
							</div>
							<div class="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-purple-600 dark:text-purple-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Processing Time -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">
									Question Classification
								</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatDurationDisplay(analysis.processingTime)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Initial processing</p>
							</div>
							<div class="p-2 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-orange-600 dark:text-orange-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Content Analysis -->
			<div
				class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Analysis</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Response Length -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Response Length</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{analysis.responseLength.toLocaleString()} chars
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Generated content</p>
							</div>
							<div class="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-indigo-600 dark:text-indigo-400"
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
							</div>
						</div>
					</div>

					<!-- Chunks Found -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Chunks Found</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{analysis.chunksFound}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Document segments</p>
							</div>
							<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-blue-600 dark:text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Entities Found -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Entities Found</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{analysis.entitiesFound}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Graph entities</p>
							</div>
							<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-green-600 dark:text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Claims Found -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Claims Found</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{analysis.claimsFound}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Knowledge claims</p>
							</div>
							<div class="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-yellow-600 dark:text-yellow-400"
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
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Token Usage -->
			<div
				class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Token Usage</h3>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Total Tokens -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tokens</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatTokenDisplay(analysis.totalTokens)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">All operations</p>
							</div>
							<div class="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-purple-600 dark:text-purple-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Prompt Tokens -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Prompt Tokens</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatTokenDisplay(analysis.tokenBreakdown.promptTokens)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Input tokens</p>
							</div>
							<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-blue-600 dark:text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Completion Tokens -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">
									Completion Tokens
								</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatTokenDisplay(analysis.tokenBreakdown.completionTokens)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Generated tokens</p>
							</div>
							<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-green-600 dark:text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13 10V3L4 14h7v7l9-11h-7z"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Quality Metrics -->
			<div
				class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Metrics</h3>

				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
					<!-- Overall Quality -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Overall Quality</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatPercentage(analysis.contextQuality.overallQuality)}
								</p>
								{#if qualityGrade}
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-{qualityGrade.color}-100 dark:bg-{qualityGrade.color}-900/20 text-{qualityGrade.color}-800 dark:text-{qualityGrade.color}-300"
									>
										Grade {qualityGrade.grade} - {qualityGrade.description}
									</span>
								{/if}
							</div>
							<div class="p-2 bg-indigo-100 dark:bg-indigo-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-indigo-600 dark:text-indigo-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Completeness -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Completeness</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatPercentage(analysis.contextQuality.completeness)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Information coverage</p>
							</div>
							<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-blue-600 dark:text-blue-400"
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
							</div>
						</div>
					</div>

					<!-- Relevance -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Relevance</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatPercentage(analysis.contextQuality.relevance)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Content relevance</p>
							</div>
							<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-green-600 dark:text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Diversity -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Diversity</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatPercentage(analysis.contextQuality.diversity)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Content variety</p>
							</div>
							<div class="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-purple-600 dark:text-purple-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17v4a2 2 0 002 2h4M7 17l-4-4m4 4l4-4"
									/>
								</svg>
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Classification & Confidence -->
			<div
				class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
			>
				<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
					Question Classification
				</h3>

				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<!-- Question Type -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Question Type</p>
								<p class="text-lg font-bold text-gray-900 dark:text-white">
									{analysis.questionType || 'Unknown'}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Classified type</p>
							</div>
							<div class="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-blue-600 dark:text-blue-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Classification -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Classification</p>
								<p class="text-lg font-bold text-gray-900 dark:text-white">
									{analysis.classification || 'Unknown'}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Specific category</p>
							</div>
							<div class="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-green-600 dark:text-green-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
									/>
								</svg>
							</div>
						</div>
					</div>

					<!-- Confidence -->
					<div class="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
						<div class="flex items-center justify-between">
							<div>
								<p class="text-sm font-medium text-gray-600 dark:text-gray-400">Confidence</p>
								<p class="text-2xl font-bold text-gray-900 dark:text-white">
									{formatConfidence(analysis.confidence)}
								</p>
								<p class="text-xs text-gray-500 dark:text-gray-400">Classification confidence</p>
							</div>
							<div class="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
								<svg
									class="w-6 h-6 text-yellow-600 dark:text-yellow-400"
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
							</div>
						</div>
					</div>
				</div>
			</div>

			<!-- Error Summary -->
			{#if analysis.errorCount > 0 || analysis.warningCount > 0}
				<div
					class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
				>
					<h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">Issues Summary</h3>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
						{#if analysis.errorCount > 0}
							<div
								class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg"
							>
								<div class="flex items-center">
									<svg
										class="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
											clip-rule="evenodd"
										/>
									</svg>
									<div>
										<p class="text-sm font-medium text-red-800 dark:text-red-200">Errors</p>
										<p class="text-2xl font-bold text-red-900 dark:text-red-100">
											{analysis.errorCount}
										</p>
									</div>
								</div>
							</div>
						{/if}

						{#if analysis.warningCount > 0}
							<div
								class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-lg"
							>
								<div class="flex items-center">
									<svg
										class="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2"
										fill="currentColor"
										viewBox="0 0 20 20"
									>
										<path
											fill-rule="evenodd"
											d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
											clip-rule="evenodd"
										/>
									</svg>
									<div>
										<p class="text-sm font-medium text-yellow-800 dark:text-yellow-200">Warnings</p>
										<p class="text-2xl font-bold text-yellow-900 dark:text-yellow-100">
											{analysis.warningCount}
										</p>
									</div>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<!-- No Analysis Available -->
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
					d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
				/>
			</svg>
			<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No Analysis Available</h3>
			<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
				Unable to analyze this log file. The data may be in an unsupported format.
			</p>
		</div>
	{/if}
</div>
