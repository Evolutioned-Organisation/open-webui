<script>
	import { getContext, tick, onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { config } from '$lib/stores';
	import { getBackendConfig } from '$lib/apis';

	import WorkflowSync from '../Settings/WorkflowSync.svelte';
	import DocumentIngestion from './Components/DocumentIngestion.svelte';
	import AimbienceConfig from './Components/AimbienceConfig.svelte';
	import AimbienceTools from './Components/AimbienceTools.svelte';
	import PackageManager from './Components/PackageManager.svelte';

	const i18n = getContext('i18n');

	let selectedTab = 'workflow-sync';

	// Get current tab from URL pathname, default to 'workflow-sync'
	$: {
		const pathParts = $page.url.pathname.split('/');
		const tabFromPath = pathParts[pathParts.length - 1];
		selectedTab = ['aimbience-config', 'workflow-sync', 'aimbience-tools', 'package-manager'].includes(tabFromPath)
			? tabFromPath
			: 'workflow-sync';
	}

	$: if (selectedTab) {
		// scroll to selectedTab
		scrollToTab(selectedTab);
	}

	const scrollToTab = (tabId) => {
		const tabElement = document.getElementById(tabId);
		if (tabElement) {
			tabElement.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
		}
	};

	onMount(() => {
		const containerElement = document.getElementById('aimbience-tabs-container');

		if (containerElement) {
			containerElement.addEventListener('wheel', function (event) {
				if (event.deltaY !== 0) {
					// Adjust horizontal scroll position based on vertical scroll
					containerElement.scrollLeft += event.deltaY;
				}
			});
		}

		// Scroll to the selected tab on mount
		scrollToTab(selectedTab);
	});
</script>

<div class="flex flex-col lg:flex-row w-full h-full pb-2 lg:space-x-4">
	<div
		id="aimbience-tabs-container"
		class="tabs flex flex-row overflow-x-auto gap-2.5 max-w-full lg:gap-1 lg:flex-col lg:flex-none lg:w-40 dark:text-gray-200 text-sm font-medium text-left scrollbar-none"
	>
		<button
			id="aimbience-config"
			class="px-0.5 py-1 min-w-fit rounded-lg flex-1 lg:flex-none flex text-right transition {selectedTab ===
			'aimbience-config'
				? ''
				: ' text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'}"
			on:click={() => {
				goto('/admin/aimbience/aimbience-config');
			}}
		>
			<div class=" self-center mr-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-4 h-4"
				>
					<path
						fill-rule="evenodd"
						d="M9 4.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V5.25A.75.75 0 019 4.5zm1.5 2.25a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0V6.75zM9 10.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 019 10.5zm1.5 2.25a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0v-2.25zM9 16.5a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0v-2.25A.75.75 0 019 16.5zm1.5 2.25a.75.75 0 00-1.5 0v2.25a.75.75 0 001.5 0v-2.25z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class=" self-center">{$i18n.t('Aimbience Config')}</div>
		</button>

		<button
			id="workflow-sync"
			class="px-0.5 py-1 min-w-fit rounded-lg flex-1 lg:flex-none flex text-right transition {selectedTab ===
			'workflow-sync'
				? ''
				: ' text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'}"
			on:click={() => {
				goto('/admin/aimbience/workflow-sync');
			}}
		>
			<div class=" self-center mr-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-4 h-4"
				>
					<path
						fill-rule="evenodd"
						d="M4.755 10.059a7.5 7.5 0 0112.548-3.364l1.903 1.903h-3.183a.75.75 0 100 1.5h4.992a.75.75 0 00.75-.75V4.356a.75.75 0 00-1.5 0v3.18l-1.9-1.9A9 9 0 003.306 9.67a.75.75 0 101.45.388zm15.408 3.352a.75.75 0 00-.919.53 7.5 7.5 0 01-12.548 3.364l-1.902-1.903h3.183a.75.75 0 000-1.5H2.984a.75.75 0 00-.75.75v4.992a.75.75 0 001.5 0v-3.18l1.9 1.9a9 9 0 0015.059-4.035.75.75 0 00-.53-.918z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class=" self-center">{$i18n.t('Workflow Sync')}</div>
		</button>

		<button
			id="package-manager"
			class="px-0.5 py-1 min-w-fit rounded-lg flex-1 lg:flex-none flex text-right transition {selectedTab ===
			'package-manager'
				? ''
				: ' text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'}"
			on:click={() => {
				goto('/admin/aimbience/package-manager');
			}}
		>
			<div class=" self-center mr-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-4 h-4"
				>
					<path
						fill-rule="evenodd"
						d="M12 6.75a5.25 5.25 0 01 6.775-5.025.75.75 0 01 .313 1.248l-3.32 3.319c.063.475.276.934.641 1.299.365.365.824.578 1.3.64l3.318-3.319a.75.75 0 01 1.248.313 5.25 5.25 0 01-5.472 6.756c-1.018-.086-1.87.1-2.309.634L7.344 21.3A3.298 3.298 0 1 1 2.7 16.657l8.684-7.151c.533-.44.72-1.291.634-2.309A5.342 5.342 0 1 1 12 6.75ZM4.117 19.125a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008Z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class=" self-center">{$i18n.t('Package Manager')}</div>
		</button>

		<button
			id="aimbience-tools"
			class="px-0.5 py-1 min-w-fit rounded-lg flex-1 lg:flex-none flex text-right transition {selectedTab ===
			'aimbience-tools'
				? ''
				: ' text-gray-300 dark:text-gray-600 hover:text-gray-700 dark:hover:text-white'}"
			on:click={() => {
				goto('/admin/aimbience/aimbience-tools');
			}}
		>
			<div class=" self-center mr-2">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="currentColor"
					class="w-4 h-4"
				>
					<path
						fill-rule="evenodd"
						d="M12 6.75a5.25 5.25 0 01 6.775-5.025.75.75 0 01 .313 1.248l-3.32 3.319c.063.475.276.934.641 1.299.365.365.824.578 1.3.64l3.318-3.319a.75.75 0 01 1.248.313 5.25 5.25 0 01-5.472 6.756c-1.018-.086-1.87.1-2.309.634L7.344 21.3A3.298 3.298 0 1 1 2.7 16.657l8.684-7.151c.533-.44.72-1.291.634-2.309A5.342 5.342 0 1 1 12 6.75ZM4.117 19.125a.75.75 0 0 1 .75-.75h.008a.75.75 0 0 1 .75.75v.008a.75.75 0 0 1-.75.75h-.008a.75.75 0 0 1-.75-.75v-.008Z"
						clip-rule="evenodd"
					/>
				</svg>
			</div>
			<div class=" self-center">{$i18n.t('Ingestion Mgt')}</div>
		</button>
	</div>

	<div class="flex-1 mt-3 lg:mt-0 overflow-y-scroll pr-1 scrollbar-hidden">
		{#if selectedTab === 'workflow-sync'}
			<WorkflowSync
				saveHandler={async () => {
					toast.success($i18n.t('Settings saved successfully!'));
				}}
			/>
		{:else if selectedTab === 'package-manager'}
			<PackageManager />
		{:else if selectedTab === 'aimbience-config'}
			<div class="p-6">
				<h2 class="text-2xl font-bold mb-4">Aimbience Configuration</h2>
				<p class="text-gray-600 dark:text-gray-400 mb-6">
					Configure Aimbience integration settings and API connections.
				</p>

				<AimbienceConfig
					saveHandler={async () => {
						toast.success($i18n.t('Aimbience settings saved successfully!'));
						// Refresh the backend config to ensure all components have latest settings
						await config.set(await getBackendConfig());
					}}
				/>
			</div>
		{:else if selectedTab === 'aimbience-tools'}
			<div class="p-6">
				<!-- Document Ingestion Section -->
				<div class="mb-8">
					<DocumentIngestion />
				</div>
			</div>
		{/if}
	</div>
</div>
