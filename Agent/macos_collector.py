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
        """Get USB storage devices on macOS"""
        try:
            usb_devices = []

            # Method 1: Get USB storage devices using system_profiler
            try:
                result = subprocess.run([
                    'system_profiler', 'SPUSBDataType', '-json'
                ], capture_output=True, text=True, timeout=30)

                if result.returncode == 0:
                    import json
                    data = json.loads(result.stdout)

                    def extract_storage_devices(items):
                        devices = []
                        for item in items:
                            if isinstance(item, dict):
                                name = item.get('_name', 'Unknown USB Device')

                                # Check if this is a storage device
                                if self._is_storage_device_macos(name, item):
                                    size = item.get('size', 'Unknown size')
                                    serial = item.get('serial_num', '')
                                    devices.append({
                                        'description': f"{name} - {size}",
                                        'device_id': serial or name,
                                        'device_type': 'USB Storage'
                                    })

                                # Recursively check for nested devices
                                if '_items' in item:
                                    devices.extend(extract_storage_devices(item['_items']))
                        return devices

                    if 'SPUSBDataType' in data:
                        usb_devices = extract_storage_devices(data['SPUSBDataType'])
            except Exception as e:
                self.logger.debug(f"system_profiler USB failed: {e}")

            # Method 2: Check for mounted volumes that are USB
            try:
                result = subprocess.run(['diskutil', 'list', '-plist'], capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    import plistlib
                    plist_data = plistlib.loads(result.stdout.encode())

                    for disk in plist_data.get('AllDisks', []):
                        try:
                            info_result = subprocess.run(['diskutil', 'info', '-plist', disk], 
                                                       capture_output=True, text=True, timeout=5)
                            if info_result.returncode == 0:
                                disk_info = plistlib.loads(info_result.stdout.encode())

                                # Check if it's a USB device
                                protocol = disk_info.get('BusProtocol', '').lower()
                                if 'usb' in protocol:
                                    device_name = disk_info.get('VolumeName', disk_info.get('DeviceIdentifier', disk))
                                    size = disk_info.get('TotalSize', 0)
                                    size_gb = round(size / (1024**3), 2) if size else 0

                                    # Check if already added
                                    if not any(device_name in dev['description'] for dev in usb_devices):
                                        usb_devices.append({
                                            'description': f"{device_name} - {size_gb}GB",
                                            'device_id': disk,
                                            'device_type': 'USB Storage'
                                        })
                        except Exception:
                            continue
            except Exception as e:
                self.logger.debug(f"diskutil failed: {e}")

            return usb_devices
        except Exception as e:
            self.logger.error(f"Error getting macOS USB storage devices: {e}")
            return []

    def _is_storage_device_macos(self, name, item_data):
        """Check if USB device is a storage device on macOS"""
        storage_keywords = [
            'storage', 'drive', 'disk', 'flash', 'thumb', 'memory', 'card',
            'external', 'portable', 'mass storage', 'ssd', 'hdd', 'usb drive',
            'sd card', 'micro sd', 'cf card', 'compact flash'
        ]

        exclude_keywords = [
            'keyboard', 'mouse', 'audio', 'bluetooth', 'wireless', 'wifi',
            'network', 'camera', 'webcam', 'microphone', 'speaker', 'headset',
            'gaming', 'controller', 'trackpad', 'fingerprint', 'biometric',
            'hub', 'root', 'input', 'pointing', 'composite', 'receiver'
        ]

        name_lower = name.lower()

        # Exclude non-storage devices
        for exclude in exclude_keywords:
            if exclude in name_lower:
                return False

        # Include storage devices
        for storage in storage_keywords:
            if storage in name_lower:
                return True

        # Check bcd_device or other indicators
        bcd_device = item_data.get('bcd_device', '')
        if 'mass storage' in str(bcd_device).lower():
            return True

        # Check product_id for known storage device patterns
        product_id = item_data.get('product_id', '')
        if product_id and any(storage in str(product_id).lower() for storage in ['storage', 'disk', 'drive']):
            return True

        return False

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