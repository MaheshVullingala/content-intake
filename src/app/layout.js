import "./globals.css";

export const metadata = {
  title: "AEM Content Intake",
  description: "Content intake and approval workflow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
