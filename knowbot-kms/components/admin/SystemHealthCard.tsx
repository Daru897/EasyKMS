'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, CheckCircle, AlertCircle, XCircle, Loader2 } from 'lucide-react';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    vectorStore: 'up' | 'down';
    sync: 'up' | 'down';
    llm: 'up' | 'down';
  };
  lastChecked: string;
}

interface SystemHealthCardProps {
  delay?: number;
}

export default function SystemHealthCard({ delay = 0 }: SystemHealthCardProps) {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkHealth = async () => {
      try {
        // For now, simulate health check since we don't have a dedicated endpoint
        // In production, this would call /api/health
        setHealth({
          status: 'healthy',
          services: {
            database: 'up',
            vectorStore: 'up',
            sync: 'up',
            llm: 'up',
          },
          lastChecked: new Date().toISOString(),
        });
      } catch {
        setHealth({
          status: 'unhealthy',
          services: {
            database: 'down',
            vectorStore: 'down',
            sync: 'down',
            llm: 'down',
          },
          lastChecked: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (health?.status) {
      case 'healthy':
        return <CheckCircle className="w-6 h-6 text-emerald-600" />;
      case 'degraded':
        return <AlertCircle className="w-6 h-6 text-amber-600" />;
      case 'unhealthy':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Activity className="w-6 h-6 text-gray-400" />;
    }
  };

  const getStatusColor = () => {
    switch (health?.status) {
      case 'healthy':
        return 'bg-emerald-100 border-emerald-200';
      case 'degraded':
        return 'bg-amber-100 border-amber-200';
      case 'unhealthy':
        return 'bg-red-100 border-red-200';
      default:
        return 'bg-gray-100 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (health?.status) {
      case 'healthy':
        return 'All Systems Operational';
      case 'degraded':
        return 'Some Services Degraded';
      case 'unhealthy':
        return 'System Issues Detected';
      default:
        return 'Checking Status...';
    }
  };

  const services = [
    { key: 'database', label: 'Database' },
    { key: 'vectorStore', label: 'Vector Store' },
    { key: 'sync', label: 'Sync Service' },
    { key: 'llm', label: 'LLM Service' },
  ];

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className="bg-white rounded-xl border border-gray-100 shadow-sm p-6"
      >
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-3 rounded-xl ${getStatusColor()}`}>
          {getStatusIcon()}
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">System Health</h3>
          <p className="text-sm text-gray-500">{getStatusText()}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {services.map((service) => {
          const status = health?.services[service.key as keyof typeof health.services];
          const isUp = status === 'up';

          return (
            <div
              key={service.key}
              className={`flex items-center gap-2 p-2 rounded-lg ${
                isUp ? 'bg-emerald-50' : 'bg-red-50'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isUp ? 'bg-emerald-500' : 'bg-red-500'
                }`}
              />
              <span className={`text-sm ${isUp ? 'text-emerald-700' : 'text-red-700'}`}>
                {service.label}
              </span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
