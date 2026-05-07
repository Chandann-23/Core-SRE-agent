import requests
import json
import time
import threading

API_BASE = "http://localhost:8000"

def monitor_audit_logs(duration=10):
    """Monitor audit logs for a specified duration"""
    print(f"\n🔍 Monitoring audit logs for {duration} seconds...")
    logs_seen = []
    
    for i in range(duration):
        try:
            response = requests.get(f"{API_BASE}/audit-logs")
            if response.status_code == 200:
                data = response.json()
                current_logs = data['logs']
                if len(current_logs) > len(logs_seen):
                    new_logs = current_logs[len(logs_seen):]
                    for log in new_logs:
                        print(f"  📝 {log}")
                    logs_seen = current_logs
            time.sleep(1)
        except Exception as e:
            print(f"❌ Error monitoring logs: {e}")
            break
    
    return logs_seen

def test_complete_workflow():
    print("🚀 Testing Complete Reliability Lab Workflow")
    print("=" * 60)
    
    # Step 1: Clear logs and verify clean state
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
    
    # Step 2: Inject bug
    print("\n2️⃣ Injecting vulnerability...")
    try:
        response = requests.post(f"{API_BASE}/inject-bug")
        if response.status_code == 200:
            print("✅ Bug injected successfully")
            print(f"   Message: {response.json()['message']}")
        else:
            print(f"❌ Failed to inject bug: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 3: Check system status (should be Error)
    print("\n3️⃣ Checking system status...")
    try:
        response = requests.get(f"{API_BASE}/status")
        if response.status_code == 200:
            status = response.json()['status']
            print(f"📊 System Status: {status}")
            if status == 'Error':
                print("✅ System correctly detected as vulnerable")
            else:
                print("⚠️ System should be in Error state")
        else:
            print(f"❌ Failed to get status: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 4: Start repair (non-blocking)
    print("\n4️⃣ Starting autonomous repair...")
    try:
        response = requests.post(f"{API_BASE}/repair")
        if response.status_code == 200:
            repair_status = response.json()['status']
            print(f"🔧 Repair Status: {repair_status}")
            if repair_status == 'started':
                print("✅ Repair started in background")
            else:
                print(f"⚠️ Unexpected repair status: {repair_status}")
        else:
            print(f"❌ Failed to start repair: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 5: Monitor the repair process
    print("\n5️⃣ Monitoring repair process...")
    monitor_audit_logs(8)
    
    # Step 6: Check final status
    print("\n6️⃣ Checking final system status...")
    try:
        response = requests.get(f"{API_BASE}/status")
        if response.status_code == 200:
            final_status = response.json()['status']
            print(f"📊 Final Status: {final_status}")
            if final_status == 'Healthy':
                print("✅ System successfully restored!")
            else:
                print("⚠️ System not fully restored")
        else:
            print(f"❌ Failed to get final status: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    
    # Step 7: Get final audit logs
    print("\n7️⃣ Retrieving complete audit trail...")
    try:
        response = requests.get(f"{API_BASE}/audit-logs")
        if response.status_code == 200:
            logs = response.json()['logs']
            print(f"📋 Total audit entries: {len(logs)}")
            
            # Analyze the workflow
            injection_found = any("Bug injected" in log for log in logs)
            analysis_found = any("analyzing" in log.lower() for log in logs)
            fix_found = any("fix" in log.lower() for log in logs)
            success_found = any("restored" in log.lower() or "healthy" in log.lower() for log in logs)
            
            print(f"\n🔍 Workflow Analysis:")
            print(f"  • Bug Injection: {'✅' if injection_found else '❌'}")
            print(f"  • Error Analysis: {'✅' if analysis_found else '❌'}")
            print(f"  • Fix Applied: {'✅' if fix_found else '❌'}")
            print(f"  • System Restored: {'✅' if success_found else '❌'}")
            
            if all([injection_found, analysis_found, fix_found, success_found]):
                print("\n🎉 Complete workflow executed successfully!")
                return True
            else:
                print("\n⚠️ Workflow incomplete - some steps missing")
                return False
        else:
            print(f"❌ Failed to get audit logs: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_complete_workflow()
    if success:
        print("\n" + "=" * 60)
        print("🏆 RELIABILITY LAB WORKFLOW TEST PASSED!")
        print("✅ Ready for recruiter demonstrations")
        print("✅ All Phase 4 & Phase 5 features working")
        print("=" * 60)
    else:
        print("\n" + "=" * 60)
        print("❌ WORKFLOW TEST FAILED")
        print("⚠️ Some features need attention")
        print("=" * 60)
