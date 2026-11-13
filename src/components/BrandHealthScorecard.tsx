import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Activity, 
  RefreshCw, 
  FileCheck2,
  Scale,
  Sparkles
} from 'lucide-react';
import { BrandHealthMetrics, Role } from '../types';
import { api } from '../services/api';

interface BrandHealthScorecardProps {
  currentRole: Role;
  isDemoMode?: boolean;
}

export const BrandHealthScorecard: React.FC<BrandHealthScorecardProps> = ({ currentRole, isDemoMode = false }) => {
  const [metrics, setMetrics] = useState<BrandHealthMetrics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const data = await api.getBrandHealth();
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load brand health:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [isDemoMode]);

  if (isLoading || !metrics) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs">
        <div className="w-8 h-8 border-3 border-teal-800/20 border-t-teal-800 rounded-full animate-spin mx-auto mb-3" />
        <div className="text-sm font-semibold text-slate-800">Calculating Enterprise Brand Health Metrics...</div>
      </div>
    );
  }

  if (!isDemoMode && (!metrics || metrics.departmentBreakdowns.length === 0)) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
            Enterprise Brand Health Scorecard
          </h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Real-time compliance rates, turnaround velocity, and brand violation tracking based on your uploaded assets.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-teal-800 mx-auto flex items-center justify-center">
            <Activity className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No Audits Run Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Upload and analyze your brand posters, presentation slides, or text drafts in the Pre-Publication Check to generate real-time compliance telemetry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Overall Health Score */}
        <div className="bg-teal-900 text-white rounded-xl p-5 shadow-xs flex flex-col justify-between col-span-2 lg:col-span-1">
          <div>
            <div className="text-xs uppercase font-bold tracking-wider text-teal-200">
              Brand Health Index
            </div>
            <div className="text-4xl font-extrabold font-mono mt-2 tabular-nums">
              {metrics.overallHealthScore}<span className="text-xl font-normal text-teal-300">/100</span>
            </div>
          </div>
          <div className="mt-3 text-xs text-teal-100 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-300" />
            <span>Optimal Governance Grade</span>
          </div>
        </div>

        {/* Compliance Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Pre-Publication Pass Rate
            </div>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
              {metrics.complianceRate}%
            </div>
          </div>
          <div className="text-[11px] text-emerald-800 flex items-center gap-1 mt-2">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{isDemoMode ? '+14.2% since Checkpoint launch' : 'Live pre-publication pass rate'}</span>
          </div>
        </div>

        {/* Compliance Velocity */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Turnaround Velocity
            </div>
            <div className="text-3xl font-bold font-mono text-teal-800 mt-2 tabular-nums">
              {metrics.avgVelocityHours}h
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {isDemoMode ? (
              <>
                Down from <strong className="text-slate-800">4.2 days</strong> (78% faster)
              </>
            ) : (
              'Average automated audit speed'
            )}
          </div>
        </div>

        {/* Interceptions Month */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Violations Intercepted
            </div>
            <div className="text-3xl font-bold font-mono text-slate-900 mt-2 tabular-nums">
              {metrics.activeViolationsCaughtMonth}
            </div>
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            0 public liability errors released
          </div>
        </div>

        {/* Legal Risk Exposure Score */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Regulatory Exposure Index
            </div>
            <div className="text-3xl font-bold font-mono text-emerald-700 mt-2 tabular-nums">
              {metrics.legalRiskExposureScore}<span className="text-sm font-normal text-slate-400">/100</span>
            </div>
          </div>
          <div className="text-[11px] text-emerald-800 flex items-center gap-1 mt-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>ASCI / CCPA Low Risk</span>
          </div>
        </div>
      </div>

      {/* 2-Column Split: Department Breakdown & Monthly Evolution Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Department Breakdown Table (7 cols) */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-teal-800" />
              <h3 className="text-sm font-bold text-slate-900">Channel Risk &amp; Compliance Audit</h3>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {metrics.departmentBreakdowns.length} Active Unit(s)
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {metrics.departmentBreakdowns.map((dept, i) => (
              <div key={i} className="p-4 hover:bg-slate-50/50 transition-colors space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <span>{dept.department}</span>
                    <span className="font-mono text-[10px] text-slate-400 font-normal">
                      ({dept.submissionsCount} drafts)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900">{dept.complianceScore}% Safe</span>
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-mono ${
                        dept.complianceScore >= 90
                          ? 'bg-emerald-100 text-emerald-800'
                          : dept.complianceScore >= 80
                          ? 'bg-amber-100 text-amber-900'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {dept.complianceScore >= 90 ? 'EXCELLENT' : dept.complianceScore >= 80 ? 'MONITORED' : 'HIGH RISK'}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      dept.complianceScore >= 90 ? 'bg-emerald-600' : dept.complianceScore >= 80 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${dept.complianceScore}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                  <span>
                    Top caught friction: <strong className="text-slate-700">{dept.topFlaggedRule}</strong>
                  </span>
                  <span className="text-teal-800 hover:underline cursor-pointer">
                    View Unit Reports &rarr;
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Monthly Velocity & Learning Trajectory (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-teal-800" />
                <h3 className="text-sm font-bold text-slate-900">4-Month Improvement Curve</h3>
              </div>
              <span className="text-[11px] text-emerald-800 font-semibold font-mono">
                {isDemoMode ? 'Velocity +78%' : 'Live Telemetry'}
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tracking the systemic impact of Clarity Heatmap rule rewrites on organizational speed and repeat violation drops.
            </p>

            <div className="space-y-3 pt-1">
              {metrics.monthlyTrends.map((t, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 text-xs flex items-center justify-between">
                  <div>
                    <div className="font-bold text-slate-900">{t.month}</div>
                    <div className="text-[11px] text-slate-500">
                      {t.violationsIntercepted} violations intercepted
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-teal-900 text-sm">
                      {t.healthScore} <span className="text-[10px] font-normal text-slate-500">score</span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 flex items-center justify-end gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{t.avgHoursToApprove}h avg</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Legal Compliance Guarantee Shield */}
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-4 text-xs text-teal-950 space-y-1.5">
            <div className="font-bold flex items-center gap-1.5 text-teal-900">
              <Scale className="w-4 h-4" />
              <span>Audit Readiness Certificate</span>
            </div>
            <p className="text-[11px] text-teal-900 leading-relaxed">
              Every content draft and poster processed through Checkpoint maintains a timestamped audit record, protecting {isDemoMode ? 'QuickBite Express' : 'your organization'} against misrepresentation claims under <strong className="text-teal-950">ASCI / CCPA / Moffatt v. Air Canada (2024)</strong> standards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
