import { DialogueEntry, GraphicInsert, LanguageCode, ShelfSlot } from '../types/game';

export const PART_1_META = {
  part: 1,
  eraRu: 'Египет, III век до н. э.',
  eraEn: 'Egypt, 3rd century BC',
  titleRu: 'ЧАСТЬ 1 · Египет · «Птица из Саккары»',
  titleEn: 'PART 1 · Egypt · "The Saqqara Bird"',
  prototypeRu:
    'Деревянная модель сокола из сикоморы, найденная в 1898 году в гробнице Пади-Имене под Саккарой (Каирский музей), примерно III век до н. э. У модели нет лап, под хвостом вырезан вертикальный плавник, которого нет ни у одной птицы Мемфиса.',
  prototypeEn:
    'A sycamore wood falcon model found in 1898 in the tomb of Pa-di-Imen near Saqqara (Cairo Museum), circa 3rd century BC. It has no feet, and beneath the tail is carved a vertical fin absent in any bird of Memphis.',
  apparatusRu: 'Планёр-сокол. Управление углом атаки крыла и вертикальным плавником-рулём.',
  apparatusEn: 'Falcon glider. Controlled by wing angle of attack and vertical rudder fin.',
  witnessRu: 'Сокол',
  witnessEn: 'Falcon',
  witnessPhraseRu: 'Прости. Я не удержал птицу.',
  witnessPhraseEn: 'Forgive me. I could not hold the bird.',
  testimonyRu: 'Кусок глины с отпечатком крыла',
  testimonyEn: 'Fragment of clay with a wing imprint',
  witnessNoteRu: 'В показаниях Свидетеля нет имени: только крыло, глина и звёздный след над Нилом.',
  witnessNoteEn: 'There is no name in the Witness testimony: only a wing, clay, and a starry trail above the Nile.',
};

// All 10 shelf slots initialized up front for the 10-part scaffold
export function createInitialShelf(): ShelfSlot[] {
  return [
    {
      part: 1,
      eraRu: 'Египет, III век до н. э.',
      eraEn: 'Egypt, 3rd c. BC',
      apparatusRu: 'Птица из Саккары',
      apparatusEn: 'Saqqara Bird',
      witnessRu: 'Сокол',
      witnessEn: 'Falcon',
      testimonyRu: 'Кусок глины с отпечатком крыла',
      testimonyEn: 'Clay fragment with wing imprint',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 2,
      eraRu: 'Индия, XI век',
      eraEn: 'India, 11th c.',
      apparatusRu: 'Вимана Бходжи',
      apparatusEn: 'Vimana of Bhoja',
      witnessRu: 'Гаруда',
      witnessEn: 'Garuda',
      testimonyRu: 'Лист трактата со словом «нельзя»',
      testimonyEn: 'Treatise leaf with the word "forbidden"',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 3,
      eraRu: 'Крит, XV век до н. э.',
      eraEn: 'Crete, 15th c. BC',
      apparatusRu: 'Крылья Дедала',
      apparatusEn: 'Wings of Daedalus',
      witnessRu: 'Сипуха',
      witnessEn: 'Barn Owl',
      testimonyRu: 'Восковая печать с тремя веерами',
      testimonyEn: 'Wax seal with three fans',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 4,
      eraRu: 'Китай, IV век до н. э.',
      eraEn: 'China, 4th c. BC',
      apparatusRu: 'Деревянный коршун Лу Баня',
      apparatusEn: 'Wooden Kite of Lu Ban',
      witnessRu: 'Дракон-лун',
      witnessEn: 'Long Dragon',
      testimonyRu: 'Шёлковая нитка',
      testimonyEn: 'Silk thread',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 5,
      eraRu: 'Толима, доколумбова Америка',
      eraEn: 'Tolima, Pre-Columbian America',
      apparatusRu: 'Золотой самолётик',
      apparatusEn: 'Golden Flyer',
      witnessRu: 'Летучая мышь',
      witnessEn: 'Bat',
      testimonyRu: 'Изумрудное перо',
      testimonyEn: 'Emerald feather',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 6,
      eraRu: 'Персия, эпоха Шахнаме',
      eraEn: 'Persia, Shahnameh Era',
      apparatusRu: 'Трон Кея Кавуса',
      apparatusEn: 'Throne of Kay Kavus',
      witnessRu: 'Шахин',
      witnessEn: 'Shaheen Falcon',
      testimonyRu: 'Перо в долгу',
      testimonyEn: 'Feather in debt',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 7,
      eraRu: 'Кордова, 875 год',
      eraEn: 'Cordoba, 875 AD',
      apparatusRu: 'Планер Аббаса ибн Фирнаса',
      apparatusEn: 'Glider of Abbas ibn Firnas',
      witnessRu: 'Чёрный стриж',
      witnessEn: 'Black Swift',
      testimonyRu: 'Свинцовая пластина «Крыло легче страха»',
      testimonyEn: 'Lead plaque "A wing is lighter than fear"',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 8,
      eraRu: 'Англия, 1010 год',
      eraEn: 'England, 1010 AD',
      apparatusRu: 'Крылья монаха Эйлмера',
      apparatusEn: 'Wings of Eilmer',
      witnessRu: 'Лунь',
      witnessEn: 'Harrier',
      testimonyRu: 'Вощёное полотно',
      testimonyEn: 'Waxed linen',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 9,
      eraRu: 'Скандинавия, IX век',
      eraEn: 'Scandinavia, 9th c.',
      apparatusRu: 'Тень Скидбладнира',
      apparatusEn: 'Shadow of Skidbladnir',
      witnessRu: 'Валькирия',
      witnessEn: 'Valkyrie',
      testimonyRu: 'Щепка с рунами',
      testimonyEn: 'Rune-carved splinter',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
    {
      part: 10,
      eraRu: 'Япония, рубеж X века',
      eraEn: 'Japan, turn of 10th c.',
      apparatusRu: 'Лунный паланкин Кагуи',
      apparatusEn: 'Lunar Palanquin of Kaguya',
      witnessRu: 'Летяга',
      witnessEn: 'Flying Squirrel',
      testimonyRu: 'Непосланное письмо',
      testimonyEn: 'Unsent letter',
      apparatusUnlocked: false,
      testimonyUnlocked: false,
    },
  ];
}

// Verbatim lines for Chapter 1_1
export const CHAPTER_1_1_LINES: DialogueEntry[] = [
  {
    id: '1_1_1',
    speaker: 'СТАРШИНА РАБОЧИХ',
    canonicalRu: 'Тринадцатый ящик. Всё, что шло в гробницу Пади-Имене, теперь в этом дворе.',
    en: 'Crate thirteen. Everything bound for the tomb of Pa-di-Imen is now in this courtyard.',
    translations: {
      uk: 'Тринадцятий ящик. Усе, що йшло до гробниці Паді-Імене, тепер у цьому дворі.',
      fr: 'Caisse treize. Tout ce qui allait vers la tombe de Pa-di-Imen est maintenant dans cette cour.',
      de: 'Kiste dreizehn. Alles, was für das Grab des Pa-di-Imen bestimmt war, liegt nun in diesem Hof.',
      es: 'Caja trece. Todo lo que iba hacia la tumba de Pa-di-Imen está ahora en este patio.',
    },
  },
  {
    id: '1_1_2',
    speaker: 'МАНСУР',
    stageDirection: 'достаёт птицу и не решается положить обратно',
    canonicalRu: 'Это птица. Но без лап. И хвост не хвост. Хвост ставится вертикально, как руль у корабля дельты.',
    en: 'It is a bird. Yet without feet. And the tail is no bird tail. The tail stands upright, like the rudder of a delta vessel.',
    translations: {
      uk: 'Це птах. Але без лап. І хвіст не хвіст. Хвіст ставиться вертикально, як кермо у корабля дельти.',
      fr: 'C’est un oiseau. Mais sans pattes. Et la queue n’est pas une queue. Elle se dresse à la verticale, comme le gouvernail d’un navire du delta.',
      de: 'Es ist ein Vogel. Doch ohne Füße. Und der Schwanz ist kein Vogelschwanz. Er steht senkrecht wie das Ruder eines Deltaschiffs.',
    },
  },
  {
    id: '1_1_3',
    speaker: 'СТАРШИНА',
    canonicalRu: 'У мастерских Саккары свои боги. Рисуй как видишь.',
    en: 'The workshops of Saqqara have their own gods. Draw it as you see it.',
    translations: {
      uk: 'У майстерень Саккари свої боги. Малюй як бачиш.',
      fr: 'Les ateliers de Saqqarah ont leurs propres dieux. Dessine ce que tu vois.',
      de: 'Die Werkstätten von Sakkara haben ihre eigenen Götter. Zeichne, wie du es siehst.',
    },
  },
  {
    id: '1_1_4',
    speaker: '',
    isStageOnly: true,
    canonicalRu:
      'Мансур подбрасывает модель над столом. Восходящий тёплый воздух от камней подхватывает её, и она не падает, а скользит через весь двор и раскалывается о дверной косяк. Тишина. Все смотрят на половинки.',
    en: 'Mansur tosses the model above the table. Warm air rising from the stones catches it; it does not fall, but glides across the entire courtyard and splits against the doorpost. Silence. Everyone stares at the two halves.',
    translations: {
      uk: 'Мансур підкидає модель над столом. Висхідне тепле повітря від каміння підхоплює її, і вона не падає, а ковзає через увесь двір і розколюється об одвірок. Тиша. Усі дивляться на половинки.',
    },
  },
  {
    id: '1_1_5',
    speaker: 'МАНСУР',
    canonicalRu: 'Работа мастерская, но это не культовая вещь. Это не изображение птицы. Это модель летательного устройства.',
    en: 'Workshop craft, yet not a cult object. This is not an effigy of a bird. It is a model of a flying device.',
    translations: {
      uk: 'Робота майстерні, але це не культова річ. Це не зображення птаха. Це модель літального пристрою.',
    },
  },
  {
    id: '1_1_6',
    speaker: 'СТАРШИНА',
    canonicalRu: 'Запиши по форме: «фигурка птицы, назначение не установлено».',
    en: 'Record it by the form: "bird figurine, purpose undetermined."',
    translations: {
      uk: 'Запиши за формою: «фігурка птаха, призначення не встановлено».',
    },
  },
  {
    id: '1_1_7',
    speaker: 'МАНСУР',
    stageDirection: 'пишет, окликнутый, отрывисто',
    canonicalRu: 'Назначение... установлено.',
    en: 'Purpose... determined.',
    translations: {
      uk: 'Призначення... встановлено.',
    },
  },
  {
    id: '1_1_8',
    speaker: '',
    isStageOnly: true,
    canonicalRu: 'Четырнадцатый ящик открывает старый рабочий, и он впервые за день поднимает голову.',
    en: 'The old laborer opens crate fourteen, and for the first time all day he raises his head.',
    translations: {
      uk: 'Чотирнадцятий ящик відкриває старий робітник, і він уперше за день підводить голову.',
    },
  },
  {
    id: '1_1_9',
    speaker: 'СТАРЫЙ РАБОЧИЙ',
    canonicalRu:
      'Мой дед говорил: в таких гробных ложат не перья, а ремёсла. Если там машина, значит кто-то в такой машине летал. И кто-то знает, как его звали.',
    en: 'My grandfather used to say: in tombs like these they bury crafts, not feathers. If there is a machine inside, then someone flew in such a machine. And someone knows what his name was.',
    translations: {
      uk: 'Мій дід казав: у таких гробницях кладуть не пір’я, а ремесла. Якщо там машина, значить хтось у такій машині літав. І хтось знає, як його звали.',
    },
  },
];

export const CHAPTER_1_1_GRAPHICS: GraphicInsert[] = [
  {
    id: 'g_1_1_intact',
    titleRu: 'Целая модель сокола на записях находок',
    titleEn: 'Intact Falcon Model on Excavation Ledger',
    captionRu: 'Сикомора, без лап; вертикальный хвостовой плавник на описи гробницы Пади-Имене.',
    captionEn: 'Sycamore wood, footless; vertical tail fin catalogued from the tomb of Pa-di-Imen.',
  },
  {
    id: 'g_1_1_halves',
    titleRu: 'Две половинки после удара о косяк',
    titleEn: 'Two Halves After Striking the Doorpost',
    captionRu: 'Восходящий поток унёс модель через двор — скол показал внутреннюю балансировку носа.',
    captionEn: 'The rising thermal carried the model across the yard; the split revealed internal nose weighting.',
  },
  {
    id: 'g_1_1_note',
    titleRu: 'Запись копииста',
    titleEn: 'The Scribe’s Entry',
    captionRu: '«назначение не установлено», зачёркнутая и переписанная рукой Мансура.',
    captionEn: '"purpose undetermined," crossed out and rewritten by Mansur’s hand.',
  },
];

// Verbatim lines for Chapter 1_2
export const CHAPTER_1_2_LINES: DialogueEntry[] = [
  {
    id: '1_2_1',
    speaker: 'МАНСУР',
    canonicalRu: 'Модель делали не ради забавы. Её делали, чтобы научить. Значит, была и настоящая.',
    en: 'The model was not carved for amusement. It was made to teach. Which means there was a full-scale one.',
  },
  {
    id: '1_2_2',
    speaker: 'ХОЗЯИН МАСТЕРСКОЙ',
    canonicalRu: 'Настоящих нет. Настоящее прошло, осталось чучело.',
    en: 'There are no real ones left. The real thing passed away; only the husk remains.',
  },
  {
    id: '1_2_3',
    speaker: 'МАНСУР',
    canonicalRu:
      'Тогда умеем чучело. Лес тот же, вес тот же, крыло той же формы, но с одним исключением: плавник под хвостом не резьба.',
    en: 'Then we will master the husk. Same timber, same weight, same wing profile, with one exception: the fin beneath the tail is no carving.',
  },
  {
    id: '1_2_4',
    speaker: '',
    isStageOnly: true,
    canonicalRu:
      'Он подставляет плавник под свечу. Воск поднимается пузырями и запоминает новый угол. Хозяин мастерской молчит, потом отдаёт нож.',
    en: 'He holds the fin above the candle flame. The wax rises in bubbles and memorizes the new angle. The master stays silent, then hands over the knife.',
  },
  {
    id: '1_2_5',
    speaker: 'ХОЗЯИН МАСТЕРСКОЙ',
    canonicalRu: 'Делай косяк короче.',
    en: 'Cut the bevel shorter.',
  },
];

export const CHAPTER_1_2_GRAPHICS: GraphicInsert[] = [
  {
    id: 'g_1_2_fin',
    titleRu: 'Схема модели с выделенным вертикальным плавником',
    titleEn: 'Schematic Highlighting the Vertical Tail Fin',
    captionRu: 'Угол атаки крыла, центр тяжести в груди, вертикальный руль под хвостом.',
    captionEn: 'Wing angle of attack, forward ballast center, and vertical tail rudder.',
  },
  {
    id: 'g_1_2_candle',
    titleRu: 'Плавник над свечой',
    titleEn: 'The Tail Fin Over the Candle',
    captionRu: 'Воск из склянки размягчается над пламенем и фиксирует новый угол руля.',
    captionEn: 'Wax from the vial softens over the flame and locks the new rudder angle.',
  },
  {
    id: 'g_1_2_glider',
    titleRu: 'Собранный аппарат, готовый к выносу на двор',
    titleEn: 'Assembled Glider Ready for the Courtyard',
    captionRu: 'Полноразмерный планёр-сокол из сикоморы перед рассветным испытанием.',
    captionEn: 'Full-scale sycamore falcon glider prepared for the dawn trial.',
  },
];

// Verbatim lines for Chapter 1_3 pre-flight
export const CHAPTER_1_3_LINES: DialogueEntry[] = [
  {
    id: '1_3_1',
    speaker: 'ХОЗЯИН МАСТЕРСКОЙ',
    canonicalRu: 'Ветер был северный. Пойдёшь против него.',
    en: 'The wind was from the north. You will fly against it.',
  },
  {
    id: '1_3_2',
    speaker: 'МАНСУР',
    canonicalRu: 'Мастерская. Она умеет только по ветру.',
    en: 'A workshop craft. It only knows how to ride with the wind.',
  },
  {
    id: '1_3_3',
    speaker: 'ХОЗЯИН МАСТЕРСКОЙ',
    canonicalRu: 'Настоящая машина не просит ветра. Она приказывает ему. Поднимай.',
    en: 'A true machine does not beg the wind. It commands it. Lift off.',
  },
];

// Verbatim lines for Chapter 1_6 Memphis
export const CHAPTER_1_6_LINES: DialogueEntry[] = [
  {
    id: '1_6_1',
    speaker: 'ЖРЕЦ ПТИЦ',
    canonicalRu: 'Птица летит без лап. Кто-то отпустил её раньше, чем сказал слова.',
    en: 'The bird flies without feet. Someone released it before speaking the words.',
  },
  {
    id: '1_6_2',
    speaker: 'ВОИН У ПРИЧАЛА',
    canonicalRu: 'Пищи не отдала, забрала ветер. Хватай арканы. Стреляй под крыло.',
    en: 'It gave no tribute, it stole the wind. Grab the lassos. Shoot beneath the wing.',
  },
];

// Verbatim lines for Chapter 1_7 Boss Set & Horus & Witness
export const CHAPTER_1_7_LINES = {
  setStart: {
    id: '1_7_set',
    speaker: 'СЕТ',
    canonicalRu: 'Дом построил человек. Небо человеку не принадлежит. Спускайся или сдохни на моём песке.',
    en: 'Man built the house. The sky does not belong to man. Come down, or perish upon my sand.',
  } as DialogueEntry,
  horusEnd: {
    id: '1_7_horus',
    speaker: 'ГОР',
    canonicalRu: 'Небо помнит каждого, кто держал крыло. Иди туда, откуда пришёл.',
    en: 'The sky remembers everyone who held a wing. Go back to where you came from.',
  } as DialogueEntry,
  witnessVoice: {
    id: '1_7_witness',
    speaker: 'ГОЛОС СВИДЕТЕЛЯ',
    stageDirection: 'падая',
    canonicalRu: 'Прости. Я не удержал птицу.',
    en: 'Forgive me. I could not hold the bird.',
  } as DialogueEntry,
};

export function pickDialogueText(entry: DialogueEntry, lang: LanguageCode): string {
  if (lang === 'ru') return entry.canonicalRu;
  if (entry.translations?.[lang]) return entry.translations[lang]!;
  return entry.en;
}

const SPEAKER_EN: Record<string, string> = {
  'СТАРШИНА РАБОЧИХ': 'FOREMAN',
  'СТАРШИНА': 'FOREMAN',
  'МАНСУР': 'MANSUR',
  'СТАРЫЙ РАБОЧИЙ': 'OLD LABORER',
  'ХОЗЯИН МАСТЕРСКОЙ': 'WORKSHOP MASTER',
  'ЖРЕЦ ПТИЦ': 'PRIEST OF BIRDS',
  'ВОИН У ПРИЧАЛА': 'PIER WARRIOR',
  'СЕТ': 'SET',
  'ГОР': 'HORUS',
  'ГОЛОС СВИДЕТЕЛЯ': 'VOICE OF THE WITNESS',
};

const STAGE_EN: Record<string, string> = {
  'достаёт птицу и не решается положить обратно': 'lifts the bird and hesitates to set it back down',
  'пишет, окликнутый, отрывисто': 'writes abruptly when called',
  'падая': 'falling',
};

export function localizeSpeaker(speaker: string, lang: LanguageCode): string {
  if (!speaker) return '';
  if (lang === 'ru') return speaker;
  return SPEAKER_EN[speaker] ?? speaker;
}

export function localizeStageDirection(stage: string | undefined, lang: LanguageCode): string | undefined {
  if (!stage) return undefined;
  if (lang === 'ru') return stage;
  return STAGE_EN[stage] ?? stage;
}
