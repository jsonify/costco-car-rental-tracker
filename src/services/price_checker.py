# src/services/price_checker.py

"""
Service responsible for checking car rental prices from Costco Travel and storing them in Supabase.
Follows SOLID principles with single responsibility classes and dependency injection.
"""

import os
from datetime import datetime
import json
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
    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver
    
    def validate_price(self, price: float, category: str) -> bool:
        """Validate extracted price is within reasonable bounds"""
        MIN_PRICE = 20.0
        MAX_PRICE = 5000.0
        
        if not MIN_PRICE <= price <= MAX_PRICE:
            print(f"Warning: Suspicious price ${price:.2f} for {category}")
            return False
        return True
    #
    def extract_prices(self) -> Dict[str, float]:
        """Extract prices for all car categories"""
        prices = {}
        
        # Wait for price elements with increased timeout
        WebDriverWait(self.driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, 'div[role="row"]'))
        )
        
        car_rows = self.driver.find_elements(By.CSS_SELECTOR, 'div[role="row"]')
        print(f"Found {len(car_rows)} car categories")
        
        for row in car_rows:
            try:
                category = row.find_element(By.CSS_SELECTOR, '.car-category-name').text.strip()
                price = row.find_element(By.CSS_SELECTOR, '.car-result-card.lowest-price').get_attribute('data-price')
                prices[category] = float(price)
                print(f"Found {category}: ${price}")
            except Exception as e:
                print(f"Error extracting price from row: {str(e)}")
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
        try:
            options = webdriver.ChromeOptions()
            options.binary_location = self.config.chrome_binary
            
            # Stealth settings
            options.add_argument('--disable-blink-features=AutomationControlled')
            options.add_argument('--disable-dev-shm-usage')
            options.add_argument('--start-maximized')
            options.add_experimental_option('excludeSwitches', ['enable-automation'])
            options.add_experimental_option('useAutomationExtension', False)
            
            # Comment out headless mode for testing
            # options.add_argument('--headless=new')
            # options.add_argument('--no-sandbox')
            
            service = Service(self.config.chromedriver_path)
            driver = webdriver.Chrome(service=service, options=options)
            
            return driver
            
        except Exception as e:
            print(f"❌ Error setting up Chrome WebDriver: {str(e)}")
            raise
        
    
    def fill_search_form(self, driver: webdriver.Chrome, booking: Dict) -> None:
        """Fill out the search form with booking details"""
        try:
            print("\nFilling search form details...")
            
            # Wait for page load
            print("Waiting for form to load...")
            WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.ID, "pickupLocationTextWidget"))
            )
            
            # Take screenshot before form fill
            os.makedirs('logs', exist_ok=True)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            driver.save_screenshot(f"logs/before_form_{timestamp}.png")

            # Location input
            print("Entering location...")
            location_input = driver.find_element(By.ID, "pickupLocationTextWidget")
            driver.execute_script("arguments[0].click();", location_input)
            location_input.clear()
            location_input.send_keys(booking['location'])
            time.sleep(2)  # Increased wait time

            # Wait for and select from dropdown
            print("Selecting from dropdown...")
            try:
                dropdown_item = WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.XPATH, 
                        f"//li[contains(@class, 'ui-menu-item')]//span[contains(text(), '{booking['location']}')]"
                    ))
                )
                driver.execute_script("arguments[0].click();", dropdown_item)
            except Exception as e:
                print(f"Dropdown selection failed: {str(e)}")
                try:
                    # Fallback: Try clicking first suggestion
                    dropdown_item = WebDriverWait(driver, 10).until(
                        EC.presence_of_element_located((By.CSS_SELECTOR, "ul.ui-autocomplete li:first-child"))
                    )
                    driver.execute_script("arguments[0].click();", dropdown_item)
                except Exception as e:
                    print(f"Fallback dropdown selection failed: {str(e)}")
                    raise

            time.sleep(1)

            # Format dates correctly (MM/DD/YYYY)
            pickup_date = datetime.strptime(booking['pickup_date'], "%Y-%m-%d").strftime("%m/%d/%Y")
            dropoff_date = datetime.strptime(booking['dropoff_date'], "%Y-%m-%d").strftime("%m/%d/%Y")

            print(f"Formatted dates: {pickup_date} to {dropoff_date}")

            # # Dates
            # print("Setting dates...")
            # pickup_date = driver.find_element(By.ID, "pickUpDateWidget")
            # dropoff_date = driver.find_element(By.ID, "dropOffDateWidget")
            
            # Set dates with correct format
            pickup_element = driver.find_element(By.ID, "pickUpDateWidget")
            dropoff_element = driver.find_element(By.ID, "dropOffDateWidget")
            
            driver.execute_script("arguments[0].value = '';", pickup_element)
            driver.execute_script("arguments[0].value = '';", dropoff_element)
            driver.execute_script(f"arguments[0].value = '{pickup_date}'", pickup_element)
            driver.execute_script(f"arguments[0].value = '{dropoff_date}'", dropoff_element)
            
            # Trigger change events
            driver.execute_script("arguments[0].dispatchEvent(new Event('change'))", pickup_element)
            driver.execute_script("arguments[0].dispatchEvent(new Event('change'))", dropoff_element)

            # Times
            print("Setting times...")
            def convert_time(time_str: str) -> str:
                """Convert standard time to Costco's format"""
                return "Noon" if time_str == "12:00 PM" else time_str
            
            pickup_time = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "pickupTimeWidget"))
            )
            dropoff_time = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "dropoffTimeWidget"))
            )
            
            Select(pickup_time).select_by_visible_text(convert_time(booking['pickup_time']))
            Select(dropoff_time).select_by_visible_text(convert_time(booking['dropoff_time']))

            # Age checkbox
            print("Setting age checkbox...")
            age_checkbox = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "driversAgeWidget"))
            )
            if not age_checkbox.is_selected():
                driver.execute_script("arguments[0].click();", age_checkbox)

            # Take screenshot before search
            driver.save_screenshot(f"logs/before_search_{timestamp}.png")

            # Click search and wait for results
            print("Clicking search...")
            search_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "findMyCarButton"))
            )
            driver.execute_script("arguments[0].click();", search_button)

            # In fill_search_form(), update the results waiting section:
            print("Waiting for results...")
            try:
                # Wait for URL change first
                WebDriverWait(driver, 30).until(lambda d: "results" in d.current_url.lower() or "vehicles" in d.current_url.lower())
                print("URL changed to results page")
                
                # Wait for car listings
                car_listings = WebDriverWait(driver, 60).until(
                    EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'div[role="row"] .car-result-card'))
                )
                print(f"Found {len(car_listings)} car listings")
                
                # Take screenshot of results
                driver.save_screenshot(f"logs/results_{timestamp}.png")
                
            except TimeoutException as e:
                print("Timeout waiting for car listings")
                driver.save_screenshot(f"logs/timeout_{timestamp}.png")
                print(f"Current URL: {driver.current_url}")
                raise
            except Exception as e:
                print(f"Error waiting for results: {str(e)}")
                raise

            # Final wait for prices
            time.sleep(5)
            print("✅ Form submitted successfully")

        except Exception as e:
            print(f"\nError details:")
            print(f"Exception type: {type(e).__name__}")
            print(f"Exception message: {str(e)}")
            print(f"\nPage state:")
            print(f"Current URL: {driver.current_url}")
            
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            driver.save_screenshot(f"logs/error_state_{timestamp}.png")
            with open(f"logs/page_source_{timestamp}.html", 'w') as f:
                f.write(driver.page_source)
                
            raise
    
    
    
    async def check_prices(self, booking_id: str) -> None:
        """Check prices for a specific booking"""
        try:
            print(f"\nChecking prices for booking: {booking_id}")
            result = self.supabase.client.table('bookings').select('*').eq('id', booking_id).execute()
            
            if not result.data:
                raise Exception(f"Booking {booking_id} not found")
            
            booking = result.data[0]
            print(f"Found booking: {booking['location']} ({booking['pickup_date']} - {booking['dropoff_date']})")
            
            driver = self.setup_driver()
            
            try:
                # Navigate to Costco Travel
                print("\nNavigating to Costco Travel...")
                driver.get("https://www.costcotravel.com/Rental-Cars")
                print("Current URL:", driver.current_url)
                
                # Take screenshot before form fill
                os.makedirs('logs', exist_ok=True)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                driver.save_screenshot(f"logs/before_form_{timestamp}.png")
                
                time.sleep(2)  # Allow page to load
                print("Page loaded, filling search form...")
                
                # Fill out the form
                self.fill_search_form(driver, booking)
                print("Search form filled")
                
                # Take screenshot after search
                driver.save_screenshot(f"logs/after_search_{timestamp}.png")
                
                # Extract prices
                extractor = PriceExtractor(driver)
                prices = extractor.extract_prices()
                print(f"Extracted {len(prices)} prices")
                
                # Store prices in Supabase
                self.supabase.store_prices(booking_id, prices)
                
            except Exception as e:
                print(f"❌ Error during price check: {str(e)}")
                driver.save_screenshot(f"logs/error_{timestamp}.png")
                print("\nPage source at time of error:")
                print(driver.page_source[:500] + "...")  # Print first 500 chars
                raise
            finally:
                print("\nClosing Chrome driver...")
                driver.quit()
                
        except Exception as e:
            print(f"❌ Error checking prices: {str(e)}")
            raise
    # def fill_search_form(self, driver: webdriver.Chrome, booking: Dict) -> None:
        """Fill out the search form with booking details"""
        try:
            # Location input with wait and retry
            print("Filling location...")
            location_input = WebDriverWait(driver, 20).until(
                EC.presence_of_element_located((By.ID, "pickupLocationTextWidget"))
            )
            location_input.clear()
            location_input.send_keys(booking['location'])
            
            # Select from dropdown
            try:
                print("Selecting from dropdown...")
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
            
            print("Filling dates...")
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
            
            # Trigger change events
            driver.execute_script("arguments[0].dispatchEvent(new Event('change'))", pickup_date)
            driver.execute_script("arguments[0].dispatchEvent(new Event('change'))", dropoff_date)
            
            print("Setting times...")
            # Convert times to Costco format
            def convert_to_costco_time(time_str: str) -> str:
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
            
            pickup_options = [opt.text for opt in pickup_time_select.options]
            print(f"Available pickup times: {pickup_options}")
            
            costco_pickup_time = convert_to_costco_time(booking['pickup_time'])
            costco_dropoff_time = convert_to_costco_time(booking['dropoff_time'])
            
            print(f"Selecting pickup time: {costco_pickup_time}")
            print(f"Selecting dropoff time: {costco_dropoff_time}")
            
            pickup_time_select.select_by_visible_text(costco_pickup_time)
            dropoff_time_select.select_by_visible_text(costco_dropoff_time)
            
            print("Checking age checkbox...")
            age_checkbox = WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.ID, "driversAgeWidget"))
            )
            if not age_checkbox.is_selected():
                driver.execute_script("arguments[0].click();", age_checkbox)
            
            # Take a screenshot before clicking search
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            driver.save_screenshot(f"logs/before_search_{timestamp}.png")
            
            print("Clicking search button...")
            search_button = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.ID, "findMyCarButton"))
            )
            driver.execute_script("arguments[0].click();", search_button)
            
            print("Waiting for results...")
            # Wait for either results page or loading indicator
            def check_results_or_loading(d):
                try:
                    current_url = d.current_url.lower()
                    page_source = d.page_source.lower()
                    
                    # Debug logging
                    print(f"Current URL: {current_url}")
                    if "searching" in page_source:
                        print("Found 'searching' text in page")
                    if "loading" in page_source:
                        print("Found 'loading' text in page")
                    
                    # Take progress screenshot
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                    d.save_screenshot(f"logs/waiting_results_{timestamp}.png")
                    
                    return (
                        "results" in current_url or
                        "vehicles" in current_url or
                        current_url != "https://www.costcotravel.com/Rental-Cars"
                    )
                except Exception as e:
                    print(f"Error in check_results_or_loading: {str(e)}")
                    return False
            
            # Wait with progress logging
            start_time = time.time()
            while time.time() - start_time < 60:  # 60 second timeout
                if check_results_or_loading(driver):
                    print("Results page detected!")
                    break
                time.sleep(2)
            else:
                raise Exception("Timeout waiting for results page")
            
            # Final wait for prices to load
            print("Waiting for prices to load...")
            time.sleep(5)
            
        except Exception as e:
            print(f"❌ Error filling search form: {str(e)}")
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            os.makedirs('logs', exist_ok=True)
            driver.save_screenshot(f"logs/error_screenshot_{timestamp}.png")
            # Print the page source
            print("\nPage source at time of error:")
            print(driver.page_source[:1000])  # Print first 1000 chars
            raise