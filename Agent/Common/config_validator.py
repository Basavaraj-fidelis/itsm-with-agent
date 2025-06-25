
#!/usr/bin/env python3
"""
Configuration Schema Validator for ITSM Agent
Validates configuration to prevent runtime errors
"""

import re
import logging
import os
import sys
from typing import Dict, Any, List, Optional, Union
from configparser import ConfigParser


class ConfigValidationError(Exception):
    """Custom exception for configuration validation errors"""
    pass


class ConfigValidator:
    """Validates ITSM Agent configuration against schema"""
    
    def __init__(self):
        self.logger = logging.getLogger('ConfigValidator')
        
        # Define configuration schema
        self.schema = {
            'agent': {
                'required': ['collection_interval', 'heartbeat_interval'],
                'optional': ['log_level', 'log_max_size', 'log_backup_count'],
                'validators': {
                    'collection_interval': self._validate_positive_int,
                    'heartbeat_interval': self._validate_positive_int,
                    'log_level': self._validate_log_level,
                    'log_max_size': self._validate_positive_int,
                    'log_backup_count': self._validate_positive_int
                }
            },
            'api': {
                'required': ['base_url', 'auth_token'],
                'optional': ['timeout', 'retry_attempts', 'retry_delay'],
                'validators': {
                    'base_url': self._validate_url,
                    'auth_token': self._validate_auth_token,
                    'timeout': self._validate_positive_int,
                    'retry_attempts': self._validate_positive_int,
                    'retry_delay': self._validate_positive_int
                }
            },
            'monitoring': {
                'required': ['cpu_threshold', 'memory_threshold', 'disk_threshold'],
                'optional': ['load_check_interval'],
                'validators': {
                    'cpu_threshold': self._validate_percentage,
                    'memory_threshold': self._validate_percentage,
                    'disk_threshold': self._validate_percentage,
                    'load_check_interval': self._validate_positive_int
                }
            },
            'scheduling': {
                'required': ['max_concurrent_commands'],
                'optional': ['defer_threshold_cpu', 'defer_threshold_memory', 
                           'maintenance_window_start', 'maintenance_window_end'],
                'validators': {
                    'max_concurrent_commands': self._validate_positive_int,
                    'defer_threshold_cpu': self._validate_percentage,
                    'defer_threshold_memory': self._validate_percentage,
                    'maintenance_window_start': self._validate_time_format,
                    'maintenance_window_end': self._validate_time_format
                }
            },
            'security': {
                'required': [],
                'optional': ['verify_ssl', 'allowed_command_patterns', 'blocked_command_patterns'],
                'validators': {
                    'verify_ssl': self._validate_boolean,
                    'allowed_command_patterns': self._validate_regex_patterns,
                    'blocked_command_patterns': self._validate_regex_patterns
                }
            },
            'network': {
                'required': [],
                'optional': ['connectivity_check_interval', 'connectivity_endpoints', 
                           'timeout_threshold', 'failure_threshold'],
                'validators': {
                    'connectivity_check_interval': self._validate_positive_int,
                    'connectivity_endpoints': self._validate_url_list,
                    'timeout_threshold': self._validate_positive_int,
                    'failure_threshold': self._validate_positive_int
                }
            },
            'performance': {
                'required': [],
                'optional': ['baseline_collection_interval', 'baseline_history_days',
                           'degradation_threshold', 'enable_baseline_tracking'],
                'validators': {
                    'baseline_collection_interval': self._validate_positive_int,
                    'baseline_history_days': self._validate_positive_int,
                    'degradation_threshold': self._validate_percentage,
                    'enable_baseline_tracking': self._validate_boolean
                }
            }
        }
    
    def validate_config(self, config: ConfigParser) -> List[str]:
        """Validate configuration against schema
        
        Args:
            config: ConfigParser instance to validate
            
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        try:
            # Check for required sections
            for section_name in self.schema.keys():
                if section_name not in config.sections() and section_name != 'DEFAULT':
                    # Only require sections that have required fields
                    section_schema = self.schema[section_name]
                    if section_schema.get('required'):
                        errors.append(f"Missing required section: [{section_name}]")
                        continue
            
            # Validate each section
            for section_name, section_schema in self.schema.items():
                if section_name in config.sections() or section_name == 'DEFAULT':
                    section_errors = self._validate_section(
                        config, section_name, section_schema
                    )
                    errors.extend(section_errors)
            
            # Check for unknown sections
            for section_name in config.sections():
                if section_name not in self.schema:
                    errors.append(f"Unknown configuration section: [{section_name}]")
            
        except Exception as e:
            errors.append(f"Configuration validation error: {str(e)}")
        
        return errors
    
    def _validate_section(self, config: ConfigParser, section_name: str, 
                         section_schema: Dict[str, Any]) -> List[str]:
        """Validate a configuration section
        
        Args:
            config: ConfigParser instance
            section_name: Name of section to validate
            section_schema: Schema for the section
            
        Returns:
            List of validation errors for this section
        """
        errors = []
        
        try:
            # Check required fields
            for field in section_schema.get('required', []):
                if not config.has_option(section_name, field):
                    errors.append(f"Missing required field: [{section_name}].{field}")
            
            # Validate field values
            validators = section_schema.get('validators', {})
            
            # Get all options in section
            if config.has_section(section_name):
                options = config.options(section_name)
            else:
                options = []
            
            for field in options:
                if field in validators:
                    value = config.get(section_name, field)
                    validator = validators[field]
                    
                    try:
                        if not validator(value):
                            errors.append(f"Invalid value for [{section_name}].{field}: {value}")
                    except Exception as e:
                        errors.append(f"Validation error for [{section_name}].{field}: {str(e)}")
                else:
                    # Check if field is allowed
                    allowed_fields = (section_schema.get('required', []) + 
                                    section_schema.get('optional', []))
                    if field not in allowed_fields:
                        errors.append(f"Unknown field: [{section_name}].{field}")
        
        except Exception as e:
            errors.append(f"Section validation error for [{section_name}]: {str(e)}")
        
        return errors
    
    def _validate_positive_int(self, value: str) -> bool:
        """Validate positive integer value"""
        try:
            int_val = int(value)
            return int_val > 0
        except (ValueError, TypeError):
            return False
    
    def _validate_percentage(self, value: str) -> bool:
        """Validate percentage value (0-100)"""
        try:
            float_val = float(value)
            return 0 <= float_val <= 100
        except (ValueError, TypeError):
            return False
    
    def _validate_url(self, value: str) -> bool:
        """Validate URL format"""
        url_pattern = re.compile(
            r'^https?://'  # http:// or https://
            r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
            r'localhost|'  # localhost...
            r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
            r'(?::\d+)?'  # optional port
            r'(?:/?|[/?]\S+)$', re.IGNORECASE)
        return bool(url_pattern.match(value))
    
    def _validate_auth_token(self, value: str) -> bool:
        """Validate authentication token"""
        # Token should be non-empty and at least 8 characters
        return isinstance(value, str) and len(value.strip()) >= 8
    
    def _validate_log_level(self, value: str) -> bool:
        """Validate log level"""
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        return value.upper() in valid_levels
    
    def _validate_boolean(self, value: str) -> bool:
        """Validate boolean value"""
        return value.lower() in ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off']
    
    def _validate_time_format(self, value: str) -> bool:
        """Validate time format (HH:MM)"""
        time_pattern = re.compile(r'^([01]?[0-9]|2[0-3]):[0-5][0-9]$')
        return bool(time_pattern.match(value))
    
    def _validate_regex_patterns(self, value: str) -> bool:
        """Validate regex patterns list"""
        try:
            # Handle both string and list formats
            if value.startswith('[') and value.endswith(']'):
                # List format - basic validation
                return True
            else:
                # Single pattern - test if it's valid regex
                re.compile(value)
                return True
        except re.error:
            return False
    
    def _validate_url_list(self, value: str) -> bool:
        """Validate comma-separated list of URLs"""
        try:
            urls = [url.strip() for url in value.split(',')]
            return all(self._validate_url(url) for url in urls if url)
        except:
            return False


def validate_configuration_file(config_path: str) -> List[str]:
    """Validate a configuration file
    
    Args:
        config_path: Path to configuration file
        
    Returns:
        List of validation errors (empty if valid)
    """
    try:
        config = ConfigParser()
        config.read(config_path)
        
        validator = ConfigValidator()
        return validator.validate_config(config)
        
    except Exception as e:
        return [f"Failed to read configuration file: {str(e)}"]


if __name__ == '__main__':
    # Test configuration validation
    import sys
    
    config_file = sys.argv[1] if len(sys.argv) > 1 else 'config.ini'
    
    print(f"Validating configuration file: {config_file}")
    errors = validate_configuration_file(config_file)
    
    if errors:
        print("❌ Configuration validation failed:")
        for error in errors:
            print(f"  - {error}")
        sys.exit(1)
    else:
        print("✅ Configuration validation passed")
        sys.exit(0)
#!/usr/bin/env python3
"""
Configuration Validator for ITSM Agent
Validates and sanitizes configuration settings
"""

import os
import configparser
import logging
from typing import Dict, Any, Tuple, Optional
from pathlib import Path


class ConfigValidator:
    """Configuration validation and management"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.config_path = config_path or "config.ini"
        self.logger = logging.getLogger('ConfigValidator')
        
        # Default configuration structure
        self.default_config = {
            'api': {
                'base_url': 'http://localhost:5000',
                'auth_token': 'dashboard-api-token',
                'timeout': '30',
                'retry_attempts': '3',
                'retry_delay': '5'
            },
            'agent': {
                'collection_interval': '60',
                'max_retry_attempts': '3',
                'log_level': 'INFO',
                'enable_logging': 'true',
                'max_log_size': '10485760',
                'max_log_files': '5'
            },
            'monitoring': {
                'cpu_threshold': '80',
                'memory_threshold': '85',
                'disk_threshold': '90',
                'enable_usb_monitoring': 'true',
                'enable_process_monitoring': 'true',
                'enable_service_monitoring': 'true',
                'enable_network_monitoring': 'true'
            },
            'scheduling': {
                'max_concurrent_commands': '3',
                'command_timeout': '300',
                'queue_max_size': '100',
                'priority_levels': '5'
            },
            'security': {
                'validate_commands': 'true',
                'allowed_operations': 'system_info,restart,update_check',
                'blocked_commands': 'format,del,rm,shutdown',
                'require_confirmation': 'true'
            }
        }
    
    def validate_configuration(self, config: configparser.ConfigParser) -> Tuple[bool, Dict[str, Any]]:
        """Validate configuration settings"""
        errors = {}
        warnings = {}
        
        try:
            # Validate API section
            api_errors = self._validate_api_section(config)
            if api_errors:
                errors['api'] = api_errors
            
            # Validate agent section
            agent_errors = self._validate_agent_section(config)
            if agent_errors:
                errors['agent'] = agent_errors
            
            # Validate monitoring section
            monitoring_errors = self._validate_monitoring_section(config)
            if monitoring_errors:
                errors['monitoring'] = monitoring_errors
            
            # Validate scheduling section
            scheduling_errors = self._validate_scheduling_section(config)
            if scheduling_errors:
                errors['scheduling'] = scheduling_errors
            
            # Validate security section
            security_errors = self._validate_security_section(config)
            if security_errors:
                errors['security'] = security_errors
            
            is_valid = len(errors) == 0
            
            return is_valid, {
                'errors': errors,
                'warnings': warnings,
                'sections_validated': list(config.sections())
            }
            
        except Exception as e:
            self.logger.error(f"Configuration validation failed: {e}")
            return False, {'errors': {'general': [str(e)]}}
    
    def _validate_api_section(self, config: configparser.ConfigParser) -> list:
        """Validate API configuration section"""
        errors = []
        
        if not config.has_section('api'):
            errors.append("Missing 'api' section")
            return errors
        
        # Validate base_url
        if not config.has_option('api', 'base_url'):
            errors.append("Missing 'base_url' in api section")
        else:
            base_url = config.get('api', 'base_url')
            if not base_url.startswith(('http://', 'https://')):
                errors.append("Invalid base_url format (must start with http:// or https://)")
        
        # Validate auth_token
        if not config.has_option('api', 'auth_token'):
            errors.append("Missing 'auth_token' in api section")
        else:
            auth_token = config.get('api', 'auth_token')
            if len(auth_token.strip()) < 10:
                errors.append("Auth token is too short (minimum 10 characters)")
        
        # Validate timeout
        if config.has_option('api', 'timeout'):
            try:
                timeout = int(config.get('api', 'timeout'))
                if timeout < 5 or timeout > 300:
                    errors.append("Timeout must be between 5 and 300 seconds")
            except ValueError:
                errors.append("Invalid timeout value (must be integer)")
        
        return errors
    
    def _validate_agent_section(self, config: configparser.ConfigParser) -> list:
        """Validate agent configuration section"""
        errors = []
        
        if not config.has_section('agent'):
            errors.append("Missing 'agent' section")
            return errors
        
        # Validate collection_interval
        if config.has_option('agent', 'collection_interval'):
            try:
                interval = int(config.get('agent', 'collection_interval'))
                if interval < 30 or interval > 3600:
                    errors.append("Collection interval must be between 30 and 3600 seconds")
            except ValueError:
                errors.append("Invalid collection_interval value (must be integer)")
        
        # Validate log_level
        if config.has_option('agent', 'log_level'):
            log_level = config.get('agent', 'log_level').upper()
            valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
            if log_level not in valid_levels:
                errors.append(f"Invalid log_level (must be one of: {', '.join(valid_levels)})")
        
        return errors
    
    def _validate_monitoring_section(self, config: configparser.ConfigParser) -> list:
        """Validate monitoring configuration section"""
        errors = []
        
        if not config.has_section('monitoring'):
            return errors  # Optional section
        
        # Validate threshold values
        thresholds = ['cpu_threshold', 'memory_threshold', 'disk_threshold']
        for threshold in thresholds:
            if config.has_option('monitoring', threshold):
                try:
                    value = int(config.get('monitoring', threshold))
                    if value < 50 or value > 95:
                        errors.append(f"{threshold} must be between 50 and 95 percent")
                except ValueError:
                    errors.append(f"Invalid {threshold} value (must be integer)")
        
        return errors
    
    def _validate_scheduling_section(self, config: configparser.ConfigParser) -> list:
        """Validate scheduling configuration section"""
        errors = []
        
        if not config.has_section('scheduling'):
            return errors  # Optional section
        
        # Validate max_concurrent_commands
        if config.has_option('scheduling', 'max_concurrent_commands'):
            try:
                value = int(config.get('scheduling', 'max_concurrent_commands'))
                if value < 1 or value > 10:
                    errors.append("max_concurrent_commands must be between 1 and 10")
            except ValueError:
                errors.append("Invalid max_concurrent_commands value (must be integer)")
        
        return errors
    
    def _validate_security_section(self, config: configparser.ConfigParser) -> list:
        """Validate security configuration section"""
        errors = []
        
        if not config.has_section('security'):
            return errors  # Optional section
        
        # Validate boolean options
        boolean_options = ['validate_commands', 'require_confirmation']
        for option in boolean_options:
            if config.has_option('security', option):
                value = config.get('security', option).lower()
                if value not in ['true', 'false', 'yes', 'no', '1', '0']:
                    errors.append(f"Invalid {option} value (must be true/false)")
        
        return errors
    
    def create_default_config(self, output_path: Optional[str] = None) -> bool:
        """Create a default configuration file"""
        try:
            config_file = output_path or self.config_path
            config = configparser.ConfigParser()
            
            # Add all default sections
            for section_name, section_data in self.default_config.items():
                config.add_section(section_name)
                for key, value in section_data.items():
                    config.set(section_name, key, value)
            
            # Write configuration file
            with open(config_file, 'w') as f:
                config.write(f)
            
            self.logger.info(f"Default configuration created: {config_file}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create default configuration: {e}")
            return False
    
    def repair_configuration(self, config_path: Optional[str] = None) -> bool:
        """Repair configuration file by adding missing sections/options"""
        try:
            config_file = config_path or self.config_path
            
            if not os.path.exists(config_file):
                return self.create_default_config(config_file)
            
            config = configparser.ConfigParser()
            config.read(config_file)
            
            # Add missing sections and options
            modified = False
            for section_name, section_data in self.default_config.items():
                if not config.has_section(section_name):
                    config.add_section(section_name)
                    modified = True
                
                for key, default_value in section_data.items():
                    if not config.has_option(section_name, key):
                        config.set(section_name, key, default_value)
                        modified = True
            
            if modified:
                with open(config_file, 'w') as f:
                    config.write(f)
                self.logger.info(f"Configuration repaired: {config_file}")
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to repair configuration: {e}")
            return False


def validate_configuration_file(config_path: str) -> Tuple[bool, Dict[str, Any]]:
    """Standalone function to validate configuration file"""
    try:
        if not os.path.exists(config_path):
            return False, {'error': f"Configuration file not found: {config_path}"}
        
        config = configparser.ConfigParser()
        config.read(config_path)
        
        validator = ConfigValidator(config_path)
        return validator.validate_configuration(config)
        
    except Exception as e:
        return False, {'error': f"Configuration validation failed: {e}"}


def create_default_configuration(output_path: str = "config.ini") -> bool:
    """Standalone function to create default configuration"""
    validator = ConfigValidator()
    return validator.create_default_config(output_path)


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        config_file = sys.argv[1]
        
        if sys.argv[1] == "create":
            output_file = sys.argv[2] if len(sys.argv) > 2 else "config.ini"
            if create_default_configuration(output_file):
                print(f"✓ Default configuration created: {output_file}")
            else:
                print(f"✗ Failed to create configuration: {output_file}")
        else:
            is_valid, result = validate_configuration_file(config_file)
            
            if is_valid:
                print(f"✓ Configuration file is valid: {config_file}")
            else:
                print(f"✗ Configuration validation failed: {config_file}")
                if 'errors' in result:
                    for section, errors in result['errors'].items():
                        print(f"  {section}: {', '.join(errors)}")
    else:
        print("Usage:")
        print("  python config_validator.py <config_file>     # Validate configuration")
        print("  python config_validator.py create [output]   # Create default configuration")
