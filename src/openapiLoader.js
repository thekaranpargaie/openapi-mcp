import fs from 'fs';


export async function loadSpec(path) {
  // If path is a URL, fetch it; otherwise read from file
  if (path.startsWith('http://') || path.startsWith('https://')) {
    const maxRetries = 10;
    const retryDelay = 3000;

    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(path);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        console.log(`Failed to load spec from ${path} (Attempt ${i + 1}/${maxRetries}): ${error.message}`);
        if (i === maxRetries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  } else {
    return JSON.parse(fs.readFileSync(path, 'utf-8'));
  }
}
