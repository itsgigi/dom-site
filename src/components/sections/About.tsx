import ali from '../../assets/ali.png'
import aliNoBg from '../../assets/ali-nobg.png'

export default function About() {
  return (
    <section
      id="about"
      className="relative flex min-h-screen flex-col items-center bg-ivory px-6 pb-24"
    >
      <div className="h-100 w-2 bg-sky absolute sm:h-100 sm:w-2.5" />

      <div className="flex flex-1 flex-col items-center justify-center gap-10 xl:flex-row xl:gap-22">
        <div className="relative z-10 h-64 w-64 sm:h-130 sm:w-130">
          <img
            src={ali}
            alt=""
            className="h-full w-full rounded-4xl object-cover"
          />
          <img
            src={aliNoBg}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute z-20 hidden xl:flex object-contain inset-0 sm:h-[calc(100%+16rem)] -translate-y-31"
          />
        </div>
        <div className="relative flex max-w-2xl flex-col items-center gap-6 rounded-4xl bg-sky p-8 text-center sm:p-12 xl:items-start xl:text-left">
          <p className="font-helvetica text-sm font-bold uppercase tracking-[0.2em] text-merlot">
            About Us
          </p>
          <h2 className="font-kopiku text-4xl uppercase text-merlot sm:text-5xl">
            Your companion in the city
          </h2>
          <p className="font-helvetica text-lg leading-relaxed text-night">
            Days of Milan is here for anyone finding their way around the city —
            new in town or ten years deep. We share the spots, the rituals, and
            the small moments that make Milan feel like home. No overhyped
            lists, no fluff — just honest recommendations from people who
            genuinely love this city.
          </p>

          <svg
            viewBox="250 10 250 400"
            className="absolute top-full h-72 w-40 -translate-x-5 xl:-translate-x-35 -translate-y-10 sm:h-96 sm:w-56"
            fill="none"
          >
            <path
              d="M410.7623291015625,52.914798736572266C410.5979064941406,78.07175070444742,419.23767344156903,155.9342378616333,409.865478515625,190.13453674316406C400.49328358968097,224.33483562469482,382.3318486531576,229.92526321411134,359.6412658691406,239.46188354492188C336.95068308512367,248.9985038757324,301.88341827392577,249.55156987508138,286.0986633300781,242.1524658203125C270.3139083862305,234.75336176554362,270.4185394287109,209.7907267252604,273.5426025390625,199.10313415527344C276.6666656494141,188.41554158528646,292.61583760579424,184.02092895507812,303.1390075683594,183.85650634765625C313.6621775309245,183.69208374023438,324.20030619303384,186.36771876017252,330.94171142578125,198.20628356933594C337.68311665852866,210.04484837849935,338.1016377766927,225.0822146097819,339.9103088378906,248.4304962158203C341.71897989908854,271.77877782185874,340.3139165242513,299.58147557576496,340.80718994140625,325.560546875C341.3004633585612,351.53961817423504,342.2720458984375,378.29595947265625,342.60089111328125,390.134521484375"
              stroke="#BCD2E0"
              strokeWidth="12"
              strokeLinecap="butt"
              transform="matrix(1,0,0,1,56.93000793457031,-21.524662017822266)"
            />
          </svg>
        </div>
      </div>
    </section>
  )
}
