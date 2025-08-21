
"""
Module Manager
Coordinates all system information collection modules
"""

import logging
from typing import Dict, Any, List, Optional
from .base_module import BaseModule

# Import modules with error handling
try:
    from .system_module import SystemModule
except ImportError as e:
    SystemModule = None

try:
    from .cpu_module import CPUModule
except ImportError as e:
    CPUModule = None

try:
    from .memory_module import MemoryModule
except ImportError as e:
    MemoryModule = None

try:
    from .disk_module import DiskModule
except ImportError as e:
    DiskModule = None

try:
    from .network_module import NetworkModule
except ImportError as e:
    NetworkModule = None

try:
    from .services_module import ServicesModule
except ImportError as e:
    ServicesModule = None

try:
    from .security_module import SecurityModule
except ImportError as e:
    SecurityModule = None


class ModuleManager:
    """Manages all system information collection modules"""
    
    def __init__(self):
        self.logger = logging.getLogger('ModuleManager')
        self.modules = {}
        self._initialize_modules()
    
    def _initialize_modules(self):
        """Initialize all modules"""
        module_classes = {
            'system': SystemModule,
            'cpu': CPUModule,
            'memory': MemoryModule,
            'disk': DiskModule,
            'network': NetworkModule,
            'services': ServicesModule,
            'security': SecurityModule
        }
        
        for name, module_class in module_classes.items():
            if module_class is None:
                self.logger.warning(f"Module {name} not available (import failed)")
                continue
                
            try:
                self.modules[name] = module_class()
                self.logger.info(f"Initialized {name} module")
            except Exception as e:
                self.logger.error(f"Failed to initialize {name} module: {e}")
    
    def collect_all(self) -> Dict[str, Any]:
        """Collect information from all modules"""
        collected_data = {}
        module_status = {}
        
        for name, module in self.modules.items():
            try:
                self.logger.debug(f"Collecting data from {name} module")
                data = module.safe_collect()
                collected_data[name] = data
                module_status[name] = module.get_status()
                
                if data.get('status') == 'error':
                    self.logger.warning(f"Module {name} returned error: {data.get('error')}")
                    
            except Exception as e:
                self.logger.error(f"Unexpected error in {name} module: {e}", exc_info=True)
                collected_data[name] = {
                    'status': 'critical_error',
                    'error': str(e)
                }
                module_status[name] = {
                    'name': name,
                    'enabled': False,
                    'last_error': str(e)
                }
        
        # Add module status information
        collected_data['_module_status'] = module_status
        
        return collected_data
    
    def get_module(self, name: str) -> Optional[BaseModule]:
        """Get a specific module by name"""
        return self.modules.get(name)
    
    def disable_module(self, name: str) -> bool:
        """Disable a specific module"""
        if name in self.modules:
            self.modules[name].disable()
            self.logger.info(f"Disabled {name} module")
            return True
        return False
    
    def enable_module(self, name: str) -> bool:
        """Enable a specific module"""
        if name in self.modules:
            self.modules[name].enable()
            self.logger.info(f"Enabled {name} module")
            return True
        return False
    
    def get_module_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all modules"""
        return {name: module.get_status() for name, module in self.modules.items()}
    
    def get_healthy_modules(self) -> List[str]:
        """Get list of healthy modules"""
        healthy = []
        for name, module in self.modules.items():
            if module.enabled and module.last_error is None:
                healthy.append(name)
        return healthy
    
    def get_failed_modules(self) -> List[str]:
        """Get list of failed modules"""
        failed = []
        for name, module in self.modules.items():
            if module.last_error is not None:
                failed.append(name)
        return failed
    
    def retry_failed_modules(self) -> Dict[str, bool]:
        """Retry collection for failed modules"""
        results = {}
        failed_modules = self.get_failed_modules()
        
        for name in failed_modules:
            try:
                module = self.modules[name]
                data = module.safe_collect()
                results[name] = data.get('status') != 'error'
                self.logger.info(f"Retry {name} module: {'success' if results[name] else 'failed'}")
            except Exception as e:
                results[name] = False
                self.logger.error(f"Retry {name} module failed: {e}")
        
        return results
