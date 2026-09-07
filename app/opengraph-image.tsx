import { ImageResponse } from "next/og";
import { CATEGORIES } from "@/lib/content";

/**
 * Share card, generated at build time.
 *
 * This is what appears when the site is pasted into WhatsApp, LinkedIn or
 * Slack. Without it the link renders as bare text, which for a business
 * introducing itself to buyers is a poor first impression.
 */
export const runtime = "nodejs";
export const alt = "AfriLynq: source agricultural produce from Africa";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const products = CATEGORIES.flatMap((c) => c.products).length;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#04281A",
          padding: "68px 72px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 16,
              height: 54,
              background: "#D08D1D",
              borderRadius: 3,
              display: "flex",
            }}
          />
          <div style={{ display: "flex", fontSize: 44, fontWeight: 700, color: "#fff" }}>
            Afri<span style={{ color: "#D08D1D" }}>Lynq</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 66,
              fontWeight: 700,
              color: "#fff",
              lineHeight: 1.12,
              letterSpacing: "-0.02em",
              maxWidth: 940,
              display: "flex",
            }}
          >
            Connecting Africa&apos;s producers to global markets
          </div>
          <div
            style={{
              marginTop: 26,
              fontSize: 29,
              color: "#E2DBCB",
              maxWidth: 900,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            Verified suppliers, seasonal sourcing and priced quotations you can
            compare.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 44,
            borderTop: "1px solid rgba(226,219,203,0.25)",
            paddingTop: 28,
            fontSize: 25,
            color: "#E2DBCB",
          }}
        >
          <div style={{ display: "flex" }}>
            <span style={{ color: "#D08D1D", fontWeight: 700 }}>{CATEGORIES.length}</span>
            <span style={{ marginLeft: 10 }}>categories</span>
          </div>
          <div style={{ display: "flex" }}>
            <span style={{ color: "#D08D1D", fontWeight: 700 }}>{products}</span>
            <span style={{ marginLeft: 10 }}>products</span>
          </div>
          <div style={{ marginLeft: "auto", display: "flex" }}>afrilynq.co.uk</div>
        </div>
      </div>
    ),
    size
  );
}
