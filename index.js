const core = require('@actions/core');
const fs = require('fs/promises');
const path = require('path');
const cheerio = require('cheerio');
const { Agent, setGlobalDispatcher } = require('undici');

const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

// Disable strict SSL verification
const agent = new Agent({
    connect: {
        rejectUnauthorized: false
    }
});
setGlobalDispatcher(agent);

// Helper to find all markdown files
async function getMarkdownFiles(dir) {
    let results = [];
    const list = await fs.readdir(dir, { withFileTypes: true });
    for (const dirent of list) {
        const fullPath = path.join(dir, dirent.name);
        if (dirent.isDirectory()) {
            results = results.concat(await getMarkdownFiles(fullPath));
        } else if (dirent.name.endsWith('.md')) {
            results.push(fullPath);
        }
    }
    return results;
}

async function checkUrl(url, anchor) {
    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            }
        });

        if (!response.ok) {
            // Some websites return 403 (Forbidden) or 429 (Too Many Requests) for scripts/bots like GitHub Actions
            // We treat these as valid because the host responded and the URL didn't return a 404 (Not Found)
            if (response.status === 403 || response.status === 429 || response.status === 401) {
                return null;
            }
            return `HTTP ${response.status} ${response.statusText}`;
        }


        if (anchor) {
            const html = await response.text();
            const $ = cheerio.load(html);
            const anchorExists = $(`#${anchor}`).length > 0 || $(`[name="${anchor}"]`).length > 0;
            if (!anchorExists) {
                return `Anchor '#${anchor}' not found on the page`;
            }
        }
        return null;
    } catch (error) {
        return `Fetch error: ${error.message}`;
    }
}

async function run() {
    try {
        const directory = core.getInput('directory') || './content';
        const contentDir = path.resolve(process.env.GITHUB_WORKSPACE || process.cwd(), directory);

        core.info(`Checking links in markdown files in: ${contentDir}`);

        // Ensure directory exists
        try {
            await fs.access(contentDir);
        } catch {
            core.warning(`Directory ${contentDir} does not exist. Skipping check.`);
            return;
        }

        const files = await getMarkdownFiles(contentDir);
        let hasErrors = false;
        let checkedCount = 0;
        const brokenLinks = [];

        for (const file of files) {
            const content = await fs.readFile(file, 'utf-8');
            let match;
            const relativePath = path.relative(contentDir, file);

            while ((match = linkRegex.exec(content)) !== null) {
                const fullUrl = match[2].trim();
                if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
                    continue;
                }

                let urlObj;
                try {
                    urlObj = new URL(fullUrl);
                } catch (e) {
                    core.error(`[${relativePath}] Invalid URL format: ${fullUrl}`);
                    hasErrors = true;
                    brokenLinks.push(`${relativePath} - ${fullUrl} (Invalid Format)`);
                    continue;
                }

                const urlWithoutHash = urlObj.origin + urlObj.pathname + urlObj.search;
                const anchor = urlObj.hash ? urlObj.hash.substring(1) : null;

                core.info(`Checking ${fullUrl} ...`);
                const error = await checkUrl(urlWithoutHash, anchor);

                if (error) {
                    core.error(`File: ${relativePath}`);
                    core.error(`Error: ${error}`);
                    hasErrors = true;
                    brokenLinks.push(`${relativePath} - ${fullUrl}`);
                }
                checkedCount++;

                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

        core.info(`Checked ${checkedCount} external links.`);

        if (hasErrors) {
            const reportPath = path.join(process.env.GITHUB_WORKSPACE || process.cwd(), 'broken_links.txt');
            await fs.writeFile(reportPath, brokenLinks.join('\\n'), 'utf-8');
            core.setFailed(`Broken links found! Check broken_links.txt for details.`);
        } else {
            core.info(`All links are working fine!`);
        }
    } catch (error) {
        core.setFailed(`Action failed: ${error.message}`);
    }
}

run();