"""Tools for SRE agent operations."""

import subprocess
import os
import sys
from typing import NamedTuple

class TestResult(NamedTuple):
    status: str
    output: str

class toolbox:
    @staticmethod
    async def run_tests() -> TestResult:
        """Run tests on the complex sandbox."""
        try:
            # Change to the complex sandbox directory
            sandbox_dir = "/tmp/complex_sandbox"
            if not os.path.exists(sandbox_dir):
                # Create the directory structure if it doesn't exist
                os.makedirs(sandbox_dir, exist_ok=True)
                os.makedirs(f"{sandbox_dir}/app", exist_ok=True)
                os.makedirs(f"{sandbox_dir}/tests", exist_ok=True)
            
            # Run pytest
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/", "-v"],
                cwd=sandbox_dir,
                capture_output=True,
                text=True,
                timeout=30
            )
            
            return TestResult(
                status="passed" if result.returncode == 0 else "failed",
                output=result.stdout + result.stderr
            )
        except Exception as e:
            return TestResult(
                status="error",
                output=f"Test execution failed: {str(e)}"
            )
