
"""
macOS System Information Collector
macOS-specific system information gathering
"""

import os
import platform
import subprocess
import psutil
import logging
from datetime import datetime


class MacOSCollector:
    """macOS-specific system information collector"""
    
    def __init__(self):
        self.logger = logging.getLogger('MacOSCollector')
    
    def get_os_info(self):
        """Get macOS-specific OS information"""
        try:
            info = {}

            try:
                result = subprocess.run(['sw_vers'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if 'ProductName:' in line:
                            info['product_name'] = line.split(':')[1].strip()
                        elif 'ProductVersion:' in line:
                            info['version'] = line.split(':')[1].strip()
                        elif 'BuildVersion:' in line:
                            info['build'] = line.split(':')[1].strip()
            except Exception:
                pass

            # Last update and patches
            try:
                result = subprocess.run(['softwareupdate', '--history'], capture_output=True, text=True, timeout=15)
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    patches = []
                    for line in lines[1:][-10:]:  # skip header
                        parts = line.strip().split()
                        if len(parts) >= 3:
                            patch_name = parts[0]
                            patch_date = ' '.join(parts[1:3])
                            patches.append({"id": patch_name, "installed_on": patch_date})
                    if patches:
                        info['patches'] = patches
            except Exception as e:
                self.logger.warning(f"Failed to collect macOS patch list: {e}")

            return info
        except Exception as e:
            self.logger.error(f"Error getting macOS OS info: {e}")
            return {}
    
    def get_hardware_info(self):
        """Get macOS-specific hardware information"""
        try:
            info = {}
            
            # Get system information using system_profiler
            try:
                result = subprocess.run([
                    'system_profiler', 'SPHardwareDataType'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        line = line.strip()
                        if 'Model Name:' in line:
                            info['model'] = line.split(':', 1)[1].strip()
                        elif 'Model Identifier:' in line:
                            info['model_identifier'] = line.split(':', 1)[1].strip()
                        elif 'Processor Name:' in line:
                            info['cpu_model'] = line.split(':', 1)[1].strip()
                        elif 'Serial Number' in line:
                            info['serial_number'] = line.split(':', 1)[1].strip()
            except Exception as e:
                self.logger.warning(f"system_profiler failed: {e}")
            
            return info
        except Exception as e:
            self.logger.error(f"Error getting macOS hardware info: {e}")
            return {}
    
    def get_usb_devices(self):
        """Get USB devices on macOS"""
        try:
            usb_devices = []
            result = subprocess.run([
                'system_profiler', 'SPUSBDataType'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    line = line.strip()
                    if 'Product ID:' in line:
                        # This is a basic implementation - could be enhanced
                        usb_devices.append({'description': line})
            
            return usb_devices
        except Exception as e:
            self.logger.error(f"Error getting macOS USB devices: {e}")
            return []
    
    def get_security_info(self):
        """Get macOS security information"""
        try:
            info = {}
            
            # Check firewall status
            try:
                result = subprocess.run([
                    'sudo', '/usr/libexec/ApplicationFirewall/socketfilterfw', '--getglobalstate'
                ], capture_output=True, text=True, timeout=10)
                
                if result.returncode == 0:
                    info['firewall_status'] = 'enabled' if 'enabled' in result.stdout.lower() else 'disabled'
                else:
                    info['firewall_status'] = 'unknown'
            except Exception:
                info['firewall_status'] = 'unknown'
            
            # Basic antivirus detection (look for common processes)
            av_processes = ['sophos', 'avast', 'avg', 'norton', 'mcafee']
            info['antivirus_status'] = 'unknown'
            for proc in psutil.process_iter(['name']):
                try:
                    if any(av in proc.info['name'].lower() for av in av_processes):
                        info['antivirus_status'] = 'enabled'
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
            
            return info
        except Exception as e:
            self.logger.error(f"Error collecting macOS security info: {e}")
            return {}
    
    def get_software_info(self):
        """Get installed software on macOS"""
        try:
            software = []
            
            # Get applications from /Applications
            try:
                result = subprocess.run([
                    'ls', '/Applications'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    for app in result.stdout.split('\n'):
                        if app.strip() and app.endswith('.app'):
                            software.append({
                                'name': app.replace('.app', ''),
                                'version': 'unknown',
                                'vendor': 'unknown'
                            })
            except Exception:
                pass
            
            # Limit to top 50 packages to avoid overwhelming the API
            return software[:50]
        except Exception as e:
            self.logger.error(f"Error getting macOS software info: {e}")
            return []
    
    def get_virtualization_info(self):
        """Detect if running in a virtual machine on macOS"""
        try:
            vm_info = {
                'is_virtual': False,
                'hypervisor': 'unknown',
                'detection_methods': []
            }
            
            # Check for common VM indicators
            try:
                result = subprocess.run([
                    'system_profiler', 'SPHardwareDataType'
                ], capture_output=True, text=True, timeout=30)
                
                if result.returncode == 0:
                    content = result.stdout.lower()
                    if 'vmware' in content:
                        vm_info['is_virtual'] = True
                        vm_info['hypervisor'] = 'vmware'
                        vm_info['detection_methods'].append('system_profiler_vmware')
                    elif 'virtualbox' in content:
                        vm_info['is_virtual'] = True
                        vm_info['hypervisor'] = 'virtualbox'
                        vm_info['detection_methods'].append('system_profiler_virtualbox')
                    elif 'parallels' in content:
                        vm_info['is_virtual'] = True
                        vm_info['hypervisor'] = 'parallels'
                        vm_info['detection_methods'].append('system_profiler_parallels')
            except Exception:
                pass
            
            return vm_info
        except Exception as e:
            self.logger.error(f"Error detecting macOS virtualization: {e}")
            return {'is_virtual': False, 'hypervisor': 'unknown', 'detection_methods': []}
