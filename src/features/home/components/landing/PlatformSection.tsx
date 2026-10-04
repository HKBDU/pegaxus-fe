const pillars = [
  [
    "Transport planning",
    "Start with the horse, route and departure details. Keep each request connected to the journey it represents.",
  ],
  [
    "Compliance coordination",
    "Organize requirements, uploaded documents, reviews and revisions without losing the context.",
  ],
  [
    "Cross-border visibility",
    "Bring booking status and document progress into a clearer view for the people coordinating the journey.",
  ],
];

export function PlatformSection() {
  return (
    <section
      id="platform"
      className="landing-chapter landing-platform"
      aria-labelledby="platform-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">03 / A connected platform</p>
        <h2 id="platform-title">
          Connected by
          <br />
          <em>the details.</em>
        </h2>
        <div className="landing-pillars">
          {pillars.map(([title, copy], index) => (
            <article key={title}>
              <span>0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
