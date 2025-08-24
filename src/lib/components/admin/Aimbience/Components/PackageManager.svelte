<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import {
		getAimbienceConfig,
		getInstalledPackages,
		getAvailablePackages,
		updatePackage
	} from '$lib/apis/auths';

	// Context for logging
	const logDebug = getContext('logDebug');

	// State
	let loading = false;
	let installedPackages: any[] = [];
	let availablePackages: any[] = [];
	let sdkPackage: any = null;
	let workflowPackage: any = null;
	let availableSdkVersions: any[] = [];
	let availableWorkflowVersions: any[] = [];
	let updatingSdk = false;
	let updatingWorkflow = false;

	// Debug reactive variables
	$: console.log('🔄 Reactive update - workflowPackage:', workflowPackage);
	$: console.log('🔄 Reactive update - sdkPackage:', sdkPackage);
	$: console.log('🔄 Reactive update - installedPackages length:', installedPackages.length);

	// Package types we care about
	const TARGET_PACKAGES = ['aimby-sdk', 'rag-workflows'];

	// Fetch both installed and available packages
	const fetchAllPackages = async () => {
		loading = true;
		try {
			console.log('🔄 Fetching all package information from AIMBY API...');

			// Fetch installed packages
			const installedResponse = await getInstalledPackages(localStorage.token);
			console.log('📦 Installed packages response:', installedResponse);
			console.log('📦 Installed packages response type:', typeof installedResponse);
			console.log('📦 Installed packages response keys:', Object.keys(installedResponse || {}));

			// Fetch available packages
			const availableResponse = await getAvailablePackages(localStorage.token);
			console.log('📦 Available packages response:', availableResponse);
			console.log('📦 Available packages response type:', typeof availableResponse);
			console.log('📦 Available packages response keys:', Object.keys(availableResponse || {}));

			if (installedResponse && installedResponse.packages) {
				installedPackages = installedResponse.packages;
				console.log('📦 Set installedPackages:', installedPackages);
			}

			if (availableResponse && availableResponse.packages) {
				availablePackages = availableResponse.packages;
				console.log('📦 Set availablePackages:', availablePackages);
			}

			// Organize packages by type
			organizePackages();

			toast.success('Package information refreshed successfully');
		} catch (error) {
			console.error('❌ Error fetching package information:', error);
			toast.error('Failed to fetch package information from AIMBY API');
		} finally {
			loading = false;
		}
	};

	// Organize packages into SDK and Workflow categories
	const organizePackages = () => {
		console.log('🔍 Organizing packages...');
		console.log('📦 Raw installed packages:', installedPackages);
		console.log('📦 Raw available packages:', availablePackages);

		// Find SDK package (aimby-sdk)
		sdkPackage =
			installedPackages.find((pkg) => pkg.name === 'aimby-sdk' || pkg.package_type === 'sdk') ||
			null;
		console.log('🔍 Found SDK package:', sdkPackage);

		// Find Workflow package (rag_workflows or rag-workflows)
		workflowPackage =
			installedPackages.find(
				(pkg) =>
					pkg.name === 'rag_workflows' ||
					pkg.name === 'rag-workflows' ||
					pkg.package_type === 'workflow'
			) || null;
		console.log('🔍 Found Workflow package:', workflowPackage);

		// Get available versions for each package type
		availableSdkVersions = availablePackages
			.filter((pkg) => pkg.name === 'aimby-sdk' || pkg.package_type === 'sdk')
			.map((pkg) => ({
				version: pkg.version,
				description: pkg.description || 'No description available',
				is_installed: pkg.is_installed
			}));

		availableWorkflowVersions = availablePackages
			.filter(
				(pkg) =>
					pkg.name === 'rag_workflows' ||
					pkg.name === 'rag-workflows' ||
					pkg.package_type === 'workflow'
			)
			.map((pkg) => ({
				version: pkg.version,
				description: pkg.description || 'No description available',
				is_installed: pkg.is_installed
			}));

		console.log('📦 Organized packages:', {
			sdkPackage,
			workflowPackage,
			availableSdkVersions,
			availableWorkflowVersions
		});
	};

	// Update a package to a specific version
	const updatePackageVersion = async (packageName: string, version: string) => {
		const isSdk = packageName === 'aimby-sdk';
		const isWorkflow = packageName === 'rag-workflows';
		const updating = isSdk ? updatingSdk : updatingWorkflow;

		if (updating) return; // Prevent multiple simultaneous updates

		try {
			if (isSdk) {
				updatingSdk = true;
			} else if (isWorkflow) {
				updatingWorkflow = true;
			}

			console.log(`🔄 Updating ${packageName} to version ${version}...`);
			toast.info(`Updating ${packageName} to version ${version}...`);

			const response = await updatePackage(localStorage.token, packageName, version);

			if (response && response.success) {
				toast.success(`Successfully updated ${packageName} to version ${version}`);
				console.log(`✅ Package update successful:`, response);
				
				// Show upgrade log if available
				if (response.upgrade_log && response.upgrade_log.length > 0) {
					console.log('📋 Upgrade log:', response.upgrade_log);
				}

				// Refresh package information
				await fetchAllPackages();
			} else {
				const errorMessage = response?.message || response?.detail || 'Update failed';
				throw new Error(errorMessage);
			}
		} catch (error) {
			console.error(`❌ Error updating ${packageName}:`, error);
			toast.error(`Failed to update ${packageName}: ${error.message || 'Unknown error'}`);
		} finally {
			if (isSdk) {
				updatingSdk = false;
			} else if (isWorkflow) {
				updatingWorkflow = false;
			}
		}
	};

	// Update to latest version
	const updateToLatest = async (packageName: string) => {
		await updatePackageVersion(packageName, 'latest');
	};

	// Get package status badge
	const getPackageStatusBadge = (pkg: any) => {
		if (!pkg) return { text: 'Not Installed', class: 'bg-gray-500' };

		const isOutdated = availablePackages.some(
			(available) => available.name === pkg.name && available.version !== pkg.version
		);

		if (isOutdated) {
			return { text: 'Update Available', class: 'bg-yellow-500' };
		}

		return { text: 'Up to Date', class: 'bg-green-500' };
	};

	// Initialize
	onMount(() => {
		fetchAllPackages();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex justify-between items-center">
		<div>
			<h2 class="text-2xl font-bold text-gray-900 dark:text-gray-100">Package Manager</h2>
			<p class="text-gray-600 dark:text-gray-400">Manage AIMBY SDK and RAG Workflow packages</p>
		</div>
		<button
			on:click={fetchAllPackages}
			disabled={loading}
			class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
				Refreshing...
			{:else}
				<svg class="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
					></path>
				</svg>
				Refresh
			{/if}
		</button>
	</div>

	<!-- Package Management Cards -->
	<div class="space-y-6">
		<!-- AIMBY SDK Management Card -->
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg">
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
					<svg
						class="h-5 w-5 text-blue-400 mr-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
						></path>
					</svg>
					AIMBY SDK Management
				</h3>
			</div>
			<div class="p-6">
				{#if sdkPackage}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
									{sdkPackage.name}
								</h4>
								<p class="text-sm text-gray-500">Current Version: {sdkPackage.version}</p>
								<p class="text-sm text-gray-500">
									Installed: {new Date(sdkPackage.installed_at).toLocaleDateString()}
								</p>
							</div>
							<div class="flex items-center space-x-2">
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getPackageStatusBadge(
										sdkPackage
									).class} text-white"
								>
									{getPackageStatusBadge(sdkPackage).text}
								</span>
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
								>
									SDK
								</span>
							</div>
						</div>

						<div class="border-t border-gray-200 dark:border-gray-700 pt-4">
							<div class="flex items-center space-x-4">
								<label
									for="sdk-version"
									class="text-sm font-medium text-gray-700 dark:text-gray-300"
									>Update to Version:</label
								>
								<select
									id="sdk-version"
									class="block w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
								>
									<option value="latest">Latest Available</option>
									{#each availableSdkVersions as version}
										<option value={version.version}>{version.version}</option>
									{/each}
								</select>
								<button
									on:click={() => {
										const select = document.getElementById('sdk-version');
										if (select && select.tagName === 'SELECT') {
											updatePackageVersion('aimby-sdk', select.value);
										}
									}}
									disabled={updatingSdk}
									class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{#if updatingSdk}
										<svg
											class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
										Updating...
									{:else}
										Update
									{/if}
								</button>
							</div>
						</div>
					</div>
				{:else}
					<div class="text-center py-8">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
							></path>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
							No SDK Package Installed
						</h3>
						<p class="mt-1 text-sm text-gray-500">
							The AIMBY SDK package is not currently installed.
						</p>
						{#if availableSdkVersions.length > 0}
							<div class="mt-4">
								<p class="text-sm text-gray-500 mb-2">Available versions:</p>
								<div class="flex flex-wrap gap-2 justify-center">
									{#each availableSdkVersions as version}
										<span
											class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
										>
											{version.version}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>

		<!-- RAG Workflows Management Card -->
		<div class="bg-white dark:bg-gray-800 shadow rounded-lg">
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 flex items-center">
					<svg
						class="h-5 w-5 text-purple-400 mr-2"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						></path>
					</svg>
					RAG Workflows Management
				</h3>
			</div>
			<div class="p-6">
				{#if workflowPackage}
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<div>
								<h4 class="text-sm font-medium text-gray-900 dark:text-gray-100">
									{workflowPackage.name}
								</h4>
								<p class="text-sm text-gray-500">Current Version: {workflowPackage.version}</p>
								<p class="text-sm text-gray-500">
									Installed: {new Date(workflowPackage.installed_at).toLocaleDateString()}
								</p>
							</div>
							<div class="flex items-center space-x-2">
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getPackageStatusBadge(
										workflowPackage
									).class} text-white"
								>
									{getPackageStatusBadge(workflowPackage).text}
								</span>
								<span
									class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
								>
									Workflow
								</span>
							</div>
						</div>

						<div class="border-t border-gray-200 dark:border-gray-700 pt-4">
							<div class="flex items-center space-x-4">
								<label
									for="workflow-version"
									class="text-sm font-medium text-gray-700 dark:text-gray-300"
									>Update to Version:</label
								>
								<select
									id="workflow-version"
									class="block w-48 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
								>
									<option value="latest">Latest Available</option>
									{#each availableWorkflowVersions as version}
										<option value={version.version}>{version.version}</option>
									{/each}
								</select>
								<button
									on:click={() => {
										const select = document.getElementById('workflow-version');
										if (select && select.tagName === 'SELECT') {
											updatePackageVersion('rag-workflows', select.value);
										}
									}}
									disabled={updatingWorkflow}
									class="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{#if updatingWorkflow}
										<svg
											class="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
										Updating...
									{:else}
										Update
									{/if}
								</button>
							</div>
						</div>
					</div>
				{:else}
					<div class="text-center py-8">
						<svg
							class="mx-auto h-12 w-12 text-gray-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
							></path>
						</svg>
						<h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
							No Workflow Package Installed
						</h3>
						<p class="mt-1 text-sm text-gray-500">
							The RAG Workflows package is not currently installed.
						</p>
						{#if availableWorkflowVersions.length > 0}
							<div class="mt-4">
								<p class="text-sm text-gray-500 mb-2">Available versions:</p>
								<div class="flex flex-wrap gap-2 justify-center">
									{#each availableWorkflowVersions as version}
										<span
											class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
										>
											{version.version}
										</span>
									{/each}
								</div>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Information Panel -->
	<div
		class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4"
	>
		<div class="flex">
			<div class="flex-shrink-0">
				<svg class="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					></path>
				</svg>
			</div>
			<div class="ml-3">
				<h3 class="text-sm font-medium text-blue-800 dark:text-blue-200">
					Package Management Information
				</h3>
				<div class="mt-2 text-sm text-blue-700 dark:text-blue-300">
					<p>This Package Manager focuses on the two core packages required for AIMbience:</p>
					<ul class="list-disc list-inside mt-1 space-y-1">
						<li><strong>AIMBY SDK:</strong> Core functionality and utilities for the platform</li>
						<li>
							<strong>RAG Workflows:</strong> Retrieval-Augmented Generation workflow definitions
						</li>
					</ul>
					<p class="mt-2">
						Use the version dropdowns to select specific versions or choose "Latest Available" for
						automatic updates.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
