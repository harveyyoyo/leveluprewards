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

Set the destination bucket name in your session and run the script:

```powershell
$env:GCS_BACKUP_BUCKET="YOUR_BUCKET_NAME"
.\scripts\backup-local-folder-to-gcs.ps1
```

Optional overrides:

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

Create a task that runs (for example) every 6 hours:

- **Program/script**: `powershell.exe`
- **Arguments**:

```powershell
-NoProfile -ExecutionPolicy Bypass -Command "$env:GCS_BACKUP_BUCKET='YOUR_BUCKET_NAME'; cd 'C:\Users\Administrator\school arcade reward antigravity\studio'; .\scripts\backup-local-folder-to-gcs.ps1"
```

If you want the task to run even when you're not logged in, make sure the account that runs it has already authenticated `gcloud`, or use a GCP service account and `gcloud auth activate-service-account` (recommended for servers).

