# Document Annotator Studio

A web application for annotating and managing document collections.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/DocumentAnnotatorStudio.git
cd DocumentAnnotatorStudio
```

2. Install dependencies including SQLite:
```bash
npm install
npm install express sqlite3
```

3. The SQLite database (`high_res_ocr_results.db`) is already included in the project.

## Running the Application

Start the development server:
```bash
node server.cjs
```

The application will be available at:
`http://localhost:3000`

## Project Structure

- `server.cjs` - Main backend server
- `index.html` - Frontend entry point
- `styles.css` - Main stylesheet
- `package.json` - Project dependencies and configuration
- `high_res_ocr_results.db` - SQLite database file
- `dump.sql` - Database schema dump
- `high_res_images/` - Directory containing document images

## SQLite Management

The application uses SQLite for data storage. The database file (`high_res_ocr_results.db`) is automatically created if it doesn't exist.

To inspect the database using the SQLite CLI:
```bash
sqlite3 high_res_ocr_results.db
```

To recreate the database from the schema dump:
```bash
sqlite3 high_res_ocr_results.db < dump.sql
```

## Dependencies

- express: ^5.1.0
- sqlite3: ^5.1.7
