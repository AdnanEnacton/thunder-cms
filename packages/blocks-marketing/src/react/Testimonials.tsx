export interface Testimonial {
  quote: string;
  author: string;
  role?: string;
  avatar?: string;
}

export interface TestimonialsProps {
  heading?: string;
  items: Testimonial[];
}

export function Testimonials({ heading, items }: TestimonialsProps) {
  return (
    <section className="thunder-testimonials">
      {heading ? <h2>{heading}</h2> : null}
      <div className="thunder-testimonials-list">
        {items.map((item, i) => (
          <blockquote key={i} className="thunder-testimonial">
            <p>{item.quote}</p>
            <footer>
              {item.avatar ? <img src={item.avatar} alt={item.author} /> : null}
              <span>{item.author}</span>
              {item.role ? <span className="thunder-testimonial-role"> · {item.role}</span> : null}
            </footer>
          </blockquote>
        ))}
      </div>
    </section>
  );
}

export default Testimonials;
