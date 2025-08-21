
"""
Base Module Class
Provides common functionality for all system information modules
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
from datetime import datetime


class BaseModule(ABC):
    """Base class for all system information collection modules"""
    
    def __init__(self, module_name: str):
        self.module_name = module_name
        self.logger = logging.getLogger(f'Agent.{module_name}')
        self.enabled = True
        self.last_error = None
        self.last_success = None
    
    @abstractmethod
    def collect(self) -> Dict[str, Any]:
        """Collect module-specific information"""
        pass
    
    def safe_collect(self) -> Dict[str, Any]:
        """Safely collect data with error handling"""
        if not self.enabled:
            return self._get_disabled_result()
        
        try:
            result = self.collect()
            self.last_success = datetime.utcnow()
            self.last_error = None
            return result
        except Exception as e:
            self.last_error = str(e)
            self.logger.error(f"Error in {self.module_name} module: {e}", exc_info=True)
            return self._get_error_result(e)
    
    def _get_disabled_result(self) -> Dict[str, Any]:
        """Return result when module is disabled"""
        return {
            'status': 'disabled',
            'message': f'{self.module_name} module is disabled'
        }
    
    def _get_error_result(self, error: Exception) -> Dict[str, Any]:
        """Return result when module encounters an error"""
        return {
            'status': 'error',
            'error': str(error),
            'message': f'Failed to collect {self.module_name} information'
        }
    
    def disable(self):
        """Disable this module"""
        self.enabled = False
        self.logger.warning(f"{self.module_name} module disabled")
    
    def enable(self):
        """Enable this module"""
        self.enabled = True
        self.logger.info(f"{self.module_name} module enabled")
    
    def get_status(self) -> Dict[str, Any]:
        """Get module status information"""
        return {
            'name': self.module_name,
            'enabled': self.enabled,
            'last_success': self.last_success.isoformat() if self.last_success else None,
            'last_error': self.last_error
        }
