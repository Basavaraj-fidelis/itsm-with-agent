
---
id: 5
title: "How to Connect to Company WiFi"
category: "Network"
tags: ["wifi", "wireless", "connection", "authentication"]
author_email: "support@company.com"
status: "published"
views: 523
helpful_votes: 134
created_at: "2024-01-15T10:00:00Z"
updated_at: "2024-01-15T10:00:00Z"
---

# Company WiFi Connection Guide

## Initial WiFi Setup

### 1. Find Available Networks
**Windows 10/11:**
1. Click WiFi icon in system tray (bottom right)
2. Look for company network name (SSID)
3. Click on network name
4. Check "Connect automatically" if desired
5. Click "Connect"

**Common Company Network Names:**
- CompanyWiFi
- [CompanyName]_Secure
- Corporate_Network
- Guest_Network (for visitors)

### 2. Enter Credentials
**Personal Devices:**
- **Username**: Your company email address
- **Password**: Your domain/network password
- **Domain**: Usually company.com or company.local

**Company-Managed Devices:**
- May connect automatically
- Certificate-based authentication
- Contact IT if connection fails

## Authentication Methods

### WPA2-Enterprise (Most Secure)
**Settings Required:**
- **Security Type**: WPA2-Enterprise
- **Encryption**: AES
- **Authentication**: PEAP or EAP-TTLS
- **Username**: domain\username or username@company.com
- **Password**: Your network password

### Certificate-Based Authentication
**For Company Devices:**
1. **Download Certificate**: From IT portal or email
2. **Install Certificate**: Double-click .cer file to install
3. **Connect to Network**: Should authenticate automatically
4. **Verify Connection**: Check for lock icon in WiFi status

## Troubleshooting Connection Issues

### Can't See Company Network
**Signal Strength:**
- Move closer to wireless access point
- Check if 2.4GHz or 5GHz network is stronger
- Some networks broadcast both frequencies

**Network Broadcasting:**
- Company may hide network name (SSID)
- Manually add network: WiFi Settings > Manage known networks > Add network
- Enter exact network name and security details

### Authentication Failures
**Wrong Credentials:**
- Verify username format (with or without domain)
- Check password carefully (case-sensitive)
- Ensure account isn't locked out

**Certificate Issues:**
- Download latest certificate from IT
- Clear saved network and reconnect
- Contact IT for certificate installation

### Connection Drops Frequently
**Power Management:**
1. Device Manager > Network adapters
2. Right-click WiFi adapter > Properties
3. Power Management tab
4. Uncheck "Allow computer to turn off this device"

**Profile Reset:**
1. Forget/remove network from saved networks
2. Restart computer
3. Reconnect with fresh credentials

## Guest Network Access

### For Visitors
**Guest Network Features:**
- Internet access only (no internal resources)
- Time-limited access (usually 24 hours)
- May require sponsor approval
- Bandwidth limitations may apply

**Getting Guest Access:**
1. **Self-Registration**: Use web portal when connected
2. **Sponsor Request**: Have employee request access
3. **Reception Desk**: Get temporary credentials from front desk
4. **Meeting Rooms**: Special guest codes may be available

### Guest Network Limitations
- No access to company printers
- Can't reach internal websites/applications
- File sharing disabled
- VPN may be required for company resources

## Security Best Practices

### Device Security
**Automatic Connection:**
- Only enable for trusted company networks
- Disable for public/guest networks
- Regularly review saved networks

**VPN Usage:**
- Use company VPN when on guest networks
- Required for accessing internal resources
- Connect to VPN before accessing company data

### Password Security
- **Never Share**: Don't give WiFi password to non-employees
- **Change Regularly**: Update when prompted by IT
- **Report Compromises**: Contact IT if password may be compromised

## Mobile Device Setup

### iPhone/iPad
1. Settings > WiFi
2. Select company network
3. Enter username and password
4. Trust certificate when prompted
5. Test connection with company email

### Android
1. Settings > WiFi
2. Select company network
3. Choose security type (usually WPA2-Enterprise)
4. Enter credentials as specified by IT
5. Install certificate if required

## Advanced Configuration

### Manual Network Setup
**When Auto-Connect Fails:**
1. **Network Name**: Get exact SSID from IT
2. **Security Type**: Usually WPA2-Enterprise
3. **EAP Method**: PEAP or EAP-TTLS
4. **Phase 2 Auth**: MSCHAPv2 (most common)
5. **CA Certificate**: Install if provided by IT

### Proxy Settings
**If Required by Company:**
- Get proxy server address and port from IT
- Configure in Windows: Settings > Network > Proxy
- Apply to browsers and applications as needed

**Need Help?** Contact IT with your device type and specific error messages for faster resolution.
