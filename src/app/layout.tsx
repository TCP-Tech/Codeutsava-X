import type { Metadata } from "next";
import "./globals.css";
import { SoundButton } from "@/components/ui/sound-button";
import { CursorGlitch } from "@/components/layout/CursorGlitch";
import { ExperienceShell } from "@/components/intro/ExperienceShell";

export const metadata: Metadata = {
  title: {
    default: "Codeutsava X.0",
    template: "%s | Codeutsava X.0",
  },
  description:
    "Enter the Glitchverse at Codeutsava X.0 — a celebration of code, creativity, and ideas that break the expected.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{if(window.location.hash==="#top"){document.documentElement.dataset.heroReturn="true"}}catch(e){}',
          }}
        />
      </head>
      <body suppressHydrationWarning>
        <div className="relative z-10">
          <ExperienceShell>
            {children}
          </ExperienceShell>
        </div>
        <SoundButton />
        <CursorGlitch />
      </body>
    </html>
  );
}
