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
        # 1. Dynamically find the project root (SRE folder)
        # This goes from: core_engine/src/tools/docker_executor.py -> SRE/
        self.project_root = Path(__file__).resolve().parent.parent.parent.parent
        self.sandbox_dir = self.project_root / "target_sandbox"
        
        try:
            self.client = docker.from_env()
        except Exception as e:
            print(f"Failed to connect to Docker: {e}")
            raise

    async def run_tests(self) -> TestResult:
        """Executes pytest inside the sandbox."""
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
        # This ensures we are always looking inside SRE/target_sandbox/
        return (self.sandbox_dir / relative_path).resolve()

    def read_file(self, relative_path: str) -> str:
        """Reads code from the shared volume."""
        full_path = self._get_full_path(relative_path)
        print(f"📂 [DockerToolbox] Reading: {full_path}") # Debug line
        with open(full_path, "r") as f:
            return f.read()

    def write_file(self, relative_path: str, content: str):
        """Writes code to the shared volume."""
        full_path = self._get_full_path(relative_path)
        print(f"💾 [DockerToolbox] Writing: {full_path}") # Debug line
        with open(full_path, "w") as f:
            f.write(content)
        return f"Successfully updated {relative_path}"