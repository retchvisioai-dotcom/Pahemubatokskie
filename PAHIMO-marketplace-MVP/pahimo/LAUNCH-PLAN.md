# PAHIMO marketplace: build and launch plan

## What is included

The original `/` page remains a browser-only concept demo. `/marketplace.html` is a separate connected MVP with email accounts, Partner profiles, service requests, Partner offers, customer offer acceptance, booking status, and customer/Partner messages. A dedicated Supabase database with row-level security holds shared records. All amounts are proposed service prices only: no payment is taken. The original ride, payment, refund, admin, and payout panels remain simulated and should be labeled as demos in any public presentation.

The marketplace page is responsive on phones and includes a web app manifest and icons so it can be added to a mobile home screen after deployment. It requires internet access. No Android APK is bundled; an APK needs a separate Android build and signing process once the connected web app has passed the account and payment-flow tests.

## Setup checklist

1. Create a **dedicated PAHIMO Supabase project** under the legal owner's organization. Do not reuse a database from an unrelated business.
2. In the SQL editor, review and run `supabase/schema.sql` on the new empty project. Check every table has RLS enabled. Do not add a service-role or secret key to browser files.
   Then run `supabase/admin-test.sql`. This adds a database-enforced admin role and overview for Batok and Retch; nobody can grant themselves admin access from the website.
3. Copy the new project's URL and **publishable** key into `public/config.js`. Those two values are intended to be public; secrets and payment credentials are not. Configure the Supabase Auth Site URL and redirect URLs for the chosen host. Enable email confirmations and configure production SMTP with the business's verified sender domain before external testing.
4. Deploy the `public` directory as a static site to Vercel (framework preset Other, output directory `public`), or host it with another static provider. Railway is unnecessary for this architecture. Keep the connected MVP at `/marketplace.html` until the business approves replacing the concept home page. Use HTTPS and a business-controlled domain.
5. Test on the deployed URL with two distinct confirmed email accounts and separate browsers: customer posts a request; Partner creates profile and submits offer; customer sees offer and books; both exchange messages; customer completes. Confirm a third account cannot read the customer's offers, messages, or non-open request. Test mobile layout and sign-out/sign-in persistence.
   For the requested three-account pilot, create accounts for Batok and Retch with their own separate email addresses and passwords, and one dedicated test customer. Each admin signs up and confirms email first; the project owner then runs the two example admin grants at the end of `supabase/admin-test.sql` with the actual email addresses. One of the admins can also create a Partner profile to submit a test offer. Do not share one password, seed known passwords, or send credentials through chat. Test that the customer cannot load the Admin dashboard and that Batok and Retch can each see it.
6. Run Supabase security and performance advisors and review alerts, backups, logging, and email delivery before inviting outside users. Set up a support inbox and incident owner.

## Product boundaries and follow-on milestones

| Phase | Deliverable | Launch condition |
| --- | --- | --- |
| 1. Private pilot | Connected services MVP with manual scheduling and offline payment arrangements | Two-account test passes; policies, support contact, privacy notice, and Partner acceptance process are approved |
| 2. Managed launch | Admin console, review queue, report/block workflow, notification email, cancellation handling, audit trail, observability and backups | Permission tests, abuse controls and support procedures pass |
| 3. Online payments | Provider selection for Philippine marketplace model, verified server-side checkout/webhooks, ledger, refunds, disputes and Partner payouts | Provider approves business/account model; end-to-end reconciliation and legal review completed |
| 4. Padulong rides | Driver/vehicle screening, licensed routing and location provider, realtime dispatch, tracking, safety response, pricing rules | Operational and regulatory review completed; field test and emergency process passed |

## Known limitations of this MVP

- Service requests are visible to any signed-in Partner while open. Do not enter a home address, phone number, ID document, or sensitive information in a request. This design needs moderation and abuse limits before an open public launch.
- Messages are available only after booking. There are no push/email notifications or photo attachments. Customers should agree on an appropriate outside contact channel only after vetting.
- Customers can post and Partners can submit offers; a customer cannot submit an offer on their own request. Offer acceptance is a database transaction protected by a customer-only server function. Customers can cancel open requests and mark booked requests complete. Partner cancellations and disputes require a staffed support process.
- The original demo contains invented listings and simulated amounts. A static preview of it must not be marketed as a live ride, payment or admin service.
- The connected page loads a version-pinned Supabase browser module from esm.sh; confirm this dependency loads on the final host. For stronger availability controls, bundle the dependency locally in a follow-on release.
- The booking page includes a **test-only** e-wallet / QR button that explains the intended checkout. It does not show a real QR or charge money. For live payments, choose a Philippine-capable business payment provider, connect its hosted checkout or dynamic QR Ph payment, verify webhooks on the server, reconcile settlement and payouts, and display the exact approved merchant name. Do not substitute a personal wallet QR for an automated marketplace checkout.
- This package was syntax-checked, but the database migration and end-to-end flow have not been exercised against a dedicated project because none was identified as PAHIMO-owned.
