"""
LLM Provider Abstraction.

Supports swappable LLM engines:
- Ollama (Local free inference for development)
- OpenAI (GPT-4o / GPT-4o-mini for cloud production)
- Anthropic (Claude 3.5 Sonnet)
- Mock / Rule-based Fallback (for deterministic unit tests)
"""

import json
import re
from abc import ABC, abstractmethod
from typing import Any

import httpx

from agent.config import config


class BaseLLMProvider(ABC):
    """Abstract interface for LLM backends."""

    @abstractmethod
    async def generate_tool_call(
        self,
        user_prompt: str,
        available_tools: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        """
        Reason about the user request and return structured tool invocation.
        Returns:
            dict containing:
            {
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": 101},
                "thought": "I need to fetch customer profile data"
            }
            or
            {
                "final_answer": "...",
                "thought": "..."
            }
        """
        pass


class OllamaProvider(BaseLLMProvider):
    """Local Ollama LLM provider."""

    def __init__(self, base_url: str = config.ollama_base_url, model: str = config.ollama_model):
        self.base_url = base_url.rstrip("/")
        self.model = model

    async def generate_tool_call(
        self,
        user_prompt: str,
        available_tools: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        tools_desc = json.dumps(available_tools, indent=2)
        system_prompt = (
            "You are an autonomous AI Agent with access to tools. "
            "Given a user instruction and available tools, you MUST return a valid JSON object.\n"
            "If you need to call a tool, respond ONLY with:\n"
            "{\n"
            '  "thought": "your step-by-step reasoning",\n'
            '  "tool": "tool_name",\n'
            '  "operation": "operation_name",\n'
            '  "parameters": {"param1": "val1"}\n'
            "}\n"
            "If no tool is needed or you are formulating the final answer, respond ONLY with:\n"
            "{\n"
            '  "thought": "reasoning",\n'
            '  "final_answer": "your message to user"\n'
            "}\n"
            f"AVAILABLE TOOLS:\n{tools_desc}"
        )

        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{self.base_url}/api/chat",
                    json={
                        "model": self.model,
                        "messages": messages,
                        "stream": False,
                        "format": "json",
                    },
                )
                if res.status_code == 200:
                    content = res.json()["message"]["content"]
                    return json.loads(content)
                else:
                    return {
                        "thought": f"Ollama error: HTTP {res.status_code}",
                        "final_answer": f"Failed to connect to local LLM: {res.text}",
                    }
        except Exception as e:
            return {
                "thought": f"Ollama connection exception: {str(e)}",
                "final_answer": f"Ollama offline: {str(e)}",
            }


class OpenAIProvider(BaseLLMProvider):
    """OpenAI / OpenAI-compatible Cloud LLM provider."""

    def __init__(
        self,
        api_key: str = config.openai_api_key,
        model: str = config.openai_model,
        base_url: str = config.openai_base_url,
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url.rstrip("/")

    async def generate_tool_call(
        self,
        user_prompt: str,
        available_tools: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        tools_desc = json.dumps(available_tools, indent=2)
        system_prompt = (
            "You are an autonomous AI Agent with access to tools. "
            "You MUST respond ONLY with valid JSON.\n"
            "Format for tool call:\n"
            '{"thought": "...", "tool": "...", "operation": "...", "parameters": {...}}\n'
            "Format for final answer:\n"
            '{"thought": "...", "final_answer": "..."}\n'
            f"AVAILABLE TOOLS:\n{tools_desc}"
        )

        messages = [{"role": "system", "content": system_prompt}]
        if conversation_history:
            messages.extend(conversation_history)
        messages.append({"role": "user", "content": user_prompt})

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                res = await client.post(
                    f"{self.base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    json={
                        "model": self.model,
                        "messages": messages,
                        "response_format": {"type": "json_object"},
                    },
                )
                if res.status_code == 200:
                    content = res.json()["choices"][0]["message"]["content"]
                    return json.loads(content)
                else:
                    return {
                        "thought": f"OpenAI error: HTTP {res.status_code}",
                        "final_answer": f"OpenAI error: {res.text}",
                    }
        except Exception as e:
            return {
                "thought": f"OpenAI connection exception: {str(e)}",
                "final_answer": f"OpenAI connection error: {str(e)}",
            }


class RuleBasedMockProvider(BaseLLMProvider):
    """
    Deterministic rule-based reasoning engine for testing and demo execution.
    Parses user natural language instructions and translates them to structured tool calls.
    """

    async def generate_tool_call(
        self,
        user_prompt: str,
        available_tools: list[dict[str, Any]],
        conversation_history: list[dict[str, str]] | None = None,
    ) -> dict[str, Any]:
        prompt_lower = user_prompt.lower()

        # 1. Customer Authentication
        if "auth" in prompt_lower or "authenticate" in prompt_lower or "login" in prompt_lower:
            match = re.search(r"(\d+)", user_prompt)
            cust_id = int(match.group(1)) if match else 101
            return {
                "thought": f"User wants to authenticate customer {cust_id}.",
                "tool": "customer_database",
                "operation": "authenticate",
                "parameters": {"customer_id": cust_id},
            }

        # 2. Customer Profile Query
        if "customer" in prompt_lower or "balance" in prompt_lower or "account" in prompt_lower:
            match = re.search(r"(\d+)", user_prompt)
            cust_id = int(match.group(1)) if match else 101
            # Check for SQL injection in prompt
            if "drop table" in prompt_lower or "--" in user_prompt:
                return {
                    "thought": "Processing customer update with user supplied note parameter.",
                    "tool": "customer_database",
                    "operation": "update_customer",
                    "parameters": {"customer_id": cust_id, "notes": "'; DROP TABLE customers;--"},
                }
            return {
                "thought": f"Fetching details for customer {cust_id}.",
                "tool": "customer_database",
                "operation": "get_customer",
                "parameters": {"customer_id": cust_id},
            }

        # 3. Email Dispatch
        if "email" in prompt_lower or "send" in prompt_lower or "notify" in prompt_lower:
            email_match = re.search(r"[\w\.-]+@[\w\.-]+", user_prompt)
            recipient = email_match.group(0) if email_match else "admin@example.com"
            return {
                "thought": f"Sending notification email to {recipient}.",
                "tool": "email_service",
                "operation": "send",
                "parameters": {
                    "recipient": recipient,
                    "subject": "System Notice",
                    "body": "Automated update notification.",
                    "email_type": "internal",
                },
            }

        # 4. File Operations
        if "file" in prompt_lower or "read" in prompt_lower or "log" in prompt_lower:
            path_match = re.search(r"(/[a-zA-Z0-9_\-\.\/]+)", user_prompt)
            path = path_match.group(0) if path_match else "/data/public/readme.txt"
            return {
                "thought": f"Reading file content at {path}.",
                "tool": "file_service",
                "operation": "read",
                "parameters": {"file_path": path},
            }

        return {
            "thought": "Direct informational response.",
            "final_answer": f"I received your request: '{user_prompt}'. How can I assist you further?",
        }


def get_llm_provider() -> BaseLLMProvider:
    """Factory to instantiate the active LLM provider."""
    provider = config.llm_provider.lower()
    if provider == "openai" and config.openai_api_key:
        return OpenAIProvider()
    elif provider == "ollama":
        return OllamaProvider()
    return RuleBasedMockProvider()
