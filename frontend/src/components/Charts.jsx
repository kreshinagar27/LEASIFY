import React, { useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { useTheme } from '../context/ThemeContext';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const CashFlowChart = ({ labels, data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: labels || ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct'],
    datasets: [
      {
        fill: true,
        label: 'Collected Rent (₹)',
        data: data || [48000, 52000, 50000, 68000, 64000, 75000],
        borderColor: '#4A1715',
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 240);
          gradient.addColorStop(0, 'rgba(74, 23, 21, 0.30)');
          gradient.addColorStop(1, 'rgba(74, 23, 21, 0.0)');
          return gradient;
        },
        borderWidth: 2.5,
        tension: 0.38,
        pointBackgroundColor: '#4A1715',
        pointBorderColor: isDark ? '#1C1614' : '#FAF7F1',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointHoverBackgroundColor: '#642522'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        padding: 12,
        cornerRadius: 12,
        backgroundColor: isDark ? 'rgba(28, 22, 20, 0.95)' : 'rgba(250, 247, 241, 0.98)',
        titleColor: isDark ? '#FAF7F1' : '#38251F',
        bodyColor: isDark ? '#C5B5A5' : '#78685D',
        borderColor: isDark ? '#38251F' : '#D9CBBB',
        borderWidth: 1,
        titleFont: { size: 12, weight: 'bold' },
        bodyFont: { size: 12 },
        displayColors: false,
        callbacks: {
          label: (context) => `Revenue: ₹${Number(context.raw || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          color: isDark ? '#A8998C' : '#78685D',
          font: { size: 11, weight: '500' }
        }
      },
      y: {
        grid: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(56,37,31,0.06)'
        },
        ticks: {
          color: isDark ? '#A8998C' : '#78685D',
          font: { size: 11, weight: '500' },
          callback: (value) => `₹${value >= 1000 ? `${value / 1000}k` : value}`
        }
      }
    }
  };

  return (
    <div className="h-64 w-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export const ComplaintsDistributionChart = ({ labels, data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: labels || ['Electrical', 'Water & Plumbing', 'Carpentry', 'Cleaning', 'Security', 'Other'],
    datasets: [
      {
        data: data || [5, 3, 4, 2, 1, 2],
        backgroundColor: [
          '#4A1715', // Deep Mahogany
          '#B45309', // Warm Amber
          '#047857', // Forest Sage
          '#C2410C', // Terracotta Rust
          '#854D0E', // Golden Umber
          '#78350F'  // Rich Espresso
        ],
        borderWidth: 2,
        borderColor: isDark ? '#1C1614' : '#FAF7F1',
        hoverOffset: 6
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: isDark ? '#E9DFD0' : '#38251F',
          font: { size: 11, weight: '600' },
          boxWidth: 12,
          padding: 12,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        padding: 10,
        cornerRadius: 12,
        backgroundColor: isDark ? 'rgba(28, 22, 20, 0.95)' : 'rgba(250, 247, 241, 0.98)',
        titleColor: isDark ? '#FAF7F1' : '#38251F',
        bodyColor: isDark ? '#C5B5A5' : '#78685D',
        borderWidth: 1,
        borderColor: isDark ? '#38251F' : '#D9CBBB'
      }
    },
    cutout: '68%'
  };

  return (
    <div className="h-64 w-full flex items-center justify-center">
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export const PropertyYieldChart = ({ labels, data }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartData = {
    labels: labels || ['Sunset Residency', 'Skyline Tower', 'Emerald Heights'],
    datasets: [
      {
        label: 'Monthly Yield (₹)',
        data: data || [55000, 38000, 24000],
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 200);
          gradient.addColorStop(0, '#4A1715');
          gradient.addColorStop(1, '#8B3A2B');
          return gradient;
        },
        borderColor: '#4A1715',
        borderWidth: 0,
        borderRadius: 10,
        hoverBackgroundColor: '#642522'
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        padding: 10,
        cornerRadius: 10,
        backgroundColor: isDark ? 'rgba(28, 22, 20, 0.95)' : 'rgba(250, 247, 241, 0.98)',
        titleColor: isDark ? '#FAF7F1' : '#38251F',
        bodyColor: isDark ? '#C5B5A5' : '#78685D',
        borderWidth: 1,
        borderColor: isDark ? '#38251F' : '#D9CBBB',
        callbacks: {
          label: (context) => `Yield: ₹${Number(context.raw || 0).toLocaleString()}`
        }
      }
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: isDark ? '#A8998C' : '#78685D',
          font: { size: 10, weight: '500' }
        }
      },
      y: {
        grid: {
          color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(56,37,31,0.06)'
        },
        ticks: {
          color: isDark ? '#A8998C' : '#78685D',
          font: { size: 10, weight: '500' },
          callback: (value) => `₹${value >= 1000 ? `${value / 1000}k` : value}`
        }
      }
    }
  };

  return (
    <div className="h-64 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};
