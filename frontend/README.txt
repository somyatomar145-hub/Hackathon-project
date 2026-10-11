HAWKEYE — FUNCTIONAL AI INSIGHTS

OFFLINE MODE:
Open index.html in Chrome or Edge. Dashboard and Customer sections work.
AI Insights calculates actual rule-based risk scores in the browser, drafts a local
fallback email, and stores approval history in this browser (localStorage).
No email is sent in offline mode.

BACKEND MODE (Node.js 22 or newer):
1. Open a terminal in this folder.
2. Run: node server.js
3. Open http://localhost:3000 in your browser (NOT the file:// version).
4. Login with any nonempty demo credentials and click AI Insights.
5. Analyze a customer. The Node backend calculates risk and creates an email draft.
6. Approve or reject to save the decision in hawkeye-data.json.
7. After approval, click Send approved email (only works with Resend configured).

OPTIONAL ENVIRONMENT VARIABLES:
AI_API_KEY = OpenAI-compatible provider key (without it: deterministic local fallback)
AI_BASE_URL = default https://api.openai.com/v1
AI_MODEL = default gpt-4o-mini
RESEND_API_KEY = Resend email provider key
RESEND_FROM_EMAIL = verified sender address
PORT = default 3000

Example Windows PowerShell:
$env:AI_API_KEY="your-key"; node server.js

Example macOS/Linux:
AI_API_KEY="your-key" node server.js

IMPORTANT SECURITY NOTE:
This is a demo backend without real authentication or user roles. Do not expose
it publicly or use production email credentials without adding authentication,
authorization, CORS/CSRF protections, validation, and a production database.
Email recipients are example.com demo addresses; replace them with verified,
consenting real recipients before enabling email delivery.

FILES:
Existing 8 Hawkeye frontend files, plus server.js, revops-ai.js, README.txt.
No npm install or third-party dependencies required.
