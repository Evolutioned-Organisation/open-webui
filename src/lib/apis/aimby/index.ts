import { WEBUI_API_BASE_URL } from '$lib/constants';

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
	batch_metadata?: Record<string, any>;
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
	additional_properties?: Record<string, any>;
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

export const getBatchesViaProxy = async (
	token: string = '',
	count: number = 10
): Promise<BatchListResponse | null> => {
	let error = null;

	try {
		// Use the proper WEBUI_API_BASE_URL constant to ensure correct backend URL
		const apiUrl = `${WEBUI_API_BASE_URL}/auths/admin/aimbience/proxy/api/v1/audit/batches?count=${count}`;

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
			let errorData;
			try {
				errorData = await res.json();
			} catch {
				errorData = { detail: res.statusText };
			}

			// Provide more specific error messages based on status code
			let errorMessage = errorData.detail || res.statusText;

			if (res.status === 401) {
				errorMessage = 'Authentication failed. Please check your API key and try again.';
			} else if (res.status === 403) {
				errorMessage = 'Access denied. You may not have permission to view this resource.';
			} else if (res.status === 404) {
				errorMessage = 'Resource not found. The requested endpoint may not exist.';
			} else if (res.status === 500) {
				errorMessage = 'Server error. Please try again later or contact support.';
			}

			error = errorMessage;
			console.error('API error:', res.status, errorMessage);

			// Throw error with more context for better handling in components
			throw new Error(`HTTP ${res.status}: ${errorMessage}`);
		}

		return await res.json();
	} catch (err) {
		console.error('Network error:', err);
		// Re-throw the error so components can handle it properly
		throw err;
	}
};

export const getFileAuditViaProxy = async (
	token: string = '',
	filename: string
): Promise<FileAuditResponse | null> => {
	let error = null;

	try {
		// Use the proper WEBUI_API_BASE_URL constant to ensure correct backend URL
		const apiUrl = `${WEBUI_API_BASE_URL}/auths/admin/aimbience/proxy/api/v1/audit/file/${filename}`;

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
			let errorData;
			try {
				errorData = await res.json();
			} catch {
				errorData = { detail: res.statusText };
			}

			// Provide more specific error messages based on status code
			let errorMessage = errorData.detail || res.statusText;

			if (res.status === 401) {
				errorMessage = 'Authentication failed. Please check your API key and try again.';
			} else if (res.status === 403) {
				errorMessage = 'Access denied. You may not have permission to view this resource.';
			} else if (res.status === 404) {
				errorMessage = 'File audit not found. The requested file may not exist.';
			} else if (res.status === 500) {
				errorMessage = 'Server error. Please try again later or contact support.';
			}

			error = errorMessage;
			console.error('API error:', res.status, errorMessage);

			// Throw error with more context for better handling in components
			throw new Error(`HTTP ${res.status}: ${errorMessage}`);
		}

		return await res.json();
	} catch (err) {
		console.error('Network error:', err);
		// Re-throw the error so components can handle it properly
		throw err;
	}
};

export const getBatchDetailsViaProxy = async (
	token: string = '',
	batchId: string
): Promise<BatchDetailsResponse | null> => {
	let error = null;

	try {
		// Use the proper WEBUI_API_BASE_URL constant to ensure correct backend URL
		const apiUrl = `${WEBUI_API_BASE_URL}/auths/admin/aimbience/proxy/api/v1/audit/batch/${batchId}`;

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
			let errorData;
			try {
				errorData = await res.json();
			} catch {
				errorData = { detail: res.statusText };
			}

			// Provide more specific error messages based on status code
			let errorMessage = errorData.detail || res.statusText;

			if (res.status === 401) {
				errorMessage = 'Authentication failed. Please check your API key and try again.';
			} else if (res.status === 403) {
				errorMessage = 'Access denied. You may not have permission to view this resource.';
			} else if (res.status === 404) {
				errorMessage = 'Batch not found. The requested batch may not exist.';
			} else if (res.status === 500) {
				errorMessage = 'Server error. Please try again later or contact support.';
			}

			error = errorMessage;
			console.error('API error:', res.status, errorMessage);

			// Throw error with more context for better handling in components
			throw new Error(`HTTP ${res.status}: ${errorMessage}`);
		}

		return await res.json();
	} catch (err) {
		console.error('Network error:', err);
		// Re-throw the error so components can handle it properly
		throw err;
	}
};
