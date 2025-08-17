<script lang="ts">
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		getBatchesViaProxy,
		getBatchDetailsViaProxy,
		getFileAuditViaProxy
	} from '$lib/apis/aimby';
	import type { BatchListItem, BatchListResponse, FileAuditResponse } from '$lib/apis/aimby';

	let batches: BatchListItem[] = [];
	let totalCount = 0;
	let loading = false;
	let selectedCount = 10;
	let selectedBatch: BatchListItem | null = null;
	let batchDetails: any = null;
	let loadingDetails = false;

	// File audit variables
	let filename = '';
	let fileAuditResult: FileAuditResponse | null = null;
	let loadingFileAudit = false;

	const countOptions = [5, 10, 25, 50, 100];

	async function fetchBatches() {
		loading = true;
		try {
			// Check if we have a token
			if (!localStorage.token) {
				toast.error('Authentication required. Please log in again.');
				return;
			}

			const token = localStorage.token;
			const response = await getBatchesViaProxy(token, selectedCount);
			if (response) {
				batches = response.batches;
				totalCount = response.total_count;
				toast.success(`Retrieved ${batches.length} batches`);
			} else {
				toast.error('Failed to retrieve batches. Please check your connection and try again.');
			}
		} catch (error) {
			console.error('Error fetching batches:', error);
			
			// Provide more specific error messages based on error type
			let errorMessage = 'Error fetching batches';
			
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage = 'Network error - check if the Open WebUI backend is accessible';
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			toast.error(errorMessage);
		} finally {
			loading = false;
		}
	}

	async function fetchBatchDetails(batchId: string) {
		loadingDetails = true;
		try {
			// Check if we have a token
			if (!localStorage.token) {
				toast.error('Authentication required. Please log in again.');
				return;
			}

			const token = localStorage.token;
			const details = await getBatchDetailsViaProxy(token, batchId);
			if (details) {
				batchDetails = details;
				toast.success('Batch details retrieved successfully');
			} else {
				toast.error('Failed to retrieve batch details. Please check your connection and try again.');
			}
		} catch (error) {
			console.error('Error fetching batch details:', error);
			
			// Provide more specific error messages based on error type
			let errorMessage = 'Error fetching batch details';
			
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage = 'Network error - check if the Open WebUI backend is accessible';
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			toast.error(errorMessage);
		} finally {
			loadingDetails = false;
		}
	}

	function selectBatch(batch: BatchListItem) {
		selectedBatch = batch;
		batchDetails = null;
		fetchBatchDetails(batch.batch_id);
	}

	function formatDate(dateString: string | undefined): string {
		if (!dateString) return 'N/A';
		try {
			return new Date(dateString).toLocaleString();
		} catch {
			return dateString;
		}
	}

	function getStatusColor(status: string | undefined): string {
		if (!status) return 'bg-gray-100 text-gray-800';
		switch (status.toLowerCase()) {
			case 'completed':
				return 'bg-green-100 text-green-800';
			case 'processing':
				return 'bg-blue-100 text-blue-800';
			case 'failed':
				return 'bg-red-100 text-red-800';
			case 'queued':
				return 'bg-yellow-100 text-yellow-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	}

	async function auditFile() {
		if (!filename.trim()) {
			toast.error('Please enter a filename');
			return;
		}

		loadingFileAudit = true;
		try {
			// Check if we have a token
			if (!localStorage.token) {
				toast.error('Authentication required. Please log in again.');
				return;
			}

			const token = localStorage.token;
			const result = await getFileAuditViaProxy(token, filename.trim());
			if (result) {
				fileAuditResult = result;
				toast.success('File audit completed successfully');
			} else {
				toast.error('Failed to audit file. Please check your connection and try again.');
				fileAuditResult = null;
			}
		} catch (error) {
			console.error('Error auditing file:', error);
			
			// Provide more specific error messages based on error type
			let errorMessage = 'Error auditing file';
			
			if (error instanceof TypeError && error.message.includes('fetch')) {
				errorMessage = 'Network error - check if the Open WebUI backend is accessible';
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			toast.error(errorMessage);
			fileAuditResult = null;
		} finally {
			loadingFileAudit = false;
		}
	}

	onMount(() => {
		fetchBatches();
	});
</script>

<div class="space-y-6">
	<!-- Header Section -->
	<div class="border-b border-gray-200 dark:border-gray-700 pb-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">AIMBY Audit Tools</h3>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Retrieve and manage document processing batches and audit file information from the AIMBY
			pipeline.
		</p>
	</div>

	<!-- File Audit Section -->
	<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
		<div class="px-4 py-5 sm:px-6">
			<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">File Audit</h3>
			<p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
				Audit a specific file by filename to see its processing status and metadata.
			</p>
		</div>
		<div class="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-6">
			<div class="flex flex-col sm:flex-row gap-4">
				<div class="flex-1">
					<label for="filename" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
						Filename
					</label>
					<input
						type="text"
						id="filename"
						bind:value={filename}
						placeholder="Enter filename to audit..."
						class="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
					/>
				</div>
				<div class="flex items-end">
					<button
						on:click={auditFile}
						disabled={loadingFileAudit || !filename.trim()}
						class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if loadingFileAudit}
							<svg
								class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
								xmlns="http://www.w3.org/2000/svg"
								fill="none"
								viewBox="0 0 24 24"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Auditing...
						{:else}
							<svg
								class="-ml-1 mr-2 h-5 w-5"
								xmlns="http://www.w3.org/2000/svg"
								viewBox="0 0 20 20"
								fill="currentColor"
							>
								<path
									fill-rule="evenodd"
									d="M9 2a1 1 0 00-.707.293l-1.414 1.414A1 1 0 004.586 4.586L5.414 5.414A1 1 0 006.828 6.828l1.414-1.414A1 1 0 009 2zM3 7a1 1 0 00-.293.707L1.586 9.414A1 1 0 002.414 10.586L3.828 9.172A1 1 0 003 7zM7 9a1 1 0 00-.707.293L4.586 12.414A1 1 0 005.414 13.414L6.828 12A1 1 0 007 9z"
									clip-rule="evenodd"
								/>
							</svg>
							Audit File
						{/if}
					</button>
				</div>
			</div>

			{#if fileAuditResult}
				<div class="mt-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
					<h4 class="text-sm font-medium text-gray-900 dark:text-white mb-2">Audit Result</h4>
					<dl class="grid grid-cols-1 gap-2 sm:grid-cols-2">
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Filename</dt>
							<dd class="text-sm text-gray-900 dark:text-white">{fileAuditResult.filename}</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Status</dt>
							<dd class="text-sm text-gray-900 dark:text-white">{fileAuditResult.status}</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Message</dt>
							<dd class="text-sm text-gray-900 dark:text-white">{fileAuditResult.message}</dd>
						</div>
						<div>
							<dt class="text-xs font-medium text-gray-500 dark:text-gray-400">Timestamp</dt>
							<dd class="text-sm text-gray-900 dark:text-white">
								{formatDate(fileAuditResult.timestamp)}
							</dd>
						</div>
					</dl>
				</div>
			{/if}
		</div>
	</div>

	<!-- Batch Management Section -->
	<div class="border-b border-gray-200 dark:border-gray-700 pb-4">
		<h3 class="text-lg font-medium text-gray-900 dark:text-white">Batch Management</h3>
		<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
			Retrieve and manage document processing batches from the AIMBY pipeline.
		</p>
	</div>

	<!-- Controls Section -->
	<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
		<div class="flex items-center gap-4">
			<label for="batch-count" class="text-sm font-medium text-gray-700 dark:text-gray-300">
				Batch Count:
			</label>
			<select
				id="batch-count"
				bind:value={selectedCount}
				on:change={fetchBatches}
				class="block w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white text-sm focus:border-blue-500 focus:ring-blue-500"
			>
				{#each countOptions as option}
					<option value={option}>{option}</option>
				{/each}
			</select>
		</div>

		<button
			on:click={fetchBatches}
			disabled={loading}
			class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
		>
			{#if loading}
				<svg
					class="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
					xmlns="http://www.w3.org/2000/svg"
					fill="none"
					viewBox="0 0 24 24"
				>
					<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"
					></circle>
					<path
						class="opacity-75"
						fill="currentColor"
						d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
					></path>
				</svg>
				Loading...
			{:else}
				<svg
					class="-ml-1 mr-2 h-5 w-5"
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 20 20"
					fill="currentColor"
				>
					<path
						fill-rule="evenodd"
						d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
						clip-rule="evenodd"
					/>
				</svg>
				Refresh Batches
			{/if}
		</button>
	</div>

	<!-- Stats Section -->
	<div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
		<div class="px-4 py-5 sm:p-6">
			<dl class="grid grid-cols-1 gap-5 sm:grid-cols-3">
				<div class="px-4 py-5 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden sm:p-6">
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
						Total Batches
					</dt>
					<dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{totalCount}</dd>
				</div>
				<div class="px-4 py-5 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden sm:p-6">
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">Displayed</dt>
					<dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
						{batches.length}
					</dd>
				</div>
				<div class="px-4 py-5 bg-gray-50 dark:bg-gray-700 rounded-lg overflow-hidden sm:p-6">
					<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
						Selected Count
					</dt>
					<dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">{selectedCount}</dd>
				</div>
			</dl>
		</div>
	</div>

	<!-- Batches List Section -->
	<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
		<ul class="divide-y divide-gray-200 dark:divide-gray-700">
			{#if loading}
				<li class="px-6 py-4">
					<div class="flex items-center justify-center">
						<svg
							class="animate-spin h-8 w-8 text-blue-600"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								class="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="4"
							></circle>
							<path
								class="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
					</div>
				</li>
			{:else if batches.length === 0}
				<li class="px-6 py-4">
					<div class="text-center text-gray-500 dark:text-gray-400">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
							/>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">No batches found</h3>
						<p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
							No document processing batches are currently available.
						</p>
					</div>
				</li>
			{:else}
				{#each batches as batch (batch.batch_id)}
					<li
						class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors duration-150"
						on:click={() => selectBatch(batch)}
					>
						<div class="flex items-center justify-between">
							<div class="flex items-center">
								<div class="flex-shrink-0">
									<div
										class="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center"
									>
										<svg
											class="h-6 w-6 text-blue-600 dark:text-blue-400"
											xmlns="http://www.w3.org/2000/svg"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
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
								<div class="ml-4">
									<div class="text-sm font-medium text-gray-900 dark:text-white">
										{batch.batch_id}
									</div>
									<div class="text-sm text-gray-500 dark:text-gray-400">
										Created: {formatDate(batch.creation_date)}
									</div>
								</div>
							</div>
							<div class="flex items-center space-x-4">
								{#if batch.file_count !== undefined}
									<div class="text-sm text-gray-500 dark:text-gray-400">
										{batch.file_count} files
									</div>
								{/if}
								{#if batch.status}
									<span
										class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getStatusColor(
											batch.status
										)}"
									>
										{batch.status}
									</span>
								{/if}
								{#if batch.source}
									<div class="text-sm text-gray-500 dark:text-gray-400">
										{batch.source}
									</div>
								{/if}
							</div>
						</div>
					</li>
				{/each}
			{/if}
		</ul>
	</div>

	<!-- Batch Details Section -->
	{#if selectedBatch && batchDetails}
		<div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
			<div class="px-4 py-5 sm:px-6">
				<h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
					Batch Details: {selectedBatch.batch_id}
				</h3>
				<p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
					Detailed information about the selected batch.
				</p>
			</div>
			<div class="border-t border-gray-200 dark:border-gray-700">
				<dl>
					{#if loadingDetails}
						<div class="px-4 py-5 sm:p-6">
							<div class="flex items-center justify-center">
								<svg
									class="animate-spin h-6 w-6 text-blue-600"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
							</div>
						</div>
					{:else}
						{#each Object.entries(batchDetails) as [key, value]}
							<div
								class="bg-gray-50 dark:bg-gray-700 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6"
							>
								<dt class="text-sm font-medium text-gray-500 dark:text-gray-400 capitalize">
									{key.replace(/_/g, ' ')}
								</dt>
								<dd class="mt-1 text-sm text-gray-900 dark:text-white sm:col-span-2 sm:mt-0">
									{#if typeof value === 'object' && value !== null}
										<pre class="whitespace-pre-wrap text-xs">{JSON.stringify(value, null, 2)}</pre>
									{:else}
										{String(value)}
									{/if}
								</dd>
							</div>
						{/each}
					{/if}
				</dl>
			</div>
		</div>
	{/if}
</div>
