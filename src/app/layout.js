import Navbar from "../components/Navbar";
import PageTransition from "../components/PageTransition";
import "./globals.css";

export const metadata = {
  metadataBase: new URL('https://shiroi-arika.vercel.app'),
  title: "Shiroi Arika (🍀) - Manga Online Premium Miễn Phí",
  description: "Trang đọc truyện của Shiroi Arika Edit, Free và không quảng cáo, cảm ơn~",
  keywords: ["manga", "đọc truyện tranh", "manga online", "truyện tranh online", "Shiroi Arika", "manga việt hóa"],
  openGraph: {
    title: "Shiroi Arika (🍀) - Manga Online Premium",
    description: "Trang đọc truyện của Shiroi Arika Edit, Free và không quảng cáo, cảm ơn~",
    url: 'https://shiroi-arika.vercel.app',
    siteName: 'Shiroi Arika',
    images: [
      {
        url: '/og-banner-v3.png?v=3',
        width: 1200,
        height: 630,
        alt: 'Shiroi Arika Banner',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Shiroi Arika (🍀) - Manga Online Premium",
    description: "Trang đọc truyện của Shiroi Arika Edit, Free và không quảng cáo, cảm ơn~",
    images: ['/og-banner-v3.png?v=3'],
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <div className="layout-root">
          <Navbar />

          <main className="main-content">
            <PageTransition>
                {children}
            </PageTransition>
          </main>

          <footer className="footer shadow-2xl">
            <p>Chào mừng tới nhà của <span className="gradient-text font-bold">Shiroi</span> 🍀</p>
          </footer>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          /* LAYOUT STRUCTURE 🏗️ */
          .layout-root {
            min-height: 100vh;
            min-height: 100dvh;
            display: flex;
            flex-direction: column;
            background-color: #0a0c0a;
            overflow-x: hidden;
          }

          .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            width: 100%;
            position: relative;
            min-height: 80vh; 
          }

          .sticky-nav {
            position: sticky;
            top: 0;
            z-index: 10000;
            width: 100%;
            height: 70px;
            background: rgba(10, 12, 10, 0.85);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            display: flex;
            align-items: center;
          }

          .footer {
            margin-top: auto;
            flex-shrink: 0;
            padding: 3rem 0;
            text-align: center;
            font-size: 0.8rem;
            color: #b0b8b0;
            background: #0a0c0a;
            border-top: 1px solid rgba(255,255,255,0.03);
            width: 100%;
          }
        `}} />
      </body>
    </html>
  );
}
