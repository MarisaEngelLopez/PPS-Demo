"use client";

import { useTranslation } from "@/components/i18n/TranslationProvider";
import type { TranslationKey } from "@/lib/i18n/dictionaries";
import {
  cockpitMetricToneColors,
  sortCockpitMetrics,
  type CockpitMetric,
  type CockpitMetricGroup,
} from "@/lib/domain/reporting/cockpitMetrics";

type CockpitMetricGridProps = {
  metrics: CockpitMetric[];
};

const groupLabelKeys: Record<CockpitMetricGroup, TranslationKey> = {
  lifecycle: "metrics.lifecycle",
  attention: "metrics.attention",
};

const metricLabelKeys: Record<string, TranslationKey> = {
  approved: "metrics.approvedClosed",
  closed: "metrics.closed",
  completed: "metrics.completed",
  critical: "metrics.critical",
  "due-this-month": "metrics.dueThisMonth",
  escalated: "metrics.escalated",
  "in-progress": "metrics.inProgress",
  "on-hold": "metrics.onHold",
  open: "metrics.open",
  overdue: "metrics.overdue",
  "overdue-actions": "metrics.overdueActions",
  red: "metrics.red",
  total: "metrics.total",
};

export function CockpitMetricGrid({ metrics }: CockpitMetricGridProps) {
  const orderedMetrics = sortCockpitMetrics(metrics);
  const lifecycleMetrics = orderedMetrics.filter(
    (metric) => metric.group === "lifecycle"
  );
  const attentionMetrics = orderedMetrics.filter(
    (metric) => metric.group === "attention"
  );

  return (
    <div className="cockpit-grid">
      <MetricGroup group="lifecycle" metrics={lifecycleMetrics} />
      {attentionMetrics.length > 0 && (
        <MetricGroup group="attention" metrics={attentionMetrics} />
      )}

      <style jsx>{`
        .cockpit-grid {
          align-items: start;
          display: grid;
          gap: 0.5rem;
          grid-template-columns: minmax(0, 1.35fr) minmax(150px, 0.75fr);
          margin-bottom: 0.75rem;
          --cockpit-card-width: 108px;
        }

        @media (max-width: 1100px) {
          .cockpit-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

function MetricGroup({
  group,
  metrics,
}: {
  group: CockpitMetricGroup;
  metrics: CockpitMetric[];
}) {
  const { t } = useTranslation();
  if (metrics.length === 0) return null;

  return (
    <div className="metric-group">
      <div className="metric-group-label">{t(groupLabelKeys[group])}</div>
      <div className="metric-group-grid">
        {metrics.map((metric) => (
          <MetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      <style jsx>{`
        .metric-group {
          min-width: 0;
        }

        .metric-group-label {
          color: #64748b;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.04em;
          margin-bottom: 0.35rem;
          text-transform: uppercase;
        }

        .metric-group-grid {
          display: grid;
          gap: 0.3rem;
          grid-template-columns: repeat(
            auto-fill,
            minmax(var(--cockpit-card-width), var(--cockpit-card-width))
          );
        }

        @media (max-width: 700px) {
          .metric-group-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }
        }
      `}</style>
    </div>
  );
}

function MetricCard({ metric }: { metric: CockpitMetric }) {
  const colors = cockpitMetricToneColors[metric.tone];
  const { t } = useTranslation();
  const labelKey = metricLabelKeys[metric.key];

  return (
    <div
      className="metric-card"
      style={{
        background: colors.background,
        borderColor: colors.border,
      }}
      title={
        metric.countsTowardTotal
          ? "Lifecycle KPI: contributes to the status distribution."
          : "Attention flag: may overlap with lifecycle KPIs."
      }
    >
      <div className="metric-label" style={{ color: colors.label }}>
        {labelKey ? t(labelKey) : metric.label}
      </div>
      <div className="metric-value" style={{ color: colors.value }}>
        {metric.value}
      </div>

      <style jsx>{`
        .metric-card {
          align-items: center;
          border: 1px solid;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          min-height: 30px;
          padding: 0.28rem 0.34rem;
        }

        .metric-label {
          font-size: 0.64rem;
          font-weight: 700;
          line-height: 1.1;
        }

        .metric-value {
          font-size: 0.86rem;
          font-weight: 800;
        }
      `}</style>
    </div>
  );
}
