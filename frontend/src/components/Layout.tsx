import { ReactNode } from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import DemoModeIndicator from './DemoModeIndicator';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <DemoModeIndicator />
      <Navbar />
      <main className="flex-grow">{children}</main>
      <Footer />
    </div>
  );
}
