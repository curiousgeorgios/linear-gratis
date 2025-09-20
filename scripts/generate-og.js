const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function generateOGImage() {
  console.log("🚀 Starting OG image generation...");

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: {
      width: 1200,
      height: 630,
      deviceScaleFactor: 2, // For high-DPI screens
    },
  });

  try {
    const page = await browser.newPage();

    // Navigate to the OG API route
    await page.goto("http://localhost:3006/api/og", {
      waitUntil: "networkidle0",
    });

    // Wait for fonts to load
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Take screenshot
    const screenshot = await page.screenshot({
      type: "png",
      fullPage: false,
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630,
      },
    });

    // Save to public directory
    const outputPath = path.join(__dirname, "../public/og-image.png");
    fs.writeFileSync(outputPath, screenshot);

    console.log("✅ OG image generated successfully at:", outputPath);
  } catch (error) {
    console.error("❌ Error generating OG image:", error);
  } finally {
    await browser.close();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  generateOGImage().catch(console.error);
}

module.exports = generateOGImage;
