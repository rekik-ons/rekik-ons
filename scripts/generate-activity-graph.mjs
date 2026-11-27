
import fs from "node:fs";

// GitHub configuration
const token = process.env.GH_TOKEN;
const username = "rekik-ons";

if (!token) {
  throw new Error("GH_TOKEN is missing.");
}

// Fetch GitHub contribution calendar
const query = `
query {
  user(login: "${username}") {
    contributionsCollection {
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

const user = result.data?.user;

if (!user) {
  throw new Error("GitHub user not found.");
}

// Get contribution data
const days = user.contributionsCollection
  .contributionCalendar.weeks
  .flatMap(week => week.contributionDays);

// Current month
const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();

const dayCount = new Date(
  Date.UTC(year, month + 1, 0)
).getUTCDate();

// Map contributions by date
const contributionsByDate = new Map(
  days.map(day => [day.date, day.contributionCount])
);

// Create daily data
const dailyData = Array.from({ length: dayCount }, (_, i) => {
  const date = new Date(Date.UTC(year, month, i + 1))
    .toISOString()
    .slice(0, 10);

  return {
    day: i + 1,
    count: contributionsByDate.get(date) ?? 0
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

// Y-axis scale
const maxContributions = Math.max(
  5,
  ...dailyData.map(d => d.count)
);

const step = Math.max(
  1,
  Math.ceil(maxContributions / 5)
);

const yMax = step * 5;

// Calculate graph coordinates
const points = dailyData.map((d, i) => ({
  x: left + (i / Math.max(1, dayCount - 1)) * chartWidth,
  y: top + chartHeight - (d.count / yMax) * chartHeight,
  day: d.day,
  count: d.count
}));


// Millimeter-paper grid (small squares)
const horizontalGrid = [];

const gridStepX = chartWidth / (dayCount - 1);
const gridStepY = chartHeight / 20;

// Vertical grid lines
for (let x = left; x <= width - right + 0.1; x += gridStepX) {
  horizontalGrid.push(`
    <line
      x1="${x}"
      y1="${top}"
      x2="${x}"
      y2="${top + chartHeight}"
      stroke="#39334f"
      stroke-width="0.7"
      opacity="0.55"
    />
  `);
}

// Horizontal grid lines
for (let y = top; y <= top + chartHeight + 0.1; y += gridStepY) {
  horizontalGrid.push(`
    <line
      x1="${left}"
      y1="${y}"
      x2="${width - right}"
      y2="${y}"
      stroke="#39334f"
      stroke-width="0.7"
      opacity="0.55"
    />
  `);
}

// Y-axis labels
for (let value = 0; value <= yMax; value += step) {
  const y = top + chartHeight - (value / yMax) * chartHeight;

  horizontalGrid.push(`
    <text
      x="${left - 15}"
      y="${y + 4}"
      fill="#c5bddb"
      font-size="13"
      text-anchor="end"
    >${value}</text>
  `);
}

// All days on X-axis
const xLabels = points.map(point => `
  <text
    x="${point.x}"
    y="${height - bottom + 25}"
    fill="#c5bddb"
    font-size="12"
    text-anchor="middle"
  >${point.day}</text>
`).join("");

// Smooth rounded curve using cubic Bezier
function createSmoothPath(points) {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const tension = 0.18;

    const cp1x = p1.x + (p2.x - p0.x) * tension;
    const cp1y = p1.y + (p2.y - p0.y) * tension;

    const cp2x = p2.x - (p3.x - p1.x) * tension;
    const cp2y = p2.y - (p3.y - p1.y) * tension;

    path += `
      C ${cp1x} ${cp1y},
        ${cp2x} ${cp2y},
        ${p2.x} ${p2.y}
    `;
  }

  return path;
}

const linePath = createSmoothPath(points);

// Vertical projection lines
const projectionLines = points.map(point => `
  <line
    x1="${point.x}"
    y1="${point.y}"
    x2="${point.x}"
    y2="${top + chartHeight}"
    stroke="#bd91ff"
    stroke-width="0.8"
    stroke-opacity="0.25"
    stroke-dasharray="3 4"
  />
`).join("");

// Final SVG
const svg = `
<svg
  xmlns="http://www.w3.org/2000/svg"
  width="${width}"
  height="${height}"
  viewBox="0 0 ${width} ${height}"
>

  <!-- Background -->
  <rect
    width="${width}"
    height="${height}"
    rx="20"
    ry="20"
    fill="#151321"
  />

  <!-- Title -->
  <text
    x="${width / 2}"
    y="35"
    fill="#d8bdff"
    font-size="22"
    font-weight="600"
    text-anchor="middle"
  >
    Ons' Contributions
  </text>

  <!-- Horizontal grid -->
  ${horizontalGrid.join("")}

  <!-- Vertical projection lines -->
  ${projectionLines}

  <!-- Smooth contribution curve -->
  <path
    d="${linePath}"
    fill="none"
    stroke="#bd91ff"
    stroke-width="3.5"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  <!-- Days of the month -->
  ${xLabels}

  <!-- Y-axis title -->
  <text
    x="20"
    y="${top + chartHeight / 2}"
    fill="#c5bddb"
    font-size="13"
    text-anchor="middle"
    transform="rotate(-90 20 ${top + chartHeight / 2})"
  >
    Number of Contributions
  </text>

  <!-- X-axis title -->
  <text
    x="${left + chartWidth / 2}"
    y="${height - 12}"
    fill="#c5bddb"
    font-size="13"
    text-anchor="middle"
  >
    Days of the Month
  </text>

</svg>
`;

// Save SVG
fs.mkdirSync("assets", { recursive: true });

fs.writeFileSync(
  "assets/activity-graph.svg",
  svg.trim() + "\n"
);

console.log("Monthly activity graph generated successfully!");
