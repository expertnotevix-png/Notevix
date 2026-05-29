import { useState, useEffect, useMemo } from 'react';
import { dataBridge } from '../services/dataBridge';
import { AppUser, VerifiedPayment, PdfRequest, SubjectResource, PromoBanner } from '../types';
import { 
  Plus, Trash2, Edit2, Save, X, 
  Bell, Send, CheckCircle2, Clock, 
  Shield, RefreshCw, CreditCard, Check, XCircle, Users, Inbox, User, 
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
  const [activeTab, setActiveTab] = useState<'analytics' | 'banners' | 'resources' | 'verified_payments' | 'pdf_requests' | 'notifications' | 'settings'>('analytics');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [pdfRequests, setPdfRequests] = useState<PdfRequest[]>([]);
  const [subjectResources, setSubjectResources] = useState<SubjectResource[]>([]);
  const [verifiedPayments, setVerifiedPayments] = useState<VerifiedPayment[]>([]);
  const [banners, setBanners] = useState<PromoBanner[]>([]);
  
  // UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(true);
  const [isAddingResource, setIsAddingResource] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [notifData, setNotifData] = useState({ title: '', message: '', type: 'info' as const });
  const [approveModal, setApproveModal] = useState<{ id: string, isOpen: boolean, password: string, productName?: string }>({ id: '', isOpen: false, password: '' });
  const [rejectModal, setRejectModal] = useState<{ id: string, isOpen: boolean, reason: string }>({ id: '', isOpen: false, reason: '' });

  const navigate = useNavigate();

  const [analyticsData, setAnalyticsData] = useState({
    totalRevenue: 0,
    premiumSales: 0,
    pendingRequests: 0,
  });

  useEffect(() => {
    fetchTabSpecificData();
  }, [activeTab]);

  useEffect(() => {
    const successfulPayments = verifiedPayments.filter(p => p.status === 'done');
    const totalRev = successfulPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const salesCount = successfulPayments.length;

    setAnalyticsData(prev => ({
      ...prev,
      totalRevenue: totalRev,
      premiumSales: salesCount
    }));
  }, [verifiedPayments]);

  useEffect(() => {
    const pendingPdfCount = pdfRequests.filter(r => r.status === 'pending').length;
    if (pdfRequests.length > 0) {
      setAnalyticsData(prev => ({
        ...prev,
        pendingRequests: pendingPdfCount
      }));
    }
  }, [pdfRequests]);

  const fetchTabSpecificData = async () => {
    setLoading(true);
    try {
      switch (activeTab) {
        case 'analytics': 
          await fetchAnalytics(); 
          await fetchVerifiedPayments();
          break;
        case 'resources': await fetchSubjectResources(); break;
        case 'banners': await fetchBanners(); break;
        case 'verified_payments': await fetchVerifiedPayments(); break;
        case 'pdf_requests': await fetchPdfRequests(); break;
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    const stats = await dataBridge.getAdminStats();
    setAnalyticsData(prev => ({
      ...prev,
      ...stats,
    }));
  };

  const fetchSubjectResources = async () => {
    const data = await dataBridge.getResources();
    setSubjectResources(data);
  };

  const fetchBanners = async () => {
    const data = await dataBridge.getBanners(undefined, true);
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

  // Resource Management
  const handleSaveResource = async (formData: any) => {
    setLoading(true);
    try {
      const resData = {
        subject: formData.subject,
        class: formData.class,
        price: formData.is_premium ? parseFloat(formData.price || '0') : 0,
        description: formData.description,
        cover_image: formData.cover_image,
        preview_images: formData.preview_images || [],
        drive_link: formData.drive_link,
        pdf_password: formData.pdf_password,
        is_premium: formData.is_premium
      };

      if (editingItem) {
        const res = await dataBridge.updateResource(editingItem.id, resData);
        if (res.success) toast.success("Resource updated");
        else throw new Error(res.error);
      } else {
        const res = await dataBridge.addResource({ ...resData, created_at: new Date().toISOString() });
        if (res.success) toast.success("Resource added");
        else throw new Error(res.error);
      }
      setIsAddingResource(false);
      setEditingItem(null);
      fetchSubjectResources();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    const res = await dataBridge.deleteResource(id);
    if (res.success) {
      toast.success("Resource deleted");
      fetchSubjectResources();
    } else {
      toast.error(res.error || "Delete failed");
    }
  };

  const handleFileUpload = async (file: File, bucket: 'Cover' | 'banners') => {
    const res = await dataBridge.uploadImage(file, bucket);
    if (res.success) {
      toast.success("File uploaded successfully");
      return res.url;
    } else {
      toast.error(res.error || "Upload failed");
      return null;
    }
  };

  // Banner Management
  const handleSaveBanner = async (formData: any) => {
    setLoading(true);
    try {
      const bannerData = {
        title: formData.title,
        banner_image: formData.banner_image,
        redirect_link: formData.redirect_link || '/premium-notes',
        location: formData.location,
        is_active: formData.is_active
      };

      if (editingItem) { 
        const res = await dataBridge.updateBanner(editingItem.id, bannerData);
        if (res.success) toast.success("Banner updated");
        else throw new Error(res.error);
      } else {
        const res = await dataBridge.addBanner({ ...bannerData, created_at: new Date().toISOString() });
        if (res.success) toast.success("Banner added");
        else throw new Error(res.error);
      }
      setIsAddingBanner(false);
      setEditingItem(null);
      fetchBanners();
    } catch (err: any) {
      toast.error(err.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm("Delete this banner?")) return;
    const res = await dataBridge.deleteBanner(id);
    if (res.success) {
      toast.success("Banner deleted");
      fetchBanners();
    }
  };

  const handleMarkAsDone = async (paymentId: string) => {
    const payment = verifiedPayments.find(p => p.id === paymentId);
    const paymentAmt = payment?.amount ? parseFloat(payment.amount as any) : 0;

    // Immediately update analytics state locally to feel instant
    setAnalyticsData(prev => ({
      ...prev,
      totalRevenue: prev.totalRevenue + paymentAmt,
      premiumSales: prev.premiumSales + 1
    }));

    // Update verified payments locally so the list update displays immediately
    setVerifiedPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'done', approved: true } : p));

    setLoading(true);
    try {
      const res = await dataBridge.markPaymentAsDone(paymentId);
      if (!res.success) throw new Error(res.error);
      
      toast.success("Payment marked as done!");
      await fetchVerifiedPayments();
      await fetchAnalytics();
    } catch (err: any) {
      toast.error(err.message || "Failed to mark as done");
      // Rollback on fail
      setVerifiedPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'pending', approved: false } : p));
      setAnalyticsData(prev => ({
        ...prev,
        totalRevenue: Math.max(0, prev.totalRevenue - paymentAmt),
        premiumSales: Math.max(0, prev.premiumSales - 1)
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleApprovePdf = async (id: string) => {
    setLoading(true);
    try {
      const res = await dataBridge.approvePdfRequest(id);
      if (res.success) {
        toast.success("PDF request approved!");
        await fetchPdfRequests();
      } else {
        toast.error(res.error || "Failed to approve");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPdf = async (id: string) => {
    if (!confirm("Reject this request?")) return;
    setLoading(true);
    try {
      const res = await dataBridge.rejectPdfRequest(id);
      if (res.success) {
        toast.success("PDF request rejected");
        await fetchPdfRequests();
      } else {
        toast.error(res.error || "Failed to reject");
      }
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'banners', label: 'Promotions', icon: LayoutDashboard },
    { id: 'resources', label: 'PDF Library', icon: BookOpen },
    { id: 'verified_payments', label: 'Payments', icon: CreditCard },
    { id: 'pdf_requests', label: 'PDF Requests', icon: FileText },
    { id: 'notifications', label: 'Broadcast', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  const trafficSourcesData = useMemo(() => {
    const platformTracker: Record<string, number> = {
      'Instagram': 0,
      'Snapchat': 0,
      'YouTube': 0,
      "Friend's Referral": 0,
      'Telegram': 0,
      'Other': 0
    };

    const accountTracker: Record<string, number> = {
      '@studyhacks100': 0,
      '@theexamtips': 0,
      'Other': 0
    };

    // Filter successful payments (done status)
    const sales = verifiedPayments.filter(p => p.status === 'done');
    const totalSalesNum = sales.length;
    const instagramSalesNum = sales.filter(p => p.source_platform === 'Instagram').length;

    sales.forEach(p => {
      if (p.source_platform && platformTracker[p.source_platform] !== undefined) {
        platformTracker[p.source_platform]++;
      }
      if (p.source_platform === 'Instagram' && p.source_account && accountTracker[p.source_account] !== undefined) {
        accountTracker[p.source_account]++;
      }
    });

    return {
      platforms: Object.entries(platformTracker).map(([name, count]) => ({
        name,
        count,
        percentage: totalSalesNum > 0 ? Math.round((count / totalSalesNum) * 100) : 0
      })),
      accounts: Object.entries(accountTracker).map(([name, count]) => ({
        name,
        count,
        percentage: instagramSalesNum > 0 ? Math.round((count / instagramSalesNum) * 100) : 0
      })),
      totalSalesNum,
      instagramSalesNum
    };
  }, [verifiedPayments]);

  const filteredPayments = useMemo(() => {
    return verifiedPayments.filter(p => {
      const search = searchQuery.toLowerCase();
      const matchesSearch = p.transaction_id.toLowerCase().includes(search) || 
                            p.email.toLowerCase().includes(search) ||
                            (p.phone_number || '').includes(searchQuery);
      if (showOnlyPending) return p.status === 'pending' && matchesSearch;
      return matchesSearch;
    });
  }, [verifiedPayments, searchQuery, showOnlyPending]);

  return (
    <div className="min-h-screen bg-[#050505] text-white flex">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0a0a0a] border-r border-white/5 transition-transform duration-300 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col relative">
          <button 
            onClick={() => setSidebarOpen(false)}
            className="absolute top-6 right-4 p-2 text-gray-500 hover:text-white"
          >
            <X size={20} />
          </button>
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-black tracking-tighter text-lg leading-none">ADMIN</h1>
              <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest mt-1">Control Center</p>
            </div>
          </div>

          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto custom-scrollbar scrollbar-hide">
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
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden transition-all duration-300 ${sidebarOpen ? 'lg:pl-64' : 'pl-0'}`}>
        <header className="h-20 bg-[#0a0a0a]/50 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-8">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-xl transition-all text-gray-400 hover:text-white"
            >
              <LayoutDashboard size={20} />
            </button>
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar bg-[#050505]">
          <div className="max-w-6xl mx-auto space-y-8">
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Total Revenue', value: `₹${analyticsData.totalRevenue}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Premium Sales', value: analyticsData.premiumSales, icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { label: 'Pending PDF Requests', value: analyticsData.pendingRequests, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] flex flex-col gap-4">
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

              {/* Traffic Sources Chart SECTION */}
              <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                   <div>
                      <h3 className="text-xl font-black uppercase tracking-tight text-white flex items-center gap-2">
                         <TrendingUp className="text-indigo-400 w-5 h-5" />
                         Traffic Sources
                      </h3>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">
                         Acquisition Channels & Instagram Performance
                      </p>
                   </div>
                   <span className="text-[9px] bg-indigo-500/10 text-indigo-400 font-black border border-indigo-500/20 px-3 py-1 rounded-full uppercase tracking-wider">
                     {trafficSourcesData.totalSalesNum} Total Sales Tracked
                   </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Platform Acquisition */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-300 tracking-wider">Sales by Platform</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Where your buyers are coming from</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                      <div className="space-y-4">
                        {trafficSourcesData.platforms.map((platform, img) => {
                          const COLORS = ['#6366f1', '#eab308', '#ef4444', '#10b981', '#06b6d4', '#737373'];
                          let dotColor = COLORS[img % COLORS.length];

                          return (
                            <div key={platform.name} className="space-y-1.5">
                              <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-gray-300 flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                                  {platform.name}
                                </span>
                                <div className="space-x-1">
                                  <span className="text-gray-400 font-black">{platform.count}</span>
                                  <span className="text-indigo-400 font-black">({platform.percentage}%)</span>
                                </div>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <div 
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{ width: `${platform.percentage}%`, backgroundColor: dotColor }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* PieChart Visualization */}
                      <div className="h-48 relative flex items-center justify-center">
                        {trafficSourcesData.totalSalesNum === 0 ? (
                          <div className="text-center">
                            <TrendingUp className="w-8 h-8 text-gray-700 mx-auto mb-1" />
                            <p className="text-[10px] text-gray-500 font-bold uppercase">No data</p>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={trafficSourcesData.platforms}
                                cx="55%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={2}
                                dataKey="count"
                              >
                                {trafficSourcesData.platforms.map((entry, index) => {
                                  const COLORS = ['#6366f1', '#eab308', '#ef4444', '#10b981', '#06b6d4', '#737373'];
                                  return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                })}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0A0A0B', borderColor: '#1F2937', borderRadius: '1rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Instagram Account Attribution */}
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-xs font-black uppercase text-gray-300 tracking-wider">Instagram Account Performance</h4>
                      <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-0.5">Performance of creator accounts</p>
                    </div>

                    {trafficSourcesData.instagramSalesNum === 0 ? (
                      <div className="h-48 rounded-3xl border border-white/5 bg-white/[0.01] flex flex-col items-center justify-center text-center p-6">
                        <Instagram className="w-8 h-8 text-gray-700 mb-2" />
                        <p className="text-[10px] text-gray-500 font-black uppercase tracking-wider">No Instagram Sales Tracked Yet</p>
                        <p className="text-[9px] text-gray-600 font-semibold uppercase tracking-wider mt-1">Select Instagram in payment form to track</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                        <div className="space-y-4">
                          {trafficSourcesData.accounts.map((account, index) => {
                            const COLORS = ['#ec4899', '#d946ef', '#737373'];
                            let dotColor = COLORS[index % COLORS.length];

                            return (
                              <div key={account.name} className="space-y-1.5">
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-gray-300 font-mono flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                                    {account.name}
                                  </span>
                                  <div className="space-x-1">
                                    <span className="text-gray-400 font-black">{account.count}</span>
                                    <span className="text-pink-400 font-black">({account.percentage}%)</span>
                                  </div>
                                </div>
                                <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                  <div 
                                    className="h-full rounded-full transition-all duration-500"
                                    style={{ width: `${account.percentage}%`, backgroundColor: dotColor }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* PieChart for Instagram Accounts */}
                        <div className="h-48 relative flex items-center justify-center">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={trafficSourcesData.accounts}
                                cx="55%"
                                cy="50%"
                                innerRadius={45}
                                outerRadius={65}
                                paddingAngle={2}
                                dataKey="count"
                              >
                                {trafficSourcesData.accounts.map((entry, index) => {
                                  const COLORS = ['#ec4899', '#d946ef', '#737373'];
                                  return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                                })}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ backgroundColor: '#0A0A0B', borderColor: '#1F2937', borderRadius: '1rem', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                   <button 
                    onClick={() => setShowOnlyPending(true)} 
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyPending ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
                   >
                     Premium Notes
                   </button>
                   <button 
                    onClick={() => setShowOnlyPending(false)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showOnlyPending ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}
                   >
                     Free Materials
                   </button>
                </div>
                <button 
                  onClick={() => setIsAddingResource(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all"
                >
                  <Plus size={16} /> New Resource
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {subjectResources.filter(r => showOnlyPending ? r.is_premium : !r.is_premium).map((res) => (
                    <div key={res.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col group">
                      <div className="aspect-[3/4] relative bg-white/5">
                         {res.cover_image && <img src={res.cover_image} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                         <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black">
                            {!res.is_premium ? 'FREE' : `₹${res.price}`}
                         </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                           <h4 className="font-black text-sm uppercase truncate">{res.subject}</h4>
                           <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 space-x-2">
                             <span>Class {res.class}</span>
                             <span>•</span>
                             <span className="text-indigo-400">V{res.id.slice(-4)}</span>
                           </p>
                        </div>
                        <div className="flex gap-2">
                           <button 
                            onClick={() => { 
                              setEditingItem(res); 
                              setIsAddingResource(true); 
                            }}
                            className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-[10px] font-black uppercase transition-all"
                           >
                             Edit
                           </button>
                           <button 
                            onClick={() => handleDeleteResource(res.id)}
                            className="px-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all"
                           >
                             <Trash2 size={14} />
                           </button>
                        </div>
                      </div>
                    </div>
                 ))}
                 {subjectResources.filter(r => showOnlyPending ? r.is_premium : !r.is_premium).length === 0 && (
                   <div className="col-span-full py-20 text-center text-gray-600 uppercase font-black text-xs tracking-widest border-2 border-dashed border-white/5 rounded-[3rem]">
                      No resources found
                   </div>
                 )}
              </div>
            </div>
          )}
          {activeTab === 'verified_payments' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                 <div>
                   <h3 className="text-2xl font-black uppercase tracking-tight">Payment Requests</h3>
                   <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                     Verify and Approve Transactions
                   </p>
                 </div>
                 
                 <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 w-full md:w-auto">
                    <button 
                      onClick={() => setShowOnlyPending(true)}
                      className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyPending ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Pending ({verifiedPayments.filter(p => p.status === 'pending').length})
                    </button>
                    <button 
                      onClick={() => setShowOnlyPending(false)}
                      className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showOnlyPending ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      History
                    </button>
                 </div>
               </div>

               <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="text"
                    placeholder="Search Transaction ID, Email or Phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-4 py-4 text-sm focus:border-indigo-500 outline-none transition-all"
                  />
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {filteredPayments.map((p) => (
                    <div key={p.id} className="group bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 hover:border-indigo-500/30 transition-all shadow-xl">
                      <div className="flex justify-between items-start gap-4">
                         <div className="space-y-4 flex-1">
                            <div className="flex items-center gap-3">
                               <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                  <User size={20} />
                               </div>
                               <div>
                                  <p className="text-sm font-black uppercase tracking-tight text-white">Buyer: {p.phone_number || 'Unknown'}</p>
                                  <p className="text-sm text-indigo-400 font-bold select-all break-all">{p.email}</p>
                                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mt-1">Product: {p.product_name}</p>
                               </div>
                            </div>

                            <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-2">
                               <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-500 font-bold uppercase">Transaction ID</span>
                                  <code className="text-[10px] select-all text-indigo-400 font-black font-mono">{p.transaction_id}</code>
                               </div>
                               <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-500 font-bold uppercase">Amount</span>
                                  <span className="text-sm font-black text-emerald-400">₹{p.amount}</span>
                               </div>
                               <div className="flex justify-between items-center">
                                  <span className="text-[10px] text-gray-500 font-bold uppercase">Date</span>
                                  <span className="text-[10px] text-gray-400 font-medium">{p.created_at ? new Date(p.created_at).toLocaleString() : 'N/A'}</span>
                               </div>
                               {p.source_platform && (
                                  <div className="flex justify-between items-center border-t border-white/5 pt-1.5 mt-1.5">
                                     <span className="text-[10px] text-gray-500 font-bold uppercase">Source Platform</span>
                                     <span className="text-[10px] text-indigo-300 font-black uppercase flex items-center gap-1">
                                       {p.source_platform === 'Instagram' && <Instagram size={11} className="text-pink-500" />}
                                       {p.source_platform}
                                     </span>
                                  </div>
                               )}
                               {p.source_platform === 'Instagram' && p.source_account && (
                                  <div className="flex justify-between items-center">
                                     <span className="text-[10px] text-gray-500 font-bold uppercase">Instagram Account</span>
                                     <strong className="text-[10px] text-pink-400 font-mono">{p.source_account}</strong>
                                  </div>
                               )}
                            </div>
                         </div>

                         <div className="flex flex-col gap-2">
                            {p.status !== 'done' ? (
                               <button 
                                 onClick={() => handleMarkAsDone(p.id)}
                                 className="px-4 py-2 bg-emerald-500 text-black rounded-xl hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-1 font-bold text-xs uppercase"
                               >
                                 <Check size={14} /> Mark as Done
                               </button>
                            ) : (
                               <div className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-500 flex items-center gap-1.5 border border-emerald-500/20">
                                 <CheckCircle2 className="w-3.5 h-3.5" /> Done
                               </div>
                            )}
                         </div>
                      </div>
                    </div>
                  ))}
               </div>

               {filteredPayments.length === 0 && (
                  <div className="py-20 text-center space-y-4 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem]">
                     <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                        <Inbox size={32} />
                     </div>
                     <p className="text-gray-500 uppercase font-black text-xs tracking-widest">No transaction requests found</p>
                  </div>
               )}
            </div>
          )}

          {activeTab === 'pdf_requests' && (
             <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                   <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight">PDF Requests</h3>
                      <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">Manual Access Requests</p>
                   </div>
                   <div className="flex items-center gap-2 bg-white/5 p-1 rounded-2xl border border-white/5 w-full md:w-auto">
                      <button 
                        onClick={() => setShowOnlyPending(true)}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${showOnlyPending ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        Pending ({pdfRequests.filter(r => r.status === 'pending').length})
                      </button>
                      <button 
                        onClick={() => setShowOnlyPending(false)}
                        className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!showOnlyPending ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-gray-500 hover:text-gray-300'}`}
                      >
                        History
                      </button>
                   </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pdfRequests.filter(r => showOnlyPending ? r.status === 'pending' : true).map((req) => (
                    <div key={req.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] p-6 space-y-6 hover:border-indigo-500/20 transition-all shadow-xl">
                       <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-gray-400">
                                <User size={20} />
                             </div>
                             <div>
                                <p className="text-sm font-black uppercase truncate">{req.student_name}</p>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Class {req.class_name} • {req.phone_number}</p>
                             </div>
                          </div>
                          
                          <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            req.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                            req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20' :
                            'bg-red-500/10 text-red-500 border border-red-500/20'
                          }`}>
                            {req.status}
                          </div>
                       </div>

                       <div className="space-y-4">
                          <div className="p-4 bg-white/[0.02] rounded-2xl border border-white/5 space-y-3">
                             <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-500 font-bold uppercase">Requested PDF</span>
                                <span className="text-gray-200 font-bold">{req.requested_pdf}</span>
                             </div>
                             <div className="flex justify-between items-center text-[10px]">
                                <span className="text-gray-500 font-bold uppercase">Instagram</span>
                                <div className="flex items-center gap-1.5 text-indigo-400 font-black">
                                   <Instagram size={12} />
                                   {req.instagram_username}
                                </div>
                             </div>
                          </div>

                          {req.status === 'pending' && (
                             <div className="flex gap-2">
                                <button 
                                  onClick={() => handleApprovePdf(req.id)} 
                                  className="flex-1 py-3 bg-emerald-500 text-black rounded-xl text-[10px] font-black uppercase shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
                                >
                                  Grant Access
                                </button>
                                <button 
                                  onClick={() => handleRejectPdf(req.id)} 
                                  className="px-4 py-3 border border-white/5 text-red-500 rounded-xl hover:bg-white/5 transition-all active:scale-95"
                                >
                                  <X size={16} />
                                </button>
                             </div>
                          )}
                       </div>
                    </div>
                  ))}
                </div>

                {pdfRequests.filter(r => showOnlyPending ? r.status === 'pending' : true).length === 0 && (
                   <div className="py-20 text-center space-y-4 bg-white/[0.02] border-2 border-dashed border-white/5 rounded-[3rem]">
                      <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-gray-600">
                         <Inbox size={32} />
                      </div>
                      <p className="text-gray-500 uppercase font-black text-xs tracking-widest">No manual requests found</p>
                   </div>
                )}
             </div>
          )}

          
          {activeTab === 'banners' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black uppercase tracking-tight">Active Promotions</h3>
                <button 
                  onClick={() => setIsAddingBanner(true)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20 active:scale-95 transition-all"
                >
                  <Plus size={16} /> Add New Banner
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {banners.map((banner) => (
                  <div key={banner.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2rem] overflow-hidden flex flex-col group">
                    <div className="aspect-[21/9] relative bg-white/5">
                      {banner.banner_image && <img src={banner.banner_image} className="w-full h-full object-cover" />}
                      <div className="absolute top-4 right-4 flex gap-2">
                         <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${banner.is_active ? 'bg-emerald-500/20 text-emerald-500' : 'bg-red-500/20 text-red-500'}`}>
                            {banner.is_active ? 'Active' : 'Paused'}
                         </div>
                         <div className="px-2 py-1 rounded-md bg-black/50 text-white text-[8px] font-black uppercase backdrop-blur-md">
                            {banner.location}
                         </div>
                      </div>
                    </div>
                    <div className="p-6 flex items-center justify-between border-t border-white/5">
                      <div className="min-w-0">
                        <p className="text-xs font-black uppercase truncate">{banner.location} Placement</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{banner.created_at}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { 
                            setEditingItem(banner); 
                            setIsAddingResource(false); 
                            setIsAddingBanner(true); 
                          }}
                          className="p-2 bg-white/5 text-gray-400 rounded-lg hover:text-white transition-all"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBanner(banner.id)}
                          className="p-2 bg-white/5 text-gray-400 rounded-lg hover:text-red-500 transition-all"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </main>
      </div>
      {/* Modals */}
      {isAddingResource && (
        <ResourceModal 
          onClose={() => { setIsAddingResource(false); setEditingItem(null); }} 
          onSave={handleSaveResource} 
          resource={editingItem}
          uploadHandler={handleFileUpload}
        />
      )}
      {isAddingBanner && (
        <BannerModal 
          onClose={() => { setIsAddingBanner(false); setEditingItem(null); }} 
          onSave={handleSaveBanner} 
          banner={editingItem}
          uploadHandler={handleFileUpload}
        />
      )}
    </div>
  );
}

// Sub-components
function ResourceModal({ onClose, onSave, resource, uploadHandler }: any) {
  // Extract custom USD price from description if editing
  const getUSDFromDesc = (desc: string) => {
    if (!desc) return '1.99';
    const match = desc.match(/\[USD:([\d.]+)\]/);
    return match ? match[1] : '1.99';
  };

  const getCleanDesc = (desc: string) => {
    if (!desc) return '';
    return desc.replace(/\[USD:[\d.]+\]/, '').trim();
  };

  const [form, setForm] = useState(() => {
    if (resource) {
      return {
        ...resource,
        price: resource.price ? resource.price.toString() : '39',
        price_usd: getUSDFromDesc(resource.description),
        description: getCleanDesc(resource.description),
        preview_images: resource.preview_images || []
      };
    }
    return {
      subject: '', class: '10', price: '39', price_usd: '1.99', description: '', cover_image: '', preview_images: [], drive_link: '', pdf_password: '', is_premium: true
    };
  });
  const [upLoading, setUpLoading] = useState(false);

  const handleSubmit = () => {
    const cleanDesc = (form.description || '').replace(/\[USD:[\d.]+\]/, '').trim();
    // Save custom USD price embedded safely in the description
    const finalDesc = form.price_usd ? `${cleanDesc}\n\n[USD:${form.price_usd}]`.trim() : cleanDesc;
    
    // Clean and filter empty preview_images
    const finalPreviewImages = (form.preview_images || [])
      .map((url: string) => url?.trim() || '')
      .filter((url: string) => url !== '');

    onSave({
      ...form,
      description: finalDesc,
      preview_images: finalPreviewImages
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase">{resource ? 'Edit' : 'New'} Resource</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Subject / Material Name</label>
              <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" placeholder="e.g. Science Chapter 1" />
           </div>
           <div className="space-y-1.5 col-span-2">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Class</label>
              <select value={form.class} onChange={e => setForm({...form, class: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 outline-none">
                 <option value="8">Class 8</option>
                 <option value="9">Class 9</option>
                 <option value="10">Class 10</option>
              </select>
           </div>
        </div>

        <div className="space-y-1.5">
           <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Description</label>
           <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none min-h-[80px]" placeholder="Brief info about this material" />
        </div>

        <div className="space-y-1.5">
           <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Cover Image</label>
           <div className="flex gap-4">
              <input type="text" value={form.cover_image} onChange={e => setForm({...form, cover_image: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs" placeholder="URL or Upload" />
              <input type="file" id="cover-up" className="hidden" onChange={async e => {
                 if (e.target.files?.[0]) {
                    setUpLoading(true);
                    const url = await uploadHandler(e.target.files[0], 'Cover');
                    if (url) setForm({...form, cover_image: url});
                    setUpLoading(false);
                 }
              }} />
              <label htmlFor="cover-up" className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer disabled:opacity-50">
                 {upLoading ? '...' : 'Upload'}
              </label>
           </div>
        </div>

        {/* 'Preview Images' Section */}
        <div className="space-y-3 p-4 bg-white/5 rounded-2xl border border-white/5">
           <label className="text-[10px] text-gray-400 font-black uppercase tracking-wider block ml-1">Preview Images (Up to 5 URLs)</label>
           {[0, 1, 2, 3, 4].map((index) => (
              <div key={index} className="flex gap-2">
                 <span className="text-[10px] text-gray-500 font-black flex items-center justify-center w-6 bg-white/5 rounded-xl border border-white/5">#{index + 1}</span>
                 <input 
                    type="text" 
                    value={form.preview_images?.[index] || ''} 
                    onChange={e => {
                       const newImages = [...(form.preview_images || [])];
                       newImages[index] = e.target.value;
                       setForm({ ...form, preview_images: newImages });
                    }} 
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs outline-none focus:border-indigo-500 text-white" 
                    placeholder={`Image URL #${index + 1}`} 
                 />
              </div>
           ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Drive Link</label>
              <input type="text" value={form.drive_link} onChange={e => setForm({...form, drive_link: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="Google Drive URL" />
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">PDF Password</label>
              <input type="text" value={form.pdf_password} onChange={e => setForm({...form, pdf_password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="For Premium access" />
           </div>
        </div>

        <div className="flex flex-col gap-4 p-4 bg-white/5 rounded-2xl border border-white/5">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                 <input type="checkbox" checked={form.is_premium} onChange={e => setForm({...form, is_premium: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                 <span className="text-sm font-bold">Premium Material</span>
              </div>
           </div>
           {form.is_premium && (
             <div className="grid grid-cols-2 gap-4 pt-2 border-t border-white/5">
                <div className="space-y-1">
                   <label className="text-[9px] text-gray-500 font-bold uppercase block">Price in Rupees (₹)</label>
                   <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <span className="text-xs font-black text-gray-400 font-sans">₹</span>
                      <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-full bg-transparent text-sm outline-none text-white" placeholder="39" />
                   </div>
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] text-gray-500 font-bold uppercase block">Price in Dollars ($)</label>
                   <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <span className="text-xs font-black text-gray-400 font-sans">$</span>
                      <input type="number" step="0.01" value={form.price_usd} onChange={e => setForm({...form, price_usd: e.target.value})} className="w-full bg-transparent text-sm outline-none text-white" placeholder="1.99" />
                   </div>
                </div>
             </div>
           )}
        </div>

        <button onClick={handleSubmit} className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
           Save Resource
        </button>
      </div>
    </div>
  );
}

function BannerModal({ onClose, onSave, banner, uploadHandler }: any) {
  const [form, setForm] = useState(banner || { title: '', banner_image: '', redirect_link: '', location: 'home', is_active: true });
  const [upLoading, setUpLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 space-y-8 animate-in slide-in-from-bottom-10 duration-300">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase">Banner Manager</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="space-y-4">
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Banner Title</label>
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" placeholder="e.g. New Year Offer" />
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Placement Location</label>
              <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3">
                 <option value="home">Home Carousel</option>
                 <option value="landing">Landing Header</option>
              </select>
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Banner Image</label>
              <div className="flex gap-4">
                <input type="text" value={form.banner_image} onChange={e => setForm({...form, banner_image: e.target.value})} className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="URL or Upload" />
                <input type="file" id="banner-up" className="hidden" onChange={async e => {
                   if (e.target.files?.[0]) {
                      setUpLoading(true);
                      const url = await uploadHandler(e.target.files[0], 'banners');
                      if (url) setForm({...form, banner_image: url});
                      setUpLoading(false);
                   }
                }} />
                <label htmlFor="banner-up" className="px-4 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase cursor-pointer">
                   {upLoading ? '...' : 'Upload'}
                </label>
              </div>
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Redirect Link</label>
              <input type="text" value={form.redirect_link} onChange={e => setForm({...form, redirect_link: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" placeholder="e.g. /premium-notes" />
           </div>

           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase">Status</label>
              <div className="flex items-center gap-2 mt-3 ml-2">
                 <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                 <span className="text-xs font-bold">Active Banner</span>
              </div>
           </div>
        </div>

        <button onClick={() => onSave(form)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest">
           Publish Promotion
        </button>
      </div>
    </div>
  );
}
