
"""
Event Log Collection & Analysis Module
Collects and analyzes system event logs
"""

import logging
import platform
import json
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_module import BaseModule

class EventLogModule(BaseModule):
    """Event log collection and analysis"""
    
    def __init__(self):
        super().__init__('event_log')
        self.os_name = platform.system()
        self.critical_events = []
        self.event_patterns = {
            'boot_events': ['6005', '6006', '6013'],
            'shutdown_events': ['6008', '1074'],
            'error_events': ['1000', '1001', '1002'],
            'security_events': ['4624', '4625', '4648']
        }
        
    def collect(self) -> Dict[str, Any]:
        """Collect event log information"""
        try:
            if self.os_name == 'Windows':
                return self._collect_windows_events()
            elif self.os_name == 'Linux':
                return self._collect_linux_events()
            elif self.os_name == 'Darwin':
                return self._collect_macos_events()
            else:
                return {
                    'status': 'unsupported',
                    'message': f'Event log collection not supported for {self.os_name}'
                }
                
        except Exception as e:
            self.logger.error(f"Error collecting event logs: {e}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _collect_windows_events(self) -> Dict[str, Any]:
        """Collect Windows event logs"""
        try:
            import win32evtlog
            import win32api
            import win32con
            
            events = {
                'system_events': self._get_windows_system_events(),
                'application_events': self._get_windows_application_events(),
                'security_events': self._get_windows_security_events(),
                'critical_events': self._analyze_critical_events(),
                'boot_shutdown_events': self._get_boot_shutdown_events(),
                'error_summary': self._get_error_summary()
            }
            
            return {
                'status': 'success',
                'events': events,
                'collection_time': datetime.utcnow().isoformat()
            }
            
        except ImportError:
            return {
                'status': 'error',
                'error': 'Windows event log libraries not available'
            }
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _get_windows_system_events(self) -> List[Dict[str, Any]]:
        """Get Windows System event log entries"""
        try:
            import win32evtlog
            
            events = []
            server = 'localhost'
            logtype = 'System'
            
            hand = win32evtlog.OpenEventLog(server, logtype)
            
            # Get events from last 24 hours
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            
            event_count = 0
            while event_count < 50:  # Limit to 50 recent events
                events_batch = win32evtlog.ReadEventLog(hand, flags, 0)
                if not events_batch:
                    break
                    
                for event in events_batch:
                    event_time = event.TimeGenerated
                    if event_time > datetime.now() - timedelta(hours=24):
                        events.append({
                            'event_id': event.EventID & 0xFFFF,
                            'source': event.SourceName,
                            'type': self._get_event_type(event.EventType),
                            'time': event_time.isoformat(),
                            'category': event.EventCategory,
                            'message': str(event.StringInserts) if event.StringInserts else ''
                        })
                        event_count += 1
                        
                if event_count >= 50:
                    break
            
            win32evtlog.CloseEventLog(hand)
            return events[:50]  # Return last 50 events
            
        except Exception as e:
            self.logger.error(f"Error reading Windows system events: {e}")
            return []
    
    def _get_windows_application_events(self) -> List[Dict[str, Any]]:
        """Get Windows Application event log entries"""
        try:
            import win32evtlog
            
            events = []
            server = 'localhost'
            logtype = 'Application'
            
            hand = win32evtlog.OpenEventLog(server, logtype)
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            
            event_count = 0
            while event_count < 25:  # Limit to 25 recent events
                events_batch = win32evtlog.ReadEventLog(hand, flags, 0)
                if not events_batch:
                    break
                    
                for event in events_batch:
                    event_time = event.TimeGenerated
                    if event_time > datetime.now() - timedelta(hours=24):
                        if event.EventType in [1, 2]:  # Error and Warning events only
                            events.append({
                                'event_id': event.EventID & 0xFFFF,
                                'source': event.SourceName,
                                'type': self._get_event_type(event.EventType),
                                'time': event_time.isoformat(),
                                'category': event.EventCategory,
                                'message': str(event.StringInserts) if event.StringInserts else ''
                            })
                            event_count += 1
                        
                if event_count >= 25:
                    break
            
            win32evtlog.CloseEventLog(hand)
            return events[:25]
            
        except Exception as e:
            self.logger.error(f"Error reading Windows application events: {e}")
            return []
    
    def _get_windows_security_events(self) -> List[Dict[str, Any]]:
        """Get Windows Security event log entries"""
        try:
            import win32evtlog
            
            events = []
            server = 'localhost'
            logtype = 'Security'
            
            hand = win32evtlog.OpenEventLog(server, logtype)
            flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
            
            event_count = 0
            while event_count < 20:  # Limit to 20 recent events
                events_batch = win32evtlog.ReadEventLog(hand, flags, 0)
                if not events_batch:
                    break
                    
                for event in events_batch:
                    event_time = event.TimeGenerated
                    event_id = event.EventID & 0xFFFF
                    
                    # Only collect important security events
                    if str(event_id) in self.event_patterns['security_events']:
                        if event_time > datetime.now() - timedelta(hours=24):
                            events.append({
                                'event_id': event_id,
                                'source': event.SourceName,
                                'type': self._get_event_type(event.EventType),
                                'time': event_time.isoformat(),
                                'category': event.EventCategory,
                                'message': str(event.StringInserts) if event.StringInserts else ''
                            })
                            event_count += 1
                        
                if event_count >= 20:
                    break
            
            win32evtlog.CloseEventLog(hand)
            return events[:20]
            
        except Exception as e:
            self.logger.error(f"Error reading Windows security events: {e}")
            return []
    
    def _collect_linux_events(self) -> Dict[str, Any]:
        """Collect Linux system events"""
        try:
            import subprocess
            
            events = {
                'syslog_events': self._get_linux_syslog(),
                'auth_events': self._get_linux_auth_log(),
                'kernel_events': self._get_linux_kernel_log(),
                'boot_events': self._get_linux_boot_log()
            }
            
            return {
                'status': 'success',
                'events': events,
                'collection_time': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _collect_macos_events(self) -> Dict[str, Any]:
        """Collect macOS system events"""
        try:
            import subprocess
            
            events = {
                'system_log': self._get_macos_system_log(),
                'security_events': self._get_macos_security_log(),
                'crash_reports': self._get_macos_crash_reports()
            }
            
            return {
                'status': 'success',
                'events': events,
                'collection_time': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _get_event_type(self, event_type: int) -> str:
        """Convert Windows event type to string"""
        event_types = {
            1: 'Error',
            2: 'Warning', 
            4: 'Information',
            8: 'Success Audit',
            16: 'Failure Audit'
        }
        return event_types.get(event_type, 'Unknown')
    
    def _analyze_critical_events(self) -> List[Dict[str, Any]]:
        """Analyze and identify critical events"""
        critical_events = []
        
        # This would contain logic to identify patterns that indicate critical issues
        # For now, return placeholder
        return critical_events
    
    def _get_boot_shutdown_events(self) -> List[Dict[str, Any]]:
        """Get boot and shutdown events"""
        # Implementation for boot/shutdown event detection
        return []
    
    def _get_error_summary(self) -> Dict[str, Any]:
        """Get summary of error events"""
        return {
            'total_errors': 0,
            'total_warnings': 0,
            'common_errors': [],
            'error_patterns': []
        }
    
    def _get_linux_syslog(self) -> List[Dict[str, Any]]:
        """Get Linux syslog entries"""
        return []
    
    def _get_linux_auth_log(self) -> List[Dict[str, Any]]:
        """Get Linux auth log entries"""
        return []
    
    def _get_linux_kernel_log(self) -> List[Dict[str, Any]]:
        """Get Linux kernel log entries"""
        return []
    
    def _get_linux_boot_log(self) -> List[Dict[str, Any]]:
        """Get Linux boot log entries"""
        return []
    
    def _get_macos_system_log(self) -> List[Dict[str, Any]]:
        """Get macOS system log entries"""
        return []
    
    def _get_macos_security_log(self) -> List[Dict[str, Any]]:
        """Get macOS security log entries"""
        return []
    
    def _get_macos_crash_reports(self) -> List[Dict[str, Any]]:
        """Get macOS crash reports"""
        return []
