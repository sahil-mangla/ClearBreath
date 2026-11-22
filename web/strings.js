import { LANGS as SERVER_LANGS } from '../src/constants.js';
// Interface strings in English and Hindi. Pure data plus a tiny formatter, so it is unit-tested.
// Server-written plan text (action titles and details) stays English; the UI says so in Hindi mode.

const en = {
  skip: 'Skip to main content',
  'lang.label': 'Language',
  pause: 'Pause smoke motion',

  'hero.title': 'Plan your family’s way through the smog.',
  'hero.lead': 'Live air quality for your city, turned into a daily routine.',
  'hero.cta': 'Build my plan',

  city: 'City',
  'reading.loading': 'Reading the air…',
  'reading.fail': '{error} You can still build a plan by entering PM2.5 yourself.',
  'reading.aria': '{city} air quality index {aqi}, {cat}.',
  'reading.meta': 'PM2.5 {pm} µg/m³, main pollutant {dom}. Modelled by Open-Meteo, {time}.',
  'why.title': 'Why can this differ from other apps?',
  'why.body':
    'This number is modelled from satellite and atmospheric data (CAMS, via Open-Meteo) for the whole city. SAFAR and CPCB report what one monitor measures at one spot, so they can read higher or lower, especially near traffic or at a different hour. The advice here depends on the band, not the exact digit.',

  'band.0': 'Good',
  'band.1': 'Satisfactory',
  'band.2': 'Moderate',
  'band.3': 'Poor',
  'band.4': 'Very Poor',
  'band.5': 'Severe',
  'scale.title': 'Where today sits on India’s scale',
  'scale.lead':
    'Bands follow India’s CPCB index. The smoke behind this page is drawn thicker as the number climbs.',
  'scale.today': 'Today {aqi}',
  'scale.range': '{from} to {to}',
  'scale.aria': 'Today’s AQI is {aqi}, in the {band} band.',
  'scale.wait': 'Waiting for the live reading.',

  'now.title': 'At AQI {aqi}, do these three things now',
  'now.title.none': 'Do these three things now',
  'quick.clear': [
    ['Open the windows', 'Let fresh air in for a while in the afternoon.'],
    ['Play and exercise outside', 'Fine for most people. Very sensitive people can take it easier.'],
    ['Keep the air this clear', 'Walk, cycle or take the metro when you can.'],
  ],
  'quick.moderate': [
    ['Spend less time outside', 'Children, elders and anyone with asthma or heart disease most of all.'],
    ['Go out in the afternoon', 'The air is usually better then than early morning or evening.'],
    ['Shut windows at rush hour', 'Keep them closed in the morning and evening traffic peaks.'],
  ],
  'quick.poor': [
    ['Keep children’s play indoors', 'Skip the playground and outdoor sport today.'],
    ['Wear an N95 outside', 'Cloth and surgical masks filter fine smoke particles poorly.'],
    ['Run a purifier with windows shut', 'Use it in the room where you spend the most time.'],
  ],
  'quick.severe': [
    ['Stay indoors', 'Keep windows and doors shut. Avoid outdoor exercise.'],
    ['If you must go out, wear a fitted N95', 'Keep the trip short.'],
    [
      'Get medical help if needed',
      'Trouble breathing, chest pain or dizziness: see a doctor, do not wait it out.',
    ],
  ],

  'plan.title': 'Tell us about your home',
  'plan.forPre': 'Planning for ',
  'plan.forPost': '. Change the city in the air reading.',
  'plan.yourCity': 'your city',
  'who.legend': 'Who lives at home',
  adults: 'Adults',
  children: 'Children under 12',
  seniors: 'Seniors 65 and over',
  'health.legend': 'Health conditions in the household',
  'cond.asthma': 'Asthma or lung disease',
  'cond.heart': 'Heart disease',
  'cond.pregnancy': 'Pregnancy',
  'commute.legend': 'Daily commute',
  'commute.mode': 'Main way of travelling',
  'commute.km': 'One-way distance in km',
  'commute.bus_metro': 'Bus or metro',
  'commute.car': 'Car',
  'commute.auto_cab': 'Auto or cab',
  'commute.two_wheeler': 'Scooter or motorbike',
  'commute.walk_cycle': 'Walk or cycle',
  'commute.wfh': 'Work or study from home',
  'home.legend': 'Home',
  'cooking.label': 'Cooking fuel',
  'cooking.lpg': 'LPG cylinder',
  'cooking.png': 'Piped gas (PNG)',
  'cooking.induction': 'Induction or electric',
  'cooking.biomass': 'Wood, dung or crop residue',
  'heating.label': 'Winter warmth',
  'heating.none': 'Blankets and clothing',
  'heating.electric': 'Electric heater or geyser',
  'heating.wood_coal': 'Burning wood, coal or charcoal',
  purifier: 'We have an air purifier',
  n95: 'We have N95 masks',
  notes: 'Anything else we should know?',
  optional: 'Optional',
  'field.check': 'Please check this value.',
  'notes.hint':
    'For example: ground-floor flat next to a main road, or school at 8 am. Up to 200 characters.',
  'manual.summary': 'Live data not loading? Enter PM2.5 yourself',
  'manual.label': 'PM2.5 in µg/m³',
  submit: 'Build my clean-air plan',
  busy: 'Working on it…',
  'gets.title': 'What you will get',
  'gets.1': 'A low-emission daily routine',
  'gets.2': 'Indoor air hacks that fit your home',
  'gets.3': 'The impact of each choice, in plain words',
  'status.fetching': 'Fetching live air quality and building your plan…',
  'status.ready': 'Plan ready for {city}.',
  'status.failed': 'We could not build your plan.',

  'results.aria': 'Your plan',
  'results.title': 'Your plan for {city}',
  'results.aqi': 'AQI {aqi}, {cat}.',
  'alert.critical': 'Important: ',
  'alert.warning': 'Care: ',
  'alert.info': 'Note: ',
  'briefing.gemini': 'Written by Gemini from your data',
  'briefing.rules': 'Generated from built-in rules',
  'exposure.title': 'What your choices change',
  'haze.legend': 'Haze behind the page shows',
  'haze.usual': 'Today as usual',
  'haze.plan': 'With this plan',
  'haze.noteUsual': 'The smoke behind the page shows today’s outdoor air, AQI {aqi}.',
  'haze.notePlan':
    'The smoke behind the page now shows your modelled exposure with this plan. Outdoors it is still AQI {aqi}.',
  'exposure.body':
    'You would breathe about {base} µg/m³ of PM2.5 over a day as usual, and about {plan} µg/m³ following this plan, roughly {pct}% lower. The WHO guideline is {who} µg/m³ and India’s standard is {india} µg/m³.',
  'exposure.how': 'How is this estimated?',
  'group.routine': 'Your low-emission daily routine',
  'group.indoor': 'Indoor air-quality hacks',
  'group.alternatives': 'Sustainable alternatives',
  'act.top': 'Top priority',
  'act.impact': 'Impact: ',
  'co2.line': 'Switching your commute could save about {week} kg of CO2 a week, about {year} kg a year.',
  'translation.gemini': 'Plan text translated by Gemini',
  'translation.builtin': 'Plan text from our built-in Hindi translation',
  'translation.mixed': 'Plan text translated by Gemini, with built-in Hindi for some parts',
  'err.generic': 'Something went wrong. Please try again.',
  'err.bad_input': 'Please fix the highlighted inputs.',
  'err.bad_city': 'Please choose a supported city.',
  'err.air_unavailable':
    'Live air-quality data is unavailable right now. You can enter a PM2.5 reading manually and try again.',
  'err.aqi_failed': 'Could not compute an air-quality index from the data received.',
  'err.ask_off':
    'The AI assistant is not configured on this server. The personalised plan above still works.',
  'err.ask_failed': 'The AI assistant could not answer right now. Please try again.',
  'err.rate_limited': 'Too many requests. Please wait a moment and try again.',
  'err.too_large': 'That request was too large. Please shorten your notes.',
  'err.bad_request': 'The request could not be understood. Please reload the page and try again.',
  'err.server': 'Something went wrong on our side. Please try again.',
  'err.timeout': 'The request took too long. Please try again.',
  'err.offline': 'Could not reach the server. Check your connection.',
  'share.print': 'Print or save as PDF',
  'share.copy': 'Copy plan as text',
  'share.copied': 'Plan copied.',
  'share.copyFail': 'Could not copy. Use print instead.',
  'share.hint': 'Share it with neighbours, your RWA or your child’s school.',

  'ask.title': 'Ask ClearBreath',
  'ask.label': 'Your question about air quality or healthy habits',
  'ask.placeholder': 'Is it safe for my son to play cricket today?',
  'ask.send': 'Ask',
  'ask.busy': 'Thinking…',
  'ask.empty': 'Please type a question first.',

  'foot.text':
    'Air-quality data from Open-Meteo (CAMS model). AQI bands from India’s CPCB. General guidance, not medical advice. Impact figures are approximate estimates.',
};

const hi = {
  skip: 'मुख्य सामग्री पर जाएँ',
  'lang.label': 'भाषा',
  pause: 'धुएँ की गति रोकें',

  'hero.title': 'धुंध के बीच अपने परिवार की राह तय करें।',
  'hero.lead': 'आपके शहर की ताज़ा हवा की गुणवत्ता, रोज़ की दिनचर्या में बदली हुई।',
  'hero.cta': 'मेरी योजना बनाएँ',

  city: 'शहर',
  'reading.loading': 'हवा की जाँच हो रही है…',
  'reading.fail': '{error} फिर भी आप PM2.5 खुद भरकर योजना बना सकते हैं।',
  'reading.aria': '{city} का वायु गुणवत्ता सूचकांक {aqi}, {cat}।',
  'reading.meta': 'PM2.5 {pm} µg/m³, मुख्य प्रदूषक {dom}। Open-Meteo से मॉडल किया गया, {time}।',
  'why.title': 'यह दूसरे ऐप से अलग क्यों हो सकता है?',
  'why.body':
    'यह संख्या पूरे शहर के लिए उपग्रह और वायुमंडलीय डेटा (CAMS, Open-Meteo के ज़रिए) से मॉडल की गई है। SAFAR और CPCB एक जगह लगे एक मॉनिटर की माप बताते हैं, इसलिए वे ज़्यादा या कम दिख सकते हैं, खासकर ट्रैफ़िक के पास या अलग समय पर। यहाँ की सलाह श्रेणी पर निर्भर है, ठीक संख्या पर नहीं।',

  'band.0': 'अच्छा',
  'band.1': 'संतोषजनक',
  'band.2': 'मध्यम',
  'band.3': 'खराब',
  'band.4': 'बहुत खराब',
  'band.5': 'गंभीर',
  'scale.title': 'भारत के पैमाने पर आज की स्थिति',
  'scale.lead': 'श्रेणियाँ भारत के CPCB सूचकांक के अनुसार हैं। संख्या बढ़ने पर इस पन्ने के पीछे का धुआँ गाढ़ा होता जाता है।',
  'scale.today': 'आज {aqi}',
  'scale.range': '{from} से {to}',
  'scale.aria': 'आज का AQI {aqi} है, श्रेणी: {band}।',
  'scale.wait': 'ताज़ा रीडिंग का इंतज़ार है।',

  'now.title': 'AQI {aqi} पर अभी ये तीन काम करें',
  'now.title.none': 'अभी ये तीन काम करें',
  'quick.clear': [
    ['खिड़कियाँ खोलें', 'दोपहर बाद कुछ देर ताज़ी हवा आने दें।'],
    ['बाहर खेलें और कसरत करें', 'ज़्यादातर लोगों के लिए ठीक है। बहुत संवेदनशील लोग आराम से करें।'],
    ['हवा को ऐसा ही साफ़ रखें', 'जब हो सके पैदल, साइकिल या मेट्रो से चलें।'],
  ],
  'quick.moderate': [
    ['बाहर कम समय बिताएँ', 'खासकर बच्चे, बुज़ुर्ग और दमा या हृदय रोग वाले लोग।'],
    ['दोपहर में बाहर निकलें', 'तब हवा आम तौर पर सुबह-सवेरे या शाम से बेहतर होती है।'],
    ['भीड़ के समय खिड़कियाँ बंद रखें', 'सुबह और शाम के ट्रैफ़िक में इन्हें बंद रखें।'],
  ],
  'quick.poor': [
    ['बच्चों का खेल घर के अंदर रखें', 'आज मैदान और बाहर के खेल छोड़ दें।'],
    ['बाहर N95 पहनें', 'कपड़े और सर्जिकल मास्क महीन धुएँ के कणों को ठीक से नहीं रोकते।'],
    ['खिड़कियाँ बंद करके प्यूरीफ़ायर चलाएँ', 'उसे उसी कमरे में चलाएँ जहाँ आप सबसे ज़्यादा रहते हैं।'],
  ],
  'quick.severe': [
    ['घर के अंदर रहें', 'खिड़कियाँ और दरवाज़े बंद रखें। बाहर कसरत न करें।'],
    ['बाहर जाना ही पड़े तो ठीक से फ़िट N95 पहनें', 'सफ़र छोटा रखें।'],
    ['ज़रूरत हो तो डॉक्टर को दिखाएँ', 'साँस लेने में दिक्कत, सीने में दर्द या चक्कर हो तो इंतज़ार न करें, डॉक्टर के पास जाएँ।'],
  ],

  'plan.title': 'अपने घर के बारे में बताइए',
  'plan.forPre': '',
  'plan.forPost': ' के लिए योजना। शहर बदलने के लिए ऊपर हवा की रीडिंग में चुनें।',
  'plan.yourCity': 'आपका शहर',
  'who.legend': 'घर में कौन रहता है',
  adults: 'वयस्क',
  children: '12 साल से छोटे बच्चे',
  seniors: '65 साल या अधिक के बुज़ुर्ग',
  'health.legend': 'घर में स्वास्थ्य संबंधी स्थितियाँ',
  'cond.asthma': 'दमा या फेफड़ों की बीमारी',
  'cond.heart': 'हृदय रोग',
  'cond.pregnancy': 'गर्भावस्था',
  'commute.legend': 'रोज़ का आना-जाना',
  'commute.mode': 'यात्रा का मुख्य साधन',
  'commute.km': 'एक तरफ़ की दूरी (किमी)',
  'commute.bus_metro': 'बस या मेट्रो',
  'commute.car': 'कार',
  'commute.auto_cab': 'ऑटो या कैब',
  'commute.two_wheeler': 'स्कूटर या मोटरसाइकिल',
  'commute.walk_cycle': 'पैदल या साइकिल',
  'commute.wfh': 'घर से काम या पढ़ाई',
  'home.legend': 'घर',
  'cooking.label': 'खाना पकाने का ईंधन',
  'cooking.lpg': 'LPG सिलेंडर',
  'cooking.png': 'पाइप वाली गैस (PNG)',
  'cooking.induction': 'इंडक्शन या बिजली',
  'cooking.biomass': 'लकड़ी, उपले या फ़सल का अवशेष',
  'heating.label': 'सर्दी में गर्माहट',
  'heating.none': 'कंबल और गर्म कपड़े',
  'heating.electric': 'बिजली का हीटर या गीज़र',
  'heating.wood_coal': 'लकड़ी, कोयला या चारकोल जलाना',
  purifier: 'हमारे पास एयर प्यूरीफ़ायर है',
  n95: 'हमारे पास N95 मास्क हैं',
  notes: 'और कुछ जो हमें जानना चाहिए?',
  optional: 'वैकल्पिक',
  'field.check': 'कृपया यह मान जाँचें।',
  'notes.hint': 'जैसे: मुख्य सड़क के पास भूतल का फ़्लैट, या सुबह 8 बजे स्कूल। अधिकतम 200 अक्षर।',
  'manual.summary': 'लाइव डेटा नहीं आ रहा? PM2.5 खुद भरें',
  'manual.label': 'PM2.5 (µg/m³ में)',
  submit: 'मेरी स्वच्छ-हवा योजना बनाएँ',
  busy: 'काम चल रहा है…',
  'gets.title': 'आपको क्या मिलेगा',
  'gets.1': 'कम-उत्सर्जन वाली दैनिक दिनचर्या',
  'gets.2': 'आपके घर के हिसाब से अंदर की हवा सुधारने के उपाय',
  'gets.3': 'हर चुनाव का असर, सरल शब्दों में',
  'status.fetching': 'ताज़ा हवा की गुणवत्ता लाकर आपकी योजना बन रही है…',
  'status.ready': '{city} के लिए योजना तैयार है।',
  'status.failed': 'हम आपकी योजना नहीं बना सके।',

  'results.aria': 'आपकी योजना',
  'results.title': '{city} के लिए आपकी योजना',
  'results.aqi': 'AQI {aqi}, {cat}।',
  'alert.critical': 'ज़रूरी: ',
  'alert.warning': 'ध्यान दें: ',
  'alert.info': 'नोट: ',
  'briefing.gemini': 'आपके डेटा से Gemini द्वारा लिखा गया',
  'briefing.rules': 'अंतर्निहित नियमों से तैयार',
  'exposure.title': 'आपके चुनाव क्या बदलते हैं',
  'haze.legend': 'पन्ने के पीछे की धुंध दिखाती है',
  'haze.usual': 'आज, हमेशा की तरह',
  'haze.plan': 'इस योजना के साथ',
  'haze.noteUsual': 'पन्ने के पीछे का धुआँ आज की बाहरी हवा, AQI {aqi}, दिखा रहा है।',
  'haze.notePlan':
    'पन्ने के पीछे का धुआँ अब इस योजना के साथ आपके अनुमानित संपर्क को दिखा रहा है। बाहर अब भी AQI {aqi} है।',
  'exposure.body':
    'आम तौर पर आप दिन भर में लगभग {base} µg/m³ PM2.5 में साँस लेंगे, और इस योजना पर चलने से लगभग {plan} µg/m³, यानी करीब {pct}% कम। WHO का दिशानिर्देश {who} µg/m³ और भारत का मानक {india} µg/m³ है।',
  'exposure.how': 'यह अनुमान कैसे लगाया गया?',
  'group.routine': 'आपकी कम-उत्सर्जन दैनिक दिनचर्या',
  'group.indoor': 'घर के अंदर की हवा सुधारने के उपाय',
  'group.alternatives': 'टिकाऊ विकल्प',
  'act.top': 'सर्वोच्च प्राथमिकता',
  'act.impact': 'असर: ',
  'co2.line': 'आना-जाना बदलने से हर हफ़्ते लगभग {week} किग्रा और साल में लगभग {year} किग्रा CO2 बचाई जा सकती है।',
  'translation.gemini': 'योजना का पाठ Gemini द्वारा अनूदित',
  'translation.builtin': 'योजना का पाठ हमारे अंतर्निहित हिंदी अनुवाद से',
  'translation.mixed': 'योजना का पाठ Gemini द्वारा अनूदित, कुछ हिस्से अंतर्निहित हिंदी अनुवाद से',
  'err.generic': 'कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
  'err.bad_input': 'कृपया चिह्नित जानकारी ठीक करें।',
  'err.bad_city': 'कृपया समर्थित शहर चुनें।',
  'err.air_unavailable':
    'ताज़ा हवा की गुणवत्ता का डेटा अभी उपलब्ध नहीं है। आप PM2.5 की रीडिंग खुद भरकर फिर कोशिश कर सकते हैं।',
  'err.aqi_failed': 'मिले डेटा से वायु गुणवत्ता सूचकांक नहीं निकाला जा सका।',
  'err.ask_off': 'इस सर्वर पर AI सहायक चालू नहीं है। ऊपर की व्यक्तिगत योजना फिर भी काम करती है।',
  'err.ask_failed': 'AI सहायक अभी जवाब नहीं दे सका। कृपया फिर कोशिश करें।',
  'err.rate_limited': 'बहुत ज़्यादा अनुरोध हुए। कृपया थोड़ी देर रुककर फिर कोशिश करें।',
  'err.too_large': 'अनुरोध बहुत बड़ा था। कृपया अपने नोट छोटे करें।',
  'err.bad_request': 'अनुरोध समझा नहीं जा सका। कृपया पेज दोबारा खोलकर फिर कोशिश करें।',
  'err.server': 'हमारी तरफ़ से कुछ गड़बड़ हो गई। कृपया फिर कोशिश करें।',
  'err.timeout': 'अनुरोध में बहुत समय लगा। कृपया फिर कोशिश करें।',
  'err.offline': 'सर्वर तक नहीं पहुँचा जा सका। अपना कनेक्शन जाँचें।',
  'share.print': 'प्रिंट करें या PDF सहेजें',
  'share.copy': 'योजना को टेक्स्ट में कॉपी करें',
  'share.copied': 'योजना कॉपी हो गई।',
  'share.copyFail': 'कॉपी नहीं हो सकी। प्रिंट का उपयोग करें।',
  'share.hint': 'इसे पड़ोसियों, अपनी RWA या बच्चे के स्कूल के साथ साझा करें।',

  'ask.title': 'ClearBreath से पूछें',
  'ask.label': 'हवा की गुणवत्ता या स्वस्थ आदतों के बारे में आपका सवाल',
  'ask.placeholder': 'क्या आज मेरे बेटे का क्रिकेट खेलना सुरक्षित है?',
  'ask.send': 'पूछें',
  'ask.busy': 'सोच रहा हूँ…',
  'ask.empty': 'कृपया पहले सवाल लिखें।',

  'foot.text':
    'हवा की गुणवत्ता का डेटा Open-Meteo (CAMS मॉडल) से है। AQI श्रेणियाँ भारत के CPCB से हैं। यह सामान्य मार्गदर्शन है, चिकित्सा सलाह नहीं। असर के आँकड़े अनुमानित हैं।',
};

export const STRINGS = Object.freeze({ en, hi });
export const LANGS = Object.freeze([...SERVER_LANGS]);

const ERR_ALIASES = {
  bad_type: 'bad_request',
  bad_json: 'bad_request',
  body_read: 'bad_request',
  bad_method: 'bad_request',
  not_found: 'bad_request',
};

/**
 * The text to show for a failed request. Errors carry a stable `code` (from the server or the client), which
 * is shown in the interface language; an unknown code falls back to the server's own English message.
 * @returns {{text:string, translated:boolean}} `translated` is false when the text is the raw English message.
 */
export function errorMessage(lang, err) {
  const key = `err.${ERR_ALIASES[err?.code] ?? err?.code}`;
  if (err?.code && key in en) return { text: translate(lang, key), translated: true };
  return { text: err?.message || translate(lang, 'err.generic'), translated: false };
}

/** A city's name in the interface language (Hindi where the server supplied it). */
export const cityLabel = (city, lang) => (lang === 'hi' && city?.nameHi ? city.nameHi : (city?.name ?? ''));
export const stateLabel = (city, lang) =>
  lang === 'hi' && city?.stateHi ? city.stateHi : (city?.state ?? '');

/** Look up `key` in `lang` (falling back to English, then the key itself) and fill `{name}` slots. */
export function translate(lang, key, vars) {
  const raw = (STRINGS[lang] ?? en)[key] ?? en[key] ?? key;
  if (typeof raw !== 'string' || !vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m));
}
