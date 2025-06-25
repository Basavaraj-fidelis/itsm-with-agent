
#!/usr/bin/env python3
"""
Cleanup script to organize Agent folder structure
Removes duplicate files and organizes into proper platform-specific structure
"""

import os
import shutil
from pathlib import Path

def backup_important_files():
    """Create backup of important files before cleanup"""
    backup_dir = Path('Agent_backup')
    backup_dir.mkdir(exist_ok=True)
    
    important_files = [
        'config.ini',
        'config_local.ini', 
        'itsm_agent.py'
    ]
    
    for file in important_files:
        src = Path(f'Agent/{file}')
        if src.exists():
            shutil.copy2(src, backup_dir / file)
            print(f"✓ Backed up {file}")

def create_common_directory():
    """Create Common directory and move shared files"""
    common_dir = Path('Agent/Common')
    common_dir.mkdir(exist_ok=True)
    
    # Files that should be in Common/
    common_files = [
        'system_collector.py',
        'api_client.py', 
        'command_scheduler.py',
        'operation_monitor.py',
        'smart_queue.py',
        'network_monitor.py',
        'performance_baseline.py',
        'config_validator.py'
    ]
    
    for file in common_files:
        src = Path(f'Agent/{file}')
        dest = Path(f'Agent/Common/{file}')
        
        if src.exists() and not dest.exists():
            shutil.move(src, dest)
            print(f"✓ Moved {file} to Common/")
        elif src.exists() and dest.exists():
            # Remove duplicate from root
            os.remove(src)
            print(f"✓ Removed duplicate {file} from root")

def cleanup_old_files():
    """Remove old files that are no longer needed or duplicated"""
    files_to_remove = [
        'Agent/itsm_agent.py',  # Should be platform-specific now
        'Agent/config.ini',     # Should be platform-specific now
        'Agent/test_service.py',
        'Agent/migrate_structure.py'  # No longer needed after cleanup
    ]
    
    for file_path in files_to_remove:
        file = Path(file_path)
        if file.exists():
            os.remove(file)
            print(f"✓ Removed {file.name}")

def organize_installation_files():
    """Move installation files to appropriate platform directories"""
    
    # Windows installation files
    windows_files = [
        ('install_windows.py', 'Agent/Windows/'),
        ('fix_windows_service.py', 'Agent/Windows/'),
        ('fix_service_issue.py', 'Agent/Windows/'),
        ('fix_config_windows.py', 'Agent/Windows/'),
        ('service_wrapper.py', 'Agent/Windows/')  # Platform-specific
    ]
    
    # Linux installation files  
    linux_files = [
        ('install_linux.sh', 'Agent/Linux/')
    ]
    
    for src_file, dest_dir in windows_files + linux_files:
        src = Path(f'Agent/{src_file}')
        dest_dir_path = Path(dest_dir)
        dest = dest_dir_path / src_file
        
        if src.exists():
            dest_dir_path.mkdir(exist_ok=True)
            if not dest.exists():
                shutil.move(src, dest)
                print(f"✓ Moved {src_file} to {dest_dir}")
            else:
                os.remove(src)
                print(f"✓ Removed duplicate {src_file}")

def verify_structure():
    """Verify the final directory structure"""
    print("\n=== Final Directory Structure ===")
    
    agent_dir = Path('Agent')
    for item in sorted(agent_dir.rglob('*')):
        if item.is_file():
            relative_path = item.relative_to(agent_dir)
            print(f"  {relative_path}")

def main():
    """Main cleanup function"""
    print("🧹 Cleaning up Agent directory structure...")
    print("=" * 50)
    
    # Change to project root directory
    script_dir = Path(__file__).parent.parent
    os.chdir(script_dir)
    
    print("1. Creating backup of important files...")
    backup_important_files()
    
    print("\n2. Creating Common directory and moving shared files...")
    create_common_directory()
    
    print("\n3. Organizing installation files...")
    organize_installation_files()
    
    print("\n4. Removing old/duplicate files...")
    cleanup_old_files()
    
    print("\n5. Verifying final structure...")
    verify_structure()
    
    print("\n✅ Cleanup completed!")
    print("\nRecommended structure:")
    print("Agent/")
    print("├── Windows/           # Windows-specific files")
    print("├── Linux/             # Linux-specific files") 
    print("├── Common/            # Shared components")
    print("├── README.md")
    print("└── AGENT_DEPLOYMENT.md")
    
    print("\nBackup created in: Agent_backup/")

if __name__ == '__main__':
    main()
