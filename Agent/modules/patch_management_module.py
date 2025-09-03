
"""
Patch Management Module
Handles patch status, compliance, and update management
"""

import logging
import platform
import json
import subprocess
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_module import BaseModule

class PatchManagementModule(BaseModule):
    """Patch management and update compliance"""
    
    def __init__(self):
        super().__init__('patch_management')
        self.os_name = platform.system()
        
    def collect(self) -> Dict[str, Any]:
        """Collect patch management information"""
        try:
            patch_info = {
                'update_status': self._get_update_status(),
                'installed_patches': self._get_installed_patches(),
                'available_updates': self._get_available_updates(),
                'critical_patches': self._get_critical_patches(),
                'pending_reboots': self._check_pending_reboots(),
                'update_history': self._get_update_history(),
                'compliance_status': self._check_compliance_status(),
                'auto_update_settings': self._get_auto_update_settings()
            }
            
            return {
                'status': 'success',
                'patch_info': patch_info,
                'collection_time': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error collecting patch information: {e}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _get_update_status(self) -> Dict[str, Any]:
        """Get current update status"""
        if self.os_name == 'Windows':
            return self._get_windows_update_status()
        elif self.os_name == 'Linux':
            return self._get_linux_update_status()
        elif self.os_name == 'Darwin':
            return self._get_macos_update_status()
        else:
            return {'status': 'unsupported'}
    
    def _get_windows_update_status(self) -> Dict[str, Any]:
        """Get Windows Update status"""
        try:
            import subprocess
            
            # Check Windows Update service status
            service_status = self._check_windows_update_service()
            
            # Get last update check time
            last_check = self._get_last_update_check()
            
            # Check for pending updates
            pending_updates = self._check_pending_updates()
            
            return {
                'service_status': service_status,
                'last_check': last_check,
                'pending_updates_count': len(pending_updates),
                'auto_update_enabled': self._check_auto_update_enabled()
            }
            
        except Exception as e:
            return {'error': str(e)}
    
    def _check_windows_update_service(self) -> str:
        """Check Windows Update service status"""
        try:
            result = subprocess.run(
                ['sc', 'query', 'wuauserv'],
                capture_output=True,
                text=True,
                timeout=10
            )
            
            if 'RUNNING' in result.stdout:
                return 'running'
            elif 'STOPPED' in result.stdout:
                return 'stopped'
            else:
                return 'unknown'
                
        except Exception as e:
            return f'error: {str(e)}'
    
    def _get_last_update_check(self) -> Optional[str]:
        """Get last Windows Update check time"""
        try:
            # Try to get from registry
            import winreg
            
            key_path = r'SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\Results\Detect'
            
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                last_success_time, _ = winreg.QueryValueEx(key, 'LastSuccessTime')
                return last_success_time
                
        except Exception as e:
            self.logger.debug(f"Could not get last update check: {e}")
            return None
    
    def _check_pending_updates(self) -> List[Dict[str, Any]]:
        """Check for pending Windows updates"""
        try:
            # Use PowerShell to check for updates
            ps_script = """
            Get-WUList | Select-Object Title, Size, @{Name="Severity";Expression={$_.MsrcSeverity}}
            """
            
            result = subprocess.run(
                ['powershell', '-Command', ps_script],
                capture_output=True,
                text=True,
                timeout=30
            )
            
            # Parse PowerShell output (simplified)
            updates = []
            if result.returncode == 0 and result.stdout:
                # This would need proper parsing of PowerShell output
                lines = result.stdout.strip().split('\n')
                for line in lines[2:]:  # Skip header lines
                    if line.strip():
                        updates.append({
                            'title': line.strip(),
                            'status': 'pending'
                        })
            
            return updates
            
        except Exception as e:
            self.logger.debug(f"Could not check pending updates: {e}")
            return []
    
    def _check_auto_update_enabled(self) -> bool:
        """Check if automatic updates are enabled"""
        try:
            import winreg
            
            key_path = r'SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update'
            
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                au_options, _ = winreg.QueryValueEx(key, 'AUOptions')
                return au_options in [3, 4]  # 3=automatic download and install, 4=automatic download and notify
                
        except Exception as e:
            return False
    
    def _get_installed_patches(self) -> List[Dict[str, Any]]:
        """Get list of installed patches"""
        if self.os_name == 'Windows':
            return self._get_windows_installed_patches()
        elif self.os_name == 'Linux':
            return self._get_linux_installed_patches()
        else:
            return []
    
    def _get_windows_installed_patches(self) -> List[Dict[str, Any]]:
        """Get Windows installed patches using WMI"""
        try:
            import wmi
            c = wmi.WMI()
            
            patches = []
            quick_fixes = c.Win32_QuickFixEngineering()
            
            for patch in quick_fixes:
                patches.append({
                    'hotfix_id': patch.HotFixID,
                    'description': patch.Description,
                    'installed_by': patch.InstalledBy,
                    'install_date': str(patch.InstalledOn) if patch.InstalledOn else None,
                    'caption': patch.Caption
                })
            
            return sorted(patches, key=lambda x: x.get('install_date', ''), reverse=True)[:50]
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_linux_installed_patches(self) -> List[Dict[str, Any]]:
        """Get Linux installed packages/patches"""
        try:
            patches = []
            
            # Try different package managers
            if self._command_exists('dpkg'):
                # Debian/Ubuntu
                result = subprocess.run(
                    ['dpkg', '-l'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if line.startswith('ii'):  # Installed packages
                            parts = line.split()
                            if len(parts) >= 3:
                                patches.append({
                                    'package': parts[1],
                                    'version': parts[2],
                                    'status': 'installed'
                                })
            
            elif self._command_exists('rpm'):
                # RedHat/CentOS/SUSE
                result = subprocess.run(
                    ['rpm', '-qa', '--queryformat', '%{NAME}|%{VERSION}|%{INSTALLTIME}\n'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        parts = line.split('|')
                        if len(parts) >= 2:
                            patches.append({
                                'package': parts[0],
                                'version': parts[1],
                                'install_time': parts[2] if len(parts) > 2 else None,
                                'status': 'installed'
                            })
            
            return patches[:100]  # Limit to 100 recent packages
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_available_updates(self) -> List[Dict[str, Any]]:
        """Get list of available updates"""
        if self.os_name == 'Windows':
            return self._check_pending_updates()
        elif self.os_name == 'Linux':
            return self._get_linux_available_updates()
        else:
            return []
    
    def _get_linux_available_updates(self) -> List[Dict[str, Any]]:
        """Get available Linux updates"""
        try:
            updates = []
            
            if self._command_exists('apt'):
                # Ubuntu/Debian
                result = subprocess.run(
                    ['apt', 'list', '--upgradable'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')[1:]  # Skip header
                    for line in lines:
                        if '/' in line:
                            package = line.split('/')[0]
                            updates.append({
                                'package': package,
                                'status': 'available'
                            })
            
            elif self._command_exists('yum'):
                # CentOS/RHEL
                result = subprocess.run(
                    ['yum', 'check-update'],
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                # yum check-update returns exit code 100 when updates are available
                if result.returncode in [0, 100]:
                    lines = result.stdout.strip().split('\n')
                    for line in lines:
                        if line and not line.startswith('Loaded') and not line.startswith('Last'):
                            parts = line.split()
                            if len(parts) >= 1 and '.' in parts[0]:
                                updates.append({
                                    'package': parts[0].split('.')[0],
                                    'status': 'available'
                                })
            
            return updates
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_critical_patches(self) -> List[Dict[str, Any]]:
        """Get critical security patches"""
        # This would filter patches by criticality
        available = self._get_available_updates()
        
        # Simple filtering - in reality would need CVE database integration
        critical = []
        for patch in available:
            if any(keyword in patch.get('package', '').lower() or 
                  keyword in patch.get('title', '').lower() 
                  for keyword in ['security', 'critical', 'cve']):
                critical.append({**patch, 'severity': 'critical'})
        
        return critical
    
    def _check_pending_reboots(self) -> Dict[str, Any]:
        """Check if system has pending reboots"""
        if self.os_name == 'Windows':
            return self._check_windows_pending_reboot()
        elif self.os_name == 'Linux':
            return self._check_linux_pending_reboot()
        else:
            return {'reboot_required': False}
    
    def _check_windows_pending_reboot(self) -> Dict[str, Any]:
        """Check Windows pending reboot status"""
        try:
            import winreg
            
            reboot_required = False
            reasons = []
            
            # Check various registry keys that indicate pending reboot
            reboot_keys = [
                (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired'),
                (winreg.HKEY_LOCAL_MACHINE, r'SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending'),
                (winreg.HKEY_LOCAL_MACHINE, r'SYSTEM\CurrentControlSet\Control\Session Manager', 'PendingFileRenameOperations')
            ]
            
            for hkey, key_path, *value_name in reboot_keys:
                try:
                    with winreg.OpenKey(hkey, key_path) as key:
                        if value_name:
                            winreg.QueryValueEx(key, value_name[0])
                            reasons.append(value_name[0])
                        else:
                            reasons.append(key_path.split('\\')[-1])
                        reboot_required = True
                except (FileNotFoundError, OSError):
                    continue
            
            return {
                'reboot_required': reboot_required,
                'reasons': reasons
            }
            
        except Exception as e:
            return {'reboot_required': False, 'error': str(e)}
    
    def _check_linux_pending_reboot(self) -> Dict[str, Any]:
        """Check Linux pending reboot status"""
        try:
            reboot_required = False
            reasons = []
            
            # Check for reboot-required file
            if self._file_exists('/var/run/reboot-required'):
                reboot_required = True
                reasons.append('system_update')
                
                # Try to read reasons
                try:
                    with open('/var/run/reboot-required.pkgs', 'r') as f:
                        packages = f.read().strip().split('\n')
                        reasons.extend(packages[:5])  # Limit to 5 packages
                except FileNotFoundError:
                    pass
            
            return {
                'reboot_required': reboot_required,
                'reasons': reasons
            }
            
        except Exception as e:
            return {'reboot_required': False, 'error': str(e)}
    
    def _get_update_history(self) -> List[Dict[str, Any]]:
        """Get update installation history"""
        if self.os_name == 'Windows':
            return self._get_windows_update_history()
        else:
            return []
    
    def _get_windows_update_history(self) -> List[Dict[str, Any]]:
        """Get Windows Update history"""
        try:
            # This would use Windows Update API or event logs
            # For now, return placeholder
            return []
        except Exception as e:
            return [{'error': str(e)}]
    
    def _check_compliance_status(self) -> Dict[str, Any]:
        """Check patch compliance status"""
        try:
            available_updates = self._get_available_updates()
            critical_patches = self._get_critical_patches()
            
            compliance = {
                'total_available_updates': len(available_updates),
                'critical_patches_missing': len(critical_patches),
                'compliance_score': self._calculate_compliance_score(available_updates, critical_patches),
                'last_patch_date': self._get_last_patch_date(),
                'compliance_status': 'compliant' if len(critical_patches) == 0 else 'non_compliant'
            }
            
            return compliance
            
        except Exception as e:
            return {'error': str(e)}
    
    def _calculate_compliance_score(self, available: List, critical: List) -> float:
        """Calculate compliance score"""
        if not available:
            return 100.0
        
        # Simple scoring: critical patches have more weight
        critical_weight = 0.8
        regular_weight = 0.2
        
        critical_score = max(0, 100 - (len(critical) * 20))  # -20 points per critical patch
        regular_score = max(0, 100 - ((len(available) - len(critical)) * 5))  # -5 points per regular patch
        
        return (critical_score * critical_weight) + (regular_score * regular_weight)
    
    def _get_last_patch_date(self) -> Optional[str]:
        """Get date of last installed patch"""
        patches = self._get_installed_patches()
        if patches and patches[0].get('install_date'):
            return patches[0]['install_date']
        return None
    
    def _get_auto_update_settings(self) -> Dict[str, Any]:
        """Get automatic update settings"""
        if self.os_name == 'Windows':
            return self._get_windows_auto_update_settings()
        elif self.os_name == 'Linux':
            return self._get_linux_auto_update_settings()
        else:
            return {'status': 'unknown'}
    
    def _get_windows_auto_update_settings(self) -> Dict[str, Any]:
        """Get Windows automatic update settings"""
        try:
            import winreg
            
            settings = {}
            key_path = r'SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update'
            
            with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, key_path) as key:
                try:
                    au_options, _ = winreg.QueryValueEx(key, 'AUOptions')
                    settings['au_options'] = au_options
                    
                    options_map = {
                        1: 'disabled',
                        2: 'notify_download',
                        3: 'auto_download_notify_install',
                        4: 'auto_download_install'
                    }
                    settings['description'] = options_map.get(au_options, 'unknown')
                    
                except FileNotFoundError:
                    settings['au_options'] = None
                
                try:
                    scheduled_day, _ = winreg.QueryValueEx(key, 'ScheduledInstallDay')
                    scheduled_time, _ = winreg.QueryValueEx(key, 'ScheduledInstallTime')
                    settings['scheduled_day'] = scheduled_day
                    settings['scheduled_time'] = scheduled_time
                except FileNotFoundError:
                    pass
            
            return settings
            
        except Exception as e:
            return {'error': str(e)}
    
    def _get_linux_auto_update_settings(self) -> Dict[str, Any]:
        """Get Linux automatic update settings"""
        try:
            settings = {}
            
            # Check unattended-upgrades (Ubuntu/Debian)
            if self._file_exists('/etc/apt/apt.conf.d/20auto-upgrades'):
                with open('/etc/apt/apt.conf.d/20auto-upgrades', 'r') as f:
                    content = f.read()
                    settings['unattended_upgrades'] = 'enabled' if 'APT::Periodic::Unattended-Upgrade "1"' in content else 'disabled'
            
            # Check yum-cron (CentOS/RHEL)
            elif self._file_exists('/etc/yum/yum-cron.conf'):
                settings['yum_cron'] = 'configured'
            
            return settings
            
        except Exception as e:
            return {'error': str(e)}
    
    def _command_exists(self, command: str) -> bool:
        """Check if a command exists"""
        try:
            subprocess.run(['which', command], capture_output=True, check=True)
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False
    
    def _file_exists(self, filepath: str) -> bool:
        """Check if a file exists"""
        try:
            import os
            return os.path.isfile(filepath)
        except Exception:
            return False
    
    def _get_macos_update_status(self) -> Dict[str, Any]:
        """Get macOS update status"""
        # Implementation for macOS updates
        return {'status': 'not_implemented'}
