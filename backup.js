
// A Node.js script to automate database and file backups for this PawLog project.
// This script is intended to be run via a scheduler 

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const util = require('util'); // For promisifying exec

const execPromise = util.promisify(exec);

// --- Configuration ---
// !! IMPORTANT: Replace with your actual database credentials and paths !!
// Consider using environment variables for production security instead of hardcoding
const DB_HOST = process.env.DB_HOST || '127.0.0.1';
const DB_USER = process.env.DB_USER || 'root'; // Replace with your DB user
const DB_PASSWORD = process.env.DB_PASSWORD || 'happy4lyf'; // Replace with your DB password
const DB_NAME = process.env.DB_NAME || 'pawlog_db'; // Replace with your database name

// Define the directory where your uploaded files are stored relative to the project root
const UPLOADS_DIR_RELATIVE = 'public/uploads/pets'; // Adjust if your path is different
const IMAGES_DIR_RELATIVE = 'public/images'; // Adjust if your path is different

// Define the directory where backups will be saved (absolute path recommended)
// Make sure this directory exists and Node.js has write permissions
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, 'backups'); // Creates a 'backups' folder in your project root

// --- Backup Logic ---

async function runBackup() {
    const timestamp = new Date().toISOString().replace(/[:.-]/g, '_'); // Timestamp for filenames
    const dbBackupFileName = `${DB_NAME}_${timestamp}.sql`;
    const dbBackupFilePath = path.join(BACKUP_DIR, dbBackupFileName);
    const uploadsBackupDirName = `uploads_${timestamp}`;
    const uploadsBackupDirPath = path.join(BACKUP_DIR, uploadsBackupDirName);
    const uploadsSourcePath = path.join(__dirname, UPLOADS_DIR_RELATIVE);


    console.log(`[${new Date().toISOString()}] Starting backup...`);

    // 1. Ensure the backup directory exists
    if (!fs.existsSync(BACKUP_DIR)) {
        console.log(`[${new Date().toISOString()}] Creating backup directory: ${BACKUP_DIR}`);
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    // 2. Backup the database using mysqldump
    console.log(`[${new Date().toISOString()}] Backing up database "${DB_NAME}" to "${dbBackupFilePath}"...`);
    // The --single-transaction option is good for InnoDB tables to get a consistent snapshot
    // The --quick option is good for large tables to avoid excessive RAM usage
    // The --lock-tables=false is often used with --single-transaction for InnoDB
    // Securely pass password using --password=... (no space) or via environment variable (recommended)
    const dbDumpCommand = `mysqldump -h ${DB_HOST} -u ${DB_USER} --password=${DB_PASSWORD} --single-transaction --quick --lock-tables=false ${DB_NAME} > "${dbBackupFilePath}"`;

    try {
        const { stdout, stderr } = await execPromise(dbDumpCommand);
        if (stderr) {
            console.error(`[${new Date().toISOString()}] mysqldump stderr: ${stderr}`);
        }
        console.log(`[${new Date().toISOString()}] Database backup complete: ${dbBackupFilePath}`);
        // Optional: Compress the SQL file
        // exec(`gzip "${dbBackupFilePath}"`, (gzipErr, gzipStdout, gzipStderr) => {
        //     if (gzipErr) console.error(`[${new Date().toISOString()}] gzip error: ${gzipErr}`);
        //     if (gzipStderr) console.error(`[${new Date().toISOString()}] gzip stderr: ${gzipStderr}`);
        //     console.log(`[${new Date().toISOString()}] Database backup compressed: ${dbBackupFilePath}.gz`);
        // });

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during database backup: ${error}`);
        // Decide if you want to stop the script here or continue with file backup
        // process.exit(1); // Exit if DB backup fails
    }

    // 3. Backup uploaded files (simple copy)
    console.log(`[${new Date().toISOString()}] Backing up uploaded files from "${uploadsSourcePath}" to "${uploadsBackupDirPath}"...`);

    // Use a recursive copy command. 'cp -r' on Unix-like systems, 'xcopy /E /I' on Windows
    let copyCommand;
    if (process.platform === 'win32') {
        // Windows: xcopy /E /I source destination
        // /E: Copies directories and subdirectories, including empty ones.
        // /I: If destination does not exist and you are copying more than one file,
        //     assumes that destination specifies a directory.
        copyCommand = `xcopy /E /I "${uploadsSourcePath}" "${uploadsBackupDirPath}"`;
    } else {
        // Linux/macOS: cp -r source destination
        copyCommand = `cp -r "${uploadsSourcePath}" "${uploadsBackupDirPath}"`;
    }


    try {
        // Ensure the destination directory for uploads backup exists first
        if (!fs.existsSync(uploadsBackupDirPath)) {
             fs.mkdirSync(uploadsBackupDirPath, { recursive: true });
        }

        const { stdout, stderr } = await execPromise(copyCommand);
         if (stderr) {
             console.error(`[${new Date().toISOString()}] File copy stderr: ${stderr}`);
         }
         if (stdout) {
              console.log(`[${new Date().toISOString()}] File copy stdout: ${stdout}`);
         }
        console.log(`[${new Date().toISOString()}] Uploaded files backup complete.`);

    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error during uploaded files backup: ${error}`);
    }

    console.log(`[${new Date().toISOString()}] Backup process finished.`);
}

// Run the backup function when the script is executed
runBackup();
