const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const dir = path.join(__dirname, '..', 'public', 'voiceover', 'feature', 'epic');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.mp3'));

console.log('Voiceover MP3 durations:');
const results = files.map(file => {
  const filepath = path.join(dir, file);
  const durStr = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filepath}"`).toString().trim();
  const seconds = parseFloat(durStr);
  const frames = Math.ceil(seconds * 30);
  return {
    file,
    seconds,
    frames
  };
});

console.table(results);
