/**
 * THE FOOTER MANAGER
 * This script fetches the 'footer.html' file and injects it into the bottom of the page.
 * Keeps the copyright and links consistent across all pages.
 */

async function loadFooter() {
  // Step 1: Find the empty container where the footer should go.
  const footerElement = document.getElementById('footer');

  // Safety Check: If the container is missing, exit to avoid errors.
  if (!footerElement) return;

  try {
    // Step 2: Request the 'footer.html' file from the server.
    const response = await fetch('footer.html');

    // Step 3: Verify the file was found.
    if (!response.ok) {
      throw new Error('Footer file could not be loaded');
    }

    // Step 4: Read the text content of the file.
    const htmlContent = await response.text();

    // Step 5: Inject the HTML into the page container.
    footerElement.innerHTML = htmlContent;

  } catch (error) {
    // Log any errors (like 404 Not Found) to the console.
    console.error('Footer Error:', error);
  }
}

// --- INITIALIZATION ---
// Wait for the HTML structure to be ready before running.
document.addEventListener('DOMContentLoaded', loadFooter);