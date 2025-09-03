
"""
Asset Management Module
Collects detailed hardware specifications and asset information
"""

import logging
import platform
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base_module import BaseModule

class AssetManagementModule(BaseModule):
    """Detailed asset management and hardware specifications"""
    
    def __init__(self):
        super().__init__('asset_management')
        self.os_name = platform.system()
        
    def collect(self) -> Dict[str, Any]:
        """Collect detailed asset information"""
        try:
            asset_info = {
                'hardware_details': self._get_hardware_details(),
                'bios_information': self._get_bios_info(),
                'serial_numbers': self._get_serial_numbers(),
                'warranty_info': self._get_warranty_info(),
                'peripheral_devices': self._get_peripheral_devices(),
                'network_adapters': self._get_network_adapters_detail(),
                'installed_certificates': self._get_certificates(),
                'system_configuration': self._get_system_config()
            }
            
            return {
                'status': 'success',
                'asset_info': asset_info,
                'collection_time': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Error collecting asset information: {e}", exc_info=True)
            return {
                'status': 'error',
                'error': str(e)
            }
    
    def _get_hardware_details(self) -> Dict[str, Any]:
        """Get detailed hardware specifications"""
        hardware_details = {}
        
        if self.os_name == 'Windows':
            hardware_details = self._get_windows_hardware()
        elif self.os_name == 'Linux':
            hardware_details = self._get_linux_hardware()
        elif self.os_name == 'Darwin':
            hardware_details = self._get_macos_hardware()
            
        return hardware_details
    
    def _get_windows_hardware(self) -> Dict[str, Any]:
        """Get Windows hardware details using WMI"""
        try:
            import wmi
            c = wmi.WMI()
            
            hardware = {
                'motherboard': self._get_motherboard_info(c),
                'processor_details': self._get_processor_details(c),
                'memory_modules': self._get_memory_modules(c),
                'storage_devices': self._get_storage_devices(c),
                'graphics_cards': self._get_graphics_cards(c),
                'sound_devices': self._get_sound_devices(c),
                'usb_controllers': self._get_usb_controllers(c)
            }
            
            return hardware
            
        except ImportError:
            return {'error': 'WMI library not available'}
        except Exception as e:
            return {'error': str(e)}
    
    def _get_motherboard_info(self, c) -> Dict[str, Any]:
        """Get motherboard information"""
        try:
            motherboards = c.Win32_BaseBoard()
            motherboard_info = []
            
            for mb in motherboards:
                motherboard_info.append({
                    'manufacturer': mb.Manufacturer,
                    'product': mb.Product,
                    'version': mb.Version,
                    'serial_number': mb.SerialNumber,
                    'model': mb.Model,
                    'part_number': mb.PartNumber
                })
                
            return motherboard_info[0] if motherboard_info else {}
            
        except Exception as e:
            return {'error': str(e)}
    
    def _get_processor_details(self, c) -> List[Dict[str, Any]]:
        """Get detailed processor information"""
        try:
            processors = c.Win32_Processor()
            processor_info = []
            
            for cpu in processors:
                processor_info.append({
                    'name': cpu.Name,
                    'manufacturer': cpu.Manufacturer,
                    'description': cpu.Description,
                    'family': cpu.Family,
                    'model': cpu.Model,
                    'stepping': cpu.Stepping,
                    'architecture': cpu.Architecture,
                    'cores': cpu.NumberOfCores,
                    'logical_processors': cpu.NumberOfLogicalProcessors,
                    'max_clock_speed': cpu.MaxClockSpeed,
                    'current_clock_speed': cpu.CurrentClockSpeed,
                    'l2_cache_size': cpu.L2CacheSize,
                    'l3_cache_size': cpu.L3CacheSize,
                    'processor_id': cpu.ProcessorId,
                    'socket_designation': cpu.SocketDesignation
                })
                
            return processor_info
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_memory_modules(self, c) -> List[Dict[str, Any]]:
        """Get detailed memory module information"""
        try:
            memory_modules = c.Win32_PhysicalMemory()
            memory_info = []
            
            for module in memory_modules:
                memory_info.append({
                    'capacity': module.Capacity,
                    'speed': module.Speed,
                    'manufacturer': module.Manufacturer,
                    'part_number': module.PartNumber,
                    'serial_number': module.SerialNumber,
                    'memory_type': module.MemoryType,
                    'form_factor': module.FormFactor,
                    'bank_label': module.BankLabel,
                    'device_locator': module.DeviceLocator,
                    'data_width': module.DataWidth,
                    'total_width': module.TotalWidth
                })
                
            return memory_info
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_storage_devices(self, c) -> List[Dict[str, Any]]:
        """Get detailed storage device information"""
        try:
            drives = c.Win32_DiskDrive()
            storage_info = []
            
            for drive in drives:
                storage_info.append({
                    'model': drive.Model,
                    'manufacturer': drive.Manufacturer,
                    'serial_number': drive.SerialNumber,
                    'size': drive.Size,
                    'interface_type': drive.InterfaceType,
                    'media_type': drive.MediaType,
                    'partitions': drive.Partitions,
                    'firmware_revision': drive.FirmwareRevision,
                    'capabilities': drive.Capabilities
                })
                
            return storage_info
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_graphics_cards(self, c) -> List[Dict[str, Any]]:
        """Get graphics card information"""
        try:
            video_controllers = c.Win32_VideoController()
            graphics_info = []
            
            for gpu in video_controllers:
                graphics_info.append({
                    'name': gpu.Name,
                    'description': gpu.Description,
                    'adapter_ram': gpu.AdapterRAM,
                    'driver_version': gpu.DriverVersion,
                    'driver_date': str(gpu.DriverDate) if gpu.DriverDate else None,
                    'video_processor': gpu.VideoProcessor,
                    'video_mode_description': gpu.VideoModeDescription,
                    'current_horizontal_resolution': gpu.CurrentHorizontalResolution,
                    'current_vertical_resolution': gpu.CurrentVerticalResolution,
                    'pnp_device_id': gpu.PNPDeviceID
                })
                
            return graphics_info
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_sound_devices(self, c) -> List[Dict[str, Any]]:
        """Get sound device information"""
        try:
            sound_devices = c.Win32_SoundDevice()
            sound_info = []
            
            for device in sound_devices:
                sound_info.append({
                    'name': device.Name,
                    'manufacturer': device.Manufacturer,
                    'pnp_device_id': device.PNPDeviceID,
                    'status': device.Status
                })
                
            return sound_info
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_usb_controllers(self, c) -> List[Dict[str, Any]]:
        """Get USB controller information"""
        try:
            usb_controllers = c.Win32_USBController()
            usb_info = []
            
            for controller in usb_controllers:
                usb_info.append({
                    'name': controller.Name,
                    'manufacturer': controller.Manufacturer,
                    'description': controller.Description,
                    'pnp_device_id': controller.PNPDeviceID,
                    'status': controller.Status
                })
                
            return usb_info
            
        except Exception as e:
            return [{'error': str(e)}]
    
    def _get_bios_info(self) -> Dict[str, Any]:
        """Get BIOS/UEFI information"""
        try:
            if self.os_name == 'Windows':
                import wmi
                c = wmi.WMI()
                bios = c.Win32_BIOS()
                
                bios_info = {}
                for b in bios:
                    bios_info = {
                        'manufacturer': b.Manufacturer,
                        'name': b.Name,
                        'version': b.Version,
                        'release_date': str(b.ReleaseDate) if b.ReleaseDate else None,
                        'serial_number': b.SerialNumber,
                        'smbios_version': b.SMBIOSBIOSVersion,
                        'characteristics': b.BiosCharacteristics
                    }
                    break
                    
                return bios_info
                
        except Exception as e:
            return {'error': str(e)}
        
        return {}
    
    def _get_serial_numbers(self) -> Dict[str, str]:
        """Get various hardware serial numbers"""
        serial_numbers = {}
        
        try:
            if self.os_name == 'Windows':
                import wmi
                c = wmi.WMI()
                
                # System serial number
                systems = c.Win32_ComputerSystemProduct()
                for system in systems:
                    serial_numbers['system'] = system.IdentifyingNumber
                    break
                
                # BIOS serial number
                bios = c.Win32_BIOS()
                for b in bios:
                    serial_numbers['bios'] = b.SerialNumber
                    break
                    
        except Exception as e:
            serial_numbers['error'] = str(e)
            
        return serial_numbers
    
    def _get_warranty_info(self) -> Dict[str, Any]:
        """Get warranty information (placeholder for vendor API integration)"""
        # This would integrate with vendor APIs to get warranty information
        return {
            'status': 'not_implemented',
            'message': 'Warranty information requires vendor API integration'
        }
    
    def _get_peripheral_devices(self) -> List[Dict[str, Any]]:
        """Get peripheral device information"""
        peripherals = []
        
        try:
            if self.os_name == 'Windows':
                import wmi
                c = wmi.WMI()
                
                # Monitors
                monitors = c.Win32_DesktopMonitor()
                for monitor in monitors:
                    peripherals.append({
                        'type': 'monitor',
                        'name': monitor.Name,
                        'manufacturer': monitor.ManufacturerName,
                        'model': monitor.MonitorType,
                        'screen_width': monitor.ScreenWidth,
                        'screen_height': monitor.ScreenHeight,
                        'pnp_device_id': monitor.PNPDeviceID
                    })
                
                # Printers
                printers = c.Win32_Printer()
                for printer in printers:
                    peripherals.append({
                        'type': 'printer',
                        'name': printer.Name,
                        'driver_name': printer.DriverName,
                        'port_name': printer.PortName,
                        'status': printer.Status,
                        'shared': printer.Shared
                    })
                    
        except Exception as e:
            peripherals.append({'error': str(e)})
            
        return peripherals
    
    def _get_network_adapters_detail(self) -> List[Dict[str, Any]]:
        """Get detailed network adapter information"""
        adapters = []
        
        try:
            if self.os_name == 'Windows':
                import wmi
                c = wmi.WMI()
                
                network_adapters = c.Win32_NetworkAdapter()
                for adapter in network_adapters:
                    if adapter.PhysicalAdapter and adapter.MACAddress:
                        adapters.append({
                            'name': adapter.Name,
                            'description': adapter.Description,
                            'mac_address': adapter.MACAddress,
                            'manufacturer': adapter.Manufacturer,
                            'pnp_device_id': adapter.PNPDeviceID,
                            'adapter_type': adapter.AdapterType,
                            'speed': adapter.Speed,
                            'net_enabled': adapter.NetEnabled,
                            'status': adapter.Status
                        })
                        
        except Exception as e:
            adapters.append({'error': str(e)})
            
        return adapters
    
    def _get_certificates(self) -> List[Dict[str, Any]]:
        """Get installed certificates information"""
        # Placeholder for certificate collection
        return []
    
    def _get_system_config(self) -> Dict[str, Any]:
        """Get system configuration details"""
        config = {}
        
        try:
            if self.os_name == 'Windows':
                import wmi
                c = wmi.WMI()
                
                # Computer system info
                systems = c.Win32_ComputerSystem()
                for system in systems:
                    config['computer_system'] = {
                        'domain': system.Domain,
                        'workgroup': system.Workgroup,
                        'total_physical_memory': system.TotalPhysicalMemory,
                        'number_of_processors': system.NumberOfProcessors,
                        'system_type': system.SystemType,
                        'manufacturer': system.Manufacturer,
                        'model': system.Model
                    }
                    break
                    
        except Exception as e:
            config['error'] = str(e)
            
        return config
    
    def _get_linux_hardware(self) -> Dict[str, Any]:
        """Get Linux hardware details"""
        # Implementation for Linux hardware detection
        return {'status': 'not_implemented'}
    
    def _get_macos_hardware(self) -> Dict[str, Any]:
        """Get macOS hardware details"""
        # Implementation for macOS hardware detection
        return {'status': 'not_implemented'}
