// Shared posts data and nav helpers for daily blog entries.
// Add entries here when you post. Format: "YYYY-MM-DD": "Title"
const posts = {
  "2026-05-16": "Less Than 100%",
  "2026-05-15": "Less Than 100%",
  "2026-05-13": "Belief vs. Reality",
  "2026-05-10": "Pressure",
  "2026-04-30": "Learning on Demand",
  "2026-04-27": "Overplayed",
  "2026-04-25": "There is No Past",
  "2026-04-24": "Fail Publicly",
  "2026-04-23": "Die Trying",
  "2026-04-22": "Mind and Body",
  "2026-04-21": "Radical Open-mindedness",
  "2026-04-19": "New Environments",
  "2026-04-18": "Social Media Monoculture",
  "2026-04-17": "Sparse Stimulation",
  "2026-04-16": "Desperation",
  "2026-04-15": "Acceptance Rates",
  "2026-04-14": "Predicting the Future",
  "2026-04-13": "The Destination",
  "2026-04-10": "Medicine",
  "2026-04-09": "Talent",
  "2026-04-08": "Tractable Goals",
  "2026-04-07": "What Matters To You",
  "2026-04-06": "Circular Markets",
  "2026-04-05": "Emotional Overload",
  "2026-04-03": "Reputation",
  "2026-04-01": "Prestige",
  "2026-03-31": "Envy",
  "2026-03-29": "Authenticity",
  "2026-03-27": "No Phone",
  "2026-03-26": "Focus",
  "2026-03-25": "Antisocial Marketing",
  "2026-03-23": "Right and Wrong",
  "2026-03-22": "Boredom",
  "2026-03-21": "Do It Now",
  "2026-03-20": "Making Bets",
  "2026-03-19": "It's the Same 10 Minutes",
  "2026-03-18": "Identity Gap",
  "2026-03-17": "Momentum",
};

function renderDailyNav(currentKey, mountId) {
  const keys = Object.keys(posts).sort();
  const idx = keys.indexOf(currentKey);
  const prev = idx > 0 ? keys[idx - 1] : null;
  const next = idx >= 0 && idx < keys.length - 1 ? keys[idx + 1] : null;

  const mount = document.getElementById(mountId);
  if (!mount) return;

  const parts = [];
  if (prev) {
    parts.push(`<a href="${prev}.html">← ${prev} ${posts[prev]}</a>`);
  } else {
    parts.push("<span></span>");
  }
  if (next) {
    parts.push(`<a href="${next}.html">${next} ${posts[next]} →</a>`);
  } else {
    parts.push("<span></span>");
  }
  mount.style.display = "flex";
  mount.style.justifyContent = "space-between";
  mount.style.marginTop = "2em";
  mount.innerHTML = parts.join("");
}
