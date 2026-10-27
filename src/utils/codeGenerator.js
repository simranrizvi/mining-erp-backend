/**
 * Generates readable, sequential-looking business codes, e.g.
 * genCode('EMP') -> "EMP-20260724-4821"
 */
function genCode(prefix) {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${ymd}-${rand}`;
}

module.exports = { genCode };
