import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px 96px",
          backgroundColor: "#f5f2ea",
          color: "#193b24",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            letterSpacing: 6,
            textTransform: "uppercase",
            color: "#8a7f6a",
            fontFamily: "monospace",
            marginBottom: 28,
          }}
        >
          Personal finance, kept like a ledger
        </div>
        <div style={{ display: "flex", fontSize: 108, lineHeight: 1.05 }}>
          Pocketly
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 32,
            marginTop: 36,
            maxWidth: 880,
            color: "#4a4436",
            fontFamily: "sans-serif",
          }}
        >
          Every expense, written down where you&apos;ll actually look.
        </div>
      </div>
    ),
    { ...size },
  );
}
