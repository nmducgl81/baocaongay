import React, { useState, useRef } from 'react';
import { User } from '../types';
import { Trash2, UserPlus, Save, X, Upload, Download, FileSpreadsheet } from 'lucide-react';

interface UserManagementProps {
  users: User[];
  currentUser: User;
  onAddUser: (user: User | User[]) => void;
  onUpdateUser: (user: User) => void;
  onDeleteUser: (id: string) => void;
  onClose: () => void;
}

export const UserManagement: React.FC<UserManagementProps> = ({ users, currentUser, onAddUser, onUpdateUser, onDeleteUser, onClose }) => {
  const [newUser, setNewUser] = useState<Partial<User>>({ role: 'DSA' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEditRole = currentUser.role === 'ADMIN' || currentUser.role === 'SM';

  const handleAdd = () => {
    if (newUser.username && newUser.name) {
      onAddUser({
        ...newUser,
        id: Math.random().toString(36).substr(2, 9),
      } as User);
      setNewUser({ role: 'DSA', username: '', name: '', dsaCode: '', parentId: '' });
    }
  };

  const downloadTemplate = () => {
    const headers = "username,name,role,dsaCode,parentId,dssManager,smRegion";
    const example = "nguyenvana,Nguyen Van A,DSA,DA001,id_cua_dss,,";
    // Add BOM for Excel UTF-8 support
    const csvContent = "\uFEFF" + headers + "\n" + example;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'template_nhan_vien.csv');
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
      
      // Start from index 1 to skip header
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Simple CSV split
        const parts = line.split(',');
        if (parts.length >= 3) {
          const username = parts[0]?.trim();
          const name = parts[1]?.trim();
          const role = parts[2]?.trim();
          const dsaCode = parts[3]?.trim();
          const parentId = parts[4]?.trim();
          // Added logic to handle dssManager and smRegion if needed in future logic, 
          // currently mostly for template completeness as requested.

          if (username && name && role) {
             newUsers.push({
               id: Math.random().toString(36).substr(2, 9),
               username,
               name,
               role: role as any,
               dsaCode: dsaCode || undefined,
               parentId: parentId || undefined
             });
          }
        }
      }
      
      if (newUsers.length > 0) {
        onAddUser(newUsers);
        alert(`Đã thêm thành công ${newUsers.length} nhân viên.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        alert('Không tìm thấy dữ liệu hợp lệ trong file.');
      }
    };
    reader.readAsText(file);
  };

  // Helper to filter potential parents based on selected role
  const getAvailableParents = (role?: string) => {
      if (role === 'DSA') return users.filter(u => u.role === 'DSS');
      if (role === 'DSS') return users.filter(u => u.role === 'SM');
      if (role === 'SM') return users.filter(u => u.role === 'RSM');
      return [];
  };

  // Helper to display hierarchy in table
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

  // Helper to calculate hierarchy for the NEW user form preview
  const getHierarchyPreview = () => {
    if (!newUser.parentId || !newUser.role) return { dss: '', sm: '' };
    
    const parent = users.find(u => u.id === newUser.parentId);
    if (!parent) return { dss: '', sm: '' };

    if (newUser.role === 'DSA') {
        // Parent is DSS
        const sm = users.find(u => u.id === parent.parentId);
        return { dss: parent.name, sm: sm ? sm.name : '' };
    }
    
    if (newUser.role === 'DSS') {
        // Parent is SM
        return { dss: 'Chính mình', sm: parent.name };
    }

    if (newUser.role === 'SM') {
        return { dss: '-', sm: 'Chính mình' };
    }

    return { dss: '', sm: '' };
  };

  const { dss: previewDss, sm: previewSm } = getHierarchyPreview();

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto mt-6">
      <div className="flex justify-between items-center mb-6 pb-4 border-b">
         <h2 className="text-xl font-bold text-gray-800">Quản lý nhân sự & Phân quyền</h2>
         <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20}/></button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Add Single User Form - Redesigned to match EntryForm */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
             {/* Header */}
             <div className="bg-emerald-700 text-white p-3 flex items-center">
                 <UserPlus size={18} className="mr-2"/>
                 <span className="font-bold">Thêm nhân viên mới</span>
             </div>

             <div className="p-4 space-y-4">
                {/* Section 1: Basic Info - Green Theme */}
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-emerald-800 uppercase border-b pb-1">Thông tin tài khoản</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Tên đăng nhập</label>
                        <input 
                           className="mt-1 block w-full rounded-md border-gray-600 bg-slate-700 text-white border p-2 focus:border-emerald-500 focus:ring-emerald-500 placeholder-gray-400"
                           placeholder="VD: nguyenvan_a"
                           value={newUser.username || ''}
                           onChange={e => setNewUser({...newUser, username: e.target.value})}
                         />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700">Họ và Tên</label>
                        <input 
                           className="mt-1 block w-full rounded-md border-gray-600 bg-slate-700 text-white border p-2 focus:border-emerald-500 focus:ring-emerald-500 placeholder-gray-400"
                           placeholder="VD: Nguyễn Văn A"
                           value={newUser.name || ''}
                           onChange={e => setNewUser({...newUser, name: e.target.value})}
                         />
                      </div>
                   </div>
                </div>

                {/* Section 2: Role & Hierarchy - Blue Theme */}
                <div className="space-y-3">
                   <h3 className="text-xs font-bold text-blue-800 uppercase border-b pb-1">Phân quyền & Cấu trúc</h3>
                   <div className="grid grid-cols-2 gap-4">
                      <div className="bg-blue-50 p-2 rounded border border-blue-100">
                         <label className="block text-xs font-bold text-blue-800">Vai trò (Role)</label>
                         <select 
                            className="mt-1 block w-full rounded-md border-gray-300 border p-2 bg-white"
                            value={newUser.role}
                            onChange={e => setNewUser({...newUser, role: e.target.value as any, parentId: ''})}
                         >
                            <option value="DSA">DSA (Sales)</option>
                            <option value="DSS">DSS (Giám sát)</option>
                            <option value="SM">SM (Quản lý vùng)</option>
                            <option value="RSM">RSM (Giám đốc vùng)</option>
                         </select>
                      </div>

                      <div className="bg-blue-50 p-2 rounded border border-blue-100">
                         <label className="block text-xs font-bold text-blue-800">DSA Code (Nếu có)</label>
                         <input 
                            className="mt-1 block w-full rounded-md border-gray-300 border p-2 bg-white"
                            placeholder="VD: DA12345"
                            value={newUser.dsaCode || ''}
                            onChange={e => setNewUser({...newUser, dsaCode: e.target.value})}
                         />
                      </div>
                      
                      {/* Dynamic Parent Selection based on Role */}
                      {['DSA', 'DSS', 'SM'].includes(newUser.role || '') && (
                         <div className="col-span-2 bg-purple-50 p-2 rounded border border-purple-100">
                            <label className="block text-xs font-bold text-purple-800">
                                {newUser.role === 'DSA' ? 'Thuộc quản lý của (DSS)' : 
                                 newUser.role === 'DSS' ? 'Thuộc quản lý của (SM)' : 
                                 'Thuộc quản lý của (RSM)'}
                            </label>
                            <select 
                                className="mt-1 block w-full rounded-md border-gray-300 border p-2 bg-white"
                                value={newUser.parentId || ''}
                                onChange={e => setNewUser({...newUser, parentId: e.target.value})}
                            >
                                <option value="">-- Chọn quản lý --</option>
                                {getAvailableParents(newUser.role).map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.username})</option>
                                ))}
                            </select>
                         </div>
                      )}

                      {/* Auto-populated Hierarchy Info */}
                      {(newUser.parentId && (newUser.role === 'DSA' || newUser.role === 'DSS')) && (
                          <>
                             <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                <label className="block text-xs font-bold text-gray-600">DSS Quản lý</label>
                                <input 
                                   className="mt-1 block w-full rounded-md border-gray-300 border p-2 bg-gray-100 text-gray-600 text-sm"
                                   readOnly
                                   value={previewDss}
                                />
                             </div>
                             <div className="bg-gray-50 p-2 rounded border border-gray-200">
                                <label className="block text-xs font-bold text-gray-600">SM Khu vực</label>
                                <input 
                                   className="mt-1 block w-full rounded-md border-gray-300 border p-2 bg-gray-100 text-gray-600 text-sm"
                                   readOnly
                                   value={previewSm}
                                />
                             </div>
                          </>
                      )}
                   </div>
                </div>

                <button 
                  onClick={handleAdd}
                  className="w-full bg-emerald-600 text-white rounded-md py-3 px-4 text-sm font-bold hover:bg-emerald-700 flex items-center justify-center shadow-sm"
                >
                  <Save size={18} className="mr-2" /> Lưu Nhân Viên
                </button>
             </div>
          </div>
        </div>

        {/* Bulk Upload - Styled to match */}
        <div className="lg:col-span-1">
           <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
               <div className="bg-blue-700 text-white p-3 flex items-center">
                   <FileSpreadsheet size={18} className="mr-2"/>
                   <span className="font-bold">Thêm từ Excel/CSV</span>
               </div>
               
               <div className="p-4 flex flex-col h-full bg-blue-50">
                  <p className="text-sm text-blue-800 mb-4 flex-grow">
                    Hỗ trợ tải lên danh sách nhiều nhân viên cùng lúc. File cần có định dạng chuẩn:
                    <br/><br/>
                    <code className="bg-white px-2 py-1 rounded border border-blue-200 block text-xs">username, name, role, dsaCode, parentId, dssManager, smRegion</code>
                  </p>

                  <div className="space-y-3 mt-auto">
                     <button 
                        onClick={downloadTemplate}
                        className="w-full bg-white border border-blue-300 text-blue-600 rounded-md p-3 text-sm font-medium hover:bg-blue-100 flex items-center justify-center transition-colors"
                     >
                        <Download size={18} className="mr-2" /> Tải File Mẫu
                     </button>
                     
                     <div className="relative">
                        <input 
                           ref={fileInputRef}
                           type="file" 
                           accept=".csv,.txt"
                           onChange={handleFileUpload}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <button className="w-full bg-blue-600 text-white rounded-md p-3 text-sm font-bold hover:bg-blue-700 flex items-center justify-center shadow-sm transition-colors">
                           <Upload size={18} className="mr-2" /> Chọn File & Tải Lên
                        </button>
                     </div>
                  </div>
               </div>
           </div>
        </div>
      </div>

      {/* User List Table */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
         <div className="bg-gray-50 border-b p-3 font-bold text-gray-700">Danh sách nhân sự hiện tại</div>
         <div className="overflow-x-auto max-h-[400px] custom-scrollbar">
           <table className="w-full text-sm text-left relative">
             <thead className="bg-white font-semibold text-gray-700 sticky top-0 z-10 shadow-sm">
               <tr>
                 <th className="p-3 bg-gray-50">Username</th>
                 <th className="p-3 bg-gray-50">Tên</th>
                 <th className="p-3 bg-gray-50">Role</th>
                 <th className="p-3 bg-gray-50">Code</th>
                 <th className="p-3 bg-gray-50 text-emerald-700">DSS Quản Lý</th>
                 <th className="p-3 bg-gray-50 text-blue-700">SM Khu Vực</th>
                 <th className="p-3 bg-gray-50 text-right">Thao tác</th>
               </tr>
             </thead>
             <tbody>
               {users.map((u, idx) => {
                 const { dssName, smName } = getHierarchyInfo(u);
                 return (
                   <tr key={u.id} className={`border-b hover:bg-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                     <td className="p-3 font-medium text-gray-900">{u.username}</td>
                     <td className="p-3 font-medium text-emerald-800">{u.name}</td>
                     <td className="p-3">
                       {canEditRole && u.role !== 'ADMIN' ? (
                         <select 
                           value={u.role} 
                           onChange={(e) => onUpdateUser({...u, role: e.target.value as any})}
                           className="px-2 py-0.5 rounded text-xs border bg-white border-gray-300 focus:border-blue-500"
                         >
                            <option value="DSA">DSA</option>
                            <option value="DSS">DSS</option>
                            <option value="SM">SM</option>
                            <option value="RSM">RSM</option>
                         </select>
                       ) : (
                         <span className={`px-2 py-0.5 rounded text-xs border font-bold ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-100 text-gray-600 border-gray-300'}`}>{u.role}</span>
                       )}
                     </td>
                     <td className="p-3 text-gray-500 font-mono text-xs">{u.dsaCode || '-'}</td>
                     
                     {/* Hierarchy Data */}
                     <td className="p-3 text-emerald-800 font-medium text-xs">{dssName}</td>
                     <td className="p-3 text-blue-800 font-medium text-xs">{smName}</td>

                     <td className="p-3 text-right">
                        {u.role !== 'ADMIN' && (
                          <button onClick={() => onDeleteUser(u.id)} className="text-red-500 hover:bg-red-50 p-2 rounded transition-colors" title="Xóa nhân viên">
                            <Trash2 size={16} />
                          </button>
                        )}
                     </td>
                   </tr>
                 );
               })}
             </tbody>
           </table>
         </div>
      </div>
    </div>
  );
};