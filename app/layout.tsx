import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import { WalletProvider } from "@/contexts/walletprovider";
import { ThemeProvider } from "@/components/ThemeProvider";
import Script from 'next/script'

// const lufga = localFont({
//   src: [
//     {
//       path: './fonts/LufgaRegular.woff',
//       weight: '400',
//       style: 'normal',
//     },
//     {
//       path: './fonts/LufgaMedium.woff',
//       weight: '500',
//       style: 'normal',
//     },
//     {
//       path: './fonts/LufgaBold.woff',
//       weight: '700',
//       style: 'normal',
//     },
//   ],
//   variable: '--font-lufga',
// });

export const metadata: Metadata = {
  title: "Olive Finance",
  description: "Options and Futures Trading App on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`antialiased`}
      >
        <ThemeProvider
          attribute="class"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
        >
          <WalletProvider>
            <div className="px-6 max-w-screen-2xl min-h-screen mx-auto">
              <NavBar></NavBar>
              {children}
            </div>
          </WalletProvider>
        </ThemeProvider>
        <Script src="/charting_library/charting_library.standalone.js" strategy="beforeInteractive" />
        <Script src="/datafeeds/udf/dist/bundle.js" strategy="beforeInteractive" />
      </body>
    </html>
  );
}
