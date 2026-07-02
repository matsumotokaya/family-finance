# AGENTS

This file contains project-specific rules for `/Users/kaya.matsumoto/projects/family-finance`.

## GitHub Account

For this repository, use the personal GitHub account only.

- GitHub host: `github.com`
- GitHub account: `matsumotokaya`

Do not use the WealthPark account `kayamatsumoto` in this repository.

Before `git push`, PR creation, or `gh` operations:
- check `git remote -v`
- check `gh auth status`
- confirm `gh auth status` shows `matsumotokaya`

## MCP Usage

When working in this project, do not call the AWS MCP or Supabase MCP.

## Latest Refresh Workflow

When the user says `最新化してください`, `データを最新化してください`, or similar:

1. Run `npm run refresh:latest`.
2. Treat `credit-card/未確定決済情報_*` as live data for `/pending`. These files do not require a JSON regeneration step.
3. If the refresh script reports newer bank screenshots than `data/transactions.json`, inspect the newest `bank/YYYYMMDD` and `bank/YYYYMMDD-risona` folders and update `data/transactions.json`.
4. Confirm the latest confirmed card CSVs are reflected in `data/card_transactions.json`.
5. Verify the affected pages locally when practical:
   - `/YYYY-MM`
   - `/pending/YYYYMM`
   - `/cards` when confirmed card CSVs changed
