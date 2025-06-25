
#!/usr/bin/env python3
"""
Non-Intrusive ITSM Endpoint Agent - Main application entry point
Collects system information and executes commands during safe windows
"""

import os
import sys
import time
import signal
import logging
import threading
import platform
from logging.handlers import RotatingFileHandler
from configparser import ConfigParser
from pathlib import Path

from system_collector import SystemCollector
from api_client import APIClient
from command_scheduler import CommandScheduler
from operation_monitor import OperationMonitor
from smart_queue import SmartQueue
from service_wrapper import ServiceWrapper
from config_validator import ConfigValidator, validate_configuration_file
from network_monitor import NetworkConnectivityMonitor
from performance_baseline import PerformanceBaseline


class ITSMAgent:
    """Main ITSM Agent class that orchestrates non-intrusive data collection and command execution"""

    def __init__(self, config_path='config.ini'):
        """Initialize the ITSM Agent with configuration"""
        self.config_path = config_path
        self.config = ConfigParser()
        self.running = False
        self.shutdown_event = threading.Event()

        # Load and validate configuration
        self._load_config()
        self._validate_config()

        # Setup logging
        self._setup_logging()

        # Initialize components
        self.system_collector = SystemCollector()
        self.api_client = APIClient(
            base_url=self.config.get('api', 'base_url'),
            auth_token=self.config.get('api', 'auth_token'),
            timeout=self.config.getint('api', 'timeout', fallback=30)
        )

        # Initialize smart monitoring and scheduling
        self.operation_monitor = OperationMonitor()
        self.smart_queue = SmartQueue(self.operation_monitor)
        self.command_scheduler = CommandScheduler(
            self.api_client, 
            self.smart_queue, 
            self.operation_monitor
        )

        # Initialize network monitoring and performance baseline tracking
        self.network_monitor = NetworkConnectivityMonitor(self.config)
        self.performance_baseline = PerformanceBaseline(self.config, self.system_collector)

        # Collection interval in seconds
        self.collection_interval = self.config.getint('agent', 'collection_interval', fallback=600)
        self.heartbeat_interval = self.config.getint('agent', 'heartbeat_interval', fallback=60)

        # Agent identification
        self.hostname = platform.node()
        self.platform = platform.system().lower()
        self.version = "2.0.0"
        self.agent_id = None

        self.logger.info("ITSM Agent initialized successfully")

    def _load_config(self):
        """Load configuration from file or environment variables"""
        # Default configuration
        defaults = {
            'agent': {
                'collection_interval': '600',  # 10 minutes
                'heartbeat_interval': '60',    # 1 minute
                'log_level': 'INFO',
                'log_max_size': '10485760',  # 10MB
                'log_backup_count': '5'
            },
            'api': {
                'base_url': os.getenv('ITSM_API_URL', 'http://localhost:5000/api'),
                'auth_token': os.getenv('ITSM_AUTH_TOKEN', 'dashboard-api-token'),
                'timeout': '30',
                'retry_attempts': '3',
                'retry_delay': '5'
            },
            'monitoring': {
                'cpu_threshold': '80',
                'memory_threshold': '80',
                'disk_threshold': '90',
                'load_check_interval': '30'
            },
            'scheduling': {
                'max_concurrent_commands': '2',
                'defer_threshold_cpu': '75',
                'defer_threshold_memory': '75',
                'maintenance_window_start': '02:00',
                'maintenance_window_end': '04:00'
            }
        }

        # Load defaults first
        self.config.read_dict(defaults)

        # Override with config file if it exists
        if os.path.exists(self.config_path):
            self.config.read(self.config_path)
        else:
            # Create default config file
            self._create_default_config()

    def _create_default_config(self):
        """Create a default configuration file"""
        try:
            with open(self.config_path, 'w') as f:
                self.config.write(f)
            print(f"Created default configuration file: {self.config_path}")
        except Exception as e:
            print(f"Warning: Could not create config file: {e}")

    def _validate_config(self):
        """Validate configuration against schema"""
        try:
            # Only validate if config file exists and config_validator is available
            if os.path.exists(self.config_path):
                try:
                    validation_errors = validate_configuration_file(self.config_path)

                    if validation_errors:
                        error_msg = "Configuration validation warnings:\n" + "\n".join(f"  - {error}" for error in validation_errors)
                        if hasattr(self, 'logger'):
                            self.logger.warning(error_msg)
                        else:
                            print(f"[Warning] {error_msg}")

                        # Only fail on truly critical errors (missing required API settings)
                        critical_errors = [e for e in validation_errors if isinstance(e, str) and 
                                         ('base_url' in e.lower() or 'auth_token' in e.lower()) and 'required' in e.lower()]
                        if critical_errors:
                            raise ValueError(f"Critical configuration errors: {critical_errors}")
                    else:
                        if hasattr(self, 'logger'):
                            self.logger.info("Configuration validation passed")
                        else:
                            print("✅ Configuration validation passed")
                except ImportError:
                    # config_validator not available, skip validation
                    if hasattr(self, 'logger'):
                        self.logger.info("Configuration validator not available, skipping validation")
                    else:
                        print("ℹ️ Configuration validator not available, skipping validation")
            else:
                if hasattr(self, 'logger'):
                    self.logger.warning(f"Configuration file not found: {self.config_path}")
                else:
                    print(f"[Warning] Configuration file not found: {self.config_path}")

        except Exception as e:
            error_msg = f"Configuration validation error: {e}"
            if hasattr(self, 'logger'):
                self.logger.warning(error_msg)
            else:
                print(f"[Warning] {error_msg}")
            # Continue startup even with validation errors

    def _setup_logging(self):
        """Setup rotating log files"""
        log_level = getattr(logging, self.config.get('agent', 'log_level', fallback='INFO').upper())
        log_max_size = self.config.getint('agent', 'log_max_size', fallback=10485760)
        log_backup_count = self.config.getint('agent', 'log_backup_count', fallback=5)

        # Create logs directory if it doesn't exist
        log_dir = Path('logs')
        log_dir.mkdir(exist_ok=True)

        # Setup rotating file handler
        log_file = log_dir / 'itsm_agent.log'
        handler = RotatingFileHandler(
            log_file, 
            maxBytes=log_max_size, 
            backupCount=log_backup_count
        )

        # Setup formatter
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        handler.setFormatter(formatter)

        # Setup logger
        self.logger = logging.getLogger('ITSMAgent')
        self.logger.setLevel(log_level)
        self.logger.addHandler(handler)

        # Also log to console when running interactively
        if not self._is_service():
            console_handler = logging.StreamHandler()
            console_handler.setFormatter(formatter)
            self.logger.addHandler(console_handler)

    def _is_service(self):
        """Check if running as a service"""
        try:
            return not (sys.stdout and sys.stdout.isatty())
        except (AttributeError, OSError):
            return True

    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop()

    def start(self):
        """Start the agent main loop"""
        self.logger.info("Starting Non-Intrusive ITSM Agent...")
        self.running = True

        # Setup signal handlers for graceful shutdown
        if not self._is_service():
            try:
                signal.signal(signal.SIGTERM, self._signal_handler)
                signal.signal(signal.SIGINT, self._signal_handler)
            except ValueError as e:
                self.logger.warning(f"Could not set signal handlers: {e}")

        # Start monitoring thread
        monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        monitoring_thread.start()

        # Start command scheduler thread
        scheduler_thread = threading.Thread(target=self.command_scheduler.start, daemon=True)
        scheduler_thread.start()

        # Start network monitoring
        self.network_monitor.start()

        # Start performance baseline tracking
        self.performance_baseline.start()

        # Start heartbeat thread
        heartbeat_thread = threading.Thread(target=self._heartbeat_loop, daemon=True)
        heartbeat_thread.start()

        # Main collection loop
        while self.running and not self.shutdown_event.is_set():
            try:
                self._collect_and_report()

                # Wait for next collection or shutdown
                if self.shutdown_event.wait(timeout=self.collection_interval):
                    break  # Shutdown requested

            except Exception as e:
                self.logger.error(f"Error in main loop: {e}", exc_info=True)
                # Brief pause before retrying
                time.sleep(30)

        self.logger.info("ITSM Agent stopped")

    def stop(self):
        """Stop the agent gracefully"""
        self.logger.info("Stopping ITSM Agent...")
        self.running = False
        self.shutdown_event.set()

        # Stop command scheduler
        if hasattr(self, 'command_scheduler'):
            self.command_scheduler.stop()

        # Stop network monitor
        if hasattr(self, 'network_monitor'):
            self.network_monitor.stop()

        # Stop performance baseline tracker
        if hasattr(self, 'performance_baseline'):
            self.performance_baseline.stop()

    def _monitoring_loop(self):
        """Background monitoring loop for system state"""
        while self.running and not self.shutdown_event.is_set():
            try:
                # Update system load information
                system_info = self.system_collector.collect_basic_info()
                self.operation_monitor.update_system_state(system_info)

                # Check for operation conflicts
                self.operation_monitor.check_running_operations()

                # Wait before next check
                if self.shutdown_event.wait(timeout=30):
                    break

            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}", exc_info=True)
                time.sleep(60)  # Wait longer on error

    def _heartbeat_loop(self):
        """Send regular heartbeats to the server"""
        while self.running and not self.shutdown_event.is_set():
            try:
                self._send_heartbeat()

                # Wait for next heartbeat
                if self.shutdown_event.wait(timeout=self.heartbeat_interval):
                    break

            except Exception as e:
                self.logger.error(f"Error in heartbeat loop: {e}", exc_info=True)
                # Continue trying heartbeats even on error
                time.sleep(min(self.heartbeat_interval, 300))  # Max 5 min retry

    def _send_heartbeat(self):
        """Send heartbeat with system information"""
        try:
            system_info = self.system_collector.collect_basic_info()

            # Add agent identification and enhanced monitoring data
            heartbeat_data = {
                'hostname': self.hostname,
                'systemInfo': {
                    'platform': self.platform,
                    'version': self.version,
                    'cpu_usage': system_info.get('cpu_percent', 0),
                    'memory_usage': system_info.get('memory_percent', 0),
                    'disk_usage': system_info.get('disk_percent', 0),
                    'load_average': system_info.get('load_average'),
                    'active_processes': system_info.get('process_count', 0),
                    'metrics': {
                        'cpuUsage': system_info.get('cpu_percent', 0),
                        'memoryUsage': system_info.get('memory_percent', 0),
                        'diskUsage': system_info.get('disk_percent', 0),
                        'activeProcesses': system_info.get('process_count', 0),
                        'loadAverage': str(system_info.get('load_average', ''))
                    },
                    'networkStatus': self.network_monitor.get_connectivity_status() if hasattr(self, 'network_monitor') else 'unknown',
                    'performanceBaseline': self.performance_baseline.get_baseline_status() if hasattr(self, 'performance_baseline') else 'unknown'
                }
            }

            response = self.api_client.send_heartbeat(heartbeat_data)
            if response and isinstance(response, dict) and 'agentId' in response:
                self.agent_id = response['agentId']
                self.logger.debug("Heartbeat sent successfully")
            elif response:
                self.logger.warning(f"Unexpected heartbeat response format: {type(response)}")
            else:
                self.logger.warning("Heartbeat failed - no response received")

        except Exception as e:
            self.logger.error(f"Failed to send heartbeat: {e}")
            import traceback
            self.logger.error(f"Heartbeat traceback: {traceback.format_exc()}")

    def _collect_and_report(self):
        """Collect system information and report to API (non-intrusively)"""
        try:
            # Only collect if system is not under high load
            if not self.operation_monitor.is_system_busy():
                self.logger.info("Starting non-intrusive system information collection...")

                # Collect comprehensive system information
                system_info = self.system_collector.collect_all()

                self.logger.info(f"Collected information for {len(system_info)} categories")

                # Report to API
                success = self.api_client.report_system_info(system_info)

                if success:
                    self.logger.info("Successfully reported system information to API")
                else:
                    self.logger.error("Failed to report system information to API")
            else:
                self.logger.info("Skipping collection - system is busy")

        except Exception as e:
            self.logger.error(f"Error during collection and reporting: {e}", exc_info=True)


class ITSMService(ServiceWrapper):
    """Service wrapper for ITSM Agent"""

    def __init__(self):
        super().__init__('ITSMAgent', 'ITSM Endpoint Agent')
        self.agent = None

    def start_service(self):
        """Start the service"""
        try:
            self.agent = ITSMAgent()
            self.agent.start()
        except Exception as e:
            if self.agent and hasattr(self.agent, 'logger'):
                self.agent.logger.error(f"Service start error: {e}", exc_info=True)
            else:
                print(f"Service start error: {e}")
            raise

    def stop_service(self):
        """Stop the service"""
        if self.agent:
            self.agent.stop()


def main():
    """Main entry point"""
    try:
        if len(sys.argv) > 1:
            command = sys.argv[1].lower()

            if command in ['install', 'remove', 'start', 'stop', 'restart']:
                # Service management commands
                service = ITSMService()

                if command == 'install':
                    service.install()
                elif command == 'remove':
                    service.remove()
                elif command == 'start':
                    service.start()
                elif command == 'stop':
                    service.stop()
                elif command == 'restart':
                    service.restart()
            else:
                print("Usage: python itsm_agent.py [install|remove|start|stop|restart]")
                print("       python itsm_agent.py  (to run interactively)")
        else:
            # Check if running as service
            if ServiceWrapper.is_running_as_service():
                # Running as Windows service
                service = ITSMService()
                service.run()  # Use run() method for service execution
            else:
                # Running interactively
                agent = ITSMAgent()
                try:
                    agent.start()
                except KeyboardInterrupt:
                    agent.stop()

    except Exception as e:
        # Log any startup errors
        try:
            with open('C:\\Program Files\\ITSM Agent\\startup_error.log', 'a') as f:
                import datetime
                import traceback
                f.write(f"{datetime.datetime.now()}: Startup error: {e}\n")
                f.write(f"Traceback: {traceback.format_exc()}\n")
        except:
            pass
        raise


if __name__ == '__main__':
    main()
