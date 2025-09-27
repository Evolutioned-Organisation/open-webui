<script>
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import Aimbience from '$lib/components/admin/Aimbience/Aimbience.svelte';

	onMount(() => {
		goto('/admin/aimbience/workflow-sync');
	});
</script>

<Aimbience />
