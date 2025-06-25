#!/usr/bin/env python3
"""
Operation Monitor for ITSM Agent
Monitors system state and running operations to prevent conflicts
"""

import time
import threading
import logging
import subprocess
import os
from typing import Dict, List, Set, Optional, Any
from datetime import datetime, timedelta
from collections import defaultdict

try:
    import psutil
except ImportError:
    psutil = None


class ProcessMonitor:
    """Monitors running processes for operation detection"""
    
    def __init__(self):
        """Initialize process monitor"""
        self.logger = logging.getLogger('ProcessMonitor')
        self.known_processes = {}  # pid -> process info
        self.process_patterns = {
            # Patterns that indicate critical operations
            'backup': ['backup', 'rsync', 'robocopy', 'xcopy', 'tar', 'zip', '7z'],
            'antivirus': ['scan', 'antivirus', 'defender', 'mcafee', 'norton', 'avast'],
            'database': ['mysql', 'postgres', 'oracle', 'sqlserver', 'mongodb'],
            'update': ['update', 'patch', 'install', 'upgrade', 'yum', 'apt', 'chocolatey'],
            'deployment': ['deploy', 'jenkins', 'ansible', 'puppet', 'chef'],
            'maintenance': ['defrag', 'chkdsk', 'fsck', 'cleanup', 'optimize']
        }
    
    def get_critical_processes(self) -> Dict[str, List[Dict]]:
        """Get currently running critical processes
        
        Returns:
            Dictionary of critical processes by category
        """
        critical_processes = defaultdict(list)
        
        if not psutil:
            return dict(critical_processes)
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'cpu_percent', 'memory_percent']):
                try:
                    proc_info = proc.info
                    if not proc_info['name']:
                        continue
                    
                    # Check process name and command line against patterns
                    name_lower = proc_info['name'].lower()
                    cmdline = ' '.join(proc_info['cmdline'] or []).lower()
                    
                    for category, patterns in self.process_patterns.items():
                        for pattern in patterns:
                            if pattern in name_lower or pattern in cmdline:
                                critical_processes[category].append({
                                    'pid': proc_info['pid'],
                                    'name': proc_info['name'],
                                    'cpu_percent': proc_info['cpu_percent'] or 0,
                                    'memory_percent': proc_info['memory_percent'] or 0,
                                    'cmdline': cmdline
                                })
                                break
                
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
        
        except Exception as e:
            self.logger.error(f"Error getting critical processes: {e}")
        
        return dict(critical_processes)
    
    def is_process_category_active(self, category: str) -> bool:
        """Check if any processes in a category are running
        
        Args:
            category: Process category to check
            
        Returns:
            True if processes in category are active
        """
        critical_processes = self.get_critical_processes()
        return len(critical_processes.get(category, [])) > 0
    
    def get_high_resource_processes(self, cpu_threshold: float = 50.0, 
                                  memory_threshold: float = 50.0) -> List[Dict]:
        """Get processes using high system resources
        
        Args:
            cpu_threshold: CPU usage threshold percentage
            memory_threshold: Memory usage threshold percentage
            
        Returns:
            List of high resource usage processes
        """
        high_resource_processes = []
        
        if not psutil:
            return high_resource_processes
        
        try:
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent']):
                try:
                    proc_info = proc.info
                    cpu_percent = proc_info['cpu_percent'] or 0
                    memory_percent = proc_info['memory_percent'] or 0
                    
                    if cpu_percent >= cpu_threshold or memory_percent >= memory_threshold:
                        high_resource_processes.append(proc_info)
                
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    continue
        
        except Exception as e:
            self.logger.error(f"Error getting high resource processes: {e}")
        
        return high_resource_processes


class SystemLoadMonitor:
    """Monitors system resource usage and load"""
    
    def __init__(self):
        """Initialize system load monitor"""
        self.logger = logging.getLogger('SystemLoadMonitor')
        self.load_history = []  # Recent load measurements
        self.max_history = 20  # Keep last 20 measurements
        
        # Thresholds
        self.cpu_threshold = 80.0
        self.memory_threshold = 80.0
        self.disk_threshold = 90.0
        self.load_threshold = 2.0  # For Unix systems
    
    def get_current_load(self) -> Dict[str, Any]:
        """Get current system load metrics
        
        Returns:
            Dictionary of current system metrics
        """
        load_info = {
            'timestamp': datetime.now().isoformat(),
            'cpu_percent': 0,
            'memory_percent': 0,
            'disk_percent': 0,
            'load_average': None,
            'io_wait': 0
        }
        
        if not psutil:
            return load_info
        
        try:
            # CPU usage
            load_info['cpu_percent'] = psutil.cpu_percent(interval=None)
            
            # Memory usage
            memory = psutil.virtual_memory()
            load_info['memory_percent'] = memory.percent
            
            # Disk usage (primary disk)
            disk_path = 'C:\\' if os.name == 'nt' else '/'
            try:
                disk = psutil.disk_usage(disk_path)
                load_info['disk_percent'] = (disk.used / disk.total) * 100
            except:
                pass
            
            # Load average (Unix systems)
            if hasattr(os, 'getloadavg'):
                load_info['load_average'] = os.getloadavg()
            
            # I/O wait (if available)
            if hasattr(psutil, 'cpu_times'):
                cpu_times = psutil.cpu_times()
                if hasattr(cpu_times, 'iowait'):
                    load_info['io_wait'] = cpu_times.iowait
        
        except Exception as e:
            self.logger.error(f"Error getting system load: {e}")
        
        return load_info
    
    def update_load_history(self):
        """Update the load history with current measurements"""
        current_load = self.get_current_load()
        
        self.load_history.append(current_load)
        
        # Keep only recent history
        if len(self.load_history) > self.max_history:
            self.load_history = self.load_history[-self.max_history:]
    
    def is_system_under_load(self) -> bool:
        """Check if system is under high load
        
        Returns:
            True if system is under high load
        """
        current_load = self.get_current_load()
        
        # Check CPU threshold
        if current_load['cpu_percent'] > self.cpu_threshold:
            return True
        
        # Check memory threshold
        if current_load['memory_percent'] > self.memory_threshold:
            return True
        
        # Check disk threshold
        if current_load['disk_percent'] > self.disk_threshold:
            return True
        
        # Check load average (Unix systems)
        if current_load['load_average']:
            if current_load['load_average'][0] > self.load_threshold:
                return True
        
        return False
    
    def get_load_trend(self) -> str:
        """Get system load trend
        
        Returns:
            Load trend: 'increasing', 'decreasing', 'stable'
        """
        if len(self.load_history) < 3:
            return 'stable'
        
        try:
            # Compare recent CPU usage
            recent_cpu = [load['cpu_percent'] for load in self.load_history[-3:]]
            
            if recent_cpu[-1] > recent_cpu[0] + 10:
                return 'increasing'
            elif recent_cpu[-1] < recent_cpu[0] - 10:
                return 'decreasing'
            else:
                return 'stable'
        
        except Exception:
            return 'stable'
    
    def get_average_load(self, minutes: int = 5) -> Dict[str, float]:
        """Get average load over specified time period
        
        Args:
            minutes: Time period in minutes
            
        Returns:
            Average load metrics
        """
        if not self.load_history:
            return {'cpu_percent': 0, 'memory_percent': 0, 'disk_percent': 0}
        
        # Filter history by time
        cutoff_time = datetime.now() - timedelta(minutes=minutes)
        recent_loads = [
            load for load in self.load_history
            if datetime.fromisoformat(load['timestamp']) >= cutoff_time
        ]
        
        if not recent_loads:
            recent_loads = self.load_history[-1:]  # At least one measurement
        
        # Calculate averages
        avg_cpu = sum(load['cpu_percent'] for load in recent_loads) / len(recent_loads)
        avg_memory = sum(load['memory_percent'] for load in recent_loads) / len(recent_loads)
        avg_disk = sum(load['disk_percent'] for load in recent_loads) / len(recent_loads)
        
        return {
            'cpu_percent': avg_cpu,
            'memory_percent': avg_memory,
            'disk_percent': avg_disk
        }


class OperationMonitor:
    """Main operation monitor that coordinates system monitoring"""
    
    def __init__(self):
        """Initialize operation monitor"""
        self.logger = logging.getLogger('OperationMonitor')
        self.process_monitor = ProcessMonitor()
        self.load_monitor = SystemLoadMonitor()
        
        # Operation tracking
        self.active_operations = set()  # Currently active operation types
        self.operation_locks = {}  # operation_type -> lock_info
        
        # System state cache
        self.last_update = None
        self.update_interval = 30  # seconds
        self.system_state = {}
        
        # Monitoring thread
        self.monitoring = False
        self.monitor_thread = None
    
    def start_monitoring(self):
        """Start background monitoring"""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitor_thread.start()
        
        self.logger.info("Operation monitoring started")
    
    def stop_monitoring(self):
        """Stop background monitoring"""
        self.monitoring = False
        
        if self.monitor_thread:
            self.monitor_thread.join(timeout=10)
        
        self.logger.info("Operation monitoring stopped")
    
    def _monitoring_loop(self):
        """Background monitoring loop"""
        while self.monitoring:
            try:
                self.update_system_state()
                time.sleep(self.update_interval)
                
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                time.sleep(60)  # Wait longer on error
    
    def update_system_state(self, system_info: Dict[str, Any] = None):
        """Update system state information
        
        Args:
            system_info: Optional system information to include
        """
        try:
            current_time = datetime.now()
            
            # Check if update is needed
            if (self.last_update and 
                (current_time - self.last_update).seconds < self.update_interval):
                return
            
            # Update load history
            self.load_monitor.update_load_history()
            
            # Get current system state
            self.system_state = {
                'timestamp': current_time.isoformat(),
                'load_info': self.load_monitor.get_current_load(),
                'critical_processes': self.process_monitor.get_critical_processes(),
                'high_resource_processes': self.process_monitor.get_high_resource_processes(),
                'system_under_load': self.load_monitor.is_system_under_load(),
                'load_trend': self.load_monitor.get_load_trend(),
                'active_operations': list(self.active_operations),
                'operation_locks': dict(self.operation_locks)
            }
            
            # Include additional system info if provided
            if system_info:
                self.system_state['additional_info'] = system_info
            
            self.last_update = current_time
            
        except Exception as e:
            self.logger.error(f"Error updating system state: {e}")
    
    def is_system_busy(self) -> bool:
        """Check if system is busy and should defer operations
        
        Returns:
            True if system is busy, False otherwise
        """
        try:
            # Update state if needed
            if not self.system_state or not self.last_update:
                self.update_system_state()
            
            # Check system load
            if self.load_monitor.is_system_under_load():
                return True
            
            # Check for critical operations
            critical_processes = self.process_monitor.get_critical_processes()
            
            # Defer if backup, antivirus scan, or maintenance is running
            critical_categories = ['backup', 'antivirus', 'maintenance', 'update']
            for category in critical_categories:
                if critical_processes.get(category):
                    self.logger.debug(f"System busy: {category} operation detected")
                    return True
            
            # Check for high resource usage processes
            high_resource = self.process_monitor.get_high_resource_processes()
            if len(high_resource) > 3:  # Multiple high-resource processes
                return True
            
            # Check operation locks
            if self.operation_locks:
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error checking if system is busy: {e}")
            return True  # Err on the side of caution
    
    def check_running_operations(self):
        """Check for currently running operations and update tracking"""
        try:
            critical_processes = self.process_monitor.get_critical_processes()
            
            # Update active operations based on running processes
            current_operations = set()
            
            for category, processes in critical_processes.items():
                if processes:
                    current_operations.add(category)
            
            # Log new operations
            new_operations = current_operations - self.active_operations
            for op in new_operations:
                self.logger.info(f"Detected new operation: {op}")
            
            # Log completed operations
            completed_operations = self.active_operations - current_operations
            for op in completed_operations:
                self.logger.info(f"Operation completed: {op}")
            
            self.active_operations = current_operations
            
        except Exception as e:
            self.logger.error(f"Error checking running operations: {e}")
    
    def add_operation_lock(self, operation_type: str, reason: str, 
                          duration_minutes: int = 60):
        """Add an operation lock to prevent conflicts
        
        Args:
            operation_type: Type of operation to lock
            reason: Reason for the lock
            duration_minutes: Lock duration in minutes
        """
        expires_at = datetime.now() + timedelta(minutes=duration_minutes)
        
        self.operation_locks[operation_type] = {
            'reason': reason,
            'created_at': datetime.now().isoformat(),
            'expires_at': expires_at.isoformat()
        }
        
        self.logger.info(f"Added operation lock: {operation_type} - {reason}")
    
    def remove_operation_lock(self, operation_type: str):
        """Remove an operation lock
        
        Args:
            operation_type: Type of operation to unlock
        """
        if operation_type in self.operation_locks:
            del self.operation_locks[operation_type]
            self.logger.info(f"Removed operation lock: {operation_type}")
    
    def cleanup_expired_locks(self):
        """Remove expired operation locks"""
        current_time = datetime.now()
        expired_locks = []
        
        for op_type, lock_info in self.operation_locks.items():
            try:
                expires_at = datetime.fromisoformat(lock_info['expires_at'])
                if current_time >= expires_at:
                    expired_locks.append(op_type)
            except:
                # Invalid timestamp, remove lock
                expired_locks.append(op_type)
        
        for op_type in expired_locks:
            self.remove_operation_lock(op_type)
    
    def is_operation_locked(self, operation_type: str) -> bool:
        """Check if an operation type is locked
        
        Args:
            operation_type: Operation type to check
            
        Returns:
            True if operation is locked
        """
        # Clean up expired locks first
        self.cleanup_expired_locks()
        
        return operation_type in self.operation_locks
    
    def get_safe_execution_window(self) -> Dict[str, Any]:
        """Get information about safe execution windows
        
        Returns:
            Safe execution window information
        """
        return {
            'system_busy': self.is_system_busy(),
            'load_trend': self.load_monitor.get_load_trend(),
            'active_operations': list(self.active_operations),
            'operation_locks': dict(self.operation_locks),
            'current_load': self.load_monitor.get_current_load(),
            'recommendation': self._get_execution_recommendation()
        }
    
    def _get_execution_recommendation(self) -> str:
        """Get execution recommendation based on current system state
        
        Returns:
            Execution recommendation string
        """
        if self.is_system_busy():
            return "defer"  # Defer execution
        
        load_trend = self.load_monitor.get_load_trend()
        current_load = self.load_monitor.get_current_load()
        
        if load_trend == "increasing" and current_load['cpu_percent'] > 60:
            return "defer"  # System load increasing
        
        if len(self.active_operations) > 0:
            return "defer"  # Other operations running
        
        return "execute"  # Safe to execute
    
    def get_monitoring_status(self) -> Dict[str, Any]:
        """Get current monitoring status
        
        Returns:
            Monitoring status information
        """
        return {
            'monitoring_active': self.monitoring,
            'last_update': self.last_update.isoformat() if self.last_update else None,
            'system_state': self.system_state,
            'psutil_available': psutil is not None
        }


if __name__ == '__main__':
    # Test the operation monitor
    monitor = OperationMonitor()
    
    print("Operation Monitor Test")
    print("=" * 50)
    
    # Test system state
    monitor.update_system_state()
    print(f"System busy: {monitor.is_system_busy()}")
    
    # Test safe execution window
    window_info = monitor.get_safe_execution_window()
    print(f"Execution recommendation: {window_info['recommendation']}")
    print(f"Load trend: {window_info['load_trend']}")
    
    # Test operation locks
    monitor.add_operation_lock("test_operation", "Testing", 1)
    print(f"Operation locked: {monitor.is_operation_locked('test_operation')}")
    
    time.sleep(2)
    
    # Test lock cleanup
    monitor.cleanup_expired_locks()
    print(f"Operation locked after cleanup: {monitor.is_operation_locked('test_operation')}")
    
    # Test process monitoring
    critical_procs = monitor.process_monitor.get_critical_processes()
    print(f"Critical processes found: {len(sum(critical_procs.values(), []))}")
    
    print("\nMonitoring status:")
    status = monitor.get_monitoring_status()
    print(f"Monitoring active: {status['monitoring_active']}")
    print(f"psutil available: {status['psutil_available']}")
