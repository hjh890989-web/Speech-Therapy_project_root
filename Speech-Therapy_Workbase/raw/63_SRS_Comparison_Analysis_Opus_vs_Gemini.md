# SRS Draft Comparison Analysis: Opus (V02) vs Gemini (V03)

**Date:** 2026-05-08  
**Subject:** Comparative analysis of two SRS draft versions for the Home Language Coaching Platform.

---

## 1. Executive Summary

| Category | V02 Opus | V03 Gemini | Winner |
|:---|:---|:---|:---:|
| **File Name** | 59_SRS_V02_Draft_Opus_with_Diagrams.md | 62_SRS_V03_Draft_Gemini_with_Diagrams.md | - |
| **Total Lines** | 948 lines | 687 lines | - |
| **Functional Reqs (FUNC)** | **65 Reqs** (Atomic, G/W/T format) | **~45 Reqs** (Feature-based grouping) | **Opus** |
| **Non-Functional Reqs (NF)** | **30 Reqs** (Incl. Business KPIs) | **16 Reqs** (Technical focus) | **Opus** |
| **ID System** | Sequential `REQ-FUNC-001` | Epic-coded `REQ-FUNC-F1a-001` | **Gemini** |

---

## 2. Compliance Review (8 Quality Criteria)

| Criteria | V02 Opus | V03 Gemini | Analysis |
|:---|:---:|:---:|:---|
| **1. PRD Story·AC Mapping** | 🟢 **Superior** | 🟡 Partial | Opus provides 65 atomic requirements with detailed G/W/T criteria. |
| **2. KPI·Performance NFR** | 🟢 **Superior** | 🟡 Partial | Opus includes specific business KPIs (M3 Retention, W-AUR). |
| **3. API List in Interface** | 🟢 **8 APIs** | 🟡 4 APIs | Opus covers reward/hitl/weekly report endpoints. |
| **4. Entity·Schema Appendix** | 🟢 Full | 🟢 Full | Both provide detailed tables and diagrams. |
| **5. Traceability Matrix** | 🟡 Range-based | 🟢 **1:1 Mapping** | Gemini provides a more granular mapping ready for QA. |
| **6. Core Diagrams** | 🟢 Complete | 🟢 Complete | Both cover UseCase, Component, ERD, and Class diagrams. |
| **7. Sequence Diagrams (3-5)** | 🟡 4 (Main flow focus) | 🟢 **4 (Edge case focus)** | Gemini covers Reward Fallback and HITL Escalation more effectively. |
| **8. ISO 29148 Compliance** | 🟢 High | 🟡 Moderate | Opus follows a more rigorous section/part structure. |

---

## 3. Key Strengths & Weaknesses

### ✅ V02 Opus (The Technical Specification Leader)
*   **Strengths:** 
    *   **Atomicity:** 65 independent requirements in `Given/When/Then` format make it ideal for developer implementation and automated testing.
    *   **Business Alignment:** Integrates high-level business goals (Retention, CVR) directly into technical constraints.
    *   **Stakeholder Depth:** Includes critical backend actors like `HITL Expert` and `System Admin`.
    *   **Visual Strategy:** Includes a unique "Stakeholder DMU Dependency" diagram.
*   **Weaknesses:** 
    *   **Appendix Gaps:** Lacks the validation plan and roadmap found in Gemini's version.

### ✅ V03 Gemini (The Strategic Integration Leader)
*   **Strengths:**
    *   **Traceability:** Excellent 1:1 row mapping between Stories and Requirements.
    *   **Interaction Coverage:** Superior sequence diagrams for complex logic (e.g., Network disconnection/Reward recovery).
    *   **Roadmap & Strategy:** Includes Gantt charts, Experiment designs (EXP 1-4), and ADR references.
*   **Weaknesses:**
    *   **Granularity:** Functional requirements are grouped, losing some technical precision compared to Opus.

---

## 4. Final Recommendation: Merged V04 Master

To create a production-ready document, it is recommended to synthesize a **V04 Merged Master** using the following "Best-of-Breed" components:

| Component | Source to Adopt | Reason |
|:---|:---|:---|
| **Functional Requirements** | **Opus** | For atomic G/W/T precision and developer clarity. |
| **Traceability Matrix** | **Gemini** | For 1:1 granular QA mapping. |
| **API Specification** | **Opus** | For complete coverage of 8 core endpoints. |
| **Non-Functional Reqs** | **Opus** | For the inclusion of critical business performance metrics. |
| **Sequence Diagrams** | **Gemini** | For coverage of edge cases like Reward Fallback and HITL. |
| **Appendix (Roadmap/ADR)** | **Gemini** | For strategic context and architectural decision records. |

---
**Status:** Review Completed. Proceed to Merged Master creation upon approval.
