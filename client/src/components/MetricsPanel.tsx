"use client";

import React, { useState } from 'react';

interface CompanyMetrics {
  userCount: number | null;
  growthRate: number | null;
  burnRate: string | null;
  revenue: string | null;
}

interface MetricsPanelProps {
  metrics: CompanyMetrics;
  onUpdate: (metrics: Partial<CompanyMetrics>) => Promise<void>;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics, onUpdate }) => {
  const [editingMetric, setEditingMetric] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEdit = (metricName: string, currentValue: string | number | null) => {
    setEditingMetric(metricName);
    setEditValue(currentValue?.toString() || '');
  };

  const handleSave = async (metricName: string) => {
    const value = editValue.trim();
    if (!value) return;

    const updateData: Partial<CompanyMetrics> = {};
    if (metricName === 'userCount' || metricName === 'growthRate') {
      updateData[metricName] = Number(value);
    } else if (metricName === 'burnRate' || metricName === 'revenue') {
      updateData[metricName] = value;
    }
    await onUpdate(updateData);
    setEditingMetric(null);
  };

  const handleCancel = () => {
    setEditingMetric(null);
    setEditValue('');
  };

  const renderMetricValue = (name: keyof CompanyMetrics, value: string | number | null) => {
    if (editingMetric === name) {
      return (
        <div className="flex space-x-2">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-2 py-1 border rounded"
            autoFocus
          />
          <button
            onClick={() => handleSave(name)}
            className="px-2 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-2 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      );
    }

    return (
      <div className="flex justify-between items-center">
        <span className="text-xl font-semibold">{value || 'N/A'}</span>
        <button
          onClick={() => handleEdit(name, value)}
          className="ml-2 text-blue-500 hover:text-blue-700"
        >
          Edit
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900">Company Metrics</h3>
      
      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">User Count</h4>
          </div>
          {renderMetricValue('userCount', metrics.userCount)}
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Growth Rate</h4>
          </div>
          {renderMetricValue('growthRate', metrics.growthRate)}
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Burn Rate</h4>
          </div>
          {renderMetricValue('burnRate', metrics.burnRate)}
        </div>

        <div className="p-4 border rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-medium">Revenue</h4>
          </div>
          {renderMetricValue('revenue', metrics.revenue)}
        </div>
      </div>
    </div>
  );
};

export default MetricsPanel;
