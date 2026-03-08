# HTML_BARINV_INVENTORY

Static, offline-first bar inventory clicker. Single `index.html` — no server, no dependencies, no installation.

## Features

- **Offline-first**: All data saved in browser LocalStorage
- **Setup**: Bars, Stations, Staff (Bartenders + Barbacks), Items/Products
- **Placements**: Assign items to stations with staff assignments
- **Inventory Tracking**: Per-station clicker for Taken / Returned counts
- **Activity Logs**: Every action logged with timestamp
- **Variance Report**: Placed vs Taken vs Returned vs Net Used
- **Exports**:
  - Sheet Style CSV (`Bars | Bartenders | Barbacks | Placement | Item | Returned`)
  - Full Detail CSV (all fields)
  - Printable HTML Report
  - Activity Log CSV
  - JSON Backup / Import

## Usage

### Option A — Open Locally
1. Download or clone this repo
2. Open `index.html` in any modern browser
3. Done — no server needed

### Option B — GitHub Pages (free hosting)
1. Create a GitHub repository
2. Upload `index.html` to the root
3. Go to **Settings → Pages → Source → main branch / root**
4. Your app is live at `https://YOUR_USERNAME.github.io/REPO_NAME/`

### Option C — Railway Static
1. Push to GitHub
2. Create new Railway project → Deploy from GitHub
3. No build command needed; set publish directory to `/`

## Workflow

### First Time Setup
1. **Setup → Bars**: Add your bars (e.g., "Main Bar", "Harbour")
2. **Setup → Staff**: Add bartenders and barbacks
3. **Setup → Stations**: Add stations per bar (e.g., "Station 1", "Speed Rail")
4. **Setup → Products**: Add your inventory items
5. **Setup → Placements**: Link items to stations with staff and opening qty

### Each Night
1. **Top bar → + Night**: Create a new night entry with date
2. **Inventory tab**: Select the night, start clicking +/− for each item
3. **Logs tab**: See all activity
4. **Variance tab**: Review placed vs used vs returned
5. **Export tab**: Export the sheet-style CSV or HTML report

## Data Storage

All data is stored in your browser's **LocalStorage** under the key `barinv_v2`.

- Data persists across page refreshes and browser restarts
- Data is **device-specific** (not shared between devices)
- Use **Export → JSON Backup** to back up data or move between devices
- Use **Export → Import JSON** to restore from backup

## Export Column Reference

### Sheet Style CSV
| Column | Description |
|--------|-------------|
| Bars | Bar name |
| Bartenders | Assigned bartender |
| Barbacks | Assigned barback |
| Placement | Station name |
| Item | Product name |
| Returned | Returned count |

### Full Detail CSV
Night, Bar, Station, Bartender, Barback, Item, Placed, Taken, Returned, Net Used, Variance
