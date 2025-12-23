import React, { useState, useEffect, useMemo } from 'react';
import { SalesRecord, User } from '../types';
import { X, Save, UserCheck, Send, Loader2, AlertTriangle, Info, RefreshCw, Database } from 'lucide-react';

interface EntryFormProps {
  onClose: () => void;
  onSave: (record: SalesRecord) => void;
  currentUser: User;
  users: User[];
  initialData?: SalesRecord | null; // For editing from Table
  existingRecords?: SalesRecord[]; // Passed to check duplicates
}

export const EntryForm: React.FC<EntryFormProps> = ({ onClose, onSave, currentUser, users, initialData, existingRecords = [] }) => {
  
  const isDSALogin = currentUser.role === 'DSA';
  const isAdminOrManager = ['ADMIN', 'RSM', 'SM', 'DSS'].includes(currentUser.role);
  
  // "Real" editing comes from either clicking Edit on table (initialData) OR auto-detecting an existing record (smartEdit)
  const [smartEditRecord, setSmartEditRecord] = useState<SalesRecord | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isEditing = !!initialData || !!smartEditRecord;

  // Helper to format date as YYYY-MM-DD in Local Time
  const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper to determine hierarchy defaults based on logged-in user (fallback)
  const getHierarchyDefaults = () => {
    let defaultDss = '';
    let defaultSm = '';

    if (isDSALogin && currentUser.parentId) {
      const parentUser = users.find(u => u.id === currentUser.parentId);
      if (parentUser) {
        if (parentUser.role === 'DSS') {
            defaultDss = parentUser.name;
            const smUser = users.find(u => u.id === parentUser.parentId);
            if (smUser) defaultSm = smUser.name;
        } else if (parentUser.role === 'SM') {
            // Direct report to SM
            defaultDss = parentUser.name; // SM acts as direct manager
            defaultSm = parentUser.name; // SM is also the SM
        }
      }
    } else if (currentUser.role === 'DSS') {
       defaultDss = currentUser.name;
       const smUser = users.find(u => u.id === currentUser.parentId);
       if (smUser) defaultSm = smUser.name;
    }
    return { defaultDss, defaultSm };
  };

  const { defaultDss, defaultSm } = getHierarchyDefaults();

  // Get list of DSAs that the current user can report for
  const selectableDSAs = useMemo(() => {
    if (isDSALogin) return [];
    if (currentUser.role === 'ADMIN') return users.filter(u => u.role === 'DSA');

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
    reportDate: formatDate(new Date()), // Use local time date
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
    directAppFEOL: 0,
    directLoanFEOL: 0,
    directVolumeFEOL: 0,
    onlineApp: 0,
    onlineVolume: 0,
    ctv: 0,
    newCtv: 0,
    dlk: 0,
    newDlk: 0,
    flyers: 0,
    callsMonth: 0,
    adSpend: 0,
    approvalStatus: 'Approved'
  };

  const [formData, setFormData] = useState<Partial<SalesRecord>>(defaultState);

  // 1. Load initial data if explicitly editing from table
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    }
  }, [initialData]);

  // --- COLLISION DETECTION LOGIC (Moved to top level for rendering Debug Info) ---
  const existingCollision = useMemo(() => {
    if (!formData.dsaCode || !formData.reportDate) return undefined;
    
    // Normalize Input Code for comparison (Safe Check)
    const code = formData.dsaCode || '';
    const normalizedInputCode = code.trim().toUpperCase();

    // Find any record that matches DSA + Date, excluding the one we are currently editing (if any)
    return existingRecords.find(r => 
        (r.dsaCode || '').trim().toUpperCase() === normalizedInputCode && 
        r.reportDate === formData.reportDate &&
        r.id !== initialData?.id
    );
  }, [formData.dsaCode, formData.reportDate, existingRecords, initialData]);

  // 2. Smart Detection: Real-time visual feedback for the user
  useEffect(() => {
      if (initialData) return; // Ignore if explicit edit

      if (existingCollision) {
          if (existingCollision.status === 'Đã báo cáo') {
             // If we found a reported record, load it into the form so user sees previous values
             if (smartEditRecord?.id !== existingCollision.id) {
                 setSmartEditRecord(existingCollision);
                 setFormData(existingCollision);
             }
          } else {
             // Found a placeholder (Chưa báo cáo) - We don't overwrite form data, but we know we will overwrite this ID
             setSmartEditRecord(null);
          }
      } else {
         setSmartEditRecord(null);
      }
  }, [existingCollision, initialData, smartEditRecord]);

  // Determine the Final ID that will be used (Debug Info)
  const targetId = initialData?.id || existingCollision?.id || formData.id || 'NEW_ID';

  // Get currently selected user to show avatar
  const selectedUser = useMemo(() => {
      if (isDSALogin) return currentUser;
      return users.find(u => u.dsaCode === formData.dsaCode && u.role === 'DSA');
  }, [formData.dsaCode, users, currentUser, isDSALogin]);

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
        const directManager = users.find(u => u.id === selectedUser.parentId);
        
        let newDss = '';
        let newSm = '';

        if (directManager) {
            if (directManager.role === 'DSS') {
                newDss = directManager.name;
                const smUser = users.find(u => u.id === directManager.parentId);
                newSm = smUser ? smUser.name : '';
            } else if (directManager.role === 'SM') {
                // Direct to SM
                newDss = directManager.name; // Use SM name as Direct Manager
                newSm = directManager.name;
            }
        }

        setFormData(prev => ({
            ...prev,
            dsaCode: selectedUser.dsaCode || '',
            name: selectedUser.name,
            dss: newDss,
            smName: newSm
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

  const handleAddZeros = (name: string, count: number) => {
    const currentValue = formData[name as keyof SalesRecord] as number;
    if (!currentValue) return; 
    const currentString = currentValue.toString();
    if (currentString.length + count > 15) return;
    const newValue = Number(currentString + '0'.repeat(count));
    setFormData(prev => ({ ...prev, [name]: newValue }));
  };

  const formatValue = (val: number | undefined) => {
    if (val === undefined || val === null || isNaN(val)) return '0';
    return new Intl.NumberFormat('vi-VN').format(val);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double click

    setIsSubmitting(true);
    
    // STRICT COLLISION CHECK AT SUBMIT TIME
    // Even if the UI didn't update yet, we check raw data
    const normalizedCode = (formData.dsaCode || '').trim().toUpperCase();
    
    // Find collision again to be 100% sure
    const strictCollision = existingRecords.find(r => 
        (r.dsaCode || '').trim().toUpperCase() === normalizedCode && 
        r.reportDate === formData.reportDate &&
        r.id !== initialData?.id // Don't collide with self if editing
    );

    // If a collision exists, FORCE use its ID (Merge), otherwise use current/new ID
    const finalId = initialData?.id || strictCollision?.id || formData.id || (Date.now()).toString();
    
    // Determine Approval Status
    let finalApprovalStatus: 'Approved' | 'Pending' | 'Rejected' = 'Approved';
    
    if (currentUser.role === 'DSA') {
        // DSA editing existing record -> Pending
        if ((strictCollision && strictCollision.status === 'Đã báo cáo') || (initialData && initialData.status === 'Đã báo cáo')) {
            finalApprovalStatus = 'Pending';
        } else {
            finalApprovalStatus = 'Approved';
        }
    } else {
        finalApprovalStatus = 'Approved'; 
    }

    // Data Normalization
    const normalizedData = {
        ...formData,
        dsaCode: normalizedCode,
        status: 'Đã báo cáo',
        approvalStatus: finalApprovalStatus,
        id: finalId 
    };

    // Save
    onSave(normalizedData as SalesRecord);
    // Timeout is handled by parent unmounting, but safe to leave
    setTimeout(() => {
        if(onClose) onClose();
    }, 100);
  };

  // UI Themes based on Mode
  const modeColor = isEditing ? (isDSALogin ? 'orange' : 'blue') : 'emerald';
  const modeTitle = isEditing ? 'Cập Nhật Số Liệu' : 'Báo Cáo Mới';

  // Helper component for styled inputs
  const CurrencyInputWithShortcuts = ({ 
    label, 
    name, 
    value, 
    colorClass, 
    focusClass 
  }: { 
    label: string, 
    name: string, 
    value: number | undefined, 
    colorClass: string, 
    focusClass: string 
  }) => (
    <div className={`p-2 rounded border shadow-sm ${colorClass}`}>
      <label className={`block text-xs font-bold ${colorClass.replace('bg-', 'text-').replace('-50', '-800')}`}>{label}</label>
      <input 
        type="text" 
        name={name} 
        value={formatValue(value)} 
        onChange={handleCurrencyChange} 
        className={`mt-1 block w-full rounded-md border p-2 bg-white font-bold ${focusClass} ${colorClass.replace('bg-', 'text-').replace('-50', '-900').replace('border-', 'border-')}`} 
      />
      <div className="flex justify-end gap-2 mt-1.5">
         <button 
            type="button" 
            onClick={() => handleAddZeros(name, 3)} 
            className="px-2 py-0.5 text-[10px] font-bold bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm"
         >
            +000
         </button>
         <button 
            type="button" 
            onClick={() => handleAddZeros(name, 6)} 
            className="px-2 py-0.5 text-[10px] font-bold bg-white border border-gray-200 rounded text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors shadow-sm"
         >
            +000.000
         </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl overflow-y-auto animate-slide-in-right">
        <div className={`p-4 border-b flex justify-between items-center text-white sticky top-0 z-20 bg-${modeColor}-600 transition-colors duration-300`}>
          <div className="flex items-center space-x-3">
             {selectedUser?.avatar && (
                 <img src={selectedUser.avatar} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-white/50 object-cover" />
             )}
             <div>
                <h2 className="text-lg font-bold">{modeTitle}</h2>
                {isEditing && isDSALogin && <span className="text-xs bg-white/20 px-2 py-0.5 rounded font-medium flex items-center mt-1"><AlertTriangle size={12} className="mr-1"/> Sẽ gửi duyệt lại</span>}
                {/* Debug ID Info for Admin/Manager to verify collision */}
                {isAdminOrManager && (
                    <div className="text-[10px] font-mono opacity-80 flex items-center mt-0.5">
                        <Database size={10} className="mr-1"/>
                        {targetId === 'NEW_ID' ? 'Tạo ID mới' : `Ghi đè ID: ...${targetId.slice(-6)}`}
                    </div>
                )}
             </div>
          </div>
          <button onClick={onClose} disabled={isSubmitting} className="p-1 hover:bg-white/20 rounded">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Smart Edit Notification */}
          {smartEditRecord && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 flex items-start animate-fade-in">
                  <RefreshCw className="text-orange-600 flex-shrink-0 mr-2 mt-0.5" size={18} />
                  <div>
                      <p className="text-xs text-orange-800 font-bold">Đã tìm thấy báo cáo cũ!</p>
                      <p className="text-[11px] text-orange-700 mt-0.5">
                          Hệ thống đã tự động tải dữ liệu ngày {smartEditRecord.reportDate}. <br/>
                          Mọi chỉnh sửa sẽ cần <b>DSS duyệt lại</b> (Pending).
                      </p>
                  </div>
              </div>
          )}

          {/* Collision Warning for New Entries (When not smart editing but ID exists e.g. placeholder) */}
          {!smartEditRecord && existingCollision && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start animate-fade-in">
                  <Info className="text-blue-600 flex-shrink-0 mr-2 mt-0.5" size={18} />
                  <div>
                      <p className="text-xs text-blue-800 font-bold">Cập nhật bản ghi có sẵn</p>
                      <p className="text-[11px] text-blue-700 mt-0.5">
                          Đã tìm thấy bản ghi (ID: {existingCollision.id.slice(0,8)}...) cho ngày này. 
                          Dữ liệu sẽ được <b>ghi đè</b> thay vì tạo mới (Tránh trùng lặp).
                      </p>
                  </div>
              </div>
          )}

          {/* Section 1: Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-blue-800 uppercase border-b border-blue-200 pb-1">Thông tin cơ bản</h3>
            
            {/* Employee Selection for Managers */}
            {!isDSALogin && !initialData && (
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
                <label className="block text-xs font-bold text-indigo-800">QL Trực Tiếp / DSS</label>
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
                  // Disable date change if explicit edit (initialData), allow if smart edit or new
                  readOnly={!!initialData}
                  className={`mt-1 block w-full rounded-md border-slate-600 bg-slate-900 text-white p-2 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 font-bold ${initialData ? 'opacity-50 cursor-not-allowed' : ''}`} 
                />
              </div>
            </div>
          </div>
          
          {/* Section 2: Direct Sales & Products */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-red-700 uppercase border-b border-red-200 pb-1">Doanh Số & Sản Phẩm</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-2 rounded border border-emerald-100 shadow-sm">
                <label className="block text-xs font-bold text-emerald-800">App (Tiền mặt)</label>
                <input type="number" name="directApp" value={formData.directApp} onChange={handleChange} className="mt-1 block w-full rounded-md border-emerald-200 border p-2 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
              </div>
              <div className="bg-emerald-50 p-2 rounded border border-emerald-100 shadow-sm">
                <label className="block text-xs font-bold text-emerald-800">Loan (Tiền mặt)</label>
                <input type="number" name="directLoan" value={formData.directLoan} onChange={handleChange} className="mt-1 block w-full rounded-md border-emerald-200 border p-2 bg-white focus:border-emerald-500 focus:ring-emerald-500" />
              </div>
              <div className="bg-rose-50 p-2 rounded border border-rose-100 shadow-sm">
                <label className="block text-xs font-bold text-rose-800">App CRC (Thẻ)</label>
                <input type="number" name="directAppCRC" value={formData.directAppCRC} onChange={handleChange} className="mt-1 block w-full rounded-md border-rose-200 border p-2 bg-white focus:border-rose-500 focus:ring-rose-500" />
              </div>
              <div className="bg-rose-50 p-2 rounded border border-rose-100 shadow-sm">
                <label className="block text-xs font-bold text-rose-800">Loan CRC (Thẻ)</label>
                <input type="number" name="directLoanCRC" value={formData.directLoanCRC} onChange={handleChange} className="mt-1 block w-full rounded-md border-rose-200 border p-2 bg-white focus:border-rose-500 focus:ring-rose-500" />
              </div>
              <div className="bg-purple-50 p-2 rounded border border-purple-100 shadow-sm">
                <label className="block text-xs font-bold text-purple-800">App FEOL</label>
                <input type="number" name="directAppFEOL" value={formData.directAppFEOL} onChange={handleChange} className="mt-1 block w-full rounded-md border-purple-200 border p-2 bg-white focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="bg-purple-50 p-2 rounded border border-purple-100 shadow-sm">
                <label className="block text-xs font-bold text-purple-800">Loan FEOL</label>
                <input type="number" name="directLoanFEOL" value={formData.directLoanFEOL} onChange={handleChange} className="mt-1 block w-full rounded-md border-purple-200 border p-2 bg-white focus:border-purple-500 focus:ring-purple-500" />
              </div>
              
              <div className="col-span-2">
                <CurrencyInputWithShortcuts label="Volume FEOL (VND)" name="directVolumeFEOL" value={formData.directVolumeFEOL} colorClass="bg-purple-50 border-purple-100" focusClass="focus:border-purple-500 focus:ring-purple-500" />
              </div>
              <div className="col-span-1">
                <CurrencyInputWithShortcuts label="Volume (VND)" name="directVolume" value={formData.directVolume} colorClass="bg-teal-50 border-teal-100" focusClass="focus:border-teal-500 focus:ring-teal-500" />
              </div>
              <div className="col-span-1">
                <CurrencyInputWithShortcuts label="Banca (VND)" name="directBanca" value={formData.directBanca} colorClass="bg-teal-50 border-teal-100" focusClass="focus:border-teal-500 focus:ring-teal-500" />
              </div>
            </div>
          </div>

          {/* Section 3: Activities */}
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
                <input type="text" name="flyers" value={formatValue(formData.flyers)} onChange={handleCurrencyChange} className="mt-1 block w-full rounded-md border-amber-200 border p-2 bg-white font-medium focus:border-amber-500 focus:ring-amber-500" />
              </div>
              <div className="col-span-2">
                <CurrencyInputWithShortcuts label="Chi phí QC (VND)" name="adSpend" value={formData.adSpend} colorClass="bg-amber-50 border-amber-100" focusClass="focus:border-amber-500 focus:ring-amber-500" />
              </div>
            </div>
          </div>

          <div className="pt-4">
             {isEditing && isDSALogin ? (
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-wait"
                >
                   {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Send className="mr-2" size={18} />}
                   {isSubmitting ? 'Đang gửi...' : 'Cập Nhật & Gửi Duyệt'}
                </button>
             ) : (
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white transition-all transform hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-wait ${isEditing ? 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:ring-emerald-500'}`}
                >
                  {isSubmitting ? <Loader2 className="animate-spin mr-2"/> : <Save className="mr-2" size={18} />}
                  {isSubmitting ? 'Đang lưu...' : (isEditing ? 'Cập Nhật' : 'Lưu Báo Cáo')}
                </button>
             )}
          </div>

        </form>
      </div>
    </div>
  );
};