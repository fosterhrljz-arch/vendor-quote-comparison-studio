# Vendor Quote Comparison Studio

A small, private, offline web app for comparing vendor quotes. Built with plain HTML, CSS, and JavaScript. No installation, build step, account, internet connection, or third-party libraries are required to use it.

## Open the app

1. If you downloaded the ZIP, right-click it and choose **Extract All**. Keep the extracted project files together.
2. Open the extracted `vendor-quote-comparison-studio` folder.
3. Double-click **index.html**. If Windows asks which app to use, choose a current version of Chrome, Edge, Firefox, or Safari.
4. You should see **Clarity before you commit.** and three sample vendors. On the first launch, Gather & Co. is cheapest at **$4,800.00**, saving **$90.00** against Juniper Studio.

**Success sign:** the sample comparison appears without installing anything or starting a server. You can disconnect from the internet and continue using the app.

## Compare your quotes

1. Enter the number of **People** and the **Contract length** in whole months.
2. Set **Per-person billing** to **Once** for a one-time charge per attendee, or **Per month** for a recurring charge per person. This choice applies to every vendor in the comparison; normalize quotes to the same billing basis before comparing them.
3. Replace each vendor's name, setup fee, monthly fee, and per-person rate. Rates are in USD; enter plain numbers such as `1250.50`, without commas or currency symbols. All fields are required; use `0` for a fee that does not apply.
4. Use **Add vendor** for more quotes (up to 10). Use the × button to remove a vendor. **Undo** restores the most recently removed vendor until you reload or reset; it requires an available vendor slot.
5. Read the lowest total, savings, cost bars, and full-contract breakdown. Everything recalculates as you type. If a field is invalid, the app pauses results and highlights the problem.

**Success sign:** change People from `100` to `200`. Juniper Studio becomes cheapest at **$6,890.00**, saving **$410.00** against Gather & Co.

## Understand the calculation

With per-person billing set to **Once**:

`Total = setup fee + (monthly fee × months) + (per-person rate × people)`

With per-person billing set to **Per month**:

`Total = setup fee + (monthly fee × months) + (per-person rate × people × months)`

- Setup is charged once. Headcount is constant throughout the contract.
- Savings compare the cheapest quote with the second-cheapest quote. The percentage uses the second-cheapest total as its denominator.
- Equal totals are shown as a tie, with $0 savings between tied options. A single quote has no savings comparison.
- Bars share one monetary scale, so shorter total bars mean lower total costs. Percent labels describe each vendor's own cost mix. Small segments omit labels; the table always gives exact amounts.
- Costs are calculated using integer cents to avoid ordinary floating-point currency errors.
- People: 0–100,000. Contract length: 1–120 whole months. Each fee: $0–$100,000, with up to two decimal places.
- This version does not model taxes, discounts, inflation, cancellation charges, tiered pricing, minimum attendance, or changing headcounts. It compares cost only, not vendor quality.

## Fictional starting quotes

All three vendors and quotes are fictional illustrations for event-support services.

| Vendor | Setup | Monthly | Per person, once | 100 people / 12 months |
| --- | ---: | ---: | ---: | ---: |
| Gather & Co. | $500.00 | $150.00 | $25.00 | $4,800.00 |
| Northstar Events | $1,200.00 | $95.00 | $28.00 | $5,140.00 |
| Juniper Studio | $250.00 | $220.00 | $20.00 | $4,890.00 |

Use **Reset examples**, then confirm, to restore these quotes and the original scenario. Choose **Keep my quotes** to cancel.

## Export a CSV

1. Make sure there are no highlighted errors and at least one vendor.
2. Select **Export CSV**.
3. Open `vendor-quote-comparison.csv` from your browser's Downloads folder in Excel, Numbers, or another spreadsheet app.

**Success sign:** each vendor has a row with scenario settings, original rates, component totals, grand total, amount above the lowest cost, and a lowest-cost flag. Rows are sorted cheapest first. Currency is explicitly USD.

The export uses UTF-8 with a BOM, CRLF record separators, and quoted CSV cells. Formula-like vendor names are prefixed with an apostrophe for spreadsheet safety. CSV is an output report; this version does not import it back into the app.

## Local saving and privacy

- Valid changes are saved automatically using this browser's local storage, when available. Invalid drafts are not saved; the last valid comparison remains on disk.
- No analytics, external fonts, network requests, or remote accounts are used by the application.
- On a shared computer, others using the same browser profile may be able to see your saved quotes. Exported CSV files also contain your quote information.
- Storage behavior for directly opened `file://` pages varies by browser. Private browsing, blocked storage, renaming or moving the app, or clearing browser data may prevent persistence or make an earlier saved comparison unavailable. The app displays a notice when saving fails. Keep the tab open and export the results before closing it.
- Resetting examples replaces the comparison saved under this app's own storage key; it does not clear other browser data.

## Project files

| File | Purpose |
| --- | --- |
| `index.html` | Page structure and accessible controls; open this file to start |
| `styles.css` | Responsive light design, desktop and mobile layouts |
| `core.js` | Integer-cent calculations, validation, fictional samples, CSV export |
| `app.js` | Input handling, rendered comparison, local saving, export download |
| `tests/core.test.cjs` | Optional calculation and CSV regression tests |
| `README.md` | These instructions |

There are no runtime dependencies. Developers who already have Node.js can run `node --test tests/core.test.cjs` from this folder. **Success sign:** all tests pass and the failure count is zero. Node.js is only for developer tests; it is not needed to use the app.

## Version 1 verification

The delivered version passed 13 automated calculation/CSV regression tests and 14 browser verification groups in Chrome 156 on Windows, using Playwright and the direct `file://` URL with the browser network set offline. Checks covered live recalculation, changing winners, actual CSV download contents, persistence after reload, invalid inputs, ties, zero costs, add/remove/undo, the 10-vendor limit, safe rendering of names, reset confirmation/cancellation (including Escape), unavailable storage, and malformed saved data.

Page widths of 320, 390, 768, 1024, and 1440 pixels were checked for horizontal page overflow. Desktop and mobile screenshots were visually inspected. The app made no HTTP requests and produced no console warnings or runtime errors in the test. Safari, Firefox, and physical mobile devices have not been tested; desktop viewport emulation does not replace device testing.

## Troubleshooting

- **The page is unstyled or the buttons do nothing:** extract the whole ZIP first and keep `index.html`, `styles.css`, `core.js`, and `app.js` in the same folder. Enable JavaScript in your browser.
- **Numbers are not accepted:** use nonnegative plain numbers, whole people/months, and no more than two decimal places for fees. A month count must be at least 1.
- **The table is wider than your phone:** swipe the cost table horizontally. The rest of the page fits the screen.
- **The CSV does not appear:** check your browser's Downloads list and download permission settings.
- **Your edits disappeared:** reopen the same file in the same browser profile; see the local-storage limitations above. CSV exports serve as a readable record.

Version 1.0.0. No AgentGit upload or hosting is required.
