# TODO-MAIT

## Security
Low urgency: the database holds no real data yet. Do these before real teachers or students use the site.

- [ ] Rotate the site-wide access code. Until commit `d770f00`, the backend printed the real code to the server logs on every login attempt, so treat the current value as exposed. Set a new `MAIT_ACCESS_CODE` on the backend host.
- [ ] Remove the hardcoded fallback access code in `mait-mvp/backend/app/routers/auth.py` (the default passed to `os.getenv("MAIT_ACCESS_CODE", ...)`). It is readable in this public repo and becomes the live code whenever the variable is unset. First confirm `MAIT_ACCESS_CODE` is set on the host, then make a missing variable reject every code rather than fall back.
