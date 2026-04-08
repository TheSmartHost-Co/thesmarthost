
Module 1 — Schedule trigger

Add a Schedule module
Set to: Every week, Monday at 9:00am

Module 2 — Fetch checkouts from Hostaway

Add an HTTP → Make a request module
URL: https://api.hostaway.com/v1/reservations
Method: GET
Headers: Authorization: Bearer YOUR_API_KEY
Query params:

status = checkout
dateFrom = (last Monday's date — use Make's date formula: {{formatDate(addDays(now, -7), "YYYY-MM-DD")}})
dateTo = (yesterday: {{formatDate(addDays(now, -1), "YYYY-MM-DD")}})



Module 3 — Iterator

Add an Iterator module to loop through each reservation in the response array

Module 4 — Fetch message thread

Add another HTTP → Make a request module
URL: https://api.hostaway.com/v1/conversations?reservationId={{reservationId}}
Method: GET
Headers: same Authorization header

Module 5 — Call Claude API

Add an HTTP → Make a request module
URL: https://api.anthropic.com/v1/messages
Method: POST
Headers:

x-api-key: YOUR_CLAUDE_API_KEY
anthropic-version: 2023-06-01
Content-Type: application/json


Body (raw JSON):

json{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 300,
  "messages": [{
    "role": "user",
    "content": "You are a professional Airbnb host writing a guest review. Based on the following stay details and message thread, write a warm, specific, 3-5 sentence review. Mention something genuine from the conversation. Keep it positive but honest.\n\nGuest name: {{guestName}}\nProperty: {{listingName}}\nStay dates: {{arrivalDate}} to {{departureDate}}\nMessage thread: {{conversationMessages}}"
  }]
}
Module 6 — Send approval email

Add a Gmail → Send an email module
To: your email
Subject: ✅ Review Approval Needed — {{guestName}}
Body:

A review is ready for your approval:

Guest: {{guestName}}
Property: {{listingName}}
Stay: {{arrivalDate}} – {{departureDate}}

--- GENERATED REVIEW ---
{{claudeResponse}}

--- APPROVE ---
Click here to post: [you'll add a webhook URL here from Module 7]

--- EDIT & APPROVE ---
Reply to this email with your edited version.
Module 7 — Webhook for approval

Add a second Scenario (Scenario 2) that starts with a Webhook trigger
When you click "Approve" in the email, it calls the webhook
The webhook scenario then posts the review via POST /reservations/{id}/reviews in Hostaway


Scenario 2 — Personalized Review Request Messages
Same structure, but the Claude prompt changes to:
You are a warm, professional Airbnb host. Based on this guest's message thread, 
write a short, friendly message (3-4 sentences) asking them to leave a review. 
Reference something specific and genuine from their stay to make it personal. 
Don't be pushy.

Guest name: {{guestName}}
Message thread: {{conversationMessages}}
This runs 2 days after checkout (change the schedule trigger) and sends via POST /conversations/{id}/messages in Hostaway after your approval.