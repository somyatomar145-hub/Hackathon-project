// revops-ai.js — Node.js 22+
function daysBetween(start, end) {
  return Math.floor(
    (new Date(end).setHours(0, 0, 0, 0) -
      new Date(`${start}T00:00:00`).getTime()) /
      86_400_000
  );
}

function scoreRisk(signals, today = new Date()) {
  let score = 0;
  const evidence = [];

  const add = (points, signal, value, reason) => {
    score += points;
    evidence.push({ signal, value, points, reason });
  };

  if (signals.lastMeetingAt) {
    const daysAgo = daysBetween(signals.lastMeetingAt, today);
    if (daysAgo >= 21) {
      add(20, "Last meeting", `${daysAgo} days ago`, "No recent meeting is recorded.");
    } else if (daysAgo >= 14) {
      add(12, "Last meeting", `${daysAgo} days ago`, "The last meeting was over two weeks ago.");
    }
  }

  if (!signals.nextStep?.trim()) {
    add(20, "Next step", "Missing", "No follow-up step is recorded.");
  }

  if (signals.championReplied === false) {
    add(20, "Champion reply", "No reply recorded", "The customer champion has not replied.");
  }

  const usage = Number(signals.usageChangePct ?? 0);
  if (usage <= -30) {
    add(25, "Product usage", `${usage}%`, "Product usage has dropped sharply.");
  } else if (usage <= -15) {
    add(18, "Product usage", `${usage}%`, "Product usage is declining.");
  } else if (usage <= -5) {
    add(10, "Product usage", `${usage}%`, "Product usage is slightly down.");
  }

  if (signals.renewalDate) {
    const daysUntilRenewal = -daysBetween(signals.renewalDate, today);
    if (daysUntilRenewal >= 0 && daysUntilRenewal <= 45) {
      add(20, "Renewal", `${daysUntilRenewal} days away`, "The renewal is approaching.");
    } else if (daysUntilRenewal <= 90 && daysUntilRenewal > 45) {
      add(12, "Renewal", `${daysUntilRenewal} days away`, "The renewal is within 90 days.");
    }
  }

  score = Math.min(score, 100);
  const level = score >= 65 ? "High" : score >= 35 ? "Medium" : "Low";

  return { score, level, evidence };
}

function localSuggestion(account, risk) {
  const action =
    risk.level === "High"
      ? "Contact the champion, confirm the renewal plan, and schedule a recovery meeting."
      : risk.level === "Medium"
        ? "Confirm the next customer touchpoint and update the account plan."
        : "Continue the current customer cadence and record the next milestone.";

  return {
    summary: risk.evidence.length
      ? `${risk.level} risk based on ${risk.evidence.map(item => item.reason.toLowerCase()).join(" ")}`
      : "No elevated risk signals were found in the available account data.",
    recommendedAction: action,
    emailSubject: "A quick check-in",
    emailBody:
      "Hi,\n\nI wanted to check in and hear how things are going. Are your priorities and upcoming milestones still on track?\n\nIf useful, I would be happy to set up a short conversation and agree on next steps.\n\nBest",
    provider: "Local fallback"
  };
}

async function generateAiSuggestion(account, risk, options = {}) {
  const apiKey = options.apiKey ?? process.env.AI_API_KEY;
  const baseUrl = (options.baseUrl ?? process.env.AI_BASE_URL ?? "https://api.openai.com/v1")
    .replace(/\/$/, "");
  const model = options.model ?? process.env.AI_MODEL ?? "gpt-4o-mini";
  const fallback = localSuggestion(account, risk);

  if (!apiKey) return fallback;

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a careful revenue operations assistant. Use only the supplied evidence. Do not invent facts or change the supplied risk score. Return JSON with summary, recommendedAction, emailSubject, and emailBody. Write a short, professional customer email."
          },
          {
            role: "user",
            content: JSON.stringify({
              riskLevel: risk.level,
              riskScore: risk.score,
              evidence: risk.evidence,
              nextStepRecorded: Boolean(account.nextStep?.trim()),
              championReplied: account.championReplied,
              usageChangePct: Number(account.usageChangePct ?? 0),
              renewalDate: account.renewalDate ?? null
            })
          }
        ]
      })
    });

    if (!response.ok) throw new Error(`AI provider returned ${response.status}`);

    const result = await response.json();
    const generated = JSON.parse(result.choices?.[0]?.message?.content ?? "{}");

    return {
      summary: generated.summary || fallback.summary,
      recommendedAction: generated.recommendedAction || fallback.recommendedAction,
      emailSubject: generated.emailSubject || fallback.emailSubject,
      emailBody: generated.emailBody || fallback.emailBody,
      provider: "AI"
    };
  } catch (error) {
    return { ...fallback, warning: error.message };
  }
}

async function analyzeAccount(account, options = {}) {
  const risk = scoreRisk(account);
  const suggestion = await generateAiSuggestion(account, risk, options);

  return {
    riskScore: risk.score,
    riskLevel: risk.level,
    evidence: risk.evidence,
    ...suggestion
  };
}

// Call this only after the manager has approved the email draft.
async function sendApprovedEmail({ approved, to, subject, body }, options = {}) {
  if (!approved) throw new Error("Manager approval is required before sending.");
  if (!to || !subject || !body) throw new Error("Recipient, subject, and body are required.");

  const apiKey = options.apiKey ?? process.env.RESEND_API_KEY;
  const from = options.from ?? process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Set RESEND_API_KEY and RESEND_FROM_EMAIL to enable email delivery.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, text: body })
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || "Email provider rejected the request.");

  return result;
}

module.exports = { scoreRisk, generateAiSuggestion, analyzeAccount, sendApprovedEmail };z