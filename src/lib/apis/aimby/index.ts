export interface BatchListItem {
	batch_id: string;
	creation_date: string;
	status?: string;
	file_count?: number;
	source?: string;
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
		const apiUrl = `/api/v1/auths/admin/aimbience/proxy/audit/file/${filename}`;

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
): Promise<any | null> => {
	let error = null;

	try {
		// Use relative path - Vite will proxy this to the backend
		const apiUrl = `/api/v1/auths/admin/aimbience/proxy/audit/batch/${batchId}`;

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
