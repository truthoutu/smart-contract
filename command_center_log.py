"""
Command Center Logging System
Provides centralized logging with timestamp format for Telegram and Discord automation
"""

from datetime import datetime
import sys


class CommandCenterLogger:
    """Advanced logging system for automation command center"""
    
    def __init__(self):
        self.log_count = 0
    
    def log(self, platform, action, status, detail):
        """
        Log action in specified format:
        [TIMESTAMP] [PLATFORM: TELEGRAM/DISCORD] [ACTION: SEND/JOIN/LOGOUT] [STATUS: SUCCESS/FAILED] [DETAIL]
        
        Args:
            platform (str): TELEGRAM or DISCORD
            action (str): SEND, JOIN, LOGOUT, etc.
            status (str): SUCCESS or FAILED
            detail (str): Error message or target ID
        """
        timestamp = datetime.now().strftime("%Y %m %d %H:%M:%S")
        log_entry = f"[{timestamp}] [{platform}] [{action}] [{status}] [{detail}]"
        print(log_entry)
        self.log_count += 1
        return log_entry
    
    def log_success(self, platform, action, detail):
        """Convenience method for success logs"""
        return self.log(platform, action, "SUCCESS", detail)
    
    def log_failure(self, platform, action, detail):
        """Convenience method for failure logs"""
        return self.log(platform, action, "FAILED", detail)
    
    def log_error_code(self, platform, action, error_code, error_message):
        """Log error with specific error code for diagnostic purposes"""
        detail = f"Error Code: {error_code} - {error_message}"
        return self.log(platform, action, "FAILED", detail)
    
    def get_log_count(self):
        """Return total number of logs made"""
        return self.log_count


# Global logger instance
logger = CommandCenterLogger()
