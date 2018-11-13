function parseLine(line) {
  const reg = /^\d+\.\d+\.\d+\.\d+\s(\w+|\-)\s(\w+|\-)\s\[.+\]\s(?<n>\d+)/;
  const match = line.match(reg);
  if (!match) return null;
  return parseInt(match.groups.n).toString(16).toUpperCase().padStart(8, '0');
}

module.exports = parseLine;