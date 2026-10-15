# Compass independent research — defined-risk structures (INTERIM, 2026-10-15)

**Status: INTERIM / INCOMPLETE DATA. Nothing is promoted.** Every structure × expiration bucket fails the promotion bar.

## Criteria source (stand-in)
`COMPASS_RESEARCH_PLAN.md` was not found: not on the box, not in any agent store, not in any repo reachable through the GitHub connector (code search returned 0 hits), and branch `compass-research-2026-10-14` did not exist.
As instructed, the promotion criteria and universe come from the closest existing docs in this repo:
- `docs/compass-backtest-spec.md`: §1 step 5 (fills at bid/ask, no mid fills), §6 ruling 4 (**Utility = EV − 1.0·ES95, in dollars, costs inside EV**), ruling 7 (**N_eff ≥ 200**), §1 step 10 (walk-forward with purge/embargo), §6 "Whole-market ruling" (liquid universe = top optionable names + index ETFs).
- `docs/review-backtest-rules.md`: $0.65/contract fee, the dead-quote rule (bid = 0 or spread > 60% of mark), spreads priced as long-leg ask − short-leg bid, cash settlement at expiry.

**Promotion bar** (all must hold, per structure × DTE bucket, pooled and per liquidity class ETF/stock):
1. n ≥ 200 trades
2. mean net P&L (EV) > 0
3. EV lower bound > 0 (5th percentile of a block bootstrap resampled by entry week, 2000 draws)
4. Utility = EV − 1.0·ES95 > 0 (ES95 = mean of the worst 5% of trades)
5. Walk-forward: EV > 0 on the first 2/3 of entry dates (with a 7-week embargo before the cut) **and** EV > 0 on the final 1/3 out-of-sample. No parameters were fitted, so this is a stability check.

## Data (real only)
Theta Data, EOD option quotes (closing NBBO bid/ask) and stock EOD closes. Pulled via the `thetadata` Python library, then via the shared Theta Terminal REST at 127.0.0.1:25503. API key from env, never stored here.
- Intended universe (20): SPY QQQ IWM DIA GLD TLT XLF AAPL MSFT NVDA AMZN META GOOGL TSLA AMD AVGO NFLX JPM BAC XOM. Static list, so there is survivorship/point-in-time caveat.
- **Actually covered in this run:** SPY (192 weekly entries), QQQ (192), IWM (62 of 192). The remaining 17 names are not pulled yet: the shared terminal kept losing its session (error 478 / UNAUTHENTICATED, from another concurrent Theta client on the box). The fetcher is resumable from cache.
- Entries: first trading day of each ISO week, 2023-01-03 → 2026-09-04. Hold to expiry.

## Method
Expected move m = S·σ20·√(DTE/365), using point-in-time 20-day realized vol. Strikes = nearest listed. DTE buckets: 7d (5–10), 30d (25–35), 45d (40–50).

| structure | legs |
|---|---|
| put credit spread | −P(S−0.5m) +P(S−1.0m) |
| call credit spread | −C(S+0.5m) +C(S+1.0m) |
| bull call debit | +C(ATM) −C(S+0.5m) |
| bear put debit | +P(ATM) −P(S−0.5m) |
| iron condor | PCS + CCS |
| long call butterfly | +C(S−0.5m) −2C(ATM) +C(S+0.5m) |
| short iron butterfly | −P(ATM) −C(ATM) +P(S−m) +C(S+m) |

Fills: buy at ask, sell at bid, plus $0.65/contract/leg at entry. Settles at intrinsic on the expiry-date close, with no exit fee. Assignment/early exercise is not modelled. Trades with a >50% one-day close jump in the window (split/data break) are skipped, as are legs with dead quotes. P&L is per 1 lot, in $.

## Results: pooled (SPY/QQQ/IWM), 8204 structure-trades
| structure            | bucket   |   n |   ev_usd |   ev_lcb5_usd |   pop |   es95_usd |   utility_usd |   wf_train_ev |   wf_test_ev | failed                                                   |
|:---------------------|:---------|----:|---------:|--------------:|------:|-----------:|--------------:|--------------:|-------------:|:---------------------------------------------------------|
| bear_put_debit       | 30d      | 446 |   -104.2 |        -157.1 |   0.3 |      866.3 |        -970.5 |         -75.6 |       -116.3 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| bear_put_debit       | 45d      | 287 |   -157   |        -229.8 |   0.2 |      966.6 |       -1123.6 |        -120.5 |       -190.3 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| bear_put_debit       | 7d       | 445 |    -21.4 |         -49.9 |   0.3 |      413.1 |        -434.5 |         -10   |        -18   | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| bull_call_debit      | 30d      | 446 |     94.4 |          31.5 |   0.6 |     1001   |        -906.6 |          92.5 |         -1.6 | utility_pos,wf_test_pos                                  |
| bull_call_debit      | 45d      | 287 |    132.7 |          43.7 |   0.6 |     1175   |       -1042.3 |         126.2 |         43.5 | utility_pos                                              |
| bull_call_debit      | 7d       | 445 |     22.9 |          -7.9 |   0.5 |      503.8 |        -480.9 |          20.3 |        -12.1 | ev_lcb90_pos,utility_pos,wf_test_pos                     |
| call_credit_spread   | 30d      | 442 |    -86.9 |        -143.5 |   0.6 |     1250.6 |       -1337.6 |         -89.6 |        -50.2 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| call_credit_spread   | 45d      | 281 |   -150.4 |        -230.1 |   0.5 |     1454   |       -1604.5 |        -147   |       -106.6 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| call_credit_spread   | 7d       | 444 |    -30.4 |         -57.8 |   0.7 |      716   |        -746.4 |         -35.6 |        -22.5 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| iron_condor          | 30d      | 439 |    -34.3 |         -83.7 |   0.5 |     1062.6 |       -1096.9 |         -66.3 |         53.1 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |
| iron_condor          | 45d      | 280 |    -75   |        -149.5 |   0.4 |     1179.6 |       -1254.6 |        -101.8 |         25.1 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |
| iron_condor          | 7d       | 442 |    -20.7 |         -46.4 |   0.5 |      616.8 |        -637.5 |         -37.7 |          2.9 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |
| long_call_butterfly  | 30d      | 446 |    -56.9 |         -96.8 |   0.3 |      982.4 |       -1039.3 |         -62.1 |          6.3 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |
| long_call_butterfly  | 45d      | 287 |    -65.7 |        -119.1 |   0.3 |      956.3 |       -1022   |         -63   |        -15.8 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| long_call_butterfly  | 7d       | 445 |    -42.6 |         -60.4 |   0.3 |      456.3 |        -499   |         -38.8 |        -34.9 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos,wf_test_pos |
| put_credit_spread    | 30d      | 441 |     51.9 |          16.6 |   0.8 |     1048.4 |        -996.5 |          22.6 |        106   | utility_pos                                              |
| put_credit_spread    | 45d      | 283 |     78.9 |          24.7 |   0.8 |     1241.9 |       -1163   |          45.2 |        139.2 | utility_pos                                              |
| put_credit_spread    | 7d       | 443 |     10.1 |         -10.1 |   0.8 |      564   |        -553.9 |          -2.9 |         28.4 | ev_lcb90_pos,utility_pos,wf_train_pos                    |
| short_iron_butterfly | 30d      | 446 |    -47.6 |        -127.4 |   0.4 |     1603.7 |       -1651.3 |        -100.7 |        138.7 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |
| short_iron_butterfly | 45d      | 286 |    -77.4 |        -194.9 |   0.4 |     1572   |       -1649.4 |        -128.8 |        122.1 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |
| short_iron_butterfly | 7d       | 443 |    -38   |         -77.7 |   0.4 |      911.2 |        -949.2 |         -60.7 |         10.4 | ev_pos,ev_lcb90_pos,utility_pos,wf_train_pos             |

Full tables (incl. ETF/stock splits): `results/evaluation.csv`. Skip counts: `results/run_meta.json`.

## Failures (explicit)
- **All 21 structure×bucket cells fail.** Criterion 4 (Utility = EV − 1·ES95 > 0) fails everywhere. For defined-risk structures ES95 ≈ the max loss, so this bar requires EV larger than the full tail loss. The closest candidates are below.
- **Put credit spread 30d/45d:** EV +$52 / +$79 per lot, bootstrap lower bound > 0, both walk-forward halves positive. Fails only on Utility (−$997 / −$1,163). Nearest miss.
- **Bull call debit 45d:** EV +$133, lower bound +$44, both halves positive. Fails Utility. 30d: out-of-sample EV ≈ −$2.
- Bearish structures (bear put debit, call credit spread) are negative EV in every bucket, consistent with the 2023–26 uptrend in these ETFs. That is a regime dependence, not an edge.
- Iron condors, short iron butterflies and long butterflies are negative EV after bid/ask + fees in every bucket.
- Data coverage itself is a failure: 3 of the 20 universe names. Results are not representative of the liquid universe until the backfill completes.

## Reproduce
`python fetch.py 2` (needs the shared terminal on :25503; resumes from cache), then `python backtest.py`.
