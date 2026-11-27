
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
  0,
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

// Horizontal grid and Y-axis labels
const horizontalGrid = [];

for (let value = 0; value <= yMax; value += step) {
  const y = top + chartHeight - (value / yMax) * chartHeight;

  horizontalGrid.push(`
    <line
      x1="${left}" y1="${y}"
      x2="${width - right}" y2="${y}"
      stroke="#39334f"
      stroke-width="1"
    />
    <text
      x="${left - 15}" y="${y + 4}"
      fill="#c5bddb"
      font-size="13"
      text-anchor="end"
    >${value}</text>
  `);
}

// Vertical grid and ALL day labels
const verticalGrid = [];
const xLabels = [];

points.forEach(point => {
  verticalGrid.push(`
    <line
      x1="${point.x}" y1="${top}"
      x2="${point.x}" y2="${height - bottom}"
      stroke="#29243c"
      stroke-width="0.8"
    />
  `);

  xLabels.push(`
    <text
      x="${point.x}" y="${height - bottom + 25}"
      fill="#c5bddb"
      font-size="12"
      text-anchor="middle"
    >${point.day}</text>
  `);
});

// Connected contribution curve
const linePath = points.map((point, i) =>
  `${i === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`
).join(" ");

// Points on the curve
const circles = points.map(point => `
  <circle
    cx="${point.x}"
    cy="${point.y}"
    r="3.5"
    fill="#bd91ff"
  >
    <title>Day ${point.day}: ${point.count} contributions</title>
  </circle>
`).join("");

// Final SVG
const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">

  <rect width="100%" height="100%" rx="16" fill="#151321"/>

  ${horizontalGrid.join("")}
  ${verticalGrid.join("")}

  <path
    d="${linePath}"
    fill="none"
    stroke="#bd91ff"
    stroke-width="3"
    stroke-linecap="round"
    stroke-linejoin="round"
  />

  ${circles}
  ${xLabels.join("")}

  <text
    x="20"
    y="${top + chartHeight / 2}"
    fill="#c5bddb"
    font-size="13"
    text-anchor="middle"
    transform="rotate(-90 20 ${top + chartHeight / 2})"
  >Contributions</text>

  <text
    x="${left + chartWidth / 2}"
    y="${height - 12}"
    fill="#c5bddb"
    font-size="13"
    text-anchor="middle"
  >Day of month</text>

</svg>
`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/activity-graph.svg", svg.trim() + "\n");

console.log("Monthly activity graph generated successfully.");
