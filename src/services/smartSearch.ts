import { CatalogItem } from '../types';

const STOP_WORDS = new Set([
  'с', 'в', 'на', 'по', 'и', 'к', 'о', 'у', 'за', 'из', 'от', 'до', 'для', 'без',
  'под', 'над', 'при', 'через', 'а', 'но', 'или', 'не', 'же', 'бы', 'ли', 'уже',
  'ещё', 'так', 'как', 'что', 'это', 'то', 'все', 'про'
]);

const SUFFIXES = [
  'ого', 'ому', 'ыми', 'ими', 'остью', 'ость', 'ости', 'ами', 'ями', 'ая', 'ее',
  'ие', 'ий', 'им', 'их', 'ую', 'юю', 'ое', 'ые', 'ый', 'ым', 'ов', 'ев', 'ей',
  'ой', 'ам', 'ям', 'ах', 'ях', 'ом', 'ем', 'а', 'е', 'и', 'о', 'у', 'ы', 'ю', 'ь'
];

/** Universal Russian construction synonyms and slang terms */
export const GLOBAL_CONSTRUCTION_SYNONYMS: string[][] = [
  // Plumbing & Heating
  ['унитаз', 'инсталляция', 'горшок', 'санфаянс', 'компакт', 'биде'],
  ['смеситель', 'кран-смеситель', 'гусак', 'смесак'],
  ['кран', 'вентиль', 'шаровой кран', 'задвижка', 'отсечной'],
  ['раковина', 'умывальник', 'рукомойник', 'мойка'],
  ['ванна', 'ванная', 'чугунная', 'акриловая'],
  ['душ', 'душевая', 'трап', 'лейка', 'тропический душ'],
  ['радиатор', 'батарея', 'отопитель', 'чугун', 'биметалл', 'алюминиевый'],
  ['полотенцесушитель', 'полотенчик', 'сушило', 'лесенка'],
  ['труба', 'трубопровод', 'магистраль', 'стояк'],
  ['канализация', 'канализационная линия', 'слив', 'фанина', 'фановая'],
  ['коллектор', 'гребенка', 'распределитель', 'гидрострелка'],
  ['котел', 'котельное', 'бойлер', 'водонагреватель', 'водогрей', 'титан'],
  ['теплый пол', 'контур', 'водяной пол', 'электропол'],
  ['фильтр', 'водоочистка', 'грязевик', 'осмос', 'колба'],
  ['насос', 'насосная станция', 'циркуляционник', 'сололифт', 'дренажник'],

  // Electrical & Wiring
  ['розетка', 'розеточный блок', 'евророзетка'],
  ['выключатель', 'переключатель', 'проходной', 'клавишник'],
  ['кабель', 'провод', 'ввг', 'ввгнг', 'нюм', 'проводка', 'сип', 'пвс'],
  ['гофра', 'гофротруба', 'пнд', 'металлорукав', 'кабель-канал'],
  ['щит', 'электрощит', 'распределительный щит', 'щиток', 'бокс', 'вру'],
  ['автомат', 'автоматический выключатель', 'диф', 'дифавтомат', 'узо'],
  ['подрозетник', 'подрозетники', 'коробка', 'коронка'],
  ['светильник', 'лампа', 'осветительный прибор', 'спот', 'люстра', 'бра'],
  ['светодиодная лента', 'лента', 'подсветка', 'лед', 'led', 'профиль'],
  ['счетчик', 'электросчетчик', 'учет', 'меркурий'],
  ['заземление', 'контур заземления', 'земля'],

  // General Construction & Works
  ['монтаж', 'установка', 'подключение', 'навес', 'устройство'],
  ['демонтаж', 'снятие', 'разборка', 'снос'],
  ['замена', 'демонтаж и монтаж', 'переустановка'],
  ['штроба', 'штробление', 'резка', 'штроборез', 'паз'],
  ['отверстие', 'сверление', 'бурение', 'коронка', 'проходка'],
  ['стяжка', 'наливной пол', 'ровнитель'],
  ['штукатурка', 'шпатлевка', 'малярка', 'грунтовка']
];

export const stem = (word: string): string => {
  let result = word.toLowerCase();
  for (const suffix of SUFFIXES) {
    if (result.endsWith(suffix) && result.length - suffix.length >= 3) {
      result = result.slice(0, -suffix.length);
      break;
    }
  }
  return result;
};

export const tokenizeQuery = (query: string): string[] => {
  return query
    .toLowerCase()
    .replace(/[–—−]/g, '-')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .filter((word) => !STOP_WORDS.has(word))
    .map((word) => {
      const normalized = word.replace(/[øØ№]/g, '');
      return /^(?:\d+(?:[.,]\d+)?)(?:[xх×]\d+(?:[.,]\d+)?)*$/.test(normalized)
        ? normalized.replace(',', '.')
        : stem(normalized);
    })
    .filter((word) => word.length >= 2);
};

const normalizePhrase = (phrase: string): string => tokenizeQuery(phrase).join(' ');

export const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 1) return 2;
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    for (let k = 0; k <= b.length; k++) {
      previous[k] = current[k];
    }
  }
  return previous[b.length] ?? 2;
};

const isNumericToken = (token: string) =>
  /^\d+(?:[.]\d+)?(?:[xх×]\d+(?:[.]\d+)?)*$/.test(token);

type MatchType = 'exact' | 'partial' | 'typo' | 'none';

const tokenMatch = (textTokens: string[], queryToken: string): MatchType => {
  if (isNumericToken(queryToken)) {
    return textTokens.some((token) => token === queryToken) ? 'exact' : 'none';
  }
  if (textTokens.some((token) => token === queryToken)) return 'exact';
  if (textTokens.some((token) => token.includes(queryToken) || queryToken.includes(token))) return 'partial';
  if (queryToken.length >= 4 && textTokens.some((token) => levenshtein(token, queryToken) <= 1)) {
    return 'typo';
  }
  return 'none';
};

interface SynonymConcept {
  id: number;
  terms: string[];
  tokens: string[];
}

export const buildSynonymIndex = (additionalGroups?: string[][]) => {
  const allGroups = [...GLOBAL_CONSTRUCTION_SYNONYMS, ...(additionalGroups || [])];
  const tokenToConcepts = new Map<string, number[]>();
  const concepts: SynonymConcept[] = [];

  allGroups.forEach((group, id) => {
    const terms = group.map(normalizePhrase).filter(Boolean);
    const tokens = [...new Set(terms.flatMap((term) => term.split(' ')))];
    if (!tokens.length) return;
    concepts.push({ id, terms, tokens });
    for (const token of tokens) {
      tokenToConcepts.set(token, [...(tokenToConcepts.get(token) ?? []), id]);
    }
  });

  return { tokenToConcepts, concepts };
};

const conceptForToken = (
  token: string,
  index: ReturnType<typeof buildSynonymIndex>
) => {
  const direct = index.tokenToConcepts.get(token);
  if (direct?.length) return direct[0];
  if (token.length < 4) return undefined;
  return index.concepts.find((concept) =>
    concept.tokens.some((candidate) => levenshtein(candidate, token) <= 1)
  )?.id;
};

const conceptMatches = (
  textTokens: string[],
  concept: SynonymConcept
): boolean => {
  return concept.terms.some((term) =>
    term.split(' ').every((token) => tokenMatch(textTokens, token) !== 'none')
  );
};

const scoreItem = (
  item: CatalogItem,
  query: string,
  synonymIndex: ReturnType<typeof buildSynonymIndex>
): number => {
  const queryTokens = tokenizeQuery(query);
  if (!queryTokens.length) return 1;

  const nameTokens = tokenizeQuery(item.name);
  const descriptionTokens = tokenizeQuery(item.description || '');
  const categoryTokens = tokenizeQuery(item.category || '');
  const allTokens = [...nameTokens, ...descriptionTokens, ...categoryTokens];

  const concepts = new Set<number>();
  const requiredTokens = queryTokens.filter((token) => {
    const conceptId = conceptForToken(token, synonymIndex);
    if (conceptId !== undefined) {
      concepts.add(conceptId);
      return false;
    }
    return true;
  });

  // Direct tokens match check
  const allRequiredMatch = requiredTokens.every(
    (token) => tokenMatch(allTokens, token) !== 'none'
  );
  if (!allRequiredMatch) return 0;

  // Concepts match check
  const allConceptsMatch = [...concepts].every((id) => {
    const concept = synonymIndex.concepts.find((candidate) => candidate.id === id);
    return concept ? conceptMatches(allTokens, concept) : false;
  });
  if (!allConceptsMatch) return 0;

  // Calculate weighted score
  return queryTokens.reduce((total, token) => {
    const nameMatch = tokenMatch(nameTokens, token);
    const descMatch = tokenMatch(descriptionTokens, token);
    const catMatch = tokenMatch(categoryTokens, token);

    if (nameTokens.includes(token)) return total + (isNumericToken(token) ? 60 : 40);
    if (nameMatch === 'exact') return total + 50;
    if (nameMatch === 'partial') return total + 25;
    if (nameMatch === 'typo') return total + 18;
    if (descMatch === 'exact') return total + 20;
    if (descMatch === 'partial') return total + 12;
    if (catMatch === 'exact' || catMatch === 'partial') return total + 15;
    return total + 5;
  }, 0);
};

export const searchCatalogItems = (
  catalog: CatalogItem[],
  query: string,
  selectedCategory?: string,
  customSynonyms?: string[][]
): CatalogItem[] => {
  const trimmed = query.trim();
  const synonymIndex = buildSynonymIndex(customSynonyms);

  const filteredByCategory = selectedCategory
    ? catalog.filter((it) => it.category === selectedCategory)
    : catalog;

  if (!trimmed) {
    return filteredByCategory;
  }

  return filteredByCategory
    .map((item) => ({
      item,
      score: scoreItem(item, trimmed, synonymIndex),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
};
