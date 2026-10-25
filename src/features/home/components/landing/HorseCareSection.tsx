import care from "../../assets/horse-care.jpg";
import portrait from "../../assets/stable-portrait.jpg";

export function HorseCareSection() {
  return (
    <section
      id="care"
      className="landing-chapter landing-care"
      aria-labelledby="care-title"
    >
      <figure className="landing-care-main" data-media-reveal>
        <div className="landing-photo-frame">
          <img
            src={care}
            alt="A groom carefully preparing a white horse in a stable"
            width="960"
            height="1440"
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption>THE HUMAN TOUCH / RDNE Stock project · Pexels</figcaption>
      </figure>
      <figure className="landing-care-detail" data-media-reveal>
        <div className="landing-photo-frame">
          <img
            src={portrait}
            alt="A horse resting at the door of a wooden stable"
            width="800"
            height="1200"
            loading="lazy"
            decoding="async"
          />
        </div>
        <figcaption>BETWEEN JOURNEYS / Barbara Olsen · Pexels</figcaption>
      </figure>
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">05 / The human touch</p>
        <h2 id="care-title">
          Not cargo.
          <br />
          <em>A champion.</em>
        </h2>
        <p className="landing-lead">
          Behind every journey are people who care. Give the teams preparing and
          accompanying a horse the context they need to coordinate.
        </p>
        <p className="landing-caption">
          The horse comes first. Every detail follows.
        </p>
      </div>
    </section>
  );
}
