import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "next-themes";
import { cn } from "@/lib/utils";
import ReactQueryProvider from '@/components/ReactQueryProvider';
import { FilterProvider } from '@/context/FilterContext';
import Header from '@/components/Header';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Y Combinator Tracker",
  description: "Track and analyze Y Combinator companies",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          geistSans.variable,
          geistMono.variable
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false} // Or remove this line entirely
          disableTransitionOnChange
        >
          <ReactQueryProvider>
            <FilterProvider>
              <div className="relative flex min-h-screen flex-col">
                <Header />
                <main className="flex-1 container mx-auto px-4 py-8 md:px-6 lg:px-8">
                  {children}
                </main>
                {/* We can add a Footer component here later */}
              </div>
            </FilterProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
