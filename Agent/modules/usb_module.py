
"""
USB Device Detection Module
Collects USB device information from the system
"""

import platform
import subprocess
import json
import re
from typing import Dict, Any, List
from .base_module import BaseModule


class USBModule(BaseModule):
    """USB device detection module"""
    
    def __init__(self):
        super().__init__('USB')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
        self.is_macos = platform.system().lower() == 'darwin'
    
    def collect(self) -> Dict[str, Any]:
        """Collect USB device information"""
        usb_info = {
            'usb_devices': self._get_usb_devices(),
            'total_usb_devices': 0,
            'mass_storage_devices': 0,
            'input_devices': 0,
            'other_devices': 0
        }
        
        # Count device types
        devices = usb_info['usb_devices']
        usb_info['total_usb_devices'] = len(devices)
        
        for device in devices:
            device_type = device.get('device_type', 'other').lower()
            if 'storage' in device_type or 'mass' in device_type:
                usb_info['mass_storage_devices'] += 1
            elif 'keyboard' in device_type or 'mouse' in device_type or 'input' in device_type:
                usb_info['input_devices'] += 1
            else:
                usb_info['other_devices'] += 1
        
        return usb_info
    
    def _get_usb_devices(self) -> List[Dict[str, Any]]:
        """Get USB devices based on operating system"""
        try:
            if self.is_windows:
                return self._get_windows_usb_devices()
            elif self.is_linux:
                return self._get_linux_usb_devices()
            elif self.is_macos:
                return self._get_macos_usb_devices()
        except Exception as e:
            self.logger.error(f"Error getting USB devices: {e}")
        
        return []
    
    def _get_windows_usb_devices(self) -> List[Dict[str, Any]]:
        """Get USB devices on Windows"""
        devices = []
        
        try:
            # Get USB devices using WMI
            ps_command = """
            Get-WmiObject -Class Win32_USBControllerDevice | 
            ForEach-Object { 
                [wmi]($_.Dependent) 
            } | 
            Where-Object { 
                $_.Description -notlike "*Hub*" -and $_.Description -notlike "*Controller*" 
            } | 
            Select-Object DeviceID, Description, Manufacturer, Service, Status | 
            ConvertTo-Json -Depth 3
            """
            
            result = subprocess.run([
                "powershell", "-Command", ps_command
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0 and result.stdout.strip():
                try:
                    usb_data = json.loads(result.stdout.strip())
                    if isinstance(usb_data, dict):
                        usb_data = [usb_data]
                    
                    for device in usb_data:
                        device_info = {
                            'device_id': device.get('DeviceID', ''),
                            'description': device.get('Description', 'Unknown USB Device'),
                            'manufacturer': device.get('Manufacturer', 'Unknown'),
                            'service': device.get('Service', ''),
                            'status': device.get('Status', 'Unknown'),
                            'vendor_id': self._extract_vendor_id(device.get('DeviceID', '')),
                            'product_id': self._extract_product_id(device.get('DeviceID', '')),
                            'device_type': self._categorize_device(device.get('Description', '')),
                            'connection_time': None,
                            'serial_number': None
                        }
                        devices.append(device_info)
                        
                except json.JSONDecodeError as e:
                    self.logger.error(f"Error parsing USB device JSON: {e}")
            
            # Also try to get removable drives
            drives_command = """
            Get-WmiObject -Class Win32_LogicalDisk | 
            Where-Object { $_.DriveType -eq 2 } | 
            Select-Object DeviceID, VolumeName, Size, FreeSpace, FileSystem | 
            ConvertTo-Json -Depth 3
            """
            
            drives_result = subprocess.run([
                "powershell", "-Command", drives_command
            ], capture_output=True, text=True, timeout=15)
            
            if drives_result.returncode == 0 and drives_result.stdout.strip():
                try:
                    drives_data = json.loads(drives_result.stdout.strip())
                    if isinstance(drives_data, dict):
                        drives_data = [drives_data]
                    
                    for drive in drives_data:
                        device_info = {
                            'device_id': f"REMOVABLE_{drive.get('DeviceID', '')}",
                            'description': f"Removable Drive ({drive.get('DeviceID', '')})",
                            'manufacturer': 'Unknown',
                            'service': 'Mass Storage',
                            'status': 'OK',
                            'vendor_id': 'unknown',
                            'product_id': 'unknown',
                            'device_type': 'mass_storage',
                            'connection_time': None,
                            'serial_number': None,
                            'volume_name': drive.get('VolumeName', ''),
                            'size': drive.get('Size', 0),
                            'free_space': drive.get('FreeSpace', 0),
                            'file_system': drive.get('FileSystem', '')
                        }
                        devices.append(device_info)
                        
                except json.JSONDecodeError as e:
                    self.logger.error(f"Error parsing removable drives JSON: {e}")
                    
        except Exception as e:
            self.logger.error(f"Error getting Windows USB devices: {e}")
        
        return devices
    
    def _get_linux_usb_devices(self) -> List[Dict[str, Any]]:
        """Get USB devices on Linux"""
        devices = []
        
        try:
            # Try lsusb command
            if self._command_exists('lsusb'):
                result = subprocess.run(['lsusb', '-v'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    devices = self._parse_lsusb_output(result.stdout)
            
            # Also check for mounted USB storage devices
            try:
                mount_result = subprocess.run(['mount'], 
                                            capture_output=True, text=True, timeout=10)
                if mount_result.returncode == 0:
                    usb_mounts = self._parse_usb_mounts(mount_result.stdout)
                    devices.extend(usb_mounts)
            except Exception as e:
                self.logger.debug(f"Error getting USB mounts: {e}")
                
        except Exception as e:
            self.logger.error(f"Error getting Linux USB devices: {e}")
        
        return devices
    
    def _get_macos_usb_devices(self) -> List[Dict[str, Any]]:
        """Get USB devices on macOS"""
        devices = []
        
        try:
            result = subprocess.run([
                'system_profiler', 'SPUSBDataType', '-json'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                try:
                    usb_data = json.loads(result.stdout)
                    devices = self._parse_macos_usb_data(usb_data)
                except json.JSONDecodeError as e:
                    self.logger.error(f"Error parsing macOS USB JSON: {e}")
                    
        except Exception as e:
            self.logger.error(f"Error getting macOS USB devices: {e}")
        
        return devices
    
    def _extract_vendor_id(self, device_id: str) -> str:
        """Extract vendor ID from device ID"""
        match = re.search(r'VID_([0-9A-F]{4})', device_id, re.IGNORECASE)
        return match.group(1).lower() if match else 'unknown'
    
    def _extract_product_id(self, device_id: str) -> str:
        """Extract product ID from device ID"""
        match = re.search(r'PID_([0-9A-F]{4})', device_id, re.IGNORECASE)
        return match.group(1).lower() if match else 'unknown'
    
    def _categorize_device(self, description: str) -> str:
        """Categorize USB device based on description"""
        desc_lower = description.lower()
        
        if any(keyword in desc_lower for keyword in ['storage', 'disk', 'drive', 'flash']):
            return 'mass_storage'
        elif any(keyword in desc_lower for keyword in ['keyboard', 'kbd']):
            return 'keyboard'
        elif any(keyword in desc_lower for keyword in ['mouse', 'pointing']):
            return 'mouse'
        elif any(keyword in desc_lower for keyword in ['camera', 'webcam', 'video']):
            return 'webcam'
        elif any(keyword in desc_lower for keyword in ['audio', 'sound', 'speaker', 'microphone']):
            return 'audio'
        elif any(keyword in desc_lower for keyword in ['network', 'ethernet', 'wifi', 'wireless']):
            return 'network'
        elif any(keyword in desc_lower for keyword in ['printer', 'scanner']):
            return 'printer'
        elif any(keyword in desc_lower for keyword in ['hub']):
            return 'hub'
        else:
            return 'other'
    
    def _parse_lsusb_output(self, output: str) -> List[Dict[str, Any]]:
        """Parse lsusb command output"""
        devices = []
        current_device = None
        
        for line in output.split('\n'):
            line = line.strip()
            
            # Bus line indicates start of new device
            if line.startswith('Bus '):
                if current_device:
                    devices.append(current_device)
                
                # Parse: Bus 001 Device 002: ID 1d6b:0003 Linux Foundation 3.0 root hub
                parts = line.split()
                if len(parts) >= 6:
                    bus = parts[1]
                    device_num = parts[3].rstrip(':')
                    vendor_product = parts[5] if len(parts) > 5 else 'unknown:unknown'
                    vendor_id, product_id = vendor_product.split(':') if ':' in vendor_product else ('unknown', 'unknown')
                    description = ' '.join(parts[6:]) if len(parts) > 6 else 'Unknown USB Device'
                    
                    current_device = {
                        'device_id': f"USB_{bus}_{device_num}",
                        'description': description,
                        'manufacturer': 'Unknown',
                        'service': '',
                        'status': 'Connected',
                        'vendor_id': vendor_id,
                        'product_id': product_id,
                        'device_type': self._categorize_device(description),
                        'connection_time': None,
                        'serial_number': None,
                        'bus': bus,
                        'device_number': device_num
                    }
        
        if current_device:
            devices.append(current_device)
        
        return devices
    
    def _parse_usb_mounts(self, mount_output: str) -> List[Dict[str, Any]]:
        """Parse mounted USB storage devices"""
        devices = []
        
        for line in mount_output.split('\n'):
            if '/media/' in line or '/mnt/' in line:
                parts = line.split()
                if len(parts) >= 3:
                    device_path = parts[0]
                    mount_point = parts[2]
                    
                    if 'usb' in mount_point.lower() or 'media' in mount_point.lower():
                        device_info = {
                            'device_id': f"MOUNT_{device_path.replace('/', '_')}",
                            'description': f"USB Storage Device ({device_path})",
                            'manufacturer': 'Unknown',
                            'service': 'Mass Storage',
                            'status': 'Mounted',
                            'vendor_id': 'unknown',
                            'product_id': 'unknown',
                            'device_type': 'mass_storage',
                            'connection_time': None,
                            'serial_number': None,
                            'mount_point': mount_point,
                            'device_path': device_path
                        }
                        devices.append(device_info)
        
        return devices
    
    def _parse_macos_usb_data(self, usb_data: dict) -> List[Dict[str, Any]]:
        """Parse macOS system_profiler USB data"""
        devices = []
        
        def parse_usb_items(items, parent_name=''):
            for item in items:
                if isinstance(item, dict):
                    name = item.get('_name', 'Unknown USB Device')
                    vendor_id = item.get('vendor_id', 'unknown')
                    product_id = item.get('product_id', 'unknown')
                    
                    device_info = {
                        'device_id': f"USB_{vendor_id}_{product_id}",
                        'description': name,
                        'manufacturer': item.get('manufacturer', 'Unknown'),
                        'service': '',
                        'status': 'Connected',
                        'vendor_id': vendor_id.replace('0x', '') if isinstance(vendor_id, str) else 'unknown',
                        'product_id': product_id.replace('0x', '') if isinstance(product_id, str) else 'unknown',
                        'device_type': self._categorize_device(name),
                        'connection_time': None,
                        'serial_number': item.get('serial_num', None),
                        'location_id': item.get('location_id', None)
                    }
                    devices.append(device_info)
                    
                    # Recursively parse nested items
                    if '_items' in item:
                        parse_usb_items(item['_items'], name)
        
        if 'SPUSBDataType' in usb_data:
            parse_usb_items(usb_data['SPUSBDataType'])
        
        return devices
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists in the system"""
        try:
            result = subprocess.run(['which', command], 
                                  capture_output=True, text=True, timeout=5)
            return result.returncode == 0
        except Exception:
            return False
