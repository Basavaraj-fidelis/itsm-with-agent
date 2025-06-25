
#!/usr/bin/env python3
"""
Fix ITSM Agent Service Issues
Fixes the missing config_validator module and restarts the service
"""

import os
import sys
import shutil
import subprocess
from pathlib import Path


def check_admin_privileges():
    """Check if running with administrator privileges"""
    try:
        import ctypes
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False


def copy_missing_files():
    """Copy missing files to installation directory"""
    try:
        script_dir = Path(__file__).parent
        install_dir = Path("C:\\Program Files\\ITSM Agent")
        
        if not install_dir.exists():
            print("✗ Installation directory not found")
            return False
        
        # List of files that might be missing
        missing_files = [
            'config_validator.py',
            'network_monitor.py', 
            'performance_baseline.py'
        ]
        
        success_count = 0
        for filename in missing_files:
            source_file = script_dir / filename
            dest_file = install_dir / filename
            
            if not source_file.exists():
                print(f"✗ Source {filename} not found")
                continue
                
            if dest_file.exists():
                print(f"✓ {filename} already exists")
                success_count += 1
                continue
            
            try:
                shutil.copy2(source_file, dest_file)
                print(f"✓ Copied {filename} to {dest_file}")
                success_count += 1
            except Exception as e:
                print(f"✗ Failed to copy {filename}: {e}")
        
        return success_count > 0
        
    except Exception as e:
        print(f"✗ Failed to copy files: {e}")
        return False


def restart_service():
    """Restart the ITSM Agent service"""
    try:
        print("Stopping ITSM Agent service...")
        result = subprocess.run(['sc', 'stop', 'ITSMAgent'], 
                              capture_output=True, text=True)
        
        # Wait a moment for service to stop
        import time
        time.sleep(3)
        
        print("Starting ITSM Agent service...")
        result = subprocess.run(['sc', 'start', 'ITSMAgent'], 
                              capture_output=True, text=True)
        
        if result.returncode == 0:
            print("✓ Service restarted successfully")
            
            # Check service status
            time.sleep(2)
            status_result = subprocess.run(['sc', 'query', 'ITSMAgent'], 
                                         capture_output=True, text=True)
            
            if 'RUNNING' in status_result.stdout:
                print("✓ Service is now running")
                return True
            else:
                print("Service status:")
                print(status_result.stdout)
                return False
        else:
            print(f"✗ Failed to start service: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"✗ Error restarting service: {e}")
        return False


def test_agent():
    """Test if the agent can import all modules"""
    try:
        install_dir = Path("C:\\Program Files\\ITSM Agent")
        os.chdir(install_dir)
        
        print("Testing agent module imports...")
        result = subprocess.run([
            sys.executable, '-c', 
            'import itsm_agent, system_collector, api_client, config_validator; print("All modules imported successfully")'
        ], capture_output=True, text=True, timeout=10)
        
        if result.returncode == 0:
            print("✓ All modules import successfully")
            return True
        else:
            print(f"✗ Module import test failed: {result.stderr}")
            return False
            
    except Exception as e:
        print(f"✗ Module test failed: {e}")
        return False


def main():
    """Main function"""
    print("ITSM Agent Service Fix Utility")
    print("=" * 40)
    print()
    
    if not check_admin_privileges():
        print("✗ This script must be run as Administrator")
        print("Right-click on Command Prompt and select 'Run as Administrator'")
        input("Press Enter to exit...")
        return 1
    
    print("Fixing ITSM Agent service issues...")
    print()
    
    # Step 1: Copy missing files
    if not copy_missing_files():
        print("Failed to copy missing files")
        input("Press Enter to exit...")
        return 1
    
    # Step 2: Test imports
    if not test_agent():
        print("Module import test failed")
        input("Press Enter to exit...")
        return 1
    
    # Step 3: Restart service
    if not restart_service():
        print("Failed to restart service")
        input("Press Enter to exit...")
        return 1
    
    print()
    print("✓ Service fix completed successfully!")
    print()
    print("The ITSM Agent service should now be running properly.")
    print("You can check the service status with: sc query ITSMAgent")
    print()
    
    input("Press Enter to exit...")
    return 0


if __name__ == "__main__":
    sys.exit(main())
