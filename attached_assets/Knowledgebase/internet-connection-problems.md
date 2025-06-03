
---
id: 3
title: "Internet Not Working - Step by Step Fix"
category: "Network"
tags: ["internet", "wifi", "connectivity", "network"]
author_email: "support@company.com"
status: "published"
views: 445
helpful_votes: 123
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:00:00Z"
---

# Internet Connection Problems

## Quick Network Fixes

### 1. Basic Connection Check
- **WiFi Icon**: Look for WiFi symbol in system tray (bottom right)
- **Ethernet Cable**: If wired, check cable connections
- **Router Lights**: Ensure router shows green/blue lights (not red)
- **Other Devices**: Test if phones/tablets can connect

### 2. Restart Network Components
**Order is important - follow this sequence:**
1. **Unplug Router**: Wait 30 seconds
2. **Unplug Modem**: Wait 30 seconds  
3. **Restart Computer**: Complete shutdown and restart
4. **Plug Modem Back In**: Wait 2 minutes for full startup
5. **Plug Router Back In**: Wait 2 minutes for full startup
6. **Test Connection**: Try browsing to a website

## Windows Network Troubleshooting

### Network Troubleshooter
1. Right-click WiFi icon in system tray
2. Select "Troubleshoot problems"
3. Follow automated diagnostic steps
4. Apply any suggested fixes

### Reset Network Settings
Open Command Prompt as Administrator and run:
```
ipconfig /flushdns
ipconfig /release
ipconfig /renew
netsh winsock reset
netsh int ip reset
```
**Restart computer after running these commands**

## WiFi Specific Issues

### Can't See Network
- **Refresh Networks**: Click WiFi icon and refresh list
- **Network Name**: Verify correct network name (SSID)
- **Distance**: Move closer to router/access point
- **5GHz vs 2.4GHz**: Try connecting to different frequency band

### Wrong Password Error
- **Case Sensitive**: Check uppercase/lowercase letters
- **Number vs Letter**: Verify 0 (zero) vs O (letter O)
- **Special Characters**: Double-check symbols and punctuation
- **Contact Admin**: Get fresh WiFi password from IT

## When It's Not Your Problem

### Service Provider Issues
- **Check Provider Status**: Visit ISP website for outage reports
- **Call Provider**: Report if widespread outage suspected
- **Backup Connection**: Use mobile hotspot temporarily

### Company Network Issues
- **Ask Colleagues**: Check if others have same problem
- **IT Helpdesk**: Contact if multiple users affected
- **VPN Issues**: Try disconnecting/reconnecting VPN

**Quick Test**: Try visiting google.com - if it loads, DNS might be the issue
