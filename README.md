# ⚡ Flashcards

A simple, offline-first flashcard app for CS interview preparation.  
Built with **vanilla HTML, CSS, JS** — no frameworks, no npm, no build step.

## How to Run

Just open `index.html` in your browser. That's it.

## Tech

| Layer     | Tech                                                        |
|-----------|-------------------------------------------------------------|
| Frontend  | Vanilla HTML / CSS / JS                                     |
| Database  | SQLite via [sql.js](https://github.com/sql-js/sql.js) (WASM) |
| Storage   | `localStorage` (base64-encoded `.sqlite` database)          |

> **Note:** Since there is no backend server, the SQLite database lives inside your browser's `localStorage`. Use the **Export** button on the home page to download a `.sqlite` file you can back up or open in any SQLite viewer. Use **Import** to restore from a file.

## Categories

| # | Category | Description        |
|---|----------|--------------------|
| 1 | DBMS     | Database concepts  |
| 2 | SQL      | Query writing      |
| 3 | OOPs     | Design Patterns    |
| 4 | CN       | Computer Networks  |
| 5 | OS       | Operating Systems  |
| 6 | HLD      | High Level Design  |

Each category has 3 sub-categories:
- **All Concepts** — core theory
- **Situations** — scenario-based
- **Complex Grind** — hard problems

## Pages

- **Home** (`index.html`) — overview, card counts, export/import DB
- **Add** (`add.html`) — rich text editor to create cards
- **Study** (`view.html`) — flip & swipe through cards, read aloud (2x)

## Keyboard Shortcuts (Study page)

| Key          | Action         |
|--------------|----------------|
| `←`          | Previous card  |
| `→`          | Next card      |
| `Space/Enter`| Flip card      |

## Files

```
flashcards/
├── index.html   # home page
├── add.html     # add card page
├── view.html    # study/swipe page
├── style.css    # all styles
├── db.js        # SQLite module (shared)
├── home.js      # home page logic
├── add.js       # add page logic + editor
├── view.js      # study page logic + TTS
└── README.md
```
