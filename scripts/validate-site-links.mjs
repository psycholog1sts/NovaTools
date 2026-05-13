#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sitemapPath = path.join(rootDir, 'sitemap.xml');
const siteLinksPath = path.join(rootDir, 'site-links.txt');

function decodeXml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function readSitemapUrls() {
  if (!fs.existsSync(sitemapPath)) {
    throw new Error(`Missing sitemap file: ${path.relative(rootDir, sitemapPath)}`);
  }

  const sitemap = fs.readFileSync(sitemapPath, 'utf8');
  return [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => decodeXml(match[1].trim()));
}

function readSiteLinks() {
  if (!fs.existsSync(siteLinksPath)) {
    throw new Error(`Missing site link export: ${path.relative(rootDir, siteLinksPath)}`);
  }

  return fs.readFileSync(siteLinksPath, 'utf8').split(/\r?\n/).filter(Boolean);
}

const sitemapUrls = readSitemapUrls();
const siteLinks = readSiteLinks();
const sitemapSet = new Set(sitemapUrls);
const siteLinkSet = new Set(siteLinks);
const missingFromSitemap = siteLinks.filter((url) => !sitemapSet.has(url));
const missingFromSiteLinks = sitemapUrls.filter((url) => !siteLinkSet.has(url));
const firstOrderMismatchIndex = sitemapUrls.findIndex((url, index) => siteLinks[index] !== url);

if (missingFromSitemap.length > 0 || missingFromSiteLinks.length > 0 || firstOrderMismatchIndex !== -1 || sitemapUrls.length !== siteLinks.length) {
  console.error('site-links.txt is not synchronized with sitemap.xml.');
  console.error(`sitemap.xml URLs: ${sitemapUrls.length}`);
  console.error(`site-links.txt URLs: ${siteLinks.length}`);

  if (missingFromSitemap.length > 0) {
    console.error(`URLs in site-links.txt but missing from sitemap.xml: ${missingFromSitemap.length}`);
    missingFromSitemap.slice(0, 10).forEach((url) => console.error(`  - ${url}`));
  }

  if (missingFromSiteLinks.length > 0) {
    console.error(`URLs in sitemap.xml but missing from site-links.txt: ${missingFromSiteLinks.length}`);
    missingFromSiteLinks.slice(0, 10).forEach((url) => console.error(`  - ${url}`));
  }

  if (firstOrderMismatchIndex !== -1) {
    console.error(`First order mismatch at line ${firstOrderMismatchIndex + 1}:`);
    console.error(`  sitemap.xml: ${sitemapUrls[firstOrderMismatchIndex]}`);
    console.error(`  site-links.txt: ${siteLinks[firstOrderMismatchIndex]}`);
  }

  process.exit(1);
}

console.log(`✅ site-links.txt matches sitemap.xml exactly (${siteLinks.length} URLs).`);
