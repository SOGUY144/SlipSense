# AI Story Insights Design Spec

## Overview
Transform the current static "AI Advice" paragraph on the dashboard into an interactive, visually engaging "Story" format (similar to Instagram Stories or Spotify Wrapped). This will make the financial insights more digestible, premium, and fun to interact with.

## Components

### 1. Dashboard Banner (Entry Point)
- Replace the current long text paragraph with a sleek, clickable banner or card.
- **Copy:** "✨ สรุปการเงินของคุณพร้อมแล้ว (แตะเพื่อดู)" or similar engaging prompt.
- **State:** Should show a loading state (`Loader2`) when regenerating insights.

### 2. Story Viewer Modal
- A full-screen (or large modal on desktop) overlay that displays the insights one by one.
- **Features:**
  - **Progress Bar:** Segmented progress bar at the top indicating the number of slides and current progress.
  - **Auto-advance:** Slides advance automatically after a set duration (e.g., 5 seconds) or when tapped.
  - **Tap Navigation:** Tap left side to go back, tap right side to go forward.
  - **Dismiss:** Swipe down or click 'X' to close.

### 3. Slide Content Types (Visuals)
Each slide will have a distinct mood/color scheme:
- **Success/Praise:** Bright green background, celebratory icons/emojis (e.g., high profit).
- **Warning/Alert:** Orange/yellow background, alert icons (e.g., high spending in a category).
- **Action/Goal:** Blue or purple background, target icon (e.g., setting a budget goal).

## Data Flow & AI Backend

### 1. Database Schema
Currently, the `insights` table stores `content` (text) and `metadata` (jsonb).
- We will update the AI prompt to return a structured JSON array of slides and store this JSON in the `metadata` column or `content` column. 
- Example JSON structure:
  ```json
  [
    { "type": "success", "title": "กำไรพุ่งปรี๊ด!", "message": "เดือนนี้สุดยอด! กำไรสุทธิ 29,045 บาท 🚀" },
    { "type": "warning", "title": "ระวังค่าอาหาร", "message": "แอบเห็นนะว่าหมดกับ 'ค่าอาหาร' ไปเยอะเลย ระวังนิดนึงน้า 🍜" },
    { "type": "action", "title": "เป้าหมายสัปดาห์หน้า", "message": "สัปดาห์หน้าลองคุมงบรายวันให้อยู่ใน 500 บาทดูไหม?" }
  ]
  ```

### 2. Prompt Update (`/api/insights/route.ts` & `lib/ai/slip-extraction.ts`)
- Modify the `generateInsights` prompt to mandate returning a JSON array of 3-4 slides with specific `type`, `title`, and `message` properties.
- Ensure the AI understands the user's behavior profile and recent transaction data to generate these personalized slides.

## Error Handling
- If the AI fails to generate valid JSON or fails completely, fall back to a generic error message in the dashboard banner, prompting the user to try again.
- Ensure graceful degradation if the user has insufficient data (< 3 transactions).

## Testing
- Verify that the AI returns the correct JSON format reliably.
- Test the Story modal on mobile viewports to ensure smooth tap interactions and proper scaling of the progress bars.
