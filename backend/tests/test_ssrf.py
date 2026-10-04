from utils import validate_monitor_url

def test_validate_valid_url():
    assert validate_monitor_url("http://google.com") == True
    assert validate_monitor_url("https://github.com") == True

def test_validate_blocked_hosts():
    assert validate_monitor_url("http://localhost:8000") == False
    assert validate_monitor_url("http://127.0.0.1/test") == False
    assert validate_monitor_url("http://169.254.169.254/latest/meta-data/") == False
    assert validate_monitor_url("http://[::1]") == False

def test_validate_invalid_scheme():
    assert validate_monitor_url("ftp://example.com") == False
    assert validate_monitor_url("file:///etc/passwd") == False

def test_validate_private_ips():
    # Note: google.com might resolve to multiple IPs, but we only block private ones.
    assert validate_monitor_url("http://10.0.0.5/api") == False
    assert validate_monitor_url("http://192.168.1.100") == False
