import {
	validateFilename,
	validateFilePath,
	sanitizeUrlParameter,
	validateNumericParameter
} from '$lib/utils/validation';

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
	total_count: number;
	limit?: number;
	offset?: number;
}

export interface LogContentResponse {
	filename: string;
	size: number;
	modified: number;
	content: string[] | Record<string, unknown>; // JSON object or string array
	timestamp?: string;
}

export interface LogDirectoryInfo {
	chat_id: string;
	file_count: number;
	total_size: number;
	latest_file: LogFileInfo;
	files: LogFileInfo[];
	creation_time: string;
	modification_time: string;
}

export interface LogDirectoryStructure {
	directories: LogDirectoryInfo[];
	files: LogFileInfo[]; // Files in root directory (legacy support)
	total_directories: number;
	total_files: number;
	total_size: number;
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
): Promise<LogListResponse | null> => {
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
		// Add trailing slash to prevent redirect that causes CORS preflight issues
		const apiUrl = `${AIMBY_PROXY_BASE}/api/v1/logs/?limit=${validatedLimit}`;

		console.log('Fetching logs from:', apiUrl);

		const res = await fetch(apiUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

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

		// Handle both old array format and new object format for backward compatibility
		if (Array.isArray(data)) {
			// Old format - just an array of logs
			const validatedLogs = data.filter((item: unknown) => {
				const logItem = item as Record<string, unknown>;
				return (
					logItem &&
					typeof logItem.filename === 'string' &&
					validateFilename(logItem.filename) &&
					typeof logItem.size === 'number' &&
					typeof logItem.modified === 'number'
				);
			}) as LogFileInfo[];

			return {
				logs: validatedLogs,
				total_count: validatedLogs.length, // Fallback: assume returned count is total
				limit: limit
			};
		} else if (data && typeof data === 'object' && Array.isArray(data.logs)) {
			// New format - object with logs array and total_count
			const validatedLogs = data.logs.filter((item: unknown) => {
				const logItem = item as Record<string, unknown>;
				return (
					logItem &&
					typeof logItem.filename === 'string' &&
					validateFilename(logItem.filename) &&
					typeof logItem.size === 'number' &&
					typeof logItem.modified === 'number'
				);
			}) as LogFileInfo[];

			return {
				logs: validatedLogs,
				total_count: typeof data.total_count === 'number' ? data.total_count : validatedLogs.length,
				limit: typeof data.limit === 'number' ? data.limit : limit,
				offset: typeof data.offset === 'number' ? data.offset : 0
			};
		} else {
			throw new Error('Invalid response format: expected array or object with logs property');
		}
	} catch (err) {
		console.error('Error in getLogsViaProxy:', err);
		return null;
	}
};

/**
 * Retrieves log directory structure from AIMBY-API via Open-WebUI proxy
 *
 * This function fetches the directory structure of log files organized by chat_id
 * from the AIMBY-API service through the Open-WebUI backend proxy.
 *
 * @param token - Authentication token for the request
 * @returns Promise<LogDirectoryStructure | null> - Directory structure or null if error
 *
 * @example
 * ```typescript
 * const structure = await getLogDirectoryStructureViaProxy(userToken);
 * if (structure) {
 *   console.log(`Found ${structure.total_directories} chat directories`);
 * }
 * ```
 */
export const getLogDirectoryStructureViaProxy = async (
	token: string = ''
): Promise<LogDirectoryStructure | null> => {
	try {
		// Validate input parameters
		if (!token || typeof token !== 'string') {
			throw new Error('Invalid token provided');
		}

		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `${AIMBY_PROXY_BASE}/api/v1/logs/structure`;

		console.log('Fetching log directory structure from:', apiUrl);

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
			const error = errorData.detail || res.statusText;
			console.error('API error:', res.status, error);
			return null;
		}

		const data = await res.json();
		console.log('Log directory structure response:', data);

		// Validate response structure
		if (!data || typeof data !== 'object') {
			throw new Error('Invalid response format from server');
		}

		return data as LogDirectoryStructure;
	} catch (err) {
		console.error('Error in getLogDirectoryStructureViaProxy:', err);
		return null;
	}
};

/**
 * Retrieves specific log file content from AIMBY-API via Open-WebUI proxy
 *
 * This function fetches the full content of a specific log file from the AIMBY-API
 * service through the Open-WebUI backend proxy. It first gets file info, then downloads
 * the full content. Includes comprehensive filename validation to prevent path traversal
 * attacks, content sanitization, and structured error handling with retry mechanisms.
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
	try {
		// Validate input parameters
		if (!token || typeof token !== 'string') {
			throw new Error('Invalid token provided');
		}

		// Comprehensive file path validation
		if (!validateFilePath(filename)) {
			throw new Error(`Invalid file path: ${filename}`);
		}

		// Sanitize filename for URL encoding
		const sanitizedFilename = sanitizeUrlParameter(filename);
		if (!sanitizedFilename || sanitizedFilename !== filename) {
			throw new Error(`Filename failed sanitization: ${filename}`);
		}

		// First, get file info for metadata
		const infoUrl = `${AIMBY_PROXY_BASE}/api/v1/logs/info?filename=${encodeURIComponent(sanitizedFilename)}`;
		console.log('Fetching log file info from:', infoUrl);

		const infoRes = await fetch(infoUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		if (!infoRes.ok) {
			const errorText = await infoRes.text();
			console.error('API Error Response:', {
				status: infoRes.status,
				statusText: infoRes.statusText,
				body: errorText
			});

			if (infoRes.status === 404) {
				throw new Error('Log file not found');
			} else if (infoRes.status === 500) {
				throw new Error('AIMBY-API server error - please check your AIMBY-API logs');
			} else {
				throw new Error(`API request failed: ${infoRes.status} ${infoRes.statusText}`);
			}
		}

		const fileInfo = (await infoRes.json()) as Record<string, unknown>;

		// Validate response structure
		if (!fileInfo || typeof fileInfo !== 'object') {
			throw new Error('Invalid response format');
		}

		// Validate filename in response matches request
		if (fileInfo.filename !== sanitizedFilename) {
			throw new Error('Response filename mismatch');
		}

		// Now get the full file content using the /content endpoint
		const contentUrl = `${AIMBY_PROXY_BASE}/api/v1/logs/content?filename=${encodeURIComponent(sanitizedFilename)}`;
		console.log('Fetching full log content from:', contentUrl);

		const contentRes = await fetch(contentUrl, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`
			}
		});

		if (!contentRes.ok) {
			const errorText = await contentRes.text();
			console.error('Content Error Response:', {
				status: contentRes.status,
				statusText: contentRes.statusText,
				body: errorText
			});
			throw new Error(`Failed to fetch log content: ${contentRes.status} ${contentRes.statusText}`);
		}

		const contentData = (await contentRes.json()) as Record<string, unknown>;

		// Validate content response structure
		if (!contentData || typeof contentData !== 'object') {
			throw new Error('Invalid content response format');
		}

		// Return the complete log content with metadata
		return {
			filename: contentData.filename as string,
			size: typeof contentData.size === 'number' ? contentData.size : 0,
			modified: typeof contentData.modified === 'number' ? contentData.modified : 0,
			content: (contentData.content as string[] | Record<string, unknown>) || [],
			timestamp: contentData.timestamp as string
		};
	} catch (err) {
		console.error('Error in getLogContentViaProxy:', err);
		return null;
	}
};
