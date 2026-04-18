"""Entrypoint for running the autonomous SRE repair agent."""

import asyncio
import os
import sys


from dotenv import load_dotenv

from src.agents.graph import sre_graph as graph
from src.agents.state import AgentState
from src.tools.docker_executor import DockerToolbox

if sys.platform == 'win32':
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(os.path.dirname(os.path.abspath(__file__)))
load_dotenv()



async def run_agent() -> None:
    """Runs the SRE agent loop from initial failure through final report.

    Args:
        None

    Returns:
        None
    """
    toolbox = DockerToolbox()
    initial_code = toolbox.read_file("app/main.py")
    initial_test_result = await toolbox.run_tests()

    initial_state: AgentState = {
        "target_file": "app/main.py",
        "code_context": initial_code,
        "error_logs": (
            initial_test_result.stdout
            if initial_test_result.stdout
            else initial_test_result.stderr
        ),
        "history": ["Started autonomous repair session."],
        "iterations": 0,
        "is_fixed": False,
    }

    final_state = await graph.ainvoke(initial_state)

    if final_state["is_fixed"]:
        print("Success: Autonomous repair completed.")
        print("Final code:")
        print(final_state["code_context"])
        return

    print("Repair failed after max iterations.")
    print("Final error logs:")
    print(final_state["error_logs"])
    print("Final code:")
    print(final_state["code_context"])


if __name__ == "__main__":
    asyncio.run(run_agent())
