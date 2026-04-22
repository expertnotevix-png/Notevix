import { NavLink } from 'react-router-dom';
import { Home, MessageSquare, Trophy, User, LogIn, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { UserProfile } from '../types';

interface BottomNavProps {
  user: UserProfile | null;
}

export default function BottomNav({ user }: BottomNavProps) {
  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: MessageSquare, label: 'Connect', path: '/community' },
    { icon: Sparkles, label: 'Plus', path: '/premium-notes' },
    { icon: Trophy, label: 'Board', path: '/leaderboard' },
    { icon: user ? User : LogIn, label: user ? 'Profile' : 'Login', path: user ? '/profile' : '/login' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-[#0a0a0a]/90 backdrop-blur-xl border-t border-white/5 px-2 py-3 z-50">
      <div className="max-w-md mx-auto flex justify-between items-center relative">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 transition-all relative px-3 py-1",
                isActive ? "text-purple-400" : "text-gray-500 hover:text-white"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute inset-0 bg-purple-500/10 rounded-xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <item.icon className={cn("w-5 h-5 relative z-10 transition-transform", isActive && "scale-110")} />
                <span className="text-[9px] font-bold uppercase tracking-wider relative z-10">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
