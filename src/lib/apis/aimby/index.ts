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
		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `/api/v1/auths/admin/aimbience/proxy/api/v1/audit/batches?count=${count}`;

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
		error = err.detail || err.message;
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
		const apiUrl = `/api/v1/auths/admin/aimbience/proxy/api/v1/audit/file/${filename}`;

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
		error = err.detail || err.message;
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
		const apiUrl = `/api/v1/auths/admin/aimbience/proxy/api/v1/audit/batch/${batchId}`;

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
		error = err.detail || err.message;
		return null;
	}
};
