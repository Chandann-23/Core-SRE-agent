import asyncio
import os
import sys
import docker

# --- 1. FORCE PATH RESOLUTION ---
# This ensures Python can see the 'src' folder regardless of where you run it from
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
SRC_PATH = os.path.join(CURRENT_DIR, "src")
sys.path.append(SRC_PATH)

print(f"📂 Current Directory: {CURRENT_DIR}")
print(f"📂 Looking for tools in: {SRC_PATH}")

try:
    from tools.docker_executor import DockerToolbox
    print("✅ Successfully imported DockerToolbox")
except ImportError as e:
    print(f"❌ Import Error: {e}")
    print("Check if core_engine/src/tools/docker_executor.py exists.")
    sys.exit(1)

async def verify():
    # --- 2. DOCKER CONNECTION ---
    print("\n🐳 Connecting to Docker...")
    try:
        toolbox = DockerToolbox(container_name="target-sandbox")
        # Direct check using the docker library
        client = docker.from_env()
        container = client.containers.get("target-sandbox")
        print(f"✅ Linked to container: {container.name} (Status: {container.status})")
    except Exception as e:
        print(f"❌ Docker Connection Failed: {e}")
        return

    # --- 3. TEST EXECUTION ---
    print("\n🧪 Running Remote Tests...")
    result = await toolbox.run_tests()
    print(f"📊 Test Status: {result.status}")
    if "failed" in result.status or result.exit_code != 0:
        print("✅ SUCCESS: The infrastructure correctly caught the bug!")
    else:
        print("⚠️  Warning: Tests didn't fail as expected.")
    
    # --- 4. FILE SYSTEM CHECK ---
    print("\n📄 Checking File Access...")
    # This checks if the engine can find the sibling folder 'target_sandbox'
    sandbox_path = os.path.abspath(os.path.join(CURRENT_DIR, "..", "target_sandbox"))
    print(f"📂 Target Sandbox Path: {sandbox_path}")
    if os.path.exists(sandbox_path):
        print(f"✅ Found Sandbox Folder.")
        try:
            content = toolbox.read_file("app/main.py")
            print(f"✅ Read main.py: {content[:50]}...")
        except Exception as e:
            print(f"❌ Could not read main.py: {e}")
    else:
        print(f"❌ Sandbox folder NOT FOUND at {sandbox_path}")

if __name__ == "__main__":
    asyncio.run(verify())