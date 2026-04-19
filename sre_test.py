import requests
import time
import sys
import threading

# Configuration
BASE_URL = "https://core-sre-engine.onrender.com"
POLL_INTERVAL = 2  # seconds

def trigger_repair():
    """Helper to trigger repair in a separate thread since it's a blocking call."""
    try:
        requests.post(f"{API_BASE}/repair", timeout=120)
    except Exception:
        pass

def run_e2e_test():
    print("🚀 Starting End-to-End Reliability Test...")
    
    # 1. Inject Bug
    print("🐞 Injecting bug via /inject-bug...")
    try:
        inject_res = requests.post(f"{API_BASE}/inject-bug")
        inject_res.raise_for_status()
        print(f"✅ Bug injected: {inject_res.json().get('message')}")
    except Exception as e:
        print(f"❌ Failed to inject bug: {e}")
        sys.exit(1)

    # 2. Wait for status to reflect "Error"
    time.sleep(1)
    
    # 3. Start Polling & Timing
    print("🛠️ Triggering autonomous repair and starting timer...")
    start_time = time.time()
    
    # Start repair in background
    repair_thread = threading.Thread(target=trigger_repair)
    repair_thread.start()

    # 4. Polling /status
    print("🔍 Polling /status every 2s for health recovery...")
    end_time = None
    repair_successful = False
    
    # Poll for up to 2 minutes
    timeout = 120 
    elapsed = 0
    
    while elapsed < timeout:
        try:
            status_res = requests.get(f"{API_BASE}/status")
            status_res.raise_for_status()
            current_status = status_res.json().get("status")
            
            if current_status == "Healthy":
                end_time = time.time()
                repair_successful = True
                print(f"📡 Current Status: {current_status} ✅")
                break
            else:
                print(f"📡 Current Status: {current_status}...")
                
        except Exception as e:
            print(f"⚠️ Polling error: {e}")
        
        time.sleep(POLL_INTERVAL)
        elapsed += POLL_INTERVAL

    # 5. Final Report
    print("\n" + "="*40)
    print("📊 RELIABILITY TEST REPORT")
    print("="*40)
    
    if end_time:
        downtime = end_time - start_time
        print(f"⏱️  Total Downtime: {downtime:.2f} seconds")
        print(f"✅ Repair Result: SUCCESS")
    else:
        print("⏱️  Total Downtime: TIMEOUT")
        print("❌ Repair Result: FAILED")
    
    print("="*40)

if __name__ == "__main__":
    run_e2e_test()
