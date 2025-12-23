import React, { useState, useRef } from 'react';
import { User } from '../types';
import { X, Camera, Save, RefreshCw, Phone, User as UserIcon, Upload } from 'lucide-react';

interface ProfileSettingsProps {
  currentUser: User;
  onClose: () => void;
  onUpdate: (updatedUser: User) => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({ currentUser, onClose, onUpdate }) => {
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(currentUser.avatar);
  const [phoneNumber, setPhoneNumber] = useState<string>(currentUser.phoneNumber || '');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Image Compression Logic (Client side)
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 600; // Mobile friendly size
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
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(dataUrl);
                } else {
                    reject(new Error("Canvas failed"));
                }
            };
            img.onerror = () => reject(new Error("Image load failed"));
        };
        reader.onerror = () => reject(new Error("File read failed"));
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
        const compressed = await compressImage(file);
        setAvatarPreview(compressed);
    } catch (error) {
        console.error(error);
        alert("Lỗi xử lý ảnh.");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleSave = () => {
      onUpdate({
          ...currentUser,
          avatar: avatarPreview,
          phoneNumber: phoneNumber
      });
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 flex justify-between items-center text-white">
            <h3 className="font-bold text-lg flex items-center"><UserIcon className="mr-2" size={20}/> Hồ sơ cá nhân</h3>
            <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 flex flex-col items-center space-y-6">
            
            {/* Avatar Section */}
            <div className="relative group">
                <div className="w-32 h-32 rounded-full border-4 border-emerald-100 dark:border-emerald-900 shadow-md overflow-hidden bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                    {isProcessing ? (
                        <RefreshCw className="animate-spin text-emerald-600" size={32} />
                    ) : avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-4xl font-bold text-gray-300">{currentUser.name.charAt(0)}</span>
                    )}
                </div>
                
                <input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileChange}
                />
                
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 bg-emerald-600 text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:bg-emerald-700 transition-transform hover:scale-110 active:scale-95"
                >
                    <Camera size={18} />
                </button>
            </div>

            <div className="w-full space-y-4">
                {/* User Info (Read Only) */}
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-white">{currentUser.name}</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{currentUser.role} | {currentUser.dsaCode || currentUser.username}</p>
                </div>

                {/* Phone Input */}
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl border border-gray-200 dark:border-gray-600">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-1">Số điện thoại (Zalo)</label>
                    <div className="flex items-center">
                        <Phone size={18} className="text-emerald-600 mr-2" />
                        <input 
                            type="text" 
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            className="bg-transparent border-none focus:ring-0 w-full text-gray-800 dark:text-white font-bold p-0"
                            placeholder="Nhập số điện thoại..."
                        />
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <button 
                onClick={handleSave}
                disabled={isProcessing}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
            >
                <Save size={18} className="mr-2" /> Lưu Thay Đổi
            </button>
        </div>
      </div>
    </div>
  );
};