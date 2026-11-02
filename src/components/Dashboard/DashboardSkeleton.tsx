import SectionHeading from "./SectionHeading";
import * as layout from "./dashboard-layout.module.css";
import * as statStyles from "./stat-tiles.module.css";
import * as tableStyles from "./data-table.module.css";
import * as toggleStyles from "./filter-toggle-group.module.css";
import * as sliderStyles from "./year-range-slider.module.css";
import * as exportStyles from "./csv-export.module.css";
import * as skel from "./skeleton.module.css";

function Shimmer({ width = "4rem" }: { width?: string }) {
  return <span className={skel.shimmer} style={{ width }} />;
}

function SkeletonTiles({
  tiles,
  columns,
}: {
  tiles: Array<{ label: string; detail?: boolean }>;
  columns?: number;
}) {
  const cols = columns ?? tiles.length;
  return (
    <dl
      className={statStyles.grid}
      style={{ "--tile-cols": cols } as React.CSSProperties}
    >
      {tiles.map((tile, i) => (
        <div key={i} className={statStyles.tile}>
          <dt className={statStyles.value}>
            <Shimmer width="5rem" />
          </dt>
          <dd className={statStyles.label}>
            {tile.label}
            {tile.detail && (
              <span className={statStyles.detail}>
                <br />
                <Shimmer width="10rem" />
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

function SkeletonSlider({ years }: { years: [number, number] }) {
  const count = years[1] - years[0] + 1;
  return (
    <div className={sliderStyles.container}>
      <div className={sliderStyles.labels}>
        <span className={sliderStyles.year}>{years[0]}</span>
        <span className={sliderStyles.year}>{years[1]}</span>
      </div>
      <div className={sliderStyles.sparkline}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            className={`${sliderStyles.bar} ${skel.shimmerBlock}`}
            style={{ height: `${20 + ((i * 37 + 13) % 60)}%` }}
          />
        ))}
      </div>
      <div className={sliderStyles.track}>
        <div className={sliderStyles.range} style={{ left: 0, right: 0 }} />
        <div className={sliderStyles.handle} style={{ left: 0 }} />
        <div className={sliderStyles.handle} style={{ left: "100%" }} />
      </div>
      <div className={sliderStyles.ticks}>
        {Array.from({ length: count }, (_, i) => (
          <span key={i} className={sliderStyles.tick}>
            {years[0] + i}
          </span>
        ))}
      </div>
    </div>
  );
}

function SkeletonToggles({
  label,
  options,
}: {
  label: string;
  options: string[];
}) {
  return (
    <fieldset className={toggleStyles.fieldset}>
      <legend className={toggleStyles.legend}>{label}</legend>
      <div className={toggleStyles.group} role="radiogroup">
        {options.map((opt, i) => (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={i === 0}
            className={`${toggleStyles.toggle} ${i === 0 ? toggleStyles.active : ""}`}
            disabled
          >
            {opt}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function SkeletonChart({ height }: { height: number }) {
  return <div className={skel.chart} style={{ height }} />;
}

function SkeletonMap() {
  return <div className={skel.map} />;
}

function SkeletonLegend({ title }: { title: string }) {
  return (
    <div className={skel.legend}>
      <span className={skel.legendTitle}>{title}</span>
      <div className={skel.legendBar} />
      <div className={skel.legendLabels} />
    </div>
  );
}

function SkeletonTable({
  columns,
  rows,
  searchable,
}: {
  columns: Array<{ label: string; align?: "left" | "right" | "center" }>;
  rows: number;
  searchable?: boolean;
}) {
  return (
    <div className={tableStyles.wrapper}>
      {searchable && (
        <div className={tableStyles.searchRow}>
          <input
            className={tableStyles.searchInput}
            placeholder="Search..."
            disabled
          />
        </div>
      )}
      <div className={tableStyles.tableScroll}>
        <table className={tableStyles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.label}
                  className={col.align === "right" ? tableStyles.right : col.align === "center" ? tableStyles.center : undefined}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, i) => (
              <tr key={i}>
                {columns.map((col, j) => (
                  <td
                    key={j}
                    className={col.align === "right" ? tableStyles.right : col.align === "center" ? tableStyles.center : undefined}
                  >
                    <Shimmer width={j === 0 ? "6rem" : "3rem"} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={skel.pagination}>
        <span className={skel.paginationText}>
          <Shimmer width="4rem" />
        </span>
      </div>
    </div>
  );
}

function SkeletonExport() {
  return (
    <div className={layout.exportRow}>
      <button className={exportStyles.button} disabled>
        ↓ Export CSV
      </button>
    </div>
  );
}

function SkeletonRhnaPace() {
  const tiers = ["Very Low", "Low", "Moderate", "Above Moderate"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div
        style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        RHNA Progress (6th Cycle)
      </div>
      {tiers.map((tier) => (
        <div
          key={tier}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <span
            style={{
              width: "7rem",
              fontSize: "0.8rem",
              color: "var(--text-secondary)",
            }}
          >
            {tier}
          </span>
          <div
            style={{
              flex: 1,
              height: "0.75rem",
              background: "var(--dash-surface)",
              borderRadius: "3px",
              overflow: "hidden",
            }}
          >
            <div className={skel.shimmerBlock} style={{ width: "40%", height: "100%", borderRadius: "3px" }} />
          </div>
          <span style={{ width: "5rem" }}>
            <Shimmer width="5rem" />
          </span>
          <span style={{ width: "3rem" }}>
            <Shimmer width="2.5rem" />
          </span>
        </div>
      ))}
    </div>
  );
}

export function PermittedUnitsSkeleton() {
  return (
    <div className={layout.dashboard}>
      <SkeletonTiles
        tiles={[
          { label: "Approved Units" },
          { label: "RHNA Pace", detail: true },
        ]}
        columns={2}
      />

      <div className={layout.controls}>
        <SkeletonSlider years={[2018, 2025]} />
        <SkeletonToggles
          label="Unit type"
          options={["All", "SFD", "SFA", "2-4", "5+", "ADU", "MH"]}
        />
      </div>

      <div>
        <SectionHeading title="Permitting Trends" subtitle="All neighborhoods" />
        <SkeletonChart height={260} />
      </div>

      <SectionHeading title="Geographic Distribution" subtitle="By neighborhood" />

      <div className={layout.splitPane}>
        <div>
          <SkeletonMap />
          <SkeletonLegend title="Approved units" />
        </div>
        <div>
          <SkeletonTable
            columns={[
              { label: "Neighborhood" },
              { label: "Approved Units", align: "right" },
              { label: "YoY", align: "center" },
            ]}
            rows={8}
            searchable
          />
        </div>
      </div>

      <SkeletonExport />
    </div>
  );
}

export function AffordableUnitsSkeleton() {
  return (
    <div className={layout.dashboard}>
      <SkeletonTiles
        tiles={[
          { label: "Deed-Restricted" },
          { label: "Market Rate" },
          { label: "% Affordable (DR)" },
        ]}
        columns={3}
      />

      <SkeletonRhnaPace />

      <div className={layout.controls}>
        <SkeletonSlider years={[2018, 2025]} />
        <SkeletonToggles
          label="View"
          options={["All Units", "Deed-Restricted"]}
        />
      </div>

      <div>
        <SectionHeading title="Units by Income Tier" subtitle="All tiers" />
        <SkeletonChart height={320} />
      </div>

      <div className={layout.splitPane}>
        <div>
          <SkeletonMap />
          <SkeletonLegend title="Total units" />
        </div>
        <div>
          <SkeletonTable
            columns={[
              { label: "Tract" },
              { label: "DR", align: "right" },
              { label: "Market", align: "right" },
              { label: "Total", align: "right" },
            ]}
            rows={8}
            searchable
          />
        </div>
      </div>

      <SkeletonExport />
    </div>
  );
}

export function AffordabilityMapSkeleton() {
  return (
    <div className={layout.dashboard}>
      <SkeletonTiles
        tiles={[
          { label: "Median Rent" },
          { label: "Median Home Value" },
          { label: "% Cost-Burdened" },
        ]}
        columns={3}
      />

      <div className={layout.controls}>
        <SkeletonToggles
          label="Metric"
          options={["Cost Burden", "Rent", "Home Value", "Income"]}
        />
      </div>

      <div className={layout.splitPane}>
        <div>
          <SkeletonMap />
          <SkeletonLegend title="Cost Burden %" />
        </div>
        <div>
          <SkeletonTable
            columns={[
              { label: "Tract" },
              { label: "Cost Burden %", align: "right" },
              { label: "Rent", align: "right" },
              { label: "Home Value", align: "right" },
            ]}
            rows={8}
          />
        </div>
      </div>

      <SkeletonExport />
    </div>
  );
}

const SKELETONS: Record<string, React.FC> = {
  "permitted-units": PermittedUnitsSkeleton,
  "affordable-units": AffordableUnitsSkeleton,
  "affordability-map": AffordabilityMapSkeleton,
};

export default function DashboardSkeleton({
  dashboardType,
}: {
  dashboardType: string;
}) {
  const Skeleton = SKELETONS[dashboardType];
  if (!Skeleton) return null;
  return <Skeleton />;
}
