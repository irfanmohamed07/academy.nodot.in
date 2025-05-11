import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../DB/db.js';

// Get directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Format date to YYYY-MM-DD
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Generate sitemap.xml
async function generateSitemap() {
  try {
    // Get all courses from database
    const courseResult = await pool.query('SELECT id, updated_at FROM courses');
    const courses = courseResult.rows;
    
    const today = formatDate(new Date());
    
    // Fixed URLs
    const fixedUrls = [
      { loc: 'https://academy.nodot.in/', lastmod: today, changefreq: 'weekly', priority: '1.0' },
      { loc: 'https://academy.nodot.in/courses', lastmod: today, changefreq: 'daily', priority: '0.9' },
      { loc: 'https://academy.nodot.in/aboutus', lastmod: today, changefreq: 'monthly', priority: '0.8' },
      { loc: 'https://academy.nodot.in/login', lastmod: today, changefreq: 'monthly', priority: '0.7' },
      { loc: 'https://academy.nodot.in/signup', lastmod: today, changefreq: 'monthly', priority: '0.7' },
    ];
    
    // Start XML
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
    
    // Add fixed URLs
    fixedUrls.forEach(url => {
      xml += '  <url>\n';
      xml += `    <loc>${url.loc}</loc>\n`;
      xml += `    <lastmod>${url.lastmod}</lastmod>\n`;
      xml += `    <changefreq>${url.changefreq}</changefreq>\n`;
      xml += `    <priority>${url.priority}</priority>\n`;
      xml += '  </url>\n';
    });
    
    // Add course URLs
    courses.forEach(course => {
      const lastmod = course.updated_at ? formatDate(course.updated_at) : today;
      
      xml += '  <url>\n';
      xml += `    <loc>https://academy.nodot.in/course/${course.id}</loc>\n`;
      xml += `    <lastmod>${lastmod}</lastmod>\n`;
      xml += '    <changefreq>weekly</changefreq>\n';
      xml += '    <priority>0.8</priority>\n';
      xml += '  </url>\n';
    });
    
    // End XML
    xml += '</urlset>';
    
    // Write to file
    fs.writeFileSync(path.join(__dirname, '../public/sitemap.xml'), xml);
    console.log('Sitemap generated successfully!');
  } catch (error) {
    console.error('Error generating sitemap:', error);
  }
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateSitemap().finally(() => process.exit());
}

export { generateSitemap }; 