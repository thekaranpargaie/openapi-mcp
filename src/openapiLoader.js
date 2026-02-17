import fs from 'fs';


export async function loadSpec(path) {
  // If path is a URL, fetch it; otherwise read from file
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const response = await fetch(path);
    return await response.json();
  } else {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  }
}
