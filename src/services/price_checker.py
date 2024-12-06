# src/services/price_checker.py

"""
Service responsible for checking car rental prices from Costco Travel and storing them in Supabase.
Follows SOLID principles with single responsibility classes and dependency injection.
"""

import os
from datetime import datetime
from typing import Dict, List, Optional
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import Select
from selenium.webdriver.chrome.service import Service
from supabase import create_client, Client

class PriceCheckerConfig:
    """Configuration for the price checker service"""
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_KEY')
        self.chrome_binary = os.getenv('CHROME_BINARY_PATH')
        self.chromedriver_path = os.getenv('CHROMEDRIVER_PATH')
        
        if not all([self.supabase_url, self.supabase_key, 
                   self.chrome_binary, self.chromedriver_path]):
            raise ValueError("Missing required environment variables")

class PriceExtractor:
    """Responsible for extracting prices from the Costco Travel website"""
    
    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver
    
    def extract_prices(self) -> Dict[str, float]:
        """Extract prices for all car categories from the current page"""
        print("\nExtracting prices...")
        prices = {}
        
        # Wait for price elements to be present
        WebDriverWait(self.driver, 20).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div[role="row"]'))
        )
        
        # Find all car category rows
        category_rows = self.driver.find_elements(By.CSS_SELECTOR, 'div[role="row"]')
        
        for row in category_rows:
            try:
                # Get category name
                category_name = row.find_element(
                    By.CSS_SELECTOR, 
                    'div.inner.text-center.h3-tag-style'
                ).text.strip()
                
                # Get price from the lowest price card
                price_element = row.find_element(
                    By.CSS_SELECTOR, 
                    'a.card.car-result-card.lowest-price'
                )
                price = float(price_element.get_attribute('data-price'))
                
                prices[category_name] = price
                print(f"Found {category_name}: ${price:.2f}")
                
            except Exception as e:
                print(f"Error extracting price: {str(e)}")
                continue
        
        return prices

class SupabaseClient:
    """Handles all interactions with Supabase"""
    
    def __init__(self, config: PriceCheckerConfig):
        self.client: Client = create_client(
            config.supabase_url,
            config.supabase_key
        )
    
    def store_prices(self, booking_id: str, prices: Dict[str, float]) -> None:
        """Store price data in Supabase"""
        try:
            # Find the lowest price
            lowest_category, lowest_price = min(
                prices.items(), 
                key=lambda x: x[1]
            )
            
            # Insert into price_history table
            data = {
                'booking_id': booking_id,
                'prices': prices,
                'lowest_price_category': lowest_category,
                'lowest_price': lowest_price,
                'created_at': datetime.now().isoformat()
            }
            
            result = self.client.table('price_history').insert(data).execute()
            
            if len(result.data) == 0:
                raise Exception("Failed to insert price history")
                
            print(f"✅ Stored prices for booking {booking_id}")
            
        except Exception as e:
            print(f"❌ Error storing prices: {str(e)}")
            raise

class PriceChecker:
    """Main service class that coordinates price checking and storage"""
    
    def __init__(self, config: PriceCheckerConfig):
        self.config = config
        self.supabase = SupabaseClient(config)
    
    def setup_driver(self) -> webdriver.Chrome:
        """Set up Chrome WebDriver with proper configuration"""
        options = webdriver.ChromeOptions()
        options.binary_location = self.config.chrome_binary
        
        # Add stealth settings
        options.add_argument('--disable-blink-features=AutomationControlled')
        options.add_argument('--disable-infobars')
        options.add_experimental_option('useAutomationExtension', False)
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        
        # Headless mode settings
        options.add_argument('--headless')
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        
        service = Service(
            executable_path=self.config.chromedriver_path
        )
        
        driver = webdriver.Chrome(service=service, options=options)
        
        # Additional stealth measures
        driver.execute_cdp_cmd('Network.setUserAgentOverride', {
            "userAgent": 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
        })
        
        return driver
    
    async def check_prices(self, booking_id: str) -> None:
        """Check prices for a specific booking"""
        try:
            # Get booking details from Supabase
            result = self.supabase.client.table('bookings').select('*').eq('id', booking_id).execute()
            
            if not result.data:
                raise Exception(f"Booking {booking_id} not found")
            
            booking = result.data[0]
            driver = self.setup_driver()
            
            try:
                # Navigate to Costco Travel
                driver.get("https://www.costcotravel.com/Rental-Cars")
                time.sleep(2)  # Allow page to load
                
                # Fill out the form
                self.fill_search_form(driver, booking)
                
                # Extract prices
                extractor = PriceExtractor(driver)
                prices = extractor.extract_prices()
                
                # Store prices in Supabase
                self.supabase.store_prices(booking_id, prices)
                
            finally:
                driver.quit()
                
        except Exception as e:
            print(f"❌ Error checking prices: {str(e)}")
            raise
    
def fill_search_form(self, driver: webdriver.Chrome, booking: Dict) -> None:
    """Fill out the search form with booking details"""
    try:
        # Location input with wait and retry
        location_input = WebDriverWait(driver, 20).until(
            EC.presence_of_element_located((By.ID, "pickupLocationTextWidget"))
        )
        location_input.clear()
        location_input.send_keys(booking['location'])
        
        # Select from dropdown
        try:
            location_item = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, f"//li[contains(text(), '{booking['location']}')]")
                )
            )
        except:
            # Try alternative xpath if exact match fails
            location_item = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located(
                    (By.XPATH, f"//li[contains(., '{booking['location']}')]")
                )
            )
        location_item.click()
        time.sleep(1)  # Allow dropdown to close
        
        # Dates with explicit format
        pickup_date = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "pickUpDateWidget"))
        )
        dropoff_date = driver.find_element(By.ID, "dropOffDateWidget")
        
        # Clear date fields
        pickup_date.clear()
        dropoff_date.clear()
        
        # Set dates
        driver.execute_script(f"arguments[0].value = '{booking['pickup_date']}'", pickup_date)
        driver.execute_script(f"arguments[0].value = '{booking['dropoff_date']}'", dropoff_date)
        
        # Convert times to Costco format
        def convert_to_costco_time(time_str: str) -> str:
            """Convert standard time to Costco's format"""
            if time_str == "12:00 PM":
                return "Noon"
            elif time_str == "12:00 AM":
                return "Midnight"
            return time_str
        
        # Times - Use Costco's format
        pickup_time_select = Select(WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "pickupTimeWidget"))
        ))
        dropoff_time_select = Select(driver.find_element(By.ID, "dropoffTimeWidget"))
        
        # Get all available time options for debugging
        pickup_options = [opt.text for opt in pickup_time_select.options]
        print(f"Available pickup times: {pickup_options}")
        
        # Select times using Costco's format
        costco_pickup_time = convert_to_costco_time(booking['pickup_time'])
        costco_dropoff_time = convert_to_costco_time(booking['dropoff_time'])
        
        print(f"Selecting pickup time: {costco_pickup_time}")
        print(f"Selecting dropoff time: {costco_dropoff_time}")
        
        pickup_time_select.select_by_visible_text(costco_pickup_time)
        dropoff_time_select.select_by_visible_text(costco_dropoff_time)
        
        # Age checkbox
        age_checkbox = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "driversAgeWidget"))
        )
        if not age_checkbox.is_selected():
            driver.execute_script("arguments[0].click();", age_checkbox)
        
        # Click search
        search_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.ID, "findMyCarButton"))
        )
        driver.execute_script("arguments[0].click();", search_button)
        
        # Wait for results
        def check_results(d):
            return (
                "results" in d.current_url.lower() or
                "vehicles" in d.current_url.lower()
            )
        
        WebDriverWait(driver, 60).until(check_results)
        time.sleep(5)  # Allow prices to load
        
    except Exception as e:
        print(f"❌ Error filling search form: {str(e)}")
        # Save screenshot for debugging
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        os.makedirs('logs', exist_ok=True)
        driver.save_screenshot(f"logs/error_screenshot_{timestamp}.png")
        raise