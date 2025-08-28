/**
 * Log Viewer Page
 * 
 * Displays the content of individual log files from AIMBY-API.
 * Features include:
 * - JSON syntax highlighting for structured log data
 * - Plain text fallback for non-JSON content
 * - Copy to clipboard functionality
 * - Error handling and retry mechanisms
 * - Responsive design with mobile support
 * - Accessibility features for screen readers
 * 
 * @page
 */
<script lang="ts">
	import { onMount, getContext, afterUpdate } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	
	// API and type imports
	import { getLogContentViaProxy } from '$lib/apis/aimby';
	import type { LogContentResponse } from '$lib/apis/aimby';
	
	// Utility imports for validation and error handling
	import { validateFilename, sanitizeUrlParameter, sanitizeDisplayContent, createSafeErrorMessage } from '$lib/utils/validation';
	import { globalErrorHandler, createErrorContext, withGracefulDegradation } from '$lib/utils/errorHandling';
	
	// Component imports
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	
	// External library imports
	import dayjs from 'dayjs';
	import hljs from 'highlight.js/lib/core';
	import json from 'highlight.js/lib/languages/json';
	import 'highlight.js/styles/github-dark.css';

	const i18n = getContext('i18n');

	// Component state variables
	let filename: string | null = null; // Current log filename from URL parameter
	let logContent: LogContentResponse | null = null; // Log file content and metadata
	let loading = true; // Loading state for initial and refresh requests
	let error: string | null = null; // Error message for display
	let contentElement: HTMLElement; // Reference to content element for syntax highlighting
	let retryCount = 0; // Number of retry attempts for failed requests
	let isRetrying = false; // Specific retry state to differentiate from initial loading

	// Register JSON language for highlight.js syntax highlighting
	hljs.registerLanguage('json', json);

	onMount(async () => {
		// Get filename from URL parameters
		const rawFilename = $page.url.searchParams.get('filename');

		if (!rawFilename) {
			toast.error('No filename provided');
			goto('/admin/aimbience/log-management');
			return;
		}

		// Sanitize and validate the filename parameter
		const sanitizedFilename = sanitizeUrlParameter(rawFilename);
		if (!sanitizedFilename || !validateFilename(sanitizedFilename)) {
			toast.error('Invalid filename parameter');
			goto('/admin/aimbience/log-management');
			return;
		}

		filename = sanitizedFilename;
		await fetchLogContent();
	});

	afterUpdate(() => {
		// Apply syntax highlighting after content updates
		if (contentElement && logContent?.content && isValidJSON(logContent.content)) {
			hljs.highlightElement(contentElement);
		}
	});

	/**
	 * Fetches log file content from AIMBY-API via proxy
	 * Handles validation, error handling, and user feedback
	 * 
	 * @param isRetry - Whether this is a retry attempt (affects user feedback)
	 */
	async function fetchLogContent(isRetry: boolean = false) {
		loading = true;
		error = null;
		if (isRetry) {
			isRetrying = true; // Track retry state separately for UI feedback
		}

		try {
			// Validate filename is available before proceeding
			if (!filename) {
				throw new Error('No filename available');
			}

			// Re-validate filename before API call to prevent path traversal attacks
			if (!validateFilename(filename)) {
				throw new Error('Invalid filename');
			}
			
			// Fetch log content via proxy to avoid CORS issues
			const content = await getLogContentViaProxy(localStorage.token || '', filename);
			if (content) {
				logContent = content;
				retryCount = 0; // Reset retry count on successful request
				
				// Provide appropriate user feedback based on context
				if (!isRetry) {
					toast.success('Log content loaded successfully');
				} else {
					toast.success('Log content loaded successfully after retry');
				}
			} else {
				throw new Error('No content received from server');
			}
		} catch (err) {
			// Use centralized error handling with context information
			const context = createErrorContext('fetchLogContent', 'LogViewer', { filename });
			const handled = globalErrorHandler.handleError(err, context);
			
			// Create safe error message and update state
			const safeErrorMessage = createSafeErrorMessage(err, 'Error loading log content');
			error = safeErrorMessage;
			retryCount++;
			
			// Only show toast if error handler allowed it (prevents duplicate notifications)
			if (!handled && !isRetry) {
				toast.error(safeErrorMessage);
			}
		} finally {
			loading = false;
			isRetrying = false;
		}
	}

	const retryFetchContent = () => {
		fetchLogContent(true);
	};

	function formatDate(timestamp?: number) {
		if (!timestamp) return 'N/A';
		try {
			return dayjs(timestamp * 1000).format('LLL');
		} catch {
			return 'Invalid Date';
		}
	}

	function formatFileSize(bytes?: number) {
		if (!bytes) return '0 B';
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(1024));
		return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
	}

	function goBack() {
		goto('/admin/aimbience/log-management');
	}

	function isValidJSON(content: any): boolean {
		if (Array.isArray(content)) {
			return content.every(item => {
				try {
					if (typeof item === 'string') {
						JSON.parse(item);
						return true;
					}
					return typeof item === 'object';
				} catch {
					return false;
				}
			});
		}
		return typeof content === 'object' && content !== null;
	}

	function formatContent(content: any): string {
		if (Array.isArray(content)) {
			// If it's an array of strings that might be JSON, try to parse and format each
			return content.map(item => {
				if (typeof item === 'string') {
					try {
						const parsed = JSON.parse(item);
						return JSON.stringify(parsed, null, 2);
					} catch {
						// Sanitize string content for safe display
						return sanitizeDisplayContent(item);
					}
				}
				return typeof item === 'object' ? JSON.stringify(item, null, 2) : sanitizeDisplayContent(item);
			}).join('\n\n');
		} else if (typeof content === 'object') {
			return JSON.stringify(content, null, 2);
		}
		// Sanitize content for safe display
		return sanitizeDisplayContent(content);
	}
</script>

<svelte:head>
	<title>Log Viewer - {filename || 'Loading...'} • Open WebUI</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	<!-- Header -->
	<div class="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
		<div class="px-4 sm:px-6 py-4">
			<div class="flex items-center gap-4">
				<button
					on:click={goBack}
					class="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
					aria-label="Back to Log Management"
					title="Return to log management list"
				>
					<ArrowLeft className="w-5 h-5" />
				</button>

				<div class="min-w-0 flex-1">
					<h1 class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" id="log-viewer-title">Log Viewer</h1>
					<p class="text-sm text-gray-600 dark:text-gray-400 truncate" title={filename || 'Loading...'}>
						{filename ? `File: ${filename}` : 'Loading...'}
					</p>
				</div>
			</div>
		</div>
	</div>

	<!-- Content -->
	<div class="px-4 sm:px-6 py-8">
		{#if loading}
			<div class="flex items-center justify-center py-12" role="status" aria-live="polite">
				<div class="text-center">
					<Spinner className="w-8 h-8 mx-auto" />
					<div class="mt-4 text-gray-600 dark:text-gray-400">Loading log content...</div>
					<div class="mt-2 text-sm text-gray-500 dark:text-gray-500">
						Fetching content from AIMBY-API
					</div>
				</div>
			</div>
		{:else if error}
			<div class="max-w-2xl mx-auto">
				<div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6" role="alert" aria-live="assertive">
					<div class="flex items-start gap-3">
						<svg class="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						<div class="flex-1">
							<h3 class="text-lg font-medium text-red-800 dark:text-red-200 mb-2" id="error-heading">
								Error Loading Log Content
							</h3>
							<p class="text-red-700 dark:text-red-300 mb-4" aria-describedby="error-heading">
								{error}
							</p>
							<div class="flex flex-col sm:flex-row gap-3">
								<button
									on:click={retryFetchContent}
									class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
									disabled={isRetrying}
									aria-label="Retry loading log content"
								>
									{#if isRetrying}
										<svg class="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
										</svg>
										Retrying...
									{:else}
										Try Again
									{/if}
								</button>
								<button
									on:click={goBack}
									class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
									aria-label="Return to log management"
								>
									Back to Log Management
								</button>
								{#if retryCount > 0}
									<span class="px-3 py-2 text-sm bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded-lg" role="status">
										Attempt {retryCount}
									</span>
								{/if}
							</div>
						</div>
					</div>
				</div>
			</div>
		{:else if logContent}
			<div class="max-w-7xl mx-auto space-y-6">
				<!-- File Information Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-md"
					role="region"
					aria-labelledby="file-info-heading"
				>
					<div class="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white" id="file-info-heading">File Information</h2>
					</div>
					<div class="px-4 sm:px-6 py-4">
						<dl class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Filename</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white font-mono break-all" title={logContent.filename}>
									{logContent.filename}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">File Size</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white" title="File size: {formatFileSize(logContent.size)}">
									{formatFileSize(logContent.size)}
								</dd>
							</div>
							<div>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400">Modified Date</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white" title="Last modified: {formatDate(logContent.modified)}">
									{formatDate(logContent.modified)}
								</dd>
							</div>
						</dl>
					</div>
				</div>

				<!-- Log Content Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<div class="flex items-center justify-between">
							<h2 class="text-lg font-medium text-gray-900 dark:text-white">Log Content</h2>
							<div class="flex items-center gap-2">
								{#if isValidJSON(logContent.content)}
									<span class="px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-200 rounded-full text-xs">
										JSON Format
									</span>
								{:else}
									<span class="px-2 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 rounded-full text-xs">
										Plain Text
									</span>
								{/if}
							</div>
						</div>
					</div>
					<div class="px-6 py-4">
						{#if logContent.content}
							<div class="relative">
								{#if isValidJSON(logContent.content)}
									<!-- JSON content with syntax highlighting -->
									<pre
										bind:this={contentElement}
										class="hljs text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 rounded-lg overflow-auto max-h-96 lg:max-h-[32rem] border border-gray-200 dark:border-gray-700 font-mono leading-relaxed"
										style="white-space: pre-wrap; word-wrap: break-word;"
									><code class="language-json">{formatContent(logContent.content)}</code></pre>
								{:else}
									<!-- Plain text content -->
									<pre
										class="text-xs sm:text-sm bg-gray-50 dark:bg-gray-900 p-3 sm:p-4 rounded-lg overflow-auto max-h-96 lg:max-h-[32rem] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 font-mono leading-relaxed"
										style="white-space: pre-wrap; word-wrap: break-word;"
									>{formatContent(logContent.content)}</pre>
								{/if}
								
												<!-- Copy button -->
								<button
									class="absolute top-2 right-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
									on:click={async () => {
										try {
											const contentToCopy = formatContent(logContent.content);
											if (contentToCopy.length > 100000) {
												toast.error('Content too large to copy to clipboard');
												return;
											}
											await navigator.clipboard.writeText(contentToCopy);
											toast.success('Content copied to clipboard');
										} catch (err) {
											console.error('Failed to copy to clipboard:', err);
											toast.error('Failed to copy content to clipboard');
										}
									}}
									title="Copy log content to clipboard"
									aria-label="Copy log content to clipboard"
								>
									<svg class="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
									</svg>
								</button>
							</div>
						{:else}
							<div class="text-center py-8 text-gray-500 dark:text-gray-400" role="status">
								No content available for this log file
							</div>
						{/if}
					</div>
				</div>

				<!-- Actions Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<h2 class="text-lg font-medium text-gray-900 dark:text-white">Actions</h2>
					</div>
					<div class="px-6 py-4">
						<div class="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
							<div class="flex gap-3">
								<button
									on:click={() => fetchLogContent(true)}
									class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
									disabled={loading || isRetrying}
								>
									<svg class="w-4 h-4 {loading || isRetrying ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
									{loading || isRetrying ? 'Refreshing...' : 'Refresh Content'}
								</button>
								<button
									on:click={goBack}
									class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
								>
									Back to Log Management
								</button>
							</div>
							{#if logContent?.timestamp}
								<div class="sm:ml-auto text-sm text-gray-500 dark:text-gray-400">
									Last updated: {formatDate(logContent.timestamp)}
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		{:else}
			<div class="text-center py-12">
				<div class="text-gray-500 dark:text-gray-400 text-lg mb-4">No log content found</div>
				<button
					on:click={goBack}
					class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
				>
					Back to Log Management
				</button>
			</div>
		{/if}
	</div>
</div>