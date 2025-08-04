'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { logout } from '../lib/logout';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem('token'));
  }, []);

  const handleDashboardClick = () => {
    if (isLoggedIn) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  };

  const navLink = (href: string, label: string) => (
    <Link
      href={href}
      className={`px-4 py-2 rounded-md text-sm font-medium transition ${
        pathname === href
          ? 'bg-white text-blue-700'
          : 'text-white hover:bg-blue-500'
      }`}
    >
      {label}
    </Link>
  );

  return (
    <nav className="bg-blue-600 shadow p-4 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold text-white hover:text-gray-100">
          CpTrack
        </Link>

        <div className="flex gap-3 items-center">
          {navLink('/upcoming-contests', 'Upcoming Contests')}

          <button
            onClick={handleDashboardClick}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              pathname === '/dashboard'
                ? 'bg-white text-blue-700'
                : 'text-white hover:bg-blue-500'
            }`}
          >
            Dashboard
          </button>

          {!isLoggedIn ? (
            <>
              {navLink('/login', 'Login')}
              {navLink('/register', 'Register')}
            </>
          ) : (
            <button
              onClick={() => {
                logout();
                setIsLoggedIn(false);
                router.push('/');
              }}
              className="px-4 py-2 rounded-md bg-white text-blue-700 text-sm font-medium hover:bg-gray-100 transition"
            >
              Logout
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
