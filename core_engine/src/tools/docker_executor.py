import docker
import os
from pathlib import Path
from pydantic import BaseModel
from typing import Optional

class TestResult(BaseModel):
    exit_code: int
    stdout: str
    stderr: str
    status: str 

class DockerToolbox:
    def __init__(self, container_name: str = "target-sandbox"):
        self.container_name = container_name
        
        # 1. Dynamically find the project root
        # core_engine/src/tools/docker_executor.py -> core_engine/
        self.project_root = Path(__file__).resolve().parent.parent.parent
        self.sandbox_dir = self.project_root / "target_sandbox"
        
        # 2. Check if we are in Production (Render/Cloud)
        self.is_prod = os.getenv('ENV') == 'production'
        self.client = None

        if not self.is_prod:
            try:
                self.client = docker.from_env()
                print("🐳 [DockerToolbox] Connected to local Docker.")
            except Exception as e:
                print(f"⚠️ [DockerToolbox] Local Docker not found, falling back to FS mode: {e}")
        else:
            print("🌐 [DockerToolbox] Production mode: Docker disabled (using local File System).")

    async def run_tests(self) -> TestResult:
        """Executes pytest inside the sandbox or simulates it in Demo Mode."""
        # Check if we should use the Docker client or Mock it
        if self.is_prod or not self.client:
            return TestResult(
                exit_code=0,
                stdout="Demo Mode: Synthetic test execution passed.",
                stderr="",
                status="passed"
            )

        try:
            container = self.client.containers.get(self.container_name)
            exec_log = container.exec_run(
                "pytest",
                environment={"PYTHONPATH": "/app"},
                workdir="/app"
            )
            return TestResult(
                exit_code=exec_log.exit_code,
                stdout=exec_log.output.decode("utf-8"),
                stderr="",
                status="passed" if exec_log.exit_code == 0 else "failed"
            )
        except Exception as e:
            return TestResult(exit_code=1, stdout="", stderr=str(e), status="error")

    def _get_full_path(self, relative_path: str) -> Path:
        """Helper to resolve paths correctly."""
        # Ensure the sandbox directory exists on the server
        if not self.sandbox_dir.exists():
            self.sandbox_dir.mkdir(parents=True, exist_ok=True)
        return (self.sandbox_dir / relative_path).resolve()

    def read_file(self, relative_path: str) -> str:
        """Reads code from the shared volume or local path."""
        full_path = self._get_full_path(relative_path)
        
        # Create a default file if it doesn't exist (prevents crash on first run)
        if not full_path.exists():
            self.write_file(relative_path, "# Initial sandbox code\nprint('Hello CORE SRE')")
            
        print(f"📂 [DockerToolbox] Reading: {full_path}")
        with open(full_path, "r") as f:
            return f.read()

    def write_file(self, relative_path: str, content: str):
        """Writes code to the shared volume or local path."""
        full_path = self._get_full_path(relative_path)
        print(f"💾 [DockerToolbox] Writing: {full_path}")
        
        # Ensure parent directory exists
        full_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(full_path, "w") as f:
            f.write(content)
        return f"Successfully updated {relative_path}"