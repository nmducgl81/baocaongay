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
    blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
    red: 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
    orange: 'bg-orange-50 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-md transition-all duration-300">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-1">{title}</p>
          <h3 className="text-2xl font-extrabold text-gray-900 dark:text-white">{value}</h3>
        </div>
        <div className={`p-2.5 rounded-lg ${colorClasses[color]} shadow-sm`}>
          {icon || <Activity size={22} />}
        </div>
      </div>
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <ArrowUpRight size={16} className="text-emerald-500 mr-1" />
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">{trend}</span>
          <span className="text-gray-400 dark:text-gray-500 ml-2">vs last month</span>
        </div>
      )}
    </div>
  );
};