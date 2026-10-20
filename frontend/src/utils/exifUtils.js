/**
 * CivicTrack EXIF & Spatial Coordinate Extraction Utilities
 */

/**
 * Converts Degrees-Minutes-Seconds (DMS) GPS values to Decimal Degrees (DD).
 * Handles raw DMS numerical arrays, directional reference flags (N/S/E/W),
 * and handles direct numbers.
 *
 * @param {number|Array<number>} dms - DMS array [deg, min, sec] or number
 * @param {string} ref - Hemisphere reference ('N', 'S', 'E', 'W')
 * @returns {number|null} Decimal degrees formatted to 6 decimal places, or null
 */
export function convertDMSToDD(dms, ref) {
  if (typeof dms === 'number') {
    return ref === 'S' || ref === 'W' ? -Math.abs(dms) : Math.abs(dms);
  }
  if (Array.isArray(dms) && dms.length >= 3) {
    const deg = Number(dms[0]) || 0;
    const min = Number(dms[1]) || 0;
    const sec = Number(dms[2]) || 0;
    let dd = deg + min / 60 + sec / 3600;
    if (ref === 'S' || ref === 'W') {
      dd = -dd;
    }
    return Number(dd.toFixed(6));
  }
  return null;
}

/**
 * Parses Adobe XMP coordinate strings into Decimal Degrees.
 * Supports patterns like "12,58.296N", "12, 58, 17.76 N", or decimal numbers.
 *
 * @param {string|number} val - Raw XMP coordinate
 * @returns {number|null} Decimal degrees, or null
 */
export function parseXmpCoord(val) {
  if (typeof val === 'number') return val;
  if (!val || typeof val !== 'string') return null;
  const match = val.match(/([0-9.]+)[, ]+([0-9.]+)(?:[, ]+([0-9.]+))?\s*([NSEW])?/i);
  if (match) {
    const deg = parseFloat(match[1]) || 0;
    const min = parseFloat(match[2]) || 0;
    const sec = parseFloat(match[3]) || 0;
    const ref = match[4] ? match[4].toUpperCase() : null;
    let dd = deg + min / 60 + sec / 3600;
    if (ref === 'S' || ref === 'W') dd = -dd;
    return Number(dd.toFixed(6));
  }
  const simpleNum = parseFloat(val);
  return isNaN(simpleNum) ? null : simpleNum;
}

/**
 * Validates whether coordinates fall within valid geographic bounds.
 *
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lng - Longitude (-180 to 180)
 * @returns {boolean}
 */
export function isValidCoordinate(lat, lng) {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}
