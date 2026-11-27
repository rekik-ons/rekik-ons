import fs from "node:fs";

// GitHub configuration
const token = process.env.GH_TOKEN;
const username = "rekik-ons";

if (!token) {
  throw new Error("GH_TOKEN is missing.");
}

// Current month (UTC)
const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();
const today = now.getUTCDate();
const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

// Ask GitHub for exactly the current month (default range is "last year")
const from = new Date(Date.UTC(year, month, 1)).toISOString();
const to = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59)).toISOString();

const query = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
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
}
`;

const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "activity-graph-generator"
  },
  body: JSON.stringify({
    query,
    variables: { login: username, from, to }
  })
});

if (!response.ok) {
  throw new Error(`GitHub API error: ${response.status}`);
}

const result = await response.json();

if (result.errors) {
  throw new Error(JSON.stringify(result.errors));
}

const user = result.data?.user;

if (!user) {
  throw new Error("GitHub user not found.");
}

const days = user.contributionsCollection
  .contributionCalendar.weeks
  .flatMap(week => week.contributionDays);

const contributionsByDate = new Map(
  days.map(day => [day.date, day.contributionCount])
);

// Daily data: only up to today, so future days don't drop to zero
const dailyData = Array.from({ length: today }, (_, i) => {
  const date = new Date(Date.UTC(year, month, i + 1))
    .toISOString()
    .slice(0, 10);

  return {
    day: i + 1,
    count: Math.max(0, contributionsByDate.get(date) ?? 0)
  };
});

// SVG dimensions
const width = 1200;
const height = 460;

const left = 85;
const right = 30;
const top = 65;
const bottom = 80;

const chartWidth = width - left - right;
const chartHeight = height - top - bottom;
const baseline = top + chartHeight;

// Y-axis scale: always starts at zero
const maxContributions = Math.max(5, ...dailyData.map(d => d.count));
const step = Math.max(1, Math.ceil(maxContributions / 5));
const yMax = step * 5;

// X positions span the full month, even if the month isn't over
const xFor = dayIndex => left + (dayIndex / Math.max(1, dayCount - 1)) * chartWidth;

const points = dailyData.map((d, i) => ({
  x: xFor(i),
  y: baseline - (d.count / yMax) * chartHeight,
  day: d.day,
  count: d.count
}));

// Millimeter-paper grid
const grid = [];
const yLabels = [];

const gridStepY = chartHeight / 20;
const gridStepX = chartWidth / Math.max(1, dayCount - 1);

for (let i = 0; i < dayCount; i++) {
  const x = left + i * gridStepX;
  grid.push(
    `<line x1="${x}" y1="${top}" x2="${x}" y2="${baseline}" stroke="#39334f" stroke-width="0.7" opacity="0.65"/>`
  );
}

for (let i = 0; i <= 20; i++) {
  const y = top + i * gridStepY;
  grid.push(
    `<line x1="${left}" y1="${y}" x2="${width - right}" y2="${y}" stroke="#39334f" stroke-width="0.7" opacity="0.65"/>`
  );
}

// Y-axis labels
for (let value = 0; value <= yMax; value += step) {
  const y = baseline - (value / yMax) * chartHeight;
  yLabels.push(
    `<text x="${left - 15}" y="${y + 4}" fill="#c5bddb" font-size="13" text-anchor="end">${value}</text>`
  );
}

// X-axis labels: every day of the month
const xLabels = Array.from({ length: dayCount }, (_, i) =>
  `<text x="${xFor(i)}" y="${height - bottom + 25}" fill="#c5bddb" font-size="12" text-anchor="middle">${i + 1}</text>`
).join("");

// Smooth curve (cubic Bezier), with control points clamped to the chart area
// so the curve never dips below the X-axis or above the top
const clampY = y => Math.min(baseline, Math.max(top, y));

function createSmoothPath(pts) {
  if (pts.length < 2) return "";

  let path = `M ${pts[0].x} ${pts[0].y}`;
  const tension = 0.18;

  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = clampY(p1.y + (p2.y - p0.y) * tension);

    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = clampY(p2.y - (p3.y - p1.y) * tension);

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

const linePath = createSmoothPath(points);

// Vertical projection lines
const projectionLines = points.map(p =>
  `<line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${baseline}" stroke="#bd91ff" stroke-width="0.8" stroke-opacity="0.25" stroke-dasharray="3 4"/>`
).join("");

// Dots (also makes a single data point visible on day 1)
const dots = points.map(p =>
  `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#bd91ff"/>`
).join("");

// Colors
const axisColor = "#39d5ff";
const curveColor = "#bd91ff";

const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
  font-family="Segoe UI, Helvetica, Arial, sans-serif"
>
  <rect width="${width}" height="${height}" rx="20" ry="20" fill="#151321"/>

  <text x="${width / 2}" y="35" fill="#d8bdff" font-size="22" font-weight="600" text-anchor="middle">
    Ons' Contributions
  </text>

  ${grid.join("")}
  ${projectionLines}

  <path
    d="${linePath}"
    fill="none"
    stroke="${curveColor}"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />
  ${dots}

  <line x1="${left}" y1="${top}" x2="${left}" y2="${baseline}" stroke="${axisColor}" stroke-width="1.8"/>
  <line x1="${left}" y1="${baseline}" x2="${width - right}" y2="${baseline}" stroke="${axisColor}" stroke-width="1.8"/>

  ${yLabels.join("")}
  ${xLabels}

  <text
    x="20"
    y="${top + chartHeight / 2}"
    fill="#c5bddb"
    font-size="13"
    text-anchor="middle"
    transform="rotate(-90 20 ${top + chartHeight / 2})"
  >Number of Contributions</text>

  <text x="${left + chartWidth / 2}" y="${height - 12}" fill="#c5bddb" font-size="13" text-anchor="middle">
    Days of the Month
  </text>
</svg>
`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/activity-graph.svg", svg.trim() + "\n");

console.log("Monthly activity graph generated successfully!");
