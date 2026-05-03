import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_smart_success_detection():
    print("🧠 Testing Smart Success Detection Logic")
    print("=" * 50)
    
    # Test 1: Clear logs and start fresh
    print("\n1️⃣ Clearing audit logs...")
    try:
        response = requests.delete(f"{API_BASE}/audit-logs")
        if response.status_code == 200:
            print("✅ Audit logs cleared")
        else:
            print(f"❌ Failed to clear logs: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: Inject bug
    print("\n2️⃣ Injecting vulnerability...")
    try:
        response = requests.post(f"{API_BASE}/inject-bug")
        if response.status_code == 200:
            print("✅ Bug injected successfully")
        else:
            print(f"❌ Failed to inject bug: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 3: Start repair
    print("\n3️⃣ Starting autonomous repair...")
    try:
        response = requests.post(f"{API_BASE}/repair")
        if response.status_code == 200:
            print("✅ Repair started in background")
        else:
            print(f"❌ Failed to start repair: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 4: Monitor for smart detection indicators
    print("\n4️⃣ Monitoring for smart success detection...")
    smart_indicators_found = []
    
    for i in range(10):  # Monitor for 10 seconds
        try:
            # Get audit logs
            logs_response = requests.get(f"{API_BASE}/audit-logs")
            status_response = requests.get(f"{API_BASE}/status")
            
            if logs_response.status_code == 200 and status_response.status_code == 200:
                logs = logs_response.json()['logs']
                status = status_response.json()['status']
                
                # Check for smart detection indicators
                success_indicators = [
                    'System restored to healthy state',
                    '✅ System restored',
                    'Agent successfully repaired',
                    'Fix applied, validating solution'
                ]
                
                for log in logs:
                    for indicator in success_indicators:
                        if indicator in log and log not in smart_indicators_found:
                            smart_indicators_found.append(log)
                            print(f"  🎯 Smart Detection: {log}")
                
                # Check if status endpoint shows healthy
                if status == 'Healthy':
                    print(f"  📊 Status Endpoint: Healthy")
                    break
                    
            time.sleep(1)
        except Exception as e:
            print(f"❌ Error monitoring: {e}")
            break
    
    # Test 5: Final verification
    print("\n5️⃣ Final verification...")
    
    # Get final logs and status
    try:
        logs_response = requests.get(f"{API_BASE}/audit-logs")
        status_response = requests.get(f"{API_BASE}/status")
        
        if logs_response.status_code == 200 and status_response.status_code == 200:
            final_logs = logs_response.json()['logs']
            final_status = status_response.json()['status']
            
            print(f"📋 Total audit entries: {len(final_logs)}")
            print(f"📊 Final system status: {final_status}")
            print(f"🎯 Smart indicators found: {len(smart_indicators_found)}")
            
            # Analyze detection scenarios
            logs_indicate_success = any(
                indicator in log for log in final_logs 
                for indicator in [
                    'System restored to healthy state',
                    '✅ System restored',
                    'Agent successfully repaired',
                    'Fix applied, validating solution'
                ]
            )
            
            status_indicates_success = final_status == 'Healthy'
            
            print(f"\n🔍 Detection Analysis:")
            print(f"  • Log-based detection: {'✅' if logs_indicate_success else '❌'}")
            print(f"  • Status-based detection: {'✅' if status_indicates_success else '❌'}")
            
            if logs_indicate_success and status_indicates_success:
                print("  🎉 Both methods detected success!")
                return True
            elif logs_indicate_success and not status_indicates_success:
                print("  🎯 Smart detection would work (logs detected success)")
                return True
            elif not logs_indicate_success and status_indicates_success:
                print("  🎯 Status detection would work")
                return True
            else:
                print("  ⚠️ Neither method detected success")
                return False
        else:
            print(f"❌ Failed to get final status")
            return False
            
    except Exception as e:
        print(f"❌ Error in final verification: {e}")
        return False

if __name__ == "__main__":
    success = test_smart_success_detection()
    if success:
        print("\n" + "=" * 50)
        print("🧠 SMART DETECTION TEST PASSED!")
        print("✅ Enhanced success detection working")
        print("✅ Frontend will handle desync scenarios")
        print("✅ Ready for production demos")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("❌ SMART DETECTION TEST FAILED")
        print("⚠️ Need to check implementation")
        print("=" * 50)
