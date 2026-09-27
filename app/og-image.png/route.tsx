import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#09090b",
          backgroundImage:
            "linear-gradient(to bottom right, #18181b 0%, #09090b 100%)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="64"
              height="64"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect
                x="11"
                y="28"
                width="6"
                height="4"
                fill="rgba(125,211,252,0.95)"
                rx="1"
              />
              <rect
                x="20"
                y="24"
                width="6"
                height="8"
                fill="rgba(96,165,250,0.95)"
                rx="1"
              />
              <rect
                x="29"
                y="20"
                width="6"
                height="12"
                fill="rgba(165,243,252,0.95)"
                rx="1"
              />
              <path
                d="M11 30L16 23L23 25L30 20L37 16"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="37" cy="16" r="3.5" fill="white" />
            </svg>
          </div>
          <div
            style={{
              fontSize: "72px",
              fontWeight: "bold",
              color: "white",
              letterSpacing: "-0.02em",
            }}
          >
            SnapCharts
          </div>
        </div>
        <div
          style={{
            fontSize: "32px",
            color: "#a1a1aa",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.4,
          }}
        >
          Track market pulse with live-delayed charts and news
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "40px",
          }}
        >
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#27272a",
              borderRadius: "999px",
              border: "1px solid #3f3f46",
              color: "#d4d4d8",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            Stocks
          </div>
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#27272a",
              borderRadius: "999px",
              border: "1px solid #3f3f46",
              color: "#d4d4d8",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            Crypto
          </div>
          <div
            style={{
              padding: "12px 24px",
              backgroundColor: "#27272a",
              borderRadius: "999px",
              border: "1px solid #3f3f46",
              color: "#d4d4d8",
              fontSize: "20px",
              fontWeight: "600",
            }}
          >
            Futures
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
