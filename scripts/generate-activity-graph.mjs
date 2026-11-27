
import fs from "node:fs";

const username = "rekik-ons";
const token = process.env.GH_TOKEN;

if (!token) throw new Error("GH_TOKEN is missing");

const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();

const first = new Date(Date.UTC(year, month, 1));
const last = new Date(Date.UTC(year, month + 1, 0));

const query = `
query {
  user(login: "${username}") {
    contributionsCollection(
      from: "${first.toISOString()}"
      to: "${last.toISOString()}"
    ) {
      contributionCalendar {
        weeks {
          contributionDays {
            date
            contributionCount
          }
        }
      }
    }
  }
}`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({ query })
});

if (!response.ok) {
  throw new Error(`GitHub API error: ${response.status}`);
}

const result = await response.json();

if (result.errors) {
  throw new Error(JSON.stringify(result.errors));
}

const days = result.data.user.contributionsCollection
  .contributionCalendar.weeks
  .flatMap(week => week.contributionDays);

const count = last.getUTCDate();

const values = Array.from({ length: count }, (_, i) => {
  const date = new Date(Date.UTC(year, month, i + 1))
    .toISOString().slice(0, 10);

  return days.find(d => d.date === date)?.contributionCount ?? 0;
});

const W = 1100, H = 420;
const L = 65, R = 30, T = 65, B = 75;
const GW = W - L - R;
const GH = H - T - B;

const max = Math.max(...values, 5);
const yMax = Math.ceil(max / 5) * 5;

const x = i => L + i / Math.max(count - 1, 1) * GW;
const y = v => T + GH - v / yMax * GH;

const monthName = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC"
}).format(now);

const horizontal = Array.from({ length: 6 }, (_, i) => {
  const value = yMax * i / 5;
  return `
    <line x1="${L}" y1="${y(value)}" x2="${W-R}" y2="${y(value)}"
      stroke="#24334b" stroke-width="1" stroke-dasharray="3 5"/>
    <text x="${L-15}" y="${y(value)+4}" text-anchor="end"
      fill="#36BCF7" font-size="12">${Math.round(value)}</text>`;
}).join("");

const vertical = Array.from({ length: count }, (_, i) => `
  <line x1="${x(i)}" y1="${T}" x2="${x(i)}" y2="${H-B}"
    stroke="#26364c" stroke-width="1"/>
  <text x="${x(i)}" y="${H-35}" text-anchor="middle"
    fill="#36BCF7" font-size="11">${i+1}</text>
`).join("");

const points = values.map((v, i) => `${x(i)},${y(v)}`);
const line = points.map((p, i) => `${i ? "L" : "M"} ${p}`).join(" ");

const area = `${line} L ${x(count-1)},${y(0)} L ${x(0)},${y(0)} Z`;

const circles = values.map((v, i) => `
  <circle cx="${x(i)}" cy="${y(v)}" r="3.5"
    fill="#F472B6" stroke="#0d1117" stroke-width="1.5">
    <title>Day ${i+1}: ${v} contributions</title>
  </circle>
`).join("");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
  width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="area" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity=".3"/>
      <stop offset="100%" stop-color="#A78BFA" stop-opacity=".01"/>
    </linearGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#0d1117"/>

  <text x="${W/2}" y="30" text-anchor="middle"
    fill="#36BCF7" font-size="21" font-weight="bold">
    Ons Rekik's Daily GitHub Activity
  </text>

  <text x="${W/2}" y="50" text-anchor="middle"
    fill="#a8c0ff" font-size="13">${monthName} ${year}</text>

  ${horizontal}
  ${vertical}

  <path d="${area}" fill="url(#area)"/>
  <path d="${line}" fill="none" stroke="#A78BFA"
    stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>

  ${circles}

  <text x="${W/2}" y="${H-8}" text-anchor="middle"
    fill="#8b949e" font-size="12">Day of the month</text>

  <text x="18" y="${H/2}" text-anchor="middle"
    fill="#8b949e" font-size="12"
    transform="rotate(-90 18 ${H/2})">Contributions</text>
</svg>`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/activity-graph.svg", svg);

console.log("Activity graph generated successfully!");
