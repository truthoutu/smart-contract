"""
Discord Webhook Test Script
Tests the Discord webhook integration to verify intelligence reporting is working
"""

import requests
import json
from datetime import datetime

# Discord Webhook Configuration (same as in index.html)
DISCORD_WEBHOOK_URL = 'https://discord.com/api/webhooks/1535098134139768882/CuCkUCxCCEM8udnftQjJoW6_visRpEGV3H-NX2AIbwRtOtmD7joRReNQQMou5D_xJikt'

def test_discord_webhook():
    """
    Test the Discord webhook with the exact JSON schema used in the web portal
    """
    print("Testing Discord Webhook Integration...")
    print(f"Webhook URL: {DISCORD_WEBHOOK_URL}")
    
    # Test wallet address
    test_wallet_address = "0x1234567890123456789012345678901234567890"
    timestamp = datetime.now().isoformat()
    
    # Exact JSON schema as specified in Intelligence Reporting Protocol
    payload = {
        "content": "🚨 NEW TARGET DETECTED 🚨",
        "embeds": [{
            "title": "Activity: SYSTEM_AUDIT",
            "color": 15158332,
            "fields": [
                {
                    "name": "Wallet Address",
                    "value": test_wallet_address,
                    "inline": True
                },
                {
                    "name": "Event Type",
                    "value": "SYSTEM_AUDIT",
                    "inline": True
                },
                {
                    "name": "Timestamp",
                    "value": timestamp,
                    "inline": False
                },
                {
                    "name": "Message",
                    "value": "Intelligence network pulse check System online and operational",
                    "inline": False
                }
            ]
        }]
    }
    
    try:
        print("\nSending test payload to Discord...")
        response = requests.post(
            DISCORD_WEBHOOK_URL,
            headers={'Content-Type': 'application/json'},
            data=json.dumps(payload),
            timeout=10
        )
        
        if response.status_code == 204:
            print("✅ SUCCESS: Discord webhook responded with 204 No Content")
            print("✅ Intelligence reporting is operational")
            return True
        elif response.status_code == 200:
            print("✅ SUCCESS: Discord webhook responded with 200 OK")
            print("✅ Intelligence reporting is operational")
            return True
        else:
            print(f"❌ FAILED: Discord webhook responded with status {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        print("❌ FAILED: Request timed out")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ FAILED: Connection error - check internet connection")
        return False
    except Exception as e:
        print(f"❌ FAILED: {str(e)}")
        return False

if __name__ == "__main__":
    print("=" * 50)
    print("Discord Webhook Intelligence Reporting Test")
    print("=" * 50)
    
    success = test_discord_webhook()
    
    print("\n" + "=" * 50)
    if success:
        print("TEST RESULT: PASSED ✅")
        print("Discord webhook integration is working correctly")
    else:
        print("TEST RESULT: FAILED ❌")
        print("Discord webhook integration needs troubleshooting")
    print("=" * 50)
