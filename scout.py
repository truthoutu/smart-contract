from telethon import TelegramClient, functions, types, errors

import asyncio
from command_center_log import logger

# CONFIGURATION
# Replace these with your actual credentials from my.telegram.org
API_ID = '30616073'

API_HASH = 'f51af10bf2ef8fd640fd3d110a294f2a'

# Our target groups discovered during reconnaissance
TARGET_GROUPS = [
    'Aavechatsupport',  # Aave Chat
    'skyEcosystemofficialHQ',  # Sky Ecosystem
    'LidoFinanceOfficialTG_en'  # Lido Finance
]


async def main():
    logger.log_success("TELEGRAM", "LOGOUT", "Initializing Scout Intelligence Unit")
    client = TelegramClient('scout_session', API_ID, API_HASH)
    try:
        await client.start()
        logger.log_success("TELEGRAM", "JOIN", "Connection Established. Account Authenticated.")
    except Exception as e:
        logger.log_error_code("TELEGRAM", "JOIN", getattr(e, 'code', 'UNKNOWN'), str(e))
        return
    for group_username in TARGET_GROUPS:
        try:
            logger.log_success("TELEGRAM", "JOIN", f"Attempting to access target: @{group_username}")
            entity = await client.get_entity(group_username)
            # Join the group automatically
            await client(functions.channels.JoinChannelRequest(channel=entity))
            logger.log_success("TELEGRAM", "JOIN", f"Successfully joined @{group_username}")
            # Get participant count
            full_chat = await client(functions.channels.GetFullChannelRequest(channel=entity))
            member_count = full_chat.full_chat.participants_count
            logger.log_success("TELEGRAM", "LOGOUT", f"Target Intelligence: @{group_username} has approximately {member_count} potential targets.")
        except errors.FloodWaitError as e:
            logger.log_error_code("TELEGRAM", "JOIN", "429", f"FloodWaitError: Must wait {e.seconds} seconds")
            await asyncio.sleep(e.seconds)
        except errors.ChatInvalidError as e:
            logger.log_error_code("TELEGRAM", "JOIN", "400", f"ChatInvalidError: {str(e)}")
        except errors.UserBannedInChannelError as e:
            logger.log_error_code("TELEGRAM", "JOIN", "403", f"UserBannedInChannelError: Account banned from channel")
        except Exception as e:
            error_code = getattr(e, 'code', 'UNKNOWN')
            logger.log_error_code("TELEGRAM", "JOIN", error_code, str(e))
    logger.log_success("TELEGRAM", "LOGOUT", "Scout Mission Complete. Report findings to Command immediately.")
    await client.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
