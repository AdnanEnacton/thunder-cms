export interface HeroCta {
  label: string;
  href: string;
}

export interface HeroProps {
  heading: string;
  subheading?: string;
  image?: string;
  cta?: HeroCta;
  variant?: "centered" | "split" | "minimal";
}

export function Hero({ heading, subheading, image, cta, variant = "centered" }: HeroProps) {
  return (
    <section
      className={`thunder-hero thunder-hero--${variant}`}
      style={image ? { backgroundImage: `url(${image})` } : undefined}
    >
      <h1>{heading}</h1>
      {subheading ? <p>{subheading}</p> : null}
      {cta ? <a href={cta.href}>{cta.label}</a> : null}
    </section>
  );
}

export default Hero;
