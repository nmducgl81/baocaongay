import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User } from '../types';
import { 
  Trash2, UserPlus, Save, X, Upload, Download, FileSpreadsheet, 
  Pencil, RefreshCw, CheckCircle, Settings, 
  CheckSquare, Square, Users, Shield, Search, FileUp, Plus, Camera
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User | User[]) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onClose: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onClose }) => {
  // State for Form Modal
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  
  // Initialize with DSA role by default
  const [formData, setFormData] = useState<Partial<User>>({ role: 'DSA' });
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Refs for file inputs
  const fileInputRef = useRef<HTMLInputElement>(null); // For CSV Import
  const avatarInputRef = useRef<HTMLInputElement>(null); // For Avatar Upload

  // Bulk Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkManagerId, setBulkManagerId] = useState<string>('');
  const [showBulkAction, setShowBulkAction] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Column Visibility State
  const [visibleColumns, setVisibleColumns] = useState({
    avatar: true,
    username: true,
    name: true,
    role: true,
    code: true,
    dss: true,
    sm: true
  });
  const [showColumnSettings, setShowColumnSettings] = useState(false);

  // Define who can manage users.
  const canManageUsers = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);

  // --- Logic to get list of available parents based on selected role & current user context ---
  const getAvailableParents = (targetRole: string | undefined) => {
    const role = targetRole || 'DSA'; 
    let candidates: User[] = [];

    if (role === 'DSA') {
        candidates = users.filter(u => u.role === 'DSS');
    } else if (role === 'DSS') {
        candidates = users.filter(u => u.role === 'SM');
    } else if (role === 'SM') {
        candidates = users.filter(u => u.role === 'RSM');
    } else if (role === 'RSM') {
        candidates = users.filter(u => u.role === 'ADMIN');
    }

    if (currentUser.role === 'SM') {
        if (role === 'DSS') {
            candidates = candidates.filter(u => u.id === currentUser.id);
        } else if (role === 'DSA') {
            candidates = candidates.filter(u => u.parentId === currentUser.id);
        }
    } else if (currentUser.role === 'DSS') {
        if (role === 'DSA') {
            candidates = candidates.filter(u => u.id === currentUser.id);
        }
    }

    return candidates.sort((a, b) => a.name.localeCompare(b.name));
  };

  const availableParents = useMemo(() => getAvailableParents(formData.role), [users, formData.role, currentUser]);

  useEffect(() => {
      if (availableParents.length === 1 && !formData.parentId && !isEditing) {
          setFormData(prev => ({ ...prev, parentId: availableParents[0].id }));
      }
  }, [availableParents, formData.parentId, isEditing]);

  const parentLabel = useMemo(() => {
     const role = formData.role || 'DSA';
     if (role === 'DSA') return 'Thuộc quản lý của DSS (Chọn DSS)';
     if (role === 'DSS') return 'Thuộc quản lý của SM (Chọn SM)';
     if (role === 'SM') return 'Thuộc quản lý của RSM';
     return 'Người quản lý trực tiếp';
  }, [formData.role]);

  // Filter Users for Table
  const filteredUsers = useMemo(() => {
      return users.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.dsaCode && u.dsaCode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [users, searchTerm]);

  // --- Handlers ---

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setAvatarPreview(base64);
        setFormData(prev => ({ ...prev, avatar: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = (e: React.MouseEvent) => {
    e.preventDefault();
    setAvatarPreview(null);
    setFormData(prev => ({ ...prev, avatar: undefined }));
    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  };

  const handleSave = () => {
    if (!formData.username || !formData.name) {
        alert("Vui lòng nhập Tên đăng nhập và Họ tên");
        return;
    }

    if (isEditing && formData.id) {
        onUpdateUser(formData as User);
        resetForm();
    } else {
        if (users.some(u => u.username === formData.username)) {
            alert("Tên đăng nhập đã tồn tại!");
            return;
        }

        onAddUser({
            ...formData,
            role: formData.role || 'DSA',
            id: Math.random().toString(36).substr(2, 9),
        } as User);
        resetForm();
    }
  };

  const openAddForm = () => {
      setFormData({ role: 'DSA', username: '', name: '', dsaCode: '', parentId: '' });
      setAvatarPreview(null);
      setIsEditing(false);
      setShowForm(true);
  };

  const openEditForm = (user: User) => {
    setFormData({ ...user });
    setAvatarPreview(user.avatar || null);
    setIsEditing(true);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ role: 'DSA', username: '', name: '', dsaCode: '', parentId: '' });
    setAvatarPreview(null);
    setIsEditing(false);
    setShowForm(false);
  };

  // --- BULK ACTIONS ---

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredUsers.length) {
      setSelectedIds(new Set());
    } else {
      const allIds = new Set(filteredUsers.map(u => u.id));
      setSelectedIds(allIds);
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleBulkDelete = () => {
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedIds.size} nhân viên đã chọn?`)) {
      selectedIds.forEach(id => onDeleteUser(id));
      setSelectedIds(new Set());
    }
  };

  const handleBulkAssign = () => {
     if (!bulkManagerId) {
       alert("Vui lòng chọn người quản lý mới!");
       return;
     }
     selectedIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user) {
          onUpdateUser({ ...user, parentId: bulkManagerId });
        }
     });
     alert(`Đã cập nhật quản lý cho ${selectedIds.size} nhân viên.`);
     setSelectedIds(new Set());
     setShowBulkAction(false);
     setBulkManagerId('');
  };

  // --- SMART IMPORT LOGIC ---

  const downloadTemplate = () => {
    const headers = "Username (Bat buoc),Ho Va Ten (Bat buoc),Chuc Vu (DSA/DSS/SM),Ma Code (DSA Code),Username Quan Ly (VD: dss_qua)";
    const example1 = "nguyenvana,Nguyen Van A,DSA,DA001,dss_qua";
    const example2 = "dss_moi,Le Thi B,DSS,,sm_region1";
    const csvContent = "\uFEFF" + headers + "\n" + example1 + "\n" + example2;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_nhap_lieu_nhan_su.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split('\n');
      
      const newUsers: User[] = [];
      const usersToUpdate: User[] = [];
      let skippedCount = 0;

      const userMap = new Map<string, User>();
      users.forEach(u => userMap.set(u.username.toLowerCase(), u));
      const parentResolutionQueue: { userRef: User, managerUsername: string }[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        const parts = line.split(',');
        if (parts.length >= 2) {
          const username = parts[0]?.trim();
          const name = parts[1]?.trim();
          const roleRaw = parts[2]?.trim().toUpperCase();
          const dsaCode = parts[3]?.trim();
          const managerUsername = parts[4]?.trim();

          const role = ['DSA', 'DSS', 'SM', 'RSM', 'ADMIN'].includes(roleRaw) ? roleRaw as any : 'DSA';

          if (username && name) {
             const existingUser = userMap.get(username.toLowerCase());
             let userObj: User;

             if (existingUser) {
                userObj = { ...existingUser, name, role, dsaCode: dsaCode || existingUser.dsaCode };
                usersToUpdate.push(userObj);
             } else {
                userObj = {
                    id: Math.random().toString(36).substr(2, 9),
                    username, name, role, dsaCode: dsaCode || undefined, parentId: undefined 
                };
                newUsers.push(userObj);
                userMap.set(username.toLowerCase(), userObj);
             }

             if (managerUsername) {
                 parentResolutionQueue.push({ userRef: userObj, managerUsername });
             }
          } else {
              skippedCount++;
          }
        }
      }

      parentResolutionQueue.forEach(({ userRef, managerUsername }) => {
          const manager = userMap.get(managerUsername.toLowerCase());
          if (manager) userRef.parentId = manager.id;
      });
      
      if (newUsers.length > 0) onAddUser(newUsers);
      if (usersToUpdate.length > 0) usersToUpdate.forEach(u => onUpdateUser(u));

      alert(`Hoàn tất!\n- Thêm mới: ${newUsers.length}\n- Cập nhật: ${usersToUpdate.length}\n- Bỏ qua (lỗi): ${skippedCount}`);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowImport(false);
    };
    reader.readAsText(file);
  };

  const getHierarchyInfo = (user: User) => {
      let dssName = '-';
      let smName = '-';
      if (user.role === 'DSA') {
          const dss = users.find(u => u.id === user.parentId);
          dssName = dss ? dss.name : '-';
          if (dss && dss.parentId) {
              const sm = users.find(u => u.id === dss.parentId);
              smName = sm ? sm.name : '-';
          }
      } else if (user.role === 'DSS') {
          dssName = 'Chính mình';
          const sm = users.find(u => u.id === user.parentId);
          smName = sm ? sm.name : '-';
      } else if (user.role === 'SM') {
          smName = 'Chính mình';
      }
      return { dssName, smName };
  };

  const allManagers = useMemo(() => {
     return users.filter(u => ['DSS', 'SM', 'RSM'].includes(u.role));
  }, [users]);

  return (
    <div className="bg-white rounded-xl shadow-2xl border-t-4 border-emerald-600 p-6 max-w-7xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4">
      {/* HEADER & MAIN ACTIONS */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-emerald-100 gap-4">
         <div className="flex items-center space-x-3 w-full md:w-auto">
             <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                <Shield size={28} />
             </div>
             <div>
                 <h2 className="text-xl font-bold text-emerald-950">Quản lý nhân sự</h2>
                 <p className="text-sm text-emerald-600 font-medium">Hệ thống phân quyền & tổ chức (Full Screen)</p>
             </div>
         </div>
         
         <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            {/* Search */}
            <div className="relative flex-1 md:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500"/>
                <input 
                    type="text" 
                    placeholder="Tìm kiếm..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-white border border-emerald-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 w-full outline-none"
                />
            </div>

            {/* Import Button */}
             <button 
                onClick={() => setShowImport(true)}
                className="p-2 text-emerald-700 bg-white border border-emerald-200 hover:bg-emerald-50 rounded-lg transition-colors"
                title="Import Excel"
            >
                <FileUp size={20} />
            </button>

            {/* Add Button */}
            <button 
                onClick={openAddForm}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold text-sm shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:-translate-y-0.5"
            >
                <Plus size={18} className="mr-2" /> Thêm Mới
            </button>

             <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
         </div>
      </div>

      {/* TOOLBAR: FILTERS & BULK ACTIONS */}
      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2">
                 <span className="text-sm font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                    Tổng: {filteredUsers.length}
                </span>

                {/* Column Settings */}
                <div className="relative">
                    <button onClick={() => setShowColumnSettings(!showColumnSettings)} className="p-1.5 bg-white border border-emerald-200 rounded text-emerald-600 hover:bg-emerald-50" title="Cài đặt cột">
                        <Settings size={16} />
                    </button>
                    {showColumnSettings && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-emerald-100 shadow-xl rounded-xl z-20 p-3 text-sm animate-in fade-in zoom-in-95">
                            <div className="font-bold mb-2 border-b border-emerald-100 pb-2 text-emerald-800">Hiển thị cột</div>
                            {Object.keys(visibleColumns).map(key => (
                                <label key={key} className="flex items-center p-2 hover:bg-emerald-50 rounded cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={(visibleColumns as any)[key]} 
                                        onChange={() => setVisibleColumns(prev => ({...prev, [key]: !(prev as any)[key]}))}
                                        className="mr-3 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300"
                                    />
                                    <span className="capitalize text-gray-700">{key === 'dss' ? 'Thuộc DSS' : key === 'sm' ? 'Thuộc SM' : key}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Action Bar */}
            {selectedIds.size > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center shadow-sm animate-in fade-in slide-in-from-right-2">
                    <CheckCircle size={16} className="mr-2 text-emerald-600"/>
                    <span className="font-bold text-emerald-900 text-sm mr-4">{selectedIds.size} chọn</span>
                    
                    {showBulkAction ? (
                        <div className="flex items-center space-x-2">
                            <select 
                            className="text-xs border border-emerald-300 rounded p-1 w-40 bg-white focus:ring-emerald-500"
                            value={bulkManagerId}
                            onChange={e => setBulkManagerId(e.target.value)}
                            >
                                <option value="">-- Chọn Quản Lý --</option>
                                {allManagers.map(m => (
                                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                                ))}
                            </select>
                            <button onClick={handleBulkAssign} className="bg-emerald-600 text-white px-2 py-1 rounded text-xs hover:bg-emerald-700">Lưu</button>
                            <button onClick={() => setShowBulkAction(false)} className="text-gray-400 hover:text-red-500"><X size={16}/></button>
                        </div>
                    ) : (
                        <div className="flex space-x-2">
                            <button onClick={() => setShowBulkAction(true)} className="text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded text-xs font-bold flex items-center">
                                <Users size={14} className="mr-1"/> Phân quyền
                            </button>
                            <button onClick={handleBulkDelete} className="text-red-600 hover:bg-red-50 px-2 py-1 rounded text-xs font-bold flex items-center">
                                <Trash2 size={14} className="mr-1"/> Xóa
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-gray-600 ml-2"><X size={14}/></button>
                        </div>
                    )}
                </div>
            )}
      </div>

      {/* FULL WIDTH TABLE */}
      <div className="bg-white border border-emerald-100 rounded-xl shadow-sm overflow-hidden flex flex-col h-[65vh]">
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1">
            <table className="w-full text-sm text-left relative">
                <thead className="bg-emerald-100 text-emerald-900 font-bold sticky top-0 z-10 shadow-sm uppercase text-xs tracking-wider">
                <tr>
                    <th className="p-4 w-12 text-center border-b border-emerald-200">
                        <button onClick={toggleSelectAll} className="hover:text-emerald-700 transition-colors">
                            {selectedIds.size > 0 && selectedIds.size === filteredUsers.length ? <CheckSquare size={18}/> : <Square size={18}/>}
                        </button>
                    </th>
                    {visibleColumns.avatar && <th className="p-4 w-16 border-b border-emerald-200">Ảnh</th>}
                    {visibleColumns.username && <th className="p-4 min-w-[150px] border-b border-emerald-200">Username</th>}
                    {visibleColumns.name && <th className="p-4 min-w-[200px] border-b border-emerald-200">Tên hiển thị</th>}
                    {visibleColumns.role && <th className="p-4 w-32 border-b border-emerald-200">Chức vụ</th>}
                    {visibleColumns.code && <th className="p-4 w-32 border-b border-emerald-200">Code</th>}
                    {visibleColumns.dss && <th className="p-4 min-w-[180px] border-l border-b border-emerald-200">Trực thuộc DSS</th>}
                    {visibleColumns.sm && <th className="p-4 min-w-[150px] border-l border-b border-emerald-200">Trực thuộc SM</th>}
                    <th className="p-4 text-right w-24 border-b border-emerald-200">Thao tác</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50">
                {filteredUsers.map((u, idx) => {
                    const { dssName, smName } = getHierarchyInfo(u);
                    const isSelected = selectedIds.has(u.id);
                    
                    return (
                    <tr key={u.id} className={`transition-all duration-200 group ${isSelected ? 'bg-emerald-50/60' : 'bg-white hover:bg-emerald-50/30'}`}>
                        <td className="p-4 text-center">
                            <button onClick={() => toggleSelectRow(u.id)} className={`${isSelected ? 'text-emerald-600' : 'text-emerald-200 hover:text-emerald-500'}`}>
                                {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </button>
                        </td>
                        {visibleColumns.avatar && (
                           <td className="p-4">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-emerald-100" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-xs">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                           </td>
                        )}
                        {visibleColumns.username && <td className="p-4 font-semibold text-gray-800">{u.username}</td>}
                        {visibleColumns.name && <td className="p-4 font-bold text-emerald-900">{u.name}</td>}
                        {visibleColumns.role && (
                            <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-md text-xs border font-bold shadow-sm ${u.role === 'ADMIN' ? 'bg-white text-red-700 border-red-200' : u.role === 'SM' ? 'bg-white text-blue-700 border-blue-200' : u.role === 'DSS' ? 'bg-white text-purple-700 border-purple-200' : 'bg-white text-gray-600 border-gray-200'}`}>
                                    {u.role}
                                </span>
                            </td>
                        )}
                        {visibleColumns.code && <td className="p-4 text-gray-500 font-mono text-xs">{u.dsaCode || '-'}</td>}
                        {visibleColumns.dss && <td className="p-4 text-purple-700 font-medium text-xs border-l border-emerald-50">{dssName}</td>}
                        {visibleColumns.sm && <td className="p-4 text-blue-700 font-medium text-xs border-l border-emerald-50">{smName}</td>}

                        <td className="p-4 text-right">
                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canManageUsers && u.role !== 'ADMIN' && (
                                    <>
                                        <button 
                                            onClick={() => openEditForm(u)} 
                                            className="p-2 rounded-lg bg-white border border-emerald-200 text-emerald-600 hover:bg-emerald-50 shadow-sm"
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                if (window.confirm(`Xóa ${u.name}?`)) onDeleteUser(u.id);
                                            }} 
                                            className="p-2 rounded-lg bg-white border border-red-200 text-red-500 hover:bg-red-50 shadow-sm" 
                                            title="Xóa"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                    );
                })}
                {filteredUsers.length === 0 && (
                    <tr>
                        <td colSpan={10} className="p-12 text-center text-gray-400 italic bg-white">
                            <Users size={48} className="mx-auto text-emerald-100 mb-2"/>
                            Không tìm thấy nhân viên nào phù hợp.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
      </div>

      {/* --- MODAL: ADD / EDIT FORM --- */}
      {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100 max-h-[90vh] overflow-y-auto">
                   <div className={`p-4 flex items-center justify-between ${isEditing ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600'} text-white`}>
                        <div className="flex items-center font-bold text-lg">
                            {isEditing ? <Pencil size={20} className="mr-2"/> : <UserPlus size={20} className="mr-2"/>}
                            {isEditing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                        </div>
                        <button onClick={resetForm} className="text-white/80 hover:text-white bg-white/10 p-1 rounded-full"><X size={20}/></button>
                   </div>

                   <div className="p-6 space-y-5">
                       {/* Form Fields - White Backgrounds, Colored Borders */}
                       <div className="flex justify-center mb-4">
                          <div className="relative group cursor-pointer">
                             <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatarUpload" />
                             <label htmlFor="avatarUpload" className="cursor-pointer block">
                                {avatarPreview ? (
                                   <img src={avatarPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md" />
                                ) : (
                                   <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300">
                                      <Camera size={32} />
                                   </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                                   Đổi Ảnh
                                </div>
                             </label>
                             {avatarPreview && (
                                <button 
                                    onClick={handleRemoveAvatar}
                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 transition-colors z-10"
                                    title="Xóa ảnh"
                                >
                                    <X size={12} />
                                </button>
                             )}
                          </div>
                       </div>

                       <div>
                            <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1 block">Tên đăng nhập <span className="text-red-500">*</span></label>
                            <input 
                                className={`block w-full rounded-lg border p-3 text-sm outline-none transition-all ${isEditing ? 'bg-gray-50 text-gray-500 border-gray-200' : 'bg-white border-emerald-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50'}`}
                                value={formData.username || ''}
                                onChange={e => setFormData({...formData, username: e.target.value})}
                                readOnly={isEditing}
                                placeholder="VD: nguyenvan_a"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1 block">Họ và Tên <span className="text-red-500">*</span></label>
                            <input 
                                className="block w-full rounded-lg border border-emerald-200 p-3 text-sm bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 placeholder-gray-400 font-medium text-gray-800"
                                value={formData.name || ''}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="VD: Nguyễn Văn A"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1 block">Chức vụ</label>
                                <select 
                                    className="block w-full rounded-lg border border-emerald-200 p-3 text-sm bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 text-gray-800 font-medium"
                                    value={formData.role || 'DSA'} 
                                    onChange={e => setFormData({...formData, role: e.target.value as any, parentId: ''})}
                                >
                                    <option value="DSA">DSA (Sales)</option>
                                    <option value="DSS">DSS (Giám sát)</option>
                                    <option value="SM">SM (Quản lý)</option>
                                    <option value="RSM">RSM (Giám đốc)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-emerald-900 uppercase tracking-wide mb-1 block">DSA Code</label>
                                <input 
                                    className="block w-full rounded-lg border border-emerald-200 p-3 text-sm bg-white outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 placeholder-gray-400 font-mono"
                                    value={formData.dsaCode || ''}
                                    onChange={e => setFormData({...formData, dsaCode: e.target.value})}
                                    placeholder="DA..."
                                />
                            </div>
                        </div>

                        {['DSA', 'DSS', 'SM'].includes(formData.role || 'DSA') && (
                            <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                                <label className="text-xs font-bold text-purple-800 uppercase tracking-wide mb-2 block">{parentLabel}</label>
                                <select 
                                    className="block w-full rounded-lg border-purple-200 p-3 text-sm bg-white outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 text-gray-700"
                                    value={formData.parentId || ''}
                                    onChange={e => setFormData({...formData, parentId: e.target.value})}
                                >
                                    <option value="">-- Chọn quản lý trực tiếp --</option>
                                    {availableParents.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="pt-2 flex gap-3">
                             <button onClick={resetForm} className="flex-1 py-3 rounded-lg border border-gray-200 text-gray-600 font-bold hover:bg-gray-50 transition-colors">Hủy</button>
                             <button 
                                onClick={handleSave}
                                disabled={!canManageUsers}
                                className={`flex-[2] text-white rounded-lg py-3 text-sm font-bold shadow-lg flex items-center justify-center transition-all transform hover:scale-[1.02] active:scale-95 ${isEditing ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                                >
                                {isEditing ? 'Cập Nhật' : 'Lưu Nhân Viên'}
                            </button>
                        </div>
                   </div>
              </div>
          </div>
      )}

      {/* --- MODAL: IMPORT EXCEL --- */}
      {showImport && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                       <h3 className="font-bold text-lg text-emerald-800 flex items-center">
                           <FileSpreadsheet className="mr-2 text-emerald-600"/> Import Excel (CSV)
                       </h3>
                       <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                       <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                           Tải lên file CSV để thêm nhanh hoặc cập nhật nhân viên. Hệ thống tự động nhận diện theo <b>Username</b>.
                       </p>
                       
                       <div className="space-y-3">
                           <button onClick={downloadTemplate} className="w-full bg-white border border-emerald-200 text-emerald-700 rounded-lg p-3 text-sm font-bold hover:bg-emerald-50 transition-colors flex items-center justify-center">
                               <Download size={16} className="mr-2"/> Tải File Mẫu
                           </button>
                           
                           <div className="relative group">
                                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} disabled={!canManageUsers} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                                <button className="w-full bg-emerald-600 text-white rounded-lg p-3 text-sm font-bold group-hover:bg-emerald-700 transition-colors shadow-md flex items-center justify-center">
                                    <Upload size={16} className="mr-2"/> Chọn File & Tải Lên
                                </button>
                           </div>
                       </div>
                  </div>
              </div>
           </div>
      )}
    </div>
  );
};