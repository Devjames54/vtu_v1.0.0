import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// SVG with rich purple gradient and PayClick icon
const generateSvg = (size: number, isMaskable: boolean = false) => {
  const padding = isMaskable ? size * 0.15 : size * 0.08;
  const contentSize = size - padding * 2;
  const radius = isMaskable ? 0 : size * 0.22;

  return `
  <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#581c87" />
        <stop offset="40%" stop-color="#7e22ce" />
        <stop offset="100%" stop-color="#9333ea" />
      </linearGradient>
      <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#facc15" />
        <stop offset="100%" stop-color="#f97316" />
      </linearGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="${size * 0.02}" stdDeviation="${size * 0.02}" flood-color="#000000" flood-opacity="0.3" />
      </filter>
    </defs>
    
    <!-- Background tile -->
    <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bgGrad)" />
    
    <!-- Outer decorative ring -->
    <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.38}" fill="none" stroke="#ffffff" stroke-opacity="0.12" stroke-width="${size * 0.015}" />
    
    <!-- Main PayClick Symbol (Wallet/Smartphone with Lightning Top-up Bolt) -->
    <g transform="translate(${padding}, ${padding}) scale(${contentSize / 100})" filter="url(#shadow)">
      <!-- Card / Smartphone base -->
      <rect x="22" y="14" width="56" height="72" rx="14" fill="#ffffff" fill-opacity="0.95" />
      <rect x="26" y="18" width="48" height="64" rx="10" fill="#180a29" />
      
      <!-- Screen Notch / Speaker -->
      <rect x="42" y="22" width="16" height="3" rx="1.5" fill="#ffffff" fill-opacity="0.4" />
      
      <!-- Dynamic Top-Up Bolt Symbol -->
      <path d="M52 28 L36 52 L48 52 L44 72 L64 46 L52 46 Z" fill="url(#accentGrad)" />
      
      <!-- Small Naira symbol crest -->
      <circle cx="50" cy="50" r="15" fill="none" stroke="url(#accentGrad)" stroke-width="2" stroke-dasharray="3 3" opacity="0.6" />
    </g>

    <!-- Subtitle text at bottom if not maskable -->
    ${!isMaskable ? `
    <text x="${size / 2}" y="${size * 0.88}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="900" font-size="${size * 0.09}" fill="#ffffff" letter-spacing="1">PAYCLICK</text>
    ` : ''}
  </svg>
  `;
};

async function buildIcons() {
  console.log("Generating Android PWA icons...");
  
  // 1. 192x192
  const svg192 = Buffer.from(generateSvg(192, false));
  await sharp(svg192).png().toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log("Created pwa-192x192.png");

  // 2. 512x512
  const svg512 = Buffer.from(generateSvg(512, false));
  await sharp(svg512).png().toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log("Created pwa-512x512.png");

  // 3. Maskable 512x512 (with safe margins for Android adaptive icon squircles/circles)
  const svgMaskable = Buffer.from(generateSvg(512, true));
  await sharp(svgMaskable).png().toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log("Created pwa-maskable-512x512.png");

  // 4. Apple Touch Icon 180x180
  const svg180 = Buffer.from(generateSvg(180, false));
  await sharp(svg180).png().toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log("Created apple-touch-icon.png");

  // 5. Favicon SVG
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), generateSvg(64, false));
  console.log("Created favicon.svg");

  console.log("All Android PWA icons generated successfully!");
}

buildIcons().catch(console.error);
