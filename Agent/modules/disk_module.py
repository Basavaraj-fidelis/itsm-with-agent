
"""
Disk Information Collection Module
Collects disk and storage-related system information
"""

import psutil
import platform
import os
from typing import Dict, Any, List
from .base_module import BaseModule


class DiskModule(BaseModule):
    """Disk information collection module"""
    
    def __init__(self):
        super().__init__('Disk')
        self.is_windows = platform.system().lower() == 'windows'
    
    def collect(self) -> Dict[str, Any]:
        """Collect disk information"""
        disk_info = {
            'partitions': self._get_disk_partitions(),
            'io_counters': self._get_disk_io_counters(),
            'smart_data': self._get_smart_data(),
            'health_summary': self._get_disk_health_summary()
        }
        
        return disk_info
    
    def _get_disk_partitions(self) -> List[Dict[str, Any]]:
        """Get disk partition information"""
        partitions = []
        
        try:
            disk_partitions = psutil.disk_partitions()
        except Exception as e:
            self.logger.error(f"Failed to get disk partitions: {e}")
            return partitions
        
        for partition in disk_partitions:
            try:
                partition_info = self._get_partition_info(partition)
                if partition_info:
                    partitions.append(partition_info)
            except Exception as e:
                self.logger.debug(f"Error processing partition {partition.device}: {e}")
                continue
        
        # If no partitions found on Windows, try to get system drive
        if not partitions and self.is_windows:
            partitions.extend(self._get_windows_system_drive())
        
        return partitions
    
    def _get_partition_info(self, partition) -> Dict[str, Any]:
        """Get information for a single partition"""
        partition_info = {
            'device': partition.device,
            'mountpoint': partition.mountpoint,
            'filesystem': partition.fstype or 'unknown'
        }
        
        # Skip problematic mount points on Windows
        if self.is_windows and partition.mountpoint in ['A:\\', 'B:\\']:
            return None
        
        try:
            usage = psutil.disk_usage(partition.mountpoint)
            if usage.total > 0:  # Only include drives with actual size
                partition_info.update({
                    'total': usage.total,
                    'used': usage.used,
                    'free': usage.free,
                    'percentage': round((usage.used / usage.total) * 100, 2)
                })
            else:
                return None  # Skip empty drives
        except (PermissionError, OSError) as e:
            self.logger.debug(f"Cannot access {partition.mountpoint}: {e}")
            return None
        except Exception as e:
            self.logger.warning(f"Error getting disk usage for {partition.mountpoint}: {e}")
            return None
        
        # Add I/O statistics if available
        partition_info['io_stats'] = self._get_partition_io_stats(partition.device)
        
        return partition_info
    
    def _get_partition_io_stats(self, device: str) -> Dict[str, Any]:
        """Get I/O statistics for a partition"""
        try:
            io_counters = psutil.disk_io_counters(perdisk=True)
            if not io_counters:
                return {}
            
            # Try different device name formats
            device_variants = [
                device.replace('/dev/', '').replace('\\', ''),
                device.replace(':', ''),
                device.split('\\')[-1] if '\\' in device else device
            ]
            
            for device_name in device_variants:
                if device_name in io_counters:
                    io = io_counters[device_name]
                    return {
                        'read_count': io.read_count,
                        'write_count': io.write_count,
                        'read_bytes': io.read_bytes,
                        'write_bytes': io.write_bytes,
                        'read_time': io.read_time,
                        'write_time': io.write_time
                    }
        except Exception as e:
            self.logger.debug(f"Could not get I/O stats for {device}: {e}")
        
        return {}
    
    def _get_windows_system_drive(self) -> List[Dict[str, Any]]:
        """Get Windows system drive info as fallback"""
        try:
            system_drive = os.environ.get('SystemDrive', 'C:') + '\\'
            usage = psutil.disk_usage(system_drive)
            return [{
                'device': system_drive,
                'mountpoint': system_drive,
                'filesystem': 'NTFS',
                'total': usage.total,
                'used': usage.used,
                'free': usage.free,
                'percentage': round((usage.used / usage.total) * 100, 2)
            }]
        except Exception as e:
            self.logger.warning(f"Could not get system drive info: {e}")
            return []
    
    def _get_disk_io_counters(self) -> Dict[str, Any]:
        """Get overall disk I/O counters"""
        try:
            io_counters = psutil.disk_io_counters()
            if io_counters:
                return {
                    'read_count': io_counters.read_count,
                    'write_count': io_counters.write_count,
                    'read_bytes': io_counters.read_bytes,
                    'write_bytes': io_counters.write_bytes,
                    'read_time': io_counters.read_time,
                    'write_time': io_counters.write_time
                }
        except Exception as e:
            self.logger.error(f"Failed to get disk I/O counters: {e}")
        
        return {}
    
    def _get_smart_data(self) -> List[Dict[str, Any]]:
        """Get SMART disk health data (Linux only)"""
        smart_data = []
        
        if not platform.system().lower() == 'linux':
            return smart_data
        
        if not os.path.exists('/usr/sbin/smartctl'):
            return smart_data
        
        try:
            import subprocess
            
            # Get list of drives
            result = subprocess.run([
                'sudo', '/usr/sbin/smartctl', '--scan'
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if line.strip() and '/dev/' in line:
                        device = line.split()[0]
                        smart_info = self._get_device_smart_info(device)
                        if smart_info:
                            smart_data.append(smart_info)
        except Exception as e:
            self.logger.debug(f"Failed to get SMART data: {e}")
        
        return smart_data
    
    def _get_device_smart_info(self, device: str) -> Dict[str, Any]:
        """Get SMART information for a specific device"""
        try:
            import subprocess
            
            # Get SMART health status
            health_result = subprocess.run([
                'sudo', '/usr/sbin/smartctl', '-H', device
            ], capture_output=True, text=True, timeout=30)
            
            if health_result.returncode == 0:
                health_status = 'unknown'
                for line in health_result.stdout.split('\n'):
                    if 'SMART overall-health' in line:
                        health_status = line.split(':')[1].strip()
                        break
                
                return {
                    'device': device,
                    'health_status': health_status
                }
        except Exception as e:
            self.logger.debug(f"Failed to get SMART info for {device}: {e}")
        
        return None
    
    def _get_disk_health_summary(self) -> Dict[str, Any]:
        """Get overall disk health summary"""
        try:
            partitions = self._get_disk_partitions()
            
            total_disks = len(partitions)
            high_usage_disks = len([p for p in partitions if p.get('percentage', 0) > 90])
            warning_usage_disks = len([p for p in partitions if 75 <= p.get('percentage', 0) <= 90])
            
            if high_usage_disks > 0:
                status = 'critical'
            elif warning_usage_disks > 0:
                status = 'warning'
            else:
                status = 'healthy'
            
            return {
                'status': status,
                'total_disks': total_disks,
                'high_usage_disks': high_usage_disks,
                'warning_usage_disks': warning_usage_disks,
                'note': 'Basic disk health check based on usage percentage'
            }
        except Exception as e:
            self.logger.error(f"Failed to get disk health summary: {e}")
            return {
                'status': 'unknown',
                'note': 'Failed to calculate disk health'
            }
