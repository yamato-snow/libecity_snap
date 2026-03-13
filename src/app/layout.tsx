import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Libecity Snap",
  description: "イベントの写真を共有しよう",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

const browserCheckScript = `
(function() {
  try {
    if (typeof WeakRef === 'undefined' || typeof Promise.allSettled === 'undefined' || typeof Intl.Segmenter === 'undefined') {
      throw 'outdated';
    }
  } catch(e) {
    document.getElementById('unsupported-browser').style.display = 'flex';
    document.getElementById('app-root').style.display = 'none';
  }
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} font-sans antialiased bg-emerald-50/30 min-h-dvh`}>
        <div
          id="unsupported-browser"
          style={{
            display: "none",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
            fontFamily: "sans-serif",
            backgroundColor: "#ecfdf5",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", color: "#333", marginBottom: "8px" }}>
            ブラウザのバージョンが古いため
            <br />
            ご利用いただけません
          </h1>
          <p style={{ fontSize: "14px", color: "#666", marginBottom: "24px", lineHeight: "1.6" }}>
            Libecity Snap を利用するには
            <br />
            Google Chrome 87以上が必要です。
          </p>
          <div
            style={{
              background: "#fff",
              borderRadius: "12px",
              padding: "20px",
              maxWidth: "320px",
              width: "100%",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
              textAlign: "left",
            }}
          >
            <p style={{ fontSize: "15px", fontWeight: "bold", color: "#333", marginBottom: "12px" }}>
              Chromeの更新方法
            </p>
            <ol style={{ fontSize: "13px", color: "#555", lineHeight: "1.8", paddingLeft: "20px", margin: 0 }}>
              <li>Google Play ストアを開く</li>
              <li>「Chrome」で検索する</li>
              <li>「更新」ボタンをタップ</li>
              <li>更新後、このページを再読み込み</li>
            </ol>
            <p style={{ fontSize: "12px", color: "#999", marginTop: "12px", lineHeight: "1.5" }}>
              ※ 更新ボタンがない場合は既に最新です。
              <br />
              端末のAndroidバージョンが古い場合、
              <br />
              別の端末をお試しください。
            </p>
          </div>
        </div>
        <div id="app-root">
          {children}
        </div>
        <script dangerouslySetInnerHTML={{ __html: browserCheckScript }} />
      </body>
    </html>
  );
}
