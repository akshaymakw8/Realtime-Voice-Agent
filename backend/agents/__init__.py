"""
Agents package - Multi-agent system for voice conversations
"""
from .agent_config import AGENTS, DEFAULT_AGENT, AVAILABLE_VOICES
from .agent_manager import AgentManager

__all__ = ['AGENTS', 'DEFAULT_AGENT', 'AVAILABLE_VOICES', 'AgentManager']
