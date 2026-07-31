# Price outlook plan

## What is live now

Each board publishes seven explicit historical-price forecasts: **1 hour, 6 hours, 12 hours, 24 hours, 1 week, 1 month, and 1 year**. Every horizon displays a model center alongside a volatility interval and a visible coverage label.

The forecasts use USD log returns only:

- Intraday through weekly forecasts use the latest 7 days of price history.
- Monthly forecasts use up to 180 days of history.
- Yearly forecasts use up to one year of history and are withheld until 180 days are available.
- The center takes 25% of observed log-return drift, then caps it at 60% of that horizon’s volatility interval.
- The interval is 1.28 times realized daily volatility, scaled by the square root of the horizon. A 0.3% daily floor prevents a flat sample from producing a zero-width range.

The intervals become wider as the requested time frame increases. They are statistical model outputs, not certainties. Current chain readings are deliberately not model inputs until they have source-stamped, time-aligned history and out-of-sample validation.

## Chain-specific measurement map

| Chain | Current source | Proper readings | Do not mislabel |
| --- | --- | --- | --- |
| Bitcoin | mempool.space | tip, mempool queue, fee targets, hashrate, difficulty, Lightning public graph | public Lightning graph as all Lightning activity |
| Ethereum | execution RPC plus Beacon API | execution gas / burn, canonical Beacon slots, validator stake | execution block height as a consensus slot or epoch |
| Solana | Solana RPC | slots, epoch position, activated vote stake, inflation, prioritization-fee price per compute unit | priority-fee price as total transaction cost or a time-to-confirm guarantee |
| Hyperliquid | HyperEVM RPC and HyperCore info API | HyperEVM gas, top-market funding, open interest, 24-hour notional | HyperEVM as HyperCore, a 32-block window as an epoch, or an unavailable supply estimate as a fact |

## Before adding model-weighted chain inputs

1. Persist source-stamped hourly observations for price, volume, and every chain-specific reading. Record `observed_at`, source timestamp, source version, and nulls; do not backfill with guessed values.
2. Define targets before training: 24-hour and 7-day log returns, directional accuracy, interval coverage, and calibration. Never score a target with data that was not available at prediction time.
3. Establish baselines: zero-drift volatility band, trailing-return model, and a market-only benchmark. A chain reading is eligible only if it improves a locked out-of-sample period against those baselines after fees and slippage assumptions are stated.
4. Validate separately by asset and regime. Bitcoin, Ethereum, Solana, and HYPE must not share a presumed coefficient merely because a value has a similar name.
5. Release only calibrated ranges, with the as-of time, horizon, features used, missing-input state, model version, and a link to its validation report. Suppress a forecast if coverage or source freshness fails its gate.

## Candidate feature sets to test, not assumptions to ship

- Bitcoin: mempool pressure, fee-target spread, hashrate / difficulty changes, and public Lightning graph changes.
- Ethereum: base fee, gas-used ratio, execution burn, consensus-slot availability, and validator stake.
- Solana: priority-fee-price distribution, nonzero-fee slot share, epoch position, active stake, and inflation.
- Hyperliquid: median funding among liquid perps, aggregate open interest, 24-hour notional, and HyperEVM gas use.

These signals need their own histories and controls for price momentum, volume, and common crypto-market moves before they can influence a forecast.
