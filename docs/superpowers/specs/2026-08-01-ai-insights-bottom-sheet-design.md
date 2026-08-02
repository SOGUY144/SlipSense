# AI Insights Bottom Sheet Redesign

## Goal
To clean up the dashboard UI by moving the lengthy "SlipSense AI Analysis" component out of the main scrolling view. The content will be relocated into a bottom sheet (drawer), triggered by a premium, space-saving button on the dashboard.

## Current State
`AiFeedViewer` component is placed at the bottom of the dashboard. It renders three large, text-heavy cards directly into the dashboard flow, which creates excessive scrolling and clutters the interface.

## Proposed Design (Approach 1: Bottom Sheet)

### 1. Dashboard Trigger
- Remove the existing inline text cards from the dashboard.
- Introduce a compact, premium "Glassmorphism" trigger card.
- **Visuals:** 
  - Background: Glassmorphism (`bg-white/70 backdrop-blur-md`) with subtle purple/blue glowing orbs behind it.
  - Icon: A sparkling AI icon (e.g., `Sparkles` or `Bot` from lucide-react).
  - Text: "✨ SlipSense AI สรุปข้อมูลร้านให้คุณแล้ว แตะเพื่ออ่าน" (or similar concise copy).
  - Interaction: Tapping the card opens the Bottom Sheet.

### 2. Bottom Sheet (Drawer) Component
- Implement a slide-up drawer (using shadcn/ui `Sheet` or `Drawer` component, optimized for mobile).
- **Contents:**
  - Header: "SlipSense AI Analysis" with a refresh/update button.
  - Body: The 3 existing insight cards ("ความเสี่ยง", "คำแนะนำ", "ภาพรวม").
- **Card Styling Updates (Inside Drawer):**
  - Remove harsh borders.
  - Use soft, pastel background tints matching the semantic meaning (Red/Orange for Risk, Purple for Action, Blue for Overview).
  - Keep padding generous but optimized for a modal view.

## Boundaries and Scope
- Modifies `components/dashboard/ai-feed-viewer.tsx` to encapsulate the Drawer/Sheet logic.
- Maintains the existing AI insight data fetching and props logic (`insights`, `onRefresh`, `isRefreshing`).
- Does NOT change the AI analysis generation backend.

## Success Criteria
- The dashboard page length is significantly reduced.
- Users can comfortably read the AI report inside a native-feeling mobile drawer.
- The trigger button looks premium and aligns with the recent dashboard UI updates.
