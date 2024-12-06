# src/run_price_checker.py

"""
Script to run the price checker service for all active bookings.
Can be run manually or scheduled via cron.
"""

import os
import asyncio
import logging
from datetime import datetime
from dotenv import load_dotenv
from services.price_checker import PriceCheckerConfig, PriceChecker

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'logs/price_checker_{datetime.now().strftime("%Y%m%d")}.log'),
        logging.StreamHandler()
    ]
)

async def main():
    try:
        # Load environment variables
        load_dotenv()
        
        # Initialize service
        config = PriceCheckerConfig()
        checker = PriceChecker(config)
        
        # Get active bookings
        bookings = checker.supabase.client.table('bookings').select('id').execute()
        
        if not bookings.data:
            logging.info("No active bookings found")
            return
        
        # Check prices for each booking
        for booking in bookings.data:
            try:
                await checker.check_prices(booking['id'])
                # Add delay between checks to avoid rate limiting
                await asyncio.sleep(5)
            except Exception as e:
                logging.error(f"Error checking prices for booking {booking['id']}: {str(e)}")
                continue
        
        logging.info("✅ Price checking completed")
        
    except Exception as e:
        logging.error(f"❌ Fatal error: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(main())