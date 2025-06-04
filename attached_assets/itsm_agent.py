#!/usr/bin/env python3
"""
ITSM Endpoint Agent - Main application entry point
Collects system information and reports to central API
"""

import os
import sys
import time
import signal
import logging
import threading
from logging.handlers import RotatingFileHandler
from configparser import ConfigParser
from pathlib import Path

from system_collector import SystemCollector
from api_client import APIClient
from service_wrapper import ServiceWrapper


class ITSMAgent:
    """Main ITSM Agent class that orchestrates data collection and reporting"""
    
    def __init__(self, config_path='config.ini'):
        """Initialize the ITSM Agent with configuration"""
        self.config_path = config_path
        self.config = ConfigParser()
        self.running = False
        self.shutdown_event = threading.Event()
        
        # Load configuration
        self._load_config()
        
        # Setup logging
        self._setup_logging()
        
        # Initialize components
        self.system_collector = SystemCollector()
        self.api_client = APIClient(
            base_url=self.config.get('api', 'base_url'),
            auth_token=self.config.get('api', 'auth_token'),
            timeout=self.config.getint('api', 'timeout', fallback=30)
        )
        
        # Collection interval in seconds
        self.collection_interval = self.config.getint('agent', 'collection_interval', fallback=600)
        
        self.logger.info("ITSM Agent initialized successfully")
    
    def _load_config(self):
        """Load configuration from file or environment variables"""
        # Default configuration
        defaults = {
            'agent': {
                'collection_interval': '600',  # 10 minutes
                'log_level': 'INFO',
                'log_max_size': '10485760',  # 10MB
                'log_backup_count': '5'
            },
            'api': {
                'base_url': os.getenv('ITSM_API_URL', 'https://itsm.example.com'),
                'auth_token': os.getenv('ITSM_AUTH_TOKEN', 'your-auth-token-here'),
                'timeout': '30',
                'retry_attempts': '3',
                'retry_delay': '5'
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
        # Simple heuristic: if no TTY or stdout is None, likely running as service
        try:
            return not (sys.stdout and sys.stdout.isatty())
        except (AttributeError, OSError):
            # If stdout is None or doesn't have isatty method, assume we're running as service
            return True
    
    def _signal_handler(self, signum, frame):
        """Handle shutdown signals gracefully"""
        self.logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.stop()
    
    def start(self):
        """Start the agent main loop"""
        self.logger.info("Starting ITSM Agent...")
        self.running = True
        
        # Setup signal handlers for graceful shutdown (only if not running as service)
        if not self._is_service():
            try:
                signal.signal(signal.SIGTERM, self._signal_handler)
                signal.signal(signal.SIGINT, self._signal_handler)
            except ValueError as e:
                # Signal handlers may not work in all environments
                self.logger.warning(f"Could not set signal handlers: {e}")
        
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
    
    def _collect_and_report(self):
        """Collect system information and report to API"""
        try:
            self.logger.info("Starting system information collection...")
            
            # Collect system information
            system_info = self.system_collector.collect_all()
            
            self.logger.info(f"Collected information for {len(system_info)} categories")
            
            # Report to API
            success = self.api_client.report_system_info(system_info)
            
            if success:
                self.logger.info("Successfully reported system information to API")
            else:
                self.logger.error("Failed to report system information to API")
                
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
        # Run interactively or as service
        if ServiceWrapper.is_running_as_service():
            # Running as Windows service
            service = ITSMService()
            service.run()
        else:
            # Running interactively
            agent = ITSMAgent()
            try:
                agent.start()
            except KeyboardInterrupt:
                agent.stop()


if __name__ == '__main__':
    main()
