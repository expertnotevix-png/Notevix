import { useState, useEffect, useMemo } from 'react';
import { dataBridge } from '../services/dataBridge';
import { UserProfile, VerifiedPayment } from '../types';
import { 
  Plus, Trash2, Edit2, Save, X, 
  Bell, Send, CheckCircle2, Clock, 
  Shield, RefreshCw, CreditCard, Check, XCircle, Users, 
  LayoutDashboard, BarChart3, Settings, Search, TrendingUp, DollarSign, UserCheck,
  BookOpen, Zap, AlertCircle, FileText, Smartphone, Instagram
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { 
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { supabase } from '../lib/supabase';

export default function Admin() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'banners' | 'resources' | 'verified_payments' | 'pdf_requests' | 'users' | 'notifications' | 'settings'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [pdfRequests, setPdfRequests] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [subjectResources, setSubjectResources] = useState<any[]>([]);
  const [verifiedPayments, setVerifiedPayments] = useState<VerifiedPayment[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [editingResource, setEditingResource] = useState<any | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'info' as const });

  const navigate = useNavigate();

  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    salesCount: 0,
    totalUsers: 0,
    premiumUsers: 0,
    newUsersToday: 0,
    activeToday: 0,
    pdfRequestsCount: 0,
    pendingPdfRequests: 0,
  });

  useEffect(() => {
    fetchTabSpecificData();
  }, [activeTab]);

  const fetchTabSpecificData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'analytics': await fetchAnalytics(); break;
        case 'resources': await fetchSubjectResources(); break;
        case 'banners': await fetchBanners(); break;
        case 'verified_payments': await fetchVerifiedPayments(); break;
        case 'pdf_requests': await fetchPdfRequests(); break;
        case 'users': await fetchUsers(); break;
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    const stats = await dataBridge.getAdminStats();
    // Simplified analytics
    setAnalyticsData(prev => ({
      ...prev,
      ...stats,
      totalRevenue: 0, // Mock for now or calculated from approved payments
    }));
  };

  const fetchSubjectResources = async () => {
    const data = await dataBridge.getResources();
    setSubjectResources(data);
  };

  const fetchBanners = async () => {
    const data = await dataBridge.getBanners();
    setBanners(data);
  };

  const fetchVerifiedPayments = async () => {
    const data = await dataBridge.getVerifiedPayments();
    setVerifiedPayments(data);
  };

  const fetchPdfRequests = async () => {
    const data = await dataBridge.getPdfRequests(showOnlyPending ? 'pending' : 'all');
    setPdfRequests(data);
  };

  const fetchUsers = async () => {
    const users = await dataBridge.getProfiles(200);
    setAllUsers(users);
  };

  const handleApprovePurchase = async (id: string) => {
    const password = prompt("Enter unlock password for this resource:");
    if (!password) return;
    const res = await dataBridge.approvePurchase(id, password);
    if (res.success) {
      toast.success("Payment approved!");
      fetchVerifiedPayments();
    } else {
      toast.error(res.error || "Failed to approve");
    }
  };

  const handleRejectPurchase = async (id: string) => {
    const reason = prompt("Enter rejection reason:");
    if (reason === null) return;
    const res = await dataBridge.rejectPurchase(id, reason);
    if (res.success) {
      toast.success("Payment rejected");
      fetchVerifiedPayments();
    } else {
      toast.error(res.error || "Failed to reject");
    }
  };

  const handleApprovePdf = async (id: string) => {
    const res = await dataBridge.approvePdfRequest(id);
    if (res.success) {
      toast.success("PDF request approved!");
      fetchPdfRequests();
    }
  };

  const handleRejectPdf = async (id: string) => {
    const res = await dataBridge.rejectPdfRequest(id);
    if (res.success) {
      toast.success("PDF request rejected");
      fetchPdfRequests();
    }
  };

  const menuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'banners', label: 'Promotions', icon: LayoutDashboard },
    { id: 'resources', label: 'PDF Library', icon: BookOpen },
    { id: 'verified_payments', label: 'Payments', icon: CreditCard },
    { id: 'pdf_requests', label: 'PDF Requests', icon: FileText },
    { id: 'users', label: 'Students', icon: Users },
    { id: 'notifications', label: 'Broadcast', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const filteredPayments = useMemo(() => {
    return verifiedPayments.filter(p => {
      const matchesSearch = p.transactionId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.phoneNumber.includes(searchQuery);
      if (showOnlyPending) return p.status === 'pending' && matchesSearch;
      return matchesSearch;
    });
  }, [verifiedPayments, searchQuery, showOnlyPending]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black tracking-tighter text-lg leading-none">ADMIN</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Control Center</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all ${
                  activeTab === item.id 
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' 
                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon size={18} />
                <span className="text-[13px] font-bold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-6">
            <button 
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-gray-500 hover:text-white hover:bg-white/5 transition-all text-sm font-bold"
            >
              <Zap size={16} /> Exit Admin
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-[#0a0a0a]/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-black uppercase tracking-tight">{activeTab.replace('_', ' ')}</h2>
            <button 
              onClick={() => fetchTabSpecificData()}
              className="p-2 hover:bg-white/5 rounded-xl transition-all"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin text-indigo-400' : 'text-gray-500'} />
            </button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <p className="text-xs font-black tracking-tight">Raj Expert</p>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Master Admin</p>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Users', value: analyticsData.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Premium Users', value: analyticsData.premiumUsers, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'New Today', value: analyticsData.newUsersToday, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                  { label: 'PDF Requests', value: analyticsData.pdfRequestsCount, icon: FileText, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] flex flex-col gap-4">
                    <div className={`${stat.bg} w-12 h-12 rounded-2xl flex items-center justify-center`}>
                      <stat.icon size={24} className={stat.color} />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 font-black uppercase tracking-widest">{stat.label}</p>
                      <p className="text-3xl font-black mt-1">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'verified_payments' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="Search Transaction ID or Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-indigo-500 outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5">
                  <button 
                    onClick={() => setShowOnlyPending(true)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyPending ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
                  >
                    Pending
                  </button>
                  <button 
                    onClick={() => setShowOnlyPending(false)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showOnlyPending ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
                  >
                    All
                  </button>
                </div>
              </div>

              <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/10">
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">User Details</th>
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Transaction</th>
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Status</th>
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-6">
                            <div>
                              <p className="text-xs font-black uppercase">{p.productName || 'Unknown Product'}</p>
                              <p className="text-[10px] text-gray-500 font-bold">{p.phoneNumber}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <div>
                                <code className="text-[11px] text-indigo-400 font-black px-2 py-0.5 bg-indigo-400/10 rounded">{p.transactionId}</code>
                                <p className="text-[10px] text-gray-500 mt-1">₹{p.amount}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${
                              p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              p.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                             {p.status === 'pending' ? (
                               <div className="flex justify-end gap-2">
                                 <button onClick={() => handleApprovePurchase(p.id)} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                                   <Check size={16} />
                                 </button>
                                 <button onClick={() => handleRejectPurchase(p.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                   <X size={16} />
                                 </button>
                               </div>
                             ) : (
                               <p className="text-[10px] font-mono text-gray-600">{p.passwordUnlocked || 'RESOLVED'}</p>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredPayments.length === 0 && (
                    <div className="p-12 text-center text-gray-600 italic text-sm">No transactions found matching filters</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pdf_requests' && (
             <div className="space-y-6 animate-in fade-in duration-500">
               <div className="bg-[#0a0a0a] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-white/5 bg-white/10">
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Student</th>
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Requested PDF</th>
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">Handle</th>
                        <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {pdfRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-6">
                            <div>
                                <p className="text-xs font-black">{req.full_name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">Class {req.class_level} • {req.phone_number}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-bold text-gray-300">{req.resource_name}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1.5 text-indigo-400">
                              <Instagram size={12} />
                              <span className="text-[11px] font-bold">{req.social_handle}</span>
                            </div>
                          </td>
                          <td className="p-6 text-right">
                             {req.status === 'pending' ? (
                               <div className="flex justify-end gap-2">
                                 <button onClick={() => handleApprovePdf(req.id)} className="px-4 py-2 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase active:scale-95 transition-all">Grant Access</button>
                                 <button onClick={() => handleRejectPdf(req.id)} className="p-2 border border-red-500/20 text-red-500 rounded-xl hover:bg-red-500/10 transition-all"><X size={16} /></button>
                               </div>
                             ) : (
                               <span className="text-[10px] font-black uppercase text-indigo-500">{req.status}</span>
                             )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {pdfRequests.length === 0 && (
                    <div className="p-12 text-center text-gray-600 italic text-sm">No PDF requests available</div>
                  )}
                </div>
              </div>
             </div>
          )}

          {activeTab === 'users' && (
             <div className="space-y-6 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {allUsers.map((u) => (
                  <div key={u.uid} className="bg-white/5 border border-white/10 p-5 rounded-[2rem] flex flex-col gap-4 group">
                    <div className="flex items-center gap-4">
                      <img src={u.photoURL} className="w-12 h-12 rounded-2xl object-cover border border-white/10" referrerPolicy="no-referrer" />
                      <div className="min-w-0">
                        <p className="text-xs font-black truncate">{u.displayName}</p>
                        <p className="text-[9px] text-indigo-400 font-bold uppercase tracking-widest">{u.isPremium ? 'PRO STUDENT' : 'FREE STUDENT'}</p>
                      </div>
                    </div>
                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                       <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">CLASS {u.class || 'NA'}</span>
                       <span className="text-[9px] font-mono text-gray-700">{u.uid.slice(-8)}</span>
                    </div>
                  </div>
                ))}
               </div>
             </div>
          )}
          
          {/* Add more tabs content as needed */}
        </main>
      </div>
    </div>
  );
}
