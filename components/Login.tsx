import React, { useState } from 'react';
import { User, Lock, LogIn, Key } from 'lucide-react';
import { authService } from '../services/authService';
import { User as UserType } from '../types';

interface LoginProps {
  onLogin: (user: UserType) => void;
  users: UserType[]; // Receive the dynamic list of users
}

export const Login: React.FC<LoginProps> = ({ onLogin, users }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Pass the current users list to the login service
      const user = await authService.login(username, password, users);
      if (user) {
        onLogin(user);
      } else {
        setError('Tên đăng nhập hoặc mật khẩu không đúng');
      }
    } catch (err) {
      setError('Đã xảy ra lỗi. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (demoUsername: string) => {
    setUsername(demoUsername);
    setPassword('123');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-emerald-100">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-8 text-center">
          <div className="mx-auto bg-white/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm shadow-inner">
             <Lock className="text-white" size={32} />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">DSA Sales Tracker</h2>
          <p className="text-emerald-100 mt-2 font-medium opacity-90">Hệ thống quản trị hiệu quả kinh doanh</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-1.5">Tên đăng nhập</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-emerald-500" size={18} />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-emerald-50/30 text-emerald-900 placeholder-emerald-300 transition-all font-medium"
                  placeholder="Nhập username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-emerald-900 mb-1.5">Mật khẩu</label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="text-emerald-500" size={18} />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-3 border border-emerald-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm bg-emerald-50/30 text-emerald-900 placeholder-emerald-300 transition-all font-medium"
                  placeholder="Nhập mật khẩu"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg border border-red-100 font-medium flex items-center justify-center animate-pulse">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-lg shadow-emerald-200 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? 'Đang xử lý...' : (
                <>
                  <LogIn className="mr-2" size={18} /> Đăng Nhập Hệ Thống
                </>
              )}
            </button>
          </form>

          <div className="mt-8 border-t border-emerald-100 pt-6">
             <p className="text-xs font-bold text-emerald-600 text-center mb-1 uppercase tracking-wide">Tài khoản Demo</p>
             <p className="text-xs text-gray-400 text-center mb-3">(Mật khẩu mặc định: 123)</p>
             <div className="grid grid-cols-2 gap-2 text-xs">
                <button onClick={() => handleDemoLogin('admin')} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-transparent hover:border-emerald-200">Admin</button>
                <button onClick={() => handleDemoLogin('rsm_hcm')} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-transparent hover:border-emerald-200">RSM (rsm_hcm)</button>
                <button onClick={() => handleDemoLogin('sm_east2')} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-transparent hover:border-emerald-200">SM (sm_east2)</button>
                <button onClick={() => handleDemoLogin('dss_qua')} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-transparent hover:border-emerald-200">DSS (dss_qua)</button>
                <button onClick={() => handleDemoLogin('dsa_thien')} className="p-2 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 transition-colors font-medium border border-transparent hover:border-emerald-200">DSA (dsa_thien)</button>
             </div>
          </div>
        </div>
      </div>
      <div className="mt-6 text-emerald-600/60 text-xs font-medium">
        &copy; 2024 DSA Sales Tracker System
      </div>
    </div>
  );
};