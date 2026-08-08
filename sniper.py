from telethon import TelegramClient, errors

import asyncio

import random
from command_center_log import logger

# CONFIGURATION
API_ID = '30616073'

API_HASH = 'f51af10bf2ef8fd640fd3d110a294f2a'

TARGET_LINK = 'https://google.com' # < YOUR LINK HERE

# The groups we want to harvest from
TARGET_GROUPS = [
    'Aavechatsupport', 
    'skyEcosystemofficialHQ', 
    'LidoFinanceOfficialTG_en'
]

# HOW MANY DMs TO SEND PER RUN
MAX_MESSAGES = 5

# DELAY BETWEEN MESSAGES (in seconds) Keep this HIGH to avoid bans
MIN_DELAY = 120 # 2 minutes

MAX_DELAY = 300 # 5 minutes

# Spintax Message Variations for better engagement testing
MESSAGE_VARIANTS = [
    "Hey, noticed you're active in @{group}! Have you seen the new USDC security migration protocol? Check it here: {link}",
    "Hi! I saw your posts in @{group}. Are you aware of the new USDC vault migration? More info here: {link}",
    "Hello, just sharing this with the @{group} community there's a new security protocol for USDC assets here: {link}"
]

async def send_optimized_outreach(client, user, group_name, target_link):
    try:
        # Randomize message to prevent pattern detection
        template = random.choice(MESSAGE_VARIANTS)
        message = template.format(group=group_name, link=target_link)
        logger.log_success("TELEGRAM", "SEND", f"Attempting outreach to @{user.first_name}...")
        await client.send_message(user, message)
        logger.log_success("TELEGRAM", "SEND", f"Delivery confirmed to @{user.first_name}")
        return True
    except errors.FloodWaitError as e:
        logger.log_error_code("TELEGRAM", "SEND", "429", f"FloodWaitError: Server requested delay: {e.seconds} seconds")
        await asyncio.sleep(e.seconds)
        return False
    except errors.UserPrivacyRestrictedError as e:
        logger.log_error_code("TELEGRAM", "SEND", "403", f"UserPrivacyRestrictedError: User privacy settings restrict messages")
        return False
    except errors.PeerIdInvalidError as e:
        logger.log_error_code("TELEGRAM", "SEND", "400", f"PeerIdInvalidError: Invalid peer ID for @{user.first_name}")
        return False
    except Exception as e:
        error_code = getattr(e, 'code', 'UNKNOWN')
        logger.log_error_code("TELEGRAM", "SEND", error_code, f"Connection issue with @{user.first_name}: {str(e)}")
        return False

async def main():
    logger.log_success("TELEGRAM", "LOGOUT", "Initializing Sniper Unit. Target Acquired.")
    client = TelegramClient('sniper_session', API_ID, API_HASH)
    try:
        await client.start()
        logger.log_success("TELEGRAM", "JOIN", "Connection Established. Account Authenticated.")
    except Exception as e:
        logger.log_error_code("TELEGRAM", "JOIN", getattr(e, 'code', 'UNKNOWN'), str(e))
        return
    messages_sent = 0
    current_delay_multiplier = 1
    
    for group_username in TARGET_GROUPS:
        if messages_sent >= MAX_MESSAGES:
            break
        logger.log_success("TELEGRAM", "JOIN", f"Entering target zone: @{group_username}...")
        try:
            group = await client.get_entity(group_username)
            # Get all participants
            participants = await client.get_participants(group)
            logger.log_success("TELEGRAM", "LOGOUT", f"Found {len(participants)} participants in @{group_username}. Starting hunt...")
            for user in participants:
                if messages_sent >= MAX_MESSAGES:
                    break
                # Skip bots and myself
                if user.bot or user.is_self:
                    continue
                
                success = await send_optimized_outreach(client, user, group_username, TARGET_LINK)
                
                if success:
                    messages_sent += 1
                    logger.log_success("TELEGRAM", "SEND", f"Message sent. Total sent: {messages_sent}")
                    # Reset delay multiplier on success to recover from rate limiting
                    current_delay_multiplier = 1
                    # HUMAN EMULATION DELAY with dynamic adjustment
                    base_wait = random.randint(MIN_DELAY, MAX_DELAY)
                    wait_time = base_wait * current_delay_multiplier
                    logger.log_success("TELEGRAM", "LOGOUT", f"Sleeping for {wait_time} seconds to avoid detection...")
                    await asyncio.sleep(wait_time)
                else:
                    # Increase delay multiplier on failure (exponential backoff)
                    current_delay_multiplier *= 2
                    logger.log_error_code("TELEGRAM", "SEND", "RATE_LIMIT", f"Increasing delay multiplier to {current_delay_multiplier}x due to rate limiting.")
                    # Still wait a bit before retrying
                    retry_wait = random.randint(MIN_DELAY, MAX_DELAY) * current_delay_multiplier
                    logger.log_success("TELEGRAM", "LOGOUT", f"Extended sleep for {retry_wait} seconds before retry...")
                    await asyncio.sleep(retry_wait)
                    
        except errors.FloodWaitError as e:
            logger.log_error_code("TELEGRAM", "JOIN", "429", f"Telegram Flood Error! Must wait {e.seconds} seconds.")
            await asyncio.sleep(e.seconds)
            # Increase delay multiplier after flood wait
            current_delay_multiplier *= 2
        except errors.ChannelPrivateError as e:
            logger.log_error_code("TELEGRAM", "JOIN", "403", f"ChannelPrivateError: Cannot access private channel @{group_username}")
            continue
        except errors.ChatInvalidError as e:
            logger.log_error_code("TELEGRAM", "JOIN", "400", f"ChatInvalidError: Invalid chat @{group_username}")
            continue
        except Exception as e:
            error_code = getattr(e, 'code', 'UNKNOWN')
            logger.log_error_code("TELEGRAM", "JOIN", error_code, f"Could not access @{group_username}: {str(e)}")
            continue
    
    logger.log_success("TELEGRAM", "LOGOUT", f"Sniper Mission Complete. {messages_sent} messages delivered.")
    await client.disconnect()

if __name__ == "__main__":
    asyncio.run(main())