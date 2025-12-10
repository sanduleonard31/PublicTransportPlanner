/**
 * THE HEADER MANAGER
 * This script fetches the 'header.html' file and injects it into the page.
 * This prevents us from having to copy-paste the menu into every single HTML file.
 */

async function loadHeader() {
  // Step 1: Find the empty container in the HTML skeleton.
  const headerElement = document.getElementById('header');

  // Safety Check: If the container isn't there, stop immediately.
  // This prevents the "Cannot set innerHTML of null" error.
  if (!headerElement) return;

  try {
    // Step 2: Go to the server and ask for the 'header.html' file.
    // 'await' means: Pause here until the server replies.
    const response = await fetch('header.html');

    // Step 3: Check if the file actually exists.
    if (!response.ok) {
      throw new Error('Header file could not be loaded');
    }

    // Step 4: Open the file and read the text inside.
    const htmlContent = await response.text();

    // Step 5: Paste that text into the empty container.
    headerElement.innerHTML = htmlContent;

  } catch (error) {
    // If anything goes wrong (file missing, no internet), log it so we know.
    console.error('Header Error:', error);
  }
}

// --- INITIALIZATION ---
// Wait for the "Walls to be built" (DOMContentLoaded), then run the loader.
document.addEventListener('DOMContentLoaded', loadHeader);