import {
	validateFilename,
	sanitizeUrlParameter,
	validateNumericParameter
} from '$lib/utils/validation';
import {
	enhancedFetch,
	createErrorContext,
	withRetry,
	DEFAULT_RETRY_CONFIG
} from '$lib/utils/errorHandling';

// Base URL for all AIMBY-API proxy requests
const AIMBY_PROXY_BASE = '/api/v1/auths/admin/aimbience/proxy';

export interface BatchListItem {
	batch_id: string;
	creation_date: string;
	status?: string;
	file_count?: number;
	source?: string;
}

export interface BatchDetailsResponse {
	batch_id: string;
	message: string;
	timestamp: string;
	status: string;
	file_count?: number;
	processing_status?: string;
	batch_metadata?: Record<string, unknown>;
	creation_date?: string;
	source?: string;
	status_details?: string;
	error_message?: string;
	processing_start_time?: string;
	processing_end_time?: string;
	total_files?: number;
	processed_files?: number;
	failed_files?: number;
	successful_files?: number;
	additional_properties?: Record<string, unknown>;
}

export interface BatchListResponse {
	batches: BatchListItem[];
	total_count: number;
}

export interface FileAuditResponse {
	filename: string;
	message: string;
	timestamp: string;
	status: string;
}

export interface LogFileInfo {
	filename: string;
	size: number;
	modified: number;
	path: string;
	timestamp?: string;
}

export interface LogListResponse {
	logs: LogFileInfo[];
}

export interface LogContentResponse {
	filename: string;
	size: number;
	modified: number;
	content: string[] | Record<string, unknown>; // JSON object or string array
	timestamp?: string;
}

export const getBatchesViaProxy = async (
	token: string = '',
	count: number = 10
): Promise<BatchListResponse | null> => {
	let error = null;

	try {
		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `${AIMBY_PROXY_BASE}/api/v1/audit/batches?count=${count}`;

		console.log('Fetching batches from:', apiUrl);

		const res = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({ detail: res.statusText }));
			error = errorData.detail || res.statusText;
			console.error('API error:', res.status, error);
			return null;
		}

		return await res.json();
	} catch (err) {
		console.error('Network error:', err);
		error = (err as Error).message || 'Unknown error';
		return null;
	}
};

export const getFileAuditViaProxy = async (
	token: string = '',
	filename: string
): Promise<FileAuditResponse | null> => {
	let error = null;

	try {
		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `${AIMBY_PROXY_BASE}/api/v1/audit/file/${filename}`;

		console.log('Fetching file audit from:', apiUrl);

		const res = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({ detail: res.statusText }));
			error = errorData.detail || res.statusText;
			console.error('API error:', res.status, error);
			return null;
		}

		return await res.json();
	} catch (err) {
		console.error('Network error:', err);
		error = (err as Error).message || 'Unknown error';
		return null;
	}
};

export const getBatchDetailsViaProxy = async (
	token: string = '',
	batchId: string
): Promise<BatchDetailsResponse | null> => {
	let error = null;

	try {
		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `${AIMBY_PROXY_BASE}/api/v1/audit/batch/${batchId}`;

		console.log('Fetching batch details from:', apiUrl);

		const res = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({ detail: res.statusText }));
			error = errorData.detail || res.statusText;
			console.error('API error:', res.status, error);
			return null;
		}

		return await res.json();
	} catch (err) {
		console.error('Network error:', err);
		error = (err as Error).message || 'Unknown error';
		return null;
	}
};

/**
 * Retrieves log files list from AIMBY-API via Open-WebUI proxy
 *
 * This function fetches a list of available log files from the AIMBY-API service
 * through the Open-WebUI backend proxy to avoid CORS issues. It includes
 * comprehensive input validation, error handling, and retry mechanisms.
 *
 * @param token - Authentication token for API access
 * @param limit - Maximum number of log files to retrieve (1-1000, default: 10)
 * @returns Promise<LogFileInfo[] | null> - Array of log file information or null on error
 * @throws Error when token is invalid or limit is out of range
 *
 * @example
 * ```typescript
 * const logs = await getLogsViaProxy(userToken, 25);
 * if (logs) {
 *   console.log(`Retrieved ${logs.length} log files`);
 * }
 * ```
 */
export const getLogsViaProxy = async (
	token: string = '',
	limit: number = 10
): Promise<LogFileInfo[] | null> => {
	const context = createErrorContext('getLogsViaProxy', 'aimby-api');

	try {
		// Validate input parameters
		if (!token || typeof token !== 'string') {
			throw new Error('Invalid token provided');
		}

		// Validate limit parameter
		const validatedLimit = validateNumericParameter(limit, 1, 1000);
		if (validatedLimit === null) {
			throw new Error(`Invalid limit parameter: ${limit}`);
		}

		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `${AIMBY_PROXY_BASE}/api/v1/logs?limit=${validatedLimit}`;

		console.log('Fetching logs from:', apiUrl);

		const operation = async () => {
			const res = await enhancedFetch(
				apiUrl,
				{
					method: 'GET',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				},
				context
			);

			// Check if response is ok
			if (!res.ok) {
				const errorText = await res.text();
				console.error('API Error Response:', {
					status: res.status,
					statusText: res.statusText,
					body: errorText
				});

				if (res.status === 404) {
					throw new Error(
						'Logs endpoint not found - please ensure your AIMBY-API supports /api/v1/logs'
					);
				} else if (res.status === 500) {
					throw new Error('AIMBY-API server error - please check your AIMBY-API logs');
				} else {
					throw new Error(`API request failed: ${res.status} ${res.statusText}`);
				}
			}

			const data = await res.json();
			console.log('Logs API Response:', data);

			// Validate response data
			if (!Array.isArray(data)) {
				throw new Error('Invalid response format: expected array');
			}

			// Validate each log file info object
			const validatedData = data.filter((item: unknown) => {
				const logItem = item as Record<string, unknown>;
				return (
					logItem &&
					typeof logItem.filename === 'string' &&
					validateFilename(logItem.filename) &&
					typeof logItem.size === 'number' &&
					typeof logItem.modified === 'number'
				);
			}) as LogFileInfo[];

			return validatedData;
		};

		return await withRetry(operation, context, DEFAULT_RETRY_CONFIG);
	} catch (err) {
		console.error('Error in getLogsViaProxy:', err);
		return null;
	}
};

/**
 * Retrieves specific log file content from AIMBY-API via Open-WebUI proxy
 *
 * This function fetches the content of a specific log file from the AIMBY-API
 * service through the Open-WebUI backend proxy. It includes comprehensive
 * filename validation to prevent path traversal attacks, content sanitization,
 * and structured error handling with retry mechanisms.
 *
 * @param token - Authentication token for API access
 * @param filename - Name of the log file to retrieve (must pass validation)
 * @returns Promise<LogContentResponse | null> - Log file content and metadata or null on error
 * @throws Error when token is invalid or filename fails validation
 *
 * @example
 * ```typescript
 * const logContent = await getLogContentViaProxy(userToken, 'app.log');
 * if (logContent) {
 *   console.log(`Log file size: ${logContent.size} bytes`);
 *   console.log('Content:', logContent.content);
 * }
 * ```
 */
export const getLogContentViaProxy = async (
	token: string = '',
	filename: string
): Promise<LogContentResponse | null> => {
	const context = createErrorContext('getLogContentViaProxy', 'aimby-api');

	try {
		// Validate input parameters
		if (!token || typeof token !== 'string') {
			throw new Error('Invalid token provided');
		}

		// Comprehensive filename validation
		if (!validateFilename(filename)) {
			throw new Error(`Invalid filename: ${filename}`);
		}

		// Sanitize filename for URL encoding
		const sanitizedFilename = sanitizeUrlParameter(filename);
		if (!sanitizedFilename || sanitizedFilename !== filename) {
			throw new Error(`Filename failed sanitization: ${filename}`);
		}

		// Use the /info endpoint to get file info with content preview
		const infoUrl = `${AIMBY_PROXY_BASE}/api/v1/logs/${encodeURIComponent(sanitizedFilename)}/info`;

		console.log('Fetching log content from:', infoUrl);

		const operation = async () => {
			const infoRes = await enhancedFetch(
				infoUrl,
				{
					method: 'GET',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				},
				context
			);

			const fileInfo = (await infoRes.json()) as Record<string, unknown>;

			// Validate response structure
			if (!fileInfo || typeof fileInfo !== 'object') {
				throw new Error('Invalid response format');
			}

			// Validate filename in response matches request
			if (fileInfo.filename !== sanitizedFilename) {
				throw new Error('Response filename mismatch');
			}

			// Return the file info with content_preview as content
			return {
				filename: fileInfo.filename as string,
				size: typeof fileInfo.size === 'number' ? fileInfo.size : 0,
				modified: typeof fileInfo.modified === 'number' ? fileInfo.modified : 0,
				content: (fileInfo.content_preview as string[] | Record<string, unknown>) || [],
				timestamp: fileInfo.timestamp as string
			};
		};

		return await withRetry(operation, context, DEFAULT_RETRY_CONFIG);
	} catch (err) {
		console.error('Error in getLogContentViaProxy:', err);
		return null;
	}
};
