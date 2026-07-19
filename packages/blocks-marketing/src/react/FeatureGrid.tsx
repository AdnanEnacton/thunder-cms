export interface Feature {
  title: string;
  icon?: string;
  body?: string;
}

export interface FeatureGridProps {
  columns?: number;
  features: Feature[];
}

export function FeatureGrid({ columns = 3, features }: FeatureGridProps) {
  return (
    <section className="thunder-feature-grid" style={{ display: "grid", gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {features.map((feature, i) => (
        <div key={i} className="thunder-feature">
          <h3>{feature.title}</h3>
          {feature.body ? <p>{feature.body}</p> : null}
        </div>
      ))}
    </section>
  );
}

export default FeatureGrid;
