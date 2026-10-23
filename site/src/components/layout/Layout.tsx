import React from 'react';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="flex min-h-screen bg-background relative overflow-x-hidden">
      {/* Delicate floating pastel background blobs */}
      <div className="fixed -top-40 -right-40 w-96 h-96 rounded-full bg-soft-green/30 blur-3xl pointer-events-none animate-float-slow -z-10" />
      <div className="fixed top-1/2 -left-40 w-96 h-96 rounded-full bg-soft-blue/25 blur-3xl pointer-events-none animate-float-slow -z-10" style={{ animationDelay: '-5s' }} />
      <div className="fixed -bottom-40 right-1/4 w-96 h-96 rounded-full bg-soft-pink/25 blur-3xl pointer-events-none animate-float-slow -z-10" style={{ animationDelay: '-2.5s' }} />

      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
