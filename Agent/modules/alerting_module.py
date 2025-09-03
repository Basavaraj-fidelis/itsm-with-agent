
"""
Real-time Alerting Module
Handles threshold monitoring and alert generation
"""

import logging
import json
import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_module import BaseModule

class AlertingModule(BaseModule):
    """Real-time alerting and threshold monitoring"""
    
    def __init__(self):
        super().__init__('alerting')
        self.alert_history = []
        self.thresholds = {
            'cpu_critical': 90,
            'cpu_warning': 75,
            'memory_critical': 85,
            'memory_warning': 70,
            'disk_critical': 90,
            'disk_warning': 80,
            'network_error_rate': 5
        }
        self.alert_suppression = {}
        
    def collect(self) -> Dict[str, Any]:
        """Collect alerting information and generate alerts"""
        try:
            current_time = datetime.utcnow()
            alerts = []
            
            # Get current system metrics (would need to integrate with other modules)
            metrics = self._get_current_metrics()
            
            # Check CPU alerts
            cpu_alerts = self._check_cpu_alerts(metrics.get('cpu', {}))
            alerts.extend(cpu_alerts)
            
            # Check Memory alerts
            memory_alerts = self._check_memory_alerts(metrics.get('memory', {}))
            alerts.extend(memory_alerts)
            
            # Check Disk alerts
            disk_alerts = self._check_disk_alerts(metrics.get('disk', {}))
            alerts.extend(disk_alerts)
            
            # Check Network alerts
            network_alerts = self._check_network_alerts(metrics.get('network', {}))
            alerts.extend(network_alerts)
            
            # Process alert suppression
            active_alerts = self._process_alert_suppression(alerts)
            
            # Update alert history
            self._update_alert_history(active_alerts)
            
            return {
                'status': 'success',
                'alerts': active_alerts,
                'alert_count': len(active_alerts),
                'thresholds': self.thresholds,
                'suppressed_count': len(alerts) - len(active_alerts),
                'last_check': current_time.isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error in alerting module: {e}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e),
                'alerts': []
            }
    
    def _get_current_metrics(self) -> Dict[str, Any]:
        """Get current system metrics - placeholder for integration"""
        # This would integrate with other modules to get real metrics
        return {
            'cpu': {'usage': 45.2},
            'memory': {'percent': 72.1},
            'disk': {'usage_percent': 65.4},
            'network': {'error_rate': 0.1}
        }
    
    def _check_cpu_alerts(self, cpu_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check CPU threshold alerts"""
        alerts = []
        usage = cpu_data.get('usage', 0)
        
        if usage >= self.thresholds['cpu_critical']:
            alerts.append(self._create_alert('CPU_CRITICAL', f'CPU usage at {usage}%', 'critical'))
        elif usage >= self.thresholds['cpu_warning']:
            alerts.append(self._create_alert('CPU_WARNING', f'CPU usage at {usage}%', 'warning'))
            
        return alerts
    
    def _check_memory_alerts(self, memory_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check Memory threshold alerts"""
        alerts = []
        usage = memory_data.get('percent', 0)
        
        if usage >= self.thresholds['memory_critical']:
            alerts.append(self._create_alert('MEMORY_CRITICAL', f'Memory usage at {usage}%', 'critical'))
        elif usage >= self.thresholds['memory_warning']:
            alerts.append(self._create_alert('MEMORY_WARNING', f'Memory usage at {usage}%', 'warning'))
            
        return alerts
    
    def _check_disk_alerts(self, disk_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check Disk threshold alerts"""
        alerts = []
        usage = disk_data.get('usage_percent', 0)
        
        if usage >= self.thresholds['disk_critical']:
            alerts.append(self._create_alert('DISK_CRITICAL', f'Disk usage at {usage}%', 'critical'))
        elif usage >= self.thresholds['disk_warning']:
            alerts.append(self._create_alert('DISK_WARNING', f'Disk usage at {usage}%', 'warning'))
            
        return alerts
    
    def _check_network_alerts(self, network_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check Network threshold alerts"""
        alerts = []
        error_rate = network_data.get('error_rate', 0)
        
        if error_rate >= self.thresholds['network_error_rate']:
            alerts.append(self._create_alert('NETWORK_ERRORS', f'Network error rate at {error_rate}%', 'warning'))
            
        return alerts
    
    def _create_alert(self, alert_type: str, message: str, severity: str) -> Dict[str, Any]:
        """Create a standardized alert"""
        return {
            'id': f"{alert_type}_{int(time.time())}",
            'type': alert_type,
            'severity': severity,
            'message': message,
            'timestamp': datetime.utcnow().isoformat(),
            'acknowledged': False,
            'source': 'agent_monitoring'
        }
    
    def _process_alert_suppression(self, alerts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Process alert suppression logic"""
        active_alerts = []
        current_time = datetime.utcnow()
        
        for alert in alerts:
            alert_key = f"{alert['type']}_{alert['severity']}"
            
            # Check if alert is suppressed
            if alert_key in self.alert_suppression:
                suppression_end = self.alert_suppression[alert_key]
                if current_time < suppression_end:
                    continue  # Skip suppressed alert
                else:
                    # Remove expired suppression
                    del self.alert_suppression[alert_key]
            
            active_alerts.append(alert)
            
        return active_alerts
    
    def _update_alert_history(self, alerts: List[Dict[str, Any]]):
        """Update alert history"""
        self.alert_history.extend(alerts)
        
        # Keep only last 100 alerts
        if len(self.alert_history) > 100:
            self.alert_history = self.alert_history[-100:]
    
    def update_thresholds(self, new_thresholds: Dict[str, float]):
        """Update alert thresholds"""
        self.thresholds.update(new_thresholds)
        self.logger.info(f"Updated alert thresholds: {new_thresholds}")
    
    def suppress_alert(self, alert_type: str, severity: str, duration_minutes: int = 60):
        """Suppress specific alert type for duration"""
        alert_key = f"{alert_type}_{severity}"
        suppression_end = datetime.utcnow() + timedelta(minutes=duration_minutes)
        self.alert_suppression[alert_key] = suppression_end
        self.logger.info(f"Suppressed alert {alert_key} until {suppression_end}")
