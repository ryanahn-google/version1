# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""ADK FunctionTools for Campaign Orchestrator Engine integration."""

import logging
from typing import Any

from app.orchestrator.engine import get_orchestration_engine
from app.schemas.campaign import (
    ApprovalAction,
    CreateCampaignRequest,
    StageApprovalRequest,
)

logger = logging.getLogger(__name__)


async def create_campaign_session(
    brand_name: str,
    product_name: str,
    campaign_objective: str,
    target_audience: str = "General",
    budget_amount: float = 100000.0,
    currency: str = "USD",
    channels: list[str] | None = None,
    language: str = "ko",
    user_id: str | None = None,
) -> dict[str, Any]:
    """Creates a new campaign planning session and runs Stage 1 (Market Sensing).

    Args:
        brand_name: Brand or enterprise name (e.g. 'Nova Electronics').
        product_name: Product or service name (e.g. 'Galaxy S27 Ultra').
        campaign_objective: Campaign core objective or narrative goal.
        target_audience: Target consumer audience demographics or segment.
        budget_amount: Total campaign budget numeric amount.
        currency: ISO currency code ('USD' or 'KRW').
        channels: Target marketing channels (e.g. ['Digital Video', 'Social Media']).
        language: Output language preference ('ko' or 'en').
        user_id: Optional authenticated user ID.

    Returns:
        A dictionary containing sessionId, currentStage, status, and deliverables.
    """
    try:
        engine = get_orchestration_engine()
        req = CreateCampaignRequest(
            brandName=brand_name,
            productName=product_name,
            campaignObjective=campaign_objective,
            targetAudience=target_audience,
            budgetAmount=budget_amount,
            currency=currency,
            channels=channels or ["Digital Video", "Social Media"],
            language=language,
        )
        res = await engine.create_campaign(
            req,
            principal="adk_root_agent",
            user_id=user_id,
        )
        return {
            "success": True,
            "sessionId": res.sessionId,
            "currentStage": res.currentStage.value,
            "status": res.status.value,
            "deliverables": res.deliverables.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.error("create_campaign_session failed: %s", exc, exc_info=True)
        return {
            "success": False,
            "error": str(exc),
        }


async def approve_campaign_stage(
    session_id: str,
    action: str = "approve",
    feedback: str = "",
    user_id: str | None = None,
) -> dict[str, Any]:
    """Approves current stage to advance, or requests revision with feedback.

    Args:
        session_id: The campaign session ID (e.g. 'camp-12345678').
        action: 'approve' to advance to the next stage, or 'revise' to re-run
            current stage with feedback.
        feedback: Feedback or revision guidance for the sub-agents if revising.
        user_id: Optional authenticated user ID.

    Returns:
        A dictionary containing sessionId, currentStage, status, and deliverables.
    """
    try:
        engine = get_orchestration_engine()
        norm_action = (
            ApprovalAction.REVISE
            if action.strip().lower() == "revise"
            else ApprovalAction.APPROVE
        )
        req = StageApprovalRequest(
            action=norm_action,
            feedback=feedback.strip() if feedback else None,
        )
        res = await engine.approve_stage(
            session_id=session_id,
            request=req,
            principal="adk_root_agent",
            user_id=user_id,
        )
        return {
            "success": True,
            "sessionId": res.sessionId,
            "currentStage": res.currentStage.value,
            "status": res.status.value,
            "deliverables": res.deliverables.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.error("approve_campaign_stage failed: %s", exc, exc_info=True)
        return {
            "success": False,
            "error": str(exc),
        }


async def rollback_campaign_stage(
    session_id: str,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Rolls back the campaign session to the immediately preceding stage (N - 1).

    Args:
        session_id: The campaign session ID.
        user_id: Optional authenticated user ID.

    Returns:
        A dictionary containing sessionId, currentStage, and status.
    """
    try:
        engine = get_orchestration_engine()
        res = await engine.rollback_stage(
            session_id=session_id,
            user_id=user_id,
        )
        return {
            "success": True,
            "sessionId": res.sessionId,
            "currentStage": res.currentStage.value,
            "status": res.status.value,
            "deliverables": res.deliverables.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.error("rollback_campaign_stage failed: %s", exc, exc_info=True)
        return {
            "success": False,
            "error": str(exc),
        }


async def get_campaign_status(
    session_id: str,
    user_id: str | None = None,
) -> dict[str, Any]:
    """Retrieves the current stage, status, and deliverables for a campaign.

    Args:
        session_id: The campaign session ID.
        user_id: Optional authenticated user ID.

    Returns:
        A dictionary containing the current campaign session state and deliverables.
    """
    try:
        engine = get_orchestration_engine()
        session = await engine.repo.get_session(
            session_id=session_id,
            user_id=user_id,
        )
        if not session:
            return {
                "success": False,
                "error": f"Campaign session '{session_id}' not found.",
            }
        return {
            "success": True,
            "sessionId": session.sessionId,
            "currentStage": session.currentStage.value,
            "status": session.status.value,
            "deliverables": session.deliverables.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.error("get_campaign_status failed: %s", exc, exc_info=True)
        return {
            "success": False,
            "error": str(exc),
        }


async def parse_campaign_prompt(
    prompt: str,
    language: str = "ko",
) -> dict[str, Any]:
    """Parses natural language requirements into structured campaign parameters.

    Args:
        prompt: Natural language description of the campaign from the marketer.
        language: Preferred output language ('ko' or 'en').

    Returns:
        Structured brief parameters (brand, product, objective, budget, channels).
    """
    try:
        engine = get_orchestration_engine()
        res = await engine.parse_prompt(prompt=prompt, language=language)
        return {
            "success": True,
            "parsed": res.model_dump(mode="json"),
        }
    except Exception as exc:
        logger.error("parse_campaign_prompt failed: %s", exc, exc_info=True)
        return {
            "success": False,
            "error": str(exc),
        }


ORCHESTRATOR_TOOLS = [
    create_campaign_session,
    approve_campaign_stage,
    rollback_campaign_stage,
    get_campaign_status,
    parse_campaign_prompt,
]

__all__ = [
    "ORCHESTRATOR_TOOLS",
    "approve_campaign_stage",
    "create_campaign_session",
    "get_campaign_status",
    "parse_campaign_prompt",
    "rollback_campaign_stage",
]
