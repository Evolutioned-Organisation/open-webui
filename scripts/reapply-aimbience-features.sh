#!/bin/bash

# Script to reapply custom AIMbience features after syncing with upstream
# This script copies all our custom components and pages from the backup branch

set -e

echo "🔄 Reapplying custom AIMbience features..."

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    echo "❌ Error: Must be run from the open-webui root directory"
    exit 1
fi

# Check if backup branch exists
if ! git show-ref --verify --quiet refs/heads/backup/aimbience-features-v0.6.21; then
    echo "❌ Error: Backup branch 'backup/aimbience-features-v0.6.21' not found"
    exit 1
fi

echo "📁 Copying custom components..."

# Copy custom components
mkdir -p src/lib/components/admin/Aimbience/Components
git show backup/aimbience-features-v0.6.21:src/lib/components/admin/Aimbience/Aimbience.svelte > src/lib/components/admin/Aimbience/Aimbience.svelte
git show backup/aimbience-features-v0.6.21:src/lib/components/admin/Aimbience/Components/AimbienceConfig.svelte > src/lib/components/admin/Aimbience/Components/AimbienceConfig.svelte
git show backup/aimbience-features-v0.6.21:src/lib/components/admin/Aimbience/Components/AimbienceTools.svelte > src/lib/components/admin/Aimbience/Components/AimbienceTools.svelte
git show backup/aimbience-features-v0.6.21:src/lib/components/admin/Aimbience/Components/BatchDetailsModal.svelte > src/lib/components/admin/Aimbience/Components/BatchDetailsModal.svelte
git show backup/aimbience-features-v0.6.21:src/lib/components/admin/Aimbience/Components/DocumentIngestion.svelte > src/lib/components/admin/Aimbience/Components/DocumentIngestion.svelte

# Copy WorkflowSync component
mkdir -p src/lib/components/admin/Settings
git show backup/aimbience-features-v0.6.21:src/lib/components/admin/Settings/WorkflowSync.svelte > src/lib/components/admin/Settings/WorkflowSync.svelte

echo "📄 Copying custom pages..."

# Copy custom pages
mkdir -p src/routes/\(app\)/admin/aimbience
git show backup/aimbience-features-v0.6.21:src/routes/\(app\)/admin/aimbience/+page.svelte > src/routes/\(app\)/admin/aimbience/+page.svelte
git show backup/aimbience-features-v0.6.21:src/routes/\(app\)/admin/aimbience/aimbience-config/+page.svelte > src/routes/\(app\)/admin/aimbience/aimbience-config/+page.svelte
git show backup/aimbience-features-v0.6.21:src/routes/\(app\)/admin/aimbience/aimbience-tools/+page.svelte > src/routes/\(app\)/admin/aimbience/aimbience-tools/+page.svelte
git show backup/aimbience-features-v0.6.21:src/routes/\(app\)/admin/aimbience/batch-details/+page.svelte > src/routes/\(app\)/admin/aimbience/batch-details/+page.svelte
git show backup/aimbience-features-v0.6.21:src/routes/\(app\)/admin/aimbience/workflow-sync/+page.svelte > src/routes/\(app\)/admin/aimbience/workflow-sync/+page.svelte

mkdir -p src/routes/\(app\)/admin/settings/workflow-sync
git show backup/aimbience-features-v0.6.21:src/routes/\(app\)/admin/settings/workflow-sync/+page.svelte > src/routes/\(app\)/admin/settings/workflow-sync/+page.svelte

echo "🔌 Copying custom APIs..."

# Copy custom APIs
mkdir -p src/lib/apis/aimby
git show backup/aimbience-features-v0.6.21:src/lib/apis/aimby/index.ts > src/lib/apis/aimby/index.ts

echo "🔧 Copying backend API routes..."

# Copy backend API routes
git show backup/aimbience-features-v0.6.21:backend/open_webui/routers/auths.py > backend/open_webui/routers/auths.py

echo "⚙️ Copying backend configuration..."

# Copy backend configuration
git show backup/aimbience-features-v0.6.21:backend/open_webui/config.py > backend/open_webui/config.py

echo "🔧 Copying backend main application..."

# Copy backend main application (for config initialization)
git show backup/aimbience-features-v0.6.21:backend/open_webui/main.py > backend/open_webui/main.py

echo "✅ Custom AIMbience features reapplied successfully!"
echo ""
echo "📝 Next steps:"
echo "1. Test the build: npm run build"
echo "2. Test locally: npm run dev"
echo "3. Check that AIMbience settings appear in admin panel"
echo ""
echo "🔧 If you need to reset and start over:"
echo "   git reset --hard upstream/main"
echo "   ./scripts/reapply-aimbience-features.sh"
