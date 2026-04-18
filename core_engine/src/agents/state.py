"""State schema for the iterative debugging agent."""

import operator
from typing import Annotated, TypedDict


class AgentState(TypedDict):
    """Represents the shared state for the agent execution graph.

    Attributes:
        target_file: Path to the file currently being investigated.
        code_context: Current source content of the target file.
        error_logs: Output from the latest failing test execution.
        history: Append-only activity log for attempted remediations.
        iterations: Number of graph-loop iterations executed so far.
        is_fixed: Whether the issue is resolved and execution can terminate.
    """

    target_file: str
    code_context: str
    error_logs: str
    history: Annotated[list[str], operator.add]
    iterations: int
    is_fixed: bool
