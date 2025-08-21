
"""
CPU Information Collection Module
Collects CPU-related system information
"""

import platform
import psutil
import os
from typing import Dict, Any
from .base_module import BaseModule


class CPUModule(BaseModule):
    """CPU information collection module"""
    
    def __init__(self):
        super().__init__('CPU')
    
    def collect(self) -> Dict[str, Any]:
        """Collect CPU information"""
        cpu_info = {
            'physical_cores': self._get_physical_cores(),
            'logical_cores': self._get_logical_cores(),
            'frequency': self._get_frequency_info(),
            'usage_percent': self._get_usage_percent(),
            'load_average': self._get_load_average(),
            'model': self._get_cpu_model(),
            'architecture': self._get_architecture(),
            'temperature': self._get_temperature()
        }
        
        return cpu_info
    
    def _get_physical_cores(self) -> int:
        """Get number of physical CPU cores"""
        try:
            return psutil.cpu_count(logical=False) or 0
        except Exception as e:
            self.logger.debug(f"Failed to get physical cores: {e}")
            return 0
    
    def _get_logical_cores(self) -> int:
        """Get number of logical CPU cores"""
        try:
            return psutil.cpu_count(logical=True) or 0
        except Exception as e:
            self.logger.debug(f"Failed to get logical cores: {e}")
            return 0
    
    def _get_frequency_info(self) -> Dict[str, Any]:
        """Get CPU frequency information"""
        try:
            freq = psutil.cpu_freq()
            if freq:
                return {
                    'current': freq.current,
                    'min': freq.min,
                    'max': freq.max
                }
        except Exception as e:
            self.logger.debug(f"Failed to get CPU frequency: {e}")
        
        return {'current': None, 'min': None, 'max': None}
    
    def _get_usage_percent(self) -> float:
        """Get CPU usage percentage"""
        try:
            return psutil.cpu_percent(interval=1)
        except Exception as e:
            self.logger.debug(f"Failed to get CPU usage: {e}")
            return 0.0
    
    def _get_load_average(self) -> Dict[str, float]:
        """Get system load averages (Unix-like systems only)"""
        try:
            if hasattr(os, 'getloadavg'):
                load1, load5, load15 = os.getloadavg()
                return {
                    'load_1min': load1,
                    'load_5min': load5,
                    'load_15min': load15
                }
        except Exception as e:
            self.logger.debug(f"Failed to get load average: {e}")
        
        return {'load_1min': None, 'load_5min': None, 'load_15min': None}
    
    def _get_cpu_model(self) -> str:
        """Get CPU model information"""
        try:
            system = platform.system().lower()
            
            if system == 'windows':
                return self._get_windows_cpu_model()
            elif system == 'linux':
                return self._get_linux_cpu_model()
            else:
                return platform.processor()
        except Exception as e:
            self.logger.debug(f"Failed to get CPU model: {e}")
            return 'Unknown'
    
    def _get_windows_cpu_model(self) -> str:
        """Get CPU model on Windows"""
        try:
            import winreg
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                              r"HARDWARE\DESCRIPTION\System\CentralProcessor\0") as key:
                return winreg.QueryValueEx(key, "ProcessorNameString")[0]
        except Exception:
            return platform.processor()
    
    def _get_linux_cpu_model(self) -> str:
        """Get CPU model on Linux"""
        try:
            with open('/proc/cpuinfo', 'r') as f:
                for line in f:
                    if line.startswith('model name'):
                        return line.split(':', 1)[1].strip()
        except Exception:
            pass
        return platform.processor()
    
    def _get_architecture(self) -> str:
        """Get CPU architecture"""
        try:
            return platform.architecture()[0]
        except Exception as e:
            self.logger.debug(f"Failed to get CPU architecture: {e}")
            return 'Unknown'
    
    def _get_temperature(self) -> Dict[str, Any]:
        """Get CPU temperature if available"""
        try:
            if hasattr(psutil, 'sensors_temperatures'):
                temps = psutil.sensors_temperatures()
                if temps:
                    for name, entries in temps.items():
                        if 'cpu' in name.lower() or 'core' in name.lower():
                            return [{'label': entry.label, 'current': entry.current} for entry in entries]
        except Exception as e:
            self.logger.debug(f"Failed to get CPU temperature: {e}")
        
        return None
