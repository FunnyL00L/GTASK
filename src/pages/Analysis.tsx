import React, { useState, useEffect, useRef } from 'react';
import { UserConfig, FinanceEntry, TaskEntry, User } from '../types';
import { callGAS } from '../services/api';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend
} from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subDays } from 'date-fns';
import { motion } from 'motion/react';
import { 
  Activity, 
  PieChart as PieChartIcon, 
  BarChart3, 
  TrendingUp,
  Download,
  Printer
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';

interface AnalysisProps {
  config: UserConfig;
  user: User;
}

export default function Analysis({ config, user }: AnalysisProps) {
  const [financeData, setFinanceData] = useState<FinanceEntry[]>([]);
  const [taskData, setTaskData] = useState<TaskEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      const result = await callGAS(config.gasUrl, {
        action: 'get_data',
        username: user.username
      });
      if (result.success) {
        setFinanceData(result.finance);
        setTaskData(result.tasks);
      }
      setLoading(false);
    };
    fetchData();
  }, []);

  const exportReport = async () => {
    setPrinting(true);
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text('GTaskFlow Analysis Report', pageWidth / 2, 20, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(`Generated on: ${format(new Date(), 'dd MMMM yyyy, HH:mm')}`, pageWidth / 2, 28, { align: 'center' });
      doc.text(`User: ${user.name} (@${user.username})`, pageWidth / 2, 33, { align: 'center' });

      // Financial Summary Table
      doc.setFontSize(14);
      doc.setTextColor(15, 23, 42);
      doc.text('Financial Summary', 14, 45);

      const totalIncome = financeData.filter(e => e.type === 'income').reduce((a, b) => a + b.amount, 0);
      const totalExpense = financeData.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0);
      const balance = totalIncome - totalExpense;

      autoTable(doc, {
        startY: 50,
        head: [['Metric', 'Amount']],
        body: [
          ['Total Income', totalIncome.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })],
          ['Total Expense', totalExpense.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })],
          ['Net Balance', balance.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' })],
        ],
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
      });

      // Capture Chart
      if (chartRef.current) {
        const canvas = await html2canvas(chartRef.current, {
          scale: 2,
          logging: false,
          useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 28;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        doc.addPage();
        doc.text('Cash Flow Visualization', 14, 20);
        doc.addImage(imgData, 'PNG', 14, 25, imgWidth, imgHeight);
      }

      // Recent Transactions Table
      doc.addPage();
      doc.text('Recent Transactions', 14, 20);
      
      const recentFin = financeData.slice(0, 15).map(e => [
        format(new Date(e.date), 'dd/MM/yy'),
        e.type.toUpperCase(),
        e.category,
        e.source_destination,
        e.amount.toLocaleString('id-ID')
      ]);

      autoTable(doc, {
        startY: 25,
        head: [['Date', 'Type', 'Category', 'From/To', 'Amount']],
        body: recentFin,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42] },
      });

      doc.save(`gtaskflow_report_${format(new Date(), 'yyyyMMdd')}.pdf`);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to generate report');
    } finally {
      setPrinting(false);
    }
  };

  // Finance Analysis
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date()
  });

  const dailyTrend = last7Days.map(day => {
    const dayEntries = financeData.filter(e => isSameDay(new Date(e.date), day));
    return {
      name: format(day, 'dd MMM'),
      income: dayEntries.filter(e => e.type === 'income').reduce((a, b) => a + b.amount, 0),
      expense: dayEntries.filter(e => e.type === 'expense').reduce((a, b) => a + b.amount, 0),
    };
  });

  const categoryData = financeData
    .filter(e => e.type === 'expense')
    .reduce((acc: any[], curr) => {
      const existing = acc.find(a => a.name === curr.category);
      if (existing) existing.value += curr.amount;
      else acc.push({ name: curr.category, value: curr.amount });
      return acc;
    }, []);

  // Task Analysis
  const taskStatusData = [
    { name: 'Todo', value: taskData.filter(t => t.status === 'todo').length },
    { name: 'In Progress', value: taskData.filter(t => t.status === 'in_progress').length },
    { name: 'Done', value: taskData.filter(t => t.status === 'done').length },
  ];

  const COLORS = ['#94a3b8', '#3b82f6', '#10b981', '#f43f5e', '#f59e0b'];

  if (loading) return <div className="text-center py-12 text-slate-400 font-bold">Analyzing data...</div>;

  return (
    <div className="space-y-6 pb-20 lg:pb-0">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900">Analysis</h2>
          <p className="text-slate-500 text-sm">Insights into your performance</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={exportReport}
            disabled={printing}
            className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm hover:bg-slate-50 transition-all disabled:opacity-50"
            title="Download PDF Report"
          >
            {printing ? (
              <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
            ) : (
              <Printer className="w-6 h-6" />
            )}
          </button>
          <div className="w-12 h-12 bg-white border border-slate-200 rounded-2xl flex items-center justify-center text-slate-900 shadow-sm">
            <Activity className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Financial Trend */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm"
          ref={chartRef}
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900">Cash Flow</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontWeight: 800, fontSize: '12px' }}
                />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={4} dot={false} />
                <Line type="monotone" dataKey="expense" stroke="#f43f5e" strokeWidth={4} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Task Status */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <PieChartIcon className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900">Workflow Status</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={taskStatusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Spending by Category */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900">Spending by Category</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="value" fill="#10b981" radius={[0, 12, 12, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Task Priority */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="font-black text-slate-900">Task Priority</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'High', count: taskData.filter(t => t.priority === 'high').length },
                { name: 'Medium', count: taskData.filter(t => t.priority === 'medium').length },
                { name: 'Low', count: taskData.filter(t => t.priority === 'low').length },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
