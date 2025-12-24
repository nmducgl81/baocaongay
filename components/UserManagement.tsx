import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User } from '../types';
import { 
  Trash2, UserPlus, Save, X, Upload, Download, FileSpreadsheet, 
  Pencil, RefreshCw, CheckCircle, Settings, 
  CheckSquare, Square, Users, Shield, Search, FileUp, Plus, Camera,
  Wand2, Phone, GripVertical, AlertTriangle, Briefcase, User as UserIcon, Filter
} from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User | User[]) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onBulkDeleteUsers?: (ids: string[]) => void;
  onClose: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onBulkDeleteUsers, onClose }) => {
  const [showForm, setShowForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ 
    isOpen: boolean; 
    type: 'single' | 'bulk'; 
    data: any; 
    message?: string;
    subMessage?: string;
  } | null>(null);

  const [formData, setFormData] = useState<Partial<User>>({ role: 'DSA' });
  const [isEditing, setIsEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [autoGenUsername, setAutoGenUsername] = useState(true);
  
  const fileInputRef = useRef<HTMLInputElement>(null); 
  const avatarInputRef = useRef<HTMLInputElement>(null); 

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkManagerId, setBulkManagerId] = useState<string>('');
  const [showBulkAction, setShowBulkAction] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('ALL');
  const [filterManager, setFilterManager] = useState('');

  const [visibleColumns, setVisibleColumns] = useState({
    avatar: true,
    username: true,
    name: true,
    phone: true,
    role: true,
    code: true,
    dss: true,
    sm: true
  });
  
  const [colWidths, setColWidths] = useState<Record<string, number>>({
    checkbox: 50,
    avatar: 80,
    username: 150,
    name: 220,
    phone: 120,
    role: 120,
    code: 100,
    dss: 180,
    sm: 150,
    actions: 100
  });

  const [showColumnSettings, setShowColumnSettings] = useState(false);
  const resizingRef = useRef<{ startX: number, startWidth: number, colKey: string } | null>(null);
  const canAccessManagement = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);

  const scopedUsers = useMemo(() => {
    if (currentUser.role === 'ADMIN') return users;
    const parentMap = new Map<string, string[]>();
    users.forEach(u => {
        if (u.parentId) {
            const children = parentMap.get(u.parentId) || [];
            children.push(u.id);
            parentMap.set(u.parentId, children);
        }
    });
    const visibleIds = new Set<string>();
    const queue = [currentUser.id];
    visibleIds.add(currentUser.id);
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = parentMap.get(currentId) || [];
        children.forEach(childId => {
            if (!visibleIds.has(childId)) {
                visibleIds.add(childId);
                queue.push(childId);
            }
        });
    }
    return users.filter(u => visibleIds.has(u.id));
  }, [users, currentUser]);

  const getAvailableParents = (targetRole: string | undefined) => {
    const role = targetRole || 'DSA'; 
    let candidates: User[] = [];
    if (role === 'DSA') {
        candidates = scopedUsers.filter(u => u.role === 'DSS');
    } else if (role === 'DSS') {
        candidates = scopedUsers.filter(u => u.role === 'SM');
    } else if (role === 'SM') {
        candidates = scopedUsers.filter(u => u.role === 'RSM');
    } else if (role === 'RSM') {
        candidates = scopedUsers.filter(u => u.role === 'ADMIN');
    }
    if (currentUser.role === 'SM') {
        if (role === 'DSA') {
            const myDSS = scopedUsers.filter(u => u.role === 'DSS');
            candidates = [currentUser, ...myDSS];
        }
    } else if (currentUser.role === 'DSS') {
        if (role === 'DSA') {
            candidates = [currentUser];
        }
    }
    return candidates.sort((a, b) => a.name.localeCompare(b.name));
  };

  const availableParents = useMemo(() => getAvailableParents(formData.role), [scopedUsers, formData.role, currentUser]);

  useEffect(() => {
      if (availableParents.length === 1 && !formData.parentId && !isEditing) {
          setFormData(prev => ({ ...prev, parentId: availableParents[0].id }));
      }
  }, [availableParents, formData.parentId, isEditing]);

  const generateAutoUsername = (name: string, role: string, code?: string) => {
    if (role === 'DSA' && code) {
        return code.trim().toUpperCase();
    }
    if (['DSS', 'SM', 'RSM', 'ADMIN'].includes(role) && name) {
        return name.normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/đ/g, "d").replace(/Đ/g, "D")
          .replace(/[^a-zA-Z0-9]/g, "")
          .toLowerCase();
    }
    return '';
  };

  useEffect(() => {
    if (showForm && !isEditing && autoGenUsername) {
        const newUsername = generateAutoUsername(formData.name || '', formData.role || 'DSA', formData.dsaCode);
        if (newUsername) {
            setFormData(prev => ({ ...prev, username: newUsername }));
        }
    }
  }, [formData.name, formData.role, formData.dsaCode, showForm, isEditing, autoGenUsername]);


  const parentLabel = useMemo(() => {
     const role = formData.role || 'DSA';
     if (role === 'DSA') return 'Thuộc quản lý của (DSS/SM)';
     if (role === 'DSS') return 'Thuộc quản lý của SM (Chọn SM)';
     if (role === 'SM') return 'Thuộc quản lý của RSM';
     return 'Người quản lý trực tiếp';
  }, [formData.role]);

  const filteredUsers = useMemo(() => {
      const term = searchTerm.toLowerCase();
      const managerTerm = filterManager.toLowerCase();
      return scopedUsers.filter(u => {
        const matchesText = u.name.toLowerCase().includes(term) || 
                            u.username.toLowerCase().includes(term) ||
                            (u.dsaCode && u.dsaCode.toLowerCase().includes(term));
        const matchesRole = filterRole === 'ALL' || u.role === filterRole;
        let matchesManager = true;
        if (managerTerm) {
            const manager = users.find(parent => parent.id === u.parentId); 
            matchesManager = manager ? manager.name.toLowerCase().includes(managerTerm) : false;
        }
        return matchesText && matchesRole && matchesManager;
      });
  }, [scopedUsers, users, searchTerm, filterRole, filterManager]);

  const isDescendant = (targetUser: User): boolean => {
      if (targetUser.id === currentUser.id) return false;
      return scopedUsers.some(u => u.id === targetUser.id);
  };

  const canDeleteUser = (targetUser: User) => {
      if (currentUser.role === 'ADMIN') {
          return targetUser.id !== currentUser.id;
      }
      if (['RSM', 'SM', 'DSS'].includes(currentUser.role)) {
          return isDescendant(targetUser);
      }
      return false;
  };

  const handleResizeStart = (e: React.MouseEvent, colKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
        startX: e.pageX,
        startWidth: colWidths[colKey] || 100,
        colKey: colKey
    };
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'col-resize';
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingRef.current) return;
    const { startX, startWidth, colKey } = resizingRef.current;
    const diff = e.pageX - startX;
    const newWidth = Math.max(50, startWidth + diff); 
    
    setColWidths(prev => ({
        ...prev,
        [colKey]: newWidth
    }));
  };

  const handleResizeEnd = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    document.body.style.cursor = 'default';
  };

  const cleanUser = (user: any): User => {
    const cleaned: any = {};
    Object.keys(user).forEach(key => {
        if (user[key] !== undefined) {
             cleaned[key] = user[key];
        }
    });
    return cleaned as User;
  };

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Aggressive compression logic
                const MAX_WIDTH = 400; // Reduced from 800px to 400px
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                    // Quality 0.5 for high compression
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
                    resolve(dataUrl);
                } else {
                    reject(new Error("Canvas context failed"));
                }
            };
            img.onerror = () => reject(new Error("Image loading failed"));
        };
        reader.onerror = () => reject(new Error("File reading failed"));
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessingImage(true);
      try {
        const compressedBase64 = await compressImage(file);
        setAvatarPreview(compressedBase64);
        setFormData(prev => ({ ...prev, avatar: compressedBase64 }));
      } catch (error) {
        console.error("Image compression failed:", error);
        alert("Lỗi khi xử lý ảnh. Vui lòng thử ảnh khác.");
      } finally {
        setIsProcessingImage(false);
      }
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
    if (!formData.name) {
        alert("Vui lòng nhập Họ tên");
        return;
    }

    let finalUsername = formData.username;
    if (formData.role === 'DSA' && formData.dsaCode) {
        finalUsername = formData.dsaCode.trim().toUpperCase();
    } else if (!finalUsername) {
        alert("Vui lòng nhập Tên đăng nhập");
        return;
    }

    const existingUser = users.find(u => u.username === finalUsername);
    if (existingUser && (!isEditing || existingUser.id !== formData.id)) {
        alert(`Tên đăng nhập '${finalUsername}' đã tồn tại!`);
        return;
    }

    const userPayload: any = {
        ...formData,
        username: finalUsername, 
        role: formData.role || 'DSA',
    };

    if (isEditing && formData.id) {
        onUpdateUser(cleanUser(userPayload));
        resetForm();
    } else {
        userPayload.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
        onAddUser(cleanUser(userPayload));
        resetForm();
    }
  };

  const openAddForm = () => {
      setFormData({ role: 'DSA', username: '', name: '', dsaCode: '', parentId: '', phoneNumber: '' });
      setAvatarPreview(null);
      setIsEditing(false);
      setAutoGenUsername(true); 
      setShowForm(true);
  };

  const openEditForm = (user: User) => {
    setFormData({ ...user });
    setAvatarPreview(user.avatar || null);
    setIsEditing(true);
    setAutoGenUsername(false); 
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ role: 'DSA', username: '', name: '', dsaCode: '', parentId: '', phoneNumber: '' });
    setAvatarPreview(null);
    setIsEditing(false);
    setShowForm(false);
  };

  const initiateSingleDelete = (user: User) => {
      setDeleteConfirm({
          isOpen: true,
          type: 'single',
          data: user.id,
          message: `Bạn có chắc chắn muốn xóa nhân viên "${user.name}"?`,
          subMessage: 'Hành động này không thể hoàn tác. Dữ liệu liên quan có thể bị ảnh hưởng.'
      });
  };

  const initiateBulkDelete = () => {
      const allowedIds = Array.from(selectedIds).filter(id => {
          const target = users.find(u => u.id === id);
          return target && canDeleteUser(target);
      });

      if (allowedIds.length === 0) {
          alert("Bạn không có quyền xóa bất kỳ người dùng nào đã chọn (chỉ được xóa nhân sự cấp dưới trực tiếp hoặc gián tiếp).");
          return;
      }

      const skippedCount = selectedIds.size - allowedIds.length;
      let subMsg = '';
      if (skippedCount > 0) {
          subMsg = `(Lưu ý: ${skippedCount} nhân viên không thuộc quyền quản lý của bạn sẽ bị bỏ qua)`;
      }

      setDeleteConfirm({
          isOpen: true,
          type: 'bulk',
          data: allowedIds,
          message: `Bạn có chắc chắn muốn xóa ${allowedIds.length} nhân viên đã chọn?`,
          subMessage: subMsg
      });
  };

  const handleConfirmDelete = () => {
      if (!deleteConfirm) return;

      if (deleteConfirm.type === 'single') {
          onDeleteUser(deleteConfirm.data);
      } else if (deleteConfirm.type === 'bulk') {
          if (onBulkDeleteUsers) {
              onBulkDeleteUsers(deleteConfirm.data);
          } else {
              deleteConfirm.data.forEach((id: string) => onDeleteUser(id));
          }
          setSelectedIds(new Set());
      }
      setDeleteConfirm(null);
  };

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

  const handleBulkAssign = () => {
     if (!bulkManagerId) {
       alert("Vui lòng chọn người quản lý mới!");
       return;
     }
     const allowedIds = Array.from(selectedIds).filter(id => {
        const target = users.find(u => u.id === id);
        return target && canDeleteUser(target); 
     });

     if (allowedIds.length === 0) {
         alert("Bạn không có quyền thay đổi quản lý cho các user đã chọn.");
         return;
     }

     allowedIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user) {
          onUpdateUser(cleanUser({ ...user, parentId: bulkManagerId }));
        }
     });
     alert(`Đã cập nhật quản lý cho ${allowedIds.length} nhân viên.`);
     setSelectedIds(new Set());
     setShowBulkAction(false);
     setBulkManagerId('');
  };

  const downloadTemplate = () => {
    const headers = "Username (Bat buoc),Ho Va Ten (Bat buoc),Chuc Vu (DSA/DSS/SM),Ma Code (DSA Code),SDT (So Dien Thoai),Username Quan Ly";
    const example1 = "nguyenvana,Nguyen Van A,DSA,DA001,0901234567,dss_qua";
    const example2 = "dss_moi,Le Thi B,DSS,,0987654321,sm_region1";
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
          let username = parts[0]?.trim();
          const name = parts[1]?.trim();
          const roleRaw = parts[2]?.trim().toUpperCase();
          const dsaCode = parts[3]?.trim();
          const phone = parts[4]?.trim();
          const managerUsername = parts[5]?.trim();

          const role = ['DSA', 'DSS', 'SM', 'RSM', 'ADMIN'].includes(roleRaw) ? roleRaw as any : 'DSA';

          if (role === 'DSA' && dsaCode) {
              username = dsaCode.trim().toUpperCase();
          }

          if (username && name) {
             const existingUser = userMap.get(username.toLowerCase());
             
             if (existingUser) {
                const updatedFields: any = { name, role };
                if (dsaCode) updatedFields.dsaCode = dsaCode;
                if (phone) updatedFields.phoneNumber = phone;
                
                const userObj = { ...existingUser, ...updatedFields };
                if (role === 'DSA' && dsaCode) {
                    userObj.username = dsaCode.trim().toUpperCase();
                }

                usersToUpdate.push(cleanUser(userObj));
             } else {
                const userObj: any = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2, 9), 
                    username, 
                    name, 
                    role
                };
                if (dsaCode) userObj.dsaCode = dsaCode;
                if (phone) userObj.phoneNumber = phone;

                newUsers.push(userObj); 
                userMap.set(username.toLowerCase(), userObj);
             }

             if (managerUsername) {
                 const refUser = newUsers.find(u => u.username.toLowerCase() === username.toLowerCase());
                 if (refUser) {
                     parentResolutionQueue.push({ userRef: refUser, managerUsername });
                 } else {
                     const existingUpdate = usersToUpdate.find(u => u.username.toLowerCase() === username.toLowerCase());
                     if (existingUpdate) {
                         parentResolutionQueue.push({ userRef: existingUpdate, managerUsername });
                     }
                 }
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
      
      const cleanNewUsers = newUsers.map(u => cleanUser(u));

      if (cleanNewUsers.length > 0) onAddUser(cleanNewUsers);
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
     return scopedUsers.filter(u => ['DSS', 'SM', 'RSM'].includes(u.role));
  }, [scopedUsers]);

  const ResizableHeader = ({ colKey, label, children }: { colKey: string, label?: string, children?: React.ReactNode }) => (
    <th 
        className="p-4 border-b border-emerald-200 dark:border-emerald-800 relative group select-none bg-emerald-100 dark:bg-emerald-900/50 text-emerald-900 dark:text-emerald-300 font-bold uppercase text-xs tracking-wider"
        style={{ width: colWidths[colKey], minWidth: colWidths[colKey] }}
    >
        <div className="flex items-center justify-between h-full">
            <span className="truncate w-full">{label || children}</span>
        </div>
        <div 
            className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-emerald-400 z-20 transition-colors opacity-0 group-hover:opacity-100"
            onMouseDown={(e) => handleResizeStart(e, colKey)}
        />
    </th>
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border-t-4 border-emerald-600 p-6 max-w-7xl mx-auto mt-6 animate-in fade-in slide-in-from-bottom-4 transition-colors duration-300 relative">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 pb-4 border-b border-emerald-100 dark:border-emerald-900 gap-4">
         <div className="flex items-center space-x-3 w-full md:w-auto">
             <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded-lg text-emerald-700 dark:text-emerald-400">
                <Shield size={28} />
             </div>
             <div>
                 <h2 className="text-xl font-bold text-emerald-950 dark:text-emerald-100">Quản lý nhân sự</h2>
                 <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Hệ thống phân quyền & tổ chức</p>
             </div>
         </div>
         
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
             <button 
                onClick={() => setShowImport(true)}
                className="p-2 text-emerald-700 dark:text-emerald-400 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                title="Import Excel"
            >
                <FileUp size={20} />
            </button>

            <button 
                onClick={openAddForm}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-lg font-bold text-sm shadow-md hover:from-emerald-700 hover:to-teal-700 transition-all transform hover:-translate-y-0.5"
            >
                <Plus size={18} className="mr-2" /> Thêm Mới
            </button>

             <button onClick={onClose} className="p-2 text-gray-400 hover:text-red-500 rounded-full transition-colors"><X size={24}/></button>
         </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 border border-gray-100 dark:border-gray-700 rounded-lg p-3 mb-4 flex flex-col md:flex-row gap-3 items-center">
         <div className="flex items-center text-sm font-bold text-gray-500 dark:text-gray-400 mr-2 flex-shrink-0">
             <Filter size={16} className="mr-1"/> Bộ lọc:
         </div>
         
         <div className="relative flex-1 w-full md:max-w-xs">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input 
                type="text" 
                placeholder="Tìm Tên / Code / Username..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 w-full outline-none text-slate-800 dark:text-gray-200 shadow-sm placeholder-gray-400 dark:placeholder-gray-500"
            />
         </div>

         <div className="relative w-full md:w-40">
            <select 
                value={filterRole}
                onChange={e => setFilterRole(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 outline-none text-slate-800 dark:text-gray-200 shadow-sm appearance-none"
            >
                <option value="ALL">Tất cả chức vụ</option>
                <option value="DSA">DSA</option>
                <option value="DSS">DSS</option>
                <option value="SM">SM</option>
                <option value="RSM">RSM</option>
                <option value="ADMIN">ADMIN</option>
            </select>
            <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"/>
         </div>

         <div className="relative w-full md:max-w-xs">
            <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input 
                type="text" 
                placeholder="Tìm theo Quản Lý (DSS/SM)..." 
                value={filterManager}
                onChange={e => setFilterManager(e.target.value)}
                className="pl-9 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-emerald-400 w-full outline-none text-slate-800 dark:text-gray-200 shadow-sm placeholder-gray-400 dark:placeholder-gray-500"
            />
         </div>
         
         {(searchTerm || filterRole !== 'ALL' || filterManager) && (
            <button 
                onClick={() => { setSearchTerm(''); setFilterRole('ALL'); setFilterManager(''); }}
                className="text-xs text-red-500 font-bold hover:underline whitespace-nowrap"
            >
                Xóa lọc
            </button>
         )}
      </div>

      <div className="flex flex-wrap items-center justify-between mb-4 gap-3">
            <div className="flex items-center gap-2">
                 <span className="text-sm font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
                    Kết quả: {filteredUsers.length}
                </span>

                <div className="relative">
                    <button onClick={() => setShowColumnSettings(!showColumnSettings)} className="p-1.5 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 rounded text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" title="Cài đặt cột">
                        <Settings size={16} />
                    </button>
                    {showColumnSettings && (
                        <div className="absolute top-full left-0 mt-2 w-56 bg-white dark:bg-gray-700 border border-emerald-100 dark:border-emerald-900 shadow-xl rounded-xl z-20 p-3 text-sm animate-in fade-in zoom-in-95">
                            <div className="font-bold mb-2 border-b border-emerald-100 dark:border-emerald-900 pb-2 text-emerald-800 dark:text-emerald-300">Hiển thị cột</div>
                            {Object.keys(visibleColumns).map(key => (
                                <label key={key} className="flex items-center p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded cursor-pointer transition-colors">
                                    <input 
                                        type="checkbox" 
                                        checked={(visibleColumns as any)[key]} 
                                        onChange={() => setVisibleColumns(prev => ({...prev, [key]: !(prev as any)[key]}))}
                                        className="mr-3 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 dark:bg-gray-800"
                                    />
                                    <span className="capitalize text-gray-700 dark:text-gray-300">{key === 'dss' ? 'Thuộc DSS' : key === 'sm' ? 'Thuộc SM' : key === 'phone' ? 'Số ĐT' : key}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {selectedIds.size > 0 && (
                <div className="bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-3 py-1.5 rounded-lg flex items-center shadow-sm animate-in fade-in slide-in-from-right-2">
                    <CheckCircle size={16} className="mr-2 text-emerald-600 dark:text-emerald-400"/>
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 text-sm mr-4">{selectedIds.size} chọn</span>
                    
                    {showBulkAction ? (
                        <div className="flex items-center space-x-2">
                            <select 
                            className="text-xs border border-emerald-300 dark:border-emerald-700 rounded p-1 w-40 bg-white dark:bg-gray-800 dark:text-gray-200 focus:ring-emerald-500"
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
                            <button onClick={() => setShowBulkAction(true)} className="text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-2 py-1 rounded text-xs font-bold flex items-center">
                                <Users size={14} className="mr-1"/> Phân quyền
                            </button>
                            <button onClick={initiateBulkDelete} className="text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 px-2 py-1 rounded text-xs font-bold flex items-center">
                                <Trash2 size={14} className="mr-1"/> Xóa
                            </button>
                            <button onClick={() => setSelectedIds(new Set())} className="text-gray-400 hover:text-gray-600 ml-2"><X size={14}/></button>
                        </div>
                    )}
                </div>
            )}
      </div>

      <div className="bg-white dark:bg-gray-800 border border-emerald-100 dark:border-emerald-900 rounded-xl shadow-sm overflow-hidden flex flex-col h-[65vh]">
            <div className="overflow-x-auto overflow-y-auto custom-scrollbar flex-1 relative">
            <table className="text-sm text-left relative table-fixed" style={{ width: 'max-content' }}>
                <thead className="bg-emerald-100 dark:bg-emerald-900/50 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="p-4 text-center border-b border-emerald-200 dark:border-emerald-800" style={{ width: colWidths.checkbox }}>
                        <button onClick={toggleSelectAll} className="hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors">
                            {selectedIds.size > 0 && selectedIds.size === filteredUsers.length ? <CheckSquare size={18}/> : <Square size={18}/>}
                        </button>
                    </th>
                    {visibleColumns.avatar && <ResizableHeader colKey="avatar" label="Ảnh" />}
                    {visibleColumns.username && <ResizableHeader colKey="username" label="Username" />}
                    {visibleColumns.name && <ResizableHeader colKey="name" label="Tên hiển thị" />}
                    {visibleColumns.phone && <ResizableHeader colKey="phone" label="Số ĐT" />}
                    {visibleColumns.role && <ResizableHeader colKey="role" label="Chức vụ" />}
                    {visibleColumns.code && <ResizableHeader colKey="code" label="Code" />}
                    {visibleColumns.dss && <ResizableHeader colKey="dss" label="Trực thuộc DSS" />}
                    {visibleColumns.sm && <ResizableHeader colKey="sm" label="Trực thuộc SM" />}
                    <ResizableHeader colKey="actions" label="Thao tác" />
                </tr>
                </thead>
                <tbody className="divide-y divide-emerald-50 dark:divide-emerald-900/30">
                {filteredUsers.map((u, idx) => {
                    const { dssName, smName } = getHierarchyInfo(u);
                    const isSelected = selectedIds.has(u.id);
                    
                    return (
                    <tr key={u.id} className={`transition-all duration-200 group ${isSelected ? 'bg-emerald-50/60 dark:bg-emerald-900/40' : 'bg-white dark:bg-gray-800 hover:bg-emerald-50/30 dark:hover:bg-emerald-900/20'}`}>
                        <td className="p-4 text-center truncate">
                            <button onClick={() => toggleSelectRow(u.id)} className={`${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-emerald-200 dark:text-emerald-800 hover:text-emerald-500 dark:hover:text-emerald-400'}`}>
                                {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </button>
                        </td>
                        {visibleColumns.avatar && (
                           <td className="p-4">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-10 h-10 rounded-full object-cover border border-emerald-100 dark:border-emerald-800" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-xs">
                                  {u.name.charAt(0)}
                                </div>
                              )}
                           </td>
                        )}
                        {visibleColumns.username && <td className="p-4 font-semibold text-gray-800 dark:text-gray-200 truncate" title={u.username}>{u.username}</td>}
                        {visibleColumns.name && <td className="p-4 font-bold text-emerald-900 dark:text-emerald-300 truncate" title={u.name}>{u.name}</td>}
                        {visibleColumns.phone && <td className="p-4 text-gray-700 dark:text-gray-400 font-mono text-xs truncate">{u.phoneNumber || '-'}</td>}
                        {visibleColumns.role && (
                            <td className="p-4 truncate">
                                <span className={`px-2.5 py-1 rounded-md text-xs border font-bold shadow-sm ${u.role === 'ADMIN' ? 'bg-white dark:bg-gray-700 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' : u.role === 'SM' ? 'bg-white dark:bg-gray-700 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' : u.role === 'DSS' ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800' : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600'}`}>
                                    {u.role}
                                </span>
                            </td>
                        )}
                        {visibleColumns.code && <td className="p-4 text-gray-500 dark:text-gray-400 font-mono text-xs truncate">{u.dsaCode || '-'}</td>}
                        {visibleColumns.dss && <td className="p-4 text-purple-700 dark:text-purple-400 font-medium text-xs border-l border-emerald-50 dark:border-emerald-900/30 truncate" title={dssName}>{dssName}</td>}
                        {visibleColumns.sm && <td className="p-4 text-blue-700 dark:text-blue-400 font-medium text-xs border-l border-emerald-50 dark:border-emerald-900/30 truncate" title={smName}>{smName}</td>}

                        <td className="p-4 text-right">
                            <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {canAccessManagement && (
                                    <>
                                        <button 
                                            onClick={() => openEditForm(u)} 
                                            className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 shadow-sm"
                                            title="Chỉnh sửa"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        
                                        {canDeleteUser(u) && (
                                            <button 
                                                onClick={() => initiateSingleDelete(u)} 
                                                className="p-2 rounded-lg bg-white dark:bg-gray-700 border border-red-200 dark:border-red-800 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm" 
                                                title="Xóa"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        </td>
                    </tr>
                    );
                })}
                {filteredUsers.length === 0 && (
                    <tr>
                        <td colSpan={10} className="p-12 text-center text-gray-400 italic bg-white dark:bg-gray-800">
                            <Users size={48} className="mx-auto text-emerald-100 dark:text-emerald-900 mb-2"/>
                            Không tìm thấy nhân viên nào phù hợp với bộ lọc.
                        </td>
                    </tr>
                )}
                </tbody>
            </table>
            </div>
      </div>

      {deleteConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-red-100 dark:border-red-900">
                  <div className="bg-red-50 dark:bg-red-900/30 p-6 flex flex-col items-center text-center border-b border-red-100 dark:border-red-900">
                      <div className="bg-red-100 dark:bg-red-900/50 p-3 rounded-full mb-4">
                          <AlertTriangle className="text-red-600 dark:text-red-400" size={32} />
                      </div>
                      <h3 className="text-xl font-bold text-red-800 dark:text-red-300 mb-2">Xác nhận xóa dữ liệu?</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
                          {deleteConfirm.message}
                      </p>
                      {deleteConfirm.subMessage && (
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 font-medium bg-orange-50 dark:bg-orange-900/30 px-3 py-1 rounded-full border border-orange-100 dark:border-orange-800">
                              {deleteConfirm.subMessage}
                          </p>
                      )}
                  </div>
                  <div className="p-4 flex gap-3 bg-white dark:bg-gray-800">
                      <button 
                          onClick={() => setDeleteConfirm(null)} 
                          className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                          Hủy bỏ
                      </button>
                      <button 
                          onClick={handleConfirmDelete} 
                          className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold shadow-lg shadow-red-200 dark:shadow-none transition-all transform active:scale-95 flex items-center justify-center"
                      >
                          <Trash2 size={18} className="mr-2"/> Xóa ngay
                      </button>
                  </div>
              </div>
          </div>
      )}

      {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-emerald-900 max-h-[90vh] overflow-y-auto custom-scrollbar">
                   <div className={`p-4 flex items-center justify-between ${isEditing ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600'} text-white`}>
                        <div className="flex items-center font-bold text-lg">
                            {isEditing ? <Pencil size={20} className="mr-2"/> : <UserPlus size={20} className="mr-2"/>}
                            {isEditing ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
                        </div>
                        <button onClick={resetForm} className="text-white/80 hover:text-white bg-white/10 p-1 rounded-full"><X size={20}/></button>
                   </div>

                   <div className="p-6 space-y-5">
                       <div className="flex flex-col items-center mb-4">
                          <div className="relative group cursor-pointer mb-2">
                             <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" id="avatarUpload" />
                             <label htmlFor="avatarUpload" className="cursor-pointer block">
                                {avatarPreview ? (
                                   <img src={avatarPreview} alt="Preview" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-md" />
                                ) : (
                                   <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-300 dark:border-gray-600">
                                      {isProcessingImage ? <RefreshCw className="animate-spin" /> : <Camera size={32} />}
                                   </div>
                                )}
                                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-bold">
                                   Đổi Ảnh
                                </div>
                             </label>
                          </div>
                          
                          {avatarPreview && (
                            <button 
                                onClick={handleRemoveAvatar}
                                className="text-xs text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/30 px-3 py-1 rounded-full border border-red-200 dark:border-red-800 transition-colors"
                            >
                                Xóa ảnh
                            </button>
                          )}
                       </div>

                       <div>
                            <div className="flex justify-between items-center mb-1">
                                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide">Tên đăng nhập <span className="text-red-500">*</span></label>
                                {!isEditing && (
                                    <label className="flex items-center text-xs cursor-pointer text-emerald-600 dark:text-emerald-400 font-medium">
                                        <input 
                                            type="checkbox" 
                                            checked={autoGenUsername}
                                            onChange={() => setAutoGenUsername(!autoGenUsername)}
                                            className="mr-1 rounded text-emerald-500 focus:ring-emerald-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                                        />
                                        <Wand2 size={12} className="mr-1"/> Tự động tạo
                                    </label>
                                )}
                            </div>
                            <input 
                                className={`block w-full rounded-lg border p-3 text-sm outline-none transition-all ${isEditing ? 'bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600' : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border-emerald-200 dark:border-emerald-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/30'}`}
                                value={formData.username || ''}
                                onChange={e => setFormData({...formData, username: e.target.value})}
                                readOnly={isEditing || autoGenUsername}
                                placeholder={autoGenUsername ? "Tự động tạo theo quy tắc..." : "VD: nguyenvan_a"}
                            />
                            {autoGenUsername && (
                                <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-1 italic">
                                    * DSA: Mã code (VD: DA013631) | Manager: Tên viết liền (VD: buicongqua)
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-1 block">Họ và Tên <span className="text-red-500">*</span></label>
                            <input 
                                className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-sm bg-white dark:bg-gray-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/30 placeholder-gray-400 dark:placeholder-gray-500 font-medium text-gray-800 dark:text-gray-200"
                                value={formData.name || ''}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                placeholder="VD: Nguyễn Văn A"
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-1 block">Số Điện Thoại (Zalo)</label>
                                <input 
                                    className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-sm bg-white dark:bg-gray-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/30 placeholder-gray-400 dark:placeholder-gray-500 font-medium text-gray-800 dark:text-gray-200"
                                    value={formData.phoneNumber || ''}
                                    onChange={e => setFormData({...formData, phoneNumber: e.target.value})}
                                    placeholder="VD: 0987654321"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-1 block">DSA Code</label>
                                <input 
                                    className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-sm bg-white dark:bg-gray-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/30 placeholder-gray-400 dark:placeholder-gray-500 font-mono text-gray-800 dark:text-gray-200"
                                    value={formData.dsaCode || ''}
                                    onChange={e => setFormData({...formData, dsaCode: e.target.value})}
                                    placeholder="DA..."
                                />
                            </div>
                        </div>

                         <div>
                            <label className="text-xs font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wide mb-1 block">Chức vụ</label>
                            <select 
                                className="block w-full rounded-lg border border-emerald-200 dark:border-emerald-800 p-3 text-sm bg-white dark:bg-gray-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 dark:focus:ring-emerald-900/30 text-gray-800 dark:text-gray-200 font-medium"
                                value={formData.role || 'DSA'} 
                                onChange={e => setFormData({...formData, role: e.target.value as any, parentId: ''})}
                            >
                                <option value="DSA">DSA (Sales)</option>
                                <option value="DSS">DSS (Giám sát)</option>
                                <option value="SM">SM (Quản lý)</option>
                                <option value="RSM">RSM (Giám đốc)</option>
                            </select>
                        </div>

                        {['DSA', 'DSS', 'SM'].includes(formData.role || 'DSA') && (
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800">
                                <label className="text-xs font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wide mb-2 block">{parentLabel}</label>
                                <select 
                                    className="block w-full rounded-lg border-purple-200 dark:border-purple-700 p-3 text-sm bg-white dark:bg-gray-700 outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 dark:focus:ring-purple-900/30 text-gray-700 dark:text-gray-200"
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
                             <button onClick={resetForm} className="flex-1 py-3 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">Hủy</button>
                             <button 
                                onClick={handleSave}
                                disabled={!canAccessManagement || isProcessingImage}
                                className={`flex-[2] text-white rounded-lg py-3 text-sm font-bold shadow-lg flex items-center justify-center transition-all transform hover:scale-[1.02] active:scale-95 ${isEditing ? 'bg-gradient-to-r from-orange-500 to-red-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600'} disabled:opacity-50 disabled:cursor-wait`}
                                >
                                {isProcessingImage ? <RefreshCw className="animate-spin mr-2" size={16}/> : null}
                                {isEditing ? 'Cập Nhật' : 'Lưu Nhân Viên'}
                            </button>
                        </div>
                   </div>
              </div>
          </div>
      )}

      {showImport && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border border-emerald-100 dark:border-emerald-900">
                  <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                       <h3 className="font-bold text-lg text-emerald-800 dark:text-emerald-300 flex items-center">
                           <FileSpreadsheet className="mr-2 text-emerald-600 dark:text-emerald-400"/> Import Excel (CSV)
                       </h3>
                       <button onClick={() => setShowImport(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={20}/></button>
                  </div>
                  <div className="p-6">
                       <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                           Tải lên file CSV để thêm nhanh hoặc cập nhật nhân viên. Hệ thống tự động nhận diện theo <b>Username</b>.
                       </p>
                       
                       <div className="space-y-3">
                           <button onClick={downloadTemplate} className="w-full bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg p-3 text-sm font-bold hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors flex items-center justify-center">
                               <Download size={16} className="mr-2"/> Tải File Mẫu
                           </button>
                           
                           <div className="relative group">
                                <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={handleFileUpload} disabled={!canAccessManagement} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
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