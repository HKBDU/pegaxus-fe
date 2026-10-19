const stages = [
  ["Planning", "Define the journey, horses and requested departure."],
  ["Legal & Health", "Bring requirements and supporting documents together."],
  ["Border Crossing", "Coordinate the details across countries and teams."],
  ["Arrival", "Keep the destination in view from the beginning."],
];

export function JourneySection() {
  return (
    <section
      id="journey"
      className="landing-chapter landing-copy-right"
      aria-labelledby="journey-title"
    >
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">01 / The journey</p>
        <h2 id="journey-title">
          From stable
          <br />
          <em>to destination.</em>
        </h2>
        <p className="landing-lead">
          Crossing a border is one moment in a much bigger journey. Connect the
          planning, paperwork and people behind every move.
        </p>
        <ol className="landing-journey-stages">
          {stages.map(([title, copy], index) => (
            <li key={title}>
              <span className="landing-step-number">0{index + 1}</span>
              <div>
                <h3>{title}</h3>
                <p>{copy}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
