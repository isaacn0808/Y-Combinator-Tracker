"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail } from 'lucide-react';

const Header: React.FC = () => {
  const pathname = usePathname();
  
  return (
    <header className="bg-white border-b border-gray-200">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900">
          Y Combinator Tracker
        </Link>
        
        <nav className="flex items-center">
          <Link 
            href="/emails" 
            className={`flex items-center text-sm font-medium ${
              pathname === '/emails' 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Mail size={16} className="mr-1" />
            Emails
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Header;
