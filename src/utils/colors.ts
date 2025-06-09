// Color conversion utilities for Hue lights

export interface RGB {
  r: number; // 0-255
  g: number; // 0-255
  b: number; // 0-255
}

export interface HSV {
  h: number; // 0-360
  s: number; // 0-100
  v: number; // 0-100
}

export interface XY {
  x: number;
  y: number;
}

// Convert RGB to XY color space (Philips Hue format)
export function rgbToXy(rgb: RGB): XY {
  // Normalize RGB values
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // Apply gamma correction
  const red = r > 0.04045 ? Math.pow((r + 0.055) / 1.055, 2.4) : r / 12.92;
  const green = g > 0.04045 ? Math.pow((g + 0.055) / 1.055, 2.4) : g / 12.92;
  const blue = b > 0.04045 ? Math.pow((b + 0.055) / 1.055, 2.4) : b / 12.92;

  // Convert to XYZ using Wide RGB D65 conversion formula
  const X = red * 0.664511 + green * 0.154324 + blue * 0.162028;
  const Y = red * 0.283881 + green * 0.668433 + blue * 0.047685;
  const Z = red * 0.000088 + green * 0.072310 + blue * 0.986039;

  // Calculate xy from XYZ
  const sum = X + Y + Z;
  if (sum === 0) {
    return { x: 0, y: 0 };
  }

  return {
    x: X / sum,
    y: Y / sum,
  };
}

// Convert HSV to RGB
export function hsvToRgb(hsv: HSV): RGB {
  const h = hsv.h / 360;
  const s = hsv.s / 100;
  const v = hsv.v / 100;

  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);

  let r: number, g: number, b: number;

  switch (i % 6) {
    case 0: r = v; g = t; b = p; break;
    case 1: r = q; g = v; b = p; break;
    case 2: r = p; g = v; b = t; break;
    case 3: r = p; g = q; b = v; break;
    case 4: r = t; g = p; b = v; break;
    case 5: r = v; g = p; b = q; break;
    default: r = 0; g = 0; b = 0;
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Convert natural language color to HSV
export function parseColorDescription(description: string): HSV | null {
  const colors: Record<string, HSV> = {
    // Basic colors
    'red': { h: 0, s: 100, v: 100 },
    'orange': { h: 30, s: 100, v: 100 },
    'yellow': { h: 60, s: 100, v: 100 },
    'green': { h: 120, s: 100, v: 100 },
    'cyan': { h: 180, s: 100, v: 100 },
    'blue': { h: 240, s: 100, v: 100 },
    'purple': { h: 270, s: 100, v: 100 },
    'magenta': { h: 300, s: 100, v: 100 },
    'pink': { h: 330, s: 50, v: 100 },
    'white': { h: 0, s: 0, v: 100 },
    
    // Atmospheric colors
    'sunrise': { h: 30, s: 60, v: 90 },
    'sunset': { h: 15, s: 80, v: 85 },
    'dusk': { h: 250, s: 30, v: 40 },
    'dawn': { h: 200, s: 20, v: 70 },
    'stormy': { h: 240, s: 20, v: 30 },
    'stormy dusk': { h: 250, s: 35, v: 25 },
    
    // Warm/cool
    'warm': { h: 30, s: 40, v: 90 },
    'cool': { h: 200, s: 30, v: 90 },
    'cold': { h: 200, s: 50, v: 80 },
    
    // Nature-inspired
    'forest': { h: 120, s: 60, v: 40 },
    'ocean': { h: 200, s: 70, v: 60 },
    'sky': { h: 200, s: 40, v: 90 },
    'fire': { h: 10, s: 90, v: 90 },
    'ice': { h: 200, s: 20, v: 95 },
  };

  const normalized = description.toLowerCase().trim();
  
  // Direct match
  if (colors[normalized]) {
    return colors[normalized];
  }

  // Partial match
  for (const [key, value] of Object.entries(colors)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

// Convert color temperature name to mireds
export function parseColorTemp(description: string): number | null {
  const temps: Record<string, number> = {
    'candlelight': 500,      // 2000K
    'candle': 500,
    'warm white': 370,       // 2700K
    'warm': 370,
    'soft white': 323,       // 3100K
    'neutral': 250,          // 4000K
    'neutral white': 250,
    'cool white': 182,       // 5500K
    'cool': 182,
    'daylight': 153,         // 6500K
    'cold': 153,
  };

  const normalized = description.toLowerCase().trim();
  
  if (temps[normalized]) {
    return temps[normalized];
  }

  // Check for partial matches
  for (const [key, value] of Object.entries(temps)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}