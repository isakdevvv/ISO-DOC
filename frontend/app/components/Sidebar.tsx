import React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';

export default function Sidebar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const menuItems = [
        { name: 'Dashboard', href: '/app/dashboard', icon: '📊', match: () => pathname === '/app/dashboard' && (!searchParams.get('tab') || searchParams.get('tab') === 'documents') },
        { name: 'Projects', href: '/app/projects', icon: '🗂️', match: () => pathname.startsWith('/app/projects') },
        { name: 'Documents', href: '/app/documents', icon: '📁', match: () => pathname.startsWith('/app/documents') },
        { name: 'Compliance Audit', href: '/app/dashboard?tab=compliance', icon: '⚡️', match: () => pathname === '/app/dashboard' && searchParams.get('tab') === 'compliance' },
        { name: 'Gap Analysis', href: '/app/dashboard?tab=gap-analysis', icon: '🔍', match: () => pathname === '/app/dashboard' && searchParams.get('tab') === 'gap-analysis' },
        { name: 'Templates', href: '/app/dashboard?tab=templates', icon: '📝', match: () => pathname === '/app/dashboard' && searchParams.get('tab') === 'templates' },
        { name: 'Reports', href: '/app/reports', icon: '📋' },
        { name: 'Settings', href: '/app/settings', icon: '⚙️' },
    ];

    return (
        <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
            <div className="p-6 border-b border-gray-100">
                <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
                    <span>🛡️</span> ISO Doc
                </h1>
            </div>

            <nav className="flex-1 p-4 space-y-1">
                {menuItems.map((item) => {
                    const isActive = item.match ? item.match() : pathname.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${isActive
                                ? 'bg-blue-50 text-blue-700 font-medium'
                                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                }`}
                        >
                            <span className="text-xl">{item.icon}</span>
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-blue-800 mb-1">Pro Plan</h4>
                    <p className="text-xs text-blue-600 mb-3">Get access to advanced AI features.</p>
                    <button className="w-full bg-blue-600 text-white text-xs font-medium py-2 rounded hover:bg-blue-700 transition">
                        Upgrade Now
                    </button>
                </div>
            </div>
        </aside>
    );
}
