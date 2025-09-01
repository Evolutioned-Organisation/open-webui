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

	// New functions to extract essential workflow information
	function extractUserQuestion(content: any): string {
		if (!content || !Array.isArray(content)) return 'Not found';

		try {
			for (const item of content) {
				const parsed = typeof item === 'string' ? JSON.parse(item) : item;
				const message = parsed?.message || parsed?.msg || '';
				const data = parsed?.data || parsed?.input || parsed?.query || parsed?.question;

				// Look for user question patterns
				if (
					message.includes('user question') ||
					message.includes('query') ||
					message.includes('input')
				) {
					return data || message;
				}
				if (data && typeof data === 'string' && data.length > 10) {
					return data;
				}
			}
			return 'Not found';
		} catch {
			return 'Not found';
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

	function renderWorkflowTimeline(data: any): string {
		if (!Array.isArray(data)) {
			return '<div class="text-gray-500 dark:text-gray-400">No timeline data available</div>';
		}

		let html = '<div class="space-y-4">';

		// Add workflow summary at the top
		const userQuestion = extractUserQuestion(data);
		const chatHistory = extractChatHistory(data);
		const keyFindings = extractKeyFindings(data);

		if (
			userQuestion !== 'Not found' ||
			chatHistory !== 'Not found' ||
			keyFindings !== 'None found'
		) {
			html += `
				<div class="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-700 p-4 mb-6">
					<h3 class="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">Workflow Summary</h3>
					<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
						${
							userQuestion !== 'Not found'
								? `
							<div>
								<span class="font-medium text-gray-700 dark:text-gray-300">User Question:</span>
								<p class="text-gray-600 dark:text-gray-400 mt-1 truncate" title="${escapeHtml(userQuestion)}">${escapeHtml(userQuestion)}</p>
							</div>
						`
								: ''
						}
						${
							chatHistory !== 'Not found'
								? `
							<div>
								<span class="font-medium text-gray-700 dark:text-gray-300">Chat History:</span>
								<p class="text-gray-600 dark:text-gray-400 mt-1">${chatHistory}</p>
							</div>
						`
								: ''
						}
						${
							keyFindings !== 'None found'
								? `
							<div>
								<span class="font-medium text-gray-700 dark:text-gray-300">Key Findings:</span>
								<p class="text-gray-600 dark:text-gray-400 mt-1">${keyFindings}</p>
							</div>
						`
								: ''
						}
					</div>
				</div>
			`;
		}

		data.forEach((item, index) => {
			try {
				const entry = typeof item === 'string' ? JSON.parse(item) : item;
				const timestamp = entry.timestamp || entry.time || entry.created_at || entry.ts;
				const level = entry.level || entry.severity || 'INFO';
				const message = entry.message || entry.msg || entry.text || '';
				const step = entry.step || entry.phase || entry.stage || '';
				const duration = entry.duration || entry.execution_time || '';
				const entities = entry.entities || entry.documents || entry.relationships || [];
				const errors = entry.errors || entry.error || '';
				const data = entry.data || entry.result || entry.output || '';
				const metadata = entry.metadata || entry.context || entry.params || '';

				// Determine status color and icon based on message content
				let statusColor =
					'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800';
				let statusIcon = 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'; // clock icon

				// Enhanced status detection based on message content
				if (
					level === 'ERROR' ||
					errors ||
					message.includes('error') ||
					message.includes('failed')
				) {
					statusColor =
						'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800';
					statusIcon = 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'; // error icon
				} else if (level === 'WARNING' || message.includes('warning')) {
					statusColor =
						'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800';
					statusIcon =
						'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'; // warning icon
				} else if (
					level === 'SUCCESS' ||
					message.includes('completed') ||
					message.includes('finished') ||
					message.includes('success') ||
					message.includes('found') ||
					message.includes('extracted')
				) {
					statusColor =
						'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800';
					statusIcon = 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'; // success icon
				} else if (
					message.includes('processing') ||
					message.includes('executing') ||
					message.includes('running')
				) {
					statusColor =
						'bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800';
					statusIcon = 'M13 10V3L4 14h7v7l9-11h-7z'; // lightning icon
				}

				// Extract meaningful step information
				let stepInfo = step;
				if (!stepInfo) {
					if (message.includes('initialized')) stepInfo = 'Initialization';
					else if (message.includes('processing')) stepInfo = 'Processing';
					else if (message.includes('extracting')) stepInfo = 'Extraction';
					else if (message.includes('analyzing')) stepInfo = 'Analysis';
					else if (message.includes('generating')) stepInfo = 'Generation';
					else if (message.includes('completed')) stepInfo = 'Completion';
				}

				html += `
					<div class="flex gap-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
						<!-- Timeline connector -->
						<div class="flex flex-col items-center">
							<div class="w-8 h-8 ${statusColor} rounded-full border-2 flex items-center justify-center flex-shrink-0">
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${statusIcon}"/>
								</svg>
							</div>
							${index < data.length - 1 ? '<div class="w-0.5 h-8 bg-gray-300 dark:bg-gray-600 mt-2"></div>' : ''}
						</div>
						
						<!-- Content -->
						<div class="flex-1 min-w-0">
							<div class="flex items-start justify-between gap-4 mb-2">
								<div class="flex-1">
									<div class="flex items-center gap-2 mb-1">
										${stepInfo ? `<span class="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs font-medium">${escapeHtml(stepInfo)}</span>` : ''}
										<span class="px-2 py-1 ${statusColor} rounded text-xs font-medium border">${level}</span>
									</div>
									<p class="text-sm font-medium text-gray-900 dark:text-white">${escapeHtml(message)}</p>
								</div>
								<div class="text-right text-xs text-gray-500 dark:text-gray-400">
									${timestamp ? `<div>${formatTimelineTimestamp(timestamp)}</div>` : ''}
									${duration ? `<div class="mt-1">${duration}</div>` : ''}
								</div>
							</div>
							
							<!-- Enhanced data preview -->
							${
								entities.length > 0 || data || metadata
									? `
								<div class="mt-3 space-y-2">
									${
										entities.length > 0
											? `
										<div class="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
											<span>📄 ${entities.length} items processed</span>
											${entry.count ? `<span>📊 ${entry.count} total</span>` : ''}
										</div>
									`
											: ''
									}
									
									${
										data
											? `
										<div class="bg-gray-50 dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
											<div class="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Data/Output:</div>
											<pre class="text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-20">${escapeHtml(JSON.stringify(data, null, 2))}</pre>
										</div>
									`
											: ''
									}
									
									${
										metadata
											? `
										<div class="bg-blue-50 dark:bg-blue-900/20 rounded p-2 border border-blue-200 dark:border-blue-700">
											<div class="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Context/Metadata:</div>
											<pre class="text-xs text-blue-600 dark:text-blue-400 overflow-auto max-h-20">${escapeHtml(JSON.stringify(metadata, null, 2))}</pre>
										</div>
									`
											: ''
									}
								</div>
							`
									: ''
							}
							
							<!-- Error details -->
							${
								errors
									? `
								<div class="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-xs text-red-700 dark:text-red-300">
									<strong>Error:</strong> ${escapeHtml(errors)}
								</div>
							`
									: ''
							}
							
							<!-- Raw entry toggle -->
							<div class="mt-2">
								<button 
									onclick="toggleRawEntry(${index})" 
									class="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 underline"
								>
									Show raw entry
								</button>
								<div id="raw-entry-${index}" class="hidden mt-2">
									<pre class="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded border overflow-auto max-h-32 text-gray-600 dark:text-gray-400">${escapeHtml(JSON.stringify(entry, null, 2))}</pre>
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
	<!-- Enhanced Header -->
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
					<div class="flex items-center gap-3">
						<div class="flex-shrink-0">
							<div
								class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm"
							>
								<svg
									class="w-5 h-5 text-white"
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
						<div>
							<h1
								class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white"
								id="log-viewer-title"
							>
								Workflow Execution Log
							</h1>
							<div class="flex items-center gap-2 mt-1">
								{#if filename?.includes('session_')}
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800"
									>
										<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
											<path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
										</svg>
										Consolidated Session
									</span>
								{:else if filename?.startsWith('trace_')}
									<span
										class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800"
									>
										<svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
											<path
												d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"
											/>
										</svg>
										Individual Trace
									</span>
								{/if}
								<p
									class="text-sm text-gray-600 dark:text-gray-400 truncate"
									title={filename || 'Loading...'}
								>
									{filename || 'Loading...'}
								</p>
							</div>
						</div>
					</div>
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
				<!-- Enhanced File Properties Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700 transition-shadow hover:shadow-md"
					role="region"
					aria-labelledby="file-info-heading"
				>
					<div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-3">
							<div class="flex-shrink-0">
								<div
									class="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-sm"
								>
									<svg
										class="w-5 h-5 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
										/>
									</svg>
								</div>
							</div>
							<div>
								<h2
									class="text-lg font-semibold text-gray-900 dark:text-white"
									id="file-info-heading"
								>
									Workflow Properties
								</h2>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									Execution details and performance metrics
								</p>
							</div>
						</div>
					</div>
					<div class="px-6 py-6">
						<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
							<!-- File Details -->
							<div class="space-y-4">
								<h3
									class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
								>
									File Details
								</h3>
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Filename</span>
										<span
											class="text-sm font-mono text-gray-900 dark:text-white truncate max-w-32"
											title={logContent.filename}
										>
											{logContent.filename}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Size</span>
										<span class="text-sm font-medium text-gray-900 dark:text-white">
											{formatFileSize(logContent.size)}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Modified</span>
										<span class="text-sm font-medium text-gray-900 dark:text-white">
											{formatDate(logContent.modified)}
										</span>
									</div>
								</div>
							</div>

							<!-- Workflow Metrics -->
							<div class="space-y-4">
								<h3
									class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
								>
									Execution Metrics
								</h3>
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Log Entries</span>
										<span class="text-sm font-medium text-blue-600 dark:text-blue-400">
											{Array.isArray(logContent.content) ? logContent.content.length : 'N/A'}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Duration</span>
										<span class="text-sm font-medium text-green-600 dark:text-green-400">
											{calculateWorkflowDuration(logContent.content)}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Status</span>
										<span class="text-sm font-medium text-purple-600 dark:text-purple-400">
											{getWorkflowStatus(logContent.content)}
										</span>
									</div>
								</div>
							</div>

							<!-- Workflow Analysis -->
							<div class="space-y-4">
								<h3
									class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
								>
									Workflow Analysis
								</h3>
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">User Question</span>
										<span
											class="text-sm font-medium text-orange-600 dark:text-orange-400 max-w-32 truncate"
											title={extractUserQuestion(logContent.content)}
										>
											{extractUserQuestion(logContent.content)}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Chat History</span>
										<span class="text-sm font-medium text-indigo-600 dark:text-indigo-400">
											{extractChatHistory(logContent.content)}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Processing Steps</span>
										<span class="text-sm font-medium text-teal-600 dark:text-teal-400">
											{extractWorkflowSteps(logContent.content)}
										</span>
									</div>
								</div>
							</div>

							<!-- Results & Performance -->
							<div class="space-y-4">
								<h3
									class="text-sm font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wide"
								>
									Results & Performance
								</h3>
								<div class="space-y-3">
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Key Findings</span>
										<span class="text-sm font-medium text-emerald-600 dark:text-emerald-400">
											{extractKeyFindings(logContent.content)}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Processing Rate</span>
										<span class="text-sm font-medium text-amber-600 dark:text-amber-400">
											{calculateProcessingRate(logContent.content)}
										</span>
									</div>
									<div class="flex items-center justify-between">
										<span class="text-sm text-gray-600 dark:text-gray-400">Errors</span>
										<span class="text-sm font-medium text-red-600 dark:text-red-400">
											{countErrors(logContent.content)}
										</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>

				<!-- Enhanced Workflow Execution Viewer -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
						<div class="flex items-center justify-between">
							<div class="flex items-center gap-3">
								<div class="flex-shrink-0">
									<div
										class="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm"
									>
										<svg
											class="w-5 h-5 text-white"
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
								<div>
									<h2 class="text-lg font-semibold text-gray-900 dark:text-white">
										Workflow Execution Steps
									</h2>
									<p class="text-sm text-gray-500 dark:text-gray-400">
										Interactive timeline of workflow processing steps
									</p>
								</div>
							</div>
							<div class="flex items-center gap-3">
								{#if isValidJSON(logContent.content)}
									<div class="flex items-center gap-2">
										<button
											on:click={() => (viewMode = 'timeline')}
											class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {viewMode ===
											'timeline'
												? 'bg-emerald-100 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300'
												: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}"
										>
											Timeline
										</button>
										<button
											on:click={() => (viewMode = 'tree')}
											class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {viewMode ===
											'tree'
												? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
												: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}"
										>
											Tree View
										</button>
										<button
											on:click={() => (viewMode = 'raw')}
											class="px-3 py-1.5 text-xs font-medium rounded-md transition-colors {viewMode ===
											'raw'
												? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
												: 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'}"
										>
											Raw JSON
										</button>
									</div>
									<span
										class="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-200 rounded-full text-xs font-medium"
									>
										Structured Data
									</span>
								{:else}
									<span
										class="px-2 py-1 bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-200 rounded-full text-xs font-medium"
									>
										Plain Text
									</span>
								{/if}
							</div>
						</div>
					</div>
					<div class="px-6 py-6">
						{#if logContent.content}
							<div class="relative">
								{#if isValidJSON(logContent.content) && viewMode === 'timeline'}
									<!-- Workflow Timeline View -->
									<div
										class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
									>
										<div class="max-h-96 lg:max-h-[32rem] overflow-auto">
											<div class="p-4">
												{@html renderWorkflowTimeline(logContent.content)}
											</div>
										</div>
									</div>
								{:else if isValidJSON(logContent.content) && viewMode === 'tree'}
									<!-- Hierarchical JSON Tree View -->
									<div
										class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
									>
										<div class="max-h-96 lg:max-h-[32rem] overflow-auto">
											<div class="p-4">
												{@html renderJsonTree(logContent.content)}
											</div>
										</div>
									</div>
								{:else if isValidJSON(logContent.content) && viewMode === 'raw'}
									<!-- Raw JSON with syntax highlighting -->
									<div
										class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
									>
										<pre
											class="text-xs sm:text-sm p-4 overflow-auto max-h-96 lg:max-h-[32rem] text-gray-900 dark:text-white font-mono leading-relaxed"
											style="white-space: pre-wrap; word-wrap: break-word;"><code
												class="language-json">{formatContent(logContent.content)}</code
											></pre>
									</div>
								{:else}
									<!-- Plain text content -->
									<div
										class="bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
									>
										<pre
											class="text-xs sm:text-sm p-4 overflow-auto max-h-96 lg:max-h-[32rem] text-gray-900 dark:text-white font-mono leading-relaxed"
											style="white-space: pre-wrap; word-wrap: break-word;">{formatContent(
												logContent.content
											)}</pre>
									</div>
								{/if}

								<!-- Action buttons -->
								<div class="absolute top-3 right-3 flex gap-2">
									<button
										class="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 shadow-sm"
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
										<svg
											class="w-4 h-4 text-gray-600 dark:text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
											aria-hidden="true"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												stroke-width="2"
												d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
											/>
										</svg>
									</button>
								</div>
							</div>
						{:else}
							<div class="text-center py-12 text-gray-500 dark:text-gray-400" role="status">
								<svg
									class="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600"
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
								<p class="text-lg font-medium">No content available</p>
								<p class="text-sm">This log file appears to be empty or unreadable</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Enhanced Workflow Actions Card -->
				<div
					class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
				>
					<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
						<div class="flex items-center gap-3">
							<div class="flex-shrink-0">
								<div
									class="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-sm"
								>
									<svg
										class="w-4 h-4 text-white"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
										/>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
										/>
									</svg>
								</div>
							</div>
							<div>
								<h2 class="text-lg font-medium text-gray-900 dark:text-white">Workflow Actions</h2>
								<p class="text-sm text-gray-500 dark:text-gray-400">
									Manage and analyze workflow execution
								</p>
							</div>
						</div>
					</div>
					<div class="px-6 py-4">
						<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
							<div class="flex flex-wrap gap-3">
								<button
									on:click={() => fetchLogContent(true)}
									class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
									disabled={loading || isRetrying}
								>
									<svg
										class="w-4 h-4 {loading || isRetrying ? 'animate-spin' : ''}"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
										/>
									</svg>
									{loading || isRetrying ? 'Refreshing...' : 'Refresh Log'}
								</button>
								<button
									on:click={() => {
										// Export workflow summary
										const summary = generateWorkflowSummary(logContent.content);
										const blob = new Blob([JSON.stringify(summary, null, 2)], {
											type: 'application/json'
										});
										const url = URL.createObjectURL(blob);
										const a = document.createElement('a');
										a.href = url;
										a.download = `workflow-summary-${filename?.replace(/[^a-zA-Z0-9]/g, '-')}.json`;
										document.body.appendChild(a);
										a.click();
										document.body.removeChild(a);
										URL.revokeObjectURL(url);
										toast.success('Workflow summary exported');
									}}
									class="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 shadow-sm"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									Export Summary
								</button>
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
										toast.success('Raw JSON data exported');
									}}
									class="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-sm"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
									Download JSON
								</button>
								<button
									on:click={goBack}
									class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 shadow-sm"
								>
									<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M10 19l-7-7m0 0l7-7m-7 7h18"
										/>
									</svg>
									Back to Logs
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
