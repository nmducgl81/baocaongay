import React, { useState, useEffect, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { X, Save, Upload, Image as ImageIcon, UserCheck, Send } from 'lucide-react';

interface EntryFormProps {
  onClose: () => void;
  onSave: (record: SalesRecord) => void;
  currentUser: User;
  users: User[];
  initialData?: SalesRecord | null; // For editing
}

export const EntryForm: React.FC<EntryFormProps> = ({ onClose, onSave, currentUser, users, initialData }) => {
  
  const isDSALogin = currentUser.role === 'DSA';
  const isEditing = !!initialData;

  // Helper to determine hierarchy defaults based on logged-in user (fallback)
  const getHierarchyDefaults = () => {
    let defaultDss = '';
    let defaultSm = '';

    if (isDSALogin && currentUser.parentId) {
      const dssUser = users.find(u => u.id === currentUser.parentId);
      if (dssUser) {
        defaultDss = dssUser.name;
        if (dssUser.parentId) {
          const smUser = users.find(u => u.id === dssUser.parentId);
          if (smUser) defaultSm = smUser.name;
        }
      }
    } else if (currentUser.role === 'DSS') {
       const smUser = users.find(u => u.id === currentUser.parentId);
       if (smUser) defaultSm = smUser.name;
    }
    return { defaultDss, defaultSm };
  };

  const { defaultDss, defaultSm } = getHierarchyDefaults();

  // Get list of DSAs that the current user can report for
  const selectableDSAs = useMemo(() => {
    if (isDSALogin) return [];
    
    // Admin sees all DSAs
    if (currentUser.role === 'ADMIN') return users.filter(u => u.role === 'DSA');

    // Recursive function to find subordinates
    const getSubordinates = (parentId: string): string[] => {
       const direct = users.filter(u => u.parentId === parentId);
       let ids = direct.map(u => u.id);
       direct.forEach(u => {
          ids = [...ids, ...getSubordinates(u.id)];
       });
       return ids;
    };
    
    const subIds = getSubordinates(currentUser.id);
    return users.filter(u => u.role === 'DSA' && subIds.includes(u.id));
  }, [users, currentUser, isDSALogin]);

  // Initial Form State
  const defaultState: Partial<SalesRecord> = {
    status: 'Đã báo cáo',
    reportDate: new Date().toISOString().split('T')[0],
    directRol: '0.0%',
    dsaCode: isDSALogin ? currentUser.dsaCode : '',
    name: isDSALogin ? currentUser.name : '',
    dss: defaultDss, 
    smName: defaultSm,
    directVolume: 0,
    directBanca: 0,
    directApp: 0,
    directLoan: 0,
    directAppCRC: 0,
    directLoanCRC: 0,
    onlineApp: 0,
    onlineVolume: 0,
    ctv: 0,
    newCtv: 0,
    dlk: 0,
    newDlk: 0,
    flyers: 0,
    callsMonth: 0,
    adSpend: 0,
    approvalStatus: 'Approved' // Default for new records by Managers
  };

  const [formData, setFormData] = useState<Partial<SalesRecord>>(defaultState);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load initial data if editing
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
      if (initialData.proofImage) {
        setImagePreview(initialData.proofImage);
      }
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData(prev => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleDSASelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value;
    const selectedUser = users.find(u => u.id === userId);
    
    if (selectedUser) {
        const dssUser = users.find(u => u.id === selectedUser.parentId);
        const smUser = dssUser ? users.find(u => u.id === dssUser.parentId) : null;

        setFormData(prev => ({
            ...prev,
            dsaCode: selectedUser.dsaCode || '',
            name: selectedUser.name,
            dss: dssUser ? dssUser.name : '',
            smName: smUser ? smUser.name : ''
        }));
    } else {
        setFormData(prev => ({
            ...prev,
            dsaCode: '',
            name: '',
            dss: '',
            smName: ''
        }));
    }
  };

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const rawValue = value.replace(/\./g, '');
    if (/^\d*$/.test(rawValue)) {
      setFormData(prev => ({ ...prev, [name]: Number(rawValue) }));
    }
  };

  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setImagePreview(base64);
        setFormData(prev => ({ ...prev, proofImage: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Determine Approval Status
    let finalApprovalStatus: 'Approved' | 'Pending' | 'Rejected' = 'Approved';
    
    if (isEditing) {
      // If editing...
      if (currentUser.role === 'DSA') {
        // DSA edits require approval
        finalApprovalStatus = 'Pending';
      } else {
        // Managers editing allows direct approval
        finalApprovalStatus = 'Approved'; 
      }
    } else {
      // New Record logic
      if (currentUser.role === 'DSA') {
         finalApprovalStatus = 'Approved'; // Or 'Pending' if you want strict control
      }
    }

    onSave({
      ...formData,
      // CRITICAL FIX: Always set status to 'Đã báo cáo' when submitting a report
      status: 'Đã báo cáo',
      approvalStatus: finalApprovalStatus,
      // Ensure ID exists if editing, or create new if not
      id: initialData?.id || (Math.random() * 10000).toFixed(0)
    } as SalesRecord);
    
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className={`p-4 border-b flex justify-between items-center text-white sticky top-0 z-20 ${isEditing && isDSALogin ? 'bg-orange-600' : 'bg-emerald-700'}`}>
          <div>
            <h2 className="text-lg font-bold">{isEditing ? 'Chỉnh Sửa Báo Cáo' : 'Cập Nhật Tiến Độ'}</h2>
            {isEditing && isDSALogin && <span className="text-xs bg-white/20 px-2 py-0.5 rounded">Cần duyệt bởi DSS</span>}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Section 1: Info - Blue Theme */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-200 pb-1">Thông tin cơ bản</h3>
            
            {/* Employee Selection for Managers (Only when NOT editing existing record) */}
            {!isDSALogin && !isEditing && (
               <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-2 shadow-sm">
                  <label className="block text-xs font-bold text-blue-800 mb-1 flex items-center">
                    <UserCheck size={14} className="mr-1"/> Chọn Nhân Viên Báo Cáo
                  </label>
                  <select 
                    className="block w-full rounded-md border-blue-300 border p-2 bg-white text-sm focus:border-blue-500 focus:ring-blue-500"
                    onChange={handleDSASelect}
                    value={users.find(u => u.dsaCode === formData.dsaCode)?.id || ''}
                  >
                     <option value="">-- Tìm kiếm nhân viên --</option>
                     {selectableDSAs.map(u => (
                       <option key={u.id} value={u.id}>{u.name} - {u.dsaCode}</option>
                     ))}
                  </select>
               </div>
            )}

            <div className="grid grid-cols-2 gap-4">
               <div className="bg-blue-50 p-2 rounded border border-blue-100 shadow-sm">
                <label className="block text-xs font-bold text-blue-800">DSA Code</label>
                <input 
                  required 
                  name="dsaCode" 
                  value={formData.dsaCode || ''}
                  readOnly={true} 
                  className="mt-1 block w-full rounded-md border-blue-200 border p-2 bg-white text-blue-900 font-bold font-mono text-sm" 
                />
              </div>
               <div className="bg-blue-50 p-2 rounded border border-blue-100 shadow-sm">
                <label className="block text-xs font-bold text-blue-800">Họ và Tên</label>
                <input 
                  required 
                  name="name" 
                  value={formData.name || ''}
                  readOnly={true} 
                  className="mt-1 block w-full rounded-md border-blue-200 border p-2 bg-white text-blue-900 font-bold text-sm" 
                />
              </div>
               <div className="bg-indigo-50 p-2 rounded border border-indigo-100 shadow-sm">
                <label className="block text-xs font-bold text-indigo-800">DSS</label>
                <input 
                  name="dss" 
                  value={formData.dss || ''}
                  readOnly={true}
                  className="mt-1 block w-full rounded-md border-indigo-200 border p-2 bg-white text-indigo-900 text-sm" 
                />
              </div>
               <div className="bg-indigo-50 p-2 rounded border border-indigo-100 shadow-sm">
                <label className="block text-xs font-bold text-indigo-800">SM Name</label>
                <input 
                  name="smName" 
                  value={formData.smName || ''}
                  readOnly={true}
                  className="mt-1 block w-full rounded-md border-indigo-200 border p-2 bg-white text-indigo-900 text-sm" 
                />
              </div>
               <div className="col-span-2 bg-slate-800 p-2 rounded border border-slate-700 shadow-sm">
                <label className="block text-xs font-bold text-slate-300">Ngày báo cáo</label>
                <input 
                  type="date" 
                  name="reportDate" 
                  value={formData.reportDate} 
                  onChange={handleChange} 
                  className="mt-1 block w-full rounded-md border-slate-600 bg-slate-900 text-white p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-bold" 
                />
              </div>
            </div>
          </div>
          
          {/* Section 2: Direct Sales & Products */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-red-700 uppercase border-b border-red-200 pb-1">Doanh Số & Sản Phẩm</h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Cash Products - Green */}
              <div className="bg-emerald-50 p-2 rounded border border-emerald-100 shadow-sm">
                <label className="block text-xs font-bold text-emerald-800">App (Tiền mặt)</label>
                <input 
                   type="number" 
                   name="directApp" 
                   value={formData.directApp} 
                   onChange={handleChange} 
                   className="mt-1 block w-full rounded-md border-emerald-200 border p-2 bg-white focus:border-emerald-500 focus:ring-emerald-500" 
                />
              </div>
              <div className="bg-emerald-50 p-2 rounded border border-emerald-100 shadow-sm">
                <label className="block text-xs font-bold text-emerald-800">Loan (Tiền mặt)</label>
                <input 
                   type="number" 
                   name="directLoan" 
                   value={formData.directLoan} 
                   onChange={handleChange} 
                   className="mt-1 block w-full rounded-md border-emerald-200 border p-2 bg-white focus:border-emerald-500 focus:ring-emerald-500" 
                />
              </div>
              
              {/* CRC Products - Red/Rose */}
              <div className="bg-rose-50 p-2 rounded border border-rose-100 shadow-sm">
                <label className="block text-xs font-bold text-rose-800">App CRC (Thẻ)</label>
                <input 
                   type="number" 
                   name="directAppCRC" 
                   value={formData.directAppCRC} 
                   onChange={handleChange} 
                   className="mt-1 block w-full rounded-md border-rose-200 border p-2 bg-white focus:border-rose-500 focus:ring-rose-500" 
                />
              </div>
              <div className="bg-rose-50 p-2 rounded border border-rose-100 shadow-sm">
                <label className="block text-xs font-bold text-rose-800">Loan CRC (Thẻ)</label>
                <input 
                   type="number" 
                   name="directLoanCRC" 
                   value={formData.directLoanCRC} 
                   onChange={handleChange} 
                   className="mt-1 block w-full rounded-md border-rose-200 border p-2 bg-white focus:border-rose-500 focus:ring-rose-500" 
                />
              </div>

              {/* Volume Money - Teal */}
              <div className="bg-teal-50 p-2 rounded border border-teal-100 shadow-sm">
                <label className="block text-xs font-bold text-teal-800">Volume (VND)</label>
                <input 
                  type="text" 
                  name="directVolume" 
                  value={formatValue(formData.directVolume)} 
                  onChange={handleCurrencyChange} 
                  className="mt-1 block w-full rounded-md border-teal-200 border p-2 bg-white font-bold text-teal-900 focus:border-teal-500 focus:ring-teal-500" 
                />
              </div>
              <div className="bg-teal-50 p-2 rounded border border-teal-100 shadow-sm">
                <label className="block text-xs font-bold text-teal-800">Banca (VND)</label>
                <input 
                  type="text" 
                  name="directBanca" 
                  value={formatValue(formData.directBanca)} 
                  onChange={handleCurrencyChange} 
                  className="mt-1 block w-full rounded-md border-teal-200 border p-2 bg-white font-bold text-teal-900 focus:border-teal-500 focus:ring-teal-500" 
                />
              </div>
            </div>
          </div>

          {/* Section 3: Activities - Amber/Orange Theme */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-amber-700 uppercase border-b border-amber-200 pb-1">Hoạt động phát triển</h3>
            <div className="grid grid-cols-2 gap-4">
              
              <div className="bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                 <label className="block text-xs font-bold text-amber-800">Tổng CTV</label>
                 <input type="number" name="ctv" value={formData.ctv} onChange={handleChange} className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white focus:border-amber-500 focus:ring-amber-500" />
              </div>
              <div className="bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                 <label className="block text-xs font-bold text-amber-800">CTV Mới</label>
                 <input type="number" name="newCtv" value={formData.newCtv} onChange={handleChange} className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white focus:border-amber-500 focus:ring-amber-500" />
              </div>

              <div className="bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                 <label className="block text-xs font-bold text-amber-800">Tổng ĐLK</label>
                 <input type="number" name="dlk" value={formData.dlk} onChange={handleChange} className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white focus:border-amber-500 focus:ring-amber-500" />
              </div>
              <div className="bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                 <label className="block text-xs font-bold text-amber-800">ĐLK Mới</label>
                 <input type="number" name="newDlk" value={formData.newDlk} onChange={handleChange} className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white focus:border-amber-500 focus:ring-amber-500" />
              </div>

              <div className="bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                <label className="block text-xs font-bold text-amber-800">Cuộc gọi / Tháng</label>
                <input type="number" name="callsMonth" value={formData.callsMonth} onChange={handleChange} className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white focus:border-amber-500 focus:ring-amber-500" />
              </div>
              <div className="bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                <label className="block text-xs font-bold text-amber-800">Tờ rơi</label>
                <input 
                  type="text" 
                  name="flyers" 
                  value={formatValue(formData.flyers)} 
                  onChange={handleCurrencyChange} 
                  className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white font-medium focus:border-amber-500 focus:ring-amber-500" 
                />
              </div>
              
              <div className="col-span-2 bg-amber-50 p-2 rounded border border-amber-100 shadow-sm">
                <label className="block text-xs font-bold text-amber-800">Chi phí QC (VND)</label>
                <input 
                  type="text" 
                  name="adSpend" 
                  value={formatValue(formData.adSpend)} 
                  onChange={handleCurrencyChange} 
                  className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white font-bold text-amber-900 focus:border-amber-500 focus:ring-amber-500" 
                />
              </div>
            </div>
          </div>
          
           {/* Image Upload Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-indigo-800 uppercase border-b border-indigo-200 pb-1">Hình ảnh hoạt động</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-emerald-500 transition-colors bg-gray-50">
               <input 
                 type="file" 
                 id="proofImage" 
                 accept="image/*" 
                 onChange={handleImageUpload}
                 className="hidden" 
               />
               <label htmlFor="proofImage" className="cursor-pointer flex flex-col items-center justify-center">
                 {imagePreview ? (
                   <div className="relative w-full">
                     <img src={imagePreview} alt="Preview" className="max-h-48 rounded-md mx-auto object-contain shadow-sm" />
                     <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded hover:bg-black/70 transition-colors">Thay đổi</div>
                   </div>
                 ) : (
                   <>
                     <div className="bg-emerald-100 p-3 rounded-full mb-3">
                         <Upload className="text-emerald-600" size={24} />
                     </div>
                     <span className="text-sm text-gray-700 font-bold">Tải lên hình ảnh báo cáo</span>
                     <span className="text-xs text-gray-400 mt-1">Hỗ trợ JPG, PNG (Max 5MB)</span>
                   </>
                 )}
               </label>
            </div>
          </div>

          <div className="pt-4">
             {isEditing && isDSALogin ? (
                <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors">
                  <Send className="mr-2" size={18} /> Gửi Duyệt Chỉnh Sửa
                </button>
             ) : (
                <button type="submit" className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors">
                  <Save className="mr-2" size={18} /> {isEditing ? 'Cập Nhật' : 'Lưu Báo Cáo'}
                </button>
             )}
          </div>

        </form>
      </div>
    </div>
  );
};