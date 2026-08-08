"""
System Integration Test Module
Provides test functions for Telegram and Discord automation with comprehensive logging
"""

from telethon import TelegramClient, errors
import asyncio
from command_center_log import logger

# CONFIGURATION
API_ID = '30616073'
API_HASH = 'f51af10bf2ef8fd640fd3d110a294f2a'

# Test Configuration - Modify these for your test environment
TELEGRAM_TEST_GROUP = 'Aavechatsupport'  # Replace with your test group
TELEGRAM_LURE_MESSAGE = "Test message from System Integration Test - Command Center Log Verification"

# Discord Configuration - Required for Discord testing
# To get these values:
# 1. Create a Discord bot at https://discord.com/developers/applications
# 2. Enable bot privileges and get your token
# 3. Invite bot to your test server with proper permissions
# 4. Enable Developer Mode in Discord (User Settings > Advanced)
# 5. Right-click your server to get Server ID
# 6. Right-click your test channel to get Channel ID
DISCORD_TOKEN = None  # Replace with your Discord bot token (e.g., 'your-discord-bot-token-here')
DISCORD_TEST_SERVER_ID = None  # Replace with your test server ID (e.g., 123456789012345678)
DISCORD_TEST_CHANNEL_ID = None  # Replace with your test channel ID (e.g., 123456789012345678)
DISCORD_TEST_MESSAGE = "Test message from System Integration Test - Command Center Log Verification"


async def test_telegram_loop():
    """
    Telegram Test Module: Sends a predefined 'Lure' message to a test group
    and confirms the message was successfully pushed to the API.
    
    Logs every action with timestamp and status indicators.
    """
    logger.log_success("TELEGRAM", "LOGOUT", "Starting Telegram Test Loop")
    
    client = TelegramClient('test_session', API_ID, API_HASH)
    
    try:
        # Connect to Telegram
        logger.log_success("TELEGRAM", "JOIN", "Attempting to connect to Telegram API")
        await client.start()
        logger.log_success("TELEGRAM", "JOIN", "Connection Established. Account Authenticated.")
        
        # Get test group entity
        logger.log_success("TELEGRAM", "JOIN", f"Attempting to access test group: @{TELEGRAM_TEST_GROUP}")
        try:
            group_entity = await client.get_entity(TELEGRAM_TEST_GROUP)
            logger.log_success("TELEGRAM", "JOIN", f"Successfully accessed test group: @{TELEGRAM_TEST_GROUP}")
        except Exception as e:
            error_code = getattr(e, 'code', 'UNKNOWN')
            logger.log_error_code("TELEGRAM", "JOIN", error_code, f"Failed to access test group: {str(e)}")
            return False
        
        # Send lure message
        logger.log_success("TELEGRAM", "SEND", f"Preparing to send lure message to @{TELEGRAM_TEST_GROUP}")
        try:
            message_result = await client.send_message(group_entity, TELEGRAM_LURE_MESSAGE)
            logger.log_success("TELEGRAM", "SEND", f"Message successfully pushed to API. Message ID: {message_result.id}")
            
            # Confirm message was sent
            logger.log_success("TELEGRAM", "SEND", f"API Confirmation: Message delivered to group: {TELEGRAM_TEST_GROUP}")
            
            # Wait briefly to ensure API processing
            await asyncio.sleep(2)
            
            logger.log_success("TELEGRAM", "SEND", "Telegram Test Loop Completed Successfully")
            return True
            
        except errors.FloodWaitError as e:
            logger.log_error_code("TELEGRAM", "SEND", "429", f"FloodWaitError: Must wait {e.seconds} seconds")
            return False
        except errors.ChatWriteForbiddenError as e:
            logger.log_error_code("TELEGRAM", "SEND", "403", f"ChatWriteForbiddenError: No permission to write to group")
            return False
        except Exception as e:
            error_code = getattr(e, 'code', 'UNKNOWN')
            logger.log_error_code("TELEGRAM", "SEND", error_code, f"Failed to send message: {str(e)}")
            return False
            
    except Exception as e:
        error_code = getattr(e, 'code', 'UNKNOWN')
        logger.log_error_code("TELEGRAM", "JOIN", error_code, f"Connection failed: {str(e)}")
        return False
    finally:
        logger.log_success("TELEGRAM", "LOGOUT", "Disconnecting from Telegram")
        await client.disconnect()


async def test_discord_loop():
    """
    Discord Test Module: Attempts to join a test server and send a single message.
    Logs the exact moment the message leaves the client.
    
    Note: This requires discord.py library and proper Discord bot token setup.
    """
    logger.log_success("DISCORD", "LOGOUT", "Starting Discord Test Loop")
    
    try:
        # Import discord.py (will fail if not installed)
        import discord
        from discord.ext import commands
        
        # Check if Discord token is configured
        DISCORD_TOKEN = None  # Replace with your Discord bot token
        
        if not DISCORD_TOKEN:
            logger.log_error_code("DISCORD", "JOIN", "401", "Discord bot token not configured")
            return False
        
        if not DISCORD_TEST_SERVER_ID or not DISCORD_TEST_CHANNEL_ID:
            logger.log_error_code("DISCORD", "JOIN", "400", "Discord test server/channel IDs not configured")
            return False
        
        # Create Discord client
        logger.log_success("DISCORD", "JOIN", "Attempting to connect to Discord API")
        intents = discord.Intents.default()
        intents.message_content = True
        client = discord.Client(intents=intents)
        
        @client.event
        async def on_ready():
            logger.log_success("DISCORD", "JOIN", f"Connection Established. Logged in as {client.user}")
            
            try:
                # Get test server
                logger.log_success("DISCORD", "JOIN", f"Attempting to access test server: {DISCORD_TEST_SERVER_ID}")
                guild = client.get_guild(int(DISCORD_TEST_SERVER_ID))
                
                if not guild:
                    logger.log_error_code("DISCORD", "JOIN", "404", f"Test server not found: {DISCORD_TEST_SERVER_ID}")
                    await client.close()
                    return
                
                logger.log_success("DISCORD", "JOIN", f"Successfully accessed test server: {guild.name}")
                
                # Get test channel
                logger.log_success("DISCORD", "JOIN", f"Attempting to access test channel: {DISCORD_TEST_CHANNEL_ID}")
                channel = client.get_channel(int(DISCORD_TEST_CHANNEL_ID))
                
                if not channel:
                    logger.log_error_code("DISCORD", "SEND", "404", f"Test channel not found: {DISCORD_TEST_CHANNEL_ID}")
                    await client.close()
                    return
                
                logger.log_success("DISCORD", "JOIN", f"Successfully accessed test channel: {channel.name}")
                
                # Send test message
                logger.log_success("DISCORD", "SEND", f"Preparing to send test message to {channel.name}")
                message = await channel.send(DISCORD_TEST_MESSAGE)
                
                # Log exact moment message leaves client
                logger.log_success("DISCORD", "SEND", f"Message successfully sent. Message ID: {message.id}")
                logger.log_success("DISCORD", "SEND", f"API Confirmation: Message delivered to channel: {channel.name}")
                
                logger.log_success("DISCORD", "SEND", "Discord Test Loop Completed Successfully")
                
            except discord.Forbidden as e:
                logger.log_error_code("DISCORD", "SEND", "403", f"Forbidden: {str(e)}")
            except discord.HTTPException as e:
                error_code = getattr(e, 'code', 'UNKNOWN')
                logger.log_error_code("DISCORD", "SEND", error_code, f"HTTPException: {str(e)}")
            except Exception as e:
                error_code = getattr(e, 'code', 'UNKNOWN')
                logger.log_error_code("DISCORD", "SEND", error_code, f"Error sending message: {str(e)}")
            finally:
                await client.close()
        
        # Start Discord client
        await client.start(DISCORD_TOKEN)
        return True
        
    except ImportError:
        logger.log_error_code("DISCORD", "JOIN", "500", "discord.py library not installed. Install with: pip install discord.py")
        return False
    except Exception as e:
        error_code = getattr(e, 'code', 'UNKNOWN')
        logger.log_error_code("DISCORD", "JOIN", error_code, f"Discord connection failed: {str(e)}")
        return False


async def run_full_diagnostic():
    """
    Run full system integration test for both Telegram and Discord.
    """
    logger.log_success("SYSTEM", "LOGOUT", "="*50)
    logger.log_success("SYSTEM", "LOGOUT", "STARTING FULL SYSTEM INTEGRATION TEST")
    logger.log_success("SYSTEM", "LOGOUT", "="*50)
    
    # Test Telegram
    logger.log_success("SYSTEM", "LOGOUT", "Phase 1: Testing Telegram Engine")
    telegram_result = await test_telegram_loop()
    
    if telegram_result:
        logger.log_success("SYSTEM", "LOGOUT", "Telegram Test: PASSED")
    else:
        logger.log_error_code("SYSTEM", "LOGOUT", "FAILED", "Telegram Test: FAILED")
    
    # Test Discord
    logger.log_success("SYSTEM", "LOGOUT", "Phase 2: Testing Discord Engine")
    discord_result = await test_discord_loop()
    
    if discord_result:
        logger.log_success("SYSTEM", "LOGOUT", "Discord Test: PASSED")
    else:
        logger.log_error_code("SYSTEM", "LOGOUT", "FAILED", "Discord Test: FAILED")
    
    # Summary
    logger.log_success("SYSTEM", "LOGOUT", "="*50)
    logger.log_success("SYSTEM", "LOGOUT", "SYSTEM INTEGRATION TEST COMPLETE")
    logger.log_success("SYSTEM", "LOGOUT", f"Total Log Entries: {logger.get_log_count()}")
    logger.log_success("SYSTEM", "LOGOUT", f"Telegram Status: {'PASSED' if telegram_result else 'FAILED'}")
    logger.log_success("SYSTEM", "LOGOUT", f"Discord Status: {'PASSED' if discord_result else 'FAILED'}")
    logger.log_success("SYSTEM", "LOGOUT", "="*50)


if __name__ == "__main__":
    print("System Integration Test Module")
    print("This will test both Telegram and Discord engines with comprehensive logging.")
    print("Make sure to configure your test group/server IDs in the script.\n")
    
    # Run the diagnostic
    asyncio.run(run_full_diagnostic())
