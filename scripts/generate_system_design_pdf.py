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

"""Publication-grade PDF Generator for Nova Electronics MVC v1.0 System Architecture.

Produces an 11-page comprehensive system design and architecture specification,
replacing all deprecated references to 'Vertex AI' with 'Agent Platform',
removing the deprecated Cloud SQL relational schema page, and adding dedicated
system design sections for GCP Multi-Project Environment Architecture,
Critical User Journeys (CUJ-1 and CUJ-2), and Agent Platform Enterprise Governance,
Security & Observability.
"""

import io
import os
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject
from reportlab.graphics.shapes import Drawing, Line, Rect, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

PAGE_WIDTH, PAGE_HEIGHT = landscape(A4)  # 841.8898 x 595.2756 pt
PRINTABLE_WIDTH = PAGE_WIDTH - 72  # 769.89 pt -> 770 pt


def get_styles():
    """Builds and returns paragraph styles for the report."""
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "SectionTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=19,
        textColor=colors.HexColor("#202124"),
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "SectionSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#5F6368"),
        spaceAfter=8,
    )
    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#202124"),
    )
    table_cell_bold = ParagraphStyle(
        "TableCellBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#202124"),
    )
    table_cell_style = ParagraphStyle(
        "TableCell",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#3C4043"),
    )
    return {
        "title": title_style,
        "sub": sub_style,
        "th": table_header_style,
        "td_bold": table_cell_bold,
        "td": table_cell_style,
    }


def draw_card(
    d: Drawing,
    x: float,
    y: float,
    w: float,
    h: float,
    header_title: str,
    header_bg: str,
    subtitle: str,
    bullets: list[str],
    badge_text: str = "",
    badge_color: str = "#15803D",
):
    """Draws a standardized enterprise architecture card in a Drawing."""
    # Body background & border
    d.add(
        Rect(
            x,
            y,
            w,
            h,
            rx=6,
            ry=6,
            fillColor=colors.white,
            strokeColor=colors.HexColor(header_bg),
            strokeWidth=1.2,
        )
    )
    # Header bar
    header_h = 24
    d.add(
        Rect(
            x,
            y + h - header_h,
            w,
            header_h,
            rx=6,
            ry=6,
            fillColor=colors.HexColor(header_bg),
            strokeColor=colors.HexColor(header_bg),
            strokeWidth=0,
        )
    )
    d.add(
        Rect(
            x,
            y + h - header_h,
            w,
            6,
            fillColor=colors.HexColor(header_bg),
            strokeColor=colors.HexColor(header_bg),
            strokeWidth=0,
        )
    )
    # Header text
    d.add(
        String(
            x + w / 2,
            y + h - 16,
            header_title,
            fontName="Helvetica-Bold",
            fontSize=8.5,
            fillColor=colors.white,
            textAnchor="middle",
        )
    )

    # Subtitle
    cur_y = y + h - header_h - 14
    if subtitle:
        d.add(
            String(
                x + 8,
                cur_y,
                subtitle,
                fontName="Helvetica-Bold",
                fontSize=7.8,
                fillColor=colors.HexColor("#1E293B"),
            )
        )
        cur_y -= 13.5

    # Bullets
    for b in bullets:
        d.add(
            String(
                x + 8,
                cur_y,
                b,
                fontName="Helvetica",
                fontSize=7.2,
                fillColor=colors.HexColor("#334155"),
            )
        )
        cur_y -= 11.2

    # Badge at bottom
    if badge_text:
        d.add(
            String(
                x + 8,
                y + 8,
                badge_text,
                fontName="Helvetica-Bold",
                fontSize=7.0,
                fillColor=colors.HexColor(badge_color),
            )
        )


def build_page_4_gcp(s):
    """Builds Page 4: 3. Multi-Project GCP Environment & Enterprise Infrastructure Architecture."""
    p_title = Paragraph(
        "3. Multi-Project GCP Environment & Enterprise Infrastructure Architecture",
        s["title"],
    )
    p_sub = Paragraph(
        "Enterprise multi-project topology, Direct VPC Egress, Cloud SQL Auth Proxy, and Private DRS Artifact Storage.",
        s["sub"],
    )

    d = Drawing(770, 215)
    d.add(
        Rect(
            0,
            0,
            770,
            215,
            rx=8,
            ry=8,
            fillColor=colors.HexColor("#F8FAFC"),
            strokeColor=colors.HexColor("#DADCE0"),
            strokeWidth=1.5,
        )
    )
    d.add(
        String(
            16,
            195,
            "Enterprise Multi-Project Topology & Infrastructure Perimeter (Google Cloud)",
            fontName="Helvetica-Bold",
            fontSize=11,
            fillColor=colors.HexColor("#70757A"),
        )
    )

    card_w = 175
    card_h = 165
    y_pos = 18

    # Card 1: CI/CD Hub
    draw_card(
        d,
        14,
        y_pos,
        card_w,
        card_h,
        "CI/CD Hub: capstone-cicd",
        "#1E293B",
        "Cloud Build 2nd Gen Runner",
        [
            "• Artifact Registry: version1-repo",
            "• Cloud Build Triggers (PR, CD)",
            "• Gate 1: 119 Pytest & Schema Check",
            "• Secret Manager (OAuth, DB Keys)",
            "• IAM Workload Identity Federation",
            "• Automated Deploy to Staging",
        ],
        badge_text="✓ Zero-Trust CI/CD Runner",
        badge_color="#15803D",
    )

    # Card 2: Staging Project
    draw_card(
        d,
        202,
        y_pos,
        card_w,
        card_h,
        "Staging: capstone-staging-506811",
        "#1E40AF",
        "Pre-Production Verification",
        [
            "• Cloud Run: version1 (Seoul)",
            "• Cloud SQL: PG 15 (10.10.0.x)",
            "• GCS: capstone-staging-artifacts",
            "• Gate 2: scripts/eval_gate.py",
            "• 9 Golden Scenarios (Judge >= 4.0)",
            "• 30s Locust Headless Soak Load Test",
        ],
        badge_text="✓ Dual Quality Gate Enforced",
        badge_color="#1D4ED8",
    )

    # Card 3: Production Project
    draw_card(
        d,
        390,
        y_pos,
        card_w,
        card_h,
        "Production: capstone-prod-506811",
        "#15803D",
        "Live High-Availability Runtime",
        [
            "• Cloud Run: version1 (Seoul)",
            "• Scale-to-Zero (min=0, max=10)",
            "• Cloud SQL PG 15 Auth Proxy Socket",
            "• GCS: capstone-prod-artifacts (DRS)",
            "• Gate 3: Cloud Build Manual Sign-Off",
            "• BigQuery Telemetry Sink: completions",
        ],
        badge_text="✓ 99.5% SLO Enterprise SLA",
        badge_color="#15803D",
    )

    # Card 4: Network & Shared AI Platform
    draw_card(
        d,
        578,
        y_pos,
        card_w,
        card_h,
        "asia-northeast3 & Global AI",
        "#B45309",
        "VPC Network & Agent Platform",
        [
            "• Direct VPC Egress: 10.10.0.0/24",
            "• Cloud NAT & Router: Default-Deny",
            "• Agent Platform Runtime (Seoul)",
            "• Model Armor (US Multi-Region)",
            "• Foundation Models (global pool)",
            "• Private Google Access (PGA)",
        ],
        badge_text="✓ Zero Public DB / Global Pool",
        badge_color="#B45309",
    )

    # Connectors between CI/CD -> Staging -> Prod
    d.add(
        Line(
            189,
            110,
            199,
            110,
            strokeColor=colors.HexColor("#1D4ED8"),
            strokeWidth=1.5,
        )
    )
    d.add(
        Line(
            196,
            107,
            199,
            110,
            strokeColor=colors.HexColor("#1D4ED8"),
            strokeWidth=1.5,
        )
    )
    d.add(
        Line(
            196,
            113,
            199,
            110,
            strokeColor=colors.HexColor("#1D4ED8"),
            strokeWidth=1.5,
        )
    )
    d.add(
        Line(
            377,
            110,
            387,
            110,
            strokeColor=colors.HexColor("#15803D"),
            strokeWidth=1.5,
        )
    )
    d.add(
        Line(
            384,
            107,
            387,
            110,
            strokeColor=colors.HexColor("#15803D"),
            strokeWidth=1.5,
        )
    )
    d.add(
        Line(
            384,
            113,
            387,
            110,
            strokeColor=colors.HexColor("#15803D"),
            strokeWidth=1.5,
        )
    )

    # Bottom bus
    d.add(
        Line(
            100,
            10,
            670,
            10,
            strokeColor=colors.HexColor("#CBD5E1"),
            strokeWidth=1,
            strokeDashArray=[3, 3],
        )
    )
    d.add(
        String(
            385,
            4,
            "Shared Google Cloud Backbone: Direct VPC Egress • Private Google Access • Agent Platform Foundation Models",
            fontName="Helvetica",
            fontSize=6.5,
            fillColor=colors.HexColor("#64748B"),
            textAnchor="middle",
        )
    )

    # Table
    headers = [
        Paragraph("<b>Infrastructure Dimension</b>", s["th"]),
        Paragraph("<b>GCP Implementation & Resources</b>", s["th"]),
        Paragraph("<b>Security & Isolation Boundary</b>", s["th"]),
        Paragraph("<b>Operational Rationale & SLA</b>", s["th"]),
    ]
    rows = [
        [
            Paragraph("Multi-Project Topology", s["td_bold"]),
            Paragraph(
                "<code>capstone-cicd</code><br/><code>capstone-staging-506811</code><br/><code>capstone-prod-506811</code>",
                s["td"],
            ),
            Paragraph(
                "Strict IAM project boundary; CI/CD runner uses Workload Identity; no shared credentials across staging and prod.",
                s["td"],
            ),
            Paragraph(
                "Total blast-radius containment; automated promotion gates prevent unverified staging code from touching prod.",
                s["td"],
            ),
        ],
        [
            Paragraph("Direct VPC Egress & Cloud NAT", s["td_bold"]),
            Paragraph(
                "<code>version1-vpc</code> (10.10.0.0/24)<br/><code>version1-nat</code> + Cloud Router",
                s["td"],
            ),
            Paragraph(
                "Zero-Trust firewall (Default Deny 65000); egress whitelisted strictly for TCP 443 (APIs), TCP 3307 (DB), TCP/UDP 53 (DNS).",
                s["td"],
            ),
            Paragraph(
                "Eliminates Serverless VPC Access connector bottleneck; avoids 200ms cold-start penalty and routing deadlocks.",
                s["td"],
            ),
        ],
        [
            Paragraph("Cloud SQL Private Access", s["td_bold"]),
            Paragraph(
                "PostgreSQL 15 (db-f1-micro)<br/>Cloud SQL Auth Proxy Unix Socket",
                s["td"],
            ),
            Paragraph(
                "Zero public IP exposure; Auth Proxy Unix socket at <code>/cloudsql</code> with ephemeral mTLS certificate exchange.",
                s["td"],
            ),
            Paragraph(
                "Robust session persistence in <code>orchestrator_sessions</code>; connection pool (size 10, max overflow 20).",
                s["td"],
            ),
        ],
        [
            Paragraph("DRS Storage & Asset Proxy", s["td_bold"]),
            Paragraph(
                "GCS <code>capstone-{env}-artifacts</code><br/>Authenticated HTTP 307 Proxy",
                s["td"],
            ),
            Paragraph(
                "100% private GCS bucket enforcing DRS Org Policy (no <code>allUsers</code>); Signed URL proxy with 1h TTL.",
                s["td"],
            ),
            Paragraph(
                "Zero Cloud Run egress cost and memory overhead; automated 30-day lifecycle deletion of generated assets.",
                s["td"],
            ),
        ],
    ]

    t = Table([headers, *rows], colWidths=[140, 180, 260, 190])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F0FE")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
                (
                    "LINEBELOW",
                    (0, 0),
                    (-1, 0),
                    1.2,
                    colors.HexColor("#1A73E8"),
                ),
            ]
        )
    )
    return p_title, p_sub, d, t


def build_page_6_cuj1(s):
    """Builds Page 6: 5. Critical User Journey 1 (CUJ-1): End-to-End Campaign Creation & HITL Review."""
    p_title = Paragraph(
        "5. Critical User Journey 1 (CUJ-1): End-to-End Campaign Creation & HITL Review",
        s["title"],
    )
    p_sub = Paragraph(
        "Step-by-step user and multi-agent interaction lifecycle from natural language objective to approved campaign.",
        s["sub"],
    )

    d = Drawing(770, 215)
    d.add(
        Rect(
            0,
            0,
            770,
            215,
            rx=8,
            ry=8,
            fillColor=colors.HexColor("#F8FAFC"),
            strokeColor=colors.HexColor("#DADCE0"),
            strokeWidth=1.5,
        )
    )
    d.add(
        String(
            16,
            195,
            "Critical User Journey 1: End-to-End Campaign Creation & HITL Lifecycle Flow",
            fontName="Helvetica-Bold",
            fontSize=11,
            fillColor=colors.HexColor("#70757A"),
        )
    )

    card_w = 140
    card_h = 165
    y_pos = 18

    # Card 1: Stage 0
    draw_card(
        d,
        14,
        y_pos,
        card_w,
        card_h,
        "Stage 0: Ingress Guard",
        "#0E7490",
        "Prompt Input & Safety",
        [
            "• Marketer enters prompt",
            "• Brand, product, budget",
            "• Model Armor inspection",
            "• Prompt injection check",
            "• Low+ / SDP blocking",
            "• Session initialized in DB",
        ],
        badge_text="✓ Fail-Closed Verified",
        badge_color="#0E7490",
    )

    # Card 2: Stage 1
    draw_card(
        d,
        166,
        y_pos,
        card_w,
        card_h,
        "Stage 1: Market Sensing",
        "#1D4ED8",
        "Grounded Trend Radar",
        [
            "• Direct A2A dispatch",
            "• Google Search Tool",
            "• Live market fact snippets",
            "• Competitor SWOT JSON",
            "• market_sensing.json",
            "• Status: PAUSED",
        ],
        badge_text="✓ HITL Gate 1 Review",
        badge_color="#1D4ED8",
    )

    # Card 3: Stage 2
    draw_card(
        d,
        318,
        y_pos,
        card_w,
        card_h,
        "Stage 2: Strategy Brief",
        "#4338CA",
        "Pillars & Audience",
        [
            "• Marketer clicks Approve",
            "• [P2] Strategy synthesis",
            "• Target persona mapping",
            "• Strategic narrative",
            "• campaign_brief.json",
            "• Status: PAUSED",
        ],
        badge_text="✓ HITL Gate 2 Review",
        badge_color="#4338CA",
    )

    # Card 4: Stage 3
    draw_card(
        d,
        470,
        y_pos,
        card_w,
        card_h,
        "Stage 3: Creative Content",
        "#BE123C",
        "Copy + Nano Banana 2",
        [
            "• Marketer clicks Approve",
            "• [P3] Copywriting synth",
            "• Nano Banana 2 Lite visual",
            "• In-memory draft preview",
            "• /draft-image endpoint",
            "• Approved -> Stored GCS",
        ],
        badge_text="✓ HITL Gate 3 Review",
        badge_color="#BE123C",
    )

    # Card 5: Stage 4 & 5
    draw_card(
        d,
        622,
        y_pos,
        card_w,
        card_h,
        "Stage 4 & 5: Execution",
        "#047857",
        "ROAS & Final Sign-Off",
        [
            "• [P4] Performance insights",
            "• Expected ROAS forecast",
            "• 100.0% Budget normalizer",
            "• Final Marketer sign-off",
            "• Media execution trigger",
            "• Status: COMPLETED",
        ],
        badge_text="✓ 100.0% Budget Match",
        badge_color="#047857",
    )

    # Connecting arrows between stages
    for arrow_x in [154, 306, 458, 610]:
        d.add(
            Line(
                arrow_x + 1,
                110,
                arrow_x + 11,
                110,
                strokeColor=colors.HexColor("#1A73E8"),
                strokeWidth=1.5,
            )
        )
        d.add(
            Line(
                arrow_x + 7,
                107,
                arrow_x + 11,
                110,
                strokeColor=colors.HexColor("#1A73E8"),
                strokeWidth=1.5,
            )
        )
        d.add(
            Line(
                arrow_x + 7,
                113,
                arrow_x + 11,
                110,
                strokeColor=colors.HexColor("#1A73E8"),
                strokeWidth=1.5,
            )
        )

    # Bottom guidance text
    d.add(
        String(
            385,
            4,
            "Marketer Review & Control Loop: Approve advances to next stage • Revise triggers feedback re-execution • Rollback restores N-1 snapshot",
            fontName="Helvetica",
            fontSize=6.5,
            fillColor=colors.HexColor("#64748B"),
            textAnchor="middle",
        )
    )

    # Table
    headers = [
        Paragraph("<b>Journey Phase</b>", s["th"]),
        Paragraph("<b>User Action & UI Event</b>", s["th"]),
        Paragraph("<b>Orchestrator & Subagent Action</b>", s["th"]),
        Paragraph("<b>Verification & Contract SLA</b>", s["th"]),
    ]
    rows = [
        [
            Paragraph("Phase 1: Inception & Pre-Flight", s["td_bold"]),
            Paragraph(
                "Enters campaign objective, budget ($/KRW), and product in React 19 UI -> Clicks 'Create Campaign'.",
                s["td"],
            ),
            Paragraph(
                "Passes prompt to Model Armor; validates schema; creates session record in Cloud SQL <code>orchestrator_sessions</code>.",
                s["td"],
            ),
            Paragraph(
                "Prompt injection score < LOW; HTTP 400 rejection on violation; pre-flight latency < 450ms.",
                s["td"],
            ),
        ],
        [
            Paragraph("Phase 2: Sensing & Strategy", s["td_bold"]),
            Paragraph(
                "Reviews competitor matrix, SWOT findings, and trend radar -> Clicks 'Approve Stage'.",
                s["td"],
            ),
            Paragraph(
                "[P1] executes Google Search grounding -> <code>market_sensing.json</code>; [P2] synthesizes <code>campaign_brief.json</code>.",
                s["td"],
            ),
            Paragraph(
                "100% Pydantic validation; intermediate state persisted; status set to <code>PAUSED_FOR_REVIEW</code>.",
                s["td"],
            ),
        ],
        [
            Paragraph("Phase 3: Creative & Visual", s["td_bold"]),
            Paragraph(
                "Reviews advertising headline, body copy, and visual mockup preview image in browser.",
                s["td"],
            ),
            Paragraph(
                "[P3] generates ad copy; Nano Banana 2 Lite renders visual; served via <code>/draft-image</code>; approved to GCS.",
                s["td"],
            ),
            Paragraph(
                "Visual generation latency < 8.0s; asset stored in DRS private GCS; signed URL 307 redirect.",
                s["td"],
            ),
        ],
        [
            Paragraph("Phase 4: Insights & Final Sign-Off", s["td_bold"]),
            Paragraph(
                "Inspects ROAS projections, CPA forecast, and channel budget allocation table -> Clicks 'Final Approval'.",
                s["td"],
            ),
            Paragraph(
                "[P4] computes KPIs; applies deterministic budget normalizer; finalizes campaign to <code>COMPLETED</code>.",
                s["td"],
            ),
            Paragraph(
                "Strict 100.0% mathematical budget conservation (sum == budget); zero arithmetic hallucination.",
                s["td"],
            ),
        ],
    ]

    t = Table([headers, *rows], colWidths=[140, 180, 260, 190])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F0FE")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
                (
                    "LINEBELOW",
                    (0, 0),
                    (-1, 0),
                    1.2,
                    colors.HexColor("#1A73E8"),
                ),
            ]
        )
    )
    return p_title, p_sub, d, t


def build_page_7_cuj2(s):
    """Builds Page 7: 6. Critical User Journey 2 (CUJ-2): Marketer Revision, Rollback (N-1) & Fallback Recovery."""
    p_title = Paragraph(
        "6. Critical User Journey 2 (CUJ-2): Marketer Revision, Rollback (N-1) & Fallback Recovery",
        s["title"],
    )
    p_sub = Paragraph(
        "Human feedback loops, deterministic single-step rollback (N->N-1), and resilient subagent fallback chains.",
        s["sub"],
    )

    d = Drawing(770, 215)
    d.add(
        Rect(
            0,
            0,
            770,
            215,
            rx=8,
            ry=8,
            fillColor=colors.HexColor("#F8FAFC"),
            strokeColor=colors.HexColor("#DADCE0"),
            strokeWidth=1.5,
        )
    )
    d.add(
        String(
            16,
            195,
            "Critical User Journey 2: Human Revision, Deterministic Rollback & Fault-Tolerant Recovery",
            fontName="Helvetica-Bold",
            fontSize=11,
            fillColor=colors.HexColor("#70757A"),
        )
    )

    panel_w = 236
    panel_h = 165
    y_pos = 18

    # Panel 1: Revision Flow
    draw_card(
        d,
        14,
        y_pos,
        panel_w,
        panel_h,
        "Flow A: Marketer Feedback Revision",
        "#D97706",
        "Iterative Prompt & Context Refinement",
        [
            "• Marketer enters feedback in Web UI (e.g. adjust audience)",
            "• POST /api/v1/campaigns/{sessionId}/approve (action='revise')",
            "• Intermediate deliverable snapshotted to session_history",
            "• Current subagent re-executes with user revision feedback",
            "• Stage 3: Atomically purges in-memory draft visual cache",
            "• State resets to PAUSED_FOR_REVIEW for re-inspection",
        ],
        badge_text="✓ Atomic In-Memory Draft Cache Invalidation",
        badge_color="#D97706",
    )

    # Panel 2: Rollback Flow
    draw_card(
        d,
        264,
        y_pos,
        panel_w,
        panel_h,
        "Flow B: Deterministic Rollback (N -> N-1)",
        "#7C3AED",
        "Single-Step Historical State Recovery",
        [
            "• Marketer clicks 'Rollback to Previous Stage' in UI",
            "• POST /api/v1/campaigns/{sessionId}/rollback",
            "• Verifies stage boundary (N in [2, 5]); fetches N-1 snapshot",
            "• Restores deliverables JSONB and decrements current_stage",
            "• Zero upstream re-computation; instantaneous recovery (<100ms)",
            "• Decrements revision_count; maintains strict audit trail",
        ],
        badge_text="✓ Zero Hallucination • Idempotent State Restoration",
        badge_color="#7C3AED",
    )

    # Panel 3: Fallback Flow
    draw_card(
        d,
        514,
        y_pos,
        panel_w + 6,
        panel_h,
        "Flow C: Runtime Fallback & Error Resilience",
        "#0D9488",
        "Multi-Tier Model & Engine Fault Tolerance",
        [
            "• Model Quota / Timeout: HTTP 429 / 503 / network timeout",
            "• Exponential Backoff with Jitter (initial 1.0s, max 3 retries)",
            "• Model Fallback: Gemini 3.5 Flash Lite -> 3.1 Pro -> Template",
            "• A2A Fallback: Direct Agent Runtime -> Engine fallback",
            "• Emits span trace to Cloud Trace & BigQuery completions sink",
            "• Zero user-facing 500 internal server errors guaranteed",
        ],
        badge_text="✓ 100% High-Availability Resilience SLA",
        badge_color="#0D9488",
    )

    # Bottom guidance text
    d.add(
        String(
            385,
            4,
            "Resilience Architecture: Zero State Loss • In-Memory Draft Protection • Automated Multi-Tier Graceful Degradation",
            fontName="Helvetica",
            fontSize=6.5,
            fillColor=colors.HexColor("#64748B"),
            textAnchor="middle",
        )
    )

    # Table
    headers = [
        Paragraph("<b>Resilience Flow</b>", s["th"]),
        Paragraph("<b>Trigger Endpoint & Condition</b>", s["th"]),
        Paragraph("<b>State Machine Transition</b>", s["th"]),
        Paragraph("<b>Data Integrity & Fallback Guarantee</b>", s["th"]),
    ]
    rows = [
        [
            Paragraph("Marketer Feedback Revision", s["td_bold"]),
            Paragraph(
                "<code>POST /api/v1/campaigns/{sessionId}/approve</code><br/>(action='revise', feedback='...')",
                s["td"],
            ),
            Paragraph(
                "Current stage subagent re-runs with feedback; revision counter increments; status resets to <code>PAUSED_FOR_REVIEW</code>.",
                s["td"],
            ),
            Paragraph(
                "Feedback persisted to <code>session_history</code>; in-memory draft image purged in Stage 3 to prevent stale visual reuse.",
                s["td"],
            ),
        ],
        [
            Paragraph("Deterministic N-1 Rollback", s["td_bold"]),
            Paragraph(
                "<code>POST /api/v1/campaigns/{sessionId}/rollback</code><br/>(invoked from Stage N in [2, 5])",
                s["td"],
            ),
            Paragraph(
                "Current stage decrements N -> N-1; restores previous deliverable snapshot from <code>session_history</code>.",
                s["td"],
            ),
            Paragraph(
                "Instantaneous (<100ms); zero upstream re-computation; strictly idempotent rollback operation.",
                s["td"],
            ),
        ],
        [
            Paragraph("Model Fallback & Jitter Retry", s["td_bold"]),
            Paragraph(
                "Transient HTTP 429 / 503 / timeout on Agent Platform foundation model API",
                s["td"],
            ),
            Paragraph(
                "Transparent retry with jitter (1s, 2s, 4s); automatic fallback to secondary model tier.",
                s["td"],
            ),
            Paragraph(
                "Zero interruption to marketer UI; failure modes logged to BigQuery telemetry sink.",
                s["td"],
            ),
        ],
        [
            Paragraph("ADK Engine Fallback", s["td_bold"]),
            Paragraph(
                "Direct Agent Runtime RPC failure or schema serialization exception",
                s["td"],
            ),
            Paragraph(
                "Falls back to in-process deterministic orchestrator engine (<code>app/orchestrator/engine.py</code>).",
                s["td"],
            ),
            Paragraph(
                "100% availability guarantee; eliminates user-facing 500 internal server errors.",
                s["td"],
            ),
        ],
    ]

    t = Table([headers, *rows], colWidths=[140, 180, 260, 190])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F0FE")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
                (
                    "LINEBELOW",
                    (0, 0),
                    (-1, 0),
                    1.2,
                    colors.HexColor("#1A73E8"),
                ),
            ]
        )
    )
    return p_title, p_sub, d, t


def build_page_10_governance(s):
    """Builds Page 10: 9. Agent Platform Enterprise Governance, Security & Observability."""
    p_title = Paragraph(
        "9. Agent Platform Enterprise Governance, Security & Observability",
        s["title"],
    )
    p_sub = Paragraph(
        "Isolated sandbox runtime, Agent Gateway Model Armor integration, SPIFFE cryptographic identity, unified telemetry, and native eval framework.",
        s["sub"],
    )

    d = Drawing(770, 215)
    d.add(
        Rect(
            0,
            0,
            770,
            215,
            rx=8,
            ry=8,
            fillColor=colors.HexColor("#F8FAFC"),
            strokeColor=colors.HexColor("#DADCE0"),
            strokeWidth=1.5,
        )
    )
    d.add(
        String(
            16,
            195,
            "Agent Platform Enterprise Governance, Security & Observability Perimeter",
            fontName="Helvetica-Bold",
            fontSize=11,
            fillColor=colors.HexColor("#70757A"),
        )
    )

    card_w = 140
    card_h = 165
    y_pos = 18

    # Card 1: Sandbox Runtime Isolation
    draw_card(
        d,
        14,
        y_pos,
        card_w,
        card_h,
        "1. Sandbox Runtime",
        "#0E7490",
        "gVisor / Kernel Isolation",
        [
            "• Isolated container sandbox",
            "• Hardened syscall filtering",
            "• Dynamic tool execution safety",
            "• Memory & FS containment",
            "• Zero lateral movement risk",
            "• Scale-to-zero compute (min=0)",
        ],
        badge_text="✓ gVisor Isolated Boundary",
        badge_color="#0E7490",
    )

    # Card 2: Gateway & Model Armor Perimeter
    draw_card(
        d,
        166,
        y_pos,
        card_w,
        card_h,
        "2. Gateway & Guardrails",
        "#B91C1C",
        "Model Armor Perimeter",
        [
            "• Agent Gateway CLIENT_TO_AGENT",
            "• Service Extensions CONTENT_AUTHZ",
            "• Model Armor fail-closed policy",
            "• Prompt injection & jailbreak block",
            "• Sensitive data (SDP) PII defense",
            "• Non-bypassable security ingress",
        ],
        badge_text="✓ Zero-Bypass Guardrails",
        badge_color="#B91C1C",
    )

    # Card 3: SPIFFE Agent Identity
    draw_card(
        d,
        318,
        y_pos,
        card_w,
        card_h,
        "3. SPIFFE Identity",
        "#4338CA",
        "Per-Agent Authentication",
        [
            "• --agent-identity CLI flag",
            "• Dedicated subagent SA credentials",
            "• Zero static API keys or secrets",
            "• Cryptographic mTLS attestation",
            "• TokenCreator IAM delegation",
            "• Granular resource permissions",
        ],
        badge_text="✓ Cryptographic Identity",
        badge_color="#4338CA",
    )

    # Card 4: Unified Telemetry
    draw_card(
        d,
        470,
        y_pos,
        card_w,
        card_h,
        "4. Unified Telemetry",
        "#7C3AED",
        "Single-Pane Observability",
        [
            "• Cloud Trace distributed spans",
            "• End-to-end traceId propagation",
            "• Cloud Logging structured logs",
            "• BigQuery completions telemetry",
            "• Token consumption tracking",
            "• Per-agent FinOps attribution",
        ],
        badge_text="✓ Full-Stack Visibility",
        badge_color="#7C3AED",
    )

    # Card 5: Built-in Evaluation
    draw_card(
        d,
        622,
        y_pos,
        card_w,
        card_h,
        "5. Built-in Evaluation",
        "#15803D",
        "Native Eval & Quality Gate",
        [
            "• agents-cli eval command suite",
            "• Trace generation & auto-grading",
            "• Regression diffs (compare)",
            "• 9 Golden test scenarios",
            "• LLM judge (Gemini 3.1 Pro)",
            "• Automated CI/CD blocking gate",
        ],
        badge_text="✓ Continuous Quality Flywheel",
        badge_color="#15803D",
    )

    # Connecting arrows between cards
    for arrow_x in [154, 306, 458, 610]:
        d.add(
            Line(
                arrow_x + 1,
                110,
                arrow_x + 11,
                110,
                strokeColor=colors.HexColor("#1A73E8"),
                strokeWidth=1.5,
            )
        )
        d.add(
            Line(
                arrow_x + 7,
                107,
                arrow_x + 11,
                110,
                strokeColor=colors.HexColor("#1A73E8"),
                strokeWidth=1.5,
            )
        )
        d.add(
            Line(
                arrow_x + 7,
                113,
                arrow_x + 11,
                110,
                strokeColor=colors.HexColor("#1A73E8"),
                strokeWidth=1.5,
            )
        )

    # Bottom guidance text
    d.add(
        String(
            385,
            4,
            "Agent Platform Governance Backbone: Isolated Sandbox • Centralized Gateway Guardrails • SPIFFE Attestation • Single-Pane Telemetry • Native Eval Flywheel",
            fontName="Helvetica",
            fontSize=6.5,
            fillColor=colors.HexColor("#64748B"),
            textAnchor="middle",
        )
    )

    # Table
    headers = [
        Paragraph("<b>Governance Dimension</b>", s["th"]),
        Paragraph("<b>Agent Platform Architecture</b>", s["th"]),
        Paragraph("<b>Security & Governance Enforcement</b>", s["th"]),
        Paragraph("<b>Enterprise Value & SLA</b>", s["th"]),
    ]
    rows = [
        [
            Paragraph("1. Sandbox Runtime Isolation", s["td_bold"]),
            Paragraph(
                "Agent Platform Agent Runtime (Reasoning Engine in <code>asia-northeast3</code>)",
                s["td"],
            ),
            Paragraph(
                "Google-managed container sandbox with gVisor kernel-level isolation; restricts system calls; isolates tool invocations (Google Search, code execution) and memory spaces.",
                s["td"],
            ),
            Paragraph(
                "Zero host compromise; multi-tenant workload safety; scale-to-zero compute efficiency.",
                s["td"],
            ),
        ],
        [
            Paragraph("2. Gateway & Model Armor Perimeter", s["td_bold"]),
            Paragraph(
                "Agent Gateway (<code>CLIENT_TO_AGENT</code>) + Model Armor (<code>version1-guardrails</code>)",
                s["td"],
            ),
            Paragraph(
                "Service Extensions Authz Extension (fail_open = false); screens inbound prompts & outbound deliverables for prompt injection, jailbreak, and SDP (Sensitive Data Protection / PII) leaks.",
                s["td"],
            ),
            Paragraph(
                "Centralized, non-bypassable enterprise security perimeter; blocks malicious payloads before agent compute.",
                s["td"],
            ),
        ],
        [
            Paragraph("3. SPIFFE Cryptographic Identity", s["td_bold"]),
            Paragraph(
                "<code>--agent-identity</code><br/><code>version1-subagent@</code><br/><code>{project_id}.iam.gserviceaccount.com</code>",
                s["td"],
            ),
            Paragraph(
                "SPIFFE identity issued per subagent; IAM Workload Identity delegation; mTLS service-to-service authentication; least-privilege role bindings (Storage, Logging, Cloud Trace).",
                s["td"],
            ),
            Paragraph(
                "Zero long-lived static keys; complete cryptographic auditability; strict least-privilege access control.",
                s["td"],
            ),
        ],
        [
            Paragraph("4. Unified Single-Pane Telemetry", s["td_bold"]),
            Paragraph(
                "Cloud Trace + Cloud Logging + BigQuery Agent Analytics (<code>version1_telemetry</code>)",
                s["td"],
            ),
            Paragraph(
                "OpenTelemetry GenAI semantic conventions (<code>OTEL_TO_CLOUD=true</code>); propagates <code>traceId</code> end-to-end; consolidates traces, logs, and token usage into BigQuery sink.",
                s["td"],
            ),
            Paragraph(
                "Single pane of glass for real-time span debugging, structured audit logs, and turn-level token cost attribution.",
                s["td"],
            ),
        ],
        [
            Paragraph("5. Native Agent Evaluation", s["td_bold"]),
            Paragraph(
                "Google ADK Evaluation Suite (<code>agents-cli eval</code>) + <code>scripts/eval_gate.py</code>",
                s["td"],
            ),
            Paragraph(
                "Automated scenario generation, trace grading, regression comparison; pre-prod eval gate on 9 golden scenarios (Judge >= 4.0/5.0 with Gemini 3.1 Pro; 100% budget math & schema).",
                s["td"],
            ),
            Paragraph(
                "Automated quality flywheel; blocks release regressions automatically before promotion to production.",
                s["td"],
            ),
        ],
    ]

    t = Table([headers, *rows], colWidths=[130, 180, 270, 190])
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8F0FE")),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#DADCE0")),
                (
                    "LINEBELOW",
                    (0, 0),
                    (-1, 0),
                    1.2,
                    colors.HexColor("#1A73E8"),
                ),
            ]
        )
    )
    return p_title, p_sub, d, t


def generate_new_pages_pdf(page_nums: list[int], total_pages: int = 11) -> list[bytes]:
    """Generates the new pages as individual PDF bytes with accurate page numbering."""
    s = get_styles()
    page_builders = [
        build_page_4_gcp,
        build_page_6_cuj1,
        build_page_7_cuj2,
        build_page_10_governance,
    ]

    page_pdf_bytes = []
    for builder, page_num in zip(page_builders, page_nums, strict=True):
        buf = io.BytesIO()
        doc = SimpleDocTemplate(
            buf,
            pagesize=landscape(A4),
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        p_title, p_sub, d, t = builder(s)
        story = [p_title, p_sub, d, Spacer(1, 10), t]

        def make_page_decorator(num):
            def decorate(canv, doc):
                canv.saveState()
                canv.setFont("Helvetica", 8)
                canv.setFillColor(colors.HexColor("#5F6368"))
                # Running header
                canv.drawString(
                    36,
                    565,
                    "Nova Electronics Corp — Marketing Value Creator (MVC) v1.0 | System Architecture & Design",
                )
                canv.drawRightString(
                    805, 565, "Google Cloud FDE Capstone Specification"
                )
                canv.setStrokeColor(colors.HexColor("#DADCE0"))
                canv.setLineWidth(0.75)
                canv.line(36, 558, 805, 558)

                # Running footer
                canv.line(36, 35, 805, 35)
                canv.drawString(
                    36,
                    24,
                    "Confidential • Forward Deployed Engineering • Google Cloud asia-northeast3",
                )
                canv.drawRightString(805, 24, f"Page {num} of {total_pages}")
                canv.restoreState()

            return decorate

        doc.build(
            story,
            onFirstPage=make_page_decorator(page_num),
            onLaterPages=make_page_decorator(page_num),
        )
        page_pdf_bytes.append(buf.getvalue())

    return page_pdf_bytes


def transform_original_streams(input_pdf_path: str) -> list[tuple[any, bytes]]:
    """Extracts original pages 0-6, performs string updates, and returns updated pages."""
    reader = PdfReader(input_pdf_path)

    # We will process 7 original pages (excluding original page 7 which is Section 7 to be deleted)
    updated_pages = []

    for idx in range(7):
        p = reader.pages[idx]
        raw_c = p["/Contents"].get_object()
        data = raw_c.get_data().decode("latin1")

        if idx == 0:
            # Page 1: Replace Vertex AI in summary table
            data = data.replace(
                "4 specialized sub-agents on Vertex AI Agent Runtime orchestrated via Direct A2A JSON-RPC",
                "4 specialized sub-agents on Agent Platform Agent Runtime orchestrated via Direct A2A",
            )
            data = data.replace(
                "protocol (SPIFFE identity) with ADK Root Agent FunctionTools.",
                "JSON-RPC protocol (SPIFFE identity) with ADK FunctionTools.",
            )

        elif idx == 1:
            # Page 2: C4 Level 1 Diagram
            data = data.replace(
                "BT 1 0 0 1 21.705 -18 Tm (Vertex AI Agent Runtime \\(asia-northeast3\\)) Tj T* ET",
                "BT 1 0 0 1 8.045 -18 Tm (Agent Platform Agent Runtime \\(asia-northeast3\\)) Tj T* ET",
            )
            data = data.replace(
                "(Vertex AI Agent Runtime) Tj T* ET",
                "(Agent Platform Agent Runtime) Tj T* ET",
            )
            data = data.replace("(Page 2 of 8)", "(Page 2 of 11)").replace(
                "(Page 2 of 10)", "(Page 2 of 11)"
            )

        elif idx == 2:
            # Page 3: C4 Level 2 Container Architecture
            data = data.replace(
                "external Vertex AI model services.",
                "external Agent Platform model services.",
            )
            data = data.replace(
                "BT 1 0 0 1 59.705 -17 Tm (Vertex AI Agent Runtime \\(asia-northeast3\\)) Tj T* ET",
                "BT 1 0 0 1 45.55 -17 Tm (Agent Platform Agent Runtime \\(asia-northeast3\\)) Tj T* ET",
            )
            data = data.replace(
                "(Vertex AI Foundation Models) Tj T* ET",
                "(Agent Platform Foundation Models) Tj T* ET",
            )
            data = data.replace("(Page 3 of 8)", "(Page 3 of 11)").replace(
                "(Page 3 of 10)", "(Page 3 of 11)"
            )

        elif idx == 3:
            # Orig Page 4 -> Final Page 5: Multi-Agent DAG (renumbered to 4)
            data = data.replace(
                "(3. Multi-Agent DAG & Human-in-the-Loop Review Sequence)",
                "(4. Multi-Agent DAG & Human-in-the-Loop Review Sequence)",
            )
            data = data.replace("(Page 4 of 8)", "(Page 5 of 11)").replace(
                "(Page 5 of 10)", "(Page 5 of 11)"
            )

        elif idx == 4:
            # Orig Page 5 -> Final Page 8: Deliverables Pipeline (renumbered to 7)
            data = data.replace(
                "(4. Deliverables Pipeline & Data Contract Architecture)",
                "(7. Deliverables Pipeline & Data Contract Architecture)",
            )
            data = data.replace("(Page 5 of 8)", "(Page 8 of 11)").replace(
                "(Page 8 of 10)", "(Page 8 of 11)"
            )

        elif idx == 5:
            # Orig Page 6 -> Final Page 9: Security (renumbered to 8)
            data = data.replace(
                "(5. Security, Zero-Trust Architecture & Model Armor Perimeter)",
                "(8. Security, Zero-Trust Architecture & Model Armor Perimeter)",
            )
            data = data.replace("(Page 6 of 8)", "(Page 9 of 11)").replace(
                "(Page 9 of 10)", "(Page 9 of 11)"
            )

        elif idx == 6:
            # Orig Page 7 -> Final Page 11: CI/CD Pipeline (renumbered to 10)
            data = data.replace(
                "(6. Multi-Project CI/CD Pipeline & Automated Dual Quality Gate)",
                "(10. Multi-Project CI/CD Pipeline & Automated Dual Quality Gate)",
            ).replace(
                "(9. Multi-Project CI/CD Pipeline & Automated Dual Quality Gate)",
                "(10. Multi-Project CI/CD Pipeline & Automated Dual Quality Gate)",
            )
            data = data.replace("(Page 7 of 8)", "(Page 11 of 11)").replace(
                "(Page 10 of 10)", "(Page 11 of 11)"
            )

        # Update filter and data
        raw_c[NameObject("/Filter")] = NameObject("/FlateDecode")
        raw_c.set_data(data.encode("latin1"))
        updated_pages.append(p)

    return updated_pages


def build_system_design_pdf(
    output_filename: str = "MVC_System_Design_and_Architecture.pdf",
    base_pdf_path: str | None = None,
):
    """Assembles all 11 pages and generates the publication-grade PDF."""
    target_path = Path(output_filename).resolve()
    if base_pdf_path is None:
        candidate_paths = [
            Path("docs/design/MVC_System_Design_base.pdf").resolve(),
            Path("/tmp/MVC_System_Design_and_Architecture.pdf.bak").resolve(),
            target_path,
        ]
        for candidate in candidate_paths:
            if candidate.exists():
                base_pdf_path = candidate
                break
    else:
        base_pdf_path = Path(base_pdf_path).resolve()

    print(f"Loading base PDF from {base_pdf_path}...")
    transformed_orig_pages = transform_original_streams(str(base_pdf_path))

    print("Generating 4 new architectural pages (Pages 4, 6, 7, 10)...")
    new_pages_bytes = generate_new_pages_pdf(page_nums=[4, 6, 7, 10], total_pages=11)
    new_page_readers = [PdfReader(io.BytesIO(b)) for b in new_pages_bytes]

    # Assembly sequence (11 pages total):
    # Page 1: transformed_orig_pages[0] (Exec Summary)
    # Page 2: transformed_orig_pages[1] (1. System Context C4-1)
    # Page 3: transformed_orig_pages[2] (2. Container Arch C4-2)
    # Page 4: new_page_readers[0].pages[0] (3. Multi-Project GCP Environment)
    # Page 5: transformed_orig_pages[3] (4. Multi-Agent DAG C4-3)
    # Page 6: new_page_readers[1].pages[0] (5. CUJ-1 Campaign Creation & HITL)
    # Page 7: new_page_readers[2].pages[0] (6. CUJ-2 Revision & Rollback)
    # Page 8: transformed_orig_pages[4] (7. Deliverables Pipeline C4-4)
    # Page 9: transformed_orig_pages[5] (8. Security & Zero-Trust)
    # Page 10: new_page_readers[3].pages[0] (9. Agent Platform Governance & Security)
    # Page 11: transformed_orig_pages[6] (10. CI/CD Pipeline)

    writer = PdfWriter()
    writer.add_page(transformed_orig_pages[0])  # Page 1
    writer.add_page(transformed_orig_pages[1])  # Page 2
    writer.add_page(transformed_orig_pages[2])  # Page 3
    writer.add_page(new_page_readers[0].pages[0])  # Page 4 (GCP Environment)
    writer.add_page(transformed_orig_pages[3])  # Page 5 (Multi-Agent DAG)
    writer.add_page(new_page_readers[1].pages[0])  # Page 6 (CUJ-1)
    writer.add_page(new_page_readers[2].pages[0])  # Page 7 (CUJ-2)
    writer.add_page(transformed_orig_pages[4])  # Page 8 (Deliverables Pipeline)
    writer.add_page(transformed_orig_pages[5])  # Page 9 (Security)
    writer.add_page(new_page_readers[3].pages[0])  # Page 10 (Agent Platform Governance)
    writer.add_page(transformed_orig_pages[6])  # Page 11 (CI/CD)

    temp_out = str(target_path) + ".tmp"
    with open(temp_out, "wb") as f:
        writer.write(f)

    os.replace(temp_out, str(target_path))
    print(f"Successfully generated 11-page PDF report: {target_path}")


if __name__ == "__main__":
    out_pdf = "MVC_System_Design_and_Architecture.pdf"
    if len(sys.argv) > 1:
        out_pdf = sys.argv[1]
    build_system_design_pdf(out_pdf)
