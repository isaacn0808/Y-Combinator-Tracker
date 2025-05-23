import axios from 'axios'; // Still used by scrapeCompanyDetails
import * as cheerio from 'cheerio';
import { Element } from 'domhandler';
import * as puppeteer from 'puppeteer'; // Added for dynamic content fetching
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

const YC_COMPANIES_URL = 'https://www.ycombinator.com/companies?batch=Spring%202025'; // Target URL

// Helper function for a small delay
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

interface FounderCreateData {
    name: string;
    companyId: string;
    title?: string | null;
    linkedin?: string | null;
    bio?: string | null;
}

interface CompanyData {
    name: string;
    oneLiner: string;
    website: string;
    ycBatch: string;
    sectors: string[]; // Changed from sector (string) to sectors (string[]) to support multiple sectors
    description: string;
    foundedDate: Date; // Prisma schema expects DateTime
    businessModel: string;
    logo?: string; // Optional, as it's optional in Prisma schema
}


async function scrapeYCCompanies(batchUrl: string): Promise<void> {
    console.log(`Starting scrape for YC companies from: ${batchUrl}`);

    // Extract batch name from URL, e.g., "Spring 2025"
    let ycBatchName = "Unknown Batch";
    try {
        const urlParams = new URLSearchParams(new URL(batchUrl).search);
        const batchParam = urlParams.get('batch');
        if (batchParam) {
            ycBatchName = decodeURIComponent(batchParam);
        }
    } catch (e) {
        console.warn("Could not parse batch name from URL, defaulting to 'Unknown Batch'.", e);
    }
    console.log(`Scraping for batch: ${ycBatchName}`);

    let browser: puppeteer.Browser | undefined;
    // debugInfoFound removed
    try {
        interface CompanyInfoFromBatch {
            link: string;
            oneLiner: string;
            sectors: string[];
            logo?: string; // Added logo URL field
        }
        const allCompanyInfo = new Map<string, { oneLiner: string; sectors: string[]; logo?: string }>(); // Key: unique link path, Value: {oneLiner, sectors, logo}
        // companyLinks array will be populated from the keys of allCompanyInfo later

        try { // Nested try-finally for Puppeteer operations to ensure browser closure
            console.log('Launching browser via Puppeteer...');
            browser = await puppeteer.launch({ headless: true });
            const page = await browser.newPage();
            page.on('error', (err: Error) => console.error('[BrowserContext ERROR]', err));
            page.on('pageerror', (pageErr: Error) => console.error('[BrowserContext PAGEERROR]', pageErr));
            console.log(`Navigating to ${batchUrl} with Puppeteer...`);
            await page.goto(batchUrl, { waitUntil: 'networkidle2', timeout: 90000 }); // Increased timeout for initial load + potential redirects

            const companyLinkSelector = 'a[class^="_company_"]'; 
            const linkContainerSelector = 'div._section_i9oky_163._results_i9oky_343'; 

            console.log(`Waiting for main link container selector: ${linkContainerSelector}`);
            try {
                await page.waitForSelector(linkContainerSelector, { timeout: 45000 }); // Increased wait time
                console.log(`Link container ${linkContainerSelector} found.`);
            } catch (e) {
                console.error(`Link container ${linkContainerSelector} not found. Page structure might have changed or content didn't load.`);
                // fs.writeFileSync for error_page_content.html removed
                throw new Error('Link container not found, cannot proceed with link extraction.');
            }

            let previousHeight = 0;
            const maxScrolls = 50; // Adjusted max scrolls
            let scrolls = 0;
            let scrollsWithoutHeightChange = 0;
            // debugTargetLink and debugInfoFound removed

            console.log(`Starting scroll loop to load all companies...`);
            while (scrolls < maxScrolls) {
                const newCompanyDataFromPage: CompanyInfoFromBatch[] = await page.evaluate((selector: string) => {
                    const linkElements = Array.from(document.querySelectorAll(selector)) as HTMLAnchorElement[];
                    const results: CompanyInfoFromBatch[] = [];
                    for (const anchor of linkElements) {
                        const link = anchor.href ? anchor.href.replace(window.location.origin, '') : null;
                        if (link && link.startsWith('/companies/')) {
                            const oneLinerSpan = anchor.querySelector('span[class*="_coDescription_"]');
                            const oneLinerText = oneLinerSpan ? (oneLinerSpan.textContent || '').trim() : "N/A";
                            
                            // Specifically look for span tags with class containing 'pill _pill'
                            const sectorSpans = Array.from(anchor.querySelectorAll('span[class*="pill _pill"]')) as HTMLSpanElement[];
                            const sectors: string[] = [];
                            const seasonalKeywords = ["spring", "summer", "fall", "winter", "autumn"];
                            
                            for (const span of sectorSpans) {
                                const text = (span.textContent || '').trim().toLowerCase();
                                // Filter out spans containing seasonal keywords
                                if (text && !seasonalKeywords.some(keyword => text.includes(keyword))) {
                                    // Use original casing for storing, but lowercase for checking
                                    sectors.push((span.textContent || '').trim()); 
                                }
                            }
                            
                            // Extract logo image from the batch view page
                            let logo: string | undefined = undefined;
                            const logoContainer = anchor.querySelector('div.flex.w-20.shrink-0.grow-0.basis-20.items-center.pr-4');
                            if (logoContainer) {
                                const logoImg = logoContainer.querySelector('img.rounded-full.bg-gray-100');
                                if (logoImg && logoImg.hasAttribute('src')) {
                                    const logoSrc = logoImg.getAttribute('src');
                                    // Ensure the logo URL is absolute
                                    if (logoSrc) {
                                        logo = logoSrc.startsWith('http') ? logoSrc : new URL(logoSrc, window.location.origin).href;
                                    }
                                }
                            }
                            
                            results.push({ link, oneLiner: oneLinerText, sectors, logo });
                        }
                    }
                    return results;
                }, companyLinkSelector);

                let newItemsFoundThisScroll = 0;
                for (const companyItem of newCompanyDataFromPage) {
                    if (companyItem && companyItem.link && !allCompanyInfo.has(companyItem.link)) {
                        allCompanyInfo.set(companyItem.link, { 
                            oneLiner: companyItem.oneLiner, 
                            sectors: companyItem.sectors,
                            logo: companyItem.logo // Store the logo URL from batch page
                        });
                        newItemsFoundThisScroll++;
                    }
                }
                
                console.log(`Scroll ${scrolls + 1}/${maxScrolls}: Found ${newCompanyDataFromPage.length} items via page.evaluate. Added ${newItemsFoundThisScroll} new unique items. Total unique: ${allCompanyInfo.size}`);

                const currentHeight = await page.evaluate('document.body.scrollHeight') as number;
                if (currentHeight === previousHeight && scrolls > 0) { // Check scrolls > 0 to ensure previousHeight is not initial 0
                    scrollsWithoutHeightChange++;
                    console.log(`Scroll height ${currentHeight} unchanged for ${scrollsWithoutHeightChange} consecutive scroll(s).`);
                } else {
                    scrollsWithoutHeightChange = 0; // Reset if height changed
                }
                previousHeight = currentHeight;

                if (scrollsWithoutHeightChange >= 2) { 
                    console.log('Document height stable for 2 scrolls. Assuming all companies are loaded.');
                    break;
                }

                await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
                await sleep(1000); // Reverted sleep time
                scrolls++;
                // debugInfoFound logic removed
            }

        } catch (error) {
            console.error('Error during Puppeteer operations (fetching main page with scrolling):', error);
            if (prisma) {
                try { await prisma.$disconnect(); console.log('Disconnected from Prisma due to Puppeteer error.'); } catch (e) { console.error('Error disconnecting Prisma after Puppeteer error:', e); }
            }
            return; // Exit scrapeYCCompanies due to Puppeteer error
        } finally {
            // This block executes regardless of whether the try or catch block was executed for Puppeteer stage.
            // All debugInfoFound and related fs logging logic removed.
            if (browser && browser.isConnected()) { // Check if browser is defined and connected
                console.log('Closing browser in Puppeteer finally block...');
                try {
                    await browser.close();
                    console.log('Browser closed in Puppeteer finally block.');
                } catch (closeError) {
                    console.error('Error closing browser in Puppeteer finally block:', closeError);
                }
            }
        }

        // Ensure allCompanyInfo, companyLinks, and subsequent processing are OUTSIDE the Puppeteer try/catch/finally

        // Populate companyLinks from the Map keys for iteration
        const companyLinks: string[] = [];
        allCompanyInfo.forEach((companyDetails, linkPath: string) => { // companyDetails is {oneLiner, sectors}, linkPath is key
            companyLinks.push(`https://www.ycombinator.com${linkPath}`);
        });
        console.log(`Converted unique items to full links. Total to process: ${companyLinks.length}`);

        if (companyLinks.length === 0) {
            console.warn("No company links found. The selector for company cards on the batch page might be outdated.");
            console.warn('Current selector being used: $(\'a[class^="_company_"]\') // Class starts with _company_');
            if (prisma) {
                try {
                    await prisma.$disconnect();
                    console.log('Disconnected from database (0 links found case).');
                } catch (e) {
                    console.error('Error disconnecting Prisma (0 links found case):', e);
                }
            }
            return;
        } else { 
            console.log(`Successfully found ${companyLinks.length} unique company links to process.`);
            // Removed debug log for first 5 links
        }

        for (const companyLink of companyLinks) {
            const linkPath = companyLink.replace('https://www.ycombinator.com', '');
            const companyInfoFromBatch = allCompanyInfo.get(linkPath);
            const oneLinerFromBatch = companyInfoFromBatch ? companyInfoFromBatch.oneLiner : "N/A"; // Get the pre-fetched one-liner
            console.log(`\nProcessing company page: ${companyLink}`);
            try {
                await sleep(1000); // Wait 1 second before fetching the next company page

                const companyDetailResponse = await axios.get(companyLink);
                const companyDetailHtml = companyDetailResponse.data;
                const $$ = cheerio.load(companyDetailHtml);

                // --- Data Extraction (Revised Selectors) ---
                const ycBatchName = batchUrl.includes('batch=') ? decodeURIComponent(batchUrl.split('batch=')[1].split('&')[0]) : 'Unknown Batch';

                // Name: Typically the main h1 or a prominent heading
                let name = $$('h1').first().text().trim();
                if (!name) {
                    name = $$('div[class*="companyName"]_').first().text().trim(); // Fallback for some structures
                }
                if (!name) {
                    // Try to extract from a URL like /companies/some-name
                    const pathParts = new URL(companyLink).pathname.split('/');
                    const companySlug = pathParts[pathParts.length -1];
                    name = companySlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()); // Capitalize
                    if (name) console.warn(`Used URL slug for company name: ${name} for ${companyLink}`);
                    else name = "Name Not Found";
                }

                // One-Liner is now primarily sourced from the batch page scraping (Puppeteer stage)
                let oneLiner = oneLinerFromBatch;
                // Optional: Add a very low-priority fallback here if oneLinerFromBatch is "N/A" and you still want to try individual page
                // For now, we trust the batch page version or its "N/A" default.
                if (oneLiner === "N/A" || (typeof oneLiner === 'string' && oneLiner.length < 10)) {
                    console.warn(`One-liner from batch page may be missing or too short for ${name}: "${oneLiner}"`);
                    // As a fallback, try to get it from meta description if the batch one is bad
                    const metaDescription = $$('meta[name="description"]').attr('content');
                    if (metaDescription && metaDescription.length > 10) {
                        console.log(`Using meta description as fallback one-liner for ${name}`);
                        oneLiner = metaDescription.trim();
                    } else {
                         // Fallback: try the first <p> with significant text content inside specific common container selectors
                        const mainContentSelectors = ['main', 'article', 'div[role="main"]', 'div[class*="content"]', 'section'];
                        let pOneLiner = "N/A";
                        for (const selector of mainContentSelectors) {
                            const firstP = $$(selector).find('p').filter((idx, el) => $$(el).text().trim().length > 20).first().text().trim();
                            if (firstP) {
                                pOneLiner = firstP;
                                break;
                            }
                        }
                        if (pOneLiner !== "N/A" && typeof oneLiner === 'string' && pOneLiner.length > oneLiner.length) {
                            console.log(`Using first paragraph as fallback one-liner for ${name}`);
                            oneLiner = pOneLiner;
                        }
                    }
                }

                // Website: Look for an explicit link, often labeled or in a specific section
                let website = $$('a[href*="://"][aria-label*="website" i]').first().attr('href') || // More specific target
                              $$('div:contains("Website") + div a').first().attr('href') || // Text label followed by link
                              $$('a[target="_blank"]').filter((i, el) => {
                                  const currentHref = $$(el).attr('href');
                                  const currentText = $$(el).text().trim().toLowerCase();
                                  // Safely get the first word of the name, defaulting to an empty string if name is undefined or empty
                                  const firstWordOfName = (name && typeof name === 'string' && name.split(' ')[0]?.toLowerCase()) || ""; 

                                  const conditionsMet = currentHref &&
                                      !currentHref.includes('ycombinator.com') &&
                                      !currentHref.includes('twitter.com') &&
                                      !currentHref.includes('linkedin.com') &&
                                      !currentHref.includes('facebook.com') &&
                                      ( 
                                        currentText.includes('website') || 
                                        (firstWordOfName && (currentText.includes(firstWordOfName) || currentHref.includes(firstWordOfName)) ) 
                                      );
                                  return !!conditionsMet; // Ensure boolean return
                              }).first().attr('href');
                if (!website) { // Broader search for external links if specific ones fail
                    const companyNameParts = name.toLowerCase().split(' ');
                    $$('a[href^="http"]').each((i, el) => {
                        const hrefVal = $$(el).attr('href');
                        if (hrefVal && !hrefVal.includes('ycombinator.com') && !hrefVal.includes('twitter') && !hrefVal.includes('linkedin') && !hrefVal.includes('facebook')) {
                            // Prioritize if link text or href contains part of company name
                            if (companyNameParts.some(part => hrefVal.toLowerCase().includes(part) || $$(el).text().toLowerCase().includes(part))) {
                                website = hrefVal;
                                return false; // Found a good candidate
                            }
                        }
                    });
                }
                website = website?.trim() || "Not Found";
                if (website === "Not Found") console.warn(`Website not found for ${name}`);

                // Get sectors and logo from batch page if available
                const linkPath = companyLink.replace('https://www.ycombinator.com', '');
                const batchPageInfo = allCompanyInfo.get(linkPath);
                const batchPageSectors = batchPageInfo ? batchPageInfo.sectors : [];
                const batchPageLogo = batchPageInfo ? batchPageInfo.logo : undefined;
                
                // Use logo from batch page instead of trying to extract from individual page
                let logo = batchPageLogo;
                
                // Only log a warning if we don't have a logo from the batch page
                if (!logo) {
                    console.warn(`Logo not found for ${name} in batch page`);
                } else {
                    console.log(`Using logo from batch page for ${name}`);
                }


                // Sectors, Description, Founded Date, Business Model - often in key-value pairs or specific sections
                // This part often requires looking for specific div structures or text labels
                let individualPageSector = "Not Found"; // For sector found on individual page
                let description = "Not Found";
                let foundedDateStr = "Not Found";
                let businessModel = "Not Found";

                // Generic detail extraction logic (Iterate over common YC info blocks)
                // YC pages often use divs with label-value pairs or sections
                $$('div.flex.flex-col > div.mb-4, div.space-y-2 > div, div.leading-snug > div').each((i, detailBlock) => {
                    const blockText = $$(detailBlock).text().toLowerCase();
                    const children = $$(detailBlock).children();
                    let label = "";
                    let value = "";

                    if (children.length >= 2) {
                        label = $$(children[0]).text().trim().toLowerCase();
                        value = $$(children[1]).text().trim();
                    } else if (blockText.includes(':')) { // Fallback for 'Label: Value' in single element
                        const parts = $$(detailBlock).text().split(':');
                        label = parts[0].trim().toLowerCase();
                        value = parts.slice(1).join(':').trim();
                    }
                    
                    if (label.includes('market') || label.includes('industry') || label.includes('sector')) {
                        if (individualPageSector === "Not Found" && value) individualPageSector = value.trim(); // Store the full value
                    }
                    if (label.includes('founded') || label.includes('launched')) {
                        if (foundedDateStr === "Not Found" && value) foundedDateStr = value;
                    }
                    if (label.includes('business model')) {
                         if (businessModel === "Not Found" && value) businessModel = value;
                    }
                });

                // Description: Look for a longer text block, often in a 'About' section or a prominent paragraph area
                if (description === "Not Found") {
                    description = $$('div[class*="prose"]_ p').map((i, el) => $$(el).text().trim()).get().join('\n\n') ||
                                  $$('section[aria-labelledby*="about"] p').map((i, el) => $$(el).text().trim()).get().join('\n\n') ||
                                  $$('div.text-gray-700').first().text().trim(); // More generic fallback
                    if (description && description.length < 20 && $$('meta[property="og:description"]').attr('content')) {
                         // If description is too short, try og:description
                        const ogDesc = $$('meta[property="og:description"]').attr('content');
                        if (ogDesc && ogDesc.length > description.length) description = ogDesc;
                    }
                }
                description = description?.trim() || "Not Found";
                 if (description === "Not Found" || description.length < 20) {
                    console.warn(`Description may be missing or too short for ${name}`);
                }

                // Fallback for sector if still not found (often in tags)
                if (individualPageSector === "Not Found") {
                    $$('a[href*="/companies?industry="]').each((i, el) => {
                        const tagText = $$(el).text().trim();
                        if (tagText && !tagText.toLowerCase().includes('batch')) { // Avoid 'S24 Batch' etc.
                            individualPageSector = tagText;
                            return false; // Found first relevant tag
                        }
                    });
                }
                individualPageSector = individualPageSector?.trim() || "Not Found";
                if (individualPageSector === "Not Found") console.warn(`Sector not found on individual page for ${name}`);

                // Founded Date Parsing (more robust)
                let foundedDate: Date;
                const currentYear = new Date().getFullYear();
                const batchYearMatch = ycBatchName.match(/\d{4}/);
                const defaultBatchYear = batchYearMatch ? parseInt(batchYearMatch[0]) : currentYear;

                if (foundedDateStr && foundedDateStr !== "Not Found") {
                    const yearMatch = foundedDateStr.match(/\b(\d{4})\b/);
                    const monthMatch = foundedDateStr.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December)\b/i);
                    
                    let year = yearMatch ? parseInt(yearMatch[1]) : defaultBatchYear;
                    let month = 0; // Default to January

                    if (monthMatch) {
                        const monthShort = monthMatch[1].substring(0,3).toLowerCase();
                        const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
                        month = months.indexOf(monthShort);
                    }
                    
                    // Ensure year is reasonable (e.g., not in the future beyond current year + 1, not too far in past)
                    if (year > currentYear + 1) year = defaultBatchYear;
                    if (year < 1980) year = defaultBatchYear; 

                    foundedDate = new Date(year, month, 1);
                } else {
                    console.warn(`Could not parse or find founded date for ${name}. Using default based on batch: ${defaultBatchYear}-01-01`);
                    foundedDate = new Date(defaultBatchYear, 0, 1); // Default to Jan 1st of batch year
                }

                // Business Model Fallback (often in tags or combined with sector)
                if (businessModel === "Not Found") {
                    $$('a[href*="/companies?tags="]').each((i, el) => {
                        const tagText = $$(el).text().trim().toLowerCase();
                        if (tagText.includes('b2b') || tagText.includes('b2c') || tagText.includes('saas') || tagText.includes('marketplace') || tagText.includes('api') || tagText.includes('d2c') || tagText.includes('platform')) {
                            businessModel = $$(el).text().trim();
                            return false;
                        }
                    });
                }
                businessModel = businessModel?.trim() || "Not Found";
                if (businessModel === "Not Found") {
                    console.warn(`Business model not found for ${name}. THIS IS REQUIRED.`);
                }
                if (businessModel === "Not Found") { // Fallback
                    // Attempt to find a section titled "Business Model"
                    const bmHeader = $$('h2, h3').filter((i, elH) => $$(elH).text().trim().toLowerCase() === 'business model');
                    if (bmHeader.length > 0) {
                        businessModel = bmHeader.first().nextAll('p, div').first().text().trim();
                    }
                }



                if (!name || name === "Not Found" || name.length < 2) { // Basic validation
                    console.warn(`Could not extract name for ${companyLink}. Skipping.`);
                    continue;
                }
                if (website === "Not Found") console.warn(`Website not found for ${name}`);
                if (oneLiner === "Not Found" || (typeof oneLiner === 'string' && oneLiner.length < 5)) console.warn(`One-liner may be missing or too short for ${name}`);
                if (description === "Not Found") console.warn(`Description not found for ${name}`);
                if (businessModel === "Not Found") console.warn(`Business model not found for ${name}. THIS IS REQUIRED.`);

                // Logo URL is already properly formatted from the batch page
                let finalLogoUrl: string | undefined = logo;
                
                // Combine sectors from batch page and individual page
                let finalSectors: string[] = [];
                
                // Add batch page sectors first (priority)
                if (batchPageSectors.length > 0) {
                    finalSectors = [...batchPageSectors];
                    console.log(`Using sectors from batch page for ${name}: ${batchPageSectors.join(', ')}`);
                }
                
                // Add individual page sector if it exists and isn't already included
                let individualSectors: string[] = [];
                if (individualPageSector !== "Not Found") {
                    individualSectors = individualPageSector.split(',').map(s => s.trim()).filter(s => s.length > 0);
                }

                // Add individual page sectors to finalSectors if not already included
                for (const sector of individualSectors) {
                    if (!finalSectors.some(s => s.toLowerCase() === sector.toLowerCase())) {
                        finalSectors.push(sector);
                        console.log(`Added sector from individual page for ${name}: ${sector}`);
                    }
                }

                // If no sectors found from either source, add a default
                if (finalSectors.length === 0) {
                    finalSectors = ["Unknown"];
                    console.warn(`No sectors found for ${name} from either batch or individual page, using 'Unknown'`);
                }

                // --- Upsert company record ---
                let companyRecord;
                try {
                    companyRecord = await prisma.company.upsert({
                        where: { name },
                        update: {
                            oneLiner,
                            website,
                            ycBatch: ycBatchName,
                            sectors: finalSectors,
                            description,
                            foundedDate,
                            businessModel,
                            logo: finalLogoUrl,
                        },
                        create: {
                            name,
                            oneLiner,
                            website,
                            ycBatch: ycBatchName,
                            sectors: finalSectors,
                            description,
                            foundedDate,
                            businessModel,
                            logo: finalLogoUrl,
                        },
                    });
                    console.log(`Upserted company: ${name}`);
                } catch (err) {
                    console.error(`Error upserting company ${name}:`, err);
                    continue;
                }

                // --- Founder Scraping ---
                console.log('Starting founder scraping...');
                const founders: { name: string; title?: string; linkedin?: string; bio?: string }[] = [];
                
                // Log the entire HTML content for debugging
                const htmlContent = $$('body').html();
                console.log('Page HTML length:', htmlContent?.length || 0);
                
                // Try different selectors for founder sections
                const founderSelectors = [
                    '.group.flex.gap-4',
                    '.flex.flex-col.gap-4',
                    'div[class*="founder"]',
                    'div[class*="team"]'
                ];
                
                console.log('Trying founder selectors...');
                founderSelectors.forEach(selector => {
                    const elements = $$(selector);
                    console.log(`Selector '${selector}' found ${elements.length} elements`);
                    
                    elements.each((_, founderSection) => {
                        // Try multiple name selectors
                        const nameSelectors = [
                            'div.text-xl.font-bold',
                            'div.text-2xl.font-bold',
                            'h3.text-xl.font-bold',
                            'div[class*="name"]'
                        ];
                        
                        let nameEl;
                        let fname = '';
                        for (const nameSelector of nameSelectors) {
                            nameEl = $$(founderSection).find(nameSelector);
                            if (nameEl.length > 0) {
                                fname = nameEl.text().trim();
                                console.log(`Found name using selector '${nameSelector}': ${fname}`);
                                break;
                            }
                        }
                        
                        // Try multiple LinkedIn selectors
                        const linkedinSelectors = [
                            'a[data-tooltip-content="Linkedin"]',
                            'a[href*="linkedin.com"]',
                            'a[aria-label*="LinkedIn"]'
                        ];
                        
                        let linkedinEl: cheerio.Cheerio<Element> | null = null;
                        let flinkedin;
                        for (const linkedinSelector of linkedinSelectors) {
                            linkedinEl = $$(founderSection).find(linkedinSelector);
                            if (linkedinEl.length > 0) {
                                flinkedin = linkedinEl?.attr('href') || undefined;
                                console.log(`Found LinkedIn using selector '${linkedinSelector}': ${flinkedin}`);
                                break;
                            }
                        }
                        
                        if (fname && !founders.some(f => f.name === fname)) {
                            founders.push({
                                name: fname,
                                linkedin: flinkedin || undefined
                            });
                            console.log(`Adding founder: ${fname}${flinkedin ? ' (with LinkedIn)' : ''}`);
                            
                            // Debug output
                            console.log('Founder section details:', {
                                outerHTML: $$(founderSection).toString(),
                                sectionClasses: $$(founderSection).attr('class'),
                                nameElementClasses: nameEl?.attr('class'),
                                linkedinElementExists: linkedinEl ? linkedinEl.length > 0 : false,
                                linkedinHref: flinkedin
                            });
                        }
                    });
                });
                
                console.log(`Found ${founders.length} total founders`);
                if (founders.length === 0) {
                    console.log('No founders found. HTML snippet around potential founder area:', {
                        teamSection: $$('div[class*="team"]').toString(),
                        founderSection: $$('div[class*="founder"]').toString(),
                        nearbyText: $$('div.text-xl.font-bold').toString()
                    });
                }
                
                // Log if no founders found
                if (founders.length === 0) {
                    console.warn('No founders found using primary selectors, company might have different HTML structure');
                }
                if (founders.length === 0) {
                    console.warn(`No founders found for ${name}. Check selectors.`);
                } else {
                    for (const founder of founders) {
                        try {
                            // Try to find existing founder
                            const existingFounder = await prisma.founder.findFirst({
                                where: {
                                    name: founder.name,
                                    companyId: companyRecord.id
                                }
                            });

                            if (existingFounder) {
                                // Update existing founder
                                const founderData: FounderCreateData = {
                                    name: founder.name,
                                    companyId: companyRecord.id,
                                    title: founder.title || null,
                                    linkedin: founder.linkedin || null,
                                    bio: founder.bio || null
                                };

                                await prisma.founder.update({
                                    where: { id: existingFounder.id },
                                    data: founderData as any // Force TypeScript to accept our schema-matching types
                                });
                            } else {
                                // Create new founder
                                const founderData: FounderCreateData = {
                                    name: founder.name,
                                    companyId: companyRecord.id,
                                    title: founder.title || null,
                                    linkedin: founder.linkedin || null,
                                    bio: founder.bio || null
                                };

                                await prisma.founder.create({
                                    data: founderData as any // Force TypeScript to accept our schema-matching types
                                });
                            }
                            console.log(`Upserted founder: ${founder.name} (${founder.title || ''}) for company ${name}`);
                        } catch (err) {
                            console.error(`Error upserting founder ${founder.name} for company ${name}:`, err);
                        }
                    }
                }

            // This is the catch for the try block that starts with 'await sleep(1000);' (processing a single companyLink)
            } catch (error) { 
                console.error(`Error processing company page ${companyLink}:`, error);
            }
        } // Closes 'for (const companyLink of companyLinks)' loop

        console.log('\nYC company scraping script finished processing all found links for this batch.');

    } catch (error) {
        console.error('Error during the main scraping process for the batch:', error);
    } finally {
        if (prisma) { 
            try {
                await prisma.$disconnect();
                console.log('Disconnected from Prisma database in main finally block of scrapeYCCompanies.');
            } catch (disconnectError) {
                console.error('Error disconnecting Prisma in main finally block:', disconnectError);
            }
        }
    }
} // This closes the scrapeYCCompanies async function

// Execute the scraper
const batchUrl = 'https://www.ycombinator.com/companies?batch=Spring%202025'; // Default or get from args
scrapeYCCompanies(batchUrl)
    .then(() => {
        console.log('Script execution promise resolved.');
    })
    .catch((e) => {
        console.error('Unhandled error in scraper execution:', e);
        // process.exit(1); // Commented out for clearer ts-node error reporting
    });
