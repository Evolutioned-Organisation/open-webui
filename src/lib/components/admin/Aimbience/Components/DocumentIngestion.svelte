<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import { getBatchesViaProxy, getBatchDetailsViaProxy, type BatchListItem } from '$lib/apis/aimby';
	import { getAimbienceConfig } from '$lib/apis/auths'; // Updated import
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import ArrowDownTray from '$lib/components/icons/ArrowDownTray.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import CloudArrowUp from '$lib/components/icons/CloudArrowUp.svelte';
	import Pagination from '$lib/components/common/Pagination.svelte';
	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';

	const i18n = getContext('i18n');

	let aimbienceConfig: any | null = null;
	let batches: BatchListItem[] = [];
	let totalCount = 0;
	let loading = false;
	let page = 1;
	let count = 10;
	let orderBy: string = 'creation_date';
	let direction: 'asc' | 'desc' = 'desc';

	$: paginatedBatches = sortedBatches.slice((page - 1) * count, page * count);

	// Update count when config changes
	$: if (aimbienceConfig?.AIMBENCE_BATCH_SIZE) {
		count = aimbienceConfig.AIMBENCE_BATCH_SIZE;
	}

	function setSortKey(key: string) {
		if (orderBy === key) {
			direction = direction === 'asc' ? 'desc' : 'asc';
		} else {
			orderBy = key;
			if (key === 'batch_id' || key === 'source') {
				direction = 'asc';
			} else {
				direction = 'desc';
			}
		}
		page = 1;
	}

	$: sortedBatches = [...batches].sort((a, b) => {
		let aVal: any = a[orderBy as keyof BatchListItem];
		let bVal: any = b[orderBy as keyof BatchListItem];

		// Handle date sorting
		if (orderBy === 'creation_date') {
			aVal = aVal ? new Date(aVal).getTime() : 0;
			bVal = bVal ? new Date(bVal).getTime() : 0;
		}

		// Handle numeric sorting
		if (orderBy === 'file_count') {
			aVal = aVal || 0;
			bVal = bVal || 0;
		}

		// Handle string sorting
		if (typeof aVal === 'string') {
			aVal = aVal.toLowerCase();
			bVal = bVal.toLowerCase();
		}

		if (direction === 'asc') {
			return aVal > bVal ? 1 : -1;
		} else {
			return aVal < bVal ? 1 : -1;
		}
	});

	const fetchBatches = async () => {
		loading = true;
		try {
			// Use proxy function to avoid CORS issues
			const response = await getBatchesViaProxy(localStorage.token || '', count);
			if (response) {
				batches = response.batches;
				totalCount = response.total_count;
				toast.success(`Retrieved ${batches.length} batches`);
			}
		} catch (error) {
			console.error('Error fetching batches:', error);
			toast.error('Failed to fetch batches');
		} finally {
			loading = false;
		}
	};

	const refreshBatches = () => {
		fetchBatches();
	};

	const exportToCSV = () => {
		if (batches.length === 0) {
			toast.error('No batches to export');
			return;
		}

		const headers = ['Batch ID', 'Creation Date', 'Status', 'File Count', 'Source'];
		const csvContent = [
			headers.join(','),
			...batches.map((batch) =>
				[
					batch.batch_id,
					batch.creation_date || '',
					batch.status || '',
					batch.file_count || 0,
					batch.source || ''
				].join(',')
			)
		].join('\n');

		const blob = new Blob([csvContent], { type: 'text/csv' });
		const url = window.URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `batches-${new Date().toISOString().split('T')[0]}.csv`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		window.URL.revokeObjectURL(url);
		toast.success('Batches exported to CSV');
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return 'N/A';
		try {
			return dayjs(dateString).format('LLL');
		} catch {
			return 'Invalid Date';
		}
	};

	const getStatusType = (status?: string) => {
		if (!status) return 'muted';
		switch (status.toLowerCase()) {
			case 'completed':
			case 'success':
				return 'success';
			case 'processing':
			case 'pending':
				return 'warning';
			case 'failed':
			case 'error':
				return 'error';
			default:
				return 'muted';
		}
	};

	onMount(async () => {
		// Load Aimbience config from dedicated endpoint
		try {
			const config = await getAimbienceConfig(localStorage.token);
			if (config) {
				aimbienceConfig = config;
				console.log('DocumentIngestion: Loaded config from backend:', aimbienceConfig);
			} else {
				console.log('DocumentIngestion: No Aimbience config found in backend');
			}
		} catch (error) {
			console.error('Error loading Aimbience config:', error);
			toast.error($i18n.t('Failed to load Aimbience config: ') + error.message);
		}
		fetchBatches();
	});
</script>

<div class="space-y-6">
	{#if !aimbienceConfig?.ENABLE_AIMBENCE}
		<div class="text-center py-12">
			<div class="text-gray-500 dark:text-gray-400 text-sm">
				Aimbience integration is not enabled. Please enable it in the Aimbience Config tab.
			</div>
		</div>
	{:else}
		<!-- Header Section -->
		<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
			<div>
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Document Ingestion</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Monitor and manage document ingestion batches from the AIMBY pipeline
				</p>
			</div>
			<div class="flex gap-2">
				<button
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					on:click={refreshBatches}
					disabled={loading}
				>
					<CloudArrowUp className="size-4" />
					Refresh
				</button>
				<button
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					on:click={exportToCSV}
					disabled={batches.length === 0}
				>
					<ArrowDownTray className="size-4" />
					Export CSV
				</button>
			</div>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
			>
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Batches</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{totalCount}</div>
			</div>
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
			>
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Displayed</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{batches.length}</div>
			</div>
			<div
				class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
			>
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">API URL</div>
				<div class="text-sm font-mono text-gray-600 dark:text-gray-400 truncate">
					{aimbienceConfig?.AIMBENCE_API_BASE_URL || 'N/A'}
				</div>
			</div>
		</div>

		<!-- Table Section -->
		<div
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
		>
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-medium text-gray-900 dark:text-white">Batch History</h3>
			</div>

			<div class="relative overflow-x-auto">
				{#if loading}
					<div
						class="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10"
					>
						<Spinner className="size-8" />
					</div>
				{/if}

				{#if batches.length === 0 && !loading}
					<div class="text-center py-12">
						<div class="text-gray-500 dark:text-gray-400 text-sm">
							{#if loading}
								Loading batches...
							{:else}
								No batches found
							{/if}
						</div>
					</div>
				{:else}
					<table class="w-full text-sm text-left text-gray-500 dark:text-gray-400">
						<thead
							class="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
						>
							<tr>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none"
									on:click={() => setSortKey('batch_id')}
								>
									<div class="flex gap-1.5 items-center">
										Batch ID
										{#if orderBy === 'batch_id'}
											<span class="font-normal">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none"
									on:click={() => setSortKey('creation_date')}
								>
									<div class="flex gap-1.5 items-center">
										Creation Date
										{#if orderBy === 'creation_date'}
											<span class="font-normal">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none"
									on:click={() => setSortKey('status')}
								>
									<div class="flex gap-1.5 items-center">
										Status
										{#if orderBy === 'status'}
											<span class="font-normal">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none"
									on:click={() => setSortKey('file_count')}
								>
									<div class="flex gap-1.5 items-center">
										File Count
										{#if orderBy === 'file_count'}
											<span class="font-normal">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
								<th
									scope="col"
									class="px-6 py-3 cursor-pointer select-none"
									on:click={() => setSortKey('source')}
								>
									<div class="flex gap-1.5 items-center">
										Source
										{#if orderBy === 'source'}
											<span class="font-normal">
												{#if direction === 'asc'}
													<ChevronUp className="size-3" />
												{:else}
													<ChevronDown className="size-3" />
												{/if}
											</span>
										{:else}
											<span class="invisible">
												<ChevronUp className="size-3" />
											</span>
										{/if}
									</div>
								</th>
							</tr>
						</thead>
						<tbody>
							{#each paginatedBatches as batch (batch.batch_id)}
								<tr
									class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
								>
									<td class="px-6 py-4 font-mono text-xs text-gray-900 dark:text-white">
										<div class="truncate max-w-32" title={batch.batch_id}>
											{batch.batch_id}
										</div>
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white">
										{formatDate(batch.creation_date)}
									</td>
									<td class="px-6 py-4">
										<Badge type={getStatusType(batch.status)} content={batch.status || 'Unknown'} />
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white">
										{batch.file_count || 0}
									</td>
									<td class="px-6 py-4 text-gray-900 dark:text-white">
										<div class="truncate max-w-32" title={batch.source || 'N/A'}>
											{batch.source || 'N/A'}
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Pagination -->
			{#if totalCount > count}
				<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
					<Pagination bind:page count={totalCount} perPage={count} />
				</div>
			{/if}
		</div>
	{/if}
</div>
