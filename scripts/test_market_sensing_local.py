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

"""Local verification script for [P1] Market Sensing Agent and Google Search tool."""

import asyncio
import logging
import os
import sys

# Ensure certificate provider issues are avoided locally
os.environ.setdefault("GOOGLE_API_USE_CLIENT_CERTIFICATE", "false")
os.environ.setdefault("CLOUDSDK_CONTEXT_AWARE_USE_CLIENT_CERTIFICATE", "false")
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "true")
os.environ.setdefault("GOOGLE_CLOUD_LOCATION", "global")
if not os.environ.get("GOOGLE_CLOUD_PROJECT"):
    os.environ["GOOGLE_CLOUD_PROJECT"] = "capstone-staging-506811"

from google.adk.runners import Runner
from google.adk.sessions import InMemorySessionService
from google.genai import types

from app.agents.market_sensing.agent import app as adk_app
from app.schemas.deliverables import MarketSensingDeliverable

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("test_market_sensing")


async def run_single_sensing_test(prompt: str) -> None:
    """Runs a single prompt through Market Sensing Agent and validates output."""
    print("\n" + "=" * 70)
    print("🚀 [P1] Market Sensing Agent Local Tool Calling & Grounding Test")
    print("=" * 70)
    print(f"\n📝 Input Prompt:\n{prompt.strip()}\n")
    print("🔍 Executing Market Sensing with Google Search Grounding enabled...")

    session_service = InMemorySessionService()
    runner = Runner(
        app=adk_app,
        session_service=session_service,
        auto_create_session=True,
    )

    msg = types.Content(role="user", parts=[types.Part.from_text(text=prompt)])
    deliverable_json_text = ""
    grounding_queries: list[str] = []

    async for event in runner.run_async(
        user_id="local-marketer",
        session_id="session-market-sensing-local",
        new_message=msg,
    ):
        gm = getattr(event, "grounding_metadata", None)
        if gm:
            queries = getattr(gm, "web_search_queries", None)
            if queries:
                grounding_queries.extend(queries)

        if hasattr(event, "content") and event.content:
            for part in getattr(event.content, "parts", []):
                if getattr(part, "text", None):
                    deliverable_json_text += part.text

    print("\n" + "-" * 70)
    print("🔎 Google Search Grounding / Tool Calling Verification:")
    if grounding_queries:
        print(
            f"✅ Google Search Tool Executed: {len(grounding_queries)} search queries!"
        )
        for idx, q in enumerate(grounding_queries, 1):
            print(f'   [{idx}] 🌐 Query: "{q}"')
    else:
        print("⚠️ No explicit web_search_queries captured in event metadata.")

    print("-" * 70)
    print("📦 Output Deliverable Validation:")
    try:
        deliverable = MarketSensingDeliverable.model_validate_json(
            deliverable_json_text
        )
        print("✅ Schema Validation: PASSED (MarketSensingDeliverable)")
        print(f"   - Target Market: {deliverable.targetMarket[:80]}...")
        print(f"   - Consumer Trends: {len(deliverable.consumerTrends)} identified")
        for t in deliverable.consumerTrends[:3]:
            print(f"     • {t}")
        print(f"   - Competitors Analyzed: {len(deliverable.competitiveAnalysis)}")
        for comp in deliverable.competitiveAnalysis:
            print(f"     • {comp.competitor}")
        print(
            f"   - Sentiment Score: {deliverable.sentimentOverview.overallSentimentScore}"
        )
        print(
            f"   - Strategic Opportunities: {len(deliverable.strategicOpportunities)}"
        )
        for opp in deliverable.strategicOpportunities[:3]:
            print(f"     • {opp}")
        print("\n" + "=" * 70)
        print("🎉 Market Sensing Agent Test SUCCESSFUL!")
        print("=" * 70 + "\n")
    except Exception as err:
        print(f"❌ Schema validation failed: {err}")
        print(f"Raw response: {deliverable_json_text[:400]}")


async def main() -> None:
    """Main CLI entrypoint."""
    args = sys.argv[1:]
    if "-i" in args or "--interactive" in args:
        print("\n🌐 Market Sensing Interactive Mode (Type 'exit' to quit)")
        while True:
            try:
                user_prompt = input("\nEnter campaign prompt > ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if not user_prompt or user_prompt.lower() in ("exit", "quit"):
                break
            await run_single_sensing_test(user_prompt)
    elif args:
        custom_prompt = " ".join(args)
        await run_single_sensing_test(custom_prompt)
    else:
        default_prompt = (
            "Brand: Nova Electronics Corp\n"
            "Product: Galaxy S27 Ultra\n"
            "Objective: Launch new AI flagship smartphone in late 2026\n"
            "Target Audience: Global tech enthusiasts and premium mobile power users\n"
            "Please search Google for latest 2026 competitor flagships, industry trends, and user sentiment.\n"
        )
        await run_single_sensing_test(default_prompt)


if __name__ == "__main__":
    asyncio.run(main())
