# UmbraPrecision Architecture

## Core User Journey
1. Connect wallet and sign a login message.
2. Create an authenticated session token.
3. Submit register/deposit/withdraw operation with idempotency key.
4. Receive operation state and render timeline.
5. Background retry worker reconciles queued operations.

## SLOs and Guardrails
- API availability target: 99.9% on production.
- P95 operation request latency: < 700ms excluding chain finality.
- Callback confirmation reconciliation target: < 60 seconds in normal operation.
- Guardrails: allowed mint list, min/max amount policy, per-user rate limit, idempotency required.

## Threat Model Notes
- Replay prevention: every operation requires unique `x-idempotency-key`.
- Session spoofing prevention: wallet signature verification against signed message.
- Abuse control: token bucket per public key.
- Data safety: no private keys stored; only public keys, operation metadata, and signatures.
