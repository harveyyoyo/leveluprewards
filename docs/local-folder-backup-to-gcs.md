# Local folder backup to Google Cloud Storage (Windows)

This project includes a script that can **zip your local repo folder** and upload it to a **Google Cloud Storage (GCS)** bucket.

This is separate from the app's **Firestore→Cloud Storage** backups (which protect production data).

## One-time setup

### Install Google Cloud SDK

- Install: [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
- After install, restart your terminal so `gcloud` and `gsutil` are on `PATH`.

### Authenticate

Run:

```powershell
gcloud auth login
gcloud auth application-default login
```

Note: Login requires an interactive terminal/browser flow.

### Create (or choose) a GCS bucket

Pick a bucket name and region. Example:

```powershell
gcloud storage buckets create gs://YOUR_BUCKET_NAME --location=us-central1
```

## Run the backup script

After one-time setup:

```powershell
.\scripts\setup-gcs-backup.ps1
```

That script authenticates `gcloud` (using `FIREBASE_SERVICE_ACCOUNT_KEY` from `.env.local` when needed), creates the backup bucket, writes `.gcs-backup.env`, schedules a daily backup, and runs the first upload.

Manual backup any time:

```powershell
.\scripts\backup-local-folder-to-gcs.ps1
```

Or:

```powershell
npm run backup:local-folder
```

The `.cmd` launcher (`scripts/run-gcs-backup.cmd`) is used by Task Scheduler to avoid PowerShell quoting issues on Windows.

Optional overrides (session or `.gcs-backup.env`):

- `GCS_BACKUP_PREFIX`: defaults to `local-folder-backups/studio`
- `GCS_BACKUP_RETENTION_DAYS`: defaults to `30`

## What gets uploaded

The script prefers `git archive` (if available), meaning it backs up **tracked files at `HEAD`** (best for avoiding secrets + build output).

If `git archive` can't run, it falls back to zipping the working folder while excluding common large/ephemeral directories (`node_modules`, `.next`, etc).

Backups are written locally to:

- `.local-backups/` (gitignored)

And uploaded to:

- `gs://$GCS_BACKUP_BUCKET/$GCS_BACKUP_PREFIX/studio-YYYYMMDD-HHMMSS.zip`

## Scheduling (Windows Task Scheduler)

Create a task that runs (for example) daily at 3 AM — `setup-gcs-backup.ps1` registers this automatically:

- **Program/script**: `powershell.exe`
- **Arguments**:

```powershell
"C:\Users\Administrator\school arcade reward antigravity\studio\scripts\run-gcs-backup.cmd"
```

The backup script reads bucket settings from `.gcs-backup.env` (created during setup). If automatic scheduling fails, run the `schtasks /Create` command printed by `setup-gcs-backup.ps1`.

