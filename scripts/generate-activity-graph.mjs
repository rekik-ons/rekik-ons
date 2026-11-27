
import fs from "node:fs";

const token = process.env.GH_TOKEN;

if (!token) {
  throw new Error("GH_TOKEN is missing. Add it to GitHub repository secrets.");
}

const username = "rekik-ons";
const now = new Date();
const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

const query = `
query($login: String!, $from: DateTime!, $to: DateTime!) {
  user(login: $login) {
    contributionsCollection(from: $from, to: $to) {
      contributionCalendar {
        totalContributions
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
  body: JSON.stringify({
    query,
    variables: {
      login: username,
      from: start.toISOString(),
      to: end.toISOString()
    }
  })
});

const result = await response.json();

if (!response.ok || result.errors) {
  throw new Error(JSON.stringify(result.errors || result));
}

const days = result.data.user.contributionsCollection
  .contributionCalendar.weeks
  .flatMap(week => week.contributionDays);

const width = 1000;
const height = 390;
const left = 65;
const right = 25;
const top = 35;
const bottom = 55;
const chartWidth = width - left - right;
const chartHeight = height - top - bottom;

const max = Math.max(1, ...days.map(d => d.contributionCount));
const points = days.map((d, i) => ({
  x: left + (i / Math.max(1, days.length - 1)) * chartWidth,
  y: top + chartHeight - (d.contributionCount / max) * chartHeight,
  count: d.contributionCount
}));

const path = points.map((p, i) =>
  `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
).join(" ");

const grid = [];
for (let i = 0; i <= 5; i++) {
  const y = top + (chartHeight / 5) * i;
  grid.push(`<line x1="${left}" y1="${y}" x2="${width-right}" y2="${y}" stroke="#34304b" stroke-width="1"/>`);
}

for (let i = 0; i < days.length; i += 1) {
  const x = left + (i / Math.max(1, days.length - 1)) * chartWidth;
  grid.push(`<line x1="${x}" y1="${top}" x2="${x}" y2="${height-bottom}" stroke="#28243d" stroke-width="0.7"/>`);
}

const labels = points.map((p, i) => {
  if (i % 3 !== 0 && i !== points.length - 1) return "";
  return `<text x="${p.x}" y="${height-22}" fill="#aaa3c7" font-size="12" text-anchor="middle">${i + 1}</text>`;
}).join("");

const circles = points.map(p =>
  `<circle cx="${p.x}" cy="${p.y}" r="3.5" fill="#b58cff"><title>${p.count} contributions</title></circle>`
).join("");

const month = start.toLocaleString("en-US", { month: "long", timeZone: "UTC" });
const year = start.getUTCFullYear();
const total = result.data.user.contributionsCollection.contributionCalendar.totalContributions;

const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" rx="16" fill="#151321"/>
  <text x="${left}" y="24" fill="#eee8ff" font-size="17" font-weight="bold">${month} ${year} · ${total} contributions</text>
  ${grid.join("\n")}
  <path d="${path}" fill="none" stroke="#b58cff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  ${circles}
  ${labels}
  <text x="18" y="${top + chartHeight/2}" fill="#aaa3c7" font-size="12" transform="rotate(-90 18 ${top + chartHeight/2})" text-anchor="middle">Contributions</text>
  <text x="${left + chartWidth/2}" y="${height-5}" fill="#aaa3c7" font-size="12" text-anchor="middle">Day of month</text>
</svg>`;

fs.mkdirSync("assets", { recursive: true });
fs.writeFileSync("assets/activity-graph.svg", svg.trim() + "\n");

console.log("Activity graph generated successfully.");
