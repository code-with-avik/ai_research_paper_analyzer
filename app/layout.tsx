import "./globals.css";

export const metadata = {
  title: "AI Research Paper Analyzer | Paperwise",
  description: "Turn dense research papers into clear summaries, insights, and answers grounded in the source.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
