---
name: project-overview
description: How the check-links-action project works and guidelines for modifying it
---

# Check Markdown Links Action (check-links-action)

This skill provides context and guidelines for working on the `check-links-action` project located in `/Users/alainchautard/code-repos/check-links-action`.

## Purpose
This project is a bespoke GitHub Action designed to check for broken links and anchors within Markdown files.

## Project Structure
- `action.yml`: The GitHub Action metadata file defining the action's name, description, and its inputs (such as the `directory` containing the markdown files to scan).
- `package.json`: Contains the project metadata and dependencies:
  - `@actions/core`: Core functionality for GitHub Actions inputs, outputs, and logging.
  - `cheerio`: An HTML parser used to extract links and anchors from HTML content (likely after markdown is converted or directly parsed).
  - `undici`: A fast and reliable HTTP/1.1 client for Node.js, used to verify the accessibility of the extracted links.
- `index.js`: The main entry point script for the GitHub Action containing the execution logic.

## Agent Guidelines for this Project
- Ensure any new action parameters map seamlessly to the inputs defined in `action.yml`.
- Dependencies are managed via `npm`. Use `npm install` when testing locally, and ensure the `package.json` is updated appropriately if packages are added or customized.
- Optimization should prioritize `undici` for rapid batch HTTP request processing to maintain fast script execution time. 
