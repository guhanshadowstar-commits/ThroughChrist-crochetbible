// What a verse is about, in pictures. Each entry maps words to a sprite (the figure shown),
// a setting (where), a time of day or a mood. Weights say how strongly a word pulls the picture:
// concrete nouns ("lamb", "fish") beat abstract ones ("love", "light").
//
// Words are matched after a light plural/ending trim and old-English folding (see tokensOf).
// God and Christ are never drawn as people: "God"/"Lord" only push the scene towards glory
// (light, heaven), and Christ-words towards the cross, lamb, shepherd or light.

const w = (s) => s.trim().split(/\s+/);

/** sprite concepts: figure drawn as the hero or a prop of the picture */
export const SPRITE_WORDS = {
  lamb: [5, w('lamb sheep flock ewe ram fold')],
  shepherd: [5, w('shepherd pasture herd herdsman')],
  dove: [4, w('dove pigeon turtledove olive')],
  cross: [6, w('cross crucify crucifixion calvary golgotha crucified')],
  heart: [2.5, w('love beloved heart charity affection compassion kindness tender')],
  crown: [3, w('crown kingdom reign reigneth sceptre royal victor conqueror overcome')],
  king: [3, w('king kings prince emperor caesar pharaoh queen')],
  throne: [3.5, w('throne thrones seat judgment-seat')],
  fish: [4.5, w('fish fisher fishermen fishes catch')],
  boat: [4.5, w('boat ship ships sail sailors vessel galilee')],
  ark: [5, w('ark noah flood')],
  net: [4, w('net nets')],
  bread: [3.5, w('bread loaf loaves manna feed hungry hunger')],
  cup: [4, w('cup cups wine drink drunken goblet')],
  grapes: [4, w('grape grapes vine vineyard branches branch fruit-vine')],
  wheat: [3.5, w('wheat harvest reap reaper sow sower seed corn grain sheaves sheaf barley tares')],
  tree: [3, w('tree trees forest wood oak fig olive-tree orchard')],
  cedar: [3.5, w('cedar cedars lebanon pine fir cypress')],
  palm: [4, w('palm palms')],
  flower: [3, w('flower flowers rose blossom bloom grass field-flower')],
  lily: [4, w('lily lilies')],
  sprout: [3, w('mustard sprout sprang plant planted grow growth bud root')],
  apple: [3, w('apple apples forbidden')],
  book: [2.5, w('book books word scripture written write wrote wisdom teach teacher understanding learn knowledge instruction')],
  scroll: [3.5, w('scroll letter epistle prophecy prophesy vision record parchment')],
  tablets: [4, w('commandment commandments tablets statutes precepts testimony covenant law ordinance')],
  sword: [3.5, w('sword swords battle war fight slain slay smite fought')],
  shield: [3.5, w('shield buckler armour armor defend defence refuge protect')],
  helmet: [3.5, w('helmet soldier')],
  spear: [3.5, w('spear lance javelin')],
  bow: [3.5, w('bow arrow arrows archer')],
  door: [3, w('door doors knock entrance enter threshold')],
  gate: [3, w('gate gates')],
  key: [4.5, w('key keys')],
  anchor: [4, w('anchor hope')],
  trumpet: [4, w('trumpet trumpets horn shofar')],
  harp: [3, w('harp harps sing song music melody lyre cymbal instrument psaltery')],
  hands: [4, w('pray prayer praying supplication intercession petition kneel')],
  hand: [1.6, w('hand hands arm touch lay-hands')],
  eye: [2.2, w('eye eyes seeth sight look behold watch gaze')],
  scales: [3.2, w('judge judges justice righteous righteousness balance weigh weight verdict')],
  well: [3.5, w('well wells fountain spring thirst thirsty cistern')],
  rock: [3.2, w('rock stone stones foundation cornerstone boulder')],
  tomb: [3.5, w('tomb grave sepulchre sepulcher buried burial dead death die grave-clothes pit')],
  lion: [5, w('lion lions lioness')],
  serpent: [4.5, w('serpent serpents snake viper adder devil satan tempt temptation deceive deceiver')],
  eagle: [3.5, w('eagle eagles soar wings flew fly')],
  camel: [5, w('camel camels')],
  donkey: [4.5, w('donkey ass asses colt mule')],
  horse: [4, w('horse horses chariot chariots rider horsemen')],
  angel: [4, w('angel angels cherub cherubim seraphim messenger gabriel michael')],
  coins: [2.8, w('gold silver money riches treasure treasures wealth tribute shekel pieces')],
  gem: [3, w('jewel jewels precious pearl pearls diamond ruby sapphire beauty')],
  chains: [3.2, w('chain chains bond bonds prison prisoner captive captivity fetters bound')],
  altar: [3.5, w('altar altars sacrifice sacrifices offering offerings incense burnt-offering')],
  flame: [3, w('fire flame flames burn burning burned coals furnace')],
  lamp: [3, w('lamp lamps lantern oil-lamp')],
  candle: [3.5, w('candle candles candlestick')],
  jar: [2.8, w('oil jar pitcher pot potter clay anoint anointed vessels')],
  house: [2.4, w('house houses home dwell dwelling room bed table build builder roof')],
  tent: [3.5, w('tent tents tabernacle pitched nomad')],
  tower: [3.2, w('tower towers watchman watchtower')],
  wall: [2.4, w('wall walls rampart fortress fortified stronghold')],
  temple: [4, w('temple sanctuary')],
  // softer hints (a "_soft" suffix means the same sprite, pulled less strongly)
  cross_soft: [1.8, w('jesus christ savior saviour redeemer redemption salvation gospel resurrection risen')],
  heart_soft: [1.4, w('mercy grace forgive forgiveness')],
  lamp_soft: [1.6, w('light shine shining lighten enlighten')],
  well_soft: [1.5, w('water waters drink living-water')],
  tree_soft: [1.4, w('life live living')],
  harp_soft: [1.6, w('praise sing singing worship thanksgiving')],
  sprout_soft: [1.5, w('faith believe believed belief trust beginning create creation earth world seed')],
  serpent_soft: [1.3, w('sin sins sinner sinned iniquity transgression wicked evil')],
  shield_soft: [1.5, w('enemy enemies foe foes')],
  scales_soft: [1.3, w('wrong unjust fair')],
  hand_soft: [1.2, w('strength power mighty')],
  // people
  woman: [2.4, w('woman women mother wife widow maid maiden daughter sister bride virgin')],
  child: [2.4, w('child children boy girl babe infant son baby little')],
  priest: [3, w('priest priests levite levites')],
  prophet: [3, w('prophet prophets seer')],
  warrior: [2.6, w('soldier soldiers warrior warriors captain army armies host')],
  man: [1.3, w('man men brother brethren father fathers people nation servant')],
};

/** where the picture happens */
export const SETTING_WORDS = {
  sea: [3, w('sea seas ocean shore waves galilee deep ship boat sail harbour fish')],
  mountain: [3, w('mountain mountains hill hills mount sinai zion horeb olives height ascend summit')],
  desert: [3, w('desert wilderness sand dry thirst egypt wander wandering parched')],
  city: [2.6, w('city cities jerusalem babylon streets nineveh rome wall walls gate gates tower citizens')],
  temple: [3, w('temple altar sanctuary tabernacle priest incense sacrifice offering ephod ark-of')],
  garden: [3, w('garden eden vine vineyard orchard paradise flower lily spice fruit tree')],
  heaven: [2.6, w('heaven heavens glory throne angel angels eternal everlasting cloud clouds holy')],
  cave: [3, w('cave tomb grave sepulchre pit shadow darkness dungeon den death')],
  field: [3, w('field fields harvest reap sow plow wheat corn barley labourers threshing')],
  river: [3, w('river rivers stream brook jordan waters fountain baptize baptized spring')],
  house: [2.4, w('house home door room table supper feast bed upper-room dwell')],
  meadow: [2.4, w('pasture shepherd sheep flock green grass meadow valley lamb fold')],
};

export const TIME_WORDS = {
  night: [3, w('night midnight dark darkness stars moon sleep slumber watches')],
  dawn: [3, w('morning dawn early sunrise daybreak rise arose')],
  dusk: [3, w('evening dusk sunset even twilight')],
};

export const MOOD_WORDS = {
  joy: [2.5, w('joy rejoice rejoiced glad gladness delight happy merry shout sing celebrate feast dance')],
  holy: [2.2, w('holy glory glorious worship hallowed bless blessed amen hallelujah praise majesty eternal light')],
  sorrow: [2.5, w('weep wept mourn mourning sorrow tears cry cried grief afflicted affliction pain trouble anguish lament')],
  storm: [3, w('storm tempest wind thunder lightning rain whirlwind terror flood fear afraid')],
  wrath: [2.8, w('wrath anger angry fury destroy destruction vengeance plague curse smote judgment burn consume')],
  peace: [2.4, w('peace rest quiet still calm gentle comfort trust safe safely sleep gentle')],
};

/** words that push towards a glory scene (God is shown through light, never as a figure) */
export const GLORY_WORDS = w('god lord jehovah almighty most-high creator holy-one spirit');

/** Good defaults per book (by book id 1..66) when a verse has no strong pictures of its own. */
export const BOOK_DEFAULTS = (() => {
  const d = {};
  const set = (ids, v) => ids.forEach((i) => { d[i] = v; });
  set([1], { setting: 'garden', heroes: ['tree', 'flower', 'dove', 'lamb', 'sprout'] });
  set([2], { setting: 'desert', heroes: ['tent', 'tablets', 'rock', 'flame'] });
  set([3], { setting: 'temple', heroes: ['altar', 'lamb', 'priest', 'jar'] });
  set([4], { setting: 'desert', heroes: ['tent', 'camel', 'man', 'rock'] });
  set([5], { setting: 'mountain', heroes: ['tablets', 'scroll', 'man', 'tree'] });
  set([6], { setting: 'city', heroes: ['wall', 'warrior', 'trumpet', 'shield'] });
  set([7], { setting: 'field', heroes: ['warrior', 'sword', 'house', 'man'] });
  set([8], { setting: 'field', heroes: ['wheat', 'woman', 'house'] });
  set([9, 10, 11, 12], { setting: 'city', heroes: ['king', 'crown', 'tower', 'horse', 'man'] });
  set([13, 14], { setting: 'temple', heroes: ['book', 'priest', 'harp', 'altar'] });
  set([15, 16], { setting: 'city', heroes: ['wall', 'tower', 'man', 'scroll'] });
  set([17], { setting: 'city', heroes: ['crown', 'woman', 'king'] });
  set([18], { setting: 'cave', heroes: ['man', 'rock', 'scales'], mood: 'sorrow' });
  set([19], { setting: 'meadow', heroes: ['harp', 'lamb', 'tree', 'eagle', 'dove'] });
  set([20], { setting: 'house', heroes: ['book', 'scales', 'tree', 'jar', 'man'] });
  set([21], { setting: 'meadow', heroes: ['book', 'scales', 'tree', 'man'] });
  set([22], { setting: 'garden', heroes: ['flower', 'lily', 'heart', 'apple', 'grapes'], mood: 'joy' });
  set([23, 24, 26], { setting: 'mountain', heroes: ['scroll', 'prophet', 'tower', 'jar'] });
  set([25], { setting: 'city', heroes: ['tower', 'chains', 'man'], mood: 'sorrow' });
  set([27], { setting: 'city', heroes: ['lion', 'crown', 'angel', 'scroll'] });
  set([28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39], { setting: 'field', heroes: ['scroll', 'prophet', 'tree', 'trumpet'] });
  set([40, 41, 42, 43], { setting: 'sea', heroes: ['boat', 'fish', 'bread', 'man', 'lamb', 'shepherd'] });
  set([44], { setting: 'city', heroes: ['scroll', 'boat', 'flame', 'man'] });
  set([45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58], { setting: 'house', heroes: ['scroll', 'book', 'heart', 'door', 'anchor'] });
  set([59, 60, 61, 62, 63, 64, 65], { setting: 'meadow', heroes: ['book', 'tree', 'heart', 'lamp'] });
  set([66], { setting: 'heaven', heroes: ['throne', 'angel', 'crown', 'lamb', 'trumpet'], mood: 'holy' });
  return d;
})();

/** Plural / ending trim so "lambs", "sheep's", "fishers" and "sowed" land on the listed stems. */
export function lite(wd) {
  let s = wd;
  if (s.length > 4 && s.endsWith('ies')) s = `${s.slice(0, -3)}y`;
  else if (s.length > 4 && /(ches|shes|sses|xes|zes)$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss') && !s.endsWith('us')) s = s.slice(0, -1);
  return s;
}

function index(table) {
  const m = new Map();
  for (const [name, [weight, words]] of Object.entries(table)) {
    for (const word of words) {
      const k = lite(word);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push([name, weight]);
    }
  }
  return m;
}
export const SPRITE_INDEX = index(SPRITE_WORDS);
export const SETTING_INDEX = index(SETTING_WORDS);
export const TIME_INDEX = index(TIME_WORDS);
export const MOOD_INDEX = index(MOOD_WORDS);
export const GLORY_SET = new Set(GLORY_WORDS.map(lite));
