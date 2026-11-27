
import fs from "node:fs";

const username = "rekik-ons";
const token = process.env.GH_TOKEN;

if (!token) {
  throw new Error("GH_TOKEN is missing.");
}

const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();

const firstDay = new Date(Date.UTC(year, month, 1));
const lastDay = new Date(Date.UTC(year, month + 1, 0));

const iso = (date) => date.toISOString();

const query = `
query {
  user(login: "${username}") {
    contributionsCollection(
      from: "${iso(firstDay)}"
      to: "${iso(lastDay)}"
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
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

if (!response.ok) {
  throw new Error(`GitHub API error: ${response.status}`);
}

const result = await response.json();

if (result.errors) {
  throw new Error(JSON.stringify(result.errors));
}

const days =
  result.data.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays);

const daysInMonth = lastDay.getUTCDate();

const values = Array.from({ length: daysInMonth }, (_, index) => {
  const date = new Date(Date.UTC(year, month, index + 1))
    .toISOString()
    .slice(0, 10);

  return days.find((day) => day.date === date)?.contributionCount ?? 0;
});

// SVG dimensions
const width = 1100;
const height = 420;

const left = 65;
const right = 30;
const top = 65;
const bottom = 75;

const graphWidth = width - left - right;
const graphHeight = height - top - bottom;

const maxValue = Math.max(...values, 1);
const yMax = Math.max(5, Math.ceil(maxValue / 5) * 5);

const x = (index) =>
  left + (index / Math.max(daysInMonth - 1, 1)) * graphWidth;

const y = (value) =>
  top + graphHeight - (value / yMax) * graphHeight;

const monthName = new Intl.DateTimeFormat("en", {
  month: "long",
  timeZone: "UTC",
}).format(now);

const horizontalLines = Array.from(
  { length: 6 },
  (_, index) => {
    const value = (yMax / 5) * index;
    const position = y(value);

    return `
      <line x1="${left}" y1="${position}" x2="${width - right}" y2="${position}"
        stroke="#24334b" stroke-width="1" stroke-dasharray="3 5"/>
      <text x="${left - 15}" y="${position + 4}" text-anchor="end"
        fill="#36BCF7" font-size="12">${Math.round(value)}</text>
    `;
  }
).join("");

const verticalLines = Array.from(
  { length: daysInMonth },
  (_, index) => `
    <line x1="${x(index)}" y1="${top}"
      x2="${x(index)}" y2="${height - bottom}"
      stroke="#1b2b40" stroke-width="1" opacity="0.75"/>
    <text x="${x(index)}" y="${height - 35}"
      text-anchor="middle" fill="#36BCF7" font-size="11">
      ${index + 1}
    </text>
  `
).join("");

const points = values.map((value, index) => ({
  x: x(index),
  y: y(value),
}));

const linePath = points
  .map((point, index) =>
    `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`
  )
  .join(" ");

const areaPath = `
  ${linePath}
  L ${x(daysInMonth - 1)} ${y(0)}
  L ${x(0)} ${y(0)}
  Z
`;

const circles = points.map((point, index) => `
  <circle cx="${point.x}" cy="${point.y}" r="3.5"
    fill="#F472B6" stroke="#0d1117" stroke-width="1.5">
    <title>Day ${index + 1}: ${values[index]} contributions</title>
  </circle>
`).join("");

const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
  width="100%" viewBox="0 0 ${width} ${height}">

  <defs>
    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#A78BFA" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#A78BFA" stop-opacity="0.01"/>
    </linearGradient>

    <filter id="glow">
      <feGaussianBlur stdDeviation="3" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>

  <rect width="${width}" height="${height}" fill="#0d1117"/>

  <text x="${width / 2}" y="30" text-anchor="middle"
    fill="#36BCF7" font-size="21" font-weight="bold">
    Ons Rekik's Daily GitHub Activity
  </text>

  <text x="${width / 2}" y="50" text-anchor="middle"
    fill="#a8c0ff" font-size="13">
    ${monthName} ${year}
  </text>

  ${horizontalLines}
  ${verticalLines}

  <path d="${areaPath}" fill="url(#areaGradient)"/>

  <path d="${linePath}" fill="none"
    stroke="#A78BFA" stroke-width="3"
    stroke-linejoin="round" stroke-linecap="round"
    filter="url(#glow)"/>

  ${circles}

  <text x="${width / 2}" y="${height - 8}"
    text-anchor="middle" fill="#8b949e" font-size="12">
    Day of the month
  </text>

  <text x="18" y="${height / 2}"
    text-anchor="middle" fill="#8b949e" font-size="12"
    transform="rotate(-90 18 ${height / 2})">
    Contributions
  </text>
</svg>
`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/activity-graph.svg", svg);

console.log("Activity graph generated successfully!");
