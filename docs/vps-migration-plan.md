# PackShare: AWS to VPS Migration Plan

## 1. Current AWS Architecture (staging, us-east-1)

- **CloudFront** → `staging.packshare.cloud` (S3 for static files, API Gateway for `/api/*` and `/auth/*`)
- **S3** — React frontend static files + tournament image uploads
- **API Gateway** HTTP API v2 → Lambda
- **Backend Lambda** — Go Fiber, 256MB, 30s timeout, in VPC
- **Auth Lambda** — Python FastAPI, 256MB, 30s timeout, in VPC
- **RDS Postgres** — db.t3.micro, 20GB, single-AZ
- **Secrets Manager** — db-credentials, jwt-secret, osu-oauth
- **Route53** + ACM certificate

## 2. Current AWS Costs

| Service | Monthly Cost |
|---------|-------------|
| RDS db.t3.micro | ~$15-18 |
| Lambda (backend + auth) | ~$0-1 |
| API Gateway | ~$0-1 |
| CloudFront | ~$0-1 |
| S3 | ~$0.50 |
| Secrets Manager (3 secrets) | ~$1.20 |
| Route53 | ~$0.50 |
| **Total** | **~$18-23/month** |

With production NAT Gateway, this jumps to $50+/month.

## 3. VPS Provider Recommendation

| Provider | Plan | Specs | Cost |
|----------|------|-------|------|
| **Hetzner CX22** | Recommended | 2 vCPU, 4GB RAM, 40GB SSD, 20TB traffic | **~$4.30/month** |
| Hetzner CX32 | If more headroom | 4 vCPU, 8GB RAM, 80GB SSD, 20TB traffic | ~$8.10/month |
| DigitalOcean | Alternative | 2 vCPU, 4GB RAM, 80GB SSD, 4TB traffic | $18/month |

**Hetzner CX22 (US-Ashburn)** saves ~75-80% vs AWS.

## 4. Target VPS Architecture

```
                    Internet
                       |
              [Caddy Reverse Proxy]
              (auto HTTPS via Let's Encrypt)
                /       |        \
               /        |         \
         /api/*    /auth/*     /* (static)
            |         |           |
      [Go Fiber]  [Python     [Caddy file
       :8080]    FastAPI       server]
                  :8001]      /srv/frontend/
            \       /
             \     /
          [PostgreSQL]
            :5432
```

All services run via **Docker Compose** on a single VPS:

1. **Caddy** — reverse proxy, static files, auto TLS, SPA fallback
2. **Go Backend** — `backend/cmd/server/main.go` (already exists)
3. **Python Auth** — `auth/main.py` via uvicorn (already exists)
4. **PostgreSQL 16** — data on Docker volume

### Caddyfile

```
staging.packshare.cloud {
    handle /api/* {
        reverse_proxy backend:8080
    }
    handle /auth/* {
        reverse_proxy auth:8001
    }
    handle /uploads/* {
        root * /srv
        file_server
    }
    handle {
        root * /srv/frontend
        try_files {path} /index.html
        file_server
    }
    encode gzip
}
```

### Uploads (replacing S3)

Replace S3 presigned URLs with local file storage:
- Backend receives multipart upload, saves to `/uploads/tournaments/`
- Caddy serves `/uploads/*` as static files
- Only ~30-40 lines of code change in `uploads.go`

## 5. What Stays the Same

- All application code (Go, Python, React) — virtually unchanged
- Database schema and data (Postgres + GORM AutoMigrate)
- Frontend relative URLs (`/api/*`, `/auth/*`)
- OAuth flow (just update callback URL at osu.ppy.sh)
- JWT auth mechanism
- GitHub Actions CI/CD (different deploy target)

## 6. What Changes

| Component | AWS | VPS |
|-----------|-----|-----|
| Reverse proxy | CloudFront + API Gateway | Caddy |
| Static files | S3 + CloudFront | Caddy file_server |
| Backend | Lambda (cold starts) | Long-running Go process |
| Auth | Lambda (cold starts) | Long-running uvicorn |
| Database | RDS (managed) | Docker Postgres (self-managed) |
| Uploads | S3 presigned URLs | Local filesystem + Caddy |
| TLS | ACM | Let's Encrypt via Caddy |
| Secrets | Secrets Manager | `.env` file on VPS |
| DNS | Route53 | Cloudflare (free) or Hetzner DNS |
| Deploy | Lambda update + S3 sync | SSH + Docker Compose |
| SPA routing | CloudFront Function | Caddy `try_files` |

## 7. Code Changes Required

1. **`backend/internal/handlers/uploads.go`** — Replace S3 presigned URL logic with local file storage (multipart upload → save to disk)
2. **`backend/internal/routes/routes.go`** — Remove `s3Client != nil` conditional for uploads
3. **`.github/workflows/deploy.yml`** — Rewrite for VPS deployment (build → SSH → docker compose)
4. **`auth/requirements.txt`** — Remove `mangum` (Lambda adapter, optional cleanup)
5. **No frontend changes needed** — relative URLs work identically behind Caddy

## 8. CI/CD on VPS

**Recommended approach: Docker registry (GitHub Container Registry)**

```yaml
name: Deploy PackShare
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build & push Docker images
        run: |
          echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -t ghcr.io/kitasenbei/packshare-backend backend/
          docker build -t ghcr.io/kitasenbei/packshare-auth auth/
          docker build -t ghcr.io/kitasenbei/packshare-frontend frontend/
          docker push ghcr.io/kitasenbei/packshare-backend
          docker push ghcr.io/kitasenbei/packshare-auth
          docker push ghcr.io/kitasenbei/packshare-frontend

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/packshare
            docker compose pull
            docker compose up -d
```

## 9. Migration Steps

### Phase 0: Prep
1. Export RDS database via `pg_dump`
2. Copy secrets from AWS Secrets Manager to a local `.env`
3. Add new OAuth callback URL at osu.ppy.sh (keep old one during transition)

### Phase 1: Build (Day 1-2)
4. Provision Hetzner VPS (CX22, US-Ashburn, Ubuntu 24.04)
5. Server setup: SSH keys, UFW (22/80/443), Docker, deploy user
6. Write Dockerfiles, docker-compose.yml, Caddyfile
7. Implement local file upload handler (replace S3)
8. Import database into VPS Postgres

### Phase 2: Switch (Day 3-4)
9. Deploy full stack on VPS, test on IP address
10. Lower DNS TTL to 60s
11. Switch DNS A record to VPS IP
12. Caddy auto-provisions TLS certificate
13. Update GitHub Actions for VPS deployment

### Phase 3: Verify (Day 5-20)
14. End-to-end testing
15. Monitor for 2 weeks (keep AWS as fallback)
16. `terraform destroy` AWS staging after confirmed stable

## 10. Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| Data loss during migration | Multiple pg_dump snapshots, verify row counts, keep RDS running 2 weeks |
| DNS propagation downtime | Lower TTL to 60s beforehand, keep CloudFront active during propagation |
| Self-managed Postgres | Cron job for daily `pg_dump` backups, Hetzner snapshots (~$1/mo) |
| Single point of failure | Full stack rebuildable from Docker Compose + DB backup in <30 min |
| Upload feature code change | Small scope (~30 lines), can launch without uploads initially |
| OAuth callback URL change | osu! allows multiple redirect URIs, add new before switching |

**Rollback:** Switch DNS back to CloudFront (minutes if TTL was lowered). AWS stays intact until you explicitly destroy it.

## 11. Cost Comparison

| | AWS | Hetzner VPS |
|--|-----|-------------|
| Monthly | ~$18-23 | ~$4.30 |
| Annual | ~$216-276 | ~$52 |
| **Savings** | — | **~$165-225/year (75-80%)** |

Production AWS (with NAT Gateway, multi-AZ) would be $70-100+/month vs $4-8/month on VPS.
