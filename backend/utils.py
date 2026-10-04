import ipaddress
import socket
from urllib.parse import urlparse

def validate_monitor_url(url: str) -> bool:
    """Block localhost, private IPs, cloud metadata"""
    try:
        parsed = urlparse(url)
        if parsed.scheme not in ["http", "https"]:
            return False
            
        hostname = parsed.hostname
        if not hostname:
            return False
            
        blocked_hosts = {"localhost", "127.0.0.1", "169.254.169.254", "::1"}
        if hostname in blocked_hosts:
            return False
            
        # Resolve hostname
        ip_addr = socket.gethostbyname(hostname)
        ip = ipaddress.ip_address(ip_addr)
        
        if ip.is_loopback or ip.is_private or ip.is_link_local:
            return False
            
        return True
    except Exception:
        return False
