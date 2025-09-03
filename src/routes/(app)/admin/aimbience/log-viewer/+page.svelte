<script lang="ts">
	import { onMount, getContext, afterUpdate } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	// API and type imports
	import { getLogContentViaProxy } from '$lib/apis/aimby';
	import type { LogContentResponse } from '$lib/apis/aimby';

	// Utility imports for validation and error handling
	import {
		validateFilename,
		validateFilePath,
		sanitizeUrlParameter,
		sanitizeDisplayContent,
		createSafeErrorMessage
	} from '$lib/utils/validation';
	import {
		globalErrorHandler,
		createErrorContext,
		withGracefulDegradation
	} from '$lib/utils/errorHandling';

	// Component imports
	import ArrowLeft from '$lib/components/icons/ArrowLeft.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	// External library imports
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	const i18n = getContext('i18n');

	// Component state variables
	let filename: string | null = null; // Current log filename from URL parameter
	let logContent: LogContentResponse | null = null; // Log file content and metadata
	let loading = true; // Loading state for initial and refresh requests
	let error: string | null = null; // Error message for display
	let retryCount = 0; // Number of retry attempts for failed requests
	let isRetrying = false; // Specific retry state to differentiate from initial loading
	let viewMode: 'timeline' | 'tree' | 'raw' = 'timeline'; // Toggle between timeline, tree view and raw JSON
	let selectedEntry: number | null = null; // Currently selected log entry for detailed view

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
		if (!sanitizedFilename || !validateFilePath(sanitizedFilename)) {
			toast.error('Invalid file path parameter');
			goto('/admin/aimbience/log-management');
			return;
		}

		filename = sanitizedFilename;
		await fetchLogContent();
	});

	// JSON Tree Renderer Component
	function JsonTreeNode({ key, value, level = 0, isLast = true }) {
		let expanded = level < 2; // Auto-expand first 2 levels

		const getValueType = (val) => {
			if (val === null) return 'null';
			if (Array.isArray(val)) return 'array';
			return typeof val;
		};

		const getValuePreview = (val) => {
			const type = getValueType(val);
			switch (type) {
				case 'string':
					return `"${val.length > 50 ? val.substring(0, 50) + '...' : val}"`;
				case 'number':
					return val.toString();
				case 'boolean':
					return val.toString();
				case 'null':
					return 'null';
				case 'array':
					return `Array(${val.length})`;
				case 'object':
					return `Object(${Object.keys(val).length})`;
				default:
					return String(val);
			}
		};

		const isExpandable = (val) => {
			return Array.isArray(val) || (typeof val === 'object' && val !== null);
		};

		const toggleExpanded = () => {
			expanded = !expanded;
		};

		return {
			key,
			value,
			level,
			isLast,
			expanded,
			getValueType,
			getValuePreview,
			isExpandable,
			toggleExpanded
		};
	}

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
			if (!validateFilePath(filename)) {
				throw new Error('Invalid file path');
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

			// Create more specific error messages based on error type
			let safeErrorMessage = createSafeErrorMessage(err, 'Error loading log content');

			// Provide more specific error messages for common cases
			if (err instanceof Error) {
				if (err.message.includes('Log file not found') || err.message.includes('404')) {
					safeErrorMessage = `Log file "${filename}" was not found on the server. It may have been deleted or moved.`;
				} else if (err.message.includes('No content received')) {
					safeErrorMessage = `The log file "${filename}" exists but contains no readable content.`;
				} else if (err.message.includes('server error') || err.message.includes('500')) {
					safeErrorMessage =
						'AIMBY-API server error. Please check your AIMBY-API logs and try again.';
				} else if (err.message.includes('Invalid filename')) {
					safeErrorMessage = `Invalid filename: "${filename}". Please return to the log management page and try again.`;
				}
			}

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
		return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
	}

	function formatTokenUsage(tokens: number): string {
		if (!tokens || tokens === 0) return '0';
		if (tokens >= 1000000) {
			return (tokens / 1000000).toFixed(1) + 'M';
		} else if (tokens >= 1000) {
			return (tokens / 1000).toFixed(1) + 'K';
		}
		return tokens.toString();
	}

	function goBack() {
		goto('/admin/aimbience/log-management');
	}

	// Workflow Analysis Helper Functions
	function calculateWorkflowDuration(content: any): string {
		if (!content || !Array.isArray(content)) return 'N/A';

		try {
			const timestamps = content
				.map((item) => {
					if (typeof item === 'string') {
						const parsed = JSON.parse(item);
						return parsed.timestamp || parsed.time || parsed.created_at;
					}
					return item?.timestamp || item?.time || item?.created_at;
				})
				.filter(Boolean)
				.map((ts) => new Date(ts).getTime())
				.sort((a, b) => a - b);

			if (timestamps.length < 2) return 'N/A';

			const duration = timestamps[timestamps.length - 1] - timestamps[0];
			const seconds = Math.floor(duration / 1000);
			const minutes = Math.floor(seconds / 60);

			if (minutes > 0) {
				return `${minutes}m ${seconds % 60}s`;
			}
			return `${seconds}s`;
		} catch {
			return 'N/A';
		}
	}

	function getWorkflowStatus(content: any): string {
		if (!content || !Array.isArray(content)) return 'Unknown';

		try {
			const lastEntry = content[content.length - 1];
			const parsed = typeof lastEntry === 'string' ? JSON.parse(lastEntry) : lastEntry;

			if (parsed?.status) return parsed.status;
			if (parsed?.level === 'ERROR') return 'Failed';
			if (parsed?.level === 'WARNING') return 'Completed with Warnings';
			if (parsed?.level === 'INFO' || parsed?.level === 'SUCCESS') return 'Completed';

			return 'In Progress';
		} catch {
			return 'Unknown';
		}
	}

	function countEntities(content: any, type: string): string {
		if (!content || !Array.isArray(content)) return '0';

		try {
			let count = 0;
			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				const message = parsed?.message || parsed?.msg || '';
				const data = parsed?.data || parsed?.entities || parsed?.documents || parsed?.relationships;

				// Check message content for entity mentions
				if (message.toLowerCase().includes(type.toLowerCase())) count++;

				// Check for structured data
				if (data && Array.isArray(data)) count += data.length;
				if (data && typeof data === 'object' && data.count) count += data.count;

				// Check for workflow-specific patterns
				if (
					type === 'document' &&
					(message.includes('document') ||
						message.includes('file') ||
						message.includes('content') ||
						parsed?.documents ||
						parsed?.files)
				)
					count++;

				if (
					type === 'entity' &&
					(message.includes('entity') ||
						message.includes('extract') ||
						message.includes('found') ||
						parsed?.entities ||
						parsed?.extracted)
				)
					count++;

				if (
					type === 'relationship' &&
					(message.includes('relationship') ||
						message.includes('connection') ||
						message.includes('link') ||
						parsed?.relationships ||
						parsed?.connections)
				)
					count++;
			});

			return count.toString();
		} catch {
			return '0';
		}
	}

	function calculateProcessingRate(content: any): string {
		if (!content || !Array.isArray(content)) return 'N/A';

		try {
			const timestamps = content
				.map((item) => {
					if (typeof item === 'string') {
						const parsed = JSON.parse(item);
						return parsed.timestamp || parsed.time || parsed.created_at;
					}
					return item?.timestamp || item?.time || item?.created_at;
				})
				.filter(Boolean)
				.map((ts) => new Date(ts).getTime())
				.sort((a, b) => a - b);

			if (timestamps.length < 2) return 'N/A';

			const duration = (timestamps[timestamps.length - 1] - timestamps[0]) / 1000; // seconds
			const rate = content.length / duration;

			return `${rate.toFixed(1)} entries/s`;
		} catch {
			return 'N/A';
		}
	}

	function getMemoryUsage(content: any): string {
		if (!content || !Array.isArray(content)) return 'N/A';

		try {
			let totalMemory = 0;
			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				if (parsed?.memory_usage || parsed?.memory) {
					totalMemory += parsed.memory_usage || parsed.memory;
				}
			});

			if (totalMemory === 0) return 'N/A';

			const mb = totalMemory / (1024 * 1024);
			return `${mb.toFixed(1)} MB`;
		} catch {
			return 'N/A';
		}
	}

	function countErrors(content: any): string {
		if (!content || !Array.isArray(content)) return '0';

		try {
			let errorCount = 0;
			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				if (parsed?.level === 'ERROR' || parsed?.status === 'error' || parsed?.error) {
					errorCount++;
				}
			});

			return errorCount.toString();
		} catch {
			return '0';
		}
	}

	// Enhanced workflow analysis functions
	function extractUserQuestion(content: any): string {
		if (!content || !Array.isArray(content)) return 'Not found';

		try {
			for (const item of content) {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				const message = parsed?.message || parsed?.msg || '';
				const inputQuestion = parsed?.input_question || parsed?.question || '';

				// Look for user question patterns
				if (inputQuestion && inputQuestion.length > 10) {
					return inputQuestion;
				}
				if (
					message.includes('user question') ||
					message.includes('query') ||
					message.includes('input')
				) {
					return parsed?.data || message;
				}
			}
			return 'Not found';
		} catch {
			return 'Not found';
		}
	}

	function extractWorkflowMetadata(content: any): any {
		if (!content || !Array.isArray(content)) return {};

		try {
			const metadata = {
				chatId: null,
				workflowId: null,
				threadId: null,
				startTime: null,
				endTime: null,
				totalSteps: 0,
				errorCount: 0,
				warningCount: 0,
				successCount: 0,
				processingSteps: []
			};

			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;

				// Extract basic metadata
				if (parsed?.chat_id && !metadata.chatId) metadata.chatId = parsed.chat_id;
				if (parsed?.workflow_id && !metadata.workflowId) metadata.workflowId = parsed.workflow_id;
				if (parsed?.thread_id && !metadata.threadId) metadata.threadId = parsed.thread_id;

				// Extract timestamps
				if (parsed?.timestamp && !metadata.startTime) metadata.startTime = parsed.timestamp;
				if (parsed?.timestamp) metadata.endTime = parsed.timestamp;

				// Count log levels
				if (parsed?.level === 'ERROR') metadata.errorCount++;
				if (parsed?.level === 'WARNING') metadata.warningCount++;
				if (parsed?.level === 'INFO' || parsed?.level === 'SUCCESS') metadata.successCount++;

				// Extract processing steps
				if (parsed?.event_type) {
					metadata.processingSteps.push({
						type: parsed.event_type,
						message: parsed.message,
						timestamp: parsed.timestamp,
						duration: parsed.duration_ms
					});
				}
			});

			metadata.totalSteps = content.length;
			return metadata;
		} catch {
			return {};
		}
	}

	function extractPerformanceMetrics(content: any): any {
		if (!content || !Array.isArray(content)) return {};

		try {
			const metrics = {
				totalDuration: 0,
				processingRate: 0,
				memoryUsage: 0,
				entitiesFound: 0,
				claimsFound: 0,
				chunksProcessed: 0,
				responseLength: 0,
				totalTokens: 0,
				inputTokens: 0,
				outputTokens: 0,
				tokenUsage: {
					prompt: 0,
					completion: 0,
					total: 0
				}
			};

			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;

				// Extract duration metrics
				if (parsed?.duration_ms) {
					metrics.totalDuration += parsed.duration_ms;
				}

				// Extract entity counts
				if (parsed?.entities_found) metrics.entitiesFound += parsed.entities_found;
				if (parsed?.claims_found) metrics.claimsFound += parsed.claims_found;
				if (parsed?.chunks_found) metrics.chunksProcessed += parsed.chunks_found;

				// Extract response length
				if (parsed?.response_length) metrics.responseLength = parsed.response_length;

				// Extract token usage metrics
				if (parsed?.token_usage) {
					if (parsed.token_usage.prompt_tokens) {
						metrics.tokenUsage.prompt += parsed.token_usage.prompt_tokens;
						metrics.inputTokens += parsed.token_usage.prompt_tokens;
					}
					if (parsed.token_usage.completion_tokens) {
						metrics.tokenUsage.completion += parsed.token_usage.completion_tokens;
						metrics.outputTokens += parsed.token_usage.completion_tokens;
					}
					if (parsed.token_usage.total_tokens) {
						metrics.tokenUsage.total += parsed.token_usage.total_tokens;
						metrics.totalTokens += parsed.token_usage.total_tokens;
					}
				}

				// Alternative token field names
				if (parsed?.tokens) {
					metrics.totalTokens += parsed.tokens;
					metrics.tokenUsage.total += parsed.tokens;
				}
				if (parsed?.input_tokens) {
					metrics.inputTokens += parsed.input_tokens;
					metrics.tokenUsage.prompt += parsed.input_tokens;
				}
				if (parsed?.output_tokens) {
					metrics.outputTokens += parsed.output_tokens;
					metrics.tokenUsage.completion += parsed.output_tokens;
				}
			});

			// Calculate processing rate
			if (metrics.totalDuration > 0) {
				metrics.processingRate = content.length / (metrics.totalDuration / 1000);
			}

			return metrics;
		} catch {
			return {};
		}
	}

	function extractChatHistory(content: any): string {
		if (!content || !Array.isArray(content)) return 'Not found';

		try {
			for (const item of content) {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				const message = parsed?.message || parsed?.msg || '';
				const data = parsed?.data || parsed?.chat_history || parsed?.conversation;

				if (message.includes('chat history') || message.includes('conversation') || data) {
					return data ? 'Included' : 'Not included';
				}
			}
			return 'Not found';
		} catch {
			return 'Not found';
		}
	}

	function extractWorkflowSteps(content: any): string {
		if (!content || !Array.isArray(content)) return '0';

		try {
			let steps = 0;
			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				const message = parsed?.message || parsed?.msg || '';

				// Count workflow processing steps
				if (
					message.includes('step') ||
					message.includes('phase') ||
					message.includes('stage') ||
					message.includes('processing') ||
					message.includes('executing') ||
					message.includes('running')
				) {
					steps++;
				}
			});

			return steps.toString();
		} catch {
			return '0';
		}
	}

	function extractKeyFindings(content: any): string {
		if (!content || !Array.isArray(content)) return 'None found';

		try {
			const findings = [];
			content.forEach((item) => {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				const message = parsed?.message || parsed?.msg || '';
				const data = parsed?.data || parsed?.result || parsed?.output;

				// Look for findings/results
				if (
					message.includes('found') ||
					message.includes('result') ||
					message.includes('output') ||
					message.includes('extracted') ||
					message.includes('identified') ||
					data
				) {
					if (data && typeof data === 'string' && data.length < 100) {
						findings.push(data);
					} else if (message.length < 100) {
						findings.push(message);
					}
				}
			});

			return findings.length > 0 ? `${findings.length} findings` : 'None found';
		} catch {
			return 'None found';
		}
	}

	function generateWorkflowSummary(content: any): any {
		if (!content || !Array.isArray(content)) {
			return { error: 'No content available' };
		}

		try {
			const summary = {
				metadata: {
					filename: filename,
					totalEntries: content.length,
					generatedAt: new Date().toISOString(),
					duration: calculateWorkflowDuration(content),
					status: getWorkflowStatus(content)
				},
				metrics: {
					documents: countEntities(content, 'document'),
					entities: countEntities(content, 'entity'),
					relationships: countEntities(content, 'relationship'),
					errors: countErrors(content),
					processingRate: calculateProcessingRate(content),
					memoryUsage: getMemoryUsage(content)
				},
				timeline: content.map((item, index) => {
					try {
						const entry = typeof item === 'string' ? JSON.parse(item) : item;
						return {
							index,
							timestamp: entry.timestamp || entry.time || entry.created_at,
							level: entry.level || entry.severity || 'INFO',
							message: entry.message || entry.msg || entry.text || '',
							step: entry.step || entry.phase || entry.stage || '',
							duration: entry.duration || entry.execution_time || '',
							entities: entry.entities || entry.documents || entry.relationships || [],
							errors: entry.errors || entry.error || ''
						};
					} catch {
						return {
							index,
							error: 'Failed to parse entry',
							raw: item
						};
					}
				})
			};

			return summary;
		} catch (error) {
			return {
				error: 'Failed to generate summary',
				details: error.message
			};
		}
	}

	function isValidJSON(content: any): boolean {
		if (Array.isArray(content)) {
			return content.every((item) => {
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
			return content
				.map((item) => {
					if (typeof item === 'string') {
						try {
							const parsed = JSON.parse(item);
							return JSON.stringify(parsed, null, 2);
						} catch {
							// Sanitize string content for safe display
							return sanitizeDisplayContent(item);
						}
					}
					return typeof item === 'object'
						? JSON.stringify(item, null, 2)
						: sanitizeDisplayContent(item);
				})
				.join('\n\n');
		} else if (typeof content === 'object') {
			return JSON.stringify(content, null, 2);
		}
		// Sanitize content for safe display
		return sanitizeDisplayContent(content);
	}

	function renderEnhancedWorkflowTimeline(data: any): string {
		if (!Array.isArray(data)) {
			return '<div class="text-gray-500 dark:text-gray-400 text-center py-8">No timeline data available</div>';
		}

		let html = '<div class="space-y-6">';

		// Enhanced workflow summary at the top
		const metadata = extractWorkflowMetadata(data);
		const metrics = extractPerformanceMetrics(data);
		const userQuestion = extractUserQuestion(data);

		// Workflow Overview Card
		html += `
			<div class="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-xl border border-indigo-200 dark:border-indigo-700 p-6 mb-8">
				<div class="flex items-center gap-4 mb-4">
					<div class="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
						<svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
						</svg>
					</div>
					<div>
						<h3 class="text-lg font-bold text-gray-900 dark:text-white">Workflow Execution Overview</h3>
						<p class="text-sm text-gray-600 dark:text-gray-400">AI-powered analysis and performance insights</p>
					</div>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
					<div class="space-y-2">
						<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">User Question</h4>
						<div class="bg-white/50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
							<p class="text-sm text-gray-900 dark:text-white leading-relaxed line-clamp-3" title="${escapeHtml(userQuestion)}">
								${userQuestion !== 'Not found' ? escapeHtml(userQuestion) : 'No user question found'}
							</p>
						</div>
					</div>
					
					<div class="space-y-2">
						<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Performance</h4>
						<div class="space-y-1">
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Duration:</span>
								<span class="font-medium text-gray-900 dark:text-white">${calculateWorkflowDuration(data)}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Steps:</span>
								<span class="font-medium text-gray-900 dark:text-white">${metadata.totalSteps}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Entities:</span>
								<span class="font-medium text-gray-900 dark:text-white">${metrics.entitiesFound}</span>
							</div>
						</div>
					</div>
					
					<div class="space-y-2">
						<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Status</h4>
						<div class="space-y-1">
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Success:</span>
								<span class="font-medium text-green-600 dark:text-green-400">${metadata.successCount}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Errors:</span>
								<span class="font-medium text-red-600 dark:text-red-400">${metadata.errorCount}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Warnings:</span>
								<span class="font-medium text-yellow-600 dark:text-yellow-400">${metadata.warningCount}</span>
							</div>
						</div>
					</div>
					
					<div class="space-y-2">
						<h4 class="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">Metadata</h4>
						<div class="space-y-1">
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Chat ID:</span>
								<span class="font-mono text-gray-900 dark:text-white text-xs truncate max-w-20" title="${metadata.chatId}">${metadata.chatId || 'N/A'}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Workflow:</span>
								<span class="font-medium text-gray-900 dark:text-white">${metadata.workflowId || 'N/A'}</span>
							</div>
							<div class="flex justify-between text-sm">
								<span class="text-gray-600 dark:text-gray-400">Thread:</span>
								<span class="font-medium text-gray-900 dark:text-white">${metadata.threadId || 'N/A'}</span>
							</div>
						</div>
					</div>
				</div>
			</div>
		`;

		data.forEach((item, index) => {
			try {
				const entry = typeof item === 'string' ? JSON.parse(item) : item;
				const timestamp = entry.timestamp || entry.time || entry.created_at || entry.ts;
				const level = entry.level || entry.severity || 'INFO';
				const message = entry.message || entry.msg || entry.text || '';
				const eventType = entry.event_type || '';
				const duration = entry.duration_ms || entry.duration || entry.execution_time || '';
				const entities =
					entry.entities_found || entry.entities || entry.documents || entry.relationships || [];
				const errors = entry.errors || entry.error || '';
				const data = entry.data || entry.result || entry.output || '';
				const metadata = entry.metadata || entry.context || entry.params || '';
				const tokenUsage = entry.token_usage || {};
				const tokens = entry.tokens || tokenUsage.total_tokens || 0;
				const inputTokens = entry.input_tokens || tokenUsage.prompt_tokens || 0;
				const outputTokens = entry.output_tokens || tokenUsage.completion_tokens || 0;

				// Enhanced status detection with better visual indicators
				let statusColor =
					'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
				let statusIcon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z';
				let stepInfo = '';

				// Determine step info and status based on event type and message
				if (eventType) {
					stepInfo = eventType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
				} else if (message.includes('BEFORE_EXECUTE')) {
					stepInfo = 'Initialization';
					statusColor =
						'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800';
					statusIcon =
						'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4';
				} else if (message.includes('AFTER_EXECUTE')) {
					stepInfo = 'Completion';
					statusColor =
						'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
					statusIcon = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
				} else if (
					level === 'ERROR' ||
					errors ||
					message.includes('error') ||
					message.includes('failed')
				) {
					stepInfo = 'Error';
					statusColor =
						'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
					statusIcon = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z';
				} else if (level === 'WARNING' || message.includes('warning')) {
					stepInfo = 'Warning';
					statusColor =
						'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
					statusIcon =
						'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z';
				} else if (
					message.includes('processing') ||
					message.includes('executing') ||
					message.includes('running')
				) {
					stepInfo = 'Processing';
					statusColor =
						'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
					statusIcon = 'M13 10V3L4 14h7v7l9-11h-7z';
				} else if (
					message.includes('found') ||
					message.includes('extracted') ||
					message.includes('completed')
				) {
					stepInfo = 'Success';
					statusColor =
						'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
					statusIcon = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z';
				}

				// Enhanced timeline entry with better visual design
				html += `
					<div class="group relative flex gap-6 p-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200 ${selectedEntry === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''}">
						<!-- Enhanced Timeline connector -->
						<div class="flex flex-col items-center">
							<div class="w-12 h-12 ${statusColor} rounded-full border-2 flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-200">
								<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${statusIcon}"/>
								</svg>
							</div>
							${index < data.length - 1 ? '<div class="w-1 h-12 bg-gradient-to-b from-gray-300 to-gray-200 dark:from-gray-600 dark:to-gray-500 mt-2 rounded-full"></div>' : ''}
						</div>
						
						<!-- Enhanced Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-4 mb-3">
								<div class="flex-1">
									<div class="flex items-center gap-3 mb-2">
										${stepInfo ? `<span class="px-3 py-1 bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 text-gray-700 dark:text-gray-300 rounded-full text-sm font-medium shadow-sm">${escapeHtml(stepInfo)}</span>` : ''}
										<span class="px-3 py-1 ${statusColor} rounded-full text-sm font-medium border shadow-sm">${level}</span>
										${duration ? `<span class="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded text-xs font-mono">${duration}ms</span>` : ''}
										${tokens > 0 ? `<span class="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded text-xs font-mono">${formatTokenUsage(tokens)} tokens</span>` : ''}
									</div>
									<p class="text-base font-medium text-gray-900 dark:text-white leading-relaxed">${escapeHtml(message)}</p>
								</div>
								<div class="text-right text-sm text-gray-500 dark:text-gray-400">
									${timestamp ? `<div class="font-mono">${formatTimelineTimestamp(timestamp)}</div>` : ''}
								</div>
							</div>
							
							<!-- Enhanced data preview with better organization -->
							${
								entities > 0 || data || metadata || errors || tokens > 0
									? `
								<div class="mt-4 space-y-3">
									${
										tokens > 0
											? `
										<div class="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-200 dark:border-green-700">
											<div class="text-sm font-semibold text-green-700 dark:text-green-300 mb-2 flex items-center gap-2">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												Token Usage
											</div>
											<div class="grid grid-cols-3 gap-4 text-sm">
												<div class="text-center">
													<div class="font-bold text-green-600 dark:text-green-400">{formatTokenUsage(tokens)}</div>
													<div class="text-green-600 dark:text-green-400">Total</div>
												</div>
												<div class="text-center">
													<div class="font-bold text-blue-600 dark:text-blue-400">{formatTokenUsage(inputTokens)}</div>
													<div class="text-blue-600 dark:text-blue-400">Input</div>
												</div>
												<div class="text-center">
													<div class="font-bold text-orange-600 dark:text-orange-400">{formatTokenUsage(outputTokens)}</div>
													<div class="text-orange-600 dark:text-orange-400">Output</div>
												</div>
											</div>
										</div>
									`
											: ''
									}
									
									${
										entities > 0
											? `
										<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
											<span class="flex items-center gap-2">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
												</svg>
												${entities} entities processed
											</span>
											${
												entry.count
													? `<span class="flex items-center gap-2">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
												</svg>
												${entry.count} total
											</span>`
													: ''
											}
										</div>
									`
											: ''
									}
									
									${
										data
											? `
										<div class="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-900/50 dark:to-gray-800/50 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
											<div class="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
												</svg>
												Data/Output
											</div>
											<pre class="text-sm text-gray-600 dark:text-gray-400 overflow-auto max-h-32 bg-white dark:bg-gray-800 p-3 rounded border">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
										</div>
									`
											: ''
									}
									
									${
										metadata
											? `
										<div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-700">
											<div class="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-2 flex items-center gap-2">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												Context/Metadata
											</div>
											<pre class="text-sm text-blue-600 dark:text-blue-400 overflow-auto max-h-32 bg-white/50 dark:bg-gray-800/50 p-3 rounded border">${escapeHtml(JSON.stringify(metadata, null, 2))}</pre>
										</div>
									`
											: ''
									}
									
									${
										errors
											? `
										<div class="bg-gradient-to-r from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-red-200 dark:border-red-800">
											<div class="text-sm font-semibold text-red-700 dark:text-red-300 mb-2 flex items-center gap-2">
												<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
												</svg>
												Error Details
											</div>
											<div class="text-sm text-red-700 dark:text-red-300 bg-white/50 dark:bg-gray-800/50 p-3 rounded border">${escapeHtml(errors)}</div>
										</div>
									`
											: ''
									}
								</div>
							`
									: ''
							}
							
							<!-- Enhanced raw entry toggle -->
							<div class="mt-4">
								<button 
									onclick="toggleRawEntry(${index})" 
									class="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 font-medium flex items-center gap-2 transition-colors duration-200"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
									</svg>
									Show raw entry
								</button>
								<div id="raw-entry-${index}" class="hidden mt-3">
									<pre class="text-sm bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border overflow-auto max-h-48 text-gray-600 dark:text-gray-400 font-mono">${escapeHtml(JSON.stringify(entry, null, 2))}</pre>
								</div>
							</div>
						</div>
					</div>
				`;
			} catch (error) {
				html += `
					<div class="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
						<div class="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full border-2 flex items-center justify-center">
							<svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
							</svg>
						</div>
						<div class="flex-1">
							<p class="text-sm text-gray-500 dark:text-gray-400">Invalid log entry</p>
							<pre class="text-xs text-gray-400 dark:text-gray-500 mt-1">${escapeHtml(JSON.stringify(item, null, 2))}</pre>
						</div>
					</div>
				`;
			}
		});

		html += '</div>';
		return html;
	}

	function formatTimelineTimestamp(timestamp: string | number): string {
		try {
			const date = new Date(timestamp);
			return date.toLocaleTimeString('en-US', {
				hour12: false,
				hour: '2-digit',
				minute: '2-digit',
				second: '2-digit'
			});
		} catch {
			return String(timestamp);
		}
	}

	function renderJsonTree(data: any, level: number = 0): string {
		if (data === null) {
			return '<span class="text-gray-500 dark:text-gray-400 italic">null</span>';
		}

		if (typeof data === 'string') {
			// Try to parse if it looks like JSON
			try {
				const parsed = JSON.parse(data);
				return renderJsonTree(parsed, level);
			} catch {
				// Escape and truncate long strings
				const escaped = escapeHtml(data);
				const truncated = escaped.length > 100 ? escaped.substring(0, 100) + '...' : escaped;
				return `<span class="text-green-600 dark:text-green-400" title="${escaped}">"${truncated}"</span>`;
			}
		}

		if (typeof data === 'number') {
			return `<span class="text-blue-600 dark:text-blue-400">${data}</span>`;
		}

		if (typeof data === 'boolean') {
			return `<span class="text-purple-600 dark:text-purple-400">${data}</span>`;
		}

		if (Array.isArray(data)) {
			if (data.length === 0) {
				return '<span class="text-gray-500 dark:text-gray-400">[]</span>';
			}

			// Auto-expand small arrays (less than 5 items) and collapse large ones
			const autoExpand = data.length < 5 && level < 3;
			const toggleId = `toggle-${Math.random().toString(36).substr(2, 9)}`;

			let html = `<div class="json-array">
				<span class="text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-1 rounded select-none" onclick="toggleJsonNode(this)">
					<span class="json-toggle">${autoExpand ? '▼' : '▶'}</span> 
					<span class="text-xs text-gray-500 dark:text-gray-400">Array</span>
					<span class="text-blue-600 dark:text-blue-400 font-medium">(${data.length})</span>
				</span>
				<div class="json-children ml-4 border-l border-gray-200 dark:border-gray-700 pl-4" style="display: ${autoExpand ? 'block' : 'none'}">`;

			data.forEach((item, index) => {
				html += `<div class="json-item py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-2 -mx-2">
					<span class="text-gray-500 dark:text-gray-400 text-sm font-mono mr-2">[${index}]</span>
					${renderJsonTree(item, level + 1)}
				</div>`;
			});

			html += '</div></div>';
			return html;
		}

		if (typeof data === 'object') {
			const keys = Object.keys(data);
			if (keys.length === 0) {
				return '<span class="text-gray-500 dark:text-gray-400">{}</span>';
			}

			// Auto-expand small objects (less than 5 keys) and collapse large ones
			const autoExpand = keys.length < 5 && level < 3;

			let html = `<div class="json-object">
				<span class="text-gray-600 dark:text-gray-400 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-1 rounded select-none" onclick="toggleJsonNode(this)">
					<span class="json-toggle">${autoExpand ? '▼' : '▶'}</span> 
					<span class="text-xs text-gray-500 dark:text-gray-400">Object</span>
					<span class="text-orange-600 dark:text-orange-400 font-medium">(${keys.length})</span>
				</span>
				<div class="json-children ml-4 border-l border-gray-200 dark:border-gray-700 pl-4" style="display: ${autoExpand ? 'block' : 'none'}">`;

			keys.forEach((key) => {
				html += `<div class="json-item py-1 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-2 -mx-2">
					<span class="text-red-600 dark:text-red-400 font-medium font-mono">"${escapeHtml(key)}"</span><span class="text-gray-500 dark:text-gray-400">:</span> 
					${renderJsonTree(data[key], level + 1)}
				</div>`;
			});

			html += '</div></div>';
			return html;
		}

		return `<span class="text-gray-500 dark:text-gray-400">${escapeHtml(String(data))}</span>`;
	}

	function escapeHtml(text: string): string {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	// Global functions for timeline interactions
	if (typeof window !== 'undefined') {
		window.toggleJsonNode = function (element) {
			const children = element.parentElement.querySelector('.json-children');
			const toggle = element.querySelector('.json-toggle');

			if (children.style.display === 'none') {
				children.style.display = 'block';
				toggle.textContent = '▼';
			} else {
				children.style.display = 'none';
				toggle.textContent = '▶';
			}
		};

		window.toggleRawEntry = function (index) {
			const rawEntry = document.getElementById(`raw-entry-${index}`);
			const button = rawEntry.previousElementSibling;

			if (rawEntry.classList.contains('hidden')) {
				rawEntry.classList.remove('hidden');
				button.textContent = 'Hide raw entry';
			} else {
				rawEntry.classList.add('hidden');
				button.textContent = 'Show raw entry';
			}
		};
	}
</script>

<svelte:head>
	<title>Workflow Execution Log - {filename || 'Loading...'} • Open WebUI</title>
</svelte:head>

<div class="min-h-screen bg-gray-50 dark:bg-gray-900">
	

	<!-- Content -->
	<div class="px-4 sm:px-6 py-6">
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
				<div
					class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6"
					role="alert"
					aria-live="assertive"
				>
					<div class="flex items-start gap-3">
						<svg
							class="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							aria-hidden="true"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						<div class="flex-1">
							<h3
								class="text-lg font-medium text-red-800 dark:text-red-200 mb-2"
								id="error-heading"
							>
								Error Loading Log Content
							</h3>
							<p class="text-red-700 dark:text-red-300 mb-4" aria-describedby="error-heading">
								{error}
							</p>
							{#if error.includes('not found')}
								<div
									class="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded"
								>
									<p class="text-sm text-blue-800 dark:text-blue-200">
										<strong>Note:</strong> This log file may have been automatically cleaned up or moved.
										Try refreshing the log management page to see the current list of available files.
									</p>
								</div>
							{/if}
							<div class="flex flex-col sm:flex-row gap-3">
								<button
									on:click={retryFetchContent}
									class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
									disabled={isRetrying}
									aria-label="Retry loading log content"
								>
									{#if isRetrying}
										<svg
											class="w-4 h-4 animate-spin"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
											/>
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
								{#if error.includes('not found')}
									<button
										on:click={() => goto('/admin/aimbience/log-management?refresh=true')}
										class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
										aria-label="Refresh log list"
									>
										Refresh Log List
									</button>
								{/if}
								{#if retryCount > 0}
									<span
										class="px-3 py-2 text-sm bg-red-200 dark:bg-red-800/50 text-red-700 dark:text-red-300 rounded-lg"
										role="status"
									>
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
				<!-- Combined File Information and Tabs -->
				<div
					class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<!-- Combined Header with File Information -->
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-4">
								<!-- Back Button -->
								<button
									on:click={goBack}
									class="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
									aria-label="Back to Log Management"
									title="Return to log management list"
								>
									<ArrowLeft className="w-4 h-4" />
								</button>
								<div class="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>
								
								<!-- File Icon and Info -->
								<div
									class="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center"
								>
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
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
								<div>
									<h1 class="text-lg font-medium text-gray-900 dark:text-white">Workflow Log Viewer</h1>
									<div class="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
										<span class="font-medium">{filename}</span>
										<span>•</span>
										<span>{formatFileSize(logContent.size)}</span>
										<span>•</span>
										<span>{formatDate(logContent.modified)}</span>
										{#if Array.isArray(logContent.content)}
											{@const metadata = extractWorkflowMetadata(logContent.content)}
											{#if metadata.chatId}
												<span>•</span>
												<span class="font-mono text-xs">{metadata.chatId}</span>
											{/if}
										{/if}
									</div>
								</div>
							</div>
							<div class="flex items-center gap-2">
								<button
									on:click={() => fetchLogContent(true)}
									class="px-3 py-1.5 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
									disabled={loading || isRetrying}
								>
									{loading || isRetrying ? 'Refreshing...' : 'Refresh'}
								</button>
							</div>
						</div>
					</div>

					<!-- Tabs Navigation -->
					<div class="border-b border-gray-200 dark:border-gray-700">
						<nav class="flex items-center justify-between px-6">
							<div class="flex space-x-8">
								<button
									on:click={() => (viewMode = 'timeline')}
									class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {viewMode ===
									'timeline'
										? 'border-blue-500 text-blue-600 dark:text-blue-400'
										: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
								>
									Timeline
								</button>
								<button
									on:click={() => (viewMode = 'tree')}
									class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {viewMode ===
									'tree'
										? 'border-blue-500 text-blue-600 dark:text-blue-400'
										: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
								>
									Tree View
								</button>
								<button
									on:click={() => (viewMode = 'raw')}
									class="py-4 px-1 border-b-2 font-medium text-sm transition-colors {viewMode ===
									'raw'
										? 'border-blue-500 text-blue-600 dark:text-blue-400'
										: 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}"
								>
									Raw JSON
								</button>
							</div>
							<div class="flex items-center gap-2">
								<button
									on:click={() => {
										// Export raw JSON data
										const rawData = logContent.content;
										const blob = new Blob([JSON.stringify(rawData, null, 2)], {
											type: 'application/json'
										});
										const url = URL.createObjectURL(blob);
										const a = document.createElement('a');
										a.href = url;
										a.download = `${filename?.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
										document.body.appendChild(a);
										a.click();
										document.body.removeChild(a);
										URL.revokeObjectURL(url);
										toast.success('JSON data downloaded');
									}}
									class="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									Download JSON
								</button>
							</div>
						</nav>
					</div>
					<!-- Tab Content -->
					<div class="p-6">
						{#if logContent.content}
							{#if isValidJSON(logContent.content) && viewMode === 'timeline'}
								<!-- Compact Timeline Table -->
								<div class="overflow-hidden border border-gray-200 dark:border-gray-700 rounded-lg">
									<table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
										<thead class="bg-gray-50 dark:bg-gray-800">
											<tr>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
												>
													Step
												</th>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
												>
													Time
												</th>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
												>
													Level
												</th>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
												>
													Message
												</th>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
												>
													Duration
												</th>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
												>
													Tokens
												</th>
												<th
													class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
												>
													Actions
												</th>
											</tr>
										</thead>
										<tbody
											class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700"
										>
											{#each logContent.content as item, index}
												{@const entry = typeof item === 'string' ? JSON.parse(item) : item}
												{@const timestamp =
													entry.timestamp || entry.time || entry.created_at || entry.ts}
												{@const level = entry.level || entry.severity || 'INFO'}
												{@const message = entry.message || entry.msg || entry.text || ''}
												{@const eventType = entry.event_type || ''}
												{@const duration =
													entry.duration_ms || entry.duration || entry.execution_time || ''}
												{@const tokenUsage = entry.token_usage || {}}
												{@const tokens = entry.tokens || tokenUsage.total_tokens || 0}

												<tr class="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
													<td
														class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700"
													>
														{index + 1}
													</td>
													<td
														class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"
													>
														{timestamp ? formatTimelineTimestamp(timestamp) : '-'}
													</td>
													<td
														class="px-6 py-4 whitespace-nowrap border-r border-gray-200 dark:border-gray-700"
													>
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
														class="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-md truncate border-r border-gray-200 dark:border-gray-700"
														title={message}
													>
														{message}
													</td>
													<td
														class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"
													>
														{duration ? `${duration}ms` : '-'}
													</td>
													<td
														class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700"
													>
														{tokens > 0 ? formatTokenUsage(tokens) : '-'}
													</td>
													<td
														class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400"
													>
														<button
															on:click={() =>
																(selectedEntry = selectedEntry === index ? null : index)}
															class="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
														>
															{selectedEntry === index ? 'Hide' : 'Details'}
														</button>
													</td>
												</tr>
												{#if selectedEntry === index}
													<tr>
														<td colspan="7" class="px-6 py-4 bg-gray-50 dark:bg-gray-800">
															<div class="space-y-3">
																<div class="grid grid-cols-2 gap-4 text-sm">
																	<div>
																		<span class="font-medium text-gray-700 dark:text-gray-300"
																			>Event Type:</span
																		>
																		<span class="ml-2 text-gray-600 dark:text-gray-400"
																			>{eventType || 'N/A'}</span
																		>
																	</div>
																	<div>
																		<span class="font-medium text-gray-700 dark:text-gray-300"
																			>Full Message:</span
																		>
																		<span class="ml-2 text-gray-600 dark:text-gray-400"
																			>{message}</span
																		>
																	</div>
																</div>
																{#if entry.data || entry.metadata || entry.errors}
																	<div class="border-t border-gray-200 dark:border-gray-700 pt-3">
																		<details class="text-sm">
																			<summary
																				class="cursor-pointer text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
																			>
																				Show Raw Data
																			</summary>
																			<pre
																				class="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded text-xs overflow-auto max-h-48">{JSON.stringify(
																					entry,
																					null,
																					2
																				)}</pre>
																		</details>
																	</div>
																{/if}
															</div>
														</td>
													</tr>
												{/if}
											{/each}
										</tbody>
									</table>
								</div>
							{:else if isValidJSON(logContent.content) && viewMode === 'tree'}
								<!-- Compact Tree View -->
								<div class="overflow-auto max-h-[40rem]">
									{@html renderJsonTree(logContent.content)}
								</div>
							{:else if isValidJSON(logContent.content) && viewMode === 'raw'}
								<!-- Raw JSON -->
								<pre
									class="text-sm overflow-auto max-h-[40rem] text-gray-900 dark:text-white font-mono leading-relaxed bg-gray-50 dark:bg-gray-800 p-4 rounded border"
									style="white-space: pre-wrap; word-wrap: break-word;">
									{formatContent(logContent.content)}
								</pre>
							{:else}
								<!-- Plain text content -->
								<pre
									class="text-sm overflow-auto max-h-[40rem] text-gray-900 dark:text-white font-mono leading-relaxed bg-gray-50 dark:bg-gray-800 p-4 rounded border"
									style="white-space: pre-wrap; word-wrap: break-word;">
									{formatContent(logContent.content)}
								</pre>
							{/if}
						{:else}
							<div class="text-center py-12 text-gray-500 dark:text-gray-400">
								<p class="text-lg font-medium">No content available</p>
								<p class="text-sm">This log file appears to be empty or unreadable</p>
							</div>
						{/if}
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

<style>
	:global(.json-array),
	:global(.json-object) {
		font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', Consolas, 'Courier New',
			monospace;
		font-size: 0.875rem;
		line-height: 1.6;
	}

	:global(.json-toggle) {
		display: inline-block;
		width: 14px;
		text-align: center;
		user-select: none;
		transition: transform 0.2s ease;
		font-size: 0.75rem;
		font-weight: bold;
	}

	:global(.json-item) {
		transition: all 0.2s ease;
		border-radius: 0.25rem;
	}

	:global(.json-children) {
		animation: fadeIn 0.3s ease-in-out;
		transition: all 0.2s ease;
	}

	:global(.json-children[style*='display: none']) {
		animation: fadeOut 0.2s ease-in-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-4px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
			transform: translateY(0);
		}
		to {
			opacity: 0;
			transform: translateY(-4px);
		}
	}

	/* Improve readability with better spacing and colors */
	:global(.json-array .json-children),
	:global(.json-object .json-children) {
		margin-top: 0.5rem;
		padding-top: 0.25rem;
	}

	/* Add subtle hover effects for better interactivity */
	:global(.json-array > span:hover),
	:global(.json-object > span:hover) {
		background-color: rgba(59, 130, 246, 0.1) !important;
		border-radius: 0.25rem;
	}
</style>
