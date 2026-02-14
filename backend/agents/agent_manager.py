"""
Agent Manager - Handles agent switching and context management
"""
import logging
from typing import Dict, Optional, List
from datetime import datetime

from .agent_config import AGENTS, DEFAULT_AGENT

logger = logging.getLogger(__name__)


class AgentManager:
    """Manages AI agents and their context during conversations"""
    
    def __init__(self):
        self.current_agent_id: str = DEFAULT_AGENT
        self.conversation_history: List[Dict] = []
        self.agent_switch_history: List[Dict] = []
        self.session_start = datetime.now()
    
    def get_current_agent(self) -> str:
        """Get the currently active agent ID"""
        return self.current_agent_id
    
    def get_agent_config(self, agent_id: str) -> Dict:
        """Get configuration for a specific agent"""
        if agent_id not in AGENTS:
            logger.warning(f"Agent {agent_id} not found, using default")
            return AGENTS[DEFAULT_AGENT]
        return AGENTS[agent_id]
    
    def switch_agent(self, new_agent_id: str, reason: Optional[str] = None) -> bool:
        """
        Switch to a different agent
        
        Args:
            new_agent_id: ID of the agent to switch to
            reason: Optional reason for the switch
            
        Returns:
            bool: True if switch was successful
        """
        if new_agent_id not in AGENTS:
            logger.error(f"Cannot switch to unknown agent: {new_agent_id}")
            return False
        
        if new_agent_id == self.current_agent_id:
            logger.info(f"Already using agent: {new_agent_id}")
            return True
        
        # Record the switch
        switch_record = {
            "timestamp": datetime.now().isoformat(),
            "from_agent": self.current_agent_id,
            "to_agent": new_agent_id,
            "reason": reason
        }
        self.agent_switch_history.append(switch_record)
        
        # Update current agent
        old_agent = self.current_agent_id
        self.current_agent_id = new_agent_id
        
        logger.info(f"Switched agent from {old_agent} to {new_agent_id}")
        return True
    
    def add_to_conversation(self, role: str, content: str, agent_id: Optional[str] = None):
        """
        Add a message to conversation history
        
        Args:
            role: 'user' or 'assistant'
            content: Message content
            agent_id: ID of the agent (defaults to current agent)
        """
        message = {
            "timestamp": datetime.now().isoformat(),
            "role": role,
            "content": content,
            "agent_id": agent_id or self.current_agent_id
        }
        self.conversation_history.append(message)
    
    def get_conversation_history(self, limit: Optional[int] = None) -> List[Dict]:
        """
        Get conversation history
        
        Args:
            limit: Optional limit on number of messages to return
            
        Returns:
            List of conversation messages
        """
        if limit:
            return self.conversation_history[-limit:]
        return self.conversation_history
    
    def get_agent_switch_history(self) -> List[Dict]:
        """Get history of agent switches"""
        return self.agent_switch_history
    
    def clear_conversation(self):
        """Clear conversation history"""
        self.conversation_history = []
        logger.info("Conversation history cleared")
    
    def get_session_stats(self) -> Dict:
        """Get statistics about the current session"""
        return {
            "session_duration": (datetime.now() - self.session_start).total_seconds(),
            "current_agent": self.current_agent_id,
            "current_agent_name": AGENTS[self.current_agent_id]["name"],
            "total_messages": len(self.conversation_history),
            "agent_switches": len(self.agent_switch_history),
            "agents_used": list(set([
                msg["agent_id"] for msg in self.conversation_history
            ]))
        }
    
    def prepare_context_for_agent(self, agent_id: str, include_history: bool = True) -> str:
        """
        Prepare context information for an agent
        
        Args:
            agent_id: ID of the agent
            include_history: Whether to include conversation history
            
        Returns:
            Context string to be included in agent instructions
        """
        context_parts = []
        
        if self.agent_switch_history:
            context_parts.append(
                f"Note: You are {AGENTS[agent_id]['name']}. "
                f"The user has previously spoken with other assistants in this session."
            )
        
        if include_history and self.conversation_history:
            # Summarize recent context
            recent_messages = self.conversation_history[-5:]
            context_parts.append(
                "Recent conversation context: "
                "The user has been discussing various topics. "
                "Please maintain continuity and be aware of the conversation flow."
            )
        
        return " ".join(context_parts)
