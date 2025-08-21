
"""
Memory Information Collection Module
Collects memory and swap-related system information
"""

import psutil
from typing import Dict, Any
from .base_module import BaseModule


class MemoryModule(BaseModule):
    """Memory information collection module"""
    
    def __init__(self):
        super().__init__('Memory')
    
    def collect(self) -> Dict[str, Any]:
        """Collect memory information"""
        memory_info = {
            'virtual_memory': self._get_virtual_memory(),
            'swap_memory': self._get_swap_memory(),
            'memory_pressure': self._get_memory_pressure()
        }
        
        return memory_info
    
    def _get_virtual_memory(self) -> Dict[str, Any]:
        """Get virtual memory information"""
        try:
            memory = psutil.virtual_memory()
            return {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'percentage': memory.percent,
                'free': memory.free if hasattr(memory, 'free') else None,
                'active': memory.active if hasattr(memory, 'active') else None,
                'inactive': memory.inactive if hasattr(memory, 'inactive') else None,
                'buffers': memory.buffers if hasattr(memory, 'buffers') else None,
                'cached': memory.cached if hasattr(memory, 'cached') else None,
                'shared': memory.shared if hasattr(memory, 'shared') else None
            }
        except Exception as e:
            self.logger.error(f"Failed to get virtual memory info: {e}")
            return {
                'total': 0,
                'available': 0,
                'used': 0,
                'percentage': 0
            }
    
    def _get_swap_memory(self) -> Dict[str, Any]:
        """Get swap memory information"""
        try:
            swap = psutil.swap_memory()
            return {
                'total': swap.total,
                'used': swap.used,
                'free': swap.free,
                'percentage': swap.percent,
                'sin': swap.sin if hasattr(swap, 'sin') else None,
                'sout': swap.sout if hasattr(swap, 'sout') else None
            }
        except Exception as e:
            self.logger.error(f"Failed to get swap memory info: {e}")
            return {
                'total': 0,
                'used': 0,
                'free': 0,
                'percentage': 0
            }
    
    def _get_memory_pressure(self) -> Dict[str, Any]:
        """Calculate memory pressure indicators"""
        try:
            memory = psutil.virtual_memory()
            swap = psutil.swap_memory()
            
            # Calculate pressure level
            if memory.percent > 90:
                pressure_level = 'critical'
            elif memory.percent > 75:
                pressure_level = 'high'
            elif memory.percent > 50:
                pressure_level = 'medium'
            else:
                pressure_level = 'low'
            
            return {
                'pressure_level': pressure_level,
                'memory_usage_percent': memory.percent,
                'swap_usage_percent': swap.percent,
                'available_gb': round(memory.available / (1024**3), 2),
                'total_gb': round(memory.total / (1024**3), 2)
            }
        except Exception as e:
            self.logger.error(f"Failed to calculate memory pressure: {e}")
            return {
                'pressure_level': 'unknown',
                'memory_usage_percent': 0,
                'swap_usage_percent': 0
            }
