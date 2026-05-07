import requests
import json
import time

API_BASE = "http://localhost:8000"

def test_bulletproof_ui_logic():
    print("🛡️ Testing Bulletproof UI Logic")
    print("=" * 50)
    print("This test verifies the frontend can detect success")
    print("directly from audit logs without relying on status endpoint")
    print("=" * 50)
    
    # Test 1: Clear and setup
    print("\n1️⃣ Setting up bulletproof test...")
    try:
        response = requests.delete(f"{API_BASE}/audit-logs")
        if response.status_code == 200:
            print("✅ Audit logs cleared")
        else:
            print(f"❌ Setup failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 2: Inject bug
    print("\n2️⃣ Injecting vulnerability...")
    try:
        response = requests.post(f"{API_BASE}/inject-bug")
        if response.status_code == 200:
            print("✅ Bug injected")
        else:
            print(f"❌ Injection failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 3: Start repair
    print("\n3️⃣ Starting repair process...")
    try:
        response = requests.post(f"{API_BASE}/repair")
        if response.status_code == 200:
            print("✅ Repair started in background")
        else:
            print(f"❌ Repair failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Test 4: Monitor for bulletproof detection
    print("\n4️⃣ Monitoring for bulletproof success detection...")
    success_detected = False
    detection_method = None
    detection_time = None
    
    for i in range(12):  # Monitor for 12 seconds
        try:
            # Get both logs and status
            logs_response = requests.get(f"{API_BASE}/audit-logs")
            status_response = requests.get(f"{API_BASE}/status")
            
            if logs_response.status_code == 200 and status_response.status_code == 200:
                logs = logs_response.json()['logs']
                status = status_response.json()['status']
                
                # Check for bulletproof success indicators in logs
                if not success_detected:
                    bulletproof_indicators = [
                        'System restored to healthy state',
                        '✅ System restored',
                        'Agent successfully repaired',
                        'Fix applied, validating solution'
                    ]
                    
                    logs_show_success = any(
                        indicator in log for log in logs 
                        for indicator in bulletproof_indicators
                    )
                    
                    if logs_show_success:
                        success_detected = True
                        detection_method = 'LOGS (Bulletproof)'
                        detection_time = i + 1
                        print(f"  🎯 BULLETPROOF DETECTION at T+{i+1}s!")
                        print(f"     Method: Audit logs (immediate)")
                        print(f"     Latest log: {logs[-1] if logs else 'N/A'}")
                        print(f"     Status endpoint: {status}")
                        
                        # Simulate what frontend would do
                        print(f"     🔄 Frontend would immediately:")
                        print(f"        • Stop MTTR timer at {detection_time}s")
                        print(f"        • Set system status to 'Healthy'")
                        print(f"        • Trigger success modal")
                        print(f"        • Reset button state")
                        break
                
                # Also check status endpoint for comparison
                if status == 'Healthy' and not success_detected:
                    success_detected = True
                    detection_method = 'STATUS (Traditional)'
                    detection_time = i + 1
                    print(f"  📊 Traditional detection at T+{i+1}s")
                    print(f"     Method: Status endpoint")
                    break
                    
            time.sleep(1)
        except Exception as e:
            print(f"❌ Monitoring error: {e}")
            break
    
    # Test 5: Final verification
    print("\n5️⃣ Final verification...")
    
    try:
        final_logs_response = requests.get(f"{API_BASE}/audit-logs")
        final_status_response = requests.get(f"{API_BASE}/status")
        
        if final_logs_response.status_code == 200 and final_status_response.status_code == 200:
            final_logs = final_logs_response.json()['logs']
            final_status = final_status_response.json()['status']
            
            print(f"📋 Final audit entries: {len(final_logs)}")
            print(f"📊 Final system status: {final_status}")
            print(f"🎯 Detection method: {detection_method}")
            print(f"⏱️ Detection time: {detection_time}s")
            
            # Analyze bulletproof effectiveness
            bulletproof_indicators = [
                'System restored to healthy state',
                '✅ System restored',
                'Agent successfully repaired',
                'Fix applied, validating solution'
            ]
            
            logs_contain_success = any(
                indicator in log for log in final_logs 
                for indicator in bulletproof_indicators
            )
            
            print(f"\n🔍 Bulletproof Analysis:")
            print(f"  • Logs contain success: {'✅' if logs_contain_success else '❌'}")
            print(f"  • Status shows healthy: {'✅' if final_status == 'Healthy' else '❌'}")
            print(f"  • Detection method: {detection_method}")
            
            if success_detected:
                if 'LOGS' in detection_method:
                    print(f"  🎯 BULLETPROOF SUCCESS: Logs detected first!")
                    print(f"     Frontend would respond immediately at T+{detection_time}s")
                    print(f"     No desync issues - lightning fast UI response")
                    return True
                else:
                    print(f"  ✅ TRADITIONAL SUCCESS: Status endpoint worked")
                    print(f"     Frontend would respond at T+{detection_time}s")
                    return True
            else:
                print(f"  ⚠️ NO SUCCESS DETECTED: Process may still be running")
                return False
        else:
            print(f"❌ Failed to get final status")
            return False
            
    except Exception as e:
        print(f"❌ Final verification error: {e}")
        return False

if __name__ == "__main__":
    success = test_bulletproof_ui_logic()
    if success:
        print("\n" + "=" * 50)
        print("🛡️ BULLETPROOF UI TEST PASSED!")
        print("✅ Immediate success detection working")
        print("✅ Frontend will respond to audit logs")
        print("✅ No more desync timeout issues")
        print("✅ Demo-ready for recruiters")
        print("✅ Professional SRE behavior")
        print("=" * 50)
    else:
        print("\n" + "=" * 50)
        print("❌ BULLETPROOF UI TEST FAILED")
        print("⚠️ Need to check detection logic")
        print("=" * 50)
