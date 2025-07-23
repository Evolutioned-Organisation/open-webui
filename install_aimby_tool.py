#!/usr/bin/env python3
"""
Install AIMBY Sync Tool into Open WebUI

This script installs the AIMBY sync workflows tool into Open WebUI's tool system.
It creates a tool entry in the database and makes it available for use.
"""

import os
import sys
import sqlite3
import time
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Import Open WebUI modules
from open_webui.models.tools import Tools
from open_webui.utils.plugin import replace_imports


def install_aimby_tool():
    """Install the AIMBY sync tool into Open WebUI."""
    
    # Read the tool content
    tool_file = Path(__file__).parent / "backend" / "open_webui" / "aimby_sync_tool.py"
    
    if not tool_file.exists():
        print(f"❌ Tool file not found: {tool_file}")
        return False
    
    with open(tool_file, 'r', encoding='utf-8') as f:
        tool_content = f.read()
    
    # Replace imports for Open WebUI compatibility
    tool_content = replace_imports(tool_content)
    
    # Generate a unique tool ID
    tool_id = "aimby_sync_workflows"
    
    # Check if tool already exists
    existing_tool = Tools.get_tool_by_id(tool_id)
    if existing_tool:
        print("🔄 Updating existing AIMBY Sync Workflows tool...")
        
        # Update the tool
        Tools.update_tool_by_id(tool_id, {
            "content": tool_content,
            "updated_at": int(time.time())
        })
        print(f"✅ Updated tool with ID: {tool_id}")
    else:
        print("🆕 Creating new AIMBY Sync Workflows tool...")
        
        # Create tool form data
        from open_webui.models.tools import ToolForm, ToolMeta
        
        form_data = ToolForm(
            id=tool_id,
            name="AIMBY Sync Workflows",
            content=tool_content,
            meta=ToolMeta(
                description="Sync workflows from repository and upload to pipeline service",
                manifest={
                    "author": "AIMbient Team",
                    "version": "1.0.0"
                }
            )
        )
        
        # Create access control for admin-only
        access_control = {
            "read": {
                "user_ids": ["admin"]
            },
            "write": {
                "user_ids": ["admin"]
            }
        }
        
        # Load the tool module to get specs
        from open_webui.utils.plugin import load_tool_module_by_id
        try:
            tool_module, frontmatter = load_tool_module_by_id(tool_id, content=tool_content)
            from open_webui.utils.tools import get_tool_specs
            specs = get_tool_specs(tool_module)
            
            # Insert the tool
            result = Tools.insert_new_tool("admin", form_data, specs)
            
            if result:
                print(f"✅ Created tool with ID: {tool_id}")
            else:
                print("❌ Failed to create tool")
                return False
                
        except Exception as e:
            print(f"❌ Failed to load tool module: {e}")
            return False
    
    return True


def verify_installation():
    """Verify that the tool was installed correctly."""
    print("\n🔍 Verifying installation...")
    
    # Check if tool exists
    tool_id = "aimby_sync_workflows"
    tool = Tools.get_tool_by_id(tool_id)
    if not tool:
        print("❌ Tool not found in database")
        return False
    
    print(f"✅ Tool found: {tool.name}")
    print(f"   ID: {tool.id}")
    print(f"   Description: {tool.meta.description if tool.meta else 'No description'}")
    print(f"   Access Control: {tool.access_control}")
    
    # Try to load the tool module
    try:
        from open_webui.utils.plugin import load_tool_module_by_id
        tool_module, frontmatter = load_tool_module_by_id(tool_id)
        print("✅ Tool module loads successfully")
        
        # Check if methods exist
        if hasattr(tool_module, 'sync_workflows'):
            print("✅ sync_workflows method found")
        else:
            print("❌ sync_workflows method not found")
            
        if hasattr(tool_module, 'get_workflows_status'):
            print("✅ get_workflows_status method found")
        else:
            print("❌ get_workflows_status method not found")
            
    except Exception as e:
        print(f"❌ Failed to load tool module: {e}")
        return False
    
    return True


def main():
    """Main installation function."""
    print("🚀 Installing AIMBY Sync Workflows Tool for Open WebUI")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path("backend/open_webui").exists():
        print("❌ Please run this script from the open-webui directory")
        return False
    
    # Install the tool
    if not install_aimby_tool():
        print("❌ Failed to install tool")
        return False
    
    # Verify installation
    if not verify_installation():
        print("❌ Installation verification failed")
        return False
    
    print("\n🎉 Installation completed successfully!")
    print("\n📋 Next steps:")
    print("1. Restart Open WebUI if it's running")
    print("2. Go to the admin interface")
    print("3. Navigate to Tools section")
    print("4. You should see 'AIMBY Sync Workflows' tool")
    print("5. Configure the tool settings if needed")
    print("6. Use the tool in chat to sync workflows")
    
    return True


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 