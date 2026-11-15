import { ChapterNumber } from "./ChapterNumber";
import care from "../../assets/horse-care.jpg";
import portrait from "../../assets/stable-portrait.jpg";

// Illustrative heartbeat: flat baseline with three P-QRS-T complexes.
const ECG = [0, 1, 2]
  .map((beat) => {
    const x = 170 + beat * 380;
    return `L${x} 60 q8 -10 16 0 l10 0 l6 8 l10 -56 l10 80 l8 -32 l14 0 q12 -16 24 0`;
  })
  .join(" ");

const VITALS = [
  { label: "Temperature", value: 37.8, digits: 1, unit: "°C" },
  { label: "Heart rate", value: 36, digits: 0, unit: "bpm" },
  { label: "Respiration", value: 12, digits: 0, unit: "/min" },
];

function SpotlightPhoto({
  src,
  alt,
  width,
  height,
  tag,
}: {
  src: string;
  alt: string;
  width: number;
  height: number;
  tag: [string, string];
}) {
  // The colour copy is revealed under the pointer on fine-pointer desktops.
  return (
    <div className="landing-photo-frame" data-spotlight data-care-tilt>
      <p className="landing-care-tag" aria-hidden="true">
        <i />
        {tag[0]}
        <small>{tag[1]}</small>
      </p>
      <div className="landing-photo-inner" data-parallax>
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
        <img
          className="landing-spotlight-layer"
          src={src}
          alt=""
          aria-hidden="true"
          width={width}
          height={height}
          loading="lazy"
          decoding="async"
        />
      </div>
    </div>
  );
}

export function HorseCareSection() {
  return (
    <section
      id="care"
      className="landing-chapter landing-care"
      aria-labelledby="care-title"
    >
      <ChapterNumber value="05" />
      <figure className="landing-care-main" data-media-reveal>
        <SpotlightPhoto
          src={care}
          alt="A groom carefully preparing a white horse in a stable"
          width={960}
          height={1440}
          tag={["Groom", "Pre-departure check"]}
        />
        <figcaption>THE HUMAN TOUCH / RDNE Stock project · Pexels</figcaption>
      </figure>
      <figure className="landing-care-detail" data-media-reveal>
        <SpotlightPhoto
          src={portrait}
          alt="A horse resting at the door of a wooden stable"
          width={800}
          height={1200}
          tag={["Rest stop", "Between journeys"]}
        />
        <figcaption>BETWEEN JOURNEYS / Barbara Olsen · Pexels</figcaption>
      </figure>
      <svg
        className="landing-care-ecg"
        viewBox="0 0 1200 120"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d={`M0 60 ${ECG} L1200 60`} pathLength="1" data-care-ecg />
      </svg>
      <aside className="landing-care-log" aria-hidden="true" data-care-log>
        <header>
          <span>Horse health log</span>
          <em>
            <i />
            Logged by groom
          </em>
        </header>
        <dl>
          {VITALS.map((vital) => (
            <div key={vital.label}>
              <dt>{vital.label}</dt>
              <dd>
                <strong
                  data-care-vital={vital.value}
                  data-digits={vital.digits}
                >
                  {vital.value.toFixed(vital.digits)}
                </strong>
                {vital.unit}
              </dd>
            </div>
          ))}
        </dl>
        <small>Illustrative check before departure · fit to travel</small>
      </aside>
      <div className="landing-copy" data-reveal>
        <p className="landing-eyebrow">05 / The human touch</p>
        <h2 id="care-title" data-split>
          Not <span className="landing-strike">cargo.</span>
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
