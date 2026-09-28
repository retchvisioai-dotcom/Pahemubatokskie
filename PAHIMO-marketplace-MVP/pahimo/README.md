# PAHIMO — All Services, One Helpful Place

A mobile-first static HTML/CSS/JavaScript prototype for a Filipino all-services marketplace. Customers can choose from the service catalog, request work with a budget or offer, compare Partner matches/counteroffers, and contact providers in the demo. Partners can list skills, rates, service areas, and availability; preview earnings and jobs; and accept or decline local demo work.

## Files
- `public/index.html` — responsive app shell, styles, home, account, payment/refund, and Padulong screens
- `public/app.js` — category data, booking flows, local demo state, Partner board, and simulated Admin actions
- `public/hero.png` — original PAHIMO hero artwork

## Run locally
Serve the `public` folder with a static server:

```sh
python3 -m http.server 8000 --bind 0.0.0.0 --directory public
```

## Interactive preview (temporary)
[Open the latest PAHIMO web-app preview](https://8000-iluwx1szkq4xazlw4ycfs-a1b908df.sg2.manus.computer/).

This sandbox preview is public to anyone with the link and may stop when the sandbox closes. It is for review only—not a permanent or production deployment. Do not enter real customer, identity, financial, or precise location information.

## Demo behavior and safeguards
Requests, Partner profiles, conversations, ride requests, payment entries, refund cases, and payout states are simulated in this browser with `localStorage`; they are not synchronized to other devices. Listings, ratings, matches, route/distance/fare estimates, driver details, and earnings are illustrative. The map is schematic and does not request device GPS. No driver is verified or notified, no emergency response or trip sharing is active, and no money is charged, settled, refunded, or transferred.

The payment preview models customer checkout methods actually supported by a future provider, settlement into one PAHIMO business account, Partner payable states, and Founder Admin-reviewed manual payout/refund decisions. It contains no real bank or wallet details and does not enable marketplace split payments. A public preview is not a secured Admin console.

## Before production
- Build a secure backend and database with authenticated customer, Partner, Founder Admin, and Batok Admin roles; enforce authorization server-side, not with browser-only UI.
- Select and obtain approval from a Philippine-capable payment provider. Confirm its real checkout methods, settlement account requirements, fees, refund/dispute process, payout options, and applicable rules. Implement verified payment webhooks, an auditable ledger, payout reconciliation, refund windows, and written customer/Partner policies.
- Add Partner onboarding and any appropriate identity, service, driver, and vehicle checks; define review, complaint, fraud, cancellation, support, and safety operations.
- For Padulong, add an approved map/routing provider, secure pickup/drop-off handling, realtime dispatch/location, driver and customer notifications, actual fare rules, and operational safety procedures. Never expose API secrets in client code.
- Add privacy/consent controls, data minimization, retention/deletion procedures, security testing, monitoring, a production domain, HTTPS, backups, and a reviewed deployment process.

## Credits
Concept by Batok · Website created by Retch.
