import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, Trophy, User, LogIn, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface BottomNavProps {
  user: UserProfile | null;
}

export default function BottomNav({ user }: BottomNavProps) {
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: MessageSquare, label: 'Community', path: '/community' },
    { icon: Sparkles, label: 'Premium', path: '/premium-notes' },
    { icon: Trophy, label: 'Ranks', path: '/leaderboard' },
    { icon: user ? User : LogIn, label: user ? 'Profile' : 'Login', path: user ? '/profile' : '/login' },
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
