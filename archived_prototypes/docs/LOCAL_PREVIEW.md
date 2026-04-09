# Local Preview

Use `start_preview.sh` when you want MAIT running unattended during lessons.

## One-time setup

1. Create the backend env file from `backend/.env.example` and set `GEMINI_API_KEY`.
2. Install backend dependencies into `backend/venv`.
3. Run `npm ci` inside `frontend`.

## Start once

```bash
cd mait-mvp
./start_preview.sh
```

The launcher:

- forces `VITE_API_URL` to `http://127.0.0.1:8000` unless you override it
- checks backend/frontend prerequisites before starting
- writes logs to `mait-mvp/logs`
- waits for `http://127.0.0.1:8000/health`
- waits for `http://127.0.0.1:5173`

## Keep it running between lessons

```bash
cd mait-mvp
./install_launchd.sh
```

That installs a user LaunchAgent named `com.myaitutor.mait-preview` with `KeepAlive=true`.

To remove it later:

```bash
cd mait-mvp
./uninstall_launchd.sh
```
