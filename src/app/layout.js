import "./globals.css";

export const metadata = {
  title: "Content Intake Portal",
  description: "Content intake and approval workflow",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
