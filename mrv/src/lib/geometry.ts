export interface Point {
  lat: number;
  lng: number;
}

/**
 * Parses the polygon_coordinates string which is a JSON array of [lat, lng] pairs.
 * Format: "[[lat, lng], [lat, lng], ...]"
 */
export function parsePolygonString(jsonString: string): Point[] {
  try {
    if (!jsonString || typeof jsonString !== 'string') return [];
    const rawCoords = JSON.parse(jsonString);
    if (!Array.isArray(rawCoords)) return [];
    
    return rawCoords.map((coord: any) => ({
      lat: parseFloat(coord[0]),
      lng: parseFloat(coord[1])
    })).filter(p => !isNaN(p.lat) && !isNaN(p.lng));
  } catch (e) {
    console.error("Error parsing polygon string:", e);
    return [];
  }
}

/**
 * Parses the centroid_coordinates array.
 * Format: [lat, lng]
 */
export function parseCentroidArray(arr: any): Point | null {
  if (!Array.isArray(arr) || arr.length < 2) return null;
  const lat = parseFloat(arr[0]);
  const lng = parseFloat(arr[1]);
  return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
}

/**
 * Legacy support for coordinate keys if needed, otherwise remains for utility.
 */
export function parseCoordinateKey(key: string): Point | null {
  try {
    if (!key || typeof key !== 'string') return null;
    const cleaned = key.replace(/[()]/g, '');
    const parts = cleaned.split(',').map(p => p.trim());
    if (parts.length < 2) return null;

    const parsePart = (part: string) => {
      const dotIndex = part.indexOf('_');
      if (dotIndex === -1) return parseFloat(part);
      const transformed = part.substring(0, dotIndex) + '.' + part.substring(dotIndex + 1);
      return parseFloat(transformed);
    };

    const lat = parsePart(parts[0]);
    const lng = parsePart(parts[1]);

    return isNaN(lat) || isNaN(lng) ? null : { lat, lng };
  } catch (e) {
    return null;
  }
}
