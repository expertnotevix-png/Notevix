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
  const [approveModal, setApproveModal] = useState<{ id: string, isOpen: boolean, password: string }>({ id: '', isOpen: false, password: '' });
  const [rejectModal, setRejectModal] = useState<{ id: string, isOpen: boolean, reason: string }>({ id: '', isOpen: false, reason: '' });

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
    
    // Calculate total revenue from approved payments
    const payments = await dataBridge.getVerifiedPayments(1000);
    const totalRev = payments
      .filter(p => p.status === 'approved')
      .reduce((acc, curr) => acc + (curr.amount || 0), 0);

    setAnalyticsData(prev => ({
      ...prev,
      ...stats,
      totalRevenue: totalRev,
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

  // Resource Management
  const handleSaveResource = async (formData: any) => {
    setLoading(true);
    try {
      const resData = {
        title: formData.title || formData.subject,
        subject: formData.subject,
        class_level: formData.class_level,
        price: formData.is_premium ? parseFloat(formData.price || '0') : 0,
        description: formData.description,
        cover_image: formData.cover_image,
        pdf_link: formData.pdf_link,
        unlock_password: formData.unlock_password,
        is_premium: formData.is_premium,
        updated_at: new Date().toISOString()
      };

      if (editingResource) {
        const res = await dataBridge.updateResource(editingResource.id, resData);
        if (res.success) toast.success("Resource updated");
        else throw new Error(res.error);
      } else {
        const res = await dataBridge.addResource({ ...resData, created_at: new Date().toISOString() });
        if (res.success) toast.success("Resource added");
        else throw new Error(res.error);
      }
      setIsAddingResource(false);
      setEditingResource(null);
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

  const handleFileUpload = async (file: File, bucket: string) => {
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
        redirect_link: formData.redirect_link,
        location: formData.location,
        is_active: formData.is_active,
        updated_at: new Date().toISOString()
      };

      if (editingResource) { 
        const res = await dataBridge.updateBanner(editingResource.id, bannerData);
        if (res.success) toast.success("Banner updated");
        else throw new Error(res.error);
      } else {
        const res = await dataBridge.addBanner({ ...bannerData, created_at: new Date().toISOString() });
        if (res.success) toast.success("Banner added");
        else throw new Error(res.error);
      }
      setIsAddingBanner(false);
      setEditingResource(null);
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

  const handleApprovePurchase = async () => {
    if (!approveModal.id || !approveModal.password) {
      toast.error("Please enter a password");
      return;
    }
    setLoading(true);
    try {
      console.log("Approving purchase:", approveModal.id);
      const res = await dataBridge.approvePurchase(approveModal.id, approveModal.password);
      if (res.success) {
        toast.success("Payment approved!");
        setApproveModal({ id: '', isOpen: false, password: '' });
        await fetchVerifiedPayments();
      } else {
        toast.error(res.error || "Failed to approve");
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleRejectPurchase = async () => {
    if (!rejectModal.id) return;
    setLoading(true);
    try {
      const res = await dataBridge.rejectPurchase(rejectModal.id, rejectModal.reason);
      if (res.success) {
        toast.success("Payment rejected");
        setRejectModal({ id: '', isOpen: false, reason: '' });
        await fetchVerifiedPayments();
      } else {
        toast.error(res.error || "Failed to reject");
      }
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

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Total Revenue', value: `₹${analyticsData.totalRevenue}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                  { label: 'Total Users', value: analyticsData.totalUsers, icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                  { label: 'Premium Sales', value: analyticsData.premiumUsers, icon: CheckCircle2, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                  { label: 'New Today', value: analyticsData.newUsersToday, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
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
            </div>
          )}

          {activeTab === 'resources' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5">
                   <button 
                    onClick={() => setShowOnlyPending(true)} // Reusing showOnlyPending for premium filter for now
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
                 {subjectResources.filter(r => showOnlyPending ? r.isPremium : !r.isPremium).map((res) => (
                    <div key={res.id} className="bg-[#0a0a0a] border border-white/5 rounded-[2.5rem] overflow-hidden flex flex-col group">
                      <div className="aspect-[3/4] relative bg-white/5">
                         {res.coverImage && <img src={res.coverImage} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                         <div className="absolute top-4 right-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-[10px] font-black">
                            {!res.isPremium ? 'FREE' : `₹${res.price}`}
                         </div>
                      </div>
                      <div className="p-6 space-y-4">
                        <div>
                           <h4 className="font-black text-sm uppercase truncate">{res.title}</h4>
                           <p className="text-[9px] text-gray-500 font-bold uppercase tracking-[0.2em] mt-1 space-x-2">
                             <span>Class {res.classLevel}</span>
                             <span>•</span>
                             <span className="text-indigo-400">V{res.id.slice(-4)}</span>
                           </p>
                        </div>
                        <div className="flex gap-2">
                           <button 
                            onClick={() => { 
                              setEditingResource({
                                ...res,
                                class_level: res.classLevel,
                                cover_image: res.coverImage,
                                pdf_link: res.pdfLink,
                                unlock_password: res.unlockPassword,
                                is_premium: res.isPremium
                              }); 
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
                 {subjectResources.filter(r => showOnlyPending ? r.isPremium : !r.isPremium).length === 0 && (
                   <div className="col-span-full py-20 text-center text-gray-600 uppercase font-black text-xs tracking-widest border-2 border-dashed border-white/5 rounded-[3rem]">
                      No resources found in this category
                   </div>
                 )}
              </div>
            </div>
          )}

          {activeTab === 'verified_payments' && (
            <div className="space-y-6 animate-in fade-in duration-500">
               <div className="sticky top-0 z-[30] bg-[#050505]/80 backdrop-blur-xl -mx-8 px-8 py-6 mb-6 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
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
                              p.approved ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                              p.status === 'rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                              'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                             {!p.approved ? (
                               <div className="flex justify-end gap-2">
                                 <button onClick={() => setApproveModal({ id: p.id, isOpen: true, password: '' })} className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg hover:bg-emerald-500 hover:text-white transition-all">
                                   <Check size={16} />
                                 </button>
                                 <button onClick={() => setRejectModal({ id: p.id, isOpen: true, reason: '' })} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-all">
                                   <X size={16} />
                                 </button>
                               </div>
                             ) : (
                               <p className="text-[10px] font-mono text-gray-600">{p.unlockPassword || 'RESOLVED'}</p>
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
                                <p className="text-xs font-black">{req.student_name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">Class {req.class_name} • {req.phone_number}</p>
                            </div>
                          </td>
                          <td className="p-6">
                            <span className="text-xs font-bold text-gray-300">{req.requested_pdf}</span>
                          </td>
                          <td className="p-6">
                            <div className="flex items-center gap-1.5 text-indigo-400">
                              <Instagram size={12} />
                              <span className="text-[11px] font-bold">{req.instagram_username}</span>
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
                        <p className="text-xs font-black uppercase truncate">{banner.title}</p>
                        <p className="text-[9px] text-gray-500 font-bold uppercase truncate">{banner.redirect_link || 'No Link'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { 
                            setEditingResource(banner); 
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
        </main>
      </div>
      {/* Modals */}
      {isAddingResource && (
        <ResourceModal 
          onClose={() => { setIsAddingResource(false); setEditingResource(null); }} 
          onSave={handleSaveResource} 
          resource={editingResource}
          uploadHandler={handleFileUpload}
        />
      )}
      {isAddingBanner && (
        <BannerModal 
          onClose={() => { setIsAddingBanner(false); setEditingResource(null); }} 
          onSave={handleSaveBanner} 
          banner={editingResource}
          uploadHandler={handleFileUpload}
        />
      )}
      {approveModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase">Approve Payment</h3>
                 <button onClick={() => setApproveModal({ ...approveModal, isOpen: false })} className="text-gray-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <p className="text-xs text-gray-500 font-bold leading-relaxed uppercase">Enter the password the user will see to unlock their PDF material.</p>
              <div className="space-y-1.5">
                 <label className="text-[10px] text-gray-400 font-black uppercase ml-1">Unlock Password</label>
                 <input 
                  type="text" 
                  value={approveModal.password} 
                  onChange={e => setApproveModal({...approveModal, password: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:border-emerald-500 outline-none transition-all"
                  placeholder="e.g. EXPN-9283"
                  autoFocus
                 />
              </div>
              <button 
                onClick={handleApprovePurchase}
                className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/10"
              >
                Confirm Approval
              </button>
           </div>
        </div>
      )}
      {rejectModal.isOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
           <div className="w-full max-w-sm bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] p-10 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="flex justify-between items-center">
                 <h3 className="text-xl font-black uppercase">Reject Payment</h3>
                 <button onClick={() => setRejectModal({ ...rejectModal, isOpen: false })} className="text-gray-500 hover:text-white transition-all"><X size={20} /></button>
              </div>
              <p className="text-xs text-gray-500 font-bold leading-relaxed uppercase">Provide a reason for rejection. This will help the user understand why access was denied.</p>
              <div className="space-y-1.5">
                 <label className="text-[10px] text-gray-400 font-black uppercase ml-1">Reason (Optional)</label>
                 <textarea 
                  value={rejectModal.reason} 
                  onChange={e => setRejectModal({...rejectModal, reason: e.target.value})}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:border-red-500 outline-none transition-all min-h-[100px] resize-none"
                  placeholder="e.g. Transaction ID not found or mismatched amount."
                  autoFocus
                 />
              </div>
              <button 
                onClick={handleRejectPurchase}
                className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-red-500/10"
              >
                Confirm Rejection
              </button>
           </div>
        </div>
      )}
    </div>
  );
}

// Sub-components
function ResourceModal({ onClose, onSave, resource, uploadHandler }: any) {
  const [form, setForm] = useState(resource || {
    title: '', subject: '', class_level: '10', price: '39', description: '', cover_image: '', pdf_link: '', unlock_password: '', is_premium: true
  });
  const [upLoading, setUpLoading] = useState(false);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/90 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] p-10 space-y-8 animate-in zoom-in-95 duration-300 overflow-y-auto max-h-[90vh] custom-scrollbar">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black uppercase">{resource ? 'Edit' : 'New'} Resource</h2>
          <button onClick={onClose}><X /></button>
        </div>

        <div className="space-y-1.5">
            <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Title</label>
            <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" placeholder="e.g. Science Chapter 1 Notes" />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Subject</label>
              <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 outline-none" placeholder="e.g. Science" />
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Class</label>
              <select value={form.class_level} onChange={e => setForm({...form, class_level: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 outline-none">
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

        <div className="grid grid-cols-2 gap-4">
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">PDF Direct Link</label>
              <input type="text" value={form.pdf_link} onChange={e => setForm({...form, pdf_link: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="Google Drive URL" />
           </div>
           <div className="space-y-1.5">
              <label className="text-[10px] text-gray-500 font-bold uppercase ml-1">Unlock Password</label>
              <input type="text" value={form.unlock_password} onChange={e => setForm({...form, unlock_password: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="For Premium access" />
           </div>
        </div>

        <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
           <div className="flex items-center gap-3">
              <input type="checkbox" checked={form.is_premium} onChange={e => setForm({...form, is_premium: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
              <span className="text-sm font-bold">Premium Material</span>
           </div>
           {form.is_premium && (
             <div className="flex items-center gap-2">
                <span className="text-[10px] font-black">₹</span>
                <input type="number" value={form.price} onChange={e => setForm({...form, price: e.target.value})} className="w-16 bg-transparent border-b border-indigo-500 text-center outline-none" />
             </div>
           )}
        </div>

        <button onClick={() => onSave(form)} className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all">
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
              <input type="text" value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="e.g. New Batch Starting!" />
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
              <input type="text" value={form.redirect_link} onChange={e => setForm({...form, redirect_link: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3" placeholder="Optional" />
           </div>

           <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                 <label className="text-[10px] text-gray-500 font-bold uppercase">Placement</label>
                 <select value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 outline-none">
                    <option value="home">Homepage</option>
                    <option value="landing">Landing Page</option>
                 </select>
              </div>
              <div className="space-y-1.5">
                 <label className="text-[10px] text-gray-500 font-bold uppercase">Status</label>
                 <div className="flex items-center gap-2 mt-3 ml-2">
                    <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} className="w-5 h-5 accent-indigo-600" />
                    <span className="text-xs font-bold">Active Banner</span>
                 </div>
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
