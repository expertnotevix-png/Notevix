import { NavLink } from 'react-router-dom';
import { Home, Search, Bookmark, User, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';

export default function BottomNav() {
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: MessageSquare, label: 'Doubt', path: '/doubt' },
    { icon: Bookmark, label: 'Saved', path: '/saved' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-lg border-t border-white/10 px-4 py-2 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-colors",
                isActive ? "text-purple-500" : "text-gray-500 hover:text-white"
              )
            }
          >
            <item.icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
