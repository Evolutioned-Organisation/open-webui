<script lang="ts">
	import { onMount, getContext } from 'svelte';
	import { toast } from 'svelte-sonner';
	import { getAimbienceConfig } from '$lib/apis/auths';

	const i18n = getContext('i18n');

	let aimbienceConfig: any | null = null;
	let packages: any[] = [];
	let loading = false;
	let selectedPackage: any = null;
	let showInstallModal = false;
	let showUninstallModal = false;
	let showUpdateModal = false;

	// Package management states
	let installingPackage = false;
	let uninstallingPackage = false;
	let updatingPackage = false;

	// Search and filter
	let searchQuery = '';
	let filterStatus = 'all'; // all, installed, available, outdated

	// Filtered packages based on search and status
	$: filteredPackages = packages.filter((pkg) => {
		// Apply status filter
		if (filterStatus !== 'all') {
			if (filterStatus === 'installed' && !pkg.installed) return false;
			if (filterStatus === 'available' && pkg.installed) return false;
			if (filterStatus === 'outdated' && !pkg.outdated) return false;
		}

		// Apply search filter
		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			return (
				pkg.name?.toLowerCase().includes(query) ||
				pkg.description?.toLowerCase().includes(query) ||
				pkg.version?.toLowerCase().includes(query) ||
				pkg.author?.toLowerCase().includes(query)
			);
		}

		return true;
	});

	const fetchPackages = async () => {
		loading = true;
		try {
			// TODO: Replace with actual API call to get packages
			// const response = await getPackages(localStorage.token);
			// packages = response.packages || [];
			
			// Mock data for now
			packages = [
				{
					id: 'workflow-core',
					name: 'Workflow Core',
					description: 'Core workflow engine and utilities',
					version: '1.2.0',
					author: 'AIMbient Team',
					installed: true,
					installedVersion: '1.2.0',
					outdated: false,
					latestVersion: '1.2.0',
					repository: 'https://github.com/aimbient/workflow-core',
					dependencies: ['python>=3.8', 'fastapi>=0.68'],
					lastUpdated: '2024-01-15T10:30:00Z'
				},
				{
					id: 'rag-workflows',
					name: 'RAG Workflows',
					description: 'Retrieval-Augmented Generation workflow templates',
					version: '2.1.0',
					author: 'AIMbient Team',
					installed: true,
					installedVersion: '2.0.5',
					outdated: true,
					latestVersion: '2.1.0',
					repository: 'https://github.com/aimbient/rag-workflows',
					dependencies: ['workflow-core>=1.2.0', 'langchain>=0.1.0'],
					lastUpdated: '2024-01-20T14:15:00Z'
				},
				{
					id: 'document-processing',
					name: 'Document Processing',
					description: 'Document ingestion and processing workflows',
					version: '1.5.2',
					author: 'AIMbient Team',
					installed: false,
					installedVersion: null,
					outdated: false,
					latestVersion: '1.5.2',
					repository: 'https://github.com/aimbient/document-processing',
					dependencies: ['workflow-core>=1.2.0', 'pypdf>=3.0.0'],
					lastUpdated: '2024-01-18T09:45:00Z'
				}
			];
			
			toast.success(`Loaded ${packages.length} packages`);
		} catch (error) {
			console.error('Error fetching packages:', error);
			toast.error('Failed to fetch packages');
		} finally {
			loading = false;
		}
	};

	const installPackage = async (packageId: string) => {
		installingPackage = true;
		try {
			// TODO: Replace with actual API call to install package
			// await installPackageAPI(localStorage.token, packageId);
			
			// Mock installation
			await new Promise(resolve => setTimeout(resolve, 2000));
			
			// Update local state
			const pkg = packages.find(p => p.id === packageId);
			if (pkg) {
				pkg.installed = true;
				pkg.installedVersion = pkg.latestVersion;
				pkg.outdated = false;
			}
			
			toast.success(`Package ${pkg?.name} installed successfully`);
		} catch (error) {
			console.error('Error installing package:', error);
			toast.error('Failed to install package');
		} finally {
			installingPackage = false;
			showInstallModal = false;
		}
	};

	const uninstallPackage = async (packageId: string) => {
		uninstallingPackage = true;
		try {
			// TODO: Replace with actual API call to uninstall package
			// await uninstallPackageAPI(localStorage.token, packageId);
			
			// Mock uninstallation
			await new Promise(resolve => setTimeout(resolve, 1500));
			
			// Update local state
			const pkg = packages.find(p => p.id === packageId);
			if (pkg) {
				pkg.installed = false;
				pkg.installedVersion = null;
			}
			
			toast.success(`Package ${pkg?.name} uninstalled successfully`);
		} catch (error) {
			console.error('Error uninstalling package:', error);
			toast.error('Failed to uninstall package');
		} finally {
			uninstallingPackage = false;
			showUninstallModal = false;
		}
	};

	const updatePackage = async (packageId: string) => {
		updatingPackage = true;
		try {
			// TODO: Replace with actual API call to update package
			// await updatePackageAPI(localStorage.token, packageId);
			
			// Mock update
			await new Promise(resolve => setTimeout(resolve, 2500));
			
			// Update local state
			const pkg = packages.find(p => p.id === packageId);
			if (pkg) {
				pkg.installedVersion = pkg.latestVersion;
				pkg.outdated = false;
			}
			
			toast.success(`Package ${pkg?.name} updated successfully`);
		} catch (error) {
			console.error('Error updating package:', error);
			toast.error('Failed to update package');
		} finally {
			updatingPackage = false;
			showUpdateModal = false;
		}
	};

	const openInstallModal = (pkg: any) => {
		selectedPackage = pkg;
		showInstallModal = true;
	};

	const openUninstallModal = (pkg: any) => {
		selectedPackage = pkg;
		showUninstallModal = true;
	};

	const openUpdateModal = (pkg: any) => {
		selectedPackage = pkg;
		showUpdateModal = true;
	};

	const formatDate = (dateString: string) => {
		try {
			return new Date(dateString).toLocaleDateString();
		} catch {
			return 'Unknown';
		}
	};

	const getStatusBadge = (pkg: any) => {
		if (!pkg.installed) {
			return '<span class="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">Available</span>';
		}
		if (pkg.outdated) {
			return '<span class="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">Outdated</span>';
		}
		return '<span class="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">Up to date</span>';
	};

	onMount(async () => {
		// Load Aimbience config
		try {
			const config = await getAimbienceConfig(localStorage.token);
			if (config) {
				aimbienceConfig = config;
			}
		} catch (error) {
			console.error('Error loading Aimbience config:', error);
		}
		
		// Fetch packages
		await fetchPackages();
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
				<h2 class="text-2xl font-bold text-gray-900 dark:text-white">Package Manager</h2>
				<p class="text-sm text-gray-600 dark:text-gray-400">
					Install, update, and manage workflow packages from the AIMBY repository
				</p>
			</div>
			<div class="flex gap-2">
				<button
					class="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					on:click={fetchPackages}
					disabled={loading}
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
					</svg>
					Refresh
				</button>
			</div>
		</div>

		<!-- Stats Cards -->
		<div class="grid grid-cols-1 md:grid-cols-4 gap-4">
			<div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Total Packages</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{packages.length}</div>
			</div>
			<div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Installed</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{packages.filter(p => p.installed).length}</div>
			</div>
			<div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Available</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{packages.filter(p => !p.installed).length}</div>
			</div>
			<div class="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
				<div class="text-sm font-medium text-gray-600 dark:text-gray-400">Outdated</div>
				<div class="text-2xl font-bold text-gray-900 dark:text-white">{packages.filter(p => p.outdated).length}</div>
			</div>
		</div>

		<!-- Search and Filter Section -->
		<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
			<div class="px-6 py-4">
				<div class="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
					<div class="flex-1 max-w-md">
						<label for="package-search" class="sr-only">Search packages</label>
						<div class="relative">
							<div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
								<svg class="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
								</svg>
							</div>
							<input
								id="package-search"
								type="text"
								bind:value={searchQuery}
								class="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
								placeholder="Search packages by name, description, or author..."
							/>
						</div>
					</div>
					<div class="flex items-center gap-4">
						<label for="status-filter" class="text-sm text-gray-600 dark:text-gray-400">Filter:</label>
						<select
							id="status-filter"
							bind:value={filterStatus}
							class="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
						>
							<option value="all">All Packages</option>
							<option value="installed">Installed</option>
							<option value="available">Available</option>
							<option value="outdated">Outdated</option>
						</select>
					</div>
				</div>
			</div>
		</div>

		<!-- Packages List -->
		<div class="bg-white dark:bg-gray-800 shadow-sm rounded-lg border border-gray-200 dark:border-gray-700">
			<div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
				<div class="flex items-center justify-between">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white">Workflow Packages</h3>
					<div class="text-sm text-gray-500 dark:text-gray-400">
						Showing {filteredPackages.length} of {packages.length} packages
					</div>
				</div>
			</div>

			<div class="relative">
				{#if loading}
					<div class="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10">
						<svg class="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
					</div>
				{/if}

				{#if filteredPackages.length === 0 && !loading}
					<div class="text-center py-12">
						<div class="text-gray-500 dark:text-gray-400 text-sm">
							{#if searchQuery || filterStatus !== 'all'}
								No packages found matching your criteria
								<button
									on:click={() => { searchQuery = ''; filterStatus = 'all'; }}
									class="ml-2 text-blue-600 dark:text-blue-400 hover:underline"
								>
									Clear filters
								</button>
							{:else}
								No packages available
							{/if}
						</div>
					</div>
				{:else}
					<div class="divide-y divide-gray-200 dark:divide-gray-700">
						{#each filteredPackages as pkg (pkg.id)}
							<div class="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
								<div class="flex items-start justify-between">
									<div class="flex-1 min-w-0">
										<div class="flex items-center gap-3 mb-2">
											<h4 class="text-lg font-medium text-gray-900 dark:text-white">{pkg.name}</h4>
											<span class="text-sm text-gray-500 dark:text-gray-400">v{pkg.version}</span>
											{@html getStatusBadge(pkg)}
										</div>
										<p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{pkg.description}</p>
										
										<div class="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
											<div>
												<span class="font-medium">Author:</span> {pkg.author}
											</div>
											<div>
												<span class="font-medium">Last Updated:</span> {formatDate(pkg.lastUpdated)}
											</div>
											{#if pkg.installed}
												<div>
													<span class="font-medium">Installed:</span> v{pkg.installedVersion}
												</div>
											{/if}
										</div>

										{#if pkg.dependencies && pkg.dependencies.length > 0}
											<div class="mt-3">
												<span class="text-xs font-medium text-gray-500 dark:text-gray-400">Dependencies:</span>
												<div class="flex flex-wrap gap-2 mt-1">
													{#each pkg.dependencies as dep}
														<span class="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded">
															{dep}
														</span>
													{/each}
												</div>
											</div>
										{/if}
									</div>

									<div class="flex flex-col gap-2 ml-4">
										{#if !pkg.installed}
											<button
												on:click={() => openInstallModal(pkg)}
												class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
											>
												Install
											</button>
										{:else if pkg.outdated}
											<button
												on:click={() => openUpdateModal(pkg)}
												class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
											>
												Update
											</button>
											<button
												on:click={() => openUninstallModal(pkg)}
												class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
											>
												Uninstall
											</button>
										{:else}
											<button
												on:click={() => openUninstallModal(pkg)}
												class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
											>
												Uninstall
											</button>
										{/if}
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- Install Package Modal -->
	{#if showInstallModal && selectedPackage}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
				<div class="mt-3 text-center">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Install Package</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
						Are you sure you want to install <strong>{selectedPackage.name}</strong> v{selectedPackage.version}?
					</p>
					<div class="flex justify-center gap-3">
						<button
							on:click={() => showInstallModal = false}
							class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
						>
							Cancel
						</button>
						<button
							on:click={() => installPackage(selectedPackage.id)}
							disabled={installingPackage}
							class="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if installingPackage}
								Installing...
							{:else}
								Install
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Uninstall Package Modal -->
	{#if showUninstallModal && selectedPackage}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
				<div class="mt-3 text-center">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Uninstall Package</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
						Are you sure you want to uninstall <strong>{selectedPackage.name}</strong>? This action cannot be undone.
					</p>
					<div class="flex justify-center gap-3">
						<button
							on:click={() => showUninstallModal = false}
							class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
						>
							Cancel
						</button>
						<button
							on:click={() => uninstallPackage(selectedPackage.id)}
							disabled={uninstallingPackage}
							class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if uninstallingPackage}
								Uninstalling...
							{:else}
								Uninstall
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Update Package Modal -->
	{#if showUpdateModal && selectedPackage}
		<div class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
			<div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
				<div class="mt-3 text-center">
					<h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">Update Package</h3>
					<p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
						Update <strong>{selectedPackage.name}</strong> from v{selectedPackage.installedVersion} to v{selectedPackage.latestVersion}?
					</p>
					<div class="flex justify-center gap-3">
						<button
							on:click={() => showUpdateModal = false}
							class="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
						>
							Cancel
						</button>
						<button
							on:click={() => updatePackage(selectedPackage.id)}
							disabled={updatingPackage}
							class="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{#if updatingPackage}
								Updating...
							{:else}
								Update
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
</div>
