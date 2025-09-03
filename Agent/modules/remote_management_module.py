
"""
Remote Management Capabilities Module
Provides remote management and troubleshooting capabilities
"""

import logging
import platform
import subprocess
import json
import os
import tempfile
import socket
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base_module import BaseModule


class RemoteManagementModule(BaseModule):
    """Remote management capabilities module"""
    
    def __init__(self):
        super().__init__('RemoteManagement')
        self.is_windows = platform.system().lower() == 'windows'
        self.is_linux = platform.system().lower() == 'linux'
        self.is_macos = platform.system().lower() == 'darwin'
        self.execution_history = []
        
    def collect(self) -> Dict[str, Any]:
        """Collect remote management capabilities data"""
        mgmt_data = {
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'remote_access_status': self._check_remote_access_status(),
            'wmi_capabilities': self._check_wmi_capabilities(),
            'powershell_capabilities': self._check_powershell_capabilities(),
            'ssh_capabilities': self._check_ssh_capabilities(),
            'file_transfer_capabilities': self._check_file_transfer_capabilities(),
            'registry_access_capabilities': self._check_registry_access_capabilities(),
            'service_management_capabilities': self._check_service_management_capabilities(),
            'process_management_capabilities': self._check_process_management_capabilities(),
            'network_management_capabilities': self._check_network_management_capabilities(),
            'system_configuration_capabilities': self._check_system_config_capabilities()
        }
        
        return mgmt_data
    
    def execute_remote_command(self, command: str, command_type: str = 'shell') -> Dict[str, Any]:
        """Execute a remote command"""
        execution_result = {
            'command': command,
            'command_type': command_type,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'success': False,
            'output': '',
            'error': '',
            'exit_code': -1
        }
        
        try:
            if command_type == 'shell':
                result = self._execute_shell_command(command)
            elif command_type == 'powershell' and self.is_windows:
                result = self._execute_powershell_command(command)
            elif command_type == 'wmi' and self.is_windows:
                result = self._execute_wmi_command(command)
            elif command_type == 'registry' and self.is_windows:
                result = self._execute_registry_command(command)
            else:
                result = {
                    'success': False,
                    'error': f'Unsupported command type: {command_type}',
                    'exit_code': -1
                }
            
            execution_result.update(result)
            
            # Store in execution history
            self.execution_history.append(execution_result)
            
            # Keep only last 100 commands
            if len(self.execution_history) > 100:
                self.execution_history = self.execution_history[-100:]
                
        except Exception as e:
            execution_result['error'] = str(e)
            self.logger.error(f"Error executing remote command: {e}")
        
        return execution_result
    
    def transfer_file(self, operation: str, local_path: str, remote_path: str = None) -> Dict[str, Any]:
        """Handle file transfer operations"""
        transfer_result = {
            'operation': operation,
            'local_path': local_path,
            'remote_path': remote_path,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'success': False,
            'message': '',
            'bytes_transferred': 0
        }
        
        try:
            if operation == 'upload':
                result = self._upload_file(local_path, remote_path)
            elif operation == 'download':
                result = self._download_file(remote_path, local_path)
            elif operation == 'list':
                result = self._list_remote_files(local_path)
            else:
                result = {
                    'success': False,
                    'message': f'Unsupported operation: {operation}'
                }
            
            transfer_result.update(result)
            
        except Exception as e:
            transfer_result['message'] = str(e)
            self.logger.error(f"Error in file transfer operation: {e}")
        
        return transfer_result
    
    def _check_remote_access_status(self) -> Dict[str, Any]:
        """Check remote access service status"""
        status = {
            'rdp_enabled': False,
            'ssh_enabled': False,
            'vnc_enabled': False,
            'winrm_enabled': False,
            'telnet_enabled': False
        }
        
        try:
            if self.is_windows:
                status.update(self._check_windows_remote_access())
            elif self.is_linux:
                status.update(self._check_linux_remote_access())
            elif self.is_macos:
                status.update(self._check_macos_remote_access())
                
        except Exception as e:
            self.logger.error(f"Error checking remote access status: {e}")
        
        return status
    
    def _check_windows_remote_access(self) -> Dict[str, bool]:
        """Check Windows remote access services"""
        status = {}
        
        try:
            # Check RDP
            result = subprocess.run(['reg', 'query', 
                                   'HKEY_LOCAL_MACHINE\\SYSTEM\\CurrentControlSet\\Control\\Terminal Server',
                                   '/v', 'fDenyTSConnections'], 
                                  capture_output=True, text=True, timeout=30)
            status['rdp_enabled'] = 'REG_DWORD    0x0' in result.stdout
            
            # Check WinRM
            result = subprocess.run(['winrm', 'get', 'winrm/config'], 
                                  capture_output=True, text=True, timeout=30)
            status['winrm_enabled'] = result.returncode == 0
            
            # Check Telnet
            result = subprocess.run(['sc', 'query', 'TlntSvr'], 
                                  capture_output=True, text=True, timeout=30)
            status['telnet_enabled'] = 'RUNNING' in result.stdout
            
        except Exception as e:
            self.logger.debug(f"Error checking Windows remote access: {e}")
        
        return status
    
    def _check_linux_remote_access(self) -> Dict[str, bool]:
        """Check Linux remote access services"""
        status = {}
        
        try:
            # Check SSH
            result = subprocess.run(['systemctl', 'is-active', 'ssh'], 
                                  capture_output=True, text=True, timeout=30)
            status['ssh_enabled'] = result.stdout.strip() == 'active'
            
            if not status['ssh_enabled']:
                # Try sshd
                result = subprocess.run(['systemctl', 'is-active', 'sshd'], 
                                      capture_output=True, text=True, timeout=30)
                status['ssh_enabled'] = result.stdout.strip() == 'active'
            
            # Check VNC
            result = subprocess.run(['systemctl', 'is-active', 'vncserver'], 
                                  capture_output=True, text=True, timeout=30)
            status['vnc_enabled'] = result.stdout.strip() == 'active'
            
            # Check Telnet
            result = subprocess.run(['systemctl', 'is-active', 'telnet'], 
                                  capture_output=True, text=True, timeout=30)
            status['telnet_enabled'] = result.stdout.strip() == 'active'
            
        except Exception as e:
            self.logger.debug(f"Error checking Linux remote access: {e}")
        
        return status
    
    def _check_macos_remote_access(self) -> Dict[str, bool]:
        """Check macOS remote access services"""
        status = {}
        
        try:
            # Check SSH
            result = subprocess.run(['launchctl', 'list', 'com.openssh.sshd'], 
                                  capture_output=True, text=True, timeout=30)
            status['ssh_enabled'] = result.returncode == 0
            
            # Check VNC (Screen Sharing)
            result = subprocess.run(['launchctl', 'list', 'com.apple.screensharing'], 
                                  capture_output=True, text=True, timeout=30)
            status['vnc_enabled'] = result.returncode == 0
            
        except Exception as e:
            self.logger.debug(f"Error checking macOS remote access: {e}")
        
        return status
    
    def _check_wmi_capabilities(self) -> Dict[str, Any]:
        """Check WMI capabilities (Windows only)"""
        capabilities = {
            'wmi_available': False,
            'wmi_service_running': False,
            'wmic_available': False,
            'powershell_wmi_available': False
        }
        
        if not self.is_windows:
            return capabilities
        
        try:
            # Check WMI service
            result = subprocess.run(['sc', 'query', 'Winmgmt'], 
                                  capture_output=True, text=True, timeout=30)
            capabilities['wmi_service_running'] = 'RUNNING' in result.stdout
            
            # Check WMIC availability
            result = subprocess.run(['wmic', 'os', 'get', 'Caption'], 
                                  capture_output=True, text=True, timeout=30)
            capabilities['wmic_available'] = result.returncode == 0
            
            # Check PowerShell WMI
            result = subprocess.run(['powershell', '-Command', 'Get-WmiObject -Class Win32_OperatingSystem'], 
                                  capture_output=True, text=True, timeout=30)
            capabilities['powershell_wmi_available'] = result.returncode == 0
            
            capabilities['wmi_available'] = any([
                capabilities['wmic_available'],
                capabilities['powershell_wmi_available']
            ])
            
        except Exception as e:
            self.logger.debug(f"Error checking WMI capabilities: {e}")
        
        return capabilities
    
    def _check_powershell_capabilities(self) -> Dict[str, Any]:
        """Check PowerShell capabilities"""
        capabilities = {
            'powershell_available': False,
            'powershell_core_available': False,
            'execution_policy': 'Unknown',
            'version': 'Unknown'
        }
        
        try:
            # Check Windows PowerShell
            result = subprocess.run(['powershell', '-Command', '$PSVersionTable'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                capabilities['powershell_available'] = True
                capabilities['version'] = 'Windows PowerShell'
            
            # Check PowerShell Core
            result = subprocess.run(['pwsh', '-Command', '$PSVersionTable'], 
                                  capture_output=True, text=True, timeout=30)
            if result.returncode == 0:
                capabilities['powershell_core_available'] = True
                if not capabilities['powershell_available']:
                    capabilities['version'] = 'PowerShell Core'
            
            # Check execution policy (Windows only)
            if self.is_windows and capabilities['powershell_available']:
                result = subprocess.run(['powershell', '-Command', 'Get-ExecutionPolicy'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    capabilities['execution_policy'] = result.stdout.strip()
            
        except Exception as e:
            self.logger.debug(f"Error checking PowerShell capabilities: {e}")
        
        return capabilities
    
    def _check_ssh_capabilities(self) -> Dict[str, Any]:
        """Check SSH capabilities"""
        capabilities = {
            'ssh_client_available': False,
            'ssh_server_running': False,
            'ssh_keys_configured': False,
            'scp_available': False,
            'sftp_available': False
        }
        
        try:
            # Check SSH client
            result = subprocess.run(['ssh', '-V'], capture_output=True, text=True, timeout=30)
            capabilities['ssh_client_available'] = result.returncode == 0 or 'OpenSSH' in result.stderr
            
            # Check SCP
            result = subprocess.run(['scp'], capture_output=True, text=True, timeout=30)
            capabilities['scp_available'] = 'usage:' in result.stderr.lower() or result.returncode == 1
            
            # Check SFTP
            result = subprocess.run(['sftp'], capture_output=True, text=True, timeout=30)
            capabilities['sftp_available'] = 'usage:' in result.stderr.lower() or result.returncode == 1
            
            # Check SSH server status
            if self.is_linux:
                result = subprocess.run(['systemctl', 'is-active', 'ssh'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['ssh_server_running'] = result.stdout.strip() == 'active'
                
                if not capabilities['ssh_server_running']:
                    result = subprocess.run(['systemctl', 'is-active', 'sshd'], 
                                          capture_output=True, text=True, timeout=30)
                    capabilities['ssh_server_running'] = result.stdout.strip() == 'active'
            
            # Check SSH keys
            ssh_dir = os.path.expanduser('~/.ssh')
            if os.path.exists(ssh_dir):
                key_files = ['id_rsa', 'id_dsa', 'id_ecdsa', 'id_ed25519']
                capabilities['ssh_keys_configured'] = any(
                    os.path.exists(os.path.join(ssh_dir, key)) for key in key_files
                )
            
        except Exception as e:
            self.logger.debug(f"Error checking SSH capabilities: {e}")
        
        return capabilities
    
    def _check_file_transfer_capabilities(self) -> Dict[str, Any]:
        """Check file transfer capabilities"""
        capabilities = {
            'local_file_access': True,  # Always available
            'network_shares_access': False,
            'ftp_available': False,
            'wget_available': False,
            'curl_available': False,
            'robocopy_available': False  # Windows only
        }
        
        try:
            # Check FTP
            result = subprocess.run(['ftp', '-?'], capture_output=True, text=True, timeout=30)
            capabilities['ftp_available'] = result.returncode == 0 or 'usage' in result.stderr.lower()
            
            # Check wget
            result = subprocess.run(['wget', '--version'], capture_output=True, text=True, timeout=30)
            capabilities['wget_available'] = result.returncode == 0
            
            # Check curl
            result = subprocess.run(['curl', '--version'], capture_output=True, text=True, timeout=30)
            capabilities['curl_available'] = result.returncode == 0
            
            # Check robocopy (Windows)
            if self.is_windows:
                result = subprocess.run(['robocopy', '/?'], capture_output=True, text=True, timeout=30)
                capabilities['robocopy_available'] = result.returncode == 16  # Robocopy returns 16 for help
            
            # Check network shares access
            if self.is_windows:
                result = subprocess.run(['net', 'use'], capture_output=True, text=True, timeout=30)
                capabilities['network_shares_access'] = result.returncode == 0
            
        except Exception as e:
            self.logger.debug(f"Error checking file transfer capabilities: {e}")
        
        return capabilities
    
    def _check_registry_access_capabilities(self) -> Dict[str, Any]:
        """Check registry access capabilities (Windows only)"""
        capabilities = {
            'registry_access_available': False,
            'reg_command_available': False,
            'powershell_registry_available': False,
            'registry_permissions': 'Unknown'
        }
        
        if not self.is_windows:
            return capabilities
        
        try:
            # Check reg command
            result = subprocess.run(['reg', '/?'], capture_output=True, text=True, timeout=30)
            capabilities['reg_command_available'] = result.returncode == 0
            
            # Check PowerShell registry access
            result = subprocess.run(['powershell', '-Command', 'Get-Item HKLM:\\'], 
                                  capture_output=True, text=True, timeout=30)
            capabilities['powershell_registry_available'] = result.returncode == 0
            
            capabilities['registry_access_available'] = any([
                capabilities['reg_command_available'],
                capabilities['powershell_registry_available']
            ])
            
            # Test registry read access
            if capabilities['reg_command_available']:
                result = subprocess.run(['reg', 'query', 'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    capabilities['registry_permissions'] = 'Read Access'
                else:
                    capabilities['registry_permissions'] = 'No Access'
            
        except Exception as e:
            self.logger.debug(f"Error checking registry access capabilities: {e}")
        
        return capabilities
    
    def _check_service_management_capabilities(self) -> Dict[str, Any]:
        """Check service management capabilities"""
        capabilities = {
            'service_control_available': False,
            'service_query_available': False,
            'service_install_available': False,
            'service_permissions': 'Unknown'
        }
        
        try:
            if self.is_windows:
                # Check sc command
                result = subprocess.run(['sc', 'query'], capture_output=True, text=True, timeout=30)
                capabilities['service_query_available'] = result.returncode == 0
                
                # Check service control
                capabilities['service_control_available'] = capabilities['service_query_available']
                
                # Check PowerShell service management
                result = subprocess.run(['powershell', '-Command', 'Get-Service'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    capabilities['service_query_available'] = True
                    capabilities['service_control_available'] = True
                
            elif self.is_linux:
                # Check systemctl
                result = subprocess.run(['systemctl', 'list-units', '--type=service'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['service_query_available'] = result.returncode == 0
                
                # Check service control permissions
                result = subprocess.run(['systemctl', 'is-enabled', 'ssh'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['service_control_available'] = result.returncode == 0
                
                # Check service install capabilities
                capabilities['service_install_available'] = os.geteuid() == 0 if hasattr(os, 'geteuid') else False
            
        except Exception as e:
            self.logger.debug(f"Error checking service management capabilities: {e}")
        
        return capabilities
    
    def _check_process_management_capabilities(self) -> Dict[str, Any]:
        """Check process management capabilities"""
        capabilities = {
            'process_list_available': True,  # psutil provides this
            'process_kill_available': True,  # Usually available
            'process_start_available': True,  # subprocess provides this
            'process_priority_control': False,
            'process_affinity_control': False
        }
        
        try:
            # Check if we can list processes (should always work with psutil)
            import psutil
            processes = list(psutil.process_iter(['pid', 'name']))
            capabilities['process_list_available'] = len(processes) > 0
            
            # Check process priority control
            if self.is_windows:
                result = subprocess.run(['wmic', 'process', 'get', 'Priority'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['process_priority_control'] = result.returncode == 0
            else:
                # On Unix-like systems, check if we can use nice/renice
                result = subprocess.run(['nice', '--version'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['process_priority_control'] = result.returncode == 0
            
            # Check CPU affinity control
            capabilities['process_affinity_control'] = hasattr(psutil.Process, 'cpu_affinity')
            
        except Exception as e:
            self.logger.debug(f"Error checking process management capabilities: {e}")
        
        return capabilities
    
    def _check_network_management_capabilities(self) -> Dict[str, Any]:
        """Check network management capabilities"""
        capabilities = {
            'network_config_available': False,
            'firewall_control_available': False,
            'port_management_available': False,
            'dns_management_available': False,
            'routing_management_available': False
        }
        
        try:
            if self.is_windows:
                # Check netsh
                result = subprocess.run(['netsh', 'interface', 'show', 'interface'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['network_config_available'] = result.returncode == 0
                
                # Check firewall control
                result = subprocess.run(['netsh', 'advfirewall', 'show', 'allprofiles'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['firewall_control_available'] = result.returncode == 0
                
                # Check routing
                result = subprocess.run(['route', 'print'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['routing_management_available'] = result.returncode == 0
                
            elif self.is_linux:
                # Check ifconfig/ip command
                result = subprocess.run(['ip', 'addr', 'show'], 
                                      capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    capabilities['network_config_available'] = True
                else:
                    result = subprocess.run(['ifconfig'], 
                                          capture_output=True, text=True, timeout=30)
                    capabilities['network_config_available'] = result.returncode == 0
                
                # Check iptables
                result = subprocess.run(['iptables', '-L'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['firewall_control_available'] = result.returncode == 0
                
                # Check routing
                result = subprocess.run(['ip', 'route', 'show'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['routing_management_available'] = result.returncode == 0
            
            # Port management (netstat is usually available)
            result = subprocess.run(['netstat', '-an'], 
                                  capture_output=True, text=True, timeout=30)
            capabilities['port_management_available'] = result.returncode == 0
            
        except Exception as e:
            self.logger.debug(f"Error checking network management capabilities: {e}")
        
        return capabilities
    
    def _check_system_config_capabilities(self) -> Dict[str, Any]:
        """Check system configuration capabilities"""
        capabilities = {
            'environment_variables_access': True,  # os.environ always available
            'system_settings_access': False,
            'user_management_available': False,
            'scheduled_tasks_management': False,
            'group_policy_access': False  # Windows only
        }
        
        try:
            if self.is_windows:
                # Check system settings access
                result = subprocess.run(['systeminfo'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['system_settings_access'] = result.returncode == 0
                
                # Check user management
                result = subprocess.run(['net', 'user'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['user_management_available'] = result.returncode == 0
                
                # Check scheduled tasks
                result = subprocess.run(['schtasks', '/query'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['scheduled_tasks_management'] = result.returncode == 0
                
                # Check Group Policy
                result = subprocess.run(['gpresult', '/r'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['group_policy_access'] = result.returncode == 0
                
            elif self.is_linux:
                # Check system settings
                capabilities['system_settings_access'] = os.path.exists('/etc')
                
                # Check user management
                result = subprocess.run(['id'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['user_management_available'] = result.returncode == 0
                
                # Check cron/scheduled tasks
                result = subprocess.run(['crontab', '-l'], 
                                      capture_output=True, text=True, timeout=30)
                capabilities['scheduled_tasks_management'] = result.returncode == 0 or 'no crontab' in result.stderr
            
        except Exception as e:
            self.logger.debug(f"Error checking system config capabilities: {e}")
        
        return capabilities
    
    def _execute_shell_command(self, command: str) -> Dict[str, Any]:
        """Execute a shell command"""
        try:
            result = subprocess.run(command, shell=True, capture_output=True, 
                                  text=True, timeout=300)  # 5 minute timeout
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'exit_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Command timed out after 5 minutes',
                'exit_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'exit_code': -1
            }
    
    def _execute_powershell_command(self, command: str) -> Dict[str, Any]:
        """Execute a PowerShell command"""
        try:
            powershell_cmd = ['powershell', '-Command', command]
            result = subprocess.run(powershell_cmd, capture_output=True, 
                                  text=True, timeout=300)
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'exit_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'PowerShell command timed out after 5 minutes',
                'exit_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'exit_code': -1
            }
    
    def _execute_wmi_command(self, command: str) -> Dict[str, Any]:
        """Execute a WMI command"""
        try:
            wmi_cmd = ['wmic'] + command.split()
            result = subprocess.run(wmi_cmd, capture_output=True, 
                                  text=True, timeout=300)
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'exit_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'WMI command timed out after 5 minutes',
                'exit_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'exit_code': -1
            }
    
    def _execute_registry_command(self, command: str) -> Dict[str, Any]:
        """Execute a registry command"""
        try:
            reg_cmd = ['reg'] + command.split()
            result = subprocess.run(reg_cmd, capture_output=True, 
                                  text=True, timeout=300)
            
            return {
                'success': result.returncode == 0,
                'output': result.stdout,
                'error': result.stderr,
                'exit_code': result.returncode
            }
            
        except subprocess.TimeoutExpired:
            return {
                'success': False,
                'output': '',
                'error': 'Registry command timed out after 5 minutes',
                'exit_code': -1
            }
        except Exception as e:
            return {
                'success': False,
                'output': '',
                'error': str(e),
                'exit_code': -1
            }
    
    def _upload_file(self, local_path: str, remote_path: str) -> Dict[str, Any]:
        """Upload file to remote location"""
        try:
            # For local file operations, this would copy to a different location
            import shutil
            
            if os.path.exists(local_path):
                shutil.copy2(local_path, remote_path)
                file_size = os.path.getsize(remote_path)
                
                return {
                    'success': True,
                    'message': f'File uploaded successfully to {remote_path}',
                    'bytes_transferred': file_size
                }
            else:
                return {
                    'success': False,
                    'message': f'Source file {local_path} does not exist'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }
    
    def _download_file(self, remote_path: str, local_path: str) -> Dict[str, Any]:
        """Download file from remote location"""
        try:
            # For local file operations, this would copy from a different location
            import shutil
            
            if os.path.exists(remote_path):
                shutil.copy2(remote_path, local_path)
                file_size = os.path.getsize(local_path)
                
                return {
                    'success': True,
                    'message': f'File downloaded successfully to {local_path}',
                    'bytes_transferred': file_size
                }
            else:
                return {
                    'success': False,
                    'message': f'Source file {remote_path} does not exist'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }
    
    def _list_remote_files(self, path: str) -> Dict[str, Any]:
        """List files in remote directory"""
        try:
            if os.path.exists(path) and os.path.isdir(path):
                files = []
                for item in os.listdir(path):
                    item_path = os.path.join(path, item)
                    stat_info = os.stat(item_path)
                    
                    files.append({
                        'name': item,
                        'path': item_path,
                        'size': stat_info.st_size,
                        'is_directory': os.path.isdir(item_path),
                        'modified_time': datetime.fromtimestamp(stat_info.st_mtime).isoformat()
                    })
                
                return {
                    'success': True,
                    'message': f'Listed {len(files)} items in {path}',
                    'files': files
                }
            else:
                return {
                    'success': False,
                    'message': f'Directory {path} does not exist or is not accessible'
                }
                
        except Exception as e:
            return {
                'success': False,
                'message': str(e)
            }
