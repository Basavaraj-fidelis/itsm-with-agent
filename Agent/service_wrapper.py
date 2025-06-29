#!/usr/bin/env python3
"""
Service Wrapper for ITSM Agent
Cross-platform service management
"""

import os
import sys
import platform
import logging
from pathlib import Path


class ServiceWrapper:
    """Base service wrapper class"""

    def __init__(self, service_name, service_display_name):
        self.service_name = service_name
        self.service_display_name = service_display_name
        self.logger = logging.getLogger('ServiceWrapper')

    @staticmethod
    def is_running_as_service():
        """Check if currently running as a service"""
        if platform.system().lower() == 'windows':
            try:
                # On Windows, check if we have a console window
                try:
                    import win32console
                    win32console.GetConsoleWindow()
                    return False  # Has console, likely interactive
                except:
                    return True   # No console, likely service
            except ImportError:
                # Fallback: check stdout
                return not (sys.stdout and sys.stdout.isatty())
        else:
            # On Unix-like systems, check if we have a TTY
            return not (sys.stdout and sys.stdout.isatty())