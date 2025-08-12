import { AIMBY_API_BASE_URL } from '$lib/constants';

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

export const getBatches = async (
	token: string = '',
	count: number = 10,
	aimbyApiUrl?: string,
	aimbyApiKey?: string
): Promise<BatchListResponse | null> => {
	const baseUrl = aimbyApiUrl || AIMBY_API_BASE_URL;
	let error = null;

	try {
		const res = await fetch(`${baseUrl}/audit/batches?count=${count}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
				...(aimbyApiKey && { 'X-Aimbience-API-Key': aimbyApiKey })
			}
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({ detail: res.statusText }));
			error = errorData.detail || res.statusText;
			return null;
		}

		return await res.json();
	} catch (err) {
		console.error(err);
		error = err.detail;
		return null;
	}
};

export const getBatchesViaProxy = async (
	token: string = '',
	count: number = 10
): Promise<BatchListResponse | null> => {
	let error = null;

	try {
		const res = await fetch(`/api/v1/auths/admin/aimbience/proxy/audit/batches?count=${count}`, {
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
			return null;
		}

		return await res.json();
	} catch (err) {
		console.error(err);
		error = err.detail;
		return null;
	}
};

export const getBatchDetails = async (
	token: string = '',
	batchId: string,
	aimbyApiUrl?: string,
	aimbyApiKey?: string
): Promise<any | null> => {
	const baseUrl = aimbyApiUrl || AIMBY_API_BASE_URL;
	let error = null;

	try {
		const res = await fetch(`${baseUrl}/audit/batch/${batchId}`, {
			method: 'GET',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
				...(token && { Authorization: `Bearer ${token}` }),
				...(aimbyApiKey && { 'X-Aimbience-API-Key': aimbyApiKey })
			}
		});

		if (!res.ok) {
			const errorData = await res.json().catch(() => ({ detail: res.statusText }));
			error = errorData.detail || res.statusText;
			return null;
		}

		return await res.json();
	} catch (err) {
		console.error(err);
		error = err.detail;
		return null;
	}
};
