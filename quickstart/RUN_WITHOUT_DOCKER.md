# Running the Quickstart Without Docker

The Canton Network App Quickstart is **designed to run with Docker Compose**. The official setup uses LocalNet (Canton, Splice, Postgres, PQS, backend, frontend) in containers.

## Can I run without Docker?

**Partially.** Per [Digital Asset’s CN Quickstart FAQ](https://docs.digitalasset.com/build/3.4/quickstart/troubleshoot/cnqs-faq.html):

- You can use the project files in the `quickstart` directory as a **standalone project without Nix**, but you must **provide binary dependencies manually**.
- The FAQ states: *"We do not offer guidance on how to do this, but you will find the required binaries in the quickstart/compose.yaml file."*

So:

- **Frontend/backend/Daml** can be built and run on the host: `make build-frontend`, `make build-backend`, `make build-daml`, then run the backend and serve the frontend locally (e.g. Vite dev server with proxy to backend).
- **Canton, Splice, Postgres, PQS** are not officially supported in a non-Docker setup. You would need to:
  - Install and run Canton and Splice (and their config) yourself.
  - Run Postgres and configure PQS (Scribe) to use it.
  - Match the ports and auth (shared-secret or OAuth2) your backend expects.

There is no step-by-step “run Canton without Docker” guide in the docs; the supported path is **Docker-based LocalNet**.

## If Docker is the problem

If `make start` gets stuck (e.g. on **splice** or **splice-onboarding**), try:

1. **Resource and cleanup** (FAQ recommendation):
   - Give Docker **at least 8 GB** memory.
   - Run: `make stop`, `make clean-all`, `make clean-docker`.
   - Run `make setup` and consider **disabling observability**.
   - Then `make start`.

2. **Use the fixes in this repo**:
   - The quickstart DAR is mounted so splice-onboarding can upload it.
   - Curl in onboarding scripts uses timeouts so healthchecks don’t hang indefinitely.
   - Splice-onboarding healthcheck has a longer `start_period` and `timeout` so first-time onboarding can finish.

3. **Inspect why a service is stuck**:
   - If **splice** is stuck in "Waiting": `docker logs splice` to see why the Splice app isn’t exposing its readyz endpoints (e.g. Canton connection, config, or port issues). Logs often stop at "Successfully finished locked connection rebuild"; the next steps (Flyway migrations, then HTTP server bind) can be slow or block. Run `docker exec splice bash -x /app/health-check.sh` to see which readyz curl fails (connection refused = Splice hasn’t started that service yet; timeout = service stuck).
   - If **splice-onboarding** is stuck: `docker logs splice-onboarding` to see which step (e.g. DAR upload, user creation) is running or failing.
   - `make status` to see which services are (un)healthy.
   - Dependency order: postgres → canton → splice → splice-onboarding → backend-service. Splice has a 120s start period before its health check can fail; give Docker at least 8 GB memory and do a clean restart if splice never becomes healthy.

Running **without Docker** is possible in principle for app code only; running the full Canton/Splice stack without Docker is not documented or supported in the quickstart.
