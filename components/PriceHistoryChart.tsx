import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { UserProduct, Competitor } from '../types';

interface PriceHistoryChartProps {
  userProduct: UserProduct;
  competitors: Competitor[];
}

interface ChartDataPoint {
  date: string;
  [key: string]: string | number;
}

const formatCurrency = (amount: number) => {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const PriceHistoryChart: React.FC<PriceHistoryChartProps> = ({ userProduct, competitors }) => {
  const processDataForChart = (): ChartDataPoint[] => {
    const allPricePoints = new Map<string, ChartDataPoint>();
    const allProducts = [userProduct, ...competitors];

    allProducts.forEach((product, index) => {
      const productName = index === 0 ? 'Your Product' : product.productName;
      if (product.historicalPrices) {
        product.historicalPrices.forEach(point => {
          if (!allPricePoints.has(point.date)) {
            allPricePoints.set(point.date, { date: point.date });
          }
          const existingPoint = allPricePoints.get(point.date)!;
          existingPoint[productName] = point.price;
        });
      }
    });
    
    return Array.from(allPricePoints.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  };

  const chartData = processDataForChart();

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-center text-dark-text-secondary">
        <p>No historical price data available to display chart.</p>
      </div>
    );
  }
  
  const competitorLines = competitors.map((c, i) => ({
    name: c.productName,
    color: ['#38bdf8', '#fbbf24', '#a78bfa', '#f87171'][i % 4]
  }));

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/80 backdrop-blur-sm border border-dark-border p-3 rounded-md shadow-lg min-w-[200px]">
          <p className="font-bold text-dark-text-primary mb-2">{label}</p>
          <ul className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <li key={`item-${index}`} className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <span style={{ backgroundColor: entry.color }} className="w-2.5 h-2.5 rounded-full mr-2"></span>
                  <span className="text-dark-text-secondary">{entry.name}:</span>
                </div>
                <span style={{ color: entry.color }} className="font-semibold ml-2">{formatCurrency(entry.value)}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <LineChart
          data={chartData}
          margin={{
            top: 5,
            right: 20,
            left: -10,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => formatCurrency(value as number)} />
          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: '12px' }} />
          <Line type="monotone" dataKey="Your Product" name="Your Product" stroke="#0d9488" strokeWidth={2} dot={{ r: 4, fill: '#0d9488' }} activeDot={{ r: 6, stroke: '#14b8a6' }} />
          {competitorLines.map(line => (
             <Line key={line.name} type="monotone" dataKey={line.name} stroke={line.color} strokeWidth={2} dot={{ r: 4, fill: line.color }} activeDot={{ r: 6 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};