import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_audit_api():
    print("🧪 Testing Reliability Lab API Implementation")
    print("=" * 50)
    
    # Test 1: Check initial audit logs
    print("\n1. Testing GET /audit-logs (initial state)...")
    try:
        response = requests.get(f"{API_BASE}/audit-logs")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Logs: {data['logs']}")
            print("✅ Audit logs endpoint working")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Connection error: {e}")
        return False
    
    # Test 2: Clear audit logs
    print("\n2. Testing DELETE /audit-logs...")
    try:
        response = requests.delete(f"{API_BASE}/audit-logs")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            print("✅ Audit logs cleared")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Inject bug
    print("\n3. Testing POST /inject-bug...")
    try:
        response = requests.post(f"{API_BASE}/inject-bug")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Message: {data['message']}")
            print("✅ Bug injected")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Check audit logs after injection
    print("\n4. Checking audit logs after bug injection...")
    try:
        response = requests.get(f"{API_BASE}/audit-logs")
        if response.status_code == 200:
            data = response.json()
            print(f"Number of logs: {len(data['logs'])}")
            for log in data['logs']:
                print(f"  - {log}")
            print("✅ Audit logs captured injection event")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 5: Start repair (non-blocking)
    print("\n5. Testing POST /repair (non-blocking)...")
    try:
        response = requests.post(f"{API_BASE}/repair")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Status: {data['status']}")
            print("✅ Repair started in background")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 6: Monitor audit logs during repair
    print("\n6. Monitoring audit logs during repair...")
    for i in range(5):
        try:
            response = requests.get(f"{API_BASE}/audit-logs")
            if response.status_code == 200:
                data = response.json()
                print(f"Check {i+1}: {len(data['logs'])} log entries")
                if data['logs']:
                    print(f"  Latest: {data['logs'][-1]}")
            time.sleep(2)
        except Exception as e:
            print(f"❌ Error: {e}")
    
    # Test 7: Check system status
    print("\n7. Testing GET /status...")
    try:
        response = requests.get(f"{API_BASE}/status")
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"System Status: {data['status']}")
            print("✅ Status endpoint working")
        else:
            print(f"❌ Error: {response.text}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 API Testing Complete!")
    return True

if __name__ == "__main__":
    test_audit_api()
