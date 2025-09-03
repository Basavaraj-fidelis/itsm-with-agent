
"""
Application Discovery & Monitoring Module
Automatically detects and monitors business applications and services
"""

import logging
import platform
import subprocess
import json
import psutil
import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base_module import BaseModule


class ApplicationDiscoveryModule(BaseModule):
    """Application discovery and monitoring module"""
    
    def __init__(self):
        super().__init__('ApplicationDiscovery')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
        self.discovered_apps = {}
        self.service_dependencies = {}
        
    def collect(self) -> Dict[str, Any]:
        """Collect application discovery and monitoring data"""
        app_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'discovered_applications': self._discover_business_applications(),
            'running_services': self._get_running_services(),
            'service_dependencies': self._map_service_dependencies(),
            'application_performance': self._get_application_performance(),
            'database_instances': self._discover_database_instances(),
            'web_servers': self._discover_web_servers(),
            'application_health': self._assess_application_health(),
            'port_bindings': self._get_application_port_bindings()
        }
        
        return app_data
    
    def _discover_business_applications(self) -> List[Dict[str, Any]]:
        """Discover installed business applications"""
        applications = []
        
        try:
            if self.is_windows:
                applications = self._discover_windows_applications()
            elif self.is_linux:
                applications = self._discover_linux_applications()
                
            # Classify applications by type
            for app in applications:
                app['category'] = self._classify_application(app)
                app['business_critical'] = self._is_business_critical(app)
                
        except Exception as e:
            self.logger.error(f"Error discovering applications: {e}")
            
        return applications
    
    def _discover_windows_applications(self) -> List[Dict[str, Any]]:
        """Discover Windows applications"""
        applications = []
        
        try:
            # Query Windows Registry for installed programs
            import winreg
            
            registry_paths = [
                r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall",
                r"SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall"
            ]
            
            for reg_path in registry_paths:
                try:
                    with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, reg_path) as key:
                        for i in range(winreg.QueryInfoKey(key)[0]):
                            try:
                                subkey_name = winreg.EnumKey(key, i)
                                with winreg.OpenKey(key, subkey_name) as subkey:
                                    app_info = self._extract_windows_app_info(subkey)
                                    if app_info and self._is_relevant_application(app_info):
                                        applications.append(app_info)
                            except Exception:
                                continue
                except Exception as e:
                    self.logger.debug(f"Error accessing registry path {reg_path}: {e}")
                    
        except ImportError:
            self.logger.warning("winreg module not available")
        except Exception as e:
            self.logger.error(f"Error discovering Windows applications: {e}")
            
        return applications
    
    def _extract_windows_app_info(self, subkey) -> Optional[Dict[str, Any]]:
        """Extract application information from Windows registry"""
        try:
            import winreg
            
            app_info = {}
            
            # Get application name
            try:
                app_info['name'] = winreg.QueryValueEx(subkey, "DisplayName")[0]
            except FileNotFoundError:
                return None
                
            # Get version
            try:
                app_info['version'] = winreg.QueryValueEx(subkey, "DisplayVersion")[0]
            except FileNotFoundError:
                app_info['version'] = "Unknown"
                
            # Get publisher
            try:
                app_info['publisher'] = winreg.QueryValueEx(subkey, "Publisher")[0]
            except FileNotFoundError:
                app_info['publisher'] = "Unknown"
                
            # Get install date
            try:
                install_date = winreg.QueryValueEx(subkey, "InstallDate")[0]
                app_info['install_date'] = install_date
            except FileNotFoundError:
                app_info['install_date'] = "Unknown"
                
            # Get install location
            try:
                app_info['install_location'] = winreg.QueryValueEx(subkey, "InstallLocation")[0]
            except FileNotFoundError:
                app_info['install_location'] = "Unknown"
                
            app_info['platform'] = 'Windows'
            app_info['discovery_method'] = 'Registry'
            
            return app_info
            
        except Exception as e:
            self.logger.debug(f"Error extracting app info: {e}")
            return None
    
    def _discover_linux_applications(self) -> List[Dict[str, Any]]:
        """Discover Linux applications"""
        applications = []
        
        try:
            # Check different package managers
            applications.extend(self._get_apt_packages())
            applications.extend(self._get_yum_packages())
            applications.extend(self._get_snap_packages())
            applications.extend(self._get_flatpak_packages())
            
        except Exception as e:
            self.logger.error(f"Error discovering Linux applications: {e}")
            
        return applications
    
    def _get_apt_packages(self) -> List[Dict[str, Any]]:
        """Get APT packages (Debian/Ubuntu)"""
        packages = []
        
        try:
            result = subprocess.run(['dpkg', '-l'], capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                for line in result.stdout.split('\n')[5:]:  # Skip header lines
                    if line.strip() and line.startswith('ii'):
                        parts = line.split()
                        if len(parts) >= 3:
                            packages.append({
                                'name': parts[1],
                                'version': parts[2],
                                'platform': 'Linux',
                                'package_manager': 'APT',
                                'discovery_method': 'Package Manager'
                            })
        except Exception as e:
            self.logger.debug(f"APT not available or error: {e}")
            
        return packages
    
    def _get_yum_packages(self) -> List[Dict[str, Any]]:
        """Get YUM/DNF packages (RedHat/CentOS/Fedora)"""
        packages = []
        
        try:
            # Try dnf first, then yum
            for cmd in ['dnf', 'yum']:
                try:
                    result = subprocess.run([cmd, 'list', 'installed'], 
                                          capture_output=True, text=True, timeout=30)
                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if '.' in line and not line.startswith('Installed'):
                                parts = line.split()
                                if len(parts) >= 2:
                                    packages.append({
                                        'name': parts[0].split('.')[0],
                                        'version': parts[1],
                                        'platform': 'Linux',
                                        'package_manager': cmd.upper(),
                                        'discovery_method': 'Package Manager'
                                    })
                        break  # If one succeeds, don't try the other
                except Exception:
                    continue
        except Exception as e:
            self.logger.debug(f"YUM/DNF not available or error: {e}")
            
        return packages
    
    def _get_snap_packages(self) -> List[Dict[str, Any]]:
        """Get Snap packages"""
        packages = []
        
        try:
            result = subprocess.run(['snap', 'list'], capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                for line in result.stdout.split('\n')[1:]:  # Skip header
                    if line.strip():
                        parts = line.split()
                        if len(parts) >= 2:
                            packages.append({
                                'name': parts[0],
                                'version': parts[1],
                                'platform': 'Linux',
                                'package_manager': 'Snap',
                                'discovery_method': 'Package Manager'
                            })
        except Exception as e:
            self.logger.debug(f"Snap not available or error: {e}")
            
        return packages
    
    def _get_flatpak_packages(self) -> List[Dict[str, Any]]:
        """Get Flatpak packages"""
        packages = []
        
        try:
            result = subprocess.run(['flatpak', 'list'], capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if line.strip() and '\t' in line:
                        parts = line.split('\t')
                        if len(parts) >= 2:
                            packages.append({
                                'name': parts[0],
                                'version': parts[1] if len(parts) > 1 else 'Unknown',
                                'platform': 'Linux',
                                'package_manager': 'Flatpak',
                                'discovery_method': 'Package Manager'
                            })
        except Exception as e:
            self.logger.debug(f"Flatpak not available or error: {e}")
            
        return packages
    
    def _is_relevant_application(self, app_info: Dict[str, Any]) -> bool:
        """Check if application is relevant for business monitoring"""
        if not app_info.get('name'):
            return False
            
        # Filter out system components and updates
        excluded_keywords = [
            'Microsoft Visual C++', 'Microsoft .NET', 'Windows SDK',
            'Security Update', 'Hotfix', 'Service Pack', 'Update for',
            'KB', 'Driver', 'Redistributable'
        ]
        
        name = app_info['name'].lower()
        return not any(keyword.lower() in name for keyword in excluded_keywords)
    
    def _classify_application(self, app_info: Dict[str, Any]) -> str:
        """Classify application by category"""
        name = app_info.get('name', '').lower()
        
        # Database applications
        if any(db in name for db in ['sql server', 'mysql', 'postgresql', 'oracle', 'mongodb']):
            return 'Database'
            
        # Web servers
        if any(web in name for web in ['apache', 'nginx', 'iis', 'tomcat']):
            return 'Web Server'
            
        # Development tools
        if any(dev in name for dev in ['visual studio', 'eclipse', 'intellij', 'git']):
            return 'Development'
            
        # Office applications
        if any(office in name for office in ['microsoft office', 'libreoffice', 'openoffice']):
            return 'Office'
            
        # Security applications
        if any(sec in name for sec in ['antivirus', 'firewall', 'defender']):
            return 'Security'
            
        # Business applications
        if any(biz in name for biz in ['sap', 'salesforce', 'dynamics', 'quickbooks']):
            return 'Business'
            
        return 'Other'
    
    def _is_business_critical(self, app_info: Dict[str, Any]) -> bool:
        """Determine if application is business critical"""
        name = app_info.get('name', '').lower()
        category = app_info.get('category', '')
        
        # Business critical categories
        if category in ['Database', 'Web Server', 'Business']:
            return True
            
        # Specific business critical applications
        critical_apps = [
            'sap', 'salesforce', 'dynamics', 'quickbooks', 'oracle',
            'sql server', 'mysql', 'postgresql', 'apache', 'nginx'
        ]
        
        return any(critical in name for critical in critical_apps)
    
    def _get_running_services(self) -> List[Dict[str, Any]]:
        """Get currently running services"""
        services = []
        
        try:
            if self.is_windows:
                services = self._get_windows_services()
            elif self.is_linux:
                services = self._get_linux_services()
                
        except Exception as e:
            self.logger.error(f"Error getting running services: {e}")
            
        return services
    
    def _get_windows_services(self) -> List[Dict[str, Any]]:
        """Get Windows services"""
        services = []
        
        try:
            result = subprocess.run(['sc', 'query'], capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                current_service = {}
                for line in result.stdout.split('\n'):
                    line = line.strip()
                    if line.startswith('SERVICE_NAME:'):
                        if current_service:
                            services.append(current_service)
                        current_service = {
                            'name': line.split(':', 1)[1].strip(),
                            'platform': 'Windows',
                            'service_type': 'Windows Service'
                        }
                    elif line.startswith('STATE:'):
                        current_service['status'] = line.split(':', 1)[1].strip()
                        
                if current_service:
                    services.append(current_service)
                    
        except Exception as e:
            self.logger.debug(f"Error getting Windows services: {e}")
            
        return services
    
    def _get_linux_services(self) -> List[Dict[str, Any]]:
        """Get Linux services"""
        services = []
        
        try:
            # Try systemctl first
            result = subprocess.run(['systemctl', 'list-units', '--type=service', '--state=running'],
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                for line in result.stdout.split('\n')[1:]:  # Skip header
                    if line.strip() and 'loaded active running' in line:
                        parts = line.split()
                        if parts:
                            services.append({
                                'name': parts[0].replace('.service', ''),
                                'status': 'running',
                                'platform': 'Linux',
                                'service_type': 'Systemd Service'
                            })
        except Exception as e:
            self.logger.debug(f"Error getting Linux services: {e}")
            
        return services
    
    def _map_service_dependencies(self) -> Dict[str, List[str]]:
        """Map service dependencies"""
        dependencies = {}
        
        try:
            if self.is_windows:
                dependencies = self._get_windows_service_dependencies()
            elif self.is_linux:
                dependencies = self._get_linux_service_dependencies()
                
        except Exception as e:
            self.logger.error(f"Error mapping service dependencies: {e}")
            
        return dependencies
    
    def _get_windows_service_dependencies(self) -> Dict[str, List[str]]:
        """Get Windows service dependencies"""
        dependencies = {}
        
        try:
            # This would require more complex WMI queries
            # For now, return basic structure
            pass
        except Exception as e:
            self.logger.debug(f"Error getting Windows service dependencies: {e}")
            
        return dependencies
    
    def _get_linux_service_dependencies(self) -> Dict[str, List[str]]:
        """Get Linux service dependencies"""
        dependencies = {}
        
        try:
            services = self._get_running_services()
            for service in services:
                if service.get('service_type') == 'Systemd Service':
                    service_name = service['name']
                    deps = self._get_systemd_dependencies(service_name)
                    if deps:
                        dependencies[service_name] = deps
                        
        except Exception as e:
            self.logger.debug(f"Error getting Linux service dependencies: {e}")
            
        return dependencies
    
    def _get_systemd_dependencies(self, service_name: str) -> List[str]:
        """Get systemd service dependencies"""
        dependencies = []
        
        try:
            result = subprocess.run(['systemctl', 'list-dependencies', service_name],
                                  capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                for line in result.stdout.split('\n'):
                    if '●' in line and '.service' in line:
                        dep = line.strip().replace('●', '').replace('.service', '').strip()
                        if dep and dep != service_name:
                            dependencies.append(dep)
        except Exception:
            pass
            
        return dependencies
    
    def _get_application_performance(self) -> List[Dict[str, Any]]:
        """Get application performance metrics"""
        app_performance = []
        
        try:
            # Get process information for known applications
            for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'num_threads']):
                try:
                    pinfo = proc.info
                    if self._is_monitored_application(pinfo['name']):
                        app_performance.append({
                            'application': pinfo['name'],
                            'pid': pinfo['pid'],
                            'cpu_percent': pinfo['cpu_percent'],
                            'memory_percent': pinfo['memory_percent'],
                            'thread_count': pinfo['num_threads'],
                            'status': 'running'
                        })
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error getting application performance: {e}")
            
        return app_performance
    
    def _is_monitored_application(self, process_name: str) -> bool:
        """Check if process should be monitored"""
        if not process_name:
            return False
            
        monitored_apps = [
            'sqlservr.exe', 'mysqld.exe', 'postgres.exe', 'oracle.exe',
            'apache.exe', 'nginx.exe', 'w3wp.exe', 'tomcat.exe',
            'java.exe', 'python.exe', 'node.exe'
        ]
        
        return any(app.lower() in process_name.lower() for app in monitored_apps)
    
    def _discover_database_instances(self) -> List[Dict[str, Any]]:
        """Discover database instances"""
        databases = []
        
        try:
            # Check for common database processes
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    pinfo = proc.info
                    if self._is_database_process(pinfo['name']):
                        db_info = {
                            'type': self._get_database_type(pinfo['name']),
                            'process_name': pinfo['name'],
                            'pid': pinfo['pid'],
                            'status': 'running'
                        }
                        
                        # Try to extract additional info from command line
                        if pinfo['cmdline']:
                            db_info['command_line'] = ' '.join(pinfo['cmdline'])
                            
                        databases.append(db_info)
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error discovering database instances: {e}")
            
        return databases
    
    def _is_database_process(self, process_name: str) -> bool:
        """Check if process is a database"""
        if not process_name:
            return False
            
        db_processes = [
            'sqlservr', 'mysqld', 'postgres', 'oracle', 'mongod',
            'redis-server', 'memcached', 'cassandra'
        ]
        
        return any(db.lower() in process_name.lower() for db in db_processes)
    
    def _get_database_type(self, process_name: str) -> str:
        """Get database type from process name"""
        name = process_name.lower()
        
        if 'sqlservr' in name:
            return 'SQL Server'
        elif 'mysqld' in name:
            return 'MySQL'
        elif 'postgres' in name:
            return 'PostgreSQL'
        elif 'oracle' in name:
            return 'Oracle'
        elif 'mongod' in name:
            return 'MongoDB'
        elif 'redis' in name:
            return 'Redis'
        elif 'memcached' in name:
            return 'Memcached'
        elif 'cassandra' in name:
            return 'Cassandra'
        else:
            return 'Unknown'
    
    def _discover_web_servers(self) -> List[Dict[str, Any]]:
        """Discover web server instances"""
        web_servers = []
        
        try:
            # Check for web server processes
            for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
                try:
                    pinfo = proc.info
                    if self._is_web_server_process(pinfo['name']):
                        server_info = {
                            'type': self._get_web_server_type(pinfo['name']),
                            'process_name': pinfo['name'],
                            'pid': pinfo['pid'],
                            'status': 'running'
                        }
                        
                        # Try to extract port from command line
                        if pinfo['cmdline']:
                            port = self._extract_port_from_cmdline(pinfo['cmdline'])
                            if port:
                                server_info['port'] = port
                                
                        web_servers.append(server_info)
                        
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue
                    
        except Exception as e:
            self.logger.error(f"Error discovering web servers: {e}")
            
        return web_servers
    
    def _is_web_server_process(self, process_name: str) -> bool:
        """Check if process is a web server"""
        if not process_name:
            return False
            
        web_processes = [
            'apache', 'nginx', 'w3wp', 'tomcat', 'jetty', 'lighttpd'
        ]
        
        return any(web.lower() in process_name.lower() for web in web_processes)
    
    def _get_web_server_type(self, process_name: str) -> str:
        """Get web server type from process name"""
        name = process_name.lower()
        
        if 'apache' in name:
            return 'Apache'
        elif 'nginx' in name:
            return 'Nginx'
        elif 'w3wp' in name:
            return 'IIS'
        elif 'tomcat' in name:
            return 'Tomcat'
        elif 'jetty' in name:
            return 'Jetty'
        elif 'lighttpd' in name:
            return 'Lighttpd'
        else:
            return 'Unknown'
    
    def _extract_port_from_cmdline(self, cmdline: List[str]) -> Optional[int]:
        """Extract port number from command line arguments"""
        try:
            cmdline_str = ' '.join(cmdline)
            
            # Common port patterns
            import re
            port_patterns = [
                r'--port[=\s]+(\d+)',
                r'-p[=\s]+(\d+)',
                r':(\d+)',
                r'listen[=\s]+(\d+)'
            ]
            
            for pattern in port_patterns:
                match = re.search(pattern, cmdline_str)
                if match:
                    return int(match.group(1))
                    
        except Exception:
            pass
            
        return None
    
    def _assess_application_health(self) -> Dict[str, Any]:
        """Assess overall application health"""
        try:
            running_services = self._get_running_services()
            app_performance = self._get_application_performance()
            
            total_apps = len(app_performance)
            healthy_apps = len([app for app in app_performance if app.get('cpu_percent', 0) < 80])
            
            health_status = 'healthy'
            if total_apps > 0:
                health_ratio = healthy_apps / total_apps
                if health_ratio < 0.7:
                    health_status = 'critical'
                elif health_ratio < 0.9:
                    health_status = 'warning'
            
            return {
                'overall_status': health_status,
                'total_applications': total_apps,
                'healthy_applications': healthy_apps,
                'total_services': len(running_services),
                'assessment_time': datetime.utcnow().isoformat() + 'Z'
            }
            
        except Exception as e:
            self.logger.error(f"Error assessing application health: {e}")
            return {
                'overall_status': 'unknown',
                'error': str(e)
            }
    
    def _get_application_port_bindings(self) -> List[Dict[str, Any]]:
        """Get application port bindings"""
        port_bindings = []
        
        try:
            connections = psutil.net_connections(kind='inet')
            for conn in connections:
                if conn.status == psutil.CONN_LISTEN and conn.laddr:
                    try:
                        process = psutil.Process(conn.pid) if conn.pid else None
                        port_info = {
                            'port': conn.laddr.port,
                            'address': conn.laddr.ip,
                            'protocol': 'tcp' if conn.type == 1 else 'udp',
                            'process_name': process.name() if process else 'Unknown',
                            'pid': conn.pid,
                            'status': 'listening'
                        }
                        port_bindings.append(port_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        continue
                        
        except Exception as e:
            self.logger.error(f"Error getting port bindings: {e}")
            
        return port_bindings
