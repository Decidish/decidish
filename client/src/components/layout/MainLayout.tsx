import { ReactNode } from 'react';
import Navigation from '@/components/feature/Navigation';

interface MainLayoutProps {
  children: ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50">
      <Navigation />
      <main>{children}</main>
    </div>
  );
}
