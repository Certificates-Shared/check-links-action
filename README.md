# Check Markdown Links Action

This GitHub Action parses markdown files in a specified directory to find external links and HTTP anchors, then tests them to confirm they are reachable (HTTP 200 OK) and that anchors exist on the target page. 

## Inputs

### `directory`

**Optional** The directory containing the markdown files to check. Default is `./content`.

## Example usage

```yaml
name: Check Links
on: [push, pull_request]

jobs:
  check-links:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Check links
        uses: Certificates-Shared/check-links-action@main
        with:
          directory: './content'
```

If any link is broken, the action will fail and write the findings to `broken_links.txt` in the GitHub workspace. You can optionally upload this file as an artifact:

```yaml
      - name: Upload broken links report
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: broken-links-report
          path: broken_links.txt
```
