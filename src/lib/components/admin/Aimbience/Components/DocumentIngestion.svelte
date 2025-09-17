<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import dayjs from 'dayjs';
	import relativeTime from 'dayjs/plugin/relativeTime';
	dayjs.extend(relativeTime);

	import { getBatchesViaProxy, type BatchListItem } from '$lib/apis/aimby';
	import { getAimbienceConfig } from '$lib/apis/auths'; // Updated import
	import Tooltip from '$lib/components/common/Tooltip.svelte';
	import Download from '$lib/components/icons/Download.svelte';
	import Badge from '$lib/components/common/Badge.svelte';
	import CloudArrowUp from '$lib/components/icons/CloudArrowUp.svelte';
	import Pagination from '$lib/components/common/Pagination.svelte';
	import ChevronUp from '$lib/components/icons/ChevronUp.svelte';
	import ChevronDown from '$lib/components/icons/ChevronDown.svelte';
	import Spinner from '$lib/components/common/Spinner.svelte';
	import BatchDetailsModal from './BatchDetailsModal.svelte';

	const i18n = getContext('i18n');

	let aimbienceConfig: any | null = null;
	let batches: BatchListItem[] = [];
	let totalCount = 0;
	let loading = false;
	let page = 1;
	let count = 10;
	let orderBy: string = 'creation_date';
	let direction: 'asc' | 'desc' = 'desc';

	// Search functionality
	let searchQuery = '';
	let filteredBatches: BatchListItem[] = [];

	// Modal state
	let showBatchModal = false;
	let selectedBatchForModal: BatchListItem | null = null;

	// Reset pagination when search changes
	$: if (searchQuery !== '') {
		page = 1;
	}

	// Filter batches based on search query
	$: filteredBatches = batches.filter((batch) => {
		if (!searchQuery.trim()) return true;
		const query = searchQuery.toLowerCase();
		return (
			batch.batch_id?.toLowerCase().includes(query) ||
			batch.status?.toLowerCase().includes(query) ||
			batch.source?.toLowerCase().includes(query) ||
			(batch.file_count?.toString() || '').includes(query)
		);
	});

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

	$: sortedBatches = [...filteredBatches].sort((a, b) => {
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

	const openBatchModal = (batch: BatchListItem) => {
		selectedBatchForModal = batch;
		showBatchModal = true;
	};

	const exportToCSV = () => {
		if (batches.length === 0) {
			toast.error('No batches to export');
			return;
		}

		const headers = ['Batch ID', 'Creation Date', 'Status', 'File Count', 'Source', 'Actions'];
		const csvContent = [
			headers.join(','),
			...batches.map((batch) =>
				[
					batch.batch_id,
					batch.creation_date || '',
					batch.status || '',
					batch.file_count || 0,
					batch.source || '',
					'View Details'
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
				console.log('DocumentIngestion: No AImbience config found in backend');
			}
		} catch (error) {
			console.error('Error loading Aimbience config:', error);
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			toast.error('Failed to load Aimbience config: ' + errorMessage);
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
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Ingestion Management</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Monitor and manage data ingestion batches from the AIMBY pipeline
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
					<Download className="size-4" />
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
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{filteredBatches.length}</div>
				{#if searchQuery && filteredBatches.length !== batches.length}
					<div class="text-xs text-gray-500 dark:text-gray-400 mt-1">
						Filtered from {batches.length}
					</div>
				{/if}
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

		<!-- Search Section -->
		<div
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
		>
			<div class="px-6 py-4">
				<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
					<div class="flex-1 max-w-md">
						<label for="batch-search" class="sr-only">Search batches</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg
									class="h-5 w-5 text-gray-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									></path>
								</svg>
							</div>
							<input
								id="batch-search"
								type="text"
								bind:value={searchQuery}
								class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Search batches by ID, status, source, or file count..."
								on:keydown={(e) => {
									if (e.key === 'Escape') {
										searchQuery = '';
										e.target.blur();
									}
								}}
							/>
							{#if searchQuery}
								<button
									on:click={() => (searchQuery = '')}
									class="absolute inset-y-0 right-0 pr-3 flex items-center"
									aria-label="Clear search"
								>
									<svg
										class="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M6 18L18 6M6 6l12 12"
										></path>
									</svg>
								</button>
							{/if}
						</div>
					</div>
					<div class="flex items-center gap-4">
						<!-- Count Selector -->
						<div class="flex items-center gap-2">
							<label for="count-selector" class="text-sm text-gray-600 dark:text-gray-400"
								>Show:</label
							>
							<select
								id="count-selector"
								bind:value={count}
								class="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
								on:change={() => (page = 1)}
							>
								<option value={5}>5</option>
								<option value={10}>10</option>
								<option value={25}>25</option>
								<option value={50}>50</option>
								<option value={100}>100</option>
							</select>
						</div>

						<!-- Results Info -->
						<div class="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
							<span>Showing {filteredBatches.length} of {totalCount} batches</span>
							{#if searchQuery}
								<span
									class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
								>
									Filtered
								</span>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Table Section -->
		<div
			class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700"
		>
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">Batch History</h3>
					<div class="text-sm text-gray-500 dark:text-gray-400"></div>
				</div>
			</div>

			<div class="relative overflow-x-auto">
				{#if loading}
					<div
						class="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10"
					>
						<Spinner className="size-8" />
					</div>
				{/if}

				{#if filteredBatches.length === 0 && !loading}
					<div class="text-center py-12">
						<div class="text-gray-500 dark:text-gray-400 text-sm">
							{#if searchQuery}
								No batches found matching "{searchQuery}"
								<button
									on:click={() => (searchQuery = '')}
									class="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
								>
									Clear search
								</button>
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
								<th
									scope="col"
									class="px-6 py-3 text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-400"
								>
									Actions
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
									<td class="px-6 py-4 text-gray-900 dark:text-white">
										<div class="flex gap-2">
											<button
												on:click={() => openBatchModal(batch)}
												class="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800/30 rounded transition-colors"
												title="View in popup modal"
											>
												Quick View
											</button>
											<a
												href={`/admin/aimbience/batch-details?id=${encodeURIComponent(batch.batch_id)}`}
												class="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800/30 rounded transition-colors"
												title="Open full details page"
											>
												View Details
											</a>
										</div>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				{/if}
			</div>

			<!-- Pagination -->
			<div class="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
				<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
					<!-- Pagination Info -->
					<div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
						<span>
							Showing {Math.min((page - 1) * count + 1, filteredBatches.length)} to {Math.min(
								page * count,
								filteredBatches.length
							)} of {filteredBatches.length} results
						</span>
						{#if searchQuery}
							<span
								class="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 rounded-full text-xs"
							>
								Filtered
							</span>
						{/if}
					</div>

					<!-- Pagination Controls -->
					{#if filteredBatches.length > count}
						<Pagination bind:page count={filteredBatches.length} perPage={count} />
					{/if}
				</div>
			</div>
		</div>
	{/if}

	<!-- Batch Details Modal -->
	<BatchDetailsModal
		bind:show={showBatchModal}
		batchDetails={selectedBatchForModal ? { ...selectedBatchForModal } : null}
	/>
</div>
