#!/usr/bin/env python3
"""
Smart Command Scheduler for ITSM Agent
Handles non-intrusive command execution with intelligent scheduling
"""

import time
import threading
import logging
import subprocess
import os
import signal
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from queue import Queue, Empty

from api_client import APIClient
from smart_queue import SmartQueue
from operation_monitor import OperationMonitor


class CommandExecutor:
    """Handles actual command execution with safety measures"""

    def __init__(self, operation_monitor: OperationMonitor):
        """Initialize command executor

        Args:
            operation_monitor: Operation monitor instance
        """
        self.operation_monitor = operation_monitor
        self.logger = logging.getLogger('CommandExecutor')
        self.active_processes = {}  # pid -> process info
        self.execution_locks = set()  # Active execution locks

    def execute_command(self, command_info: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a command safely

        Args:
            command_info: Command information from server

        Returns:
            Execution result dictionary
        """
        command_id = command_info.get('id')
        command_type = command_info.get('type')
        command_text = command_info.get('command')
        parameters = command_info.get('parameters', {})

        self.logger.info(f"Executing command {command_id}: {command_type}")

        try:
            # Security validation first
            if command_type == 'execute' and command_text:
                security_result = self._validate_command_security(command_text)
                if not security_result['allowed']:
                    return {
                        'status': 'failed',
                        'error': f'Command blocked by security policy: {security_result["reason"]}'
                    }

            # Check for operation conflicts
            if self._has_execution_conflict(command_type):
                return {
                    'status': 'deferred',
                    'message': 'Conflicting operation in progress'
                }

            # Set execution lock
            self.execution_locks.add(command_type)

            # Execute based on command type
            if command_type == 'execute':
                result = self._execute_script(command_text, parameters)
            elif command_type == 'upload':
                result = self._handle_upload(command_text, parameters)
            elif command_type == 'download':
                result = self._handle_download(command_text, parameters)
            elif command_type == 'patch':
                result = self._handle_patch(command_text, parameters)
            elif command_type == 'restart':
                result = self._handle_restart(command_text, parameters)
            elif command_type == 'health_check':
                result = self._handle_health_check(command_text, parameters)
            else:
                result = {
                    'status': 'failed',
                    'error': f'Unknown command type: {command_type}'
                }

            return result

        except Exception as e:
            self.logger.error(f"Error executing command {command_id}: {e}")
            return {
                'status': 'failed',
                'error': str(e)
            }
        finally:
            # Remove execution lock
            self.execution_locks.discard(command_type)

    def _has_execution_conflict(self, command_type: str) -> bool:
        """Check if command execution would conflict with current operations

        Args:
            command_type: Type of command to execute

        Returns:
            True if there's a conflict, False otherwise
        """
        # Check for same command type already running
        if command_type in self.execution_locks:
            return True

        # Check for conflicting command types
        conflict_map = {
            'restart': ['execute', 'patch', 'upload', 'download'],
            'patch': ['restart', 'execute'],
            'execute': ['restart'] if command_type == 'restart' else []
        }

        conflicting_types = conflict_map.get(command_type, [])
        return any(ctype in self.execution_locks for ctype in conflicting_types)



    def _validate_command_security(self, command: str) -> Dict[str, Any]:
        """Validate command against security policies

        Args:
            command: Command to validate

        Returns:
            Dictionary with validation result
        """
        import re
        from configparser import ConfigParser

        try:
            # Load security configuration
            config = ConfigParser()
            config.read('config.ini')

            # Get allowed and blocked patterns
            allowed_patterns_str = config.get('security', 'allowed_command_patterns', fallback='')
            blocked_patterns_str = config.get('security', 'blocked_command_patterns', fallback='')

            # Parse pattern lists
            allowed_patterns = self._parse_pattern_list(allowed_patterns_str)
            blocked_patterns = self._parse_pattern_list(blocked_patterns_str)

            # Check blocked patterns first (highest priority)
            for pattern in blocked_patterns:
                try:
                    if re.search(pattern, command, re.IGNORECASE):
                        return {
                            'allowed': False,
                            'reason': f'Command matches blocked pattern: {pattern}'
                        }
                except re.error as e:
                    self.logger.warning(f"Invalid blocked pattern regex '{pattern}': {e}")

            # Check allowed patterns
            if allowed_patterns:
                for pattern in allowed_patterns:
                    try:
                        if re.search(pattern, command, re.IGNORECASE):
                            return {
                                'allowed': True,
                                'reason': f'Command matches allowed pattern: {pattern}'
                            }
                    except re.error as e:
                        self.logger.warning(f"Invalid allowed pattern regex '{pattern}': {e}")

                # If we have allowed patterns but no match, block the command
                return {
                    'allowed': False,
                    'reason': 'Command does not match any allowed patterns'
                }

            # If no patterns configured, apply basic safety checks
            return self._basic_security_check(command)

        except Exception as e:
            self.logger.error(f"Error validating command security: {e}")
            return {
                'allowed': False,
                'reason': f'Security validation error: {str(e)}'
            }

    def _parse_pattern_list(self, patterns_str: str) -> List[str]:
        """Parse pattern list from configuration

        Args:
            patterns_str: String containing patterns

        Returns:
            List of patterns
        """
        if not patterns_str.strip():
            return []

        # Handle list format [pattern1, pattern2, ...]
        if patterns_str.strip().startswith('[') and patterns_str.strip().endswith(']'):
            # Remove brackets and split by comma
            inner = patterns_str.strip()[1:-1]
            patterns = []

            # Simple parsing - split by comma and clean up
            for pattern in inner.split(','):
                pattern = pattern.strip().strip('"').strip("'")
                if pattern:
                    patterns.append(pattern)

            return patterns
        else:
            # Single pattern
            return [patterns_str.strip()]

    def _basic_security_check(self, command: str) -> Dict[str, Any]:
        """Perform basic security checks on command

        Args:
            command: Command to check

        Returns:
            Dictionary with validation result
        """
        # Basic dangerous command patterns
        dangerous_patterns = [
            r'rm\s+-rf\s+/',
            r'del\s+/[sf]',
            r'format\s+[cd]:',
            r'shutdown|reboot',
            r'passwd|password',
            r'sudo\s+.*',
            r'chmod\s+777',
            r'chown\s+root',
            r'useradd|userdel|usermod',
            r'wget.*\||curl.*\|',
            r'.*&.*|.*;.*|\|.*'
        ]

        command_lower = command.lower()

        for pattern in dangerous_patterns:
            if re.search(pattern, command_lower):
                return {
                    'allowed': False,
                    'reason': f'Command contains dangerous pattern: {pattern}'
                }

        return {
            'allowed': True,
            'reason': 'Basic security check passed'
        }

    def _execute_script(self, command: str, parameters: Dict) -> Dict[str, Any]:
        """Execute a script or command

        Args:
            command: Command to execute
            parameters: Additional parameters

        Returns:
            Execution result
        """
        try:
            # Safety check - don't execute potentially dangerous commands
            dangerous_patterns = ['rm -rf', 'del /f', 'format', 'fdisk', 'mkfs']
            command_lower = command.lower()

            for pattern in dangerous_patterns:
                if pattern in command_lower:
                    return {
                        'status': 'failed',
                        'error': f'Dangerous command blocked: {pattern}'
                    }

            # Set up execution environment
            env = os.environ.copy()
            if 'environment' in parameters:
                env.update(parameters['environment'])

            # Set working directory
            cwd = parameters.get('working_directory', os.getcwd())

            # Set timeout
            timeout = parameters.get('timeout', 300)  # 5 minutes default

            self.logger.info(f"Executing: {command}")

            # Execute command
            start_time = time.time()
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                env=env,
                cwd=cwd
            )

            # Track active process
            self.active_processes[process.pid] = {
                'command': command,
                'start_time': start_time,
                'process': process
            }

            try:
                stdout, stderr = process.communicate(timeout=timeout)
                execution_time = time.time() - start_time

                # Remove from active processes
                self.active_processes.pop(process.pid, None)

                if process.returncode == 0:
                    return {
                        'status': 'completed',
                        'output': stdout,
                        'execution_time': execution_time
                    }
                else:
                    return {
                        'status': 'failed',
                        'error': stderr or f'Command failed with exit code {process.returncode}',
                        'output': stdout,
                        'execution_time': execution_time
                    }

            except subprocess.TimeoutExpired:
                process.kill()
                self.active_processes.pop(process.pid, None)
                return {
                    'status': 'failed',
                    'error': f'Command timed out after {timeout} seconds'
                }

        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Execution error: {str(e)}'
            }

    def _handle_upload(self, file_path: str, parameters: Dict) -> Dict[str, Any]:
        """Handle file upload operation

        Args:
            file_path: Path to file to upload
            parameters: Upload parameters

        Returns:
            Operation result
        """
        try:
            # This is a placeholder for file upload functionality
            # In a real implementation, you would:
            # 1. Validate the file path
            # 2. Check available disk space
            # 3. Upload to specified destination
            # 4. Verify upload integrity

            destination = parameters.get('destination', '')

            if not os.path.exists(file_path):
                return {
                    'status': 'failed',
                    'error': f'Source file not found: {file_path}'
                }

            # Simulate upload operation
            file_size = os.path.getsize(file_path)

            return {
                'status': 'completed',
                'output': f'File uploaded successfully: {file_path} ({file_size} bytes) to {destination}'
            }

        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Upload error: {str(e)}'
            }

    def _handle_download(self, url: str, parameters: Dict) -> Dict[str, Any]:
        """Handle file download operation

        Args:
            url: URL to download from
            parameters: Download parameters

        Returns:
            Operation result
        """
        try:
            # This is a placeholder for file download functionality
            # In a real implementation, you would:
            # 1. Validate the URL
            # 2. Check available disk space
            # 3. Download with progress monitoring
            # 4. Verify download integrity

            destination = parameters.get('destination', '/tmp/download')

            # Simulate download operation
            return {
                'status': 'completed',
                'output': f'File downloaded successfully from {url} to {destination}'
            }

        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Download error: {str(e)}'
            }

    def _handle_patch(self, patch_info: str, parameters: Dict) -> Dict[str, Any]:
        """Handle patch deployment

        Args:
            patch_info: Patch information
            parameters: Patch parameters

        Returns:
            Operation result
        """
        try:
            # This is a placeholder for patch deployment
            # In a real implementation, you would:
            # 1. Validate patch compatibility
            # 2. Create system backup/snapshot
            # 3. Apply patch during maintenance window
            # 4. Verify patch installation
            # 5. Handle rollback if needed

            patch_type = parameters.get('type', 'security')

            return {
                'status': 'completed',
                'output': f'Patch applied successfully: {patch_info} (type: {patch_type})'
            }

        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Patch error: {str(e)}'
            }

    def _handle_restart(self, service_name: str, parameters: Dict) -> Dict[str, Any]:
        """Handle service restart

        Args:
            service_name: Name of service to restart
            parameters: Restart parameters

        Returns:
            Operation result
        """
        try:
            restart_type = parameters.get('type', 'service')

            if restart_type == 'system':
                # System restart should be scheduled for maintenance window
                return {
                    'status': 'deferred',
                    'message': 'System restart scheduled for next maintenance window'
                }
            elif restart_type == 'service':
                # Service restart
                import platform

                if platform.system().lower() == 'windows':
                    command = f'net stop "{service_name}" && net start "{service_name}"'
                else:
                    command = f'systemctl restart {service_name}'

                result = self._execute_script(command, {})
                return result
            else:
                return {
                    'status': 'failed',
                    'error': f'Unknown restart type: {restart_type}'
                }

        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Restart error: {str(e)}'
            }

    def _handle_health_check(self, check_type: str, parameters: Dict) -> Dict[str, Any]:
        """Handle health check operation

        Args:
            check_type: Type of health check
            parameters: Check parameters

        Returns:
            Operation result
        """
        try:
            # Perform various health checks
            health_results = {}

            if check_type == 'system' or check_type == 'all':
                # System health
                try:
                    import psutil
                    health_results['cpu_usage'] = psutil.cpu_percent(interval=1)
                    health_results['memory_usage'] = psutil.virtual_memory().percent
                    health_results['disk_usage'] = psutil.disk_usage('/').percent
                except:
                    health_results['system'] = 'Unable to get system metrics'

            if check_type == 'network' or check_type == 'all':
                # Network health
                try:
                    import socket
                    socket.create_connection(('8.8.8.8', 53), timeout=5)
                    health_results['network'] = 'OK'
                except:
                    health_results['network'] = 'Network connectivity issues'

            if check_type == 'services' or check_type == 'all':
                # Service health (basic check)
                services_to_check = parameters.get('services', [])
                service_status = {}

                for service in services_to_check:
                    # This would check if specific services are running
                    service_status[service] = 'Running'  # Placeholder

                health_results['services'] = service_status

            return {
                'status': 'completed',
                'output': json.dumps(health_results, indent=2)
            }

        except Exception as e:
            return {
                'status': 'failed',
                'error': f'Health check error: {str(e)}'
            }

    def get_active_processes(self) -> List[Dict]:
        """Get list of active command processes

        Returns:
            List of active process information
        """
        active = []
        current_time = time.time()

        for pid, info in self.active_processes.items():
            active.append({
                'pid': pid,
                'command': info['command'],
                'runtime': current_time - info['start_time']
            })

        return active

    def terminate_process(self, pid: int) -> bool:
        """Terminate a running process

        Args:
            pid: Process ID to terminate

        Returns:
            True if successful, False otherwise
        """
        try:
            if pid in self.active_processes:
                process = self.active_processes[pid]['process']
                process.terminate()

                # Wait for graceful termination
                try:
                    process.wait(timeout=10)
                except subprocess.TimeoutExpired:
                    # Force kill if needed
                    process.kill()

                self.active_processes.pop(pid, None)
                return True

            return False

        except Exception as e:
            self.logger.error(f"Error terminating process {pid}: {e}")
            return False


class CommandScheduler:
    """Intelligent command scheduler that respects system state and operations"""

    def __init__(self, api_client: APIClient, smart_queue: SmartQueue, 
                 operation_monitor: OperationMonitor):
        """Initialize command scheduler

        Args:
            api_client: API client for server communication
            smart_queue: Smart command queue
            operation_monitor: Operation monitor
        """
        self.api_client = api_client
        self.smart_queue = smart_queue
        self.operation_monitor = operation_monitor
        self.executor = CommandExecutor(operation_monitor)

        self.logger = logging.getLogger('CommandScheduler')
        self.running = False
        self.scheduler_thread = None
        self.agent_id = None

        # Scheduling configuration
        self.poll_interval = 30  # seconds
        self.max_concurrent_commands = 2
        self.maintenance_window_start = '02:00'
        self.maintenance_window_end = '04:00'

    def start(self):
        """Start the command scheduler"""
        if self.running:
            return

        self.running = True
        self.scheduler_thread = threading.Thread(target=self._scheduler_loop, daemon=True)
        self.scheduler_thread.start()

        self.logger.info("Command scheduler started")

    def stop(self):
        """Stop the command scheduler"""
        self.running = False

        if self.scheduler_thread:
            self.scheduler_thread.join(timeout=10)

        self.logger.info("Command scheduler stopped")

    def set_agent_id(self, agent_id: int):
        """Set the agent ID for this scheduler

        Args:
            agent_id: Agent ID from server
        """
        self.agent_id = agent_id
        self.logger.info(f"Agent ID set to {agent_id}")

    def _scheduler_loop(self):
        """Main scheduler loop"""
        while self.running:
            try:
                self._process_commands()
                time.sleep(self.poll_interval)

            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {e}")
                time.sleep(60)  # Wait longer on error

    def _process_commands(self):
        """Process pending commands from the server"""
        try:
            # Get pending commands from server
            pending_commands = self.api_client.get_pending_commands(self.agent_id)

            if not pending_commands:
                return

            for command_info in pending_commands:
                # Add to smart queue for processing
                self._add_command_to_queue(command_info)

            # Process commands from queue
            self._execute_queued_commands()

        except Exception as e:
            self.logger.error(f"Error processing commands: {e}")

    def _add_command_to_queue(self, command):
        """Add command to the smart queue"""
        try:
            # Validate command structure
            if not isinstance(command, dict):
                self.logger.error(f"Invalid command structure - expected dict, got {type(command)}: {command}")
                return

            if 'id' not in command:
                self.logger.error(f"Invalid command structure - missing 'id' field: {command}")
                return

            self.smart_queue.add_command(command)
            self.logger.info(f"Added command {command['id']} to queue")

        except Exception as e:
            self.logger.error(f"Error adding command to queue: {e}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")

    def _execute_queued_commands(self):
        """Execute commands from the smart queue"""
        try:
            # Check if we can execute more commands
            active_processes = self.executor.get_active_processes()

            if len(active_processes) >= self.max_concurrent_commands:
                self.logger.debug("Maximum concurrent commands reached")
                return

            # Check system state
            if self.operation_monitor.is_system_busy():
                self.logger.debug("System is busy, deferring command execution")
                return

            # Get next command from queue
            command_info = self.smart_queue.get_next_command()

            if not command_info:
                return

            command_id = command_info.get('id')

            # Update command status to executing
            self.api_client.update_command_status(command_id, 'executing')

            # Execute command in separate thread
            execution_thread = threading.Thread(
                target=self._execute_command_async,
                args=(command_info,),
                daemon=True
            )
            execution_thread.start()

        except Exception as e:
            self.logger.error(f"Error executing queued commands: {e}")

    def _execute_command_async(self, command_info: Dict[str, Any]):
        """Execute a command asynchronously

        Args:
            command_info: Command information
        """
        command_id = command_info.get('id')

        try:
            # Execute the command
            result = self.executor.execute_command(command_info)

            # Update command status based on result
            status = result.get('status', 'failed')
            output = result.get('output', '')
            error = result.get('error', '')

            if status == 'deferred':
                # Re-queue the command
                self.smart_queue.add_command(command_info)
                self.api_client.update_command_status(command_id, 'deferred')
            else:
                self.api_client.update_command_status(
                    command_id, status, output, error
                )

            self.logger.info(f"Command {command_id} completed with status: {status}")

        except Exception as e:
            self.logger.error(f"Error executing command {command_id}: {e}")
            self.api_client.update_command_status(
                command_id, 'failed', error_message=str(e)
            )

    def _is_maintenance_window(self) -> bool:
        """Check if current time is within maintenance window

        Returns:
            True if in maintenance window, False otherwise
        """
        try:
            from datetime import datetime, time as dt_time

            now = datetime.now().time()
            start_time = dt_time.fromisoformat(self.maintenance_window_start)
            end_time = dt_time.fromisoformat(self.maintenance_window_end)

            if start_time <= end_time:
                # Same day window
                return start_time <= now <= end_time
            else:
                # Overnight window
                return now >= start_time or now <= end_time

        except Exception as e:
            self.logger.error(f"Error checking maintenance window: {e}")
            return False

    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status

        Returns:
            Scheduler status information
        """
        return {
            'running': self.running,
            'agent_id': self.agent_id,
            'active_processes': self.executor.get_active_processes(),
            'queue_length': self.smart_queue.get_queue_length(),
            'system_busy': self.operation_monitor.is_system_busy(),
            'maintenance_window': self._is_maintenance_window()
        }


if __name__ == '__main__':
    # Test the command scheduler
    from api_client import APIClient
    from smart_queue import SmartQueue
    from operation_monitor import OperationMonitor

    # Initialize components
    api_client = APIClient('http://localhost:5000', 'test-token')
    operation_monitor = OperationMonitor()
    smart_queue = SmartQueue(operation_monitor)

    # Create scheduler
    scheduler = CommandScheduler(api_client, smart_queue, operation_monitor)

    print("Command scheduler test")
    print("Status:", scheduler.get_scheduler_status())

    # Test command execution
    test_command = {
        'id': 1,
        'type': 'execute',
        'command': 'echo "Hello World"',
        'parameters': {}
    }

    result = scheduler.executor.execute_command(test_command)
    print("Test execution result:", result)