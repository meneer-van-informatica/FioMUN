# FioMUN 2027 website

This is the public information website for FioMUN 2027, hosted with GitHub Pages.

## How it works

- `index.html`, `styles.css`, `app.js`: migrated website from the Apps Script prototype.
- `data/site-data.json`: public website content, never private administrative or registration records.
- `scripts/sync_content.py`: validates and downloads public data from Apps Script.
- `.github/workflows/sync-content.yml`: refreshes public data every two hours, or when started manually.

## Setup and release checklist

1. Open the existing public Apps Script `/exec?api=site` endpoint in a private browser window. Confirm it returns JSON without school login.
2. Run **Actions > Sync FioMUN public content > Run workflow**. Verify `data/site-data.json` contains the real content, not the initial placeholder.
3. Open **Settings > Pages** and choose **Deploy from a branch**, `main`, `/ (root)`.
4. Check all pages and forms on desktop and mobile. The legacy registration system is not used.
5. Add the three published Google Forms links in the original **FioMUN Content** sheet, tab `00_CONFIG`: `registration_staff_form_url`, `registration_individual_form_url`, `registration_school_form_url`, with `public` TRUE.
6. Confirm permission to publish the conference information and images and that Google Forms storage and rights are arranged with FioMUN/SFT.
7. In GitHub Pages, enter custom domain `fiomun.fioretti.nl`. Then ask SFT to create DNS record: CNAME `fiomun` -> `meneer-van-informatica.github.io`. GitHub Pages handles HTTPS.

## Editing by Curtis and Yasin

Continue editing the public FioMUN Content spreadsheet. Content automatically syncs to GitHub about every two hours. For urgent changes, start the workflow manually. A layout change or a new type of page still needs code work.

**Everything in this GitHub repository is public.** Never commit school logins, private Google Sheets, registration data, API tokens or anything from the private admin spreadsheet.

## Troubleshooting

If content synchronization fails, inspect the GitHub Action log. The Apps Script public endpoint must be accessible anonymously; a Google login page is not JSON. A failed synchronization does not overwrite the previous valid data. Until the first sync works, this website deliberately displays a preparation notice. Google Sites remains a fallback.

## Four-day programme (Thursday-Sunday)

The programme is supplied by the **FioMUN Content** spreadsheet through the public
Apps Script `?api=site` feed; do not edit `data/site-data.json` manually. Each
programme item must include a day or an ISO date, for example:

```json
{"day": "Friday", "time": "10:00-10:30", "title": "First timer workshop", "text": ""}
```

Accepted days are Thursday, Friday, Saturday, Sunday (also common Dutch names and
abbreviations); an ISO date such as `2027-04-09` also works. The JavaScript
automatically enables day arrows, keyboard arrows and mobile swiping as soon as
at least one valid day is published. Events missing a day stay visible under
"Day to be confirmed". With no valid days the existing uninterrupted list stays
visible. The frontend cannot determine the day from a time/title alone.

The programme used to protect the entire Sheet, which prevented editors from
inserting rows. In the separately maintained **FioMUN Content Apps Script v3.1.0**,
the one-time menu action **5. Programma: 4 dagen vrijmaken** appends the `day`
column, releases sheet-wide protection (but protects the header) and expands
the filter. The **FioMUN Admin Apps Script v3.1.0** must also be deployed so the
public feed includes `day`. Until both parts are updated, a `day` column in
an exported Excel copy is not enough to activate arrows on the website.

The currently published conference date is 9-11 April 2027; the requested
Thursday 8 April may be a staff/preparation day. No existing event dates
were assigned automatically. Confirm the public dates before changing them.
