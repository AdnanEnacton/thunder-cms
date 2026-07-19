export interface CtaButton {
  label: string;
  href: string;
}

export interface CtaProps {
  heading: string;
  subheading?: string;
  button?: CtaButton;
  style?: "solid" | "outline";
}

export function Cta({ heading, subheading, button, style = "solid" }: CtaProps) {
  return (
    <section className={`thunder-cta thunder-cta--${style}`}>
      <h2>{heading}</h2>
      {subheading ? <p>{subheading}</p> : null}
      {button ? <a href={button.href}>{button.label}</a> : null}
    </section>
  );
}

export default Cta;
