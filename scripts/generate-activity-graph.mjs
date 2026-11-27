
const svg = `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${width}" height="${height}"
     viewBox="0 0 ${width} ${height}">

  <rect width="${width}" height="${height}"
        rx="20" fill="#151321"/>

  <!-- Title -->
  <text x="${width / 2}" y="27"
        fill="#d8bdff"
        font-size="21"
        font-weight="600"
        text-anchor="middle">
    Ons' Contributions
  </text>

  ${horizontalGrid.join("")}

  <!-- Thin vertical projection lines -->
  ${points.map(point => `
    <line
      x1="${point.x}" y1="${point.y}"
      x2="${point.x}" y2="${top + chartHeight}"
      stroke="#bd91ff"
      stroke-width="0.8"
      stroke-opacity="0.25"
      stroke-dasharray="3 4"/>
  `).join("")}

  <!-- Smooth curve -->
  <path d="${linePath}"
        fill="none"
        stroke="#bd91ff"
        stroke-width="3.5"
        stroke-linecap="round"
        stroke-linejoin="round"/>

  <!-- Days -->
  ${xLabels}

  <!-- Y axis -->
  <text x="20"
        y="${top + chartHeight / 2}"
        fill="#c5bddb"
        font-size="13"
        text-anchor="middle"
        transform="rotate(-90 20 ${top + chartHeight / 2})">
    Number of Contributions
  </text>

  <!-- X axis -->
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
