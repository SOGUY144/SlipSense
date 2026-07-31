# LINE OA Integration Design Spec

## 1. Overview
SlipSense will integrate with LINE Official Account (OA) to allow SME owners to receive and process transaction slips automatically through their LINE chats. When a customer sends a slip image to the shop's LINE OA, SlipSense will extract the data, verify it, and automatically reply to the customer.

## 2. User Experience (SME Owner)
- **Settings Page**: A new "LINE Integration" section in the settings.
- **Connection**: A "Connect with LINE" button that initiates a LINE Login flow to authenticate the shop owner and link their LINE OA.
- **Controls**: A toggle switch to enable/disable "Auto-Reply" functionality.

## 3. Architecture & Data Flow
1. **Webhook Endpoint**: 
   - Route: /api/webhooks/line
   - Purpose: Receives HTTP POST events from LINE Messaging API.
2. **Message Processing**:
   - Verify the webhook signature.
   - If the event is a message of type image, extract the messageId.
3. **Image Retrieval**:
   - Call LINE Messaging API to fetch the binary image data.
4. **Slip Extraction & Verification**:
   - Pass the image to the existing extractSlipData AI module.
   - Run duplicate detection.
5. **Auto-Reply (if enabled)**:
   - Valid/Verified Slip: Reply with "ได้รับยอด [Amount] บาท เรียบร้อยค่ะ"
   - Duplicate/Suspicious Slip: Reply with "สลิปนี้อาจมีปัญหา กรุณารอแอดมินตรวจสอบนะคะ"
6. **Data Persistence**:
   - Save the transaction with a source tag indicating it came from LINE.

## 4. Database Schema Changes
- **shops table**: Add line_channel_id, line_access_token, is_line_auto_reply_enabled
- **	ransactions & slip_jobs tables**: Add source enum.

