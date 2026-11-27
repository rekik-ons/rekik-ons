
import fs from "node:fs";

const token = process.env.GH_TOKEN;

const query = `
query {
  user(login: "rekik-ons") {
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

const result = await response.json();

if (result.errors) {
  throw new Error(JSON.stringify(result.errors));
}

const days = result.data.user.contributionsCollection
  .contributionCalendar.weeks
  .flatMap(week => week.contributionDays);

const now = new Date();
const year = now.getUTCFullYear();
const month = now.getUTCMonth();
const dayCount = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

const contributionsByDate = new Map(
  days.map(day => [day.date, day.contributionCount])
);

const dailyData = Array.from({ length: dayCount }, (_, i) => {
  const date = new Date(Date.UTC(year, month, i + 1))
    .toISOString()
    .slice(0, 10);

  return {
    day: i + 1,
    count: contributionsByDate.get(date) ?? 0
  };
});

const width = 1200;
const height = 430;
const left = 75;
const right = 25;
const top = 30;
const bottom = 75;

const chartWidth = width - left - right;
const chartHeight = height - top - bottom;

const max = Math.max(5, ...dailyData.map(d => d.count));
const step = Math.max(1, Math.ceil(max / 5));
const yMax = step * 5;

const points = dailyData.map((d, i) => ({
  x: left + (i / Math.max(1, dayCount - 1)) * chartWidth,
  y: top + chartHeight - (d.count / yMax) * chartHeight
}));

// Y axis: contribution counts
const horizontalGrid = [];

for (let value = 0; value <= yMax; value += step) {
  const y = top + chartHeight - (value / yMax) * chartHeight;

  horizontalGrid.push(`
    <line x1="${left}" y1="${y}"
          x2="${width - right}" y2="${y}"
          stroke="#39334f" stroke-width="1"/>

    <text x="${left - 15}" y="${y + 4}"
          fill="#c5bddb" font-size="13"
          text-anchor="end">${value}</text>
  `);
}

// All days on X axis
const xLabels = dailyData.map((d, i) => `
  <text x="${points[i].x}" y="${height - bottom + 25}"
        fill="#c5bddb" font-size="12"
        text-anchor="middle">${d.day}</text>
`).join("");

// Smooth rounded curve
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

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }

  return path;
}

const linePath = createSmoothPath(points);

const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">

  <rect width="${width}" height="${height}"
        rx="20" fill="#151321"/>

  ${horizontalGrid.join("")}

  <path d="${linePath}"
        fill="none"
        stroke="#bd91ff"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"/>

  ${xLabels}

  <text x="20"
        y="${top + chartHeight / 2}"
        fill="#c5bddb"
        font-size="13"
        text-anchor="middle"
        transform="rotate(-90 20 ${top + chartHeight / 2})">
    Number of Contributions
  </text>

  <text x="${left + chartWidth / 2}"
        y="${height - 12}"
        fill="#c5bddb"
        font-size="13"
        text-anchor="middle">
    Days of the Month
  </text>

</svg>
`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/activity-graph.svg", svg.trim() + "\n");

console.log("Activity graph generated successfully!");
