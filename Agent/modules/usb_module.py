"""
USB Device Detection Module
Collects USB device information from the system
"""

import platform
import subprocess
import json
import re
import os
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
        """Get USB devices on Windows with enhanced connection time tracking"""
        devices = []

        try:
            # Enhanced PowerShell command to get USB devices with connection tracking
            ps_command = """
            $USBDevices = @()

            # Get USB devices with timing information
            Get-WmiObject -Class Win32_USBControllerDevice | ForEach-Object { 
                $Device = [wmi]($_.Dependent)
                if ($Device.Description -notlike "*Hub*" -and 
                    $Device.Description -notlike "*Controller*" -and
                    $Device.Status -eq "OK" -and
                    $Device.Present -eq $true) {

                    # Try to get installation date from registry or system events
                    $InstallDate = $null
                    $ConnectionTime = $null

                    try {
                        # Get device installation date from registry
                        $DeviceKey = "HKLM:\\SYSTEM\\CurrentControlSet\\Enum\\$($Device.DeviceID.Replace('\\', '\\'))"
                        if (Test-Path $DeviceKey) {
                            $InstallDate = (Get-ItemProperty -Path $DeviceKey -Name "InstallDate" -ErrorAction SilentlyContinue).InstallDate
                        }

                        # If no install date, try to get from system events
                        if (-not $InstallDate) {
                            $Events = Get-WinEvent -FilterHashtable @{LogName='System'; ID=20001,20003; StartTime=(Get-Date).AddDays(-30)} -MaxEvents 50 -ErrorAction SilentlyContinue | 
                                Where-Object { $_.Message -like "*$($Device.DeviceID)*" } | 
                                Sort-Object TimeCreated -Descending | 
                                Select-Object -First 1
                            if ($Events) {
                                $ConnectionTime = $Events.TimeCreated.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                            }
                        } else {
                            # Convert FileTime to DateTime
                            $ConnectionTime = [DateTime]::FromFileTime($InstallDate).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        }
                    } catch {
                        # Fallback to current time if we can't determine connection time
                        $ConnectionTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    }

                    # Check if device is storage-related
                    $IsStorageDevice = $false
                    $DeviceType = "other"

                    if ($Device.Description -match "(disk|drive|storage|flash|card|reader)" -or 
                        $Device.Service -eq "USBSTOR" -or 
                        $Device.DeviceID -like "*USBSTOR*") {
                        $IsStorageDevice = $true
                        $DeviceType = "mass_storage"
                    }

                    $USBDevices += [PSCustomObject]@{
                        DeviceID = $Device.DeviceID
                        Description = $Device.Description
                        Manufacturer = $Device.Manufacturer
                        Service = $Device.Service
                        Status = $Device.Status
                        Present = $Device.Present
                        ConnectionTime = $ConnectionTime
                        FirstSeen = $ConnectionTime
                        LastSeen = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                        IsConnected = $true
                        IsStorageDevice = $IsStorageDevice
                        DeviceType = $DeviceType
                        SerialNumber = $Device.PNPDeviceID
                    }
                }
            }

            # Also get removable drives with connection tracking
            Get-WmiObject -Class Win32_LogicalDisk | Where-Object { 
                $_.DriveType -eq 2 -and $_.Size -gt 0 
            } | ForEach-Object {
                $USBDevices += [PSCustomObject]@{
                    DeviceID = "REMOVABLE_$($_.DeviceID)"
                    Description = "Removable Drive ($($_.DeviceID)) - $($_.VolumeName)"
                    Manufacturer = "Unknown"
                    Service = "Mass Storage"
                    Status = "OK"
                    Present = $true
                    ConnectionTime = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    FirstSeen = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    LastSeen = (Get-Date).ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
                    IsConnected = $true
                    IsStorageDevice = $true
                    DeviceType = "mass_storage"
                    SerialNumber = $null
                    VolumeName = $_.VolumeName
                    Size = $_.Size
                    FreeSpace = $_.FreeSpace
                    FileSystem = $_.FileSystem
                }
            }

            $USBDevices | ConvertTo-Json -Depth 3
            """

            result = subprocess.run([
                "powershell", "-Command", ps_command
            ], capture_output=True, text=True, timeout=45)

            if result.returncode == 0 and result.stdout.strip():
                try:
                    usb_data = json.loads(result.stdout.strip())
                    if isinstance(usb_data, dict):
                        usb_data = [usb_data]

                    for device in usb_data:
                        # Only include storage devices and filter out non-storage
                        if device.get('IsStorageDevice', False) or device.get('DeviceType') == 'mass_storage':
                            device_info = {
                                'device_id': device.get('DeviceID', ''),
                                'description': device.get('Description', 'Unknown USB Device'),
                                'manufacturer': device.get('Manufacturer', 'Unknown'),
                                'service': device.get('Service', ''),
                                'status': device.get('Status', 'Connected'),
                                'vendor_id': self._extract_vendor_id(device.get('DeviceID', '')),
                                'product_id': self._extract_product_id(device.get('DeviceID', '')),
                                'device_type': device.get('DeviceType', 'mass_storage'),
                                'connection_time': device.get('ConnectionTime'),
                                'first_seen': device.get('FirstSeen'),
                                'last_seen': device.get('LastSeen'),
                                'is_connected': device.get('IsConnected', True),
                                'is_present': device.get('Present', True),
                                'serial_number': device.get('SerialNumber'),
                                # Additional storage info if available
                                'volume_name': device.get('VolumeName', ''),
                                'size': device.get('Size', 0),
                                'free_space': device.get('FreeSpace', 0),
                                'file_system': device.get('FileSystem', '')
                            }
                            devices.append(device_info)

                except json.JSONDecodeError as e:
                    self.logger.error(f"Error parsing USB device JSON: {e}")

        except Exception as e:
            self.logger.error(f"Error getting Windows USB devices: {e}")

        return devices

    def _get_device_connection_time(self, device_id: str) -> str:
        """Get device connection time on Windows using WMI"""
        if not self.is_windows or not device_id:
            return None

        try:
            # Use PowerShell to get device installation date
            ps_command = f"""
            Get-WmiObject -Class Win32_PnPEntity | 
            Where-Object {{ $_.DeviceID -eq '{device_id}' }} | 
            Select-Object InstallDate | 
            ConvertTo-Json
            """

            result = subprocess.run([
                "powershell", "-Command", ps_command
            ], capture_output=True, text=True, timeout=10)

            if result.returncode == 0 and result.stdout.strip():
                try:
                    data = json.loads(result.stdout.strip())
                    if data and data.get('InstallDate'):
                        # Convert WMI datetime format to ISO format
                        install_date = data['InstallDate']
                        if install_date:
                            # WMI format: 20250903062529.000000+000
                            # Convert to ISO format
                            import datetime
                            dt = datetime.datetime.strptime(install_date[:14], '%Y%m%d%H%M%S')
                            return dt.isoformat()
                except (json.JSONDecodeError, ValueError) as e:
                    self.logger.debug(f"Error parsing connection time: {e}")
        except Exception as e:
            self.logger.debug(f"Error getting connection time for {device_id}: {e}")

        return None

    def _extract_serial_from_device_id(self, device_id: str) -> str:
        """Extract serial number from Windows device ID"""
        if not device_id:
            return None

        # Extract from device ID patterns like USB\VID_xxxx&PID_xxxx\SerialNumber
        match = re.search(r'\\([A-Z0-9&]+)$', device_id, re.IGNORECASE)
        if match:
            serial_part = match.group(1)
            # Remove any trailing & and numbers
            serial = re.sub(r'&\d+$', '', serial_part)
            return serial if len(serial) > 3 else None
        return None

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
                    # Get connection time if available
                    connection_time = self._get_linux_device_connection_time(current_device.get('bus'), current_device.get('device_number'))
                    current_device['connection_time'] = connection_time
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
                        'connection_time': None, # Will be set later if possible
                        'serial_number': None,
                        'bus': bus,
                        'device_number': device_num
                    }

        if current_device:
            # Get connection time for the last device
            connection_time = self._get_linux_device_connection_time(current_device.get('bus'), current_device.get('device_number'))
            current_device['connection_time'] = connection_time
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

    def _get_linux_device_connection_time(self, bus: str, device_num: str) -> str:
        """Get device connection time on Linux systems"""
        try:
            # Try to get from sysfs
            sysfs_path = f"/sys/bus/usb/devices/{bus}-{device_num}"
            if os.path.exists(sysfs_path):
                stat_result = os.stat(sysfs_path)
                return stat_result.st_ctime
        except Exception as e:
            self.logger.debug(f"Could not get connection time for USB device {bus}-{device_num}: {e}")
        return None