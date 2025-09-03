
"""
Module Manager for ITSM Agent
Coordinates and manages all agent modules
"""

import logging
import time
from datetime import datetime
from typing import Dict, Any, List, Optional
from .base_module import BaseModule

# Import all modules
from .system_module import SystemModule
from .cpu_module import CPUModule
from .memory_module import MemoryModule
from .disk_module import DiskModule
from .network_module import NetworkModule
from .services_module import ServicesModule
from .security_module import SecurityModule
from .usb_module import USBModule
from .alerting_module import AlertingModule
from .event_log_module import EventLogModule
from .asset_management_module import AssetManagementModule
from .patch_management_module import PatchManagementModule
from .application_discovery_module import ApplicationDiscoveryModule
from .compliance_configuration_module import ComplianceConfigurationModule
from .predictive_analytics_module import PredictiveAnalyticsModule
from .remote_management_module import RemoteManagementModule


class ModuleManager:
    """Manages all agent modules and coordinates data collection"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.modules = {}
        self.module_status = {}
        self.collection_stats = {}
        self.last_collection_time = None
        
        # Initialize all modules
        self._initialize_modules()
    
    def _initialize_modules(self):
        """Initialize all available modules"""
        try:
            # Core system modules
            self.modules['system'] = SystemModule()
            self.modules['cpu'] = CPUModule()
            self.modules['memory'] = MemoryModule()
            self.modules['disk'] = DiskModule()
            self.modules['network'] = NetworkModule()
            self.modules['services'] = ServicesModule()
            self.modules['security'] = SecurityModule()
            self.modules['usb'] = USBModule()
            
            # Enhanced modules
            self.modules['alerting'] = AlertingModule()
            self.modules['event_log'] = EventLogModule()
            self.modules['asset_management'] = AssetManagementModule()
            self.modules['patch_management'] = PatchManagementModule()
            self.modules['application_discovery'] = ApplicationDiscoveryModule()
            self.modules['compliance_configuration'] = ComplianceConfigurationModule()
            self.modules['predictive_analytics'] = PredictiveAnalyticsModule()
            self.modules['remote_management'] = RemoteManagementModule()
            
            # Initialize module status
            for module_name in self.modules:
                self.module_status[module_name] = {
                    'status': 'initialized',
                    'last_run': None,
                    'last_duration': 0,
                    'error_count': 0,
                    'last_error': None
                }
            
            self.logger.info(f"Initialized {len(self.modules)} modules")
            
        except Exception as e:
            self.logger.error(f"Error initializing modules: {e}")
    
    def collect_all_data(self) -> Dict[str, Any]:
        """Collect data from all modules"""
        collection_start = time.time()
        collected_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            '_module_status': {},
            '_collection_metadata': {
                'total_modules': len(self.modules),
                'collection_start': collection_start
            }
        }
        
        successful_collections = 0
        failed_collections = 0
        
        # Collect from each module
        for module_name, module in self.modules.items():
            module_start = time.time()
            
            try:
                self.logger.debug(f"Collecting data from {module_name} module")
                
                # Collect data from module
                module_data = module.collect()
                
                # Store module data
                collected_data[module_name] = module_data
                
                # Update module status
                module_duration = time.time() - module_start
                self.module_status[module_name].update({
                    'status': 'success',
                    'last_run': datetime.utcnow().isoformat() + 'Z',
                    'last_duration': round(module_duration, 3),
                    'last_error': None
                })
                
                successful_collections += 1
                
                self.logger.debug(f"Successfully collected data from {module_name} in {module_duration:.3f}s")
                
            except Exception as e:
                # Handle module collection error
                module_duration = time.time() - module_start
                error_msg = str(e)
                
                self.module_status[module_name].update({
                    'status': 'error',
                    'last_run': datetime.utcnow().isoformat() + 'Z',
                    'last_duration': round(module_duration, 3),
                    'last_error': error_msg,
                    'error_count': self.module_status[module_name].get('error_count', 0) + 1
                })
                
                failed_collections += 1
                
                self.logger.error(f"Error collecting data from {module_name}: {error_msg}")
                
                # Store error information in collected data
                collected_data[module_name] = {
                    'error': error_msg,
                    'timestamp': datetime.utcnow().isoformat() + 'Z'
                }
        
        # Finalize collection metadata
        collection_end = time.time()
        total_duration = collection_end - collection_start
        
        collected_data['_module_status'] = self.module_status.copy()
        collected_data['_collection_metadata'].update({
            'collection_end': collection_end,
            'total_duration': round(total_duration, 3),
            'successful_modules': successful_collections,
            'failed_modules': failed_collections,
            'collection_timestamp': datetime.utcnow().isoformat() + 'Z'
        })
        
        # Update collection stats
        self.collection_stats = {
            'last_collection': datetime.utcnow().isoformat() + 'Z',
            'total_duration': round(total_duration, 3),
            'successful_modules': successful_collections,
            'failed_modules': failed_collections,
            'total_modules': len(self.modules)
        }
        
        self.last_collection_time = collection_end
        
        self.logger.info(
            f"Data collection completed: {successful_collections} successful, "
            f"{failed_collections} failed, total time: {total_duration:.3f}s"
        )
        
        return collected_data
    
    def get_module_status(self) -> Dict[str, Any]:
        """Get status of all modules"""
        return {
            'modules': self.module_status.copy(),
            'collection_stats': self.collection_stats.copy(),
            'manager_status': {
                'total_modules': len(self.modules),
                'last_collection': self.last_collection_time,
                'manager_uptime': time.time() - getattr(self, '_start_time', time.time())
            }
        }
    
    def get_module_data(self, module_name: str) -> Optional[Dict[str, Any]]:
        """Get data from a specific module"""
        if module_name not in self.modules:
            self.logger.warning(f"Module {module_name} not found")
            return None
        
        try:
            module_start = time.time()
            data = self.modules[module_name].collect()
            module_duration = time.time() - module_start
            
            # Update module status
            self.module_status[module_name].update({
                'status': 'success',
                'last_run': datetime.utcnow().isoformat() + 'Z',
                'last_duration': round(module_duration, 3),
                'last_error': None
            })
            
            return data
            
        except Exception as e:
            error_msg = str(e)
            self.module_status[module_name].update({
                'status': 'error',
                'last_run': datetime.utcnow().isoformat() + 'Z',
                'last_error': error_msg,
                'error_count': self.module_status[module_name].get('error_count', 0) + 1
            })
            
            self.logger.error(f"Error collecting data from {module_name}: {error_msg}")
            return None
    
    def restart_module(self, module_name: str) -> bool:
        """Restart a specific module"""
        if module_name not in self.modules:
            self.logger.warning(f"Module {module_name} not found")
            return False
        
        try:
            # Reinitialize the module
            module_class = type(self.modules[module_name])
            self.modules[module_name] = module_class()
            
            # Reset status
            self.module_status[module_name] = {
                'status': 'restarted',
                'last_run': None,
                'last_duration': 0,
                'error_count': 0,
                'last_error': None,
                'restart_time': datetime.utcnow().isoformat() + 'Z'
            }
            
            self.logger.info(f"Successfully restarted module: {module_name}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error restarting module {module_name}: {e}")
            return False
    
    def get_available_modules(self) -> List[str]:
        """Get list of available module names"""
        return list(self.modules.keys())
    
    def get_healthy_modules(self) -> List[str]:
        """Get list of modules that are currently healthy"""
        healthy = []
        for module_name, status in self.module_status.items():
            if status.get('status') in ['success', 'initialized']:
                healthy.append(module_name)
        return healthy
    
    def get_failed_modules(self) -> List[str]:
        """Get list of modules that have failed"""
        failed = []
        for module_name, status in self.module_status.items():
            if status.get('status') == 'error':
                failed.append(module_name)
        return failed
    
    def execute_remote_command(self, command: str, command_type: str = 'shell') -> Dict[str, Any]:
        """Execute remote command using remote management module"""
        if 'remote_management' not in self.modules:
            return {
                'success': False,
                'error': 'Remote management module not available'
            }
        
        try:
            remote_mgmt = self.modules['remote_management']
            return remote_mgmt.execute_remote_command(command, command_type)
        except Exception as e:
            return {
                'success': False,
                'error': str(e)
            }
    
    def transfer_file(self, operation: str, local_path: str, remote_path: str = None) -> Dict[str, Any]:
        """Handle file transfer using remote management module"""
        if 'remote_management' not in self.modules:
            return {
                'success': False,
                'message': 'Remote management module not available'
            }
        
        try:
            remote_mgmt = self.modules['remote_management']
            return remote_mgmt.transfer_file(operation, local_path, remote_path)
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }
    
    def generate_health_report(self) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        healthy_modules = self.get_healthy_modules()
        failed_modules = self.get_failed_modules()
        
        health_score = len(healthy_modules) / len(self.modules) * 100 if self.modules else 0
        
        return {
            'overall_health_score': round(health_score, 2),
            'total_modules': len(self.modules),
            'healthy_modules': len(healthy_modules),
            'failed_modules': len(failed_modules),
            'healthy_module_list': healthy_modules,
            'failed_module_list': failed_modules,
            'collection_stats': self.collection_stats.copy(),
            'module_details': self.module_status.copy(),
            'report_timestamp': datetime.utcnow().isoformat() + 'Z'
        }
    
    def cleanup(self):
        """Cleanup resources"""
        try:
            for module_name, module in self.modules.items():
                if hasattr(module, 'cleanup'):
                    module.cleanup()
            self.logger.info("Module manager cleanup completed")
        except Exception as e:
            self.logger.error(f"Error during cleanup: {e}")


# Global module manager instance
module_manager = None

def get_module_manager() -> ModuleManager:
    """Get global module manager instance"""
    global module_manager
    if module_manager is None:
        module_manager = ModuleManager()
        module_manager._start_time = time.time()
    return module_manager
