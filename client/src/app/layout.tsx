import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NexusGrid - Real-time Collaborative Board",
  description: "A real-time strategy board where every tile is a distributed object with optimistic locking, live synchronization, presence indicators, area control, and beautiful animations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
