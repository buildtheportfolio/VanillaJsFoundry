"use strict";

const PALETTES = {
  neon: [
    "#00FF88",
    "#00AAFF",
    "#FF6B35",
    "#FF00AA",
    "#AA00FF",
    "#FFDD00",
    "#00FFDD",
    "#FF4466",
    "#44FFAA",
    "#FF8800",
    "#00FF44",
    "#8800FF",
    "#FF0044",
    "#0044FF",
    "#44FF00",
  ],
  pastel: [
    "#FFB3BA",
    "#FFDFBA",
    "#FFFFBA",
    "#BAFFC9",
    "#BAE1FF",
    "#D4BAFF",
    "#FFD4BA",
    "#C9FFBA",
    "#BABEFF",
    "#FFE4BA",
    "#BAFFE4",
    "#FFBADF",
    "#BAFFFF",
    "#F0BAFF",
    "#BAFFF0",
  ],
  fire: [
    "#FF0000",
    "#FF4400",
    "#FF6600",
    "#FF8800",
    "#FFAA00",
    "#FFCC00",
    "#FFEE00",
    "#FF2200",
    "#FF5500",
    "#FF7700",
    "#FF9900",
    "#FFBB00",
    "#FFDD00",
    "#FF1100",
    "#FF3300",
  ],
  ocean: [
    "#006994",
    "#0088AA",
    "#00AACC",
    "#00CCEE",
    "#00EEFF",
    "#1199AA",
    "#22AABB",
    "#33BBCC",
    "#44CCDD",
    "#55DDEE",
    "#0077BB",
    "#0099CC",
    "#00BBDD",
    "#00DDEE",
    "#00BBFF",
  ],
  earthy: [
    "#8B4513",
    "#A0522D",
    "#CD853F",
    "#D2691E",
    "#DEB887",
    "#BC8F5F",
    "#C19A6B",
    "#AC7339",
    "#996633",
    "#8B6914",
    "#B8860B",
    "#DAA520",
    "#FFD700",
    "#B8A000",
    "#A07800",
  ],
};

const DATASETS = {
  tech: {
    title: "Technology Companies by Market Capitalization",
    unit: "USD Billions",
    icon: "💻",
    labels: [
      "Apple",
      "Microsoft",
      "NVIDIA",
      "Amazon",
      "Alphabet",
      "Meta",
      "Tesla",
      "Samsung",
      "TSMC",
      "Berkshire",
      "Visa",
      "Oracle",
      "ASML",
      "Broadcom",
      "JP Morgan",
    ],
    icons: [
      "🍎",
      "🪟",
      "🟩",
      "📦",
      "🔵",
      "👤",
      "⚡",
      "📱",
      "🔬",
      "💰",
      "💳",
      "☁️",
      "⚙️",
      "📡",
      "🏦",
    ],
    startYear: 2010,
    endYear: 2032,
    growthRates: [
      [
        180, 350, 480, 500, 650, 780, 700, 750, 820, 950, 2200, 2700, 3000,
        2800, 3500, 3000, 3200, 3600, 4200, 4800, 5200,
      ],
      [
        160, 250, 310, 380, 410, 470, 530, 610, 750, 890, 1700, 2100, 2500,
        2800, 3100, 3000, 3300, 3800, 4400, 5000, 5500,
      ],
      [
        2, 5, 7, 8, 11, 13, 14, 12, 16, 20, 120, 300, 600, 1200, 2800, 3200,
        4000, 5500, 7200, 8500, 10000,
      ],
      [
        140, 100, 150, 180, 250, 360, 400, 440, 480, 730, 1500, 1700, 1900,
        1100, 1800, 2200, 2400, 2800, 3200, 3600, 4000,
      ],
      [
        70, 160, 230, 280, 340, 380, 420, 520, 580, 730, 1200, 1400, 1600, 1700,
        2100, 2000, 2300, 2600, 3000, 3400, 3800,
      ],
      [
        20, 50, 70, 120, 150, 130, 160, 190, 250, 480, 850, 1100, 500, 600,
        1200, 1400, 1600, 1800, 2200, 2600, 3000,
      ],
      [
        0.1, 0.1, 1, 3, 6, 20, 35, 50, 60, 800, 700, 1000, 350, 400, 560, 650,
        900, 1400, 2000, 2800, 3500,
      ],
      [
        90, 130, 160, 200, 200, 210, 220, 180, 200, 230, 280, 300, 260, 320,
        370, 380, 420, 450, 480, 520, 550,
      ],
      [
        40, 60, 80, 110, 130, 140, 160, 180, 200, 270, 450, 600, 550, 700, 850,
        900, 1200, 1600, 2000, 2500, 3000,
      ],
      [
        150, 190, 220, 250, 290, 320, 340, 360, 400, 530, 700, 780, 870, 700,
        780, 870, 920, 980, 1050, 1100, 1200,
      ],
      [
        50, 90, 110, 130, 150, 160, 200, 240, 270, 330, 500, 600, 480, 520, 560,
        620, 700, 800, 950, 1100, 1300,
      ],
      [
        30, 40, 50, 60, 80, 110, 130, 140, 170, 260, 310, 360, 320, 340, 380,
        420, 500, 600, 750, 900, 1100,
      ],
      [
        15, 20, 30, 45, 60, 80, 110, 130, 160, 220, 330, 420, 280, 350, 320,
        350, 500, 750, 1000, 1400, 1800,
      ],
      [
        5, 10, 15, 18, 22, 35, 50, 70, 90, 140, 200, 280, 250, 290, 350, 400,
        550, 800, 1100, 1500, 2000,
      ],
      [
        120, 140, 160, 180, 200, 220, 240, 280, 320, 400, 460, 490, 440, 500,
        580, 620, 650, 680, 720, 760, 800,
      ],
    ],
    milestones: [
      { year: 2011, label: "iPhone 4S" },
      { year: 2015, label: "Cloud Boom" },
      { year: 2020, label: "Pandemic Shift" },
      { year: 2023, label: "Generative AI" },
      { year: 2027, label: "AGI Horizon" },
      { year: 2030, label: "Neural Interfaces" },
    ],
  },
  population: {
    title: "World Population by Country",
    unit: "Millions",
    icon: "🌍",
    labels: [
      "China",
      "India",
      "USA",
      "Indonesia",
      "Pakistan",
      "Brazil",
      "Nigeria",
      "Bangladesh",
      "Russia",
      "Ethiopia",
      "Mexico",
      "Japan",
      "Philippines",
      "Congo DRC",
      "Egypt",
    ],
    icons: [
      "🇨🇳",
      "🇮🇳",
      "🇺🇸",
      "🇮🇩",
      "🇵🇰",
      "🇧🇷",
      "🇳🇬",
      "🇧🇩",
      "🇷🇺",
      "🇪🇹",
      "🇲🇽",
      "🇯🇵",
      "🇵🇭",
      "🇨🇩",
      "🇪🇬",
    ],
    startYear: 1980,
    endYear: 2050,
    growthRates: [
      [
        980, 1040, 1120, 1150, 1200, 1250, 1270, 1290, 1330, 1370, 1400, 1430,
        1450, 1410, 1420, 1430, 1425, 1410, 1390, 1360, 1320,
      ],
      [
        700, 780, 840, 900, 960, 1010, 1060, 1110, 1160, 1210, 1260, 1320, 1370,
        1390, 1420, 1450, 1500, 1550, 1600, 1640, 1670,
      ],
      [
        225, 238, 250, 263, 275, 285, 295, 300, 305, 310, 315, 318, 320, 322,
        325, 332, 340, 350, 360, 370, 375,
      ],
      [
        150, 162, 175, 187, 200, 212, 224, 236, 244, 252, 261, 270, 275, 280,
        274, 278, 290, 300, 310, 320, 330,
      ],
      [
        85, 95, 108, 120, 135, 150, 160, 170, 178, 187, 197, 206, 213, 220, 230,
        241, 260, 280, 300, 330, 360,
      ],
      [
        120, 130, 138, 146, 155, 163, 170, 178, 184, 191, 198, 206, 212, 214,
        215, 216, 220, 225, 228, 230, 231,
      ],
      [
        70, 80, 92, 106, 122, 139, 159, 182, 206, 232, 262, 295, 326, 360, 218,
        233, 260, 300, 350, 400, 450,
      ],
      [
        80, 88, 97, 106, 114, 122, 129, 136, 142, 147, 152, 158, 163, 166, 170,
        174, 180, 190, 200, 210, 215,
      ],
      [
        139, 143, 146, 148, 148, 147, 146, 145, 144, 143, 143, 143, 144, 145,
        146, 147, 145, 142, 140, 138, 135,
      ],
      [
        35, 40, 47, 55, 64, 75, 86, 100, 115, 128, 142, 157, 172, 188, 126, 132,
        150, 180, 220, 260, 300,
      ],
      [
        70, 75, 82, 88, 95, 101, 107, 111, 114, 116, 119, 122, 126, 129, 130,
        132, 135, 140, 145, 148, 150,
      ],
      [
        117, 119, 120, 121, 122, 122, 122, 122, 122, 121, 120, 120, 118, 116,
        125, 124, 120, 115, 110, 105, 100,
      ],
      [
        47, 52, 58, 63, 69, 74, 80, 86, 92, 98, 105, 112, 109, 113, 114, 117,
        125, 135, 145, 155, 165,
      ],
      [
        27, 30, 35, 40, 45, 50, 56, 63, 71, 81, 93, 108, 110, 120, 100, 105,
        130, 160, 200, 250, 300,
      ],
      [
        40, 44, 49, 55, 61, 66, 72, 76, 80, 84, 89, 94, 100, 103, 106, 108, 120,
        140, 160, 180, 200,
      ],
    ],
  },
  gdp: {
    title: "GDP by Nation (Nominal)",
    unit: "USD Trillions",
    icon: "🌐",
    labels: [
      "USA",
      "China",
      "Japan",
      "Germany",
      "India",
      "UK",
      "France",
      "Canada",
      "Italy",
      "South Korea",
      "Russia",
      "Australia",
      "Brazil",
      "Spain",
      "Mexico",
    ],
    icons: [
      "🇺🇸",
      "🇨🇳",
      "🇯🇵",
      "🇩🇪",
      "🇮🇳",
      "🇬🇧",
      "🇫🇷",
      "🇨🇦",
      "🇮🇹",
      "🇰🇷",
      "🇷🇺",
      "🇦🇺",
      "🇧🇷",
      "🇪🇸",
      "🇲🇽",
    ],
    startYear: 2000,
    endYear: 2040,
    growthRates: [
      [
        10.3, 11.0, 11.5, 12.0, 13.0, 14.0, 14.7, 15.0, 15.5, 16.8, 17.5, 18.2,
        18.7, 19.5, 20.9, 22.0, 23.3, 25.5, 26.9, 27.4, 28.5, 30.0, 32.0, 34.0,
        36.0, 38.0, 40.0,
      ],
      [
        1.2, 1.3, 1.5, 1.7, 1.9, 2.3, 2.7, 3.6, 4.6, 5.1, 6.1, 7.6, 8.5, 9.6,
        10.5, 11.1, 11.2, 12.2, 13.9, 14.3, 17.7, 18.0, 22.0, 26.0, 30.0, 35.0,
        42.0,
      ],
      [
        4.9, 4.2, 4.0, 4.3, 4.7, 4.6, 4.4, 4.5, 5.1, 5.2, 5.7, 6.2, 6.2, 5.2,
        4.9, 4.4, 4.9, 4.9, 4.9, 5.2, 5.1, 4.9, 4.7, 4.5, 4.3, 4.1, 4.0,
      ],
      [
        1.9, 1.9, 2.0, 2.5, 2.8, 2.9, 2.9, 3.4, 3.8, 3.4, 3.9, 3.7, 3.5, 3.9,
        4.0, 3.4, 3.5, 3.7, 4.0, 3.9, 4.3, 4.1, 4.5, 4.8, 5.2, 5.6, 6.0,
      ],
      [
        0.5, 0.5, 0.6, 0.7, 0.8, 0.9, 1.2, 1.2, 1.2, 1.7, 1.8, 2.1, 2.1, 2.0,
        2.1, 2.3, 2.3, 2.7, 2.7, 3.0, 3.4, 4.2, 5.5, 7.2, 9.5, 12.5, 16.0,
      ],
      [
        1.5, 1.6, 1.7, 1.9, 2.2, 2.3, 2.5, 2.7, 2.9, 2.4, 2.5, 2.7, 2.6, 2.9,
        3.0, 2.9, 2.7, 2.7, 2.8, 2.7, 3.1, 3.3, 3.6, 3.9, 4.2, 4.5, 4.8,
      ],
      [
        1.4, 1.4, 1.5, 1.8, 2.1, 2.2, 2.4, 2.7, 2.9, 2.6, 2.7, 2.8, 2.7, 2.8,
        2.9, 2.7, 2.5, 2.6, 2.8, 2.7, 2.9, 3.0, 3.2, 3.4, 3.6, 3.8, 4.0,
      ],
      [
        0.7, 0.7, 0.7, 0.9, 1.0, 1.2, 1.3, 1.5, 1.6, 1.6, 1.8, 1.8, 1.8, 1.8,
        1.8, 1.5, 1.5, 1.6, 1.7, 1.7, 2.0, 2.2, 2.5, 2.8, 3.2, 3.6, 4.0,
      ],
      [
        1.1, 1.2, 1.2, 1.6, 1.8, 1.8, 1.9, 2.2, 2.4, 2.1, 2.2, 2.2, 2.1, 2.1,
        2.2, 1.8, 1.8, 2.0, 2.1, 2.0, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7,
      ],
      [
        0.6, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.1, 1.0, 1.2, 1.3, 1.2, 1.4,
        1.4, 1.4, 1.5, 1.6, 1.7, 1.7, 1.8, 2.0, 2.2, 2.5, 2.8, 3.1, 3.4,
      ],
      [
        0.3, 0.3, 0.3, 0.4, 0.6, 0.8, 1.0, 1.3, 1.7, 1.2, 1.5, 2.0, 2.2, 2.3,
        2.1, 1.4, 1.3, 1.6, 1.8, 1.7, 2.2, 2.4, 2.6, 2.8, 3.0, 3.2, 3.4,
      ],
      [
        0.4, 0.4, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.1, 1.1, 1.3, 1.4, 1.5, 1.6,
        1.7, 1.2, 1.3, 1.4, 1.4, 1.4, 1.6, 1.8, 2.0, 2.2, 2.4, 2.6, 2.8,
      ],
      [
        0.6, 0.6, 0.5, 0.6, 0.7, 0.9, 1.1, 1.4, 1.7, 2.1, 2.2, 2.6, 2.5, 2.5,
        2.4, 1.8, 1.8, 2.1, 1.9, 1.9, 1.6, 1.8, 2.1, 2.5, 3.0, 3.6, 4.2,
      ],
      [
        0.6, 0.6, 0.7, 0.9, 1.1, 1.2, 1.3, 1.5, 1.6, 1.5, 1.5, 1.5, 1.3, 1.4,
        1.4, 1.2, 1.2, 1.3, 1.4, 1.4, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0,
      ],
      [
        0.7, 0.7, 0.7, 0.8, 0.9, 1.0, 1.1, 1.1, 1.2, 1.0, 1.1, 1.2, 1.2, 1.3,
        1.3, 1.2, 1.1, 1.2, 1.2, 1.3, 1.4, 1.6, 1.9, 2.3, 2.8, 3.4, 4.0,
      ],
    ],
  },
  crypto: {
    title: "Cryptocurrency 24h Trading Volume",
    unit: "USD Billions",
    icon: "₿",
    labels: [
      "Bitcoin",
      "Ethereum",
      "Tether",
      "BNB",
      "XRP",
      "USDC",
      "Cardano",
      "Dogecoin",
      "Solana",
      "TRON",
      "Avalanche",
      "Polkadot",
      "Shiba Inu",
      "Polygon",
      "Chainlink",
    ],
    icons: [
      "₿",
      "Ξ",
      "₮",
      "🔶",
      "✕",
      "💲",
      "₳",
      "Ð",
      "◎",
      "🔴",
      "🔺",
      "⬡",
      "🐕",
      "🔷",
      "⬡",
    ],
    startYear: 2017,
    endYear: 2030,
    growthRates: [
      [10, 20, 50, 60, 30, 25, 70, 50, 90, 120, 100, 200, 250, 350, 500, 700],
      [2, 5, 15, 30, 15, 12, 50, 40, 80, 100, 90, 180, 220, 320, 450, 600],
      [0.1, 1, 10, 20, 25, 40, 60, 80, 90, 100, 120, 130, 150, 180, 220, 250],
      [0.5, 2, 8, 15, 20, 30, 50, 40, 60, 80, 70, 100, 120, 150, 200, 250],
      [0.5, 1, 4, 8, 10, 15, 20, 18, 25, 30, 35, 40, 50, 70, 100, 140],
      [0.01, 0.1, 2, 5, 8, 15, 25, 30, 35, 40, 45, 50, 60, 80, 110, 150],
      [0.01, 0.1, 1, 3, 5, 8, 12, 15, 18, 20, 22, 18, 25, 35, 50, 70],
      [0.01, 0.01, 0.5, 5, 15, 10, 8, 20, 15, 18, 12, 10, 15, 25, 40, 60],
      [0.01, 0.01, 0.01, 0.5, 5, 15, 20, 30, 40, 50, 45, 60, 80, 120, 180, 250],
      [0.01, 0.1, 1, 3, 5, 8, 10, 12, 15, 18, 20, 22, 30, 45, 65, 90],
      [0.01, 0.01, 0.1, 1, 3, 8, 12, 15, 18, 20, 18, 14, 25, 40, 60, 90],
      [0.01, 0.01, 0.1, 1, 4, 8, 12, 10, 14, 16, 15, 12, 20, 30, 50, 80],
      [0.01, 0.01, 0.01, 0.01, 0.5, 8, 10, 8, 10, 12, 10, 8, 15, 25, 40, 60],
      [0.01, 0.01, 0.01, 0.5, 3, 8, 12, 14, 18, 20, 18, 15, 25, 40, 65, 100],
      [0.01, 0.01, 0.1, 0.5, 2, 5, 8, 10, 12, 14, 13, 10, 20, 35, 55, 85],
    ],
  },
  ai: {
    title: "AI Training Compute",
    unit: "PetaFLOPS-Days",
    icon: "🧠",
    labels: [
      "AlexNet",
      "ResNet",
      "VGG",
      "GoogLeNet",
      "Transformer",
      "GPT-1",
      "GPT-2",
      "GPT-3",
      "GPT-4",
      "Claude 3",
      "Gemini Ultra",
      "Llama 3",
      "GPT-5 (Est)",
      "GPT-6 (Est)",
      "ASI (Est)",
    ],
    icons: [
      "🖼️",
      "🧱",
      "👁️",
      "🔍",
      "🤖",
      "📄",
      "📚",
      "🧠",
      "🌌",
      "🎭",
      "✨",
      "🦙",
      "🚀",
      "🪐",
      "⚡",
    ],
    startYear: 2012,
    endYear: 2030,
    growthRates: [
      [0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001, 0.001],
      [0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005, 0.005],
      [0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01, 0.01],
      [0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02, 0.02],
      [0.1, 0.2, 0.5, 1, 1, 1, 1, 1, 1, 1],
      [0.1, 0.5, 1, 2, 2, 2, 2, 2, 2, 2],
      [1, 5, 10, 20, 20, 20, 20, 20, 20, 20],
      [1, 10, 100, 500, 1000, 1000, 1000, 1000, 1000, 1000],
      [1, 10, 100, 1000, 5000, 20000, 20000, 20000, 20000, 20000],
      [1, 10, 100, 500, 2000, 8000, 25000, 25000, 25000, 25000],
      [1, 10, 100, 1000, 5000, 15000, 40000, 40000, 40000, 40000],
      [1, 5, 20, 100, 500, 2000, 10000, 30000, 30000, 30000],
      [1, 1, 10, 100, 1000, 10000, 50000, 200000, 500000, 500000],
      [1, 1, 1, 10, 100, 1000, 10000, 100000, 1000000, 5000000],
      [1, 1, 1, 1, 10, 100, 1000, 100000, 10000000, 100000000],
    ],
  },
};

const EASINGS = {
  linear: (t) => t,
  easeIn: (t) => t * t * t,
  easeOut: (t) => 1 - Math.pow(1 - t, 3),
  easeInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  spring: (t) => {
    const c4 = (2 * Math.PI) / 3;
    return t === 0
      ? 0
      : t === 1
        ? 1
        : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  },
  bounce: (t) => {
    const n1 = 7.5625,
      d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

function lerp(a, b, t) {
  return a + (b - a) * t;
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}
function easedLerp(a, b, t, easing) {
  return lerp(a, b, EASINGS[easing](clamp(t, 0, 1)));
}

function formatValue(v, dataset) {
  if (dataset === "gdp") return v.toFixed(1) + "T";
  if (dataset === "population")
    return v >= 1000 ? (v / 1000).toFixed(1) + "B" : Math.round(v) + "M";
  if (dataset === "energy") return v.toFixed(1) + " EJ";
  if (v >= 1000) return (v / 1000).toFixed(1) + "T";
  if (v >= 1) return v.toFixed(0);
  return v.toFixed(2);
}

function interpolateDataset(ds, t) {
  const totalSteps = ds.growthRates[0].length;
  const floatIdx = t * (totalSteps - 1);
  const lo = Math.floor(floatIdx);
  const hi = Math.min(lo + 1, totalSteps - 1);
  const f = floatIdx - lo;
  return ds.labels.map((label, i) => {
    const row = ds.growthRates[i];
    const v = lerp(row[lo] || row[0], row[hi] || row[0], f);
    return { id: i, label, icon: ds.icons[i], value: v };
  });
}

let canvas, ctx;
let dpr = 1;
let state = {
  dataset: "tech",
  playing: false,
  looping: true,
  t: 0,
  speed: 1,
  topN: 8,
  smoothingFrames: 40,
  staggerFrames: 3,
  easing: "easeOut",
  palette: "neon",
  barH: 38,
  barGap: 8,
  cornerR: 6,
  labelW: 110,
  showValues: true,
  showRank: true,
  showGrowth: false,
  showFlags: true,
  showGrid: true,
  showTrail: false,
  gradientBars: true,
  showParticles: false,
  dark: true,
};

let animState = [];
let frameCount = 0;
let lastFrame = 0;
let fpsAccum = 0;
let fpsCount = 0;
let fpsDisplay = 60;
let totalFrames = 0;
let particles = [];
let valueTrails = {};
let rafId = null;

function getDS() {
  return DATASETS[state.dataset];
}

function getPalette() {
  return PALETTES[state.palette];
}

function getColor(idx) {
  const pal = getPalette();
  return pal[idx % pal.length];
}

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16),
    g = parseInt(hex.slice(3, 5), 16),
    b = parseInt(hex.slice(5, 7), 16);
  return { r, g, b };
}

function initAnimState(values) {
  const sorted = [...values].sort((a, b) => b.value - a.value);
  animState = values.map((v) => {
    const rank = sorted.findIndex((s) => s.id === v.id);
    return {
      id: v.id,
      label: v.label,
      icon: v.icon,
      value: v.value,
      dispValue: v.value,
      dispY: rank,
      targetY: rank,
      targetW: v.value,
      color: getColor(v.id),
    };
  });
}

function updateAnimState(values, dt) {
  const ds = getDS();
  const sorted = [...values]
    .sort((a, b) => b.value - a.value)
    .slice(0, state.topN);
  const speed = clamp(dt / (state.smoothingFrames * 16.67), 0, 1);
  const easing = state.easing;

  values.forEach((v) => {
    let as = animState.find((a) => a.id === v.id);
    if (!as) {
      as = {
        id: v.id,
        label: v.label,
        icon: v.icon,
        value: v.value,
        dispValue: v.value,
        dispY: state.topN + 2,
        targetY: state.topN + 2,
        targetW: 0,
        color: getColor(v.id),
      };
      animState.push(as);
    }
    as.label = v.label;
    as.icon = v.icon;
    as.targetW = v.value;
    as.value = v.value;
    const rank = sorted.findIndex((s) => s.id === v.id);
    as.targetY = rank === -1 ? state.topN + 2 : rank;
  });

  const smoothT = clamp(speed * 2.5, 0, 1);
  animState.forEach((as, i) => {
    const staggerOff =
      (i * state.staggerFrames * 16.67) / (state.smoothingFrames * 16.67);
    const adjT = clamp(smoothT - staggerOff * 0.2, 0, 1);
    as.dispValue = easedLerp(as.dispValue, as.targetW, adjT, easing);
    as.dispY = easedLerp(as.dispY, as.targetY, adjT, easing);

    if (
      state.showParticles &&
      Math.abs(as.targetW - as.dispValue) / (as.targetW + 0.001) > 0.02
    ) {
      if (Math.random() < 0.15) emitParticle(as);
    }

    if (state.showTrail) {
      if (!valueTrails[as.id]) valueTrails[as.id] = [];
      valueTrails[as.id].push(as.dispValue);
      if (valueTrails[as.id].length > 200) valueTrails[as.id].shift();
    }
  });
  animState.sort((a, b) => a.dispY - b.dispY);
}

function emitParticle(bar) {
  particles.push({
    x: 0,
    y: 0,
    vx: (Math.random() - 0.5) * 4,
    vy: -(Math.random() * 4 + 2),
    life: 1,
    decay: 0.03 + Math.random() * 0.02,
    size: Math.random() * 4 + 2,
    color: bar.color,
    barId: bar.id,
  });
}

function drawRoundedRect(ctx, x, y, w, h, r) {
  if (w < 2 * r) r = w / 2;
  if (h < 2 * r) r = h / 2;
  if (r < 0) r = 0;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function render(timestamp) {
  if (!ctx || !canvas) return;
  const dt = timestamp - lastFrame;
  lastFrame = timestamp;

  fpsAccum += dt;
  fpsCount++;
  if (fpsAccum >= 500) {
    fpsDisplay = Math.round(1000 / (fpsAccum / fpsCount));
    fpsAccum = 0;
    fpsCount = 0;
    const fpsEl = document.getElementById("fpsBadge");
    if (fpsEl) fpsEl.textContent = fpsDisplay + " FPS";
  }

  if (state.playing) {
    const dsLen = getDS().growthRates[0].length;
    const step = (state.speed * dt) / (state.smoothingFrames * 16.67 * dsLen);
    state.t += step;
    if (state.t >= 1) {
      state.t = state.looping ? 0 : 1;
      if (!state.looping) {
        state.playing = false;
        updatePlayBtn();
      }
      frameCount = 0;
    }
    totalFrames = Math.round(state.t * (dsLen - 1) * state.smoothingFrames);
    frameCount = totalFrames;
    const sliderEl = document.getElementById("timelineSlider");
    if (sliderEl) sliderEl.value = state.t * 100;
  }

  const currentValues = interpolateDataset(getDS(), state.t);
  updateAnimState(currentValues, dt);
  drawFrame(timestamp);
  updateHUD(currentValues);
  rafId = requestAnimationFrame(render);
}

function drawFrame(timestamp) {
  const W = canvas.width / dpr;
  const H = canvas.height / dpr;
  ctx.save();
  ctx.scale(dpr, dpr);

  const bg = state.dark ? "#07080A" : "#F5F6FA";
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const PAD_LEFT = state.labelW + 16;
  const PAD_RIGHT = 100;
  const PAD_TOP = 16;
  const PAD_BOT = 10;
  const chartW = W - PAD_LEFT - PAD_RIGHT;
  const barH = state.barH;
  const barGap = state.barGap;

  const visible = animState.filter((as) => as.dispY < state.topN + 1.5);
  const maxVal = Math.max(...animState.map((a) => a.targetW), 1);

  if (state.showGrid) {
    ctx.strokeStyle = state.dark
      ? "rgba(255,255,255,0.04)"
      : "rgba(0,0,0,0.05)";
    ctx.lineWidth = 1;
    const gridCount = 5;
    for (let g = 0; g <= gridCount; g++) {
      const x = PAD_LEFT + (chartW / gridCount) * g;
      ctx.beginPath();
      ctx.moveTo(x, PAD_TOP);
      ctx.lineTo(x, H - PAD_BOT);
      ctx.stroke();

      const gridVal = (maxVal / gridCount) * g;
      ctx.fillStyle = state.dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.3)";
      ctx.font = `9px 'Share Tech Mono'`;
      ctx.textAlign = "center";
      ctx.fillText(formatValue(gridVal, state.dataset), x, PAD_TOP - 5);
    }
  }

  visible.forEach((as) => {
    const barW = (as.dispValue / maxVal) * chartW;
    const barY = PAD_TOP + as.dispY * (barH + barGap);
    const color = as.color;
    const { r, g, b } = hexToRgb(color);
    const alpha = clamp(1 - Math.max(0, as.dispY - (state.topN - 1)), 0, 1);
    if (alpha < 0.01) return;

    ctx.globalAlpha = alpha;

    if (state.gradientBars) {
      const grad = ctx.createLinearGradient(PAD_LEFT, 0, PAD_LEFT + barW, 0);
      grad.addColorStop(0, `rgba(${r},${g},${b},0.95)`);
      grad.addColorStop(0.5, `rgba(${r},${g},${b},0.8)`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0.3)`);
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = `rgba(${r},${g},${b},0.85)`;
    }

    if (as.dispY < 3) {
      ctx.shadowColor = `rgba(${r},${g},${b},0.4)`;
      ctx.shadowBlur = 15;
    }

    drawRoundedRect(
      ctx,
      PAD_LEFT,
      barY,
      Math.max(barW, 2),
      barH,
      state.cornerR,
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    if (barW > 4) {
      ctx.fillStyle = `rgba(${r},${g},${b},0.15)`;
      drawRoundedRect(
        ctx,
        PAD_LEFT,
        barY,
        Math.max(barW, 2),
        barH,
        state.cornerR,
      );
      ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    if (barW > 20) {
      const sheenGrad = ctx.createLinearGradient(0, barY, 0, barY + barH);
      sheenGrad.addColorStop(0, "rgba(255,255,255,0.15)");
      sheenGrad.addColorStop(0.5, "rgba(255,255,255,0.05)");
      sheenGrad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = sheenGrad;
      drawRoundedRect(
        ctx,
        PAD_LEFT + 2,
        barY + 2,
        Math.max(barW - 4, 0),
        barH * 0.4,
        state.cornerR,
      );
      ctx.fill();
    }

    ctx.textBaseline = "middle";
    const midY = barY + barH / 2;

    if (state.showRank) {
      const rank = Math.round(as.dispY) + 1;
      const rankTx = state.dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)";
      ctx.font = `700 11px 'Share Tech Mono'`;
      ctx.fillStyle = rankTx;
      ctx.textAlign = "right";
      ctx.fillText(`#${rank}`, PAD_LEFT - (state.showFlags ? 30 : 6), midY);
    }

    if (state.showFlags && as.icon) {
      ctx.font = `${barH * 0.6}px serif`;
      ctx.textAlign = "right";
      ctx.fillText(as.icon, PAD_LEFT - 6, midY + 1);
    }

    const labelTx = state.dark ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.95)";
    ctx.font = `700 13px 'Rajdhani'`;
    ctx.fillStyle = labelTx;
    ctx.textAlign = "right";
    const labelX =
      PAD_LEFT - (state.showFlags ? 32 : 6) - (state.showRank ? 28 : 0);
    const labelText =
      as.label.length > 12 ? as.label.slice(0, 11) + "…" : as.label;
    ctx.fillText(labelText, labelX, midY);

    if (state.showValues) {
      const valStr = formatValue(as.dispValue, state.dataset);
      const inside = barW > 85;
      ctx.font = `700 12px 'Share Tech Mono'`;
      if (inside) {
        ctx.fillStyle = state.dark
          ? "rgba(255,255,255,0.95)"
          : "rgba(0,0,0,0.9)";
        ctx.textAlign = "right";
        ctx.fillText(valStr, PAD_LEFT + barW - 10, midY);
      } else {
        ctx.fillStyle = `rgba(${r},${g},${b},1)`;
        ctx.textAlign = "left";
        ctx.fillText(valStr, PAD_LEFT + barW + 8, midY);
      }
    }

    if (state.showGrowth) {
      const ds = getDS();
      const dsLen = ds.growthRates[0].length;
      const prevT = Math.max(0, state.t - 1 / (dsLen - 1));
      const prevVals = interpolateDataset(ds, prevT);
      const prev = prevVals.find((v) => v.id === as.id);
      if (prev && prev.value > 0) {
        const pct = ((as.value - prev.value) / prev.value) * 100;
        const growthStr =
          (pct > 0 ? "▲" : "▼") + Math.abs(pct).toFixed(1) + "%";
        ctx.font = `700 10px 'Share Tech Mono'`;
        ctx.fillStyle = pct >= 0 ? "#00FF88" : "#FF6B35";
        ctx.textAlign = "left";
        ctx.fillText(
          growthStr,
          PAD_LEFT + Math.max(barW, 2) + 8,
          barY + barH * 0.8,
        );
      }
    }

    ctx.globalAlpha = 1;
  });

  const ds = getDS();
  if (ds.milestones) {
    const yearFloat = state.t * (ds.endYear - ds.startYear) + ds.startYear;
    const activeMilestone = ds.milestones.find(
      (m) => Math.abs(m.year - yearFloat) < 0.5,
    );
    if (activeMilestone) {
      ctx.font = `italic 600 14px 'Rajdhani'`;
      ctx.fillStyle = state.dark
        ? "rgba(0, 255, 136, 0.6)"
        : "rgba(0, 112, 64, 0.6)";
      ctx.textAlign = "right";
      ctx.fillText(activeMilestone.label, W - 30, H - 30);
    }
  }

  if (state.showParticles) {
    particles.forEach((p, i) => {
      const as = animState.find((a) => a.id === p.barId);
      if (as) {
        const barW = (as.dispValue / maxVal) * chartW;
        const barY = PAD_TOP + as.dispY * (barH + barGap);
        p.x = PAD_LEFT + barW;
        p.y = barY + barH / 2 + p.vy * (1 - p.life) * 20;
      }
      const { r, g, b } = hexToRgb(p.color);
      ctx.globalAlpha = p.life * 0.8;
      ctx.fillStyle = `rgba(${r},${g},${b},1)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
      ctx.fill();
      p.life -= p.decay;
      ctx.globalAlpha = 1;
    });
    particles = particles.filter((p) => p.life > 0);
  }

  ctx.restore();
}

function updateHUD(currentValues) {
  const ds = getDS();
  const dsLen = ds.growthRates[0].length;
  const yearFloat = state.t * (ds.endYear - ds.startYear) + ds.startYear;
  const year = Math.round(yearFloat);

  const yearEl = document.getElementById("yearDisplay");
  if (yearEl) yearEl.textContent = year;

  const periodEl = document.getElementById("chartPeriod");
  if (periodEl) periodEl.textContent = `Year ${year}`;

  const frameEl = document.getElementById("frameCounter");
  if (frameEl) {
    const maxF = Math.round((dsLen - 1) * state.smoothingFrames);
    frameEl.textContent = `Frame ${Math.min(frameCount, maxF)} / ${maxF}`;
  }

  const sorted = [...currentValues].sort((a, b) => b.value - a.value);
  const leader = sorted[0];
  if (leader) {
    const leadName = document.getElementById("leadName");
    const leadVal = document.getElementById("leadVal");
    if (leadName) leadName.textContent = leader.label;
    if (leadVal) leadVal.textContent = formatValue(leader.value, state.dataset);
  }

  const lb = document.getElementById("leaderboard");
  if (lb) {
    lb.innerHTML = "";
    sorted.slice(0, state.topN).forEach((item, i) => {
      const div = document.createElement("div");
      div.className = "lb-item";
      const rankCls =
        i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "";
      const prev = state._prevLeaderboard?.[i];
      const moved =
        prev && prev.id !== item.id
          ? sorted.findIndex((s) => s.id === prev?.id) > i
            ? "▲"
            : "▼"
          : "";
      div.innerHTML = `<span class="lb-rank ${rankCls}">${i + 1}</span>
        <span class="lb-item-icon">${ds.icons[item.id]}</span>
        <span class="lb-item-name">${item.label}</span>
        <span class="lb-item-val">${formatValue(item.value, state.dataset)}</span>`;
      lb.appendChild(div);
    });
    state._prevLeaderboard = sorted
      .slice(0, state.topN)
      .map((s) => ({ id: s.id }));
  }

  const sg = document.getElementById("statsGrid");
  if (sg) {
    const total = currentValues.reduce((a, v) => a + v.value, 0);
    const maxV = sorted[0]?.value || 0;
    const minV = sorted[sorted.length - 1]?.value || 0;
    const avg = total / currentValues.length;
    sg.innerHTML = `
      <div class="stat-cell"><div class="sc-stat-label">LEADER</div><div class="sc-stat-val" style="font-size:10px;color:var(--hud-green)">${sorted[0]?.label?.slice(0, 8) || "—"}</div></div>
      <div class="stat-cell"><div class="sc-stat-label">YEAR</div><div class="sc-stat-val">${year}</div></div>
      <div class="stat-cell"><div class="sc-stat-label">MAX</div><div class="sc-stat-val">${formatValue(maxV, state.dataset)}</div></div>
      <div class="stat-cell"><div class="sc-stat-label">AVG</div><div class="sc-stat-val">${formatValue(avg, state.dataset)}</div></div>
      <div class="stat-cell"><div class="sc-stat-label">ITEMS</div><div class="sc-stat-val">${currentValues.length}</div></div>
      <div class="stat-cell"><div class="sc-stat-label">SPEED</div><div class="sc-stat-val">${state.speed}×</div></div>
    `;
  }
}

function updatePlayBtn() {
  const btn = document.getElementById("btnPlay");
  if (!btn) return;
  btn.textContent = state.playing ? "⏸" : "▶";
  btn.classList.toggle("paused", !state.playing);
}

function resizeCanvas() {
  const area = document.getElementById("chartArea");
  const container = area?.querySelector(".chart-container");
  if (!container || !canvas) return;
  dpr = window.devicePixelRatio || 1;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  canvas.style.width = rect.width + "px";
  canvas.style.height = rect.height + "px";
}

function loadDataset(key) {
  state.dataset = key;
  const ds = getDS();
  document.getElementById("chartTitle").textContent = ds.title;
  document.getElementById("chartUnit").textContent = ds.unit;
  state.t = 0;
  frameCount = 0;
  particles = [];
  valueTrails = {};
  const initialValues = interpolateDataset(ds, 0);
  initAnimState(initialValues);

  const markers = document.getElementById("timelineMarkers");
  if (markers) {
    markers.innerHTML = "";
    const steps = Math.min(8, ds.growthRates[0].length);
    for (let i = 0; i <= steps; i++) {
      const year = Math.round(
        ds.startYear + (i / steps) * (ds.endYear - ds.startYear),
      );
      const mark = document.createElement("span");
      mark.className = "tm-mark";
      mark.textContent = year;
      markers.appendChild(mark);
    }
  }
}

function exportPNG() {
  const link = document.createElement("a");
  link.download = `datarace_${state.dataset}_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

document.addEventListener("DOMContentLoaded", () => {
  canvas = document.getElementById("raceCanvas");
  ctx = canvas.getContext("2d");

  resizeCanvas();
  window.addEventListener("resize", () => {
    resizeCanvas();
  });

  loadDataset("tech");

  document.getElementById("datasetSelector")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".ds-btn");
    if (!btn) return;
    document
      .querySelectorAll(".ds-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    loadDataset(btn.dataset.dataset);
  });

  document.getElementById("btnPlay")?.addEventListener("click", () => {
    state.playing = !state.playing;
    if (state.playing && state.t >= 1) state.t = 0;
    updatePlayBtn();
  });

  document.getElementById("btnSkipStart")?.addEventListener("click", () => {
    state.t = 0;
    frameCount = 0;
    particles = [];
    const v = interpolateDataset(getDS(), 0);
    initAnimState(v);
  });
  document.getElementById("btnSkipEnd")?.addEventListener("click", () => {
    state.t = 1;
    state.playing = false;
    updatePlayBtn();
  });
  document.getElementById("btnStepBack")?.addEventListener("click", () => {
    const dsLen = getDS().growthRates[0].length;
    state.t = clamp(state.t - 1 / (dsLen - 1), 0, 1);
    const sliderEl = document.getElementById("timelineSlider");
    if (sliderEl) sliderEl.value = state.t * 100;
  });
  document.getElementById("btnStepFwd")?.addEventListener("click", () => {
    const dsLen = getDS().growthRates[0].length;
    state.t = clamp(state.t + 1 / (dsLen - 1), 0, 1);
    const sliderEl = document.getElementById("timelineSlider");
    if (sliderEl) sliderEl.value = state.t * 100;
  });

  document.getElementById("btnLoop")?.addEventListener("click", (e) => {
    state.looping = !state.looping;
    e.currentTarget.dataset.active = state.looping ? "true" : "false";
    e.currentTarget.style.color = state.looping
      ? "var(--hud-blue)"
      : "var(--text-2)";
  });

  document.getElementById("timelineSlider")?.addEventListener("input", (e) => {
    state.t = parseFloat(e.target.value) / 100;
    const v = interpolateDataset(getDS(), state.t);
    updateAnimState(v, 16.67);
  });

  document.getElementById("speedSlider")?.addEventListener("input", (e) => {
    state.speed = parseFloat(e.target.value);
    const el = document.getElementById("speedVal");
    if (el) el.textContent = state.speed + "×";
  });

  document.querySelectorAll(".tn-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".tn-btn")
        .forEach((b) => b.classList.toggle("active", b === btn));
      state.topN = parseInt(btn.dataset.n);
    });
  });

  document.getElementById("easingSelect")?.addEventListener("change", (e) => {
    state.easing = e.target.value;
  });

  document.getElementById("smoothingRange")?.addEventListener("input", (e) => {
    state.smoothingFrames = parseInt(e.target.value);
    document.getElementById("smoothingVal").textContent = e.target.value + "f";
  });
  document.getElementById("staggerRange")?.addEventListener("input", (e) => {
    state.staggerFrames = parseInt(e.target.value);
    document.getElementById("staggerVal").textContent = e.target.value + "f";
  });
  document.getElementById("barHeightRange")?.addEventListener("input", (e) => {
    state.barH = parseInt(e.target.value);
    document.getElementById("barHeightVal").textContent = e.target.value + "px";
  });
  document.getElementById("barGapRange")?.addEventListener("input", (e) => {
    state.barGap = parseInt(e.target.value);
    document.getElementById("barGapVal").textContent = e.target.value + "px";
  });
  document.getElementById("radiusRange")?.addEventListener("input", (e) => {
    state.cornerR = parseInt(e.target.value);
    document.getElementById("radiusVal").textContent = e.target.value + "px";
  });
  document.getElementById("labelWidthRange")?.addEventListener("input", (e) => {
    state.labelW = parseInt(e.target.value);
    document.getElementById("labelWidthVal").textContent =
      e.target.value + "px";
  });

  const checkboxMap = {
    showValues: "showValues",
    showRank: "showRank",
    showGrowth: "showGrowth",
    showFlags: "showFlags",
    showGrid: "showGrid",
    showTrail: "showTrail",
    gradientBars: "gradientBars",
    showParticles: "showParticles",
  };
  Object.entries(checkboxMap).forEach(([id, key]) => {
    document.getElementById(id)?.addEventListener("change", (e) => {
      state[key] = e.target.checked;
    });
  });

  document.getElementById("paletteRow")?.addEventListener("click", (e) => {
    const btn = e.target.closest(".pal-btn");
    if (!btn) return;
    document
      .querySelectorAll(".pal-btn")
      .forEach((b) => b.classList.toggle("active", b === btn));
    state.palette = btn.dataset.palette;
    animState.forEach((as, i) => {
      as.color = getColor(as.id);
    });
  });

  document.getElementById("btnTheme")?.addEventListener("click", () => {
    state.dark = !state.dark;
    document.body.style.background = state.dark ? "#07080A" : "#F5F6FA";
    document.getElementById("app").style.background = state.dark
      ? ""
      : "#F5F6FA";
  });

  document
    .getElementById("btnScreenshot")
    ?.addEventListener("click", exportPNG);

  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return;
    if (e.code === "Space") {
      e.preventDefault();
      document.getElementById("btnPlay")?.click();
    }
    if (e.code === "ArrowLeft") document.getElementById("btnStepBack")?.click();
    if (e.code === "ArrowRight") document.getElementById("btnStepFwd")?.click();
    if (e.code === "Home") document.getElementById("btnSkipStart")?.click();
    if (e.code === "End") document.getElementById("btnSkipEnd")?.click();
  });

  lastFrame = performance.now();
  state.playing = true;
  updatePlayBtn();
  rafId = requestAnimationFrame(render);
});
