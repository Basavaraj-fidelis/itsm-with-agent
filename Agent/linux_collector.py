"""
Linux System Information Collector
Linux-specific system information gathering
"""

import os
import platform
import subprocess
import psutil
import logging
from datetime import datetime
import shutil


class LinuxCollector:
    """Linux-specific system information collector"""

    def __init__(self):
        self.logger = logging.getLogger('LinuxCollector')

    def get_os_info(self):
        """Get Linux-specific OS information"""
        try:
            info = {}

            # Read OS release info
            try:
                with open('/etc/os-release', 'r') as f:
                    for line in f:
                        if '=' in line:
                            key, value = line.strip().split('=', 1)
                            info[key.lower()] = value.strip('"')
            except Exception:
                pass

            # Kernel version
            try:
                info['kernel_version'] = platform.uname().release
            except Exception:
                pass

            # Last update time
            try:
                if os.path.exists('/var/log/apt/history.log'):
                    result = subprocess.run(['tail', '-n', '50', '/var/log/apt/history.log'], 
                                            capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        for line in reversed(lines):
                            if line.startswith('Start-Date:'):
                                info['last_update'] = line.split(':', 1)[1].strip()
                                break

                elif os.path.exists('/var/log/dnf.log') or os.path.exists('/var/log/yum.log'):
                    log_file = '/var/log/dnf.log' if os.path.exists('/var/log/dnf.log') else '/var/log/yum.log'
                    result = subprocess.run(['tail', '-n', '10', log_file], 
                                            capture_output=True, text=True, timeout=10)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if lines:
                            info['last_update'] = ' '.join(lines[-1].split()[0:2])
            except Exception:
                pass

            # Patch list (APT or RPM) - Show meaningful patch summary
            try:
                patch_summary = {
                    "total_installed": 0,
                    "recent_patches": [],
                    "last_update_date": None,
                    "system_type": "unknown"
                }

                if shutil.which('dpkg'):
                    patch_summary["system_type"] = "debian"

                    # Get total package count
                    try:
                        result = subprocess.run(['dpkg', '-l'], capture_output=True, text=True, timeout=15)
                        if result.returncode == 0:
                            # Count installed packages (lines starting with 'ii')
                            installed_count = len([line for line in result.stdout.split('\n') if line.startswith('ii')])
                            patch_summary["total_installed"] = installed_count
                    except Exception:
                        pass

                    # Get recent update history with more details
                    try:
                        if os.path.exists('/var/log/apt/history.log'):
                            result = subprocess.run(['grep', '-E', '(Start-Date|Install|Upgrade):', '/var/log/apt/history.log'], 
                                                    capture_output=True, text=True, timeout=15)
                            if result.returncode == 0:
                                recent_updates = []
                                lines = result.stdout.strip().split('\n')

                                # Parse the log to get meaningful update entries
                                current_update = None
                                for line in lines[-50:]:  # Last 50 lines for context
                                    if line.startswith('Start-Date:'):
                                        if current_update:
                                            recent_updates.append(current_update)
                                        current_update = {
                                            "date": line.replace('Start-Date:', '').strip(),
                                            "type": "system_update",
                                            "packages": []
                                        }
                                    elif current_update and (line.startswith('Install:') or line.startswith('Upgrade:')):
                                        # Extract package names from install/upgrade lines
                                        action = "Install" if line.startswith('Install:') else "Upgrade"
                                        packages = line.split(':', 1)[1].strip()
                                        current_update["action"] = action
                                        current_update["package"] = f"{action}: {packages[:100]}..."  # Truncate long lists

                                if current_update:
                                    recent_updates.append(current_update)

                                # Keep only the last 5 updates
                                recent_updates = recent_updates[-5:] if recent_updates else []

                                if recent_updates:
                                    patch_summary["recent_patches"] = recent_updates
                                    patch_summary["last_update_date"] = recent_updates[-1]["date"]
                    except Exception:
                        pass

                elif shutil.which('rpm'):
                    patch_summary["system_type"] = "redhat"

                    # Get total package count
                    try:
                        result = subprocess.run(['rpm', '-qa'], capture_output=True, text=True, timeout=15)
                        if result.returncode == 0:
                            package_count = len(result.stdout.strip().split('\n'))
                            patch_summary["total_installed"] = package_count
                    except Exception:
                        pass

                    # Get recent packages
                    try:
                        result = subprocess.run(['rpm', '-qa', '--last'], capture_output=True, text=True, timeout=15)
                        if result.returncode == 0:
                            recent_updates = []
                            lines = result.stdout.strip().split('\n')[:5]  # Most recent 5
                            for line in lines:
                                if line:
                                    parts = line.split()
                                    if len(parts) >= 4:
                                        package_name = parts[0]
                                        install_date = ' '.join(parts[1:4])
                                        recent_updates.append({
                                            "package": package_name,
                                            "date": install_date,
                                            "type": "package_update"
                                        })

                            if recent_updates:
                                patch_summary["recent_patches"] = recent_updates
                                patch_summary["last_update_date"] = recent_updates[0]["date"]
                    except Exception:
                        pass

                # Only add patch info if we have meaningful data
                if patch_summary["total_installed"] > 0 or patch_summary["recent_patches"]:
                    info['patch_summary'] = patch_summary

            except Exception as e:
                self.logger.warning(f"Failed to collect Linux patch summary: {e}")

            return info
        except Exception as e:
            self.logger.error(f"Error getting Linux OS info: {e}")
            return {}

    def get_hardware_info(self):
        """Get Linux-specific hardware information"""
        try:
            info = {}

            # Try dmidecode for system information
            if os.path.exists('/usr/sbin/dmidecode') or os.path.exists('/sbin/dmidecode'):
                dmidecode_cmd = 'dmidecode' if os.path.exists('/usr/sbin/dmidecode') else '/sbin/dmidecode'

                # Get system information
                result = subprocess.run([
                    'sudo', dmidecode_cmd, '-t', 'system'
                ], capture_output=True, text=True, timeout=30)

                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        line = line.strip()
                        if line.startswith('Manufacturer:'):
                            info['manufacturer'] = line.split(':', 1)[1].strip()
                        elif line.startswith('Product Name:'):
                            info['model'] = line.split(':', 1)[1].strip()
                        elif line.startswith('Serial Number:'):
                            info['serial_number'] = line.split(':', 1)[1].strip()

            # Fallback: try /sys/class/dmi/id/
            if not info:
                dmi_paths = {
                    'manufacturer': '/sys/class/dmi/id/sys_vendor',
                    'model': '/sys/class/dmi/id/product_name',
                    'serial_number': '/sys/class/dmi/id/product_serial'
                }

                for key, path in dmi_paths.items():
                    try:
                        with open(path, 'r') as f:
                            info[key] = f.read().strip()
                    except Exception:
                        pass

            # Get CPU model
            try:
                with open('/proc/cpuinfo', 'r') as f:
                    for line in f:
                        if line.startswith('model name'):
                            info['cpu_model'] = line.split(':', 1)[1].strip()
                            break
            except Exception:
                pass

            return info
        except Exception as e:
            self.logger.error(f"Error getting Linux hardware info: {e}")
            return {}

    def get_usb_devices(self):
        """Get USB storage devices on Linux"""
        try:
            usb_devices = []

            # Method 1: Check for USB storage devices using lsblk
            try:
                result = subprocess.run(['lsblk', '-o', 'NAME,TYPE,TRAN,SIZE,MOUNTPOINT', '-J'], 
                                      capture_output=True, text=True, timeout=10)
                if result.returncode == 0:
                    import json
                    data = json.loads(result.stdout)
                    for device in data.get('blockdevices', []):
                        # Check if device is connected via USB
                        if device.get('tran') == 'usb':
                            name = device.get('name', '')
                            size = device.get('size', '')
                            mountpoint = device.get('mountpoint', 'Not mounted')
                            usb_devices.append({
                                'description': f"USB Storage {name} - {size}",
                                'device_id': f"/dev/{name}",
                                'device_type': 'USB Storage',
                                'mountpoint': mountpoint
                            })
            except Exception as e:
                self.logger.debug(f"lsblk failed: {e}")

            # Method 2: Check /sys/bus/usb/devices for storage devices
            try:
                usb_path = '/sys/bus/usb/devices'
                if os.path.exists(usb_path):
                    for device_dir in os.listdir(usb_path):
                        device_path = os.path.join(usb_path, device_dir)
                        if os.path.isdir(device_path) and ':' in device_dir:
                            # Check if this is a storage device
                            bdevice_class_file = os.path.join(device_path, 'bDeviceClass')
                            product_file = os.path.join(device_path, 'product')

                            if os.path.exists(bdevice_class_file):
                                try:
                                    with open(bdevice_class_file, 'r') as f:
                                        device_class = f.read().strip()

                                    # Class 08 is Mass Storage, 09 is Hub (exclude)
                                    if device_class == '08':
                                        product_name = 'USB Storage Device'
                                        if os.path.exists(product_file):
                                            try:
                                                with open(product_file, 'r') as f:
                                                    product_name = f.read().strip()
                                            except Exception:
                                                pass

                                        # Check if already added by lsblk
                                        if not any(product_name in dev['description'] for dev in usb_devices):
                                            usb_devices.append({
                                                'description': product_name,
                                                'device_id': device_dir,
                                                'device_type': 'USB Mass Storage'
                                            })
                                except Exception:
                                    pass
            except Exception as e:
                self.logger.debug(f"USB sysfs reading failed: {e}")

            # Method 3: Check mounted USB drives
            try:
                result = subprocess.run(['mount'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if '/dev/sd' in line and ('usb' in line.lower() or 'removable' in line.lower()):
                            parts = line.split()
                            if len(parts) >= 3:
                                device = parts[0]
                                mountpoint = parts[2]
                                # Check if already added
                                if not any(device in dev.get('device_id', '') for dev in usb_devices):
                                    usb_devices.append({
                                        'description': f"Mounted USB Drive - {device}",
                                        'device_id': device,
                                        'device_type': 'USB Storage',
                                        'mountpoint': mountpoint
                                    })
            except Exception as e:
                self.logger.debug(f"Mount check failed: {e}")

            return usb_devices
        except Exception as e:
            self.logger.error(f"Error getting Linux USB storage devices: {e}")
            return []

    def get_security_info(self):
        """Get Linux security information"""
        try:
            info = {}

            # Check various Linux firewalls
            if os.path.exists('/usr/sbin/ufw'):
                result = subprocess.run(['ufw', 'status'], capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    info['firewall_status'] = 'enabled' if 'active' in result.stdout.lower() else 'disabled'
            elif os.path.exists('/usr/sbin/iptables'):
                result = subprocess.run(['iptables', '-L'], capture_output=True, text=True, timeout=30)
                if result.returncode == 0:
                    # Simple check for rules
                    info['firewall_status'] = 'enabled' if len(result.stdout.split('\n')) > 10 else 'disabled'
            else:
                info['firewall_status'] = 'unknown'

            # Antivirus status (basic check for common AV)
            av_processes = ['clamav', 'rkhunter', 'chkrootkit']
            info['antivirus_status'] = 'unknown'
            for proc in psutil.process_iter(['name']):
                try:
                    if any(av in proc.info['name'].lower() for av in av_processes):
                        info['antivirus_status'] = 'enabled'
                        break
                except (psutil.NoSuchProcess, psutil.AccessDenied):
                    continue

            return info
        except Exception as e:
            self.logger.error(f"Error collecting Linux security info: {e}")
            return {}

    def get_software_info(self):
        """Get installed software on Linux"""
        try:
            software = []

            # Try different package managers
            if os.path.exists('/usr/bin/dpkg'):
                # Debian/Ubuntu
                result = subprocess.run([
                    'dpkg', '-l'
                ], capture_output=True, text=True, timeout=60)

                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if line.startswith('ii'):
                            parts = line.split()
                            if len(parts) >= 3:
                                software.append({
                                    'name': parts[1],
                                    'version': parts[2],
                                    'vendor': 'debian'
                                })

            elif os.path.exists('/usr/bin/rpm'):
                # RedHat/CentOS/Fedora
                result = subprocess.run([
                    'rpm', '-qa', '--queryformat', '%{NAME}|%{VERSION}|%{VENDOR}\n'
                ], capture_output=True, text=True, timeout=60)

                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if '|' in line:
                            parts = line.split('|')
                            if len(parts) >= 3:
                                software.append({
                                    'name': parts[0],
                                    'version': parts[1],
                                    'vendor': parts[2]
                                })

            # Limit to top 50 packages to avoid overwhelming the API
            return software[:50]
        except Exception as e:
            self.logger.error(f"Error getting Linux software info: {e}")
            return []

    def get_virtualization_info(self):
        """Detect if running in a virtual machine on Linux"""
        try:
            vm_info = {
                'is_virtual': False,
                'hypervisor': 'unknown',
                'detection_methods': []
            }

            # Check /proc/cpuinfo for hypervisor flag
            try:
                with open('/proc/cpuinfo', 'r') as f:
                    content = f.read()
                    if 'hypervisor' in content:
                        vm_info['is_virtual'] = True
                        vm_info['detection_methods'].append('cpuinfo_hypervisor_flag')
            except Exception:
                pass

            # Check DMI information
            try:
                dmi_files = [
                    '/sys/class/dmi/id/sys_vendor',
                    '/sys/class/dmi/id/product_name',
                    '/sys/class/dmi/id/board_vendor'
                ]

                for dmi_file in dmi_files:
                    if os.path.exists(dmi_file):
                        with open(dmi_file, 'r') as f:
                            content = f.read().lower()
                            if 'vmware' in content:
                                vm_info['is_virtual'] = True
                                vm_info['hypervisor'] = 'vmware'
                                vm_info['detection_methods'].append('dmi_vmware')
                            elif 'virtualbox' in content:
                                vm_info['is_virtual'] = True
                                vm_info['hypervisor'] = 'virtualbox'
                                vm_info['detection_methods'].append('dmi_virtualbox')
                            elif 'kvm' in content or 'qemu' in content:
                                vm_info['is_virtual'] = True
                                vm_info['hypervisor'] = 'kvm'
                                vm_info['detection_methods'].append('dmi_kvm')
                            elif 'microsoft' in content:
                                vm_info['is_virtual'] = True
                                vm_info['hypervisor'] = 'hyper-v'
                                vm_info['detection_methods'].append('dmi_hyperv')
            except Exception:
                pass

            return vm_info
        except Exception as e:
            self.logger.error(f"Error detecting Linux virtualization: {e}")
            return {'is_virtual': False, 'hypervisor': 'unknown', 'detection_methods': []}

    def get_smart_data(self):
        """Get SMART disk health data where available"""
        try:
            smart_data = []

            if os.path.exists('/usr/sbin/smartctl'):
                try:
                    # Get list of drives
                    result = subprocess.run([
                        'sudo', '/usr/sbin/smartctl', '--scan'
                    ], capture_output=True, text=True, timeout=30)

                    if result.returncode == 0:
                        for line in result.stdout.split('\n'):
                            if line.strip() and '/dev/' in line:
                                device = line.split()[0]

                                # Get SMART health status
                                health_result = subprocess.run([
                                    'sudo', '/usr/sbin/smartctl', '-H', device
                                ], capture_output=True, text=True, timeout=30)

                                if health_result.returncode == 0:
                                    health_status = 'unknown'
                                    for health_line in health_result.stdout.split('\n'):
                                        if 'SMART overall-health' in health_line:
                                            health_status = health_line.split(':')[1].strip()
                                            break

                                    smart_data.append({
                                        'device': device,
                                        'health_status': health_status
                                    })

                except Exception:
                    pass

            return smart_data
        except Exception:
            return []