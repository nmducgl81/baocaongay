import React from 'react';
import { ArrowUpRight, ArrowDownRight, Activity } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  trend?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'red' | 'orange';
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, trend, icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-emerald-50 text-emerald-700',
    red: 'bg-rose-50 text-rose-700',
    orange: 'bg-orange-50 text-orange-700',
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon || <Activity size={20} />}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <ArrowUpRight size={16} className="text-emerald-500 mr-1" />
          <span className="text-emerald-600 font-medium">{trend}</span>
          <span className="text-gray-400 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
};