# AfriLynq: Stage 1 public site

Next.js 15 App Router, TypeScript, Tailwind 4. Four page types built and
verified: home, category listing, category detail, about and contact, plus a
404, sitemap, robots and the lead capture API.

`npm run build` passes. All seven category pages prerender to static HTML.
Nothing is client rendered except the lead form itself.

```
npm install
cp .env.example .env.local     # fill in the Supabase values
npm run dev
```

## Routes

| Route | Rendering | Notes |
| --- | --- | --- |
| `/` | Static, revalidated daily | Refreshes daily because the board marks the current month |
| `/categories` | Static | Index of all seven categories |
| `/categories/[slug]` | Static, prerendered | Seven pages from `generateStaticParams` |
| `/about` | Static | |
| `/contact` | Static shell, client form | Two forms, buyer and supplier |
| `/api/leads` | Dynamic | Writes to the `leads` table |
| `/sitemap.xml`, `/robots.txt` | Static | Generated from the same content module |

## The design

**The board is the idea.** The first question a sourcing buyer asks is what is
available and when, so the home page answers it above anything else. A twelve
month availability strip runs across the categories, marks the current month,
and repeats on every category and product. It is the one bold element on the
site and it earns the space because it carries real information rather than
decorating.

**The palette is the AfriLynq brand, sampled from the artwork.** Forest green
`#0C422B` from the logo mark and wordmark, deep green `#04281A` from the app
icon ground and the site footer, gold `#D08D1D` from the "Lynq" in the
wordmark and the swoosh. Gold is used sparingly, the way it behaves in the
logo: green carries the structure, gold marks the thing worth looking at. On
the harvest band gold means peak season, which is both the brand accent and
what a ripe crop actually looks like.

**Logo files are interim.** Everything in `public/brand` was rebuilt from the
brand sheet PNG because vector artwork has not been supplied. `mark.png` and
`wordmark.png` are for light grounds, `mark-reverse.png` and
`wordmark-reverse.png` for dark ones, `tile.png` is the app icon badge and
`app/icon.png` is the favicon. When the SVG originals arrive, replace these
with inline SVG and delete the PNGs.

**One typeface, two widths.** Archivo variable, set expanded for headlines and
normal for body text. The width contrast does the work a second display family
would usually do. Self hosted rather than loaded from Google, because a font
request to a third party is a third party request and this is a United Kingdom
site with a cookie notice to write.

**Figures are tabular everywhere.** Prices, tonnages and month grids have to
line up column to column or the page stops looking like a trade document.

All colours are tokens in `app/globals.css`. When AfriLynq supplies its brand
files, that block is the only thing that changes.

## The content is real

`lib/content.ts` holds seven categories, thirty products, nine origins and a
harvest window for each. The seasons, trading units and minimum order
quantities reflect how these crops actually move out of West and East Africa.
Confirm the final category and origin list with AfriLynq before launch and
correct anything that does not match.

## What is deliberately not on this site

The current afrilynq.co.uk carries claims that nothing behind it supports: an
escrow facility, a supplier count, an on time delivery percentage and a named
customer testimonial. None of them are built and none of them are true yet.
This site makes no claim that cannot be substantiated today.

That is not caution for its own sake. AfriLynq trades into the United Kingdom,
where an unsubstantiated advertising claim is a regulatory exposure as well as
a credibility one, and the first buyer who finds out that the escrow does not
exist is the buyer you needed most. The about page says plainly that the
directory is being built. It reads better than a claim, and it is defensible.

The existing claims should come off the live site before this one replaces it.

## Lead capture

`POST /api/leads` validates, filters categories against the known list, drops
honeypot submissions, applies a naive per instance rate limit, and inserts into
`leads` through the service role client. A duplicate email and type combination
returns success rather than an error, because the unique index doing its job is
not something the person needs to see.

Two things before this form is publicised:

- Replace the in memory rate limit with a real one. It resets on every cold
  start and does not span instances.
- Connect Resend and send both the internal notification and the confirmation
  to the person who submitted. The hook is marked in the route handler.

## Still to do in Stage 1

- Privacy notice, cookie notice and terms pages. Footer links to `/privacy`,
  `/cookies` and `/terms` already exist and currently resolve to the 404.
- Cookie consent banner.
- Admin area: sign in, view leads, filter by type, export CSV.
- Replace `components/Mark.tsx` with the real logo once AfriLynq supplies
  vector files.
- Confirm the registered address. The site currently shows the Liverpool
  address from the existing site; the marketing material shows a London one.
- Open Graph image.
- Submit the sitemap in Search Console after the first deploy.

## Open question that blocks nothing here but changes Stage 2

Whether visitors who are not signed in can see supplier names and prices. If
prices are hidden, the catalogue becomes a teaser and registration is the
conversion event. If they are visible, supplier pages are the acquisition
channel and every one of them has to be server rendered and indexable, exactly
as the category pages are here. Get the answer in writing before Stage 2
design starts.
