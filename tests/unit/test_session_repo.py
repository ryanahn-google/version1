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

"""Unit tests for SessionRepository JSON serialization and UTF-8 encoding."""

import pytest
from sqlalchemy import text

from app.orchestrator.session_repo import SessionRepository


@pytest.mark.asyncio
async def test_session_repo_utf8_json_serialization(tmp_path):
    """Verify that Korean/Unicode characters are stored as raw UTF-8 without unicode escapes."""
    db_file = tmp_path / "test_sessions.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"
    repo = SessionRepository(db_url=db_url)
    await repo.init_db()

    # Create session with Korean text in deliverables and channels
    session = await repo.create_session(
        session_id="test-korean-session",
        brand_name="노바전자",
        product_name="갤럭시 넥스트",
        campaign_objective="글로벌 시장 인지도 확대",
        budget_amount=1000000.0,
        currency="KRW",
        channels=["인스타그램", "유튜브"],
    )
    assert session.sessionId == "test-korean-session"

    # Update session with Korean deliverables conforming to Pydantic schemas
    korean_deliverables = {
        "marketSensing": {
            "targetMarket": "글로벌 스마트폰 시장",
            "consumerTrends": ["온디바이스 AI 선호", "프리미엄 카메라 선호"],
            "competitiveAnalysis": [
                {
                    "competitor": "경쟁사 A",
                    "strengths": ["생태계 락인"],
                    "vulnerabilities": ["AI 기능 도입 지연"],
                }
            ],
            "strategicOpportunities": ["온디바이스 AI 마케팅 선점"],
            "sentimentOverview": {
                "positiveThemes": ["혁신적 디자인"],
                "frictionPoints": ["가격 부담"],
                "overallSentimentScore": 0.85,
            },
        },
    }
    updated = await repo.update_session(
        session_id="test-korean-session",
        deliverables=korean_deliverables,
    )
    assert updated is not None
    assert updated.deliverables.marketSensing is not None
    assert updated.deliverables.marketSensing.targetMarket == "글로벌 스마트폰 시장"

    # Verify raw disk storage in DB table contains unescaped UTF-8 Korean characters
    async with repo.engine.connect() as conn:
        result = await conn.execute(
            text(
                "SELECT deliverables, channels FROM orchestrator_sessions "
                "WHERE session_id = 'test-korean-session'"
            )
        )
        row = result.one()
        raw_deliverables = row[0]
        raw_channels = row[1]

        # Raw DB text must contain actual Korean characters, NOT unicode escape sequences
        assert "글로벌 스마트폰 시장" in raw_deliverables
        assert "온디바이스 AI 선호" in raw_deliverables
        assert "생태계 락인" in raw_deliverables
        assert "\\uae00\\ub85c\\ubc8c" not in raw_deliverables
        assert "인스타그램" in raw_channels
        assert "\\uc778\\uc2a4\\ud0c0" not in raw_channels

    await repo.engine.dispose()


@pytest.mark.asyncio
async def test_list_user_campaigns_returns_summaries(tmp_path):
    """Verify list_user_campaigns returns lightweight CampaignSummaryResponse without full deliverables."""
    db_file = tmp_path / "test_summary_sessions.db"
    db_url = f"sqlite+aiosqlite:///{db_file}"
    repo = SessionRepository(db_url=db_url)
    await repo.init_db()

    # Create a session with full deliverables
    await repo.create_session(
        session_id="camp-summary-001",
        brand_name="Nova Electronics Corp",
        product_name="Galaxy S27 Ultra",
        campaign_objective="Test summary listing",
        budget_amount=500000.0,
        currency="USD",
        channels=["Social Media"],
        user_id="user-123",
    )
    await repo.update_session(
        session_id="camp-summary-001",
        deliverables={
            "marketSensing": {
                "targetMarket": "Premium Smartphones",
                "consumerTrends": ["Trend 1", "Trend 2", "Trend 3"],
                "competitiveAnalysis": [
                    {
                        "competitor": "Comp A",
                        "strengths": ["S1"],
                        "vulnerabilities": ["V1"],
                    }
                ],
                "strategicOpportunities": ["Opp 1"],
                "sentimentOverview": {
                    "positiveThemes": ["Theme 1"],
                    "frictionPoints": ["Friction 1"],
                    "overallSentimentScore": 0.8,
                },
            },
            "creativeContent": {
                "visualConceptTitle": "Next Gen AI",
                "visualPromptUsed": "cinematic prompt",
                "assetUrl": "/api/v1/campaigns/camp-summary-001/visual",
                "headlineCopy": "Next Level AI, Galaxy S27",
                "bodyCopy": "Experience unmatched intelligence.",
                "callToAction": "Pre-order Now",
                "aspectRatio": "16:9",
            },
            "performanceInsights": {
                "totalBudget": 500000.0,
                "currency": "USD",
                "channelAllocations": [
                    {
                        "channel": "Social Media",
                        "allocationAmount": 500000.0,
                        "percentage": 100.0,
                        "rationale": "Max impact",
                    }
                ],
                "projectedKpis": {
                    "estimatedImpressions": 1000000,
                    "estimatedClicks": 50000,
                    "estimatedConversions": 2500,
                    "projectedCtr": 5.0,
                },
                "expectedRoas": 3.8,
                "recommendations": ["Rec 1"],
            },
        },
        user_id="user-123",
    )

    summaries = await repo.list_user_campaigns("user-123")
    assert len(summaries) == 1
    summary = summaries[0]

    # Verify summary fields
    assert summary.sessionId == "camp-summary-001"
    assert summary.brandName == "Nova Electronics Corp"
    assert summary.productName == "Galaxy S27 Ultra"
    assert summary.budgetAmount == 500000.0
    assert summary.expectedRoas == 3.8
    assert summary.creativeAssetUrl == "/api/v1/campaigns/camp-summary-001/visual"
    assert summary.creativeTitle == "Next Gen AI"

    # Verify that deliverables attribute does not exist on summary
    assert not hasattr(summary, "deliverables")

    await repo.engine.dispose()
