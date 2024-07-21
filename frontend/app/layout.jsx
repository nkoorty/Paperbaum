import './globals.css';
import NavBar from './components/NavBar';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <title>ZKnowledge</title>
      </head>
      <body>
        <NavBar />
        <main className="bg-black text-white">
          {children}
        </main>
      </body>
    </html>
  );
}