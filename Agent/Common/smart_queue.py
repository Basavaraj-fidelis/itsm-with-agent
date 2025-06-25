#!/usr/bin/env python3
"""
Smart Command Queue for ITSM Agent
Implements intelligent queueing with priority handling and conflict avoidance
"""

import time
import threading
import logging
import heapq
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from operation_monitor import OperationMonitor


class CommandPriority(Enum):
    """Command priority levels"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 5
    LOW = 8
    DEFERRED = 10


class CommandCategory(Enum):
    """Command categories for conflict detection"""
    SYSTEM_CRITICAL = "system_critical"
    MAINTENANCE = "maintenance"
    MONITORING = "monitoring"
    DEPLOYMENT = "deployment"
    BACKUP = "backup"
    SECURITY = "security"
    USER_OPERATION = "user_operation"


@dataclass
class QueuedCommand:
    """Represents a command in the queue with metadata"""
    command_info: Dict[str, Any]
    priority: int
    category: str
    queued_at: datetime
    retry_count: int = 0
    max_retries: int = 3
    defer_until: Optional[datetime] = None
    dependencies: List[str] = field(default_factory=list)
    conflicts_with: List[str] = field(default_factory=list)
    execution_window: Optional[Dict[str, str]] = None
    
    def __lt__(self, other):
        """Comparison for priority queue (lower number = higher priority)"""
        if self.priority != other.priority:
            return self.priority < other.priority
        # If same priority, older commands first
        return self.queued_at < other.queued_at
    
    def can_execute_now(self) -> bool:
        """Check if command can execute now"""
        if self.defer_until and datetime.now() < self.defer_until:
            return False
        
        # Check execution window if specified
        if self.execution_window:
            return self._is_in_execution_window()
        
        return True
    
    def _is_in_execution_window(self) -> bool:
        """Check if current time is within execution window"""
        try:
            if not self.execution_window:
                return True
            
            from datetime import time as dt_time
            
            now = datetime.now().time()
            start_time = dt_time.fromisoformat(self.execution_window.get('start', '00:00'))
            end_time = dt_time.fromisoformat(self.execution_window.get('end', '23:59'))
            
            if start_time <= end_time:
                # Same day window
                return start_time <= now <= end_time
            else:
                # Overnight window
                return now >= start_time or now <= end_time
                
        except Exception:
            return True  # Default to allowing execution
    
    def increment_retry(self):
        """Increment retry count"""
        self.retry_count += 1
    
    def has_retries_left(self) -> bool:
        """Check if command has retries remaining"""
        return self.retry_count < self.max_retries
    
    def defer_execution(self, minutes: int = 5):
        """Defer command execution for specified minutes"""
        self.defer_until = datetime.now() + timedelta(minutes=minutes)
    
    def get_age_minutes(self) -> float:
        """Get command age in minutes"""
        return (datetime.now() - self.queued_at).total_seconds() / 60


class ConflictResolver:
    """Resolves conflicts between commands"""
    
    def __init__(self):
        """Initialize conflict resolver"""
        self.logger = logging.getLogger('ConflictResolver')
        
        # Define conflict rules
        self.conflict_matrix = {
            CommandCategory.SYSTEM_CRITICAL: [
                CommandCategory.MAINTENANCE,
                CommandCategory.DEPLOYMENT
            ],
            CommandCategory.MAINTENANCE: [
                CommandCategory.SYSTEM_CRITICAL,
                CommandCategory.DEPLOYMENT,
                CommandCategory.BACKUP
            ],
            CommandCategory.DEPLOYMENT: [
                CommandCategory.SYSTEM_CRITICAL,
                CommandCategory.MAINTENANCE,
                CommandCategory.BACKUP
            ],
            CommandCategory.BACKUP: [
                CommandCategory.MAINTENANCE,
                CommandCategory.DEPLOYMENT
            ]
        }
    
    def get_command_category(self, command_info: Dict[str, Any]) -> CommandCategory:
        """Determine command category based on command information
        
        Args:
            command_info: Command information dictionary
            
        Returns:
            Command category
        """
        command_type = command_info.get('type', '').lower()
        command_text = command_info.get('command', '').lower()
        priority = command_info.get('priority', 5)
        
        # High priority commands are often system critical
        if priority <= 2:
            return CommandCategory.SYSTEM_CRITICAL
        
        # Categorize by command type
        if command_type in ['restart', 'reboot']:
            return CommandCategory.SYSTEM_CRITICAL
        elif command_type in ['patch', 'update', 'install']:
            return CommandCategory.MAINTENANCE
        elif command_type in ['deploy', 'upload']:
            return CommandCategory.DEPLOYMENT
        elif command_type in ['backup', 'download']:
            return CommandCategory.BACKUP
        elif command_type in ['health_check', 'monitor']:
            return CommandCategory.MONITORING
        elif 'security' in command_text or 'firewall' in command_text:
            return CommandCategory.SECURITY
        else:
            return CommandCategory.USER_OPERATION
    
    def has_conflicts(self, category1: CommandCategory, category2: CommandCategory) -> bool:
        """Check if two command categories conflict
        
        Args:
            category1: First command category
            category2: Second command category
            
        Returns:
            True if categories conflict
        """
        conflicts = self.conflict_matrix.get(category1, [])
        return category2 in conflicts
    
    def resolve_conflict(self, current_commands: List[QueuedCommand], 
                        new_command: QueuedCommand) -> Tuple[bool, str]:
        """Resolve conflicts between new command and existing commands
        
        Args:
            current_commands: Currently executing commands
            new_command: New command to check
            
        Returns:
            Tuple of (can_execute, reason)
        """
        new_category = CommandCategory(new_command.category)
        
        for current_cmd in current_commands:
            current_category = CommandCategory(current_cmd.category)
            
            if self.has_conflicts(new_category, current_category):
                return False, f"Conflicts with {current_category.value} operation"
        
        return True, "No conflicts detected"


class SmartQueue:
    """Intelligent command queue with priority handling and conflict resolution"""
    
    def __init__(self, operation_monitor: OperationMonitor):
        """Initialize smart queue
        
        Args:
            operation_monitor: Operation monitor for system state awareness
        """
        self.operation_monitor = operation_monitor
        self.conflict_resolver = ConflictResolver()
        self.logger = logging.getLogger('SmartQueue')
        
        # Queue management
        self._queue = []  # Priority queue of QueuedCommand objects
        self._queue_lock = threading.RLock()
        
        # Command tracking
        self.executing_commands = {}  # command_id -> QueuedCommand
        self.deferred_commands = {}  # command_id -> QueuedCommand
        self.completed_commands = {}  # command_id -> result (last 100)
        
        # Statistics
        self.stats = {
            'total_queued': 0,
            'total_executed': 0,
            'total_failed': 0,
            'total_deferred': 0,
            'avg_wait_time': 0.0
        }
        
        # Queue processing
        self.max_queue_size = 100
        self.max_age_hours = 24
        
        # Start cleanup thread
        self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
        self.cleanup_thread.start()
    
    def add_command(self, command_info: Dict[str, Any]) -> bool:
        """Add a command to the queue
        
        Args:
            command_info: Command information from server
            
        Returns:
            True if command was queued successfully
        """
        try:
            with self._queue_lock:
                # Check queue size limit
                if len(self._queue) >= self.max_queue_size:
                    self.logger.warning("Queue size limit reached, rejecting command")
                    return False
                
                # Create queued command
                category = self.conflict_resolver.get_command_category(command_info)
                priority = command_info.get('priority', CommandPriority.NORMAL.value)
                
                queued_command = QueuedCommand(
                    command_info=command_info,
                    priority=priority,
                    category=category.value,
                    queued_at=datetime.now()
                )
                
                # Set execution window for certain command types
                self._set_execution_window(queued_command)
                
                # Add to priority queue
                heapq.heappush(self._queue, queued_command)
                
                self.stats['total_queued'] += 1
                
                self.logger.info(
                    f"Command queued: {command_info.get('id')} "
                    f"(type: {command_info.get('type')}, priority: {priority}, "
                    f"category: {category.value})"
                )
                
                return True
                
        except Exception as e:
            self.logger.error(f"Error adding command to queue: {e}")
            return False
    
    def get_next_command(self) -> Optional[Dict[str, Any]]:
        """Get next command for execution
        
        Returns:
            Command information or None if no suitable command available
        """
        try:
            with self._queue_lock:
                if not self._queue:
                    return None
                
                # Try to find an executable command
                candidates = []
                
                # Extract all commands and check executability
                while self._queue:
                    cmd = heapq.heappop(self._queue)
                    candidates.append(cmd)
                
                # Find best executable command
                for cmd in candidates:
                    # Check if command can execute now
                    if not cmd.can_execute_now():
                        continue
                    
                    # Check system state
                    if self._should_defer_due_to_system_state(cmd):
                        cmd.defer_execution(5)  # Defer for 5 minutes
                        continue
                    
                    # Check for conflicts with executing commands
                    can_execute, reason = self.conflict_resolver.resolve_conflict(
                        list(self.executing_commands.values()), cmd
                    )
                    
                    if not can_execute:
                        self.logger.debug(f"Command {cmd.command_info.get('id')} deferred: {reason}")
                        cmd.defer_execution(2)  # Defer for 2 minutes
                        continue
                    
                    # Found executable command
                    command_id = cmd.command_info.get('id')
                    self.executing_commands[command_id] = cmd
                    
                    # Re-queue remaining candidates
                    for remaining_cmd in candidates:
                        if remaining_cmd != cmd:
                            heapq.heappush(self._queue, remaining_cmd)
                    
                    self.logger.info(f"Selected command for execution: {command_id}")
                    return cmd.command_info
                
                # No executable command found, re-queue all
                for cmd in candidates:
                    heapq.heappush(self._queue, cmd)
                
                return None
                
        except Exception as e:
            self.logger.error(f"Error getting next command: {e}")
            return None
    
    def mark_command_completed(self, command_id: int, result: Dict[str, Any]):
        """Mark a command as completed
        
        Args:
            command_id: Command ID
            result: Execution result
        """
        try:
            with self._queue_lock:
                if command_id in self.executing_commands:
                    cmd = self.executing_commands.pop(command_id)
                    
                    # Update statistics
                    wait_time = (datetime.now() - cmd.queued_at).total_seconds() / 60
                    self._update_avg_wait_time(wait_time)
                    
                    if result.get('status') == 'completed':
                        self.stats['total_executed'] += 1
                    else:
                        self.stats['total_failed'] += 1
                    
                    # Store in completed commands (limited history)
                    self.completed_commands[command_id] = {
                        'command': cmd,
                        'result': result,
                        'completed_at': datetime.now()
                    }
                    
                    # Keep only last 100 completed commands
                    if len(self.completed_commands) > 100:
                        oldest_id = min(self.completed_commands.keys())
                        del self.completed_commands[oldest_id]
                    
                    self.logger.info(f"Command {command_id} marked as completed")
                
        except Exception as e:
            self.logger.error(f"Error marking command completed: {e}")
    
    def mark_command_failed(self, command_id: int, error: str, retry: bool = True):
        """Mark a command as failed and optionally retry
        
        Args:
            command_id: Command ID
            error: Error message
            retry: Whether to retry the command
        """
        try:
            with self._queue_lock:
                if command_id in self.executing_commands:
                    cmd = self.executing_commands.pop(command_id)
                    
                    if retry and cmd.has_retries_left():
                        cmd.increment_retry()
                        cmd.defer_execution(10)  # Defer retry for 10 minutes
                        
                        # Re-queue for retry
                        heapq.heappush(self._queue, cmd)
                        
                        self.logger.info(
                            f"Command {command_id} failed, retry {cmd.retry_count}/{cmd.max_retries}: {error}"
                        )
                    else:
                        # No more retries
                        self.stats['total_failed'] += 1
                        
                        self.completed_commands[command_id] = {
                            'command': cmd,
                            'result': {'status': 'failed', 'error': error},
                            'completed_at': datetime.now()
                        }
                        
                        self.logger.error(f"Command {command_id} failed permanently: {error}")
                
        except Exception as e:
            self.logger.error(f"Error marking command failed: {e}")
    
    def defer_command(self, command_id: int, reason: str, minutes: int = 5):
        """Defer a command execution
        
        Args:
            command_id: Command ID
            reason: Reason for deferral
            minutes: Minutes to defer
        """
        try:
            with self._queue_lock:
                if command_id in self.executing_commands:
                    cmd = self.executing_commands.pop(command_id)
                    cmd.defer_execution(minutes)
                    
                    # Re-queue the command
                    heapq.heappush(self._queue, cmd)
                    
                    self.stats['total_deferred'] += 1
                    
                    self.logger.info(f"Command {command_id} deferred for {minutes} minutes: {reason}")
                
        except Exception as e:
            self.logger.error(f"Error deferring command: {e}")
    
    def get_queue_length(self) -> int:
        """Get current queue length
        
        Returns:
            Number of commands in queue
        """
        with self._queue_lock:
            return len(self._queue)
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get detailed queue status
        
        Returns:
            Queue status information
        """
        with self._queue_lock:
            # Count commands by priority
            priority_counts = {}
            for cmd in self._queue:
                priority = cmd.priority
                priority_counts[priority] = priority_counts.get(priority, 0) + 1
            
            # Count commands by category
            category_counts = {}
            for cmd in self._queue:
                category = cmd.category
                category_counts[category] = category_counts.get(category, 0) + 1
            
            return {
                'queue_length': len(self._queue),
                'executing_count': len(self.executing_commands),
                'completed_count': len(self.completed_commands),
                'priority_distribution': priority_counts,
                'category_distribution': category_counts,
                'oldest_command_age_minutes': self._get_oldest_command_age(),
                'statistics': self.stats.copy()
            }
    
    def _set_execution_window(self, cmd: QueuedCommand):
        """Set execution window for commands that require it
        
        Args:
            cmd: Queued command to set window for
        """
        command_type = cmd.command_info.get('type', '').lower()
        
        # System maintenance commands should run during maintenance window
        if command_type in ['patch', 'restart', 'reboot', 'update']:
            cmd.execution_window = {
                'start': '02:00',  # 2 AM
                'end': '04:00'     # 4 AM
            }
    
    def _should_defer_due_to_system_state(self, cmd: QueuedCommand) -> bool:
        """Check if command should be deferred due to system state
        
        Args:
            cmd: Command to check
            
        Returns:
            True if command should be deferred
        """
        # Check if system is busy
        if self.operation_monitor.is_system_busy():
            # High priority commands can still execute
            if cmd.priority <= CommandPriority.HIGH.value:
                return False
            return True
        
        # Check load trend for resource-intensive operations
        window_info = self.operation_monitor.get_safe_execution_window()
        if window_info['load_trend'] == 'increasing':
            # Defer non-critical operations when load is increasing
            if cmd.priority > CommandPriority.NORMAL.value:
                return True
        
        return False
    
    def _update_avg_wait_time(self, new_wait_time: float):
        """Update average wait time statistic
        
        Args:
            new_wait_time: New wait time in minutes
        """
        total_executed = self.stats['total_executed'] + self.stats['total_failed']
        if total_executed > 0:
            current_avg = self.stats['avg_wait_time']
            self.stats['avg_wait_time'] = (
                (current_avg * (total_executed - 1) + new_wait_time) / total_executed
            )
    
    def _get_oldest_command_age(self) -> float:
        """Get age of oldest command in queue
        
        Returns:
            Age in minutes
        """
        if not self._queue:
            return 0.0
        
        oldest_time = min(cmd.queued_at for cmd in self._queue)
        return (datetime.now() - oldest_time).total_seconds() / 60
    
    def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                self._cleanup_old_commands()
                time.sleep(300)  # Cleanup every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in cleanup loop: {e}")
                time.sleep(600)  # Wait longer on error
    
    def _cleanup_old_commands(self):
        """Remove old commands from queue"""
        try:
            with self._queue_lock:
                cutoff_time = datetime.now() - timedelta(hours=self.max_age_hours)
                
                # Filter out old commands
                cleaned_queue = []
                removed_count = 0
                
                for cmd in self._queue:
                    if cmd.queued_at >= cutoff_time:
                        cleaned_queue.append(cmd)
                    else:
                        removed_count += 1
                
                # Rebuild heap
                self._queue = cleaned_queue
                heapq.heapify(self._queue)
                
                if removed_count > 0:
                    self.logger.info(f"Cleaned up {removed_count} old commands from queue")
                
        except Exception as e:
            self.logger.error(f"Error cleaning up old commands: {e}")


if __name__ == '__main__':
    # Test the smart queue
    from operation_monitor import OperationMonitor
    
    # Initialize components
    operation_monitor = OperationMonitor()
    smart_queue = SmartQueue(operation_monitor)
    
    print("Smart Queue Test")
    print("=" * 50)
    
    # Test adding commands
    test_commands = [
        {'id': 1, 'type': 'execute', 'command': 'echo test1', 'priority': 5},
        {'id': 2, 'type': 'restart', 'command': 'restart service', 'priority': 2},
        {'id': 3, 'type': 'health_check', 'command': 'check system', 'priority': 8},
        {'id': 4, 'type': 'patch', 'command': 'apply patches', 'priority': 3},
    ]
    
    for cmd in test_commands:
        result = smart_queue.add_command(cmd)
        print(f"Added command {cmd['id']}: {result}")
    
    # Test queue status
    status = smart_queue.get_queue_status()
    print(f"\nQueue status: {status}")
    
    # Test getting next command
    next_cmd = smart_queue.get_next_command()
    if next_cmd:
        print(f"\nNext command: {next_cmd['id']} (type: {next_cmd['type']})")
        
        # Test marking as completed
        smart_queue.mark_command_completed(next_cmd['id'], {'status': 'completed'})
        print("Command marked as completed")
    
    # Final status
    final_status = smart_queue.get_queue_status()
    print(f"\nFinal queue status: {final_status}")
