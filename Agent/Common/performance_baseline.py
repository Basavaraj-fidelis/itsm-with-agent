
#!/usr/bin/env python3
"""
Performance Baseline Tracker for ITSM Agent
Tracks system performance baselines and detects degradation
"""

import json
import time
import threading
import logging
import statistics
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
from configparser import ConfigParser


class PerformanceBaseline:
    """Tracks and analyzes system performance baselines"""
    
    def __init__(self, config: ConfigParser, system_collector):
        """Initialize performance baseline tracker
        
        Args:
            config: Configuration parser instance
            system_collector: System collector instance for gathering metrics
        """
        self.config = config
        self.system_collector = system_collector
        self.logger = logging.getLogger('PerformanceBaseline')
        self.running = False
        self.baseline_thread = None
        
        # Configuration
        self.enabled = config.getboolean('performance', 'enable_baseline_tracking', fallback=True)
        self.collection_interval = config.getint('performance', 'baseline_collection_interval', fallback=3600)
        self.history_days = config.getint('performance', 'baseline_history_days', fallback=30)
        self.degradation_threshold = config.getfloat('performance', 'degradation_threshold', fallback=25.0)
        
        # Storage
        self.baseline_file = Path('logs/performance_baseline.json')
        self.baseline_file.parent.mkdir(exist_ok=True)
        
        # In-memory data
        self.baseline_data = []
        self.current_baseline = {}
        self.degradation_alerts = []
        
        # Performance metrics to track
        self.tracked_metrics = [
            'cpu_percent',
            'memory_percent', 
            'disk_percent',
            'process_count',
            'load_average',
            'network_io_sent',
            'network_io_recv',
            'disk_io_read',
            'disk_io_write'
        ]
        
        # Load existing baseline data
        self._load_baseline_data()
        
        self.logger.info(f"Performance baseline tracker initialized (enabled: {self.enabled})")
    
    def start(self):
        """Start performance baseline tracking"""
        if not self.enabled or self.running:
            return
        
        self.running = True
        self.baseline_thread = threading.Thread(target=self._baseline_loop, daemon=True)
        self.baseline_thread.start()
        
        self.logger.info("Performance baseline tracking started")
    
    def stop(self):
        """Stop performance baseline tracking"""
        self.running = False
        
        if self.baseline_thread:
            self.baseline_thread.join(timeout=10)
        
        # Save current data
        self._save_baseline_data()
        
        self.logger.info("Performance baseline tracking stopped")
    
    def _baseline_loop(self):
        """Main baseline collection loop"""
        while self.running:
            try:
                self._collect_baseline_sample()
                self._analyze_performance_trends()
                self._cleanup_old_data()
                
                time.sleep(self.collection_interval)
                
            except Exception as e:
                self.logger.error(f"Error in baseline collection loop: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def _collect_baseline_sample(self):
        """Collect a baseline performance sample"""
        try:
            # Get system information
            system_info = self.system_collector.collect_basic_info()
            
            # Extract relevant metrics
            sample = {
                'timestamp': datetime.now().isoformat(),
                'metrics': {}
            }
            
            for metric in self.tracked_metrics:
                value = system_info.get(metric)
                if value is not None:
                    # Handle different data types
                    if isinstance(value, (list, tuple)) and len(value) > 0:
                        # For load average, take the first value
                        sample['metrics'][metric] = float(value[0]) if value[0] is not None else 0.0
                    elif isinstance(value, (int, float)):
                        sample['metrics'][metric] = float(value)
                    else:
                        # Skip non-numeric values
                        continue
            
            # Add sample to baseline data
            self.baseline_data.append(sample)
            
            # Keep only recent data
            cutoff_time = datetime.now() - timedelta(days=self.history_days)
            self.baseline_data = [
                sample for sample in self.baseline_data
                if datetime.fromisoformat(sample['timestamp']) > cutoff_time
            ]
            
            # Update current baseline
            self._update_baseline()
            
            self.logger.debug(f"Collected baseline sample with {len(sample['metrics'])} metrics")
            
        except Exception as e:
            self.logger.error(f"Error collecting baseline sample: {e}")
    
    def _update_baseline(self):
        """Update current baseline calculations"""
        if not self.baseline_data:
            return
        
        # Calculate baseline statistics for each metric
        self.current_baseline = {}
        
        for metric in self.tracked_metrics:
            values = []
            
            for sample in self.baseline_data:
                if metric in sample['metrics']:
                    values.append(sample['metrics'][metric])
            
            if values:
                self.current_baseline[metric] = {
                    'mean': statistics.mean(values),
                    'median': statistics.median(values),
                    'stdev': statistics.stdev(values) if len(values) > 1 else 0,
                    'min': min(values),
                    'max': max(values),
                    'percentile_95': self._calculate_percentile(values, 95),
                    'sample_count': len(values)
                }
    
    def _calculate_percentile(self, values: List[float], percentile: float) -> float:
        """Calculate percentile value
        
        Args:
            values: List of values
            percentile: Percentile to calculate (0-100)
            
        Returns:
            Percentile value
        """
        if not values:
            return 0.0
        
        sorted_values = sorted(values)
        index = (percentile / 100) * (len(sorted_values) - 1)
        
        if index.is_integer():
            return sorted_values[int(index)]
        else:
            lower = sorted_values[int(index)]
            upper = sorted_values[int(index) + 1]
            return lower + (upper - lower) * (index - int(index))
    
    def _analyze_performance_trends(self):
        """Analyze performance trends and detect degradation"""
        if not self.current_baseline:
            return
        
        try:
            # Get recent samples for trend analysis
            recent_samples = self._get_recent_samples(hours=24)
            
            if len(recent_samples) < 5:  # Need at least 5 samples
                return
            
            # Check each metric for degradation
            for metric in self.tracked_metrics:
                if metric not in self.current_baseline:
                    continue
                
                degradation = self._detect_degradation(metric, recent_samples)
                
                if degradation:
                    self._record_degradation_alert(metric, degradation)
            
        except Exception as e:
            self.logger.error(f"Error analyzing performance trends: {e}")
    
    def _get_recent_samples(self, hours: int = 24) -> List[Dict]:
        """Get recent baseline samples
        
        Args:
            hours: Number of hours to look back
            
        Returns:
            List of recent samples
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return [
            sample for sample in self.baseline_data
            if datetime.fromisoformat(sample['timestamp']) > cutoff_time
        ]
    
    def _detect_degradation(self, metric: str, recent_samples: List[Dict]) -> Optional[Dict]:
        """Detect performance degradation for a specific metric
        
        Args:
            metric: Metric name to analyze
            recent_samples: Recent performance samples
            
        Returns:
            Degradation information if detected, None otherwise
        """
        baseline = self.current_baseline.get(metric)
        if not baseline:
            return None
        
        # Get recent values for this metric
        recent_values = []
        for sample in recent_samples:
            if metric in sample['metrics']:
                recent_values.append(sample['metrics'][metric])
        
        if len(recent_values) < 3:
            return None
        
        # Calculate recent average
        recent_average = statistics.mean(recent_values)
        baseline_mean = baseline['mean']
        
        # Calculate degradation percentage
        if baseline_mean > 0:
            degradation_pct = ((recent_average - baseline_mean) / baseline_mean) * 100
        else:
            degradation_pct = 0
        
        # Check for significant degradation
        if degradation_pct > self.degradation_threshold:
            return {
                'metric': metric,
                'degradation_percentage': degradation_pct,
                'recent_average': recent_average,
                'baseline_mean': baseline_mean,
                'baseline_stdev': baseline.get('stdev', 0),
                'detection_time': datetime.now().isoformat(),
                'severity': self._calculate_severity(degradation_pct)
            }
        
        return None
    
    def _calculate_severity(self, degradation_pct: float) -> str:
        """Calculate degradation severity level
        
        Args:
            degradation_pct: Degradation percentage
            
        Returns:
            Severity level string
        """
        if degradation_pct >= 75:
            return 'critical'
        elif degradation_pct >= 50:
            return 'high'
        elif degradation_pct >= 25:
            return 'medium'
        else:
            return 'low'
    
    def _record_degradation_alert(self, metric: str, degradation: Dict):
        """Record a performance degradation alert
        
        Args:
            metric: Metric name
            degradation: Degradation information
        """
        alert = {
            'alert_id': f"{metric}_{int(time.time())}",
            'timestamp': datetime.now().isoformat(),
            'metric': metric,
            'degradation': degradation,
            'acknowledged': False
        }
        
        self.degradation_alerts.append(alert)
        
        # Keep only recent alerts (last 7 days)
        cutoff_time = datetime.now() - timedelta(days=7)
        self.degradation_alerts = [
            alert for alert in self.degradation_alerts
            if datetime.fromisoformat(alert['timestamp']) > cutoff_time
        ]
        
        # Log the alert
        severity = degradation['severity']
        pct = degradation['degradation_percentage']
        
        self.logger.warning(f"Performance degradation detected: {metric} degraded by {pct:.1f}% (severity: {severity})")
    
    def _cleanup_old_data(self):
        """Clean up old baseline data"""
        cutoff_time = datetime.now() - timedelta(days=self.history_days)
        
        original_count = len(self.baseline_data)
        self.baseline_data = [
            sample for sample in self.baseline_data
            if datetime.fromisoformat(sample['timestamp']) > cutoff_time
        ]
        
        cleaned_count = original_count - len(self.baseline_data)
        if cleaned_count > 0:
            self.logger.debug(f"Cleaned up {cleaned_count} old baseline samples")
        
        # Save updated data periodically
        if len(self.baseline_data) % 24 == 0:  # Save every 24 samples
            self._save_baseline_data()
    
    def _load_baseline_data(self):
        """Load baseline data from file"""
        try:
            if self.baseline_file.exists():
                with open(self.baseline_file, 'r') as f:
                    data = json.load(f)
                    self.baseline_data = data.get('baseline_data', [])
                    self.degradation_alerts = data.get('degradation_alerts', [])
                
                # Update baseline calculations
                self._update_baseline()
                
                self.logger.info(f"Loaded {len(self.baseline_data)} baseline samples from disk")
            
        except Exception as e:
            self.logger.error(f"Error loading baseline data: {e}")
            self.baseline_data = []
            self.degradation_alerts = []
    
    def _save_baseline_data(self):
        """Save baseline data to file"""
        try:
            data = {
                'baseline_data': self.baseline_data,
                'degradation_alerts': self.degradation_alerts,
                'saved_at': datetime.now().isoformat()
            }
            
            with open(self.baseline_file, 'w') as f:
                json.dump(data, f, indent=2)
            
            self.logger.debug(f"Saved {len(self.baseline_data)} baseline samples to disk")
            
        except Exception as e:
            self.logger.error(f"Error saving baseline data: {e}")
    
    def get_baseline_status(self) -> Dict[str, Any]:
        """Get current baseline status
        
        Returns:
            Dictionary containing baseline status information
        """
        if not self.enabled:
            return {'enabled': False}
        
        recent_alerts = [
            alert for alert in self.degradation_alerts
            if not alert.get('acknowledged', False)
        ]
        
        return {
            'enabled': True,
            'total_samples': len(self.baseline_data),
            'baseline_metrics': list(self.current_baseline.keys()),
            'active_alerts': len(recent_alerts),
            'history_days': self.history_days,
            'collection_interval_seconds': self.collection_interval,
            'degradation_threshold_percent': self.degradation_threshold,
            'last_collection': self.baseline_data[-1]['timestamp'] if self.baseline_data else None
        }
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Get detailed performance report
        
        Returns:
            Comprehensive performance report
        """
        if not self.enabled or not self.current_baseline:
            return {'enabled': False}
        
        # Get recent performance compared to baseline
        recent_samples = self._get_recent_samples(hours=24)
        current_performance = {}
        
        for metric in self.tracked_metrics:
            if metric not in self.current_baseline:
                continue
            
            recent_values = []
            for sample in recent_samples:
                if metric in sample['metrics']:
                    recent_values.append(sample['metrics'][metric])
            
            if recent_values:
                recent_avg = statistics.mean(recent_values)
                baseline_mean = self.current_baseline[metric]['mean']
                
                if baseline_mean > 0:
                    change_pct = ((recent_avg - baseline_mean) / baseline_mean) * 100
                else:
                    change_pct = 0
                
                current_performance[metric] = {
                    'current_average': recent_avg,
                    'baseline_mean': baseline_mean,
                    'change_percentage': change_pct,
                    'status': 'degraded' if change_pct > self.degradation_threshold else 'normal'
                }
        
        return {
            'enabled': True,
            'baseline_summary': self.current_baseline,
            'current_performance': current_performance,
            'degradation_alerts': self.degradation_alerts,
            'report_generated': datetime.now().isoformat()
        }
    
    def acknowledge_alert(self, alert_id: str) -> bool:
        """Acknowledge a degradation alert
        
        Args:
            alert_id: ID of alert to acknowledge
            
        Returns:
            True if successful, False otherwise
        """
        for alert in self.degradation_alerts:
            if alert['alert_id'] == alert_id:
                alert['acknowledged'] = True
                alert['acknowledged_at'] = datetime.now().isoformat()
                self.logger.info(f"Acknowledged performance alert: {alert_id}")
                return True
        
        return False


if __name__ == '__main__':
    # Test performance baseline tracker
    from configparser import ConfigParser
    from system_collector import SystemCollector
    
    # Create test configuration
    config = ConfigParser()
    config.read_dict({
        'performance': {
            'enable_baseline_tracking': 'true',
            'baseline_collection_interval': '30',
            'baseline_history_days': '7',
            'degradation_threshold': '20'
        }
    })
    
    # Initialize components
    system_collector = SystemCollector()
    baseline_tracker = PerformanceBaseline(config, system_collector)
    
    print("Testing performance baseline tracker...")
    print("Starting tracker...")
    baseline_tracker.start()
    
    try:
        # Let it collect a few samples
        time.sleep(65)
        
        # Get status and report
        status = baseline_tracker.get_baseline_status()
        print("Baseline Status:", status)
        
        report = baseline_tracker.get_performance_report()
        print("Performance Report:", json.dumps(report, indent=2))
        
    finally:
        baseline_tracker.stop()
        print("Tracker stopped")
#!/usr/bin/env python3
"""
Performance Baseline Tracker for ITSM Agent
Tracks system performance baselines and detects degradation
"""

import json
import time
import threading
import logging
import statistics
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime, timedelta
from pathlib import Path
from configparser import ConfigParser


class PerformanceBaseline:
    """Tracks system performance baselines and detects degradation"""
    
    def __init__(self, config: ConfigParser, system_collector):
        """Initialize performance baseline tracker
        
        Args:
            config: Configuration parser instance
            system_collector: System collector instance
        """
        self.config = config
        self.system_collector = system_collector
        self.logger = logging.getLogger('PerformanceBaseline')
        self.running = False
        self.baseline_thread = None
        
        # Configuration
        self.collection_interval = config.getint('performance', 'baseline_collection_interval', fallback=3600)
        self.history_days = config.getint('performance', 'baseline_history_days', fallback=30)
        self.degradation_threshold = config.getfloat('performance', 'degradation_threshold', fallback=20.0)
        self.enable_tracking = config.getboolean('performance', 'enable_baseline_tracking', fallback=True)
        
        # Data storage
        self.baseline_data = {}
        self.performance_history = []
        self.baseline_file = Path('performance_baseline.json')
        
        # Load existing baseline data
        self._load_baseline_data()
        
        self.logger.info("Performance baseline tracker initialized")
    
    def start(self):
        """Start performance baseline tracking"""
        if not self.enable_tracking or self.running:
            return
        
        self.running = True
        self.baseline_thread = threading.Thread(target=self._baseline_loop, daemon=True)
        self.baseline_thread.start()
        
        self.logger.info("Performance baseline tracking started")
    
    def stop(self):
        """Stop performance baseline tracking"""
        self.running = False
        
        if self.baseline_thread:
            self.baseline_thread.join(timeout=10)
        
        # Save baseline data
        self._save_baseline_data()
        
        self.logger.info("Performance baseline tracking stopped")
    
    def _baseline_loop(self):
        """Main baseline tracking loop"""
        while self.running:
            try:
                self._collect_baseline_metrics()
                time.sleep(self.collection_interval)
                
            except Exception as e:
                self.logger.error(f"Error in baseline tracking loop: {e}")
                time.sleep(300)  # Wait 5 minutes on error
    
    def _collect_baseline_metrics(self):
        """Collect performance metrics for baseline"""
        try:
            # Get current system metrics
            system_info = self.system_collector.collect_basic_info()
            
            timestamp = datetime.now()
            metrics = {
                'timestamp': timestamp.isoformat(),
                'cpu_usage': system_info.get('cpu_percent', 0),
                'memory_usage': system_info.get('memory_percent', 0),
                'disk_usage': system_info.get('disk_percent', 0),
                'process_count': system_info.get('process_count', 0)
            }
            
            # Add to history
            self.performance_history.append(metrics)
            
            # Keep only recent history
            cutoff_time = timestamp - timedelta(days=self.history_days)
            self.performance_history = [
                entry for entry in self.performance_history
                if datetime.fromisoformat(entry['timestamp']) > cutoff_time
            ]
            
            # Update baseline calculations
            self._update_baseline()
            
            self.logger.debug(f"Collected baseline metrics: {metrics}")
            
        except Exception as e:
            self.logger.error(f"Error collecting baseline metrics: {e}")
    
    def _update_baseline(self):
        """Update baseline calculations"""
        if len(self.performance_history) < 10:
            return  # Need more data points
        
        try:
            # Calculate baseline statistics for each metric
            metrics = ['cpu_usage', 'memory_usage', 'disk_usage', 'process_count']
            
            for metric in metrics:
                values = [entry[metric] for entry in self.performance_history if metric in entry]
                
                if values:
                    self.baseline_data[metric] = {
                        'mean': statistics.mean(values),
                        'median': statistics.median(values),
                        'std_dev': statistics.stdev(values) if len(values) > 1 else 0,
                        'min': min(values),
                        'max': max(values),
                        'last_updated': datetime.now().isoformat()
                    }
            
            # Save baseline data periodically
            if len(self.performance_history) % 10 == 0:
                self._save_baseline_data()
                
        except Exception as e:
            self.logger.error(f"Error updating baseline: {e}")
    
    def _load_baseline_data(self):
        """Load baseline data from file"""
        try:
            if self.baseline_file.exists():
                with open(self.baseline_file, 'r') as f:
                    data = json.load(f)
                    self.baseline_data = data.get('baseline_data', {})
                    self.performance_history = data.get('performance_history', [])
                
                self.logger.info(f"Loaded baseline data with {len(self.performance_history)} history entries")
            else:
                self.logger.info("No existing baseline data found")
                
        except Exception as e:
            self.logger.error(f"Error loading baseline data: {e}")
    
    def _save_baseline_data(self):
        """Save baseline data to file"""
        try:
            data = {
                'baseline_data': self.baseline_data,
                'performance_history': self.performance_history[-1000:]  # Keep last 1000 entries
            }
            
            with open(self.baseline_file, 'w') as f:
                json.dump(data, f, indent=2)
                
            self.logger.debug("Baseline data saved")
            
        except Exception as e:
            self.logger.error(f"Error saving baseline data: {e}")
    
    def get_baseline_status(self) -> Dict[str, Any]:
        """Get current baseline status
        
        Returns:
            Dictionary containing baseline status information
        """
        try:
            if not self.enable_tracking:
                return {'status': 'disabled'}
            
            # Get current metrics
            current_metrics = self.system_collector.collect_basic_info()
            
            status = {
                'status': 'active',
                'history_entries': len(self.performance_history),
                'baseline_metrics': self.baseline_data.copy(),
                'current_metrics': {
                    'cpu_usage': current_metrics.get('cpu_percent', 0),
                    'memory_usage': current_metrics.get('memory_percent', 0),
                    'disk_usage': current_metrics.get('disk_percent', 0),
                    'process_count': current_metrics.get('process_count', 0)
                },
                'degradation_detected': self._check_degradation(current_metrics)
            }
            
            return status
            
        except Exception as e:
            self.logger.error(f"Error getting baseline status: {e}")
            return {'status': 'error', 'error': str(e)}
    
    def _check_degradation(self, current_metrics: Dict[str, Any]) -> Dict[str, Any]:
        """Check for performance degradation
        
        Args:
            current_metrics: Current system metrics
            
        Returns:
            Dictionary indicating degradation status
        """
        degradation = {}
        
        try:
            metrics_map = {
                'cpu_percent': 'cpu_usage',
                'memory_percent': 'memory_usage', 
                'disk_percent': 'disk_usage',
                'process_count': 'process_count'
            }
            
            for current_key, baseline_key in metrics_map.items():
                if current_key in current_metrics and baseline_key in self.baseline_data:
                    current_value = current_metrics[current_key]
                    baseline = self.baseline_data[baseline_key]
                    
                    # Calculate percentage deviation from baseline mean
                    baseline_mean = baseline['mean']
                    if baseline_mean > 0:
                        deviation = ((current_value - baseline_mean) / baseline_mean) * 100
                        
                        degradation[baseline_key] = {
                            'current': current_value,
                            'baseline_mean': baseline_mean,
                            'deviation_percent': deviation,
                            'degraded': deviation > self.degradation_threshold
                        }
            
            # Overall degradation status
            degradation['overall_degraded'] = any(
                metric.get('degraded', False) 
                for metric in degradation.values() 
                if isinstance(metric, dict)
            )
            
        except Exception as e:
            self.logger.error(f"Error checking degradation: {e}")
            degradation['error'] = str(e)
        
        return degradation
    
    def get_performance_trends(self) -> Dict[str, Any]:
        """Get performance trends over time
        
        Returns:
            Dictionary containing trend analysis
        """
        try:
            if len(self.performance_history) < 2:
                return {'status': 'insufficient_data'}
            
            # Calculate trends for recent period
            recent_entries = self.performance_history[-24:]  # Last 24 entries
            older_entries = self.performance_history[:-24] if len(self.performance_history) > 24 else []
            
            trends = {}
            
            for metric in ['cpu_usage', 'memory_usage', 'disk_usage']:
                recent_values = [entry[metric] for entry in recent_entries if metric in entry]
                older_values = [entry[metric] for entry in older_entries if metric in entry]
                
                if recent_values and older_values:
                    recent_avg = statistics.mean(recent_values)
                    older_avg = statistics.mean(older_values)
                    
                    trend = 'increasing' if recent_avg > older_avg else 'decreasing'
                    change_percent = ((recent_avg - older_avg) / older_avg) * 100 if older_avg > 0 else 0
                    
                    trends[metric] = {
                        'trend': trend,
                        'change_percent': change_percent,
                        'recent_average': recent_avg,
                        'previous_average': older_avg
                    }
            
            return {
                'status': 'available',
                'trends': trends,
                'analysis_period': f"last {len(recent_entries)} measurements"
            }
            
        except Exception as e:
            self.logger.error(f"Error calculating trends: {e}")
            return {'status': 'error', 'error': str(e)}


if __name__ == '__main__':
    # Test performance baseline tracker
    from configparser import ConfigParser
    
    # Create test configuration
    config = ConfigParser()
    config.read_dict({
        'performance': {
            'baseline_collection_interval': '10',
            'baseline_history_days': '1',
            'degradation_threshold': '20.0',
            'enable_baseline_tracking': 'true'
        }
    })
    
    # Mock system collector for testing
    class MockSystemCollector:
        def collect_basic_info(self):
            import random
            return {
                'cpu_percent': random.uniform(10, 90),
                'memory_percent': random.uniform(20, 80),
                'disk_percent': random.uniform(30, 70),
                'process_count': random.randint(50, 150)
            }
    
    # Initialize and test baseline tracker
    system_collector = MockSystemCollector()
    baseline_tracker = PerformanceBaseline(config, system_collector)
    
    print("Testing performance baseline tracker...")
    print("Starting tracker...")
    baseline_tracker.start()
    
    try:
        # Let it collect some data
        time.sleep(15)
        
        # Get status
        status = baseline_tracker.get_baseline_status()
        print("Baseline Status:", status)
        
        trends = baseline_tracker.get_performance_trends()
        print("Performance Trends:", trends)
        
    finally:
        baseline_tracker.stop()
        print("Baseline tracker stopped")
