import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import "../styles.css";
export const metadata: Metadata = {
  title: "Daya Variety Store · Choose your language",
  description:
    "Explore the Daya Variety Store collection in English, Hindi or Gujarati.",
  robots: { index: false, follow: false },
};
export default function EntryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SiteFrame locale="en">{children}</SiteFrame>
      </body>
    </html>
  );
}
