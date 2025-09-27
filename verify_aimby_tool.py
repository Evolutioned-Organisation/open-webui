#!/usr/bin/env python3
"""
Verify AIMBY Tool Installation
This script verifies that the AIMBY tool is properly installed in the database.
Used during Docker build to ensure the tool installation was successful.
"""

import sqlite3
import sys
import os

def verify_aimby_tool():
    """Verify that the AIMBY tool is properly installed"""
    
    print('🔍 Verifying AIMBY tool installation...')
    
    # Check if database exists
    db_path = '/app/backend/data/webui.db'
    if not os.path.exists(db_path):
        print('❌ ERROR: Database file not found at', db_path)
        return False
    
    print(f'✅ Database found at {db_path}')
    
    # Connect to database and check for AIMBY tool
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tool table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tool'")
        if not cursor.fetchone():
            print('❌ ERROR: Tool table not found in database')
            return False
        
        print('✅ Tool table found in database')
        
        # Check for AIMBY tool
        cursor.execute('SELECT id, name, content FROM tool WHERE id = "aimby_sync_workflows"')
        result = cursor.fetchone()
        
        if result:
            tool_id, tool_name, tool_content = result
            print(f'✅ AIMBY tool found: {tool_name}')
            
            # Verify tool content has required functions
            if 'sync_workflows' in tool_content and 'test_connection' in tool_content:
                print('✅ Tool content verified: Contains required functions')
            else:
                print('❌ ERROR: Tool content missing required functions')
                print('Content preview:', tool_content[:200] + '...' if len(tool_content) > 200 else tool_content)
                return False
                
        else:
            print('❌ ERROR: AIMBY tool not found in database after installation')
            print('Available tools:')
            cursor.execute('SELECT id, name FROM tool')
            tools = cursor.fetchall()
            if tools:
                for tool in tools:
                    print(f'  - {tool[0]}: {tool[1]}')
            else:
                print('  No tools found in database')
            return False
        
        conn.close()
        print('✅ AIMBY tool installation verification successful')
        print('✅ BUILD SUCCESS: Tool properly installed and verified')
        return True
        
    except Exception as e:
        print(f'❌ ERROR during verification: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = verify_aimby_tool()
    if not success:
        print("❌ BUILD FAILED: Tool installation verification unsuccessful")
        sys.exit(1) 