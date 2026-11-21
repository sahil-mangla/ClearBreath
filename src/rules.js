import { CITIES } from './cities.js';
import { HEALTH_IMPACT, HEALTH_IMPACT_HI, LEVELS, LEVELS_HI, computeAqi } from './aqi.js';

/* ------------------------------------------------------------------ *
 * Impact constants. All are approximate, typical-value estimates and *
 * are surfaced to the user as such (see `assumptions` in the output).*
 * ------------------------------------------------------------------ */

/** kg CO2 per passenger-km (typical published averages; real values vary). */
export const EMISSION_FACTORS = Object.freeze({
  car: 0.17,
  auto_cab: 0.12,
  two_wheeler: 0.05,
  bus_metro: 0.035,
  walk_cycle: 0,
  wfh: 0,
});
const WORK_DAYS_PER_WEEK = 5;
const WORK_WEEKS_PER_YEAR = 48;

/** Door-to-door average speed in km/h used to estimate time spent commuting. */
const COMMUTE_SPEED = { car: 20, auto_cab: 20, two_wheeler: 22, bus_metro: 18, walk_cycle: 8 };
/** Share of outdoor PM2.5 actually breathed in: closed AC cabin vs open air. */
const CABIN_FACTOR = 0.5;
const MASK_FACTOR = 0.2; // real-world fitted N95 (~80% effective; lab rating is >=95%)
const INDOOR_RATIO = { baselinePurifier: 0.5, baselineNone: 0.8, planPurifier: 0.3, planNone: 0.5 };
const WHO_PM25_24H = 15; // µg/m³, WHO 2021 guideline
const INDIA_PM25_24H = 60; // µg/m³, India NAAQS
export const PM25_GUIDELINES = { whoPm25_24h: WHO_PM25_24H, indiaPm25_24h: INDIA_PM25_24H };

// Only a car's closed cabin filters traffic air. 'auto_cab' covers open auto-rickshaws as well as cabs, so it is
// modelled as open to avoid promising a benefit that auto riders do not get.
const CLOSED_CABIN = new Set(['car']);

/** Per-condition guidance, kept conservative: it supports a doctor's plan and never replaces one. */
export const CONDITION_ADVICE = Object.freeze({
  asthma: 'Asthma: keep your reliever inhaler on you and follow your doctor\'s asthma action plan. Do not skip your regular medicines on smoggy days.',
  heart: 'Heart condition: avoid exertion outdoors, take it easy on stairs and walks, and treat chest discomfort or unusual breathlessness as a reason to call your doctor.',
  pregnancy: 'Pregnancy: keep outdoor time short, wear a well-fitted N95 when you must go out, and ask your doctor or midwife about smog days.',
});
const CONDITION_ORDER = Object.keys(CONDITION_ADVICE);

const isVulnerable = (p) => p.children > 0 || p.seniors > 0 || p.conditions.length > 0;
/** The same rule that decides whether the plan recommends a mask, so the exposure model cannot disagree with it. */
const needsMask = (L, p) => L >= 3 || (L >= 2 && isVulnerable(p));

const istMonth = (d) =>
  Number(new Intl.DateTimeFormat('en-US', { month: 'numeric', timeZone: 'Asia/Kolkata' }).format(d)) - 1;

export function fmtHour(h) {
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${suffix}`;
}

/**
 * One recommendation. `p` holds the figures and variant flags the text was built from, so the built-in
 * Hindi catalogue (hi.js) can rebuild the same advice deterministically. It is stripped before the response.
 */
const act = (id, priority, title, detail, impact, p = {}) => ({ id, priority, title, detail, impact, p });
const top = (list, n = 5) => [...list].sort((a, b) => a.priority - b.priority).slice(0, n);

/**
 * Illustrative time-weighted PM2.5 exposure model: "today as usual" vs "following the plan".
 * Deliberately simple and transparent; every assumption is returned to the caller.
 */
export function estimateExposure({ pm25, profile: p, window: w, levelIndex = computeAqi({ pm25 })?.levelIndex ?? 0 }) {
  const speed = COMMUTE_SPEED[p.commute];
  const commuteH = p.commute === 'wfh' ? 0 : Math.min(3, (p.commuteKm * 2) / speed);
  const cabin = CLOSED_CABIN.has(p.commute) ? CABIN_FACTOR : 1;
  const otherOutH = 1;
  const indoorH = Math.max(0, 24 - commuteH - otherOutH);

  // The plan only changes anything the advice actually asks for: no mask, shut windows or timing on a clean day.
  const polluted = levelIndex >= 2;
  const masked = needsMask(levelIndex, p);
  const bestPm = w && polluted ? Math.min(pm25, w.bestPm25) : pm25;
  const planRatio = polluted ? (p.hasPurifier ? INDOOR_RATIO.planPurifier : INDOOR_RATIO.planNone) : p.hasPurifier ? INDOOR_RATIO.baselinePurifier : INDOOR_RATIO.baselineNone;
  const avg = (commuteConc, otherConc, mask, ratio) =>
    (commuteH * commuteConc * cabin * (cabin === 1 ? mask : 1) +
      otherOutH * otherConc * mask +
      indoorH * pm25 * ratio) /
    24;

  const baseline = avg(pm25, pm25, 1, p.hasPurifier ? INDOOR_RATIO.baselinePurifier : INDOOR_RATIO.baselineNone);
  const plan = avg(pm25, bestPm, masked ? MASK_FACTOR : 1, planRatio);

  return {
    baseline: Math.round(baseline * 10) / 10,
    plan: Math.round(plan * 10) / 10,
    reductionPct: baseline > 0 ? Math.max(0, Math.round((1 - plan / baseline) * 100)) : 0,
    whoGuideline: WHO_PM25_24H,
    indiaStandard: INDIA_PM25_24H,
    inputs: { commuteH: Math.round(commuteH * 10) / 10, hasPurifier: Boolean(p.hasPurifier), polluted, masked },
    assumptions: [
      `You spend about ${commuteH.toFixed(1)} h commuting, 1 h on other outdoor errands, and the rest indoors.`,
      `Today as usual: no mask outdoors; indoor air is about ${p.hasPurifier ? 50 : 80}% of outdoor levels.`,
      polluted
        ? `With the plan: ${masked ? 'a fitted N95 outdoors (about 80% effective in real use), ' : ''}outdoor errands in the cleanest forecast hour, windows shut at peak times and ${p.hasPurifier ? 'your purifier running' : 'a sealed room'} (indoor air about ${p.hasPurifier ? 30 : 50}% of outdoor).`
        : 'With the plan: the air is acceptable today, so the plan changes little and your modelled exposure stays about the same.',
      'Simplified model for illustration. Real exposure varies with fit, ventilation and traffic.',
    ],
  };
}

/**
 * Build the personalised plan.
 * @param {object} args
 * @param {number} args.levelIndex   0-5 index into LEVELS
 * @param {number} args.pm25         current PM2.5 in µg/m³
 * @param {object} args.profile      validated household profile
 * @param {string} args.cityKey
 * @param {object|null} args.window  result of bestWindow()
 * @param {Date} [args.now]
 */
export function buildPlan({ levelIndex: L, pm25, profile: p, cityKey, window: w, now = new Date() }) {
  const city = CITIES[cityKey];
  const month = istMonth(now);
  const smogRegion = city.region !== 'other';
  const smogSeason = smogRegion && [9, 10, 11, 0, 1].includes(month);
  const stubbleSeason = (city.region === 'ncr' || city.region === 'north') && [9, 10].includes(month);
  const vulnerable = isVulnerable(p);
  const poor = L >= 3;
  const polluted = L >= 2;

  const routine = [];
  const indoor = [];
  const alternatives = [];
  const alerts = [];

  /* ---------------- Daily routine ---------------- */
  if (w && polluted) {
    const gain = pm25 > 0 ? Math.round((1 - w.bestPm25 / pm25) * 100) : 0; // against the air right now, not the day's worst hour
    if (gain >= 10) {
      routine.push(
        act(
          'r-window', 1,
          `Step out around ${fmtHour(w.bestHour)} (${w.bestDay})`,
          `Forecast PM2.5 is lowest near ${fmtHour(w.bestHour)} (${w.bestPm25} µg/m³) and highest near ${fmtHour(w.worstHour)} (${w.worstPm25} µg/m³). Schedule school runs, errands and walks in the cleaner window, and keep early-morning and late-evening outings short.`,
          `About ${gain}% less PM2.5 in the air you breathe during that outing (forecast model, approximate).`,
          { bestHour: w.bestHour, worstHour: w.worstHour, bestPm: w.bestPm25, worstPm: w.worstPm25, day: w.bestDay, gain },
        ),
      );
    }
  } else if (!polluted) {
    routine.push(
      act('r-enjoy', 2, 'Good day to get outside',
        'Air quality is acceptable. Open windows to flush indoor air, and enjoy walks or outdoor play.',
        'Fresh-air ventilation now helps dilute indoor pollutants that build up during smoggier days.'),
    );
  }

  if (needsMask(L, p)) {
    routine.push(
      act(
        'r-mask', 1,
        p.hasN95 ? 'Wear your N95 outdoors, every time' : 'Get a fitted N95/FFP2 mask for outdoor trips',
        p.hasN95
          ? 'Wear it snugly over nose and chin with no gaps. Replace it when it is damp, dirty or hard to breathe through. Cloth and surgical masks filter far less.'
          : 'Choose an N95/FFP2 (without an exhalation-valve gap) and check the seal. Cloth and surgical masks filter far less. Kids need a small-size mask that fits.',
        'Certified N95s capture at least 95% of fine particles in lab tests; with real-world fit expect roughly 80-90%.',
        { hasN95: p.hasN95 },
      ),
    );
  }

  const conditions = CONDITION_ORDER.filter((c) => p.conditions.includes(c));
  if (polluted && conditions.length) {
    routine.push(
      act(
        'r-conditions', 1,
        'Extra care for your health conditions',
        `${conditions.map((c) => CONDITION_ADVICE[c]).join(' ')} Follow your own doctor\'s advice first.`,
        'Fine-particle spikes are a known trigger for asthma and heart symptoms, so planning ahead lowers the chance of an emergency.',
        { conditions },
      ),
    );
  }

  if (poor) {
    routine.push(
      act(
        'r-exercise', 2,
        p.children > 0 ? 'Move workouts and kids\' play indoors' : 'Move workouts indoors',
        'Do yoga, skipping, stretching or stair-climbing at home. Ask the school to shift PE and assembly indoors on Poor or worse days.',
        'Hard exercise multiplies the air you breathe several times over resting, so an outdoor workout is a big extra dose of smog.',
        { kids: p.children > 0 },
      ),
    );
  }

  if (smogSeason) {
    routine.push(
      act(
        'r-peak', 3, 'Avoid the early-morning and late-evening smog trap',
        'In North Indian winters, cold still air and low inversion layers typically hold smoke near the ground around dawn, dusk and night. Postpone morning walks until the sun has warmed the air.',
        'Typically the lowest-pollution hours are mid-afternoon, when the air mixes upward (check the forecast above).',
      ),
    );
  }

  if (city.region === 'ncr' && poor) {
    routine.push(
      act(
        'r-grap', 3, 'Follow GRAP restrictions',
        'Delhi-NCR runs the Graded Response Action Plan (GRAP) in smog season, with curbs on construction, diesel vehicles and more. Check CAQM announcements and comply (for example, avoid non-essential diesel trips).',
        'Community-wide compliance is what brings the whole region\'s PM2.5 down, protecting everyone, not only you.',
      ),
    );
  }

  const commuteTips = {
    car: ['Keep windows up and set AC to recirculate', 'Closed cabins block a lot of the particulate from traffic. Turn the engine off while waiting, and use the car only when needed.'],
    auto_cab: ['In a cab keep windows up; in an auto-rickshaw wear an N95', 'A closed cab cuts traffic fumes, but an auto-rickshaw is open to the road. Share rides where you can.'],
    two_wheeler: ['Wear an N95, not a cloth mask, on the bike', 'Two-wheeler riders are exposed to the full roadside air. Use a helmet visor, and avoid peak-traffic corridors if there is a quieter route.'],
    bus_metro: ['Wear your N95 on platforms and at stops', 'Metro carriages are usually cleaner than the street, but waiting at open stops is where the exposure happens.'],
    walk_cycle: ['Take back lanes away from main roads', 'Walk or cycle a street or two away from heavy traffic, and wear an N95 on Poor or worse days.'],
    wfh: ['Staying remote is your biggest exposure win', 'Spend your outdoor time in the cleanest window rather than at rush hour.'],
  };
  if (polluted || p.commute === 'wfh') {
    const [t, d] = commuteTips[p.commute];
    routine.push(
      act('r-commute', 2, t, d,
        p.commute === 'wfh'
          ? 'Skips roughly 1-3 hours of roadside air a day.'
          : 'Roadside air is usually the most polluted air of your day, so small commute changes pay back the most.',
        { mode: p.commute }),
    );
  }

  /* ---------------- Indoor air ---------------- */
  if (p.heating === 'wood_coal') {
    indoor.push(
      act(
        'i-heating-safety', 1, 'Never burn coal, wood or charcoal in a closed room',
        'Switch to an electric heater, oil-filled radiator or hot-water bottles, and use thermal wear and extra blankets. If you must use a sigri/angeethi, use it outdoors only.',
        'Removes a major indoor smoke source and avoids carbon-monoxide poisoning, which can be fatal in closed rooms.',
      ),
    );
    alerts.push({ key: 'co', level: 'critical', text: 'Burning coal, wood or charcoal indoors can cause deadly carbon-monoxide poisoning. Never do this in a closed room.' });
  }

  if (polluted) {
    indoor.push(
      act(
        'i-seal', 1, 'Keep windows and doors shut at peak hours',
        'Close up in the early morning, evening and night. Seal gaps with door sweeps or draught strips. A lived-in room closed up is far cleaner than an open one.',
        'Closed, sealed rooms typically hold indoor PM2.5 around 30-50% below outdoor levels (approximate; more with a purifier).',
      ),
    );
    indoor.push(
      act(
        'i-ventilate', 3, w ? `Air the house briefly at ${fmtHour(w.bestHour)}` : 'Air the house briefly in the afternoon',
        'Open windows for 10-15 minutes in the cleanest part of the day, then close up again. This clears cooking fumes and CO2 without letting in the worst air.',
        'Stops the stale-air build-up that comes from keeping everything closed all day.',
        { polluted: true, hour: w ? w.bestHour : null },
      ),
    );
  } else {
    indoor.push(
      act('i-ventilate', 3, 'Open windows for cross-ventilation', 'Air quality is fine today, so ventilate freely.', 'Dilutes indoor pollutants from cooking and cleaning.', { polluted: false }),
    );
  }

  if (p.hasPurifier) {
    indoor.push(
      act(
        'i-purifier', 2, 'Run your purifier on high in the room you use most',
        'Keep doors and windows closed while it runs, and place it away from walls and corners. Clean the pre-filter and replace the HEPA filter as per the manual.',
        'HEPA purifiers commonly reduce indoor PM2.5 by roughly 50-80% in a closed room.',
        { has: true },
      ),
    );
  } else if (polluted) {
    indoor.push(
      act(
        'i-purifier', 2, 'Get a HEPA purifier, or build a Corsi-Rosenthal box',
        'Pick a unit with a clean-air delivery rate (CADR) of about two-thirds of the room\'s floor area in sq ft. A low-cost alternative is a Corsi-Rosenthal box: a box fan with four MERV-13 filters taped on.',
        'HEPA purifiers commonly reduce indoor PM2.5 by roughly 50-80% in a closed room; DIY boxes also work well.',
        { has: false },
      ),
    );
  }

  if (vulnerable && poor) {
    indoor.push(
      act(
        'i-clean-room', 1,
        p.children > 0 && p.seniors > 0 ? 'Make one "clean room" for kids and elders' : p.children > 0 ? 'Make a "clean room" for the kids' : 'Make a "clean room" for the vulnerable',
        'Pick one bedroom, keep it sealed, run the purifier there, and let it be the place for sleeping, homework and rest during smog spikes.',
        'Concentrates your purifier benefit where the most vulnerable lungs spend most hours, including 8+ hours of sleep.',
        { kids: p.children > 0, elders: p.seniors > 0 },
      ),
    );
  }

  if (p.cooking === 'biomass') {
    indoor.push(
      act(
        'i-cooking', 1, 'Cook with the window open or an exhaust, and move to cleaner fuel',
        'Wood, dung and crop-residue chulhas are one of the biggest indoor smoke sources. Cook outdoors or in a ventilated space, and look at LPG (check PM Ujjwala Yojana eligibility), PNG or induction.',
        'The WHO lists clean cooking fuel as the single most effective fix for household air pollution.',
        { biomass: true },
      ),
    );
  } else if (p.cooking === 'lpg' || p.cooking === 'png') {
    indoor.push(
      act(
        'i-cooking', 3, 'Use the chimney or exhaust fan while cooking',
        'Frying and tadka produce lots of fine particles. Run the hood or exhaust fan during and 10 minutes after cooking, even in a closed-up house.',
        'Removes a large share of cooking particles before they spread through the home.',
        { biomass: false },
      ),
    );
  }

  indoor.push(
    act(
      'i-clean', 4, 'Wet-mop and damp-dust, don\'t dry-sweep',
      'Use a damp cloth or mop daily, and a HEPA vacuum if you have one. Skip incense, dhoop, mosquito coils and aerosol sprays on smoggy days.',
      'Dry sweeping stirs settled dust back into the air; damp cleaning keeps it down.',
    ),
  );

  if (polluted) {
    indoor.push(
      act(
        'i-plants', 5, 'Don\'t rely on houseplants to clean the air',
        'Plants are lovely but studies suggest you would need an impractical number of them per room to match a purifier. Treat them as a bonus, not a filter.',
        'Saves you from a false sense of safety, so seal and filter first.',
      ),
    );
  }

  /* ---------------- Sustainable alternatives ---------------- */
  let co2Week = 0;
  const km = p.commuteKm;
  if (p.commute === 'car' || p.commute === 'auto_cab') {
    const perWeek = (EMISSION_FACTORS[p.commute] - EMISSION_FACTORS.bus_metro) * km * 2 * WORK_DAYS_PER_WEEK;
    co2Week = Math.round(perWeek * 10) / 10;
    alternatives.push(
      act(
        'a-commute', 2, 'Swap to metro or bus, or carpool a few days a week',
        `Your ${km} km each-way trip is a good candidate. Shifting it to metro/bus, even on smog days only, cuts both tailpipe pollution and carbon.`,
        `Roughly ${co2Week} kg CO2 per week (about ${Math.round(co2Week * WORK_WEEKS_PER_YEAR)} kg per year) if you switch fully (approximate, per-passenger averages).`,
        { mode: p.commute, km, week: co2Week, year: Math.round(co2Week * WORK_WEEKS_PER_YEAR) },
      ),
    );
  } else if (p.commute === 'two_wheeler') {
    alternatives.push(
      act(
        'a-commute', 2, 'Consider an electric two-wheeler, or metro for long legs',
        'Electric scooters and bikes have no tailpipe PM or NOx, which matters most in dense streets. Metro for the longest part of your trip cuts both exposure and emissions.',
        'Zero tailpipe particulates; CO2 depends on the power grid but is typically lower per km.',
        { mode: 'two_wheeler' },
      ),
    );
  } else if (p.commute === 'bus_metro' || p.commute === 'walk_cycle' || p.commute === 'wfh') {
    const avoided = Math.round((EMISSION_FACTORS.car - EMISSION_FACTORS[p.commute]) * km * 2 * WORK_DAYS_PER_WEEK * 10) / 10;
    alternatives.push(
      act(
        'a-commute', 4, 'Keep it up: your commute is already low-emission',
        'You are already doing the best thing for the air. Encourage a colleague or neighbour to join you on bus, metro or on foot.',
        `Compared with driving the same ${km} km alone, you already avoid about ${avoided} kg CO2 a week.`,
        { mode: p.commute, km, week: avoided },
      ),
    );
  }

  if (['car', 'auto_cab', 'two_wheeler'].includes(p.commute)) {
    alternatives.push(
      act(
        'a-idle', 3, 'Switch the engine off when waiting',
        'At long red lights, railway crossings or while waiting for family, turn the engine off. Keep your vehicle\'s PUC (pollution check) valid and serviced.',
        'An idling engine gives off particulates and CO2 while going nowhere.',
      ),
    );
  }

  if (p.heating !== 'electric') {
    alternatives.push(
      act(
        'a-warm', 3, 'Stay warm without burning anything',
        'Layer up with thermal innerwear and wool, use insulated curtains, quilts and hot-water bottles, and keep a rug on cold floors. Use a thermostat-controlled electric heater only in the room in use.',
        'Replaces smoky sources of warmth, a common winter cause of both outdoor and indoor PM2.5.',
      ),
    );
  }

  if (p.cooking === 'lpg' || p.cooking === 'biomass') {
    alternatives.push(
      act(
        'a-cook', 4, p.cooking === 'biomass' ? 'Move up the clean-cooking ladder' : 'Add an induction cooktop for quick meals',
        p.cooking === 'biomass'
          ? 'LPG or PNG is the next step; induction is cleaner still, especially if you have rooftop solar or a green-power plan.'
          : 'An induction hob for daily dal-chawal and tea means no combustion fumes indoors, and it pairs well with a solar-backed grid.',
        'Cuts combustion fumes in your kitchen and, with a cleaner grid, lowers your household carbon too.',
        { biomass: p.cooking === 'biomass' },
      ),
    );
  }

  alternatives.push(
    act(
      'a-waste', 3, 'Never burn leaves, garbage or plastic, and compost instead',
      'Open burning of leaves, rubbish and plastic is a notable winter source of fine particles and toxic fumes. Segregate waste, compost kitchen scraps and report open burning to your municipal body.',
      'Removes a local smoke source that releases fine particles and toxic gases right where people live and breathe.',
    ),
  );

  alternatives.push(
    act(
      'a-rwa', 3, 'Take it to your RWA or community',
      'Propose heater provisions for security guards (who often burn wood for warmth), water sprinkling on dusty roads, covered construction sites, and a no-burning policy for the society.',
      'Neighbourhood-level changes lower air pollution for everyone, including people who can\'t afford purifiers.',
    ),
  );

  if (stubbleSeason) {
    alerts.push({ key: 'stubble', level: 'info', text: 'It is crop-residue (stubble) burning season in Punjab and Haryana. When winds blow from the north-west, smoke can raise PM2.5 across Delhi-NCR and nearby cities for days.' });
  }
  if ([9, 10].includes(month)) {
    alternatives.push(
      act(
        'a-festive', 4, 'Celebrate festivals with lights, not crackers',
        'Diyas, LED lights, rangoli and sweets are great alternatives. Even "green" crackers still release particulates, and smog is already at its seasonal peak.',
        'Festival-night firecrackers are known to push PM2.5 sharply higher for hours, on top of seasonal smog.',
      ),
    );
  }

  if (L >= 4 || (poor && vulnerable)) {
    alerts.unshift({
      key: L >= 5 ? 'severe' : 'verypoor',
      level: 'critical',
      text: L >= 5
        ? 'Severe air quality: limit outdoor activity to essentials. People with asthma, heart disease, pregnancy, young children and elders should stay indoors with a purifier running.'
        : 'Very poor air for sensitive people: keep outdoor time short, keep rescue medicines handy, and stay in your cleanest room.',
    });
  }
  if (poor && vulnerable) {
    alerts.push({ key: 'medical', level: 'warning', text: 'Seek medical care promptly for breathing difficulty, wheezing that does not settle, chest pain, dizziness or unusual fatigue. This tool is not medical advice.' });
  }

  return {
    routine: top(routine, 6),
    indoor: top(indoor, 6),
    alternatives: top(alternatives),
    alerts,
    totals: { co2SavedKgPerWeek: co2Week, co2SavedKgPerYear: Math.round(co2Week * WORK_WEEKS_PER_YEAR) },
  };
}

/**
 * Template briefing used when Gemini is unavailable. In Hindi the sentence is written in Hindi and does
 * not quote the action titles; it points to the marked top actions below instead.
 * The returned `lang` is the language the text is really in.
 */
/** The three most important actions across the whole plan, most important first. */
export const topActions = (plan) => top([...plan.routine, ...plan.indoor, ...plan.alternatives], 3);

export function fallbackBriefing({ cityName, aqi, pm25, plan, exposure, lang = 'en' }) {
  const picked = topActions(plan);
  if (lang === 'hi') {
    const text =
      `${cityName} की हवा ${LEVELS_HI[aqi.levelIndex]} है (AQI ${aqi.value}, PM2.5 लगभग ${Math.round(pm25)} µg/m³)। ${HEALTH_IMPACT_HI[aqi.levelIndex]} ` +
      (exposure.reductionPct > 0
        ? `इस योजना पर चलने से आपके दैनिक PM2.5 संपर्क में लगभग ${exposure.reductionPct}% की कमी आ सकती है। `
        : 'अपनी अच्छी आदतें बनाए रखें। ') +
      'आज के सबसे ज़रूरी कदम नीचे चिह्नित हैं।';
    return { text, topActionIds: picked.map((a) => a.id), source: 'rules', lang: 'hi' };
  }
  const text =
    `Air in ${cityName} is ${LEVELS[aqi.levelIndex]} (AQI ${aqi.value}, PM2.5 about ${Math.round(pm25)} µg/m³). ${HEALTH_IMPACT[aqi.levelIndex]} ` +
    `Your top moves today: ${picked.map((a) => a.title.charAt(0).toLowerCase() + a.title.slice(1)).join('; ')}. ` +
    (exposure.reductionPct > 0
      ? `Following this plan could cut your estimated daily PM2.5 exposure by about ${exposure.reductionPct}%.`
      : 'Keep up your good habits.');
  return { text, topActionIds: picked.map((a) => a.id), source: 'rules', lang: 'en' };
}
