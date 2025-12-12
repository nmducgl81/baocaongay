import React, { useState } from 'react';
import { User, Lock, LogIn } from 'lucide-react';
import { authService } from '../services/authService';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
  users: UserType[]; // Receive the dynamic list of users
}

export const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Pass the current users list to the login service
      const user = await authService.login(username, users);
      if (user) {
        onLogin(user);
      } else {
        setError('Tên đăng nhập không tồn tại');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-emerald-600 p-6 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4">
             <Lock className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white">DSA Sales Tracker</h2>
          <p className="text-emerald-100 mt-2">Đăng nhập hệ thống quản trị</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700">Tên đăng nhập</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm"
                  placeholder="Nhập username (VD: sm_east2)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : (
                <>
                  <LogIn className="mr-2" size={18} /> Đăng Nhập
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t pt-6">
             <p className="text-xs text-gray-500 text-center mb-2">Tài khoản Demo:</p>
             <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => setUsername('admin')} className="p-1 bg-gray-100 rounded hover:bg-gray-200">Admin</button>
                <button onClick={() => setUsername('rsm_hcm')} className="p-1 bg-gray-100 rounded hover:bg-gray-200">RSM (rsm_hcm)</button>
                <button onClick={() => setUsername('sm_east2')} className="p-1 bg-gray-100 rounded hover:bg-gray-200">SM (sm_east2)</button>
                <button onClick={() => setUsername('dss_qua')} className="p-1 bg-gray-100 rounded hover:bg-gray-200">DSS (dss_qua)</button>
                <button onClick={() => setUsername('dsa_thien')} className="p-1 bg-gray-100 rounded hover:bg-gray-200">DSA (dsa_thien)</button>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};