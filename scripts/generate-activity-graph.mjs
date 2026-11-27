
const days = result.data.user.contributionsCollection
  .contributionCalendar.weeks
  .flatMap(week => week.contributionDays);

const contributionsByDate = new Map(
  days.map(day => [day.date, day.contributionCount])
);

const year = start.getUTCFullYear();
const monthIndex = start.getUTCMonth();
const dayCount = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();

const dailyData = Array.from({ length: dayCount }, (_, i) => {
  const date = new Date(Date.UTC(year, monthIndex, i + 1))
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

const maxContributions = Math.max(
  1,
  ...dailyData.map(d => d.count)
);

const step = Math.max(1, Math.ceil(maxContributions / 5));
const yMax = step * 5;

const points = dailyData.map((d, i) => ({
  x: left + (i / Math.max(1, dayCount - 1)) * chartWidth,
  y: top + chartHeight - (d.count / yMax) * chartHeight,
  count: d.count,
  day: d.day
}));

// Y-axis: contribution counts
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

// X-axis: every day of the month
const xLabels = points.map(point => `
  <text x="${point.x}" y="${height - bottom + 25}"
        fill="#c5bddb" font-size="12"
        text-anchor="middle">${point.day}</text>
`).join("");

// Smooth curve using cubic Bézier interpolation
function smoothPath(points) {
  if (points.length < 2) return "";

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const previous = points[i - 1] || points[i];
    const current = points[i];
    const next = points[i + 1];
    const afterNext = points[i + 2] || next;

    const tension = 0.18;

    const cp1x = current.x + (next.x - previous.x) * tension;
    const cp1y = current.y + (next.y - previous.y) * tension;

    const cp2x = next.x - (afterNext.x - current.x) * tension;
    const cp2y = next.y - (afterNext.y - current.y) * tension;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
  }

  return path;
}

const linePath = smoothPath(points);

// SVG
const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">

  <rect width="100%" height="100%"
        rx="20" ry="20" fill="#151321"/>

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

console.log("Monthly activity graph generated successfully.");
