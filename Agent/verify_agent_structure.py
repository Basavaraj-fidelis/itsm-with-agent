
#!/usr/bin/env python3
"""
Verification script to check Agent folder structure integrity
"""

import os
from pathlib import Path

def check_required_files():
    """Check if all required files are present in correct locations"""
    
    required_structure = {
        'Windows': {
            'required': ['itsm_agent.py', 'config.ini'],
            'optional': ['install_windows.py', 'fix_windows_service.py', 'fix_service_issue.py', 'service_wrapper.py']
        },
        'Linux': {
            'required': ['itsm_agent.py', 'config.ini'], 
            'optional': ['install_linux.sh', 'service_wrapper.py']
        },
        'Common': {
            'required': ['system_collector.py', 'api_client.py'],
            'optional': ['command_scheduler.py', 'operation_monitor.py', 'smart_queue.py', 
                        'network_monitor.py', 'performance_baseline.py', 'config_validator.py']
        }
    }
    
    print("🔍 Checking Agent directory structure...")
    print("=" * 50)
    
    all_good = True
    
    for platform, files in required_structure.items():
        platform_dir = Path(f'Agent/{platform}')
        print(f"\n📁 {platform}/")
        
        if not platform_dir.exists():
            print(f"  ❌ Directory {platform}/ does not exist")
            all_good = False
            continue
        
        # Check required files
        for file in files['required']:
            file_path = platform_dir / file
            if file_path.exists():
                print(f"  ✅ {file} (required)")
            else:
                print(f"  ❌ {file} (required) - MISSING")
                all_good = False
        
        # Check optional files
        for file in files['optional']:
            file_path = platform_dir / file
            if file_path.exists():
                print(f"  ✅ {file} (optional)")
            else:
                print(f"  ⚠️  {file} (optional) - missing")
    
    # Check for remaining old files in root
    print(f"\n📁 Root Agent/ directory:")
    agent_root = Path('Agent')
    root_files = [f for f in agent_root.iterdir() if f.is_file() and f.name not in ['README.md', 'AGENT_DEPLOYMENT.md']]
    
    if root_files:
        print("  ⚠️  Remaining files in root (should be moved or removed):")
        for file in root_files:
            print(f"    - {file.name}")
    else:
        print("  ✅ No unexpected files in root directory")
    
    return all_good

def check_duplicate_files():
    """Check for duplicate files across directories"""
    print(f"\n🔍 Checking for duplicate files...")
    
    agent_dir = Path('Agent')
    all_files = {}
    
    for file_path in agent_dir.rglob('*.py'):
        if file_path.is_file():
            filename = file_path.name
            if filename not in all_files:
                all_files[filename] = []
            all_files[filename].append(str(file_path.relative_to(agent_dir)))
    
    duplicates_found = False
    for filename, locations in all_files.items():
        if len(locations) > 1:
            print(f"  ⚠️  Duplicate file '{filename}' found in:")
            for location in locations:
                print(f"    - {location}")
            duplicates_found = True
    
    if not duplicates_found:
        print("  ✅ No duplicate files found")

def main():
    """Main verification function"""
    # Change to project root
    script_dir = Path(__file__).parent.parent
    os.chdir(script_dir)
    
    structure_ok = check_required_files()
    check_duplicate_files()
    
    print("\n" + "=" * 50)
    if structure_ok:
        print("✅ Agent directory structure is properly organized!")
    else:
        print("❌ Agent directory structure needs attention!")
        print("Run cleanup_agent_structure.py to fix issues")

if __name__ == '__main__':
    main()
