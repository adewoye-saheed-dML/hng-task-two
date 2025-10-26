
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

async function generateSummaryImage(totalCountries, topCountries, lastRefreshed) {
    const width = 800;
    const height = 600;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
  
    // 1. Background
    ctx.fillStyle = '#f0f4f8'; // Light gray background
    ctx.fillRect(0, 0, width, height);
  
    // 2. Title
    ctx.fillStyle = '#333';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Country Data Summary', width / 2, 60);
  
    // 3. Stats
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(`Total Countries: ${totalCountries}`, width / 2, 110);
    ctx.fillText(`Last Refresh: ${lastRefreshed.toLocaleString()}`, width / 2, 140);
  
    // 4. Top 5 Countries Header
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Top 5 Countries by Estimated GDP', width / 2, 210);
  
    // 5. List Top 5
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'left';
    const startX = 150;
    let startY = 260;
  
    topCountries.forEach((country, index) => {
      const gdp = country.estimated_gdp 
        ? `~ $${(country.estimated_gdp / 1_000_000_000).toFixed(2)}B` 
        : 'N/A';
        
      const text = `${index + 1}. ${country.name} (${gdp})`;
      ctx.fillText(text, startX, startY);
      startY += 40; // Move down for the next line
    });
  
    // 6. Save the image to disk
    try {
      const imagePath = path.join(__dirname, 'cache', 'summary.png');
      const buffer = canvas.toBuffer('image/png');
      fs.writeFileSync(imagePath, buffer);
      console.log('Summary image generated successfully at cache/summary.png');
    } catch (err) {
      console.error('Failed to save summary image:', err);
    }
  }

  module.exports = {
    generateSummaryImage 
  };