# Flinki V2 — Product Specification & Frontend Hand-off

Verified global identity platform that captures life achievements **"Beyond the Classroom"**: a lifetime digital CV converging media, device data, and institutional validation.

---

## Section 1: Profile Header & Shareability

The profile header functions as a **professional Reputation Surface**.

### LinkedIn-Style Identity

- **High-impact banner**, profile photo, and **concise bio** immediately visible to visitors.
- Name, role (e.g. Elite Triathlete · CS Student), and key stats (Race Records, Rep score).

### The Sharing Suite

Positioned prominently in the header to facilitate **external verification**:

| Feature             | Purpose                                                                |
| ------------------- | ---------------------------------------------------------------------- |
| **QR Code**         | Instant in-person networking at races or school events.                |
| **PDF Export**      | Formats the profile into a **"Portfolio CV"** for formal applications. |
| **Highlight Cards** | Aesthetic snapshots of key milestones for social sharing.              |
| **Shareable Link**  | A clean URL for university and recruitment portals.                    |

---

## Section 2: The Achievement Ledger (Waterfall Model)

The **"Secret Sauce"** of Flinki V2: a high-density **Proof of Work** audit trail.

### Level 0 — Achievement Summary (Collapsed)

- The ledger displays a **single focused row**.
- At a glance, visitors see the total effort behind the outcome:
  - **Total Stats:** Aggregated data such as _"44 training runs," "1,000 km total distance," "300 training hours"_.
  - **Trust Strength:** The **6-segmented gauge** and **Evolving Trophy** provide immediate credibility feedback.

### Level 1 — Activity Timeline (Expansion)

- Clicking **"View Evidence"** **waterfalls** into a vertical chronological timeline.
- **Journey Mapping:** Every interval session, recovery run, or match that contributed to the goal.
- **Audit Trail:** Each node represents a specific post, proving consistency and resilience.

### Level 2 — Individual Activity Detail (Drill-Down)

- Opening a **specific node** reveals the granular evidence layer:
  - **Simplified Data:** Core fields only — **Duration**, **Distance**, and **Date** — for instant scanability.
  - **Media & Notes:** Verified photos and personal reflections that add "character" to the data.

---

## Section 3: Creation Flow & Logic

The UI distinguishes between **Future Ambition** and **Historical Record**.

|                 | **Feature / Journey** (New Goal)         | **Record** (Past Achievement)                  |
| --------------- | ---------------------------------------- | ---------------------------------------------- |
| **User intent** | e.g. "Run Dubai Marathon 2026"           | e.g. "Dubai Marathon 2022 – Completed"         |
| **UI feedback** | "The Flinki community is behind you!"    | Acknowledges the record for the "Lifetime CV". |
| **Logic**       | Forward-looking milestones and training. | Historical data upload and verification.       |

---

## Section 4: Global Theme & Color Refactor

High-contrast, institutional palette to reduce eye strain and maintain professional authority.

### Light Mode (Institutional White)

- **Background:** White (`#00FFFF`) with **Pure Black** (`#000000`) font.
- **Primary Brand:** Flinki Classic Purple (`#210366`) for trophies, buttons, and active trust segments.

### Dark Mode (Performance Slate)

- **Background:** Slate Navy (`#0F172A`) with **Pure White** (`#00FFFF`) font.
- **Primary Brand:** Cyan (`#00FFFF`) for high visibility of trophies and verified data paths against dark surfaces.

---

## Section 5: Project Summary (Frontend Hand-off)

- **Core Product:** The **Profile Page** — a dynamic "lifetime digital CV" and verified hub.
- **Trust Layer Model:** Every achievement accumulates credibility across **6 Layers**, from self-reported claims to official event results.
- **Modular Waterfall UI:** A horizontal ledger of "Life Chapters" that **expands vertically** to reveal the hard data audit trail (Proof of Work).

---

## Implementation Status (Reference)

Use this to prioritise remaining work. The codebase is in `apps/web/src/App.tsx` (and `style.css` for theme).

| Spec item                                                             | Status  | Notes                                                                                                                                           |
| --------------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Profile header** (banner, photo, bio)                               | ✅ Done | Identity row, Rep score, Race Records, skills.                                                                                                  |
| **PDF Export / Portfolio CV**                                         | ✅ Done | "Export Portfolio" and "Portfolio CV" open FlinkiSnapshotModal; Export CTA in modal.                                                            |
| **Share (link)**                                                      | ✅ Done | Share button (Link2) in header.                                                                                                                 |
| **Highlight cards**                                                   | ✅ Done | Carousel with milestone images; "View all" links.                                                                                               |
| **QR Code**                                                           | ✅ Done | QR button in header; modal with QR + shareable link and Copy.                                                                                   |
| **Shareable link (clean URL)**                                        | ✅ Done | Copy from Share button and QR modal; URL shown in QR modal.                                                                                     |
| **Ledger Level 0** (single row, gauge, trophy)                        | ✅ Done | Single-entry carousel, 6-segment gauge, EvolutionTrophy.                                                                                        |
| **Level 0 total stats** (e.g. "44 runs, 1000 km, 300 h")              | ✅ Done | Line under ledger: total sessions · total km · total hours.                                                                                     |
| **Level 1** (View Evidence → waterfall timeline)                      | ✅ Done | Waterfall with 6 Evidence Blocks; "Full Journey" opens AchievementJourneyModal with timeline.                                                   |
| **Level 2** (node drill-down: Duration, Distance, Date + media/notes) | ✅ Done | Tap a journey node → detail panel with Date, Duration, Distance, Summary, Notes, Media. Core fields only — complex metrics removed.             |
| **Achievement section positioning**                                   | ✅ Done | Achievement Ledger appears immediately below profile bio. Completed + in-progress counts shown in header.                                       |
| **Completion celebration**                                            | ✅ Done | "Congratulations on finishing…" banner shown in waterfall panel for completed achievements.                                                     |
| **Creation flow** (Feature vs Record)                                 | ✅ Done | "Add to your passport" section below Achievement Ledger. Feature/Journey card includes "The Flinki community is behind you." community message. |
| **Add Post flow**                                                     | ✅ Done | "Add Post" section with achievement tag selector, trust layer nudges (device/photos/tag/notes), and Public/Private visibility toggle.           |
| **Activity feed cards**                                               | ✅ Done | Map overlay shows Distance + Time (duration) only — Pace removed.                                                                               |
| **Global theme** (light #210366, dark #00FFFF)                        | ✅ Done | Conditional theme applied across components.                                                                                                    |

---

_Last updated to match Flinki V2 spec and current codebase._
